/**
 * Single source of truth for the proforma value-driver formula breakdowns —
 * the multi-step "show your work" lines on the PDF's Value Drivers page.
 * Extracted out of ProformaPDFExport so this math lives in one shared, tested
 * place instead of a private copy inside the PDF that keeps drifting from the
 * engine. Guarded by proformaDriverFormulaSteps.test.ts (every driver's steps
 * must reconcile to its value).
 */
import type { ProformaSettingSnapshot } from "@/pages/proforma/proformaTypes";
import { nursingRetentionRates, physicianRetentionRates } from "@/lib/retentionScenarios";

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000).toLocaleString()}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

export interface FormulaStep { label: string; value: string; isResult?: boolean; }

export function buildDriverFormula(
  driverId: string,
  driverValue: number,
  setting: ProformaSettingSnapshot,
): FormulaStep[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const es = (setting.fullExploreState ?? (setting as any).exploreState) as any;
  // Fallback builder only — covered drivers now render the canonical Explore
  // formula (computeSettingDriverFormulas), which reconciles by construction.
  const providers = setting.fullScaleProviders || setting.providerCount;
  const n = (v: number) => Math.round(v).toLocaleString();
  const p = (v: number) => `${v}%`;
  const d = (v: number) => `$${Math.round(v).toLocaleString()}`;

  // ── Snapshot-only formulas (no fullExploreState required) ──────────────────
  if (driverId === "retention") {
    const replaceCost = setting.replacementCost || 400000;
    const turnoverPct = setting.retentionRate || 0;
    const retained = replaceCost > 0 ? driverValue / replaceCost : 0;
    const isNursing = setting.careSetting === "nursing";
    const unitWord = isNursing ? "nurses" : "physicians";
    return [
      { label: `${n(providers)} ${unitWord}  ×  ${p(turnoverPct)} annual turnover  →  burnout-driven attrition reduced`, value: `${retained.toFixed(1)} ${unitWord} retained/yr` },
      { label: `${retained.toFixed(1)} ${unitWord} retained  ×  ${d(replaceCost)} replacement cost per ${isNursing ? "nurse" : "physician"}`, value: fmt(driverValue), isResult: true },
    ];
  }

  if (!es) return [];
  const tdi = es.timeDriverInputs ?? {};
  // Scale pilot encounters up to full-scale by the SAME provider factor the
  // driverValue was scaled by (fullScaleProviders / pilot), so the steps reconcile.
  // Do NOT read yearlyEncounters.year3: that is the wrong year for a sub-3-year
  // term and does not track the value's scaling.
  const pilotProviders = setting.providerCount || 1;
  const providerScaleFactor = providers > pilotProviders ? providers / pilotProviders : 1;
  const annEnc = Math.round((es.annualEncounters || 0) * providerScaleFactor);
  const encPerProv = providers > 0 ? Math.round(annEnc / providers) : 0;
  // Abridge-covered ("eligible") encounters = total × utilization. Drivers whose
  // engine value is computed on eligible encounters (Patient Access, E/M, denials,
  // DRG, CDI) must use this, not the raw total, or the steps won't tie to the value.
  const utilPct = es.utilizationPercent ?? 100;
  const abridgeEnc = Math.round(annEnc * (utilPct / 100));

  switch (driverId) {

    // ── Capacity ──────────────────────────────────────────────────────────────

    case "patientAccess": {
      const realPct   = tdi.capacityRealizationPercent ?? 25;
      const rev       = tdi.revenuePerVisit || 200;
      const visitDur  = tdi.visitDuration ?? 30;
      // Mirror the engine exactly (hours ÷ providers ÷ 48 wks → visits/provider/wk
      // → annual visits × revenue) so the steps reconcile to the value. Hours come
      // from the model's scaled totalHoursSaved, not an encounter re-derivation.
      const scaledHours  = Math.round((setting.totalHoursSaved || 0) * providerScaleFactor);
      const accessProv   = tdi.accessProviders ? Math.round(tdi.accessProviders * providerScaleFactor) : providers;
      const eff          = Math.min(accessProv, providers);
      const hrsPerProvWk = providers > 0 ? scaledHours / providers / 48 : 0;
      const visitHrs     = visitDur / 60;
      const visitsPerWk  = visitHrs > 0 ? Math.round((hrsPerProvWk * (realPct / 100) / visitHrs) * 10) / 10 : 0;
      return [
        { label: `${n(scaledHours)} provider-hours freed/yr  ÷  ${n(providers)} providers  ÷  48 wks`, value: `${hrsPerProvWk.toFixed(1)} hrs/provider/wk` },
        { label: `${hrsPerProvWk.toFixed(1)} hrs  ×  ${p(realPct)} reinvested  ÷  ${visitDur}-min visits`, value: `${visitsPerWk} added visits/provider/wk` },
        { label: `${visitsPerWk} visits/wk  ×  ${n(eff)} providers  ×  48 wks  ×  ${d(rev)}/visit`, value: fmt(driverValue), isResult: true },
      ];
    }

    case "edLwbs":
    case "lwbsRecovery": {
      const rate  = tdi.edLwbsRate || 0;
      const red   = tdi.edLwbsReduction || 20;
      const rev   = tdi.edRevenuePerVisit || 350;
      const real  = tdi.edLwbsRealization || 85;
      const lwbs  = Math.round(annEnc * (rate / 100));
      const recov = Math.round(lwbs * (red / 100));
      return [
        { label: `${n(annEnc)} enc/yr  ×  ${p(rate)} current LWBS rate`, value: `${n(lwbs)} LWBS patients/yr` },
        { label: `${n(lwbs)}  ×  ${p(red)} reduction from faster documentation`, value: `${n(recov)} patients recovered/yr` },
        { label: `${n(recov)}  ×  ${d(rev)}/visit  ×  ${p(real)} realization`, value: fmt(driverValue), isResult: true },
      ];
    }

    case "edAdmission":
    case "admissionCapture": {
      const rate    = tdi.edLwbsRate || 0;
      const red     = tdi.edLwbsReduction || 20;
      const admRate = tdi.edAdmissionRate || 0;
      const admRev  = tdi.edAdmissionRevenue || 0;
      const admReal = tdi.edAdmissionRealization || 75;
      const recov   = Math.round(annEnc * (rate / 100) * (red / 100));
      const admits  = Math.round(recov * (admRate / 100));
      return [
        { label: `${n(recov)} LWBS-recovered patients  ×  ${p(admRate)} admission conversion rate`, value: `${n(admits)} admissions captured/yr` },
        { label: `${n(admits)}  ×  ${d(admRev)} avg admission revenue  ×  ${p(admReal)} realization`, value: fmt(driverValue), isResult: true },
      ];
    }

    case "costReduction": {
      const minSaved = es.minutesSavedPerEncounter || 0;
      const totalHrs = Math.round((minSaved * annEnc) / 60);
      const effectiveRate = totalHrs > 0 ? Math.round(driverValue / totalHrs) : 0;
      return [
        { label: `${minSaved} min saved/enc  ×  ${n(annEnc)} enc/yr  ÷  60`, value: `${n(totalHrs)} provider-hours freed/yr` },
        { label: `${n(totalHrs)} hrs  ×  ${d(effectiveRate)}/hr provider opportunity cost`, value: fmt(driverValue), isResult: true },
      ];
    }

    // ── Workforce ─────────────────────────────────────────────────────────────

    case "providerWellbeing": {
      const turnover    = tdi.annualTurnoverRate || 0;
      const burnout     = tdi.burnoutRelatedTurnover || 0;
      const retScenarios: Record<string, number> = physicianRetentionRates(tdi.retentionCustomPercent ?? 10);
      const impPct      = retScenarios[tdi.retentionImpactScenario || 'typical'] ?? 30;
      const replaceCost = tdi.replacementCost || 200000;
      const unitWord    = setting.careSetting === 'inpatient' ? 'physician' : setting.careSetting === 'ed' ? 'physician' : 'provider';
      const unitWords   = unitWord + 's';
      const atRisk      = providers * (turnover / 100) * (burnout / 100);
      const retained    = atRisk * (impPct / 100);
      return [
        { label: `${n(providers)} ${unitWords}  ×  ${p(turnover)} turnover  ×  ${p(burnout)} burnout-driven`, value: `${atRisk.toFixed(1)} ${unitWords}/yr at risk` },
        { label: `${atRisk.toFixed(1)}  ×  ${p(impPct)} retention improvement from reduced burnout`, value: `${retained.toFixed(1)} ${unitWords} retained/yr` },
        { label: `${retained.toFixed(1)}  ×  ${d(replaceCost)} replacement cost per ${unitWord}`, value: fmt(driverValue), isResult: true },
      ];
    }

    case "physicianLocumAgency": {
      const weeksPerVac = tdi.physicianAgencyWeeksPerVacancy || 8;
      const weeklyPrem  = tdi.physicianAgencyWeeklyPremium || 8000;
      const turnover    = tdi.annualTurnoverRate || 0;
      const burnout     = tdi.burnoutRelatedTurnover || 0;
      const impPct      = tdi.retentionCustomPercent || 15;
      const retained    = providers * (turnover / 100) * (burnout / 100) * (impPct / 100);
      const locumWks    = (retained * weeksPerVac).toFixed(0);
      return [
        { label: `${retained.toFixed(1)} fewer vacancies/yr  ×  ${weeksPerVac} wks locum coverage per vacancy`, value: `${locumWks} locum-weeks avoided/yr` },
        { label: `${locumWks} weeks  ×  ${d(weeklyPrem)} weekly locum/agency premium`, value: fmt(driverValue), isResult: true },
      ];
    }

    case "nursingRetention": {
      const turnoverRate  = tdi.nursingTurnoverRate || 0;
      const replaceCost   = tdi.nursingReplacementCost || 50000;
      const nursingRates: Record<string, number> = nursingRetentionRates(tdi.retentionCustomPercent ?? 10);
      const impPct        = nursingRates[tdi.retentionImpactScenario || 'typical'] ?? 30;
      // Mirror the engine exactly so the steps reconcile to the value:
      // nurses × turnover × 40% burnout-related × Abridge impact × replacement cost.
      const nurses            = providers;
      const burnoutDepartures = nurses * (turnoverRate / 100) * 0.4;
      const retained          = burnoutDepartures * (impPct / 100);
      return [
        { label: `${n(nurses)} nurses  ×  ${p(turnoverRate)} turnover  ×  40% burnout-related`, value: `${burnoutDepartures.toFixed(1)} at-risk departures/yr` },
        { label: `${burnoutDepartures.toFixed(1)}  ×  ${p(impPct)} Abridge impact on burnout-driven departures`, value: `${retained.toFixed(1)} nurses retained/yr` },
        { label: `${retained.toFixed(1)}  ×  ${d(replaceCost)} replacement cost per nurse`, value: fmt(driverValue), isResult: true },
      ];
    }

    case "nursingAgency": {
      const agencySpend  = tdi.nursingAnnualAgencySpend || 0;
      const weeksPerVac  = tdi.nursingAgencyWeeksPerVacancy || 13;
      const weeklyPrem   = tdi.nursingAgencyWeeklyPremium || 2000;
      return [
        { label: `Annual agency/travel nursing baseline: ${d(agencySpend)}`, value: `current exposure` },
        { label: `Vacancies reduced (from retention) × ${weeksPerVac} wks × ${d(weeklyPrem)}/wk premium`, value: fmt(driverValue), isResult: true },
      ];
    }

    case "nursingOt":
    case "nursingOvertime": {
      const hoursPerWk   = tdi.nursingOtHoursPerNurseWeek || 0;
      const reductionPct = tdi.nursingOtReductionPercent || 0;
      const hourlyRate   = tdi.nursingOtHourlyRate || 0;
      // Mirror the engine: the nurse count (providers) drives OT hours, so the
      // steps reconcile to the value (no bed→nurse re-derivation).
      const nurses       = providers;
      const totalOtHrs   = Math.round(nurses * hoursPerWk * 52);
      const savedHrs     = Math.round(totalOtHrs * (reductionPct / 100));
      return [
        { label: `${n(nurses)} nurses  ×  ${hoursPerWk} OT hrs/week  ×  52 weeks`, value: `${n(totalOtHrs)} OT hrs/yr (baseline)` },
        { label: `${n(totalOtHrs)}  ×  ${p(reductionPct)} reduction from documentation efficiency`, value: `${n(savedHrs)} OT hours eliminated` },
        { label: `${n(savedHrs)} hrs  ×  ${d(hourlyRate)} blended OT rate`, value: fmt(driverValue), isResult: true },
      ];
    }

    // ── Revenue ───────────────────────────────────────────────────────────────

    case "edEmLevel":
    case "wrvu": {
      const dqi        = es.docQualityInputs;
      const wrvuMap: Record<string, number> = { conservative: 2, typical: 5, aggressive: 9, custom: dqi?.wrvuCustomPercent ?? 5 };
      const wrvuPct    = dqi?.wrvuScenario ? (wrvuMap[dqi.wrvuScenario] ?? 5) : (es.wrvuPctIncrease || 0);
      const convFactor = dqi?.conversionFactor || 55;
      const totalEnc   = annEnc || providers * encPerProv;
      // Derive actual wRVUs from the dollar value to stay consistent with calculation engine
      const wrvuGained = convFactor > 0 ? Math.round(driverValue / convFactor) : Math.round(abridgeEnc * (wrvuPct / 100));
      return [
        { label: `${n(providers)} providers  ×  ${n(encPerProv)} encounters/provider/yr`, value: `${n(Math.round(totalEnc))} total encounters` },
        { label: `${n(Math.round(totalEnc))} total  ×  ${p(utilPct)} Abridge utilization`, value: `${n(abridgeEnc)} Abridge encounters` },
        { label: `Problems addressed, data reviewed, and risk documented — complexity delivered, note didn't show it  →  ${wrvuPct > 0 ? wrvuPct.toFixed(1) : "~2–4"}% wRVU lift`, value: `${n(wrvuGained > 0 ? wrvuGained : Math.round(abridgeEnc * 0.03))} wRVUs recovered` },
        { label: `wRVUs recovered  ×  ${d(convFactor)} conversion factor`, value: fmt(driverValue), isResult: true },
      ];
    }

    case "hcc":
    case "hccCapture": {
      // HCC is modeled per MA/risk plan (dq.hccPlans), not a single panel x MA%.
      // Reconstruct the real mechanism so the steps reconcile with driverValue.
      const dqi     = es.docQualityInputs ?? {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const plans: any[] = Array.isArray(dqi.hccPlans) ? dqi.hccPlans : [];
      const avgHccs = dqi.avgHccs || 0;
      const realization = dqi.hccRealization ?? 100;
      const upliftMap: Record<string, number> = { conservative: 3, typical: 5, optimistic: 10 };
      let totalPanel = 0;
      let totalHccs = 0;
      for (const pl of plans) {
        const panelSize = pl.panelSize || 0;
        totalPanel += panelSize;
        const upliftPp = pl.uplift === "custom" ? (pl.upliftCustomPp ?? 5) : (upliftMap[pl.uplift] ?? 5);
        const effectiveUplift = Math.min(upliftPp, Math.max(0, 90 - (pl.currentRecaptureRate || 0)));
        totalHccs += providers * panelSize * ((pl.gapRate || 0) / 100) * (effectiveUplift / 100) * avgHccs;
        if (pl.netNewEnabled) {
          totalHccs += providers * panelSize * ((pl.netNewDiscoveryRate || 0) / 100) * (pl.netNewAvgConditions || 0);
        }
      }
      const coveredLives = Math.round(providers * totalPanel);
      const nPlans = plans.length;
      return [
        { label: `${n(providers)} providers  ×  ${n(totalPanel)} panel${nPlans > 1 ? `  across ${nPlans} risk plans` : ""}`, value: `${n(coveredLives)} covered lives` },
        { label: `Gaps closed at the point of care  ×  ${avgHccs} avg HCCs per patient`, value: `${n(totalHccs)} HCCs recaptured/yr` },
        { label: `HCCs recaptured  ×  value per HCC  ×  ${p(realization)} realization`, value: fmt(driverValue), isResult: true },
      ];
    }

    case "denials":
    case "denialPrevention": {
      const denialPct  = es.denialsPctReduced || 0;
      const dqi        = es.docQualityInputs ?? {};
      const denialRate = dqi.medNecessityDenialRate || dqi.denialRate || 0;
      const claimVal   = dqi.avgClaimValue || 0;
      const eligible   = Math.round(abridgeEnc * (denialRate / 100));
      return [
        { label: `${n(annEnc)} total enc/yr  ×  ${p(utilPct)} Abridge utilization`, value: `${n(abridgeEnc)} Abridge encounters` },
        { label: `${n(abridgeEnc)} encounters  ×  ${p(denialRate)} medical necessity denial rate`, value: `${n(eligible)} claims at risk` },
        { label: `Physician reasoned correctly, note didn't capture it  ×  ${d(claimVal)} avg claim`, value: `targeted for reduction` },
        { label: `Denials targeted for reduction  ×  avg claim value  ×  realization`, value: fmt(driverValue), isResult: true },
      ];
    }

    case "ipDrg":
    case "drgAccuracy": {
      const dqi     = es.docQualityInputs ?? {};
      const drgRate = dqi.drgImprovementRate || 0;
      const casesDelta = Math.round(abridgeEnc * (drgRate > 0 ? drgRate / 100 : 0.03));
      return [
        { label: `CCs/MCCs mentioned at bedside, not in note — conditions that may shift DRG weight $2–4K per stay  ×  ${drgRate > 0 ? drgRate.toFixed(1) + "%" : "~2–4%"} documentation lift`, value: `${n(casesDelta)} cases more accurately coded` },
        { label: `${n(casesDelta)} cases  ×  avg DRG payment delta from accurate complexity documentation`, value: fmt(driverValue), isResult: true },
      ];
    }

    case "ipCdi":
    case "cdiQueryReduction": {
      const dqi      = es.docQualityInputs ?? {};
      const queryVol = dqi.cdiQueriesPerMonth || 0;
      const annualQueries = queryVol > 0 ? queryVol * 12 : Math.round(abridgeEnc * 0.08);
      const reduced   = Math.round(annualQueries * 0.35);
      return [
        { label: `${n(annualQueries)} CDI queries/yr — conditions named at bedside, note said "elevated BMP"  →  documentation captured at point of care can reduce queries`, value: `${n(reduced)} queries potentially avoided` },
        { label: `${n(reduced)} queries eliminated  ×  avg CDI specialist cost per query`, value: fmt(driverValue), isResult: true },
      ];
    }

    case "ipObsDefense": {
      const dqi     = es.docQualityInputs ?? {};
      const obsRate = dqi.obsDefenseRate || 0;
      const avgDelta = dqi.obsInpatientRevDelta || 2800;
      const defended  = obsRate > 0 ? Math.round(abridgeEnc * (obsRate / 100)) : Math.round(driverValue / avgDelta);
      return [
        { label: `Admission reasoning captured at point of care — two-midnight clinical expectation documented before audit`, value: `inpatient status defended` },
        { label: `${n(defended)} cases defended  ×  ${d(avgDelta)} avg inpatient vs. observation revenue delta`, value: fmt(driverValue), isResult: true },
      ];
    }

    case "docQuality": {
      const careSetting = setting.careSetting;
      const docAllocPct = careSetting === "ed"
        ? (tdi.edAllocDocQualityPercent || 0)
        : careSetting === "inpatient"
          ? (tdi.ipAllocQualityPercent || 0)
          : (tdi.opAllocDocQualityPercent || 0);
      const totalHoursSaved = setting.totalHoursSaved || 0;
      const providerValuePerHour = totalHoursSaved > 0 ? Math.round(setting.timeValue / totalHoursSaved) : 0;
      const docQualityHours = Math.round(totalHoursSaved * (docAllocPct / 100));
      return [
        { label: `${n(totalHoursSaved)} total hours saved  ×  ${docAllocPct}% allocated to documentation quality`, value: `${n(docQualityHours)} quality-improvement hours/yr` },
        { label: `${n(docQualityHours)} hrs  ×  ${d(providerValuePerHour)}/hr provider time value`, value: fmt(driverValue), isResult: true },
      ];
    }

    // ── Quality / Nursing ─────────────────────────────────────────────────────

    case "nursingHapi":
    case "nursingFalls":
    case "nursingCauti":
    case "nursingClabsi": {
      const evtNames: Record<string, string> = {
        nursingHapi: "HAPI", nursingFalls: "fall", nursingCauti: "CAUTI", nursingClabsi: "CLABSI",
      };
      const evtCosts: Record<string, number> = {
        nursingHapi: 11000, nursingFalls: 14000, nursingCauti: 13000, nursingClabsi: 48000,
      };
      const evtName = evtNames[driverId] || "adverse event";
      const avgCost = evtCosts[driverId] || 15000;
      const eventsAvoided = avgCost > 0 ? (driverValue / avgCost).toFixed(1) : "—";
      return [
        { label: `Real-time documentation → earlier identification of ${evtName} risk factors`, value: `event prevention` },
        { label: `${eventsAvoided} ${evtName} events avoided/yr  ×  ${d(avgCost)} avg cost per event`, value: fmt(driverValue), isResult: true },
      ];
    }

    case "nursingSepsis": {
      const avgSepsisCost = 26000;
      const eventsAvoided = (driverValue / avgSepsisCost).toFixed(1);
      return [
        { label: `Earlier sepsis recognition via real-time documentation → timely SEP-1 bundle adherence`, value: `mortality & cost reduction` },
        { label: `${eventsAvoided} sepsis complications avoided/yr  ×  ${d(avgSepsisCost)} avg cost per event`, value: fmt(driverValue), isResult: true },
      ];
    }

    case "scribeCostReduction":
    case "scribeCost": {
      const headcount  = tdi.scribeHeadcount || 0;
      const costPerPos = tdi.scribeCostPerPosition || 0;
      const eliminated = Math.min(tdi.scribePositionsEliminated || 0, headcount);
      const totalSpend = headcount * costPerPos;
      return [
        { label: `${n(headcount)} current scribe positions  ×  ${d(costPerPos)} annual cost per position`, value: `${d(totalSpend)} current scribe spend` },
        { label: `${n(eliminated)} of ${n(headcount)} positions eliminated with Abridge`, value: fmt(driverValue), isResult: true },
      ];
    }

    default:
      return [];
  }
}

export function getDriverFallback(driverId: string): string {
  const notes: Record<string, string> = {
    bedsideTime:          "Hours returned to direct patient care — documentation time shifted to bedside.",
    opAfterHoursDoc:      "After-hours documentation eliminated — hours returned directly to providers.",
    opBurnoutTracking:    "Burnout trajectory improvement; workforce sustainability benefit compounds over time.",
    obsDefense:           "Observation-to-inpatient status defense from thorough documentation — auditable per-case.",
    nursingHcahps:        "HCAHPS score improvement from provider presence and communication quality.",
    nursingSepsis:        "Earlier sepsis recognition via documentation quality — outcomes and cost improvement.",
    nursingEarlyDeterioration: "Earlier harm event prevention through real-time flowsheet documentation of clinical deterioration signals.",
    nursingBundleCompliance:   "Care bundle compliance improvement — CLABSI, VAP, sepsis bundles tracked through complete flowsheet documentation.",
    opCdiQueryTrend:      "CDI query volume reduction from outpatient documentation completeness.",
    opCareGapClosureRate: "Care gap closure improvement — HEDIS-relevant conditions documented at point of care.",
    opHedisCompositeScore:"HEDIS composite score improvement from complete preventive care documentation.",
    opMaStarsPerformance: "MA Stars performance tied to documentation quality driving risk adjustment accuracy.",
    edCoreMeasureDocRate: "ED core measure compliance — documentation quality drives measure capture.",
    edDocDeficiencyRate:  "Chart completion rate improvement — fewer post-discharge completions needed.",
    edPatientExperience:  "Provider presence during encounters improves ED patient experience scores.",
    opNotesBeforeLeaving: "In-clinic note completion; inbox burden shifted from home to point-of-care.",
  };
  return notes[driverId] ?? "Value from improved clinical documentation quality and efficiency.";
}

