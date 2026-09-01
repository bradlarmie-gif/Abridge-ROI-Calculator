import type { ProformaSettingSnapshot, ProformaConfig } from "@/pages/proforma/proformaTypes";
import { settingVocab } from "@/pages/proforma/proformaTypes";
import {
  buildMonthlyCashFlows,
  calculateProformaSummary,
  getYearlySummary,
} from "@/lib/proformaCalculations";
import { computeSettingDriverFormulas } from "@/lib/presentFormulas";
import { getDriverFallback } from "@/lib/proformaDriverFormulaSteps";
import {
  PROFORMA_PDF_STORAGE_KEY,
  PF_SETTING_COLORS,
  buildSampleCashFlow,
  type ProformaPdfData,
  type PfSetting,
  type PfDomainGroup,
  type PfDriver,
  type PfYearRow,
  type PfCashPoint,
  type PfDomainTile,
} from "./ProformaEditorialPdf";

// ────────────────────────────────────────────────────────────────
// Builds a fully-reconciled ProformaPdfData FROM the live proforma engine.
// The dollar case is built on the clinical domains only (Revenue + Capacity +
// Workforce): Quality is tracked as a metric and Cost Displacement is surfaced
// separately in App Rationalization — neither is added to the ROI here. That
// keeps every number tying out: drivers → domain → setting, settings → system,
// domain-by-year → year totals, and sensitivity / cash-flow → term net.
// ────────────────────────────────────────────────────────────────

// Quality maps to its own domain (not null) so nursing's harm-avoidance dollars
// (HAPI/falls/CAUTI/CLABSI/sepsis, all quadrant "Quality") appear in the
// breakdown. Where Quality is the proof layer (OP/ED/IP) its drivers are $0 and
// drop out via the value > 0 guard, so the breakdown reconciles for every setting.
const DOMAIN_OF: Record<string, "Revenue" | "Capacity" | "Workforce" | "Quality" | null> = {
  Revenue: "Revenue",
  Capacity: "Capacity",
  Workforce: "Workforce",
  Quality: "Quality",
};

const DRIVER_DESC: Record<string, string> = {
  patientAccess: "Time returned from after-hours charting reopens visit slots, adding contribution margin at the current no-show adjusted rate.",
  wrvu: "Complete documentation lifts the coded acuity of visits already delivered, recovering wRVUs that thin notes leave on the table.",
  hcc: "Chronic conditions surfaced and documented at the visit raise risk-adjustment accuracy for the risk-bearing panel.",
  providerWellbeing: "Lower documentation burden reduces the turnover risk that carries real recruiting and lost-productivity cost.",
  retention: "Lower documentation burden reduces the turnover risk that carries real recruiting and lost-productivity cost.",
  locum: "Fewer vacancies to backfill with premium contract labor as retention improves.",
  edLwbs: "Complete documentation can shorten throughput; where teams act on it, fewer patients leave before being seen and their care is retained.",
  edAdmission: "Complete ED notes support the medical necessity and acuity of admissions, protecting earned inpatient revenue.",
  denials: "Stronger documentation supports medical necessity, reducing avoidable denials on eligible claims.",
  ipDrg: "More complete inpatient documentation raises coded case-mix accuracy on Abridge-enabled discharges.",
  ipObsDefense: "Complete notes defend inpatient status against observation downgrades where the acuity supports it.",
  nursingOt: "Documentation efficiency trims overtime hours across the nursing workforce.",
  scribeCost: "Scribe positions retired as ambient documentation covers the same work.",
};

// Some driver ids are shared across settings (e.g. `wrvu` is "wRVU capture" in
// Outpatient but "E/M level coding" in the ED). The generic DRIVER_DESC copy is
// written for the outpatient case, so it reads wrong in another setting. These
// overrides, keyed `${careSetting}:${driverId}`, keep the description true to the
// setting it actually appears in.
const DRIVER_DESC_BY_SETTING: Record<string, string> = {
  "ed:wrvu": "Complete ED notes support the E/M level the visit actually warranted, so the acuity already delivered is coded and billed accurately.",
  "ed:providerWellbeing": "Emergency clinicians are among the hardest roles to staff; a lighter charting load after unpredictable shifts eases the burnout that drives their turnover.",
};

const SIGNALS: Record<string, string[]> = {
  outpatient: ["Time in note, weekly per provider", "Same-day chart closure rate", "HCC capture completeness", "Provider-reported burnout"],
  ed: ["Left-without-being-seen rate", "Door-to-provider time", "Admission documentation completeness", "Provider-reported burnout"],
  inpatient: ["Time in note, per provider", "Case-mix index trend", "Query response turnaround", "Provider-reported burnout"],
  nursing: ["Flowsheet completeness", "Overtime hours per nurse", "Adverse-event trend", "Nurse-reported burnout"],
};

const NARRATIVE: Record<string, string> = {
  outpatient: "Outpatient is where the case is won: the highest volume, the richest documentation-driven revenue, and the most provider time to give back.",
  ed: "Emergency stacks onto the case in year one: faster throughput protects revenue that otherwise walks out the door, and a hard-to-staff team gets time back.",
  inpatient: "Inpatient adds coded case-mix accuracy and status defense on complex admissions, where a complete note protects earned revenue.",
  nursing: "Nursing returns time at the bedside and trims premium labor as the documentation load comes down across a hard-to-staff workforce.",
};

const DOMAIN_NORTHSTAR: Record<string, string> = {
  Revenue: "Documentation that captures the acuity and services already delivered, so earned revenue is not lost to thin notes.",
  Capacity: "Clinician hours returned from after-hours charting to patient care and added access.",
  Workforce: "Turnover risk reduced as the documentation burden that drives burnout comes down.",
  Quality: "Safety and experience signals we monitor with you, but deliberately leave out of the dollar case.",
};

// Explore captures yearly ramps only through year 3; a 4- or 5-year term holds
// at full scale after that, so years beyond 3 read the year-3 (full-scale) values
// rather than falling off to undefined → 0% utilization.
const yearKey = (i: number) => (["year1", "year2", "year3"] as const)[Math.min(i, 2)];

function encounterLabel(careSetting: string): string {
  return settingVocab(careSetting).encounterPerYr;
}

/** Clinical monthly net (all clinical quadrants − investment), impl at go-live.
 * Clinical = Revenue+Capacity+Workforce+Quality; only DISPLACEMENT is excluded.
 * Quality is $0 in settings where it is the proof layer (OP/ED/IP), so this is a
 * no-op there, but it correctly counts Nursing's harm-avoidance dollars (HAPI,
 * falls, CAUTI/CLABSI, sepsis), where Quality carries the dollar and Revenue is
 * the proof layer. */
function clinicalMonthly(
  settings: ProformaSettingSnapshot[],
  config: ProformaConfig,
  factor = 1,
): number[] {
  const flows = buildMonthlyCashFlows(settings, config);
  return flows.map((r) => {
    const value = (r.revenueValue + r.capacityValue + r.workforceValue + r.qualityValue) * factor;
    let impl = 0;
    for (const s of settings) if (s.goLiveMonth === r.period) impl += s.implementationFee;
    return value - r.investment - impl;
  });
}

function paybackFor(monthlyNet: number[]): number | null {
  let cum = 0;
  let wasNeg = false;
  for (let i = 0; i < monthlyNet.length; i++) {
    cum += monthlyNet[i];
    if (cum < 0) wasNeg = true;
    if (wasNeg && cum >= 0) return i + 1;
  }
  return null;
}

export function buildProformaPdfData(
  settings: ProformaSettingSnapshot[],
  config: ProformaConfig,
  org = "Your Health System",
  date = "",
): ProformaPdfData {
  const now = date || new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const flows = buildMonthlyCashFlows(settings, config);
  const summary = calculateProformaSummary(settings, config, flows);
  const yearly = getYearlySummary(flows, settings);
  const termYears = yearly.length;

  // ── Per-setting drill-downs ────────────────────────────────────────────────
  const pfSettings: PfSetting[] = settings.map((s, idx) => {
    const chains = safeChains(s);
    const byDomain: Record<string, PfDriver[]> = { Revenue: [], Capacity: [], Workforce: [], Quality: [] };
    for (const d of s.drivers) {
      const dom = DOMAIN_OF[d.quadrant];
      if (!dom || d.value <= 0) continue;
      byDomain[dom].push({
        label: d.name,
        value: d.value,
        desc: DRIVER_DESC_BY_SETTING[`${s.careSetting}:${d.id}`] ?? DRIVER_DESC[d.id] ?? getDriverFallback(d.id),
        chain: chains[d.id],
      });
    }
    const domains: PfDomainGroup[] = (["Revenue", "Capacity", "Workforce", "Quality"] as const)
      .filter((k) => byDomain[k].length > 0)
      .map((k) => ({ key: k, total: byDomain[k].reduce((a, d) => a + d.value, 0), drivers: byDomain[k] }));

    const ramp = yearly.map((y, i) => {
      // Same clinical basis as the system year rows and the at-scale headline
      // (revenue + capacity + workforce + quality); only DISPLACEMENT is excluded.
      // Quality is $0 where it is the proof layer (OP/ED/IP) and carries the
      // dollar in Nursing (harm avoidance), so this reconciles for every setting.
      const bs = y.bySettings[s.id];
      return {
        year: i + 1,
        value: bs ? bs.revenueValue + bs.capacityValue + bs.workforceValue + bs.qualityValue : 0,
        providers: s.yearlyProviders?.[yearKey(i)] ?? (i === 0 ? s.providerCount : s.fullScaleProviders),
        utilization: s.yearlyUtilization?.[yearKey(i)] ?? config.yearlyUtilization[yearKey(i)] ?? 0,
      };
    });

    const atScale = (s.revenueValue ?? 0) + (s.capacityValue ?? 0) + (s.workforceValue ?? 0) + (s.qualityValue ?? 0);
    return {
      id: s.id,
      label: s.label,
      color: PF_SETTING_COLORS[idx % PF_SETTING_COLORS.length],
      pilotProviders: s.providerCount,
      fullScaleProviders: s.fullScaleProviders,
      encounters: s.encounters,
      goLiveMonth: s.goLiveMonth,
      atScaleValue: atScale,
      encounterLabel: encounterLabel(s.careSetting),
      providerWord: settingVocab(s.careSetting).providerWord,
      narrative: NARRATIVE[s.careSetting] ?? "",
      domains,
      ramp,
      signals: SIGNALS[s.careSetting] ?? SIGNALS.outpatient,
    };
  });

  // ── System-level year rows (clinical basis) ────────────────────────────────
  let cum = 0;
  let cumClinical = 0;
  let cumInvestment = 0;
  const years: PfYearRow[] = yearly.map((y) => {
    const total = y.revenueValue + y.capacityValue + y.workforceValue + y.qualityValue;
    const net = total - y.investment;
    cum += net;
    cumClinical += total;
    cumInvestment += y.investment;
    return {
      // Per-setting cut uses the SAME clinical basis as the Total row
      // (revenue + capacity + workforce + quality). Only DISPLACEMENT is excluded
      // from clinical value (doctrine). Quality is $0 in proof-layer settings
      // (OP/ED/IP) and carries the dollar in Nursing, so the rows still foot.
      perSetting: settings.map((s) => {
        const bs = y.bySettings[s.id];
        return { id: s.id, value: bs ? bs.revenueValue + bs.capacityValue + bs.workforceValue + bs.qualityValue : 0 };
      }),
      total,
      revenue: y.revenueValue,
      capacity: y.capacityValue,
      workforce: y.workforceValue,
      quality: y.qualityValue,
      investment: y.investment,
      net,
      cumulativeNet: cum,
      // CUMULATIVE ROI (value-to-date / investment-to-date) to match the on-screen
      // Case view; the marginal per-year ratio climbed then read as a "drop" at the
      // cumulative 3-year total, so screen and PDF now tell the same year-by-year story.
      roi: cumInvestment > 0 ? cumClinical / cumInvestment : 0,
    };
  });

  const termValue = years.reduce((a, y) => a + y.total, 0);
  const termInvestment = years.reduce((a, y) => a + y.investment, 0);
  const termNet = termValue - termInvestment;
  const roi = termInvestment > 0 ? termValue / termInvestment : 0;
  // One source of truth for payback: the engine's clinical-only break-even (same
  // number the screens show). Fall back to the local clinical recompute only if
  // the engine didn't produce one.
  const paybackMonth = summary.clinicalPaybackMonth ?? paybackFor(clinicalMonthly(settings, config, 1)) ?? summary.paybackMonth;

  const runRateValue = pfSettings.reduce((a, s) => a + s.atScaleValue, 0);

  // ── Domain tiles at full scale ──────────────────────────────────────────────
  // All four domains, keyed off actual dollars. A domain is "counted" when it
  // carries a dollar (value > 0); the proof layer for each setting has $0 there
  // (Quality in OP/ED/IP, Revenue in Nursing) and renders as proof, so the tiles
  // sum to runRateValue for every setting and mix of settings.
  const domTotals = { Revenue: 0, Capacity: 0, Workforce: 0, Quality: 0 };
  for (const s of settings) {
    domTotals.Revenue += s.revenueValue ?? 0;
    domTotals.Capacity += s.capacityValue ?? 0;
    domTotals.Workforce += s.workforceValue ?? 0;
    domTotals.Quality += s.qualityValue ?? 0;
  }
  const domSum = domTotals.Revenue + domTotals.Capacity + domTotals.Workforce + domTotals.Quality || 1;
  const domainTiles: PfDomainTile[] = (["Revenue", "Capacity", "Workforce", "Quality"] as const).map((k) => ({
    key: k,
    value: domTotals[k],
    pct: Math.round((domTotals[k] / domSum) * 100),
    counted: domTotals[k] > 0,
    northStar: DOMAIN_NORTHSTAR[k],
  }));

  // ── Cost rows: split each year's investment into subscription vs impl ───────
  // (getYearlySummary already folds the one-time impl fee into y.investment in
  // the go-live year, so subscription is the remainder.)
  const implByYear = years.map((_, i) =>
    settings.reduce((a, s) => (Math.floor((s.goLiveMonth - 1) / 12) === i ? a + s.implementationFee : a), 0),
  );
  const subByYear = years.map((y, i) => y.investment - implByYear[i]);
  const implTotal = implByYear.reduce((a, b) => a + b, 0);
  // Only exhibit the one-time implementation row when there is a fee — a row of
  // $0 / $0 / $0 reads like an unfinished placeholder in a formal proposal.
  const costRows = [
    { label: "Subscription, annual", years: subByYear, total: subByYear.reduce((a, b) => a + b, 0) },
    ...(implTotal > 0 ? [{ label: "Implementation, one-time", years: implByYear, total: implTotal }] : []),
  ];
  const totalInvestmentRow = {
    label: "Total investment",
    years: years.map((y) => y.investment),
    total: termInvestment,
  };

  // ── Sensitivity (±30% realization) ──────────────────────────────────────────
  const scenario = (name: string, factor: number, highlight?: boolean) => {
    const net = termValue * factor - termInvestment;
    const r = termInvestment > 0 ? (termValue * factor) / termInvestment : 0;
    const pb = paybackFor(clinicalMonthly(settings, config, factor));
    return { name, realizationPct: Math.round(factor * 100), net, roi: r, paybackLabel: pb != null ? `Mo ${pb}` : "—", highlight };
  };

  // ── Cumulative cash-flow points (clinical) ─────────────────────────────────
  const monthly = clinicalMonthly(settings, config, 1);
  let c = 0;
  const cashFlow: PfCashPoint[] = [{ month: 0, cumNet: 0 }];
  monthly.forEach((v, i) => {
    c += v;
    cashFlow.push({ month: i + 1, cumNet: Math.round(c) });
  });
  const cashFlowFinal = cashFlow.length > 1 ? cashFlow : buildSampleCashFlow(termNet, paybackMonth ?? 12, config.contractTermMonths, 100000);

  // ── Milestones ──────────────────────────────────────────────────────────────
  const milestoneNames = ["Foundation", "Scaling", "Maturity"];
  // Aggregate vocabulary: if every setting is the same care setting use its
  // words (so an all-nursing deal reads "nurses"/"patient-days"), else generic.
  const aggVocab = settingVocab(settings.every((s) => s.careSetting === settings[0]?.careSetting) ? settings[0]?.careSetting : null);
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const settingsWord = settings.length === 1 ? "the setting" : settings.length === 2 ? "both settings" : `all ${settings.length} settings`;

  const milestones = years.map((y, i) => {
    const provs = settings.reduce((a, s) => a + (s.yearlyProviders?.[yearKey(i)] ?? (i === 0 ? s.providerCount : s.fullScaleProviders)), 0);
    // Each year gets its own derived body so Year 1 (onboarding) and the middle
    // scaling years never read as the same copy stub.
    let body: string;
    if (i === termYears - 1) {
      body = `${provs} ${aggVocab.providerWord} · full scale at a ${money(runRateValue)} run-rate.`;
    } else if (i === 0) {
      body = `${provs} ${aggVocab.providerWord} live · ${settingsWord} onboarding, ${money(y.total)} of value landing as revenue starts and capacity ramps.`;
    } else {
      body = `${provs} ${aggVocab.providerWord} · adoption deepens and value climbs to ${money(y.total)} on the year.`;
    }
    return {
      label: `Year ${i + 1} · ${milestoneNames[i] ?? "Year " + (i + 1)}`,
      body,
    };
  });

  const utilScale = Math.max(...settings.map((s) => s.fullScaleUtilization || s.utilizationPercent || 0), 0);
  const rp = config.retentionPhasing;

  return {
    org,
    date: now,
    termNet,
    termYears,
    roi,
    paybackMonth,
    runRateValue,
    settings: pfSettings,
    operation: [
      { label: `${cap(aggVocab.providerWord)} at scale`, value: String(settings.reduce((a, s) => a + s.fullScaleProviders, 0)) },
      { label: cap(aggVocab.encounterPerYr), value: `≈${count(settings.reduce((a, s) => a + s.encounters, 0))}` },
      { label: "Care settings", value: String(settings.length) },
      { label: "Utilization at scale", value: `${utilScale}%` },
      { label: "Clinician hrs returned", value: `≈${count(settings.reduce((a, s) => a + (s.totalHoursSaved || 0), 0))}` },
    ],
    domainTiles,
    thesis:
      "The clinical case is carried by documentation-driven revenue and returned provider time; the investment is front-loaded while teams ramp, and the return compounds as adoption deepens across settings.",
    years,
    milestones,
    whenValueLands: `Revenue from month 1 · Capacity from month ${config.implementationRampMonths} · Quality signals tracked from month ${config.implementationRampMonths} · Workforce phased ${rp.year1Pct}% / ${rp.year2Pct}% / ${rp.year3Pct}% across years 1 to 3.`,
    theRead:
      paybackMonth != null
        ? `Year one is the investment year while teams ramp; on clinical value, payback lands in month ${paybackMonth}. From there the case compounds to ${money(termNet)} net, before any credit for the legacy tooling Abridge displaces.`
        : `The case builds as adoption deepens toward a ${money(runRateValue)} run-rate.`,
    costRows,
    totalInvestmentRow,
    costNote:
      "Cost displacement from retired tooling is modeled separately in App Rationalization and deliberately excluded from this return. Quality value is tracked, not counted, and kept out of the dollars.",
    scenarios: [
      scenario("Conservative", 0.7),
      scenario("Base", 1.0, true),
      scenario("Optimistic", 1.3),
    ],
    // Only claim the conservative case clears its cost when it actually does at
    // today's ramp; otherwise tell the true story (base clears, or it builds).
    scenarioNote:
      termValue * 0.7 - termInvestment > 0
        ? "Flex realization by ±30% and even the conservative case clears its cost. The base sits between the two, with room on either side as adoption runs behind or ahead of plan."
        : termNet > 0
          ? "Flex realization by ±30%. The base case clears its cost; the conservative end is where it runs tightest, with upside if adoption runs ahead of plan."
          : "Flex realization by ±30%. At today's ramp the case does not yet clear its cost over the term; it builds as adoption deepens and legacy tooling is displaced.",
    modelInputs: [
      { label: "Contract term", value: `${config.contractTermMonths} months` },
      { label: "Implementation ramp", value: `${config.implementationRampMonths} months` },
      { label: "Utilization at scale", value: `${utilScale}%` },
      { label: "Workforce phasing", value: `${rp.year1Pct} / ${rp.year2Pct} / ${rp.year3Pct}%` },
      { label: "Value onset", value: `Rev M1 · Cap M${config.implementationRampMonths}` },
      { label: "Sensitivity range", value: "±30%" },
    ],
    cashFlow: cashFlowFinal,
    heldConservative: [
      { title: "Margin, not charges.", body: "Value is contribution margin, not gross billing." },
      { title: "Attribution only.", body: "We count the lift attributed to Abridge, not the whole team's work." },
      { title: "Ramp modeled.", body: "Value is delayed while adoption builds, not switched on day one." },
      { title: "Quality left uncounted.", body: "Real signals are tracked, but kept out of the dollars." },
    ],
    closingStatement:
      "Every figure here is your own volume and economics, yours to verify, and ours to prove alongside you.",
    proofSteps: [
      { title: "Instrument the signals in your EHR", body: "The same drivers in this model, wired to live EHR signals, no new reporting burden." },
      { title: "Measure the before, then the after", body: "A clean baseline so the lift is yours, not a benchmark." },
      { title: "Report attainment every quarter", body: "Track the case against reality, and adjust the deal as the numbers land." },
    ],
    handoff:
      "Next, we build the attainment plan together in Value Attainment, the signals, owners, and dates that turn this model into measured results.",
  };
}

function safeChains(s: ProformaSettingSnapshot): Record<string, string> {
  try {
    return computeSettingDriverFormulas(s);
  } catch {
    return {};
  }
}

function money(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e6) return `$${(a / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `$${Math.round(a / 1e3)}K`;
  return `$${Math.round(a)}`;
}
function count(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
  if (a >= 1e3) return `${Math.round(n / 1e3)}K`;
  return `${Math.round(n)}`;
}

/**
 * Live entry point (mirrors generateExplorePDF): build the data from the engine,
 * stash it in localStorage, and open the print route.
 */
export async function generateProformaEditorialPDF(
  settings: ProformaSettingSnapshot[],
  config: ProformaConfig,
  org?: string,
): Promise<void> {
  try {
    const data = buildProformaPdfData(settings, config, org);
    localStorage.setItem(PROFORMA_PDF_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage unavailable — the route falls back to sample data.
  }
  const url = `${window.location.pathname}?proformapdf=1&print=1`;
  window.open(url, "_blank", "noopener");
}
