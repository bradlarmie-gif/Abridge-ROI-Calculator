import { useState, useMemo } from "react";
import { DOMAIN_COLORS } from "@/lib/domainColors";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, ArrowLeftRight, ChevronUp } from "lucide-react";
import type { ProformaSettingSnapshot, ProformaConfig, DriverOnset, QuarterlyProviders } from "./proformaTypes";
import { SETTING_UNIT_LABELS } from "./proformaTypes";
import type { ExploreState } from "../explore/ExploreFlow";
import {
  computeDriverYear1Value,
  annualToQuarterlyProviders, quarterlyToAnnualProviders,
  annualToQuarterlyUtilization, quarterlyToAnnualUtilization,
  annualToQuarterlyPricing, quarterlyToAnnualPricing,
  scaleSettingValue,
} from "@/lib/proformaCalculations";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { computeAllDriverValues, HCC_UPLIFT_SCENARIOS } from "@/lib/exploreDriverCalcs";
import { PHYSICIAN_RETENTION_SCENARIOS, NURSING_RETENTION_SCENARIOS } from "@/lib/retentionScenarios";

export const DOMAIN_PILL_COLORS: Record<string, string> = DOMAIN_COLORS; // one app-wide palette (lib/domainColors)

const ONSET_OPTIONS: { value: DriverOnset; label: string }[] = [
  { value: "immediate", label: "Immediate" },
  { value: "delayed",   label: "M3+"       },
  { value: "phased",    label: "Phased"    },
  { value: "longTerm",  label: "M12+"      },
  { value: "custom",    label: "Custom"    },
];

export function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
}

export function recomputeDriverFromExploreState(driverId: string, state: ExploreState): number {
  const ti = state.timeDriverInputs;
  const isED = state.careSetting === 'ed';
  const isNursing = state.careSetting === 'nursing';
  // Delegate every engine-backed driver to the ONE canonical engine so this
  // recomputed value (the write path for driver.value) can never diverge from
  // Explore. patientAccess is the only driver that needs totalHoursSaved; derive
  // it exactly as Explore does (eligible encounters × minutes saved / 60).
  const eligible = state.annualEncounters * (state.utilizationPercent / 100);
  const hoursSaved = eligible * (state.minutesSavedPerEncounter || 0) / 60;
  const v = computeAllDriverValues(state, hoursSaved);

  switch (driverId) {
    case 'edLwbs':        return v.lwbsRecovery ?? -1;
    case 'edAdmission':   return v.admissionCapture ?? -1;
    case 'wrvu':          return (isED ? v.edEmLevel : v.wrvu) ?? -1;
    case 'hcc':           return v.hccCapture ?? -1;
    case 'denials':       return v.denialPrevention ?? -1;
    case 'ipDrg':         return v.drgAccuracy ?? -1;
    case 'ipObsDefense':  return v.obsDefense ?? -1;
    case 'patientAccess': return v.patientAccess ?? -1;
    case 'nursingOt':     return v.nursingOvertime ?? -1;
    case 'scribeCost':    return v.scribeCostReduction ?? -1;
    case 'retention': {
      // The proforma "retention" driver bundles retention + agency; the engine
      // keeps them separate, so sum them. (Also fixes inpatient retention, which
      // the old shadow computed on generic — not ip* — turnover fields.)
      // When retention is tracked, computeAllDriverValues has already zeroed the
      // replacement-cost dollar, so the bundle is agency-only (possibly 0).
      const bundled = isNursing
        ? (v.nursingRetention ?? 0) + (ti.nursingAgencyEnabled ? (v.nursingAgency ?? 0) : 0)
        : (v.providerWellbeing ?? 0) + (ti.physicianAgencyEnabled ? (v.physicianLocumAgency ?? 0) : 0);
      // Tracked is an explicit choice, so 0 is a REAL value here (the dollar is
      // intentionally out) — don't fall back to "keep prior". Only the counted
      // case treats a 0 bundle as "no backing / disabled" and keeps the prior.
      if (state.retentionMode !== 'counted') return bundled;
      return bundled > 0 ? bundled : -1;
    }
    case 'costReduction': {
      // Not an engine driver — a direct dollar amount the user types.
      const val = ti.estimatedCostReduction;
      return typeof val === 'number' ? val : -1;
    }
    // 'docQuality' has no backing input — hits default (-1) so the prior value is kept.
    default:
      return -1;
  }
}

/**
 * Build the setting patch for a driver edit. Updates the driver's value AND
 * syncs `setting.fullExploreState` to the new state — the drawer reads its
 * inputs/scenario pills from `fullExploreState`, so without syncing it the
 * controls snap back to stale values after every edit (the value recomputes and
 * the proforma moves, but the UI reverts — the reported bug).
 */
export function buildDriverChangeUpdate(
  setting: ProformaSettingSnapshot,
  driverId: string,
  newValue: number,
  newExploreState: ExploreState,
): Partial<ProformaSettingSnapshot> {
  const updatedDrivers = setting.drivers.map(d =>
    d.id === driverId ? { ...d, value: newValue, exploreState: newExploreState } : d
  );
  const newAnnualValue = updatedDrivers.reduce((sum, d) => sum + d.value, 0);
  return { drivers: updatedDrivers, annualValue: newAnnualValue, fullExploreState: newExploreState };
}

/**
 * Re-derive a setting's value layer from a changed ExploreState — used when an input
 * that affects EVERY driver changes (e.g. total encounters). Mirrors the snapshot
 * builder's convention: drivers recompute from the engine at the explore (pilot) scale,
 * then scale up by fullScale/pilot so investment and value still track on an expanding
 * deal. Drivers the engine can't recompute (manual dollars, implied docQuality) keep
 * their prior value. Aggregates roll up from the resulting driver set.
 */
export function recomputeSettingValues(
  setting: ProformaSettingSnapshot,
  newExploreState: ExploreState,
): Partial<ProformaSettingSnapshot> {
  const pilot = setting.providerCount || 1;
  const full = setting.fullScaleProviders || pilot;
  const scale = full > pilot && pilot > 0 ? full / pilot : 1;
  const drivers = setting.drivers.map(d => {
    const v = recomputeDriverFromExploreState(d.id, newExploreState);
    return v >= 0 ? { ...d, value: Math.round(v * scale) } : d;
  });
  const sumQ = (q: string) => drivers.filter(d => d.quadrant === q).reduce((s, d) => s + d.value, 0);
  return {
    drivers,
    annualValue: drivers.reduce((s, d) => s + d.value, 0),
    fullExploreState: newExploreState,
    capacityValue: sumQ("Capacity"),
    workforceValue: sumQ("Workforce"),
    revenueValue: sumQ("Revenue"),
    qualityValue: sumQ("Quality"),
  };
}

function NumInput({
  value, onChange, suffix, prefix, width = 'w-14',
}: {
  value: number; onChange: (v: number) => void;
  suffix?: string; prefix?: string; width?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState('');
  return (
    <div className="flex items-center h-8 bg-[#F5F0EB] rounded-lg overflow-hidden w-full focus-within:ring-2 focus-within:ring-[#EA2C00]/20">
      {prefix && <span className="pl-2.5 text-[11px] text-[#8C7E6E] select-none">{prefix}</span>}
      <input
        type="text" inputMode="numeric"
        value={editing ? raw : value.toLocaleString()}
        onChange={(e) => {
          const c = e.target.value.replace(/[^0-9.]/g, '');
          setRaw(c);
          const n = parseFloat(c);
          if (!isNaN(n)) onChange(n);
        }}
        onFocus={() => { setEditing(true); setRaw(String(value)); }}
        onBlur={() => setEditing(false)}
        className={`${width} flex-1 h-full text-center text-[12px] font-semibold text-neutral-900 bg-transparent px-2 focus:outline-none`}
      />
      {suffix && <span className="pr-2.5 text-[11px] text-[#8C7E6E] select-none">{suffix}</span>}
    </div>
  );
}

function ScenarioPills({
  opts, value, onChange,
}: {
  opts: { key: string; label: string; sub: string }[];
  value: string;
  onChange: (k: string) => void;
}) {
  return (
    <div className="flex items-center bg-[#F5F0EB] rounded-xl p-1 gap-0.5 mt-2">
      {opts.map(o => (
        <button key={o.key} onClick={() => onChange(o.key)}
          className={`flex-1 py-1.5 px-1 rounded-lg text-center transition-all ${
            value === o.key
              ? 'bg-white text-neutral-900 shadow-sm'
              : 'text-[#8C7E6E] hover:text-neutral-700'
          }`}
        >
          <span className="block text-[10px] font-semibold leading-tight">{o.label}</span>
          <span className="block text-[9px] text-neutral-400 leading-tight mt-0.5">{o.sub}</span>
        </button>
      ))}
    </div>
  );
}

export function ModelAssumptionRow({
  settingId, driver, setting, config, onUpdate, onOnsetChange,
}: {
  settingId: string;
  driver: { id: string; name: string; value: number; onset: string; quadrant: string; customOnsetMonths?: number };
  setting: ProformaSettingSnapshot;
  config: ProformaConfig;
  onUpdate: (settingId: string, driverId: string, newValue: number, newExploreState: ExploreState) => void;
  onOnsetChange: (settingId: string, driverId: string, onset: DriverOnset, customOnsetMonths?: number) => void;
}) {
  const color = DOMAIN_PILL_COLORS[driver.quadrant] || '#888';
  const onset = (driver.onset || "immediate") as DriverOnset;
  const year1Est = computeDriverYear1Value(driver.value, onset, setting, config, driver.customOnsetMonths);

  const [localCustomPct, setLocalCustomPct] = useState<number>(50);
  const [useLocalCustom, setUseLocalCustom] = useState(false);

  const es = setting.fullExploreState;
  const ti = es?.timeDriverInputs;
  const dq = es?.docQualityInputs;

  const mutateAndRecompute = (newES: ExploreState) => {
    const newVal = recomputeDriverFromExploreState(driver.id, newES);
    onUpdate(settingId, driver.id, newVal >= 0 ? newVal : driver.value, newES);
  };

  const updateTI = (updates: Record<string, unknown>) => {
    if (!es || !ti) return;
    mutateAndRecompute({ ...es, timeDriverInputs: { ...ti, ...updates } as ExploreState['timeDriverInputs'] });
  };

  const updateDQ = (updates: Record<string, unknown>) => {
    if (!es || !dq) return;
    mutateAndRecompute({ ...es, docQualityInputs: { ...dq, ...updates } as ExploreState['docQualityInputs'] });
  };

  const renderParams = () => {
    if (!es || !ti || !dq) return null;
    switch (driver.id) {
      case 'edLwbs':
        return (
          <div className="grid grid-cols-3 gap-2 mt-2.5">
            <div>
              <p className="text-[9px] text-neutral-400 uppercase tracking-wider mb-1.5">LWBS Rate</p>
              <NumInput value={ti.edLwbsRate} onChange={v => updateTI({ edLwbsRate: v })} suffix="%" />
            </div>
            <div>
              <p className="text-[9px] text-neutral-400 uppercase tracking-wider mb-1.5">Reduction</p>
              <NumInput value={ti.edLwbsReduction} onChange={v => updateTI({ edLwbsReduction: v })} suffix="%" />
            </div>
            <div>
              <p className="text-[9px] text-neutral-400 uppercase tracking-wider mb-1.5">Rev / Visit</p>
              <NumInput value={ti.edRevenuePerVisit} onChange={v => updateTI({ edRevenuePerVisit: v })} prefix="$" />
            </div>
          </div>
        );
      case 'edAdmission':
        return (
          <div className="grid grid-cols-2 gap-2 mt-2.5">
            <div>
              <p className="text-[9px] text-neutral-400 uppercase tracking-wider mb-1.5">Admission Rate</p>
              <NumInput value={ti.edAdmissionRate} onChange={v => updateTI({ edAdmissionRate: v })} suffix="%" />
            </div>
            <div>
              <p className="text-[9px] text-neutral-400 uppercase tracking-wider mb-1.5">Rev / Admission</p>
              <NumInput value={ti.edAdmissionRevenue} onChange={v => updateTI({ edAdmissionRevenue: v })} prefix="$" />
            </div>
          </div>
        );
      case 'wrvu': {
        const isED = es.careSetting === 'ed';
        const customSub = dq.wrvuScenario === 'custom' ? `${dq.wrvuCustomPercent ?? 5}%` : 'set %';
        const opts = isED
          ? [{ key: 'conservative', label: 'Conservative', sub: '2%' }, { key: 'typical', label: 'Typical', sub: '5%' }, { key: 'aggressive', label: 'Optimistic', sub: '9%' }, { key: 'custom', label: 'Custom', sub: customSub }]
          : [{ key: 'conservative', label: 'Conservative', sub: '2%' }, { key: 'typical', label: 'Typical', sub: '5%' }, { key: 'aggressive', label: 'Optimistic', sub: '9%' }, { key: 'custom', label: 'Custom', sub: customSub }];
        return (
          <div className="mt-2">
            <p className="text-[9px] text-neutral-400 uppercase tracking-wider">E/M Level Accuracy</p>
            <ScenarioPills opts={opts} value={dq.wrvuScenario} onChange={k => updateDQ({ wrvuScenario: k })} />
            {dq.wrvuScenario === 'custom' && (
              <div className="mt-2.5">
                <p className="text-[9px] text-neutral-400 uppercase tracking-wider mb-1.5">Custom Lift</p>
                <NumInput value={dq.wrvuCustomPercent ?? 5} onChange={v => updateDQ({ wrvuCustomPercent: v })} suffix="%" />
              </div>
            )}
          </div>
        );
      }
      case 'hcc': {
        return (
          <div className="mt-2">
            <p className="text-[9px] text-neutral-400 uppercase tracking-wider mb-1.5">Recapture — Per Plan</p>
            {dq.hccPlans.map((plan: { id: string; name: string; panelSize: number; currentRecaptureRate: number; uplift: string; upliftCustomPp?: number }) => {
              const upliftPp = plan.uplift === 'custom' ? (plan.upliftCustomPp ?? 5) : (HCC_UPLIFT_SCENARIOS[plan.uplift] ?? 5);
              const effectiveUplift = Math.min(upliftPp, Math.max(0, 90 - plan.currentRecaptureRate));
              const projected = plan.currentRecaptureRate + effectiveUplift;
              return (
                <div key={plan.id} className="flex justify-between items-center text-[10px] text-neutral-500 mb-0.5">
                  <span>{plan.name} ({plan.panelSize} pts/prov)</span>
                  <span className="text-neutral-400">{plan.currentRecaptureRate}% → {projected}%</span>
                </div>
              );
            })}
            <p className="text-[9px] text-neutral-400 mt-1.5">Adjust per-plan in the HCC driver.</p>
          </div>
        );
      }
      case 'denials': {
        const isED = es.careSetting === 'ed';
        const isDenCustom = useLocalCustom && driver.id === 'denials';
        const customSub = isDenCustom ? `${localCustomPct}%` : 'set %';
        const activeDenScenario = isDenCustom ? 'custom' : dq.denialsScenario;
        const baseOpts = isED
          ? [{ key: 'conservative', label: 'Conservative', sub: '15%' }, { key: 'typical', label: 'Typical', sub: '30%' }, { key: 'aggressive', label: 'Optimistic', sub: '50%' }]
          : [{ key: 'conservative', label: 'Conservative', sub: '25%' }, { key: 'typical', label: 'Typical', sub: '50%' }, { key: 'aggressive', label: 'Optimistic', sub: '75%' }];
        const denOpts = [...baseOpts, { key: 'custom', label: 'Custom', sub: customSub }];
        const handleDenChange = (k: string) => {
          if (k === 'custom') { setUseLocalCustom(true); return; }
          setUseLocalCustom(false);
          updateDQ({ denialsScenario: k });
        };
        const handleDenCustomPct = (v: number) => {
          setLocalCustomPct(v);
          if (!es) return;
          const eligibleEnc = es.annualEncounters * (es.utilizationPercent / 100);
          const prevented = eligibleEnc * (dq!.medNecessityDenialRate / 100) * (v / 100);
          const newVal = Math.round(prevented * dq!.avgClaimValue * (dq!.denialsRealization / 100));
          onUpdate(settingId, driver.id, newVal, es);
        };
        return (
          <div className="mt-2">
            <p className="text-[9px] text-neutral-400 uppercase tracking-wider">Prevention Scenario</p>
            <ScenarioPills opts={denOpts} value={activeDenScenario} onChange={handleDenChange} />
            {isDenCustom && (
              <div className="mt-2.5">
                <p className="text-[9px] text-neutral-400 uppercase tracking-wider mb-1.5">Custom Prevention</p>
                <NumInput value={localCustomPct} onChange={handleDenCustomPct} suffix="%" />
              </div>
            )}
          </div>
        );
      }
      case 'ipDrg': {
        const isDrgCustom = useLocalCustom && driver.id === 'ipDrg';
        const customSub = isDrgCustom ? `${localCustomPct}%` : 'set %';
        const opts = [
          { key: 'conservative', label: 'Conservative', sub: '15%' },
          { key: 'typical', label: 'Typical', sub: '20%' },
          { key: 'aggressive', label: 'Optimistic', sub: '25%' },
          { key: 'custom', label: 'Custom', sub: customSub },
        ];
        const handleDrgChange = (k: string) => {
          if (k === 'custom') { setUseLocalCustom(true); return; }
          setUseLocalCustom(false);
          updateDQ({ ipDrgScenario: k });
        };
        const handleDrgCustom = (v: number) => {
          setLocalCustomPct(v);
          if (!es) return;
          const eligibleEnc = es.annualEncounters * (es.utilizationPercent / 100);
          const atRisk = eligibleEnc * (dq!.ipDrgAtRiskRate / 100);
          const newVal = Math.round(atRisk * (v / 100) * dq!.ipDrgWeightIncrease * dq!.ipDrgBasePayment * (dq!.ipDrgRealization / 100));
          onUpdate(settingId, driver.id, newVal, es);
        };
        return (
          <div className="mt-2">
            <p className="text-[9px] text-neutral-400 uppercase tracking-wider">DRG Protection Scenario</p>
            <ScenarioPills opts={opts} value={isDrgCustom ? 'custom' : dq.ipDrgScenario} onChange={handleDrgChange} />
            {isDrgCustom && (
              <div className="mt-2.5">
                <p className="text-[9px] text-neutral-400 uppercase tracking-wider mb-1.5">Custom Protection</p>
                <NumInput value={localCustomPct} onChange={handleDrgCustom} suffix="%" />
              </div>
            )}
          </div>
        );
      }
      case 'retention': {
        const isNursing = es.careSetting === 'nursing';
        const customSub = ti.retentionImpactScenario === 'custom' ? `${ti.retentionCustomPercent ?? 10}%` : 'set %';
        // Labels read from the single retention source so they can't drift from the math.
        const RS = isNursing ? NURSING_RETENTION_SCENARIOS : PHYSICIAN_RETENTION_SCENARIOS;
        const opts = [
          { key: 'conservative', label: 'Conservative', sub: `${RS.conservative}%` },
          { key: 'typical', label: 'Typical', sub: `${RS.typical}%` },
          { key: 'optimistic', label: 'Optimistic', sub: `${RS.optimistic}%` },
          { key: 'custom', label: 'Custom', sub: customSub },
        ];
        const turnoverRate = isNursing ? ti.nursingTurnoverRate : ti.annualTurnoverRate;
        const replaceCost = isNursing ? ti.nursingReplacementCost : ti.replacementCost;
        return (
          <div className="mt-2">
            <p className="text-[9px] text-neutral-400 uppercase tracking-wider">Retention Impact</p>
            <ScenarioPills opts={opts} value={ti.retentionImpactScenario} onChange={k => updateTI({ retentionImpactScenario: k })} />
            {ti.retentionImpactScenario === 'custom' && (
              <div className="mt-2.5">
                <p className="text-[9px] text-neutral-400 uppercase tracking-wider mb-1.5">Custom Impact</p>
                <NumInput value={ti.retentionCustomPercent ?? 10} onChange={v => updateTI({ retentionCustomPercent: v })} suffix="%" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 mt-2.5">
              <div>
                <p className="text-[9px] text-neutral-400 uppercase tracking-wider mb-1.5">Turnover Rate</p>
                <NumInput value={turnoverRate} onChange={v => updateTI(isNursing ? { nursingTurnoverRate: v } : { annualTurnoverRate: v })} suffix="%" />
              </div>
              <div>
                <p className="text-[9px] text-neutral-400 uppercase tracking-wider mb-1.5">Replace Cost</p>
                <NumInput value={replaceCost} onChange={v => updateTI(isNursing ? { nursingReplacementCost: v } : { replacementCost: v })} prefix="$" />
              </div>
            </div>
          </div>
        );
      }
      case 'patientAccess':
        return (
          <div className="grid grid-cols-2 gap-2 mt-2.5">
            <div>
              <p className="text-[9px] text-neutral-400 uppercase tracking-wider mb-1.5">Capacity Reinvest</p>
              <NumInput value={ti.capacityRealizationPercent ?? 25} onChange={v => updateTI({ capacityRealizationPercent: v })} suffix="%" />
            </div>
            <div>
              <p className="text-[9px] text-neutral-400 uppercase tracking-wider mb-1.5">Rev / Visit</p>
              <NumInput value={ti.revenuePerVisit} onChange={v => updateTI({ revenuePerVisit: v })} prefix="$" />
            </div>
          </div>
        );
      case 'nursingOt':
        return (
          <div className="grid grid-cols-3 gap-2 mt-2.5">
            <div>
              <p className="text-[9px] text-neutral-400 uppercase tracking-wider mb-1.5">OT Hrs / Wk</p>
              <NumInput value={ti.nursingOtHoursPerNurseWeek} onChange={v => updateTI({ nursingOtHoursPerNurseWeek: v })} />
            </div>
            <div>
              <p className="text-[9px] text-neutral-400 uppercase tracking-wider mb-1.5">Reduction</p>
              <NumInput value={ti.nursingOtReductionPercent} onChange={v => updateTI({ nursingOtReductionPercent: v })} suffix="%" />
            </div>
            <div>
              <p className="text-[9px] text-neutral-400 uppercase tracking-wider mb-1.5">OT Rate</p>
              <NumInput value={ti.nursingOtHourlyRate} onChange={v => updateTI({ nursingOtHourlyRate: v })} prefix="$" />
            </div>
          </div>
        );
      case 'ipObsDefense': {
        return (
          <div className="mt-2">
            <p className="text-[9px] text-neutral-400 uppercase tracking-wider mb-1.5">Status / Medical Necessity Denials · on total admissions</p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="text-[9px] text-neutral-400 uppercase tracking-wider mb-1.5">Denied</p>
                <NumInput value={dq.ipObsDenialRate} onChange={v => updateDQ({ ipObsDenialRate: v })} suffix="%" />
              </div>
              <div>
                <p className="text-[9px] text-neutral-400 uppercase tracking-wider mb-1.5">Allowed / Case</p>
                <NumInput value={dq.ipObsAllowedPerCase} onChange={v => updateDQ({ ipObsAllowedPerCase: v })} prefix="$" />
              </div>
              <div>
                <p className="text-[9px] text-neutral-400 uppercase tracking-wider mb-1.5">Not Recovered</p>
                <NumInput value={dq.ipObsNotRecoveredPct} onChange={v => updateDQ({ ipObsNotRecoveredPct: v })} suffix="%" />
              </div>
              <div>
                <p className="text-[9px] text-neutral-400 uppercase tracking-wider mb-1.5">Doc Material</p>
                <NumInput value={dq.ipObsDocMaterialPct} onChange={v => updateDQ({ ipObsDocMaterialPct: v })} suffix="%" />
              </div>
              <div>
                <p className="text-[9px] text-neutral-400 uppercase tracking-wider mb-1.5">Abridge Opp.</p>
                <NumInput value={dq.ipObsAbridgeOpportunityPct} onChange={v => updateDQ({ ipObsAbridgeOpportunityPct: v })} suffix="%" />
              </div>
              <div>
                <p className="text-[9px] text-neutral-400 uppercase tracking-wider mb-1.5">Abridge Impact</p>
                <NumInput value={dq.ipObsAbridgeImpactPct} onChange={v => updateDQ({ ipObsAbridgeImpactPct: v })} suffix="%" />
              </div>
            </div>
          </div>
        );
      }
      case 'costReduction':
        return (
          <div className="mt-2.5">
            <p className="text-[9px] text-neutral-400 uppercase tracking-wider mb-1.5">Estimated Annual Cost Reduction</p>
            <NumInput value={ti.estimatedCostReduction} onChange={v => updateTI({ estimatedCostReduction: v })} prefix="$" />
          </div>
        );
      case 'scribeCost': {
        const isHourly = ti.scribeBillingMode === 'hourly';
        return (
          <div className="mt-2">
            <p className="text-[9px] text-neutral-400 uppercase tracking-wider mb-1.5">Billing Mode</p>
            <div className="flex items-center bg-[#F5F0EB] rounded-xl p-1 gap-0.5">
              {([['headcount', 'position'], ['hourly', 'hourly']] as const).map(([lbl, mode]) => (
                <button key={mode}
                  onClick={() => updateTI({ scribeBillingMode: mode })}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium text-center capitalize transition-all ${
                    ti.scribeBillingMode === mode ? 'bg-white text-neutral-900 shadow-sm' : 'text-[#8C7E6E] hover:text-neutral-700'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
            {isHourly ? (
              <div className="grid grid-cols-2 gap-2 mt-2.5">
                <div>
                  <p className="text-[9px] text-neutral-400 uppercase tracking-wider mb-1.5">Hourly Rate</p>
                  <NumInput value={ti.scribeHourlyRate} onChange={v => updateTI({ scribeHourlyRate: v })} prefix="$" />
                </div>
                <div>
                  <p className="text-[9px] text-neutral-400 uppercase tracking-wider mb-1.5">Min / Note</p>
                  <NumInput value={ti.scribeMinutesPerNote} onChange={v => updateTI({ scribeMinutesPerNote: v })} />
                </div>
                <div>
                  <p className="text-[9px] text-neutral-400 uppercase tracking-wider mb-1.5">Coverage</p>
                  <NumInput value={ti.scribeCoveragePercent} onChange={v => updateTI({ scribeCoveragePercent: v })} suffix="%" />
                </div>
                <div>
                  <p className="text-[9px] text-neutral-400 uppercase tracking-wider mb-1.5">% Eliminated</p>
                  <NumInput value={ti.scribeVisitPercentEliminated} onChange={v => updateTI({ scribeVisitPercentEliminated: v })} suffix="%" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 mt-2.5">
                <div>
                  <p className="text-[9px] text-neutral-400 uppercase tracking-wider mb-1.5">Headcount</p>
                  <NumInput value={ti.scribeHeadcount} onChange={v => updateTI({ scribeHeadcount: v })} />
                </div>
                <div>
                  <p className="text-[9px] text-neutral-400 uppercase tracking-wider mb-1.5">Eliminated</p>
                  <NumInput value={ti.scribePositionsEliminated} onChange={v => updateTI({ scribePositionsEliminated: v })} />
                </div>
                <div>
                  <p className="text-[9px] text-neutral-400 uppercase tracking-wider mb-1.5">Cost / Position</p>
                  <NumInput value={ti.scribeCostPerPosition} onChange={v => updateTI({ scribeCostPerPosition: v })} prefix="$" />
                </div>
              </div>
            )}
          </div>
        );
      }
      case 'docQuality':
        // Implied fallback driver with no backing input field — edit it as a
        // direct dollar override (explore state unchanged; recompute has no case).
        if (!es) return null;
        return (
          <div className="mt-2.5">
            <p className="text-[9px] text-neutral-400 uppercase tracking-wider mb-1.5">Annual Documentation Value</p>
            <NumInput value={driver.value} onChange={v => onUpdate(settingId, driver.id, v, es)} prefix="$" />
          </div>
        );
      default:
        return null;
    }
  };

  const params = renderParams();

  return (
    <div className="py-4 border-b border-[#F0EAE2] last:border-0">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-[3px] self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#1A1A1A" }}>{driver.quadrant}</p>
          <p className="text-[13px] font-semibold text-neutral-900 leading-snug mt-0.5">{driver.name}</p>
        </div>
        <div className="text-right flex-shrink-0 pl-2">
          <p className="text-sm font-bold text-neutral-900">
            {fmtCompact(driver.value)}<span className="text-[10px] font-normal text-neutral-400 ml-0.5">/yr</span>
          </p>
          <p className="text-[10px] text-neutral-400 mt-0.5">
            {year1Est > 0 ? `≈${fmtCompact(year1Est)} yr 1` : 'starts yr 2+'}
          </p>
        </div>
      </div>

      {/* Params */}
      {params && (
        <div className="mt-3 ml-4 pl-3 border-l-2 border-[#F0EAE2]">
          {params}
        </div>
      )}

      {/* Onset timing */}
      <div className="mt-3 ml-4 pl-3 border-l-2 border-[#F0EAE2]">
        <p className="text-[9px] text-neutral-400 uppercase tracking-wider mb-1.5">Timing</p>
        <div className="flex items-center bg-[#F5F0EB] rounded-xl p-1 gap-0.5">
          {ONSET_OPTIONS.map(opt => (
            <button key={opt.value}
              onClick={() => onOnsetChange(settingId, driver.id, opt.value, opt.value === 'custom' ? (driver.customOnsetMonths ?? 6) : undefined)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium text-center transition-all ${
                onset === opt.value ? 'bg-white text-neutral-900 shadow-sm' : 'text-[#8C7E6E] hover:text-neutral-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {onset === 'custom' && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-neutral-500">Value starts at month</span>
            <NumInput
              value={driver.customOnsetMonths ?? 6}
              onChange={(v) => onOnsetChange(settingId, driver.id, 'custom', Math.max(0, Math.round(v)))}
              width="w-12"
            />
          </div>
        )}
      </div>
    </div>
  );
}

type ModelKey = "perUnit" | "perEncounter" | "annualFlat" | "platform";

interface CompRates {
  perUnit: number;
  perEncounter: number;
  annualFlat: number;
  platform: { fee: number; encRate: number };
}

const QKEYS: (keyof QuarterlyProviders)[] = ["q1","q2","q3","q4","q5","q6","q7","q8","q9","q10","q11","q12"];
const qInputCls = "w-full h-7 bg-white border border-neutral-200 rounded-md px-1 text-[11px] font-medium text-neutral-900 text-right focus:outline-none focus:ring-1 focus:ring-[#EA2C00]/30";

// Small Yr|Qtr pill toggle, matching the scenario/pricing switcher styling.
function GranularityToggle({ quarterly, onToggle }: { quarterly: boolean; onToggle: (q: boolean) => void }) {
  return (
    <div className="flex items-center gap-0.5 bg-[#F5F0EB] rounded-full p-0.5">
      {([["Yr", false], ["Qtr", true]] as const).map(([lbl, q]) => (
        <button
          key={lbl}
          onClick={() => { if (quarterly !== q) onToggle(q); }}
          className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition-colors ${
            quarterly === q ? "bg-white text-neutral-900 shadow-sm" : "text-[#8C7E6E] hover:text-neutral-900"
          }`}
        >
          {lbl}
        </button>
      ))}
    </div>
  );
}

// Quarterly input grid — quarters grouped by year (Q1–Q4 per row), capped at 3 years.
// All three quarterly types are structurally identical (q1..q12: number), so
// QuarterlyProviders stands in for any of them here.
function QuarterlyGrid({
  contractYears, quarterly, onChange, renderInput,
}: {
  contractYears: number;
  quarterly: QuarterlyProviders;
  onChange: (qk: keyof QuarterlyProviders, v: number) => void;
  renderInput: (value: number, onChange: (v: number) => void) => React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      {Array.from({ length: Math.min(contractYears, 3) }, (_, yi) => (
        <div key={yi}>
          <p className="text-[10px] text-neutral-400 mb-1">Y{yi + 1}</p>
          <div className="grid grid-cols-4 gap-1">
            {[0, 1, 2, 3].map(qi => {
              const qk = QKEYS[yi * 4 + qi];
              return (
                <div key={qk}>
                  <p className="text-[8px] text-neutral-300 mb-0.5 text-center">Q{qi + 1}</p>
                  {renderInput(quarterly[qk] ?? 0, (v) => onChange(qk, v))}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function VolumeAndPricingSection({
  setting,
  config,
  onUpdateSetting,
}: {
  setting: ProformaSettingSnapshot;
  config: ProformaConfig;
  onUpdateSetting: (id: string, updates: Partial<ProformaSettingSnapshot>) => void;
}) {
  const [showComparison, setShowComparison] = useState(false);
  const actualTermYears = Math.ceil(config.contractTermMonths / 12);
  const contractYears = Math.min(actualTermYears, 3);
  const isExtendedTerm = actualTermYears > 3;
  const yearLabel = (i: number) => i < 2 ? `Y${i + 1}` : (isExtendedTerm ? "Y3+" : "Y3");
  const unitLabel = SETTING_UNIT_LABELS[setting.careSetting] || "Providers";
  const pricingModel = (setting.pricingModel || "perUnit") as ModelKey;
  const isEncPricing = pricingModel === "perEncounter";
  const isAnnualFlat = pricingModel === "annualFlat";
  const isPlatform = pricingModel === "platform";

  const yp = setting.yearlyProviders ?? {
    year1: setting.providerCount,
    year2: setting.fullScaleProviders ?? setting.providerCount,
    year3: setting.fullScaleProviders ?? setting.providerCount,
  };

  const defaultPrice = isAnnualFlat || isPlatform ? (setting.annualLicenseFee || 0)
    : isEncPricing ? (setting.costPerEncounter || 0)
    : setting.costPerUnit;
  const yPricing = setting.yearlyPricing || { year1: defaultPrice, year2: defaultPrice, year3: defaultPrice };

  const defaultUtil = setting.careSetting === "nursing" && config.nursingYearlyUtilization
    ? config.nursingYearlyUtilization
    : config.yearlyUtilization;
  const yu = setting.yearlyUtilization ?? defaultUtil;

  const yearKeys = (["year1", "year2", "year3"] as const).slice(0, contractYears);
  const colClass = contractYears === 3 ? "grid-cols-3" : contractYears === 2 ? "grid-cols-2" : "grid-cols-1";
  const inputCls = "w-full h-8 bg-white border border-neutral-200 rounded-lg px-2 text-sm font-medium text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/20 focus-visible:ring-1 focus-visible:ring-[#EA2C00]/40 focus-visible:ring-offset-0";

  // Comparison panel state and logic
  const encPerProv = setting.providerCount > 0 ? setting.encounters / setting.providerCount : 0;
  // Inpatient volume is measured in discharges, not encounters.
  const isInpatientSetting = setting.careSetting === 'inpatient';
  const volNounPl = isInpatientSetting ? 'discharges' : 'encounters';
  const volNounAbbr = isInpatientSetting ? 'dc' : 'enc';
  const VolNounPlCap = isInpatientSetting ? 'Discharges' : 'Encounters';
  const VolNounSingCap = isInpatientSetting ? 'Discharge' : 'Encounter';
  const [compRates, setCompRates] = useState<CompRates>(() => ({
    perUnit: setting.costPerUnit || 175,
    perEncounter: setting.costPerEncounter || 1.67,
    annualFlat: setting.annualLicenseFee || Math.round((setting.costPerUnit || 175) * (yp.year2 ?? yp.year1) * 12 / 1000) * 1000,
    platform: {
      fee: setting.annualLicenseFee || 500000,
      encRate: setting.platformEncRate ?? setting.costPerEncounter ?? 0.50,
    },
  }));

  const termYears = actualTermYears;
  const annualValue = setting.annualValue;
  const totalValue = annualValue * termYears;

  const yearlyEncounters = useMemo(() => {
    if (setting.yearlyEncounters) return setting.yearlyEncounters;
    const ep = encPerProv;
    const y1 = (yp.year1 ?? setting.providerCount) * ep;
    const y2 = (yp.year2 ?? setting.fullScaleProviders ?? setting.providerCount) * ep;
    const y3 = (yp.year3 ?? setting.fullScaleProviders ?? setting.providerCount) * ep;
    return { year1: y1, year2: y2, year3: y3 };
  }, [setting, yp, encPerProv]);

  const computeInv = useMemo(() => (model: ModelKey) => {
    const provByYear = [yp.year1, yp.year2 ?? yp.year1, yp.year3 ?? yp.year2 ?? yp.year1];
    const encByYear = [yearlyEncounters.year1, yearlyEncounters.year2, yearlyEncounters.year3];
    const yuArr = [yu.year1, yu.year2 ?? yu.year1, yu.year3 ?? yu.year2 ?? yu.year1];
    const years = Array.from({ length: termYears }, (_, i) => {
      const idx = Math.min(i, 2);
      if (model === "perUnit") return provByYear[idx] * compRates.perUnit * 12;
      const abridgeEnc = Math.round(encByYear[idx] * (yuArr[idx] ?? 0) / 100);
      if (model === "perEncounter") {
        if (setting.bankedEncounters) {
          const billingIdx = i === 0 ? -1 : Math.min(i - 1, 2);
          const billedEnc = billingIdx < 0 ? 0 : Math.round(encByYear[billingIdx] * (yuArr[billingIdx] ?? 0) / 100);
          return billedEnc * compRates.perEncounter;
        }
        return abridgeEnc * compRates.perEncounter;
      }
      if (model === "platform") {
        if (setting.bankedEncounters) {
          const billingIdx = i === 0 ? -1 : Math.min(i - 1, 2);
          const billedEnc = billingIdx < 0 ? 0 : Math.round(encByYear[billingIdx] * (yuArr[billingIdx] ?? 0) / 100);
          return compRates.platform.fee + billedEnc * compRates.platform.encRate;
        }
        return compRates.platform.fee + abridgeEnc * compRates.platform.encRate;
      }
      return compRates.annualFlat;  // annualFlat
    });
    const total = years.reduce((s, v) => s + v, 0);
    const net = totalValue - total;
    const roi = total > 0 ? ((net / total) * 100) : 0;
    return { years, total, net, roi };
  }, [compRates, yp, yearlyEncounters, yu, termYears, totalValue]);

  const modelDefs: { key: ModelKey; name: string; shortName: string; desc: string }[] = [
    { key: "perUnit",      name: `$ / ${unitLabel.replace(/s$/, "")} / Mo`, shortName: "$ / Mo",  desc: "Rate × licensed providers × 12" },
    { key: "perEncounter", name: `Per ${VolNounSingCap}`,  shortName: isInpatientSetting ? "Per Dc" : "Per Enc",   desc: `Rate × ${volNounPl} / year` },
    { key: "annualFlat",   name: "Annual License", shortName: "Annual",    desc: "Fixed yearly fee regardless of usage" },
    { key: "platform",     name: "Platform",       shortName: "Platform",  desc: `Annual fee + per-${isInpatientSetting ? "discharge" : "encounter"} rate` },
  ];

  const applyModel = (key: ModelKey) => {
    if (key === "perUnit") {
      onUpdateSetting(setting.id, { pricingModel: "perUnit", costPerUnit: compRates.perUnit, yearlyPricing: undefined });
    } else if (key === "perEncounter") {
      onUpdateSetting(setting.id, { pricingModel: "perEncounter", costPerEncounter: compRates.perEncounter, yearlyPricing: undefined });
    } else if (key === "annualFlat") {
      onUpdateSetting(setting.id, { pricingModel: "annualFlat", annualLicenseFee: compRates.annualFlat, yearlyPricing: undefined });
    } else if (key === "platform") {
      onUpdateSetting(setting.id, { pricingModel: "platform", annualLicenseFee: compRates.platform.fee, platformEncRate: compRates.platform.encRate, yearlyPricing: undefined });
    }
  };

  return (
    <div className="space-y-4">
      {/* Pricing Model switcher — at top so it frames everything below */}
      <div>
        <p className="text-[11px] text-neutral-500 mb-2">Pricing Model</p>
        <div className="flex items-center gap-0.5 bg-[#F5F0EB] rounded-full p-0.5">
          {modelDefs.map(m => (
            <button
              key={m.key}
              onClick={() => { if (pricingModel !== m.key) applyModel(m.key); }}
              className={`flex-1 px-2 py-1 rounded-full text-[10px] font-medium transition-colors ${
                pricingModel === m.key
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-[#8C7E6E] hover:text-neutral-900"
              }`}
            >
              {m.shortName}
            </button>
          ))}
        </div>
      </div>

      {/* Providers — yearly or quarterly ramp */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] text-neutral-500">{unitLabel}</p>
          <GranularityToggle
            quarterly={!!setting.quarterlyProviders}
            onToggle={(q) => {
              if (q) {
                onUpdateSetting(setting.id, { quarterlyProviders: annualToQuarterlyProviders(yp) });
              } else {
                const ann = setting.quarterlyProviders ? quarterlyToAnnualProviders(setting.quarterlyProviders) : yp;
                onUpdateSetting(setting.id, {
                  quarterlyProviders: undefined,
                  yearlyProviders: ann,
                  providerCount: ann.year1,
                  fullScaleProviders: ann.year3 ?? ann.year2 ?? ann.year1,
                });
              }
            }}
          />
        </div>
        {setting.quarterlyProviders ? (
          <QuarterlyGrid
            contractYears={contractYears}
            quarterly={setting.quarterlyProviders}
            onChange={(qk, v) => {
              // Quarterly is the source of truth; keep the annual mirror in sync so
              // yearly-reading surfaces (PDF scale labels, encounter displays) stay correct.
              const nextQ = { ...setting.quarterlyProviders!, [qk]: v };
              const ann = quarterlyToAnnualProviders(nextQ);
              const newFull = ann.year3 ?? ann.year2 ?? ann.year1;
              onUpdateSetting(setting.id, {
                quarterlyProviders: nextQ,
                yearlyProviders: ann,
                providerCount: ann.year1,
                fullScaleProviders: newFull,
                // Rescale value when the full-scale (Q12) moves — same as yearly. No-ops otherwise.
                ...(isEncPricing ? {} : scaleSettingValue(setting, newFull)),
              });
            }}
            renderInput={(value, onChange) => <FormattedNumberInput value={value} onChange={onChange} className={qInputCls} />}
          />
        ) : (
          <div className={`grid ${colClass} gap-2`}>
            {yearKeys.map((yk, i) => (
              <div key={yk}>
                <p className="text-[10px] text-neutral-400 mb-1">{yearLabel(i)}</p>
                <FormattedNumberInput
                  value={yp[yk]}
                  onChange={(v) => {
                    const updated = { ...yp, [yk]: v };
                    const newFull = updated.year3 ?? updated.year2 ?? updated.year1;
                    onUpdateSetting(setting.id, {
                      yearlyProviders: updated,
                      providerCount: updated.year1,
                      fullScaleProviders: newFull,
                      // Editing the full-scale count rescales the value (more providers
                      // → more value), mirroring Explore. No-ops unless full-scale moves.
                      // Per-encounter scales value by the encounter ramp already — skip.
                      ...(isEncPricing ? {} : scaleSettingValue(setting, newFull)),
                    });
                  }}
                  className={inputCls + " text-right"}
                />
              </div>
            ))}
          </div>
        )}
        {isExtendedTerm && <p className="text-[9px] text-neutral-400 mt-1.5">Y3+ rate held constant for years 4–{actualTermYears} (quarterly covers Y1–3)</p>}
      </div>

      {/* Utilization — yearly or quarterly ramp */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] text-neutral-500">Utilization</p>
          <GranularityToggle
            quarterly={!!setting.quarterlyUtilization}
            onToggle={(q) => {
              if (q) {
                onUpdateSetting(setting.id, { quarterlyUtilization: annualToQuarterlyUtilization(yu) });
              } else {
                const ann = setting.quarterlyUtilization ? quarterlyToAnnualUtilization(setting.quarterlyUtilization) : yu;
                onUpdateSetting(setting.id, { quarterlyUtilization: undefined, yearlyUtilization: ann });
              }
            }}
          />
        </div>
        {setting.quarterlyUtilization ? (
          <QuarterlyGrid
            contractYears={contractYears}
            quarterly={setting.quarterlyUtilization}
            onChange={(qk, v) => {
              const clamped = Math.min(100, Math.max(0, v));
              const nextQ = { ...setting.quarterlyUtilization!, [qk]: clamped };
              onUpdateSetting(setting.id, {
                quarterlyUtilization: nextQ,
                yearlyUtilization: quarterlyToAnnualUtilization(nextQ),
              });
            }}
            renderInput={(value, onChange) => (
              <div className="relative">
                <FormattedNumberInput value={value} onChange={onChange} className={qInputCls + " pr-4"} />
                <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-neutral-400">%</span>
              </div>
            )}
          />
        ) : (
          <div className={`grid ${colClass} gap-2`}>
            {yearKeys.map((yk, i) => (
              <div key={yk}>
                <p className="text-[10px] text-neutral-400 mb-1">{yearLabel(i)}</p>
                <div className="relative">
                  <FormattedNumberInput
                    value={yu[yk]}
                    onChange={(v) => {
                      const clamped = Math.min(100, Math.max(0, v));
                      onUpdateSetting(setting.id, { yearlyUtilization: { ...yu, [yk]: clamped } });
                    }}
                    className={inputCls + " text-right pr-6"}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-neutral-400">%</span>
                </div>
              </div>
            ))}
          </div>
        )}
        {isExtendedTerm && <p className="text-[9px] text-neutral-400 mt-1.5">Y3+ rate held constant for years 4–{actualTermYears} (quarterly covers Y1–3)</p>}
      </div>

      {/* Abridge Encounters by Year — primary display; total encounters editable as denominator */}
      {setting.careSetting !== 'nursing' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] text-neutral-500">Abridge {VolNounPlCap} by Year</p>
            <p className="text-[10px] text-neutral-400">util% × total {volNounAbbr}</p>
          </div>
          <div className={`grid ${colClass} gap-2`}>
            {yearKeys.map((yk, i) => {
              const encVal = Math.round(yearlyEncounters[yk] ?? 0);
              const abridgeEnc = Math.round(encVal * (yu[yk] ?? 0) / 100);
              return (
                <div key={yk}>
                  <p className="text-[10px] text-neutral-400 mb-1">{yearLabel(i)}</p>
                  <p className="text-sm font-semibold text-neutral-800 text-right px-2 py-1.5 bg-[#F5F0EB] rounded-lg">{abridgeEnc.toLocaleString()}</p>
                  <p className="text-[10px] text-neutral-400 mt-0.5 text-right pr-1">{encVal.toLocaleString()} total</p>
                </div>
              );
            })}
          </div>
          <details className="mt-2">
            <summary className="text-[10px] text-neutral-400 cursor-pointer hover:text-neutral-600 select-none">Edit total {volNounPl}</summary>
            <div className={`grid ${colClass} gap-2 mt-2`}>
              {yearKeys.map((yk, i) => {
                const encVal = Math.round(yearlyEncounters[yk] ?? 0);
                return (
                  <div key={yk}>
                    <p className="text-[10px] text-neutral-400 mb-1">{yearLabel(i)}</p>
                    <FormattedNumberInput
                      value={encVal}
                      onChange={(v) => {
                        const updated = { ...yearlyEncounters, [yk]: v };
                        // Editing total encounters must move the value drivers too — they're
                        // derived from the explore state's annualEncounters. Re-anchor it to the
                        // entered figure and re-derive every driver + the aggregates.
                        const es = setting.fullExploreState;
                        const patch = es
                          ? recomputeSettingValues(setting, { ...es, annualEncounters: v })
                          : {};
                        onUpdateSetting(setting.id, { yearlyEncounters: updated, ...patch });
                      }}
                      className={inputCls + " text-right"}
                    />
                  </div>
                );
              })}
            </div>
          </details>
          {isExtendedTerm && <p className="text-[9px] text-neutral-400 mt-1.5">Y3+ rate held constant for years 4–{actualTermYears}</p>}
        </div>
      )}

      {/* Current pricing inputs */}
      {!isAnnualFlat && !isPlatform && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] text-neutral-500">{isEncPricing ? `$ / ${VolNounSingCap}` : `$ / ${unitLabel.replace(/s$/, "")} / Mo`}</p>
            <GranularityToggle
              quarterly={!!setting.quarterlyPricing}
              onToggle={(q) => {
                if (q) {
                  onUpdateSetting(setting.id, { quarterlyPricing: annualToQuarterlyPricing(yPricing) });
                } else {
                  const ann = setting.quarterlyPricing ? quarterlyToAnnualPricing(setting.quarterlyPricing) : yPricing;
                  const leg: Partial<ProformaSettingSnapshot> = { quarterlyPricing: undefined, yearlyPricing: ann };
                  if (isEncPricing) leg.costPerEncounter = ann.year1; else leg.costPerUnit = ann.year1;
                  onUpdateSetting(setting.id, leg);
                }
              }}
            />
          </div>
          {setting.quarterlyPricing ? (
            <QuarterlyGrid
              contractYears={contractYears}
              quarterly={setting.quarterlyPricing}
              onChange={(qk, v) => {
                const nextQ = { ...setting.quarterlyPricing!, [qk]: v };
                const ann = quarterlyToAnnualPricing(nextQ);
                const upd: Partial<ProformaSettingSnapshot> = { quarterlyPricing: nextQ, yearlyPricing: ann };
                if (isEncPricing) upd.costPerEncounter = ann.year1; else upd.costPerUnit = ann.year1;
                onUpdateSetting(setting.id, upd);
              }}
              renderInput={(value, onChange) => (
                <div className="relative">
                  <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[9px] text-neutral-400">$</span>
                  <FormattedNumberInput value={value} onChange={onChange} className={qInputCls + " pl-3"} />
                </div>
              )}
            />
          ) : (
          <div className={`grid ${colClass} gap-2`}>
            {yearKeys.map((yk, i) => (
              <div key={yk}>
                <p className="text-[10px] text-neutral-400 mb-1">{yearLabel(i)}</p>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-neutral-400">$</span>
                  <FormattedNumberInput
                    value={yPricing[yk]}
                    onChange={(v) => {
                      const updated = { ...yPricing, [yk]: v };
                      const leg: Partial<ProformaSettingSnapshot> = { yearlyPricing: updated, quarterlyPricing: undefined };
                      if (isEncPricing) leg.costPerEncounter = updated.year1;
                      else leg.costPerUnit = updated.year1;
                      onUpdateSetting(setting.id, leg);
                    }}
                    className={inputCls + " text-right pl-5"}
                  />
                </div>
              </div>
            ))}
          </div>
          )}
          {isExtendedTerm && <p className="text-[9px] text-neutral-400 mt-1.5">Y3+ rate held constant for years 4–{actualTermYears}</p>}
          {isEncPricing && (
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#F0EAE2]">
              <div>
                <p className="text-[11px] text-neutral-700 font-medium">Banked encounters</p>
                <p className="text-[10px] text-neutral-400">Y1 consumption billed in Y2, Y2 in Y3</p>
              </div>
              <button
                onClick={() => onUpdateSetting(setting.id, { bankedEncounters: !setting.bankedEncounters })}
                className={`relative flex-shrink-0 w-8 h-4 rounded-full transition-colors ${setting.bankedEncounters ? 'bg-[#EA2C00]' : 'bg-neutral-200'}`}
              >
                <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${setting.bankedEncounters ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>
          )}
        </div>
      )}

      {isAnnualFlat && (
        <div>
          <p className="text-[11px] text-neutral-500 mb-2">Annual License Fee</p>
          <div className={`grid ${colClass} gap-2`}>
            {yearKeys.map((yk, i) => (
              <div key={yk}>
                <p className="text-[10px] text-neutral-400 mb-1">{yearLabel(i)}</p>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-neutral-400">$</span>
                  <FormattedNumberInput
                    value={yPricing[yk]}
                    onChange={(v) => {
                      const updated = { ...yPricing, [yk]: v };
                      // Mirror year1 into annualLicenseFee for the base (non-scheduled) path.
                      onUpdateSetting(setting.id, { yearlyPricing: updated, quarterlyPricing: undefined, annualLicenseFee: updated.year1 });
                    }}
                    className={inputCls + " text-right pl-5"}
                  />
                </div>
              </div>
            ))}
          </div>
          {isExtendedTerm && <p className="text-[9px] text-neutral-400 mt-1.5">Y3+ fee held constant for years 4–{actualTermYears}</p>}
        </div>
      )}

      {isPlatform && (
        <div className="space-y-3">
          <div>
            <p className="text-[11px] text-neutral-500 mb-2">Annual Platform Fee</p>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-neutral-400">$</span>
              <FormattedNumberInput
                value={setting.annualLicenseFee || 0}
                onChange={(v) => onUpdateSetting(setting.id, { annualLicenseFee: v })}
                className={inputCls + " pl-5"}
              />
            </div>
          </div>
          <div>
            <p className="text-[11px] text-neutral-500 mb-2">+ $ / {VolNounSingCap}</p>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-neutral-400">$</span>
              <FormattedNumberInput
                value={setting.platformEncRate ?? setting.costPerEncounter ?? 0}
                onChange={(v) => onUpdateSetting(setting.id, { platformEncRate: v })}
                className={inputCls + " pl-5"}
              />
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-[#F0EAE2]">
            <div>
              <p className="text-[11px] text-neutral-700 font-medium">Banked encounters</p>
              <p className="text-[10px] text-neutral-400">Y1 consumption billed in Y2, Y2 in Y3</p>
            </div>
            <button
              onClick={() => onUpdateSetting(setting.id, { bankedEncounters: !setting.bankedEncounters })}
              className={`relative flex-shrink-0 w-8 h-4 rounded-full transition-colors ${setting.bankedEncounters ? 'bg-[#EA2C00]' : 'bg-neutral-200'}`}
            >
              <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${setting.bankedEncounters ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>
      )}

      {/* Compare all models toggle */}
      <button
        onClick={() => setShowComparison(v => !v)}
        className="inline-flex items-center gap-1.5 text-xs text-[#6B5E4F] hover:text-[#4A3F35] font-medium transition-colors"
      >
        {showComparison ? <ChevronUp className="w-3 h-3" /> : <ArrowLeftRight className="w-3 h-3" />}
        {showComparison ? "Hide comparison" : "Compare all models"}
      </button>

      {/* Comparison table */}
      <AnimatePresence>
        {showComparison && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-[#E8E0D8] overflow-hidden text-[10px]">
              {/* Header row — model names */}
              <div className="grid grid-cols-[56px_1fr_1fr_1fr_1fr] gap-px bg-[#E8E0D8]">
                <div className="bg-[#FAFAF9] px-2 py-2" />
                {modelDefs.map(m => {
                  const active = pricingModel === m.key;
                  return (
                    <div key={m.key} className={`px-2 py-2 ${active ? "bg-[#FFF5F3]" : "bg-white"}`}>
                      <p className={`font-bold uppercase tracking-wide text-[9px] ${active ? "text-[#EA2C00]" : "text-neutral-400"}`}>{m.shortName}</p>
                    </div>
                  );
                })}
              </div>

              {/* Rate inputs row */}
              <div className="grid grid-cols-[56px_1fr_1fr_1fr_1fr] gap-px bg-[#E8E0D8]">
                <div className="bg-[#FAFAF9] px-2 py-2 flex items-center">
                  <p className="text-[9px] text-neutral-400">Rate</p>
                </div>
                {modelDefs.map(m => {
                  const active = pricingModel === m.key;
                  const cellCls = `px-1.5 py-1.5 ${active ? "bg-[#FFF5F3]" : "bg-white"}`;
                  const inputCls2 = `h-5 w-full text-[10px] text-right rounded px-1 border ${active ? "bg-white border-[#EA2C00]/20 text-neutral-900" : "bg-[#F5F0EB] border-neutral-200 text-neutral-900"}`;
                  return (
                    <div key={m.key} className={cellCls}>
                      {m.key === "perUnit" && (
                        <div className="flex items-center gap-0.5">
                          <span className="text-neutral-400">$</span>
                          <FormattedNumberInput value={compRates.perUnit} onChange={(v) => setCompRates(p => ({ ...p, perUnit: v }))} className={inputCls2} />
                          <span className="text-neutral-400 whitespace-nowrap">/mo</span>
                        </div>
                      )}
                      {m.key === "perEncounter" && (
                        <div className="flex items-center gap-0.5">
                          <span className="text-neutral-400">$</span>
                          <FormattedNumberInput value={compRates.perEncounter} onChange={(v) => setCompRates(p => ({ ...p, perEncounter: v }))} className={inputCls2} />
                          <span className="text-neutral-400 whitespace-nowrap">/enc</span>
                        </div>
                      )}
                      {m.key === "annualFlat" && (
                        <div className="flex items-center gap-0.5">
                          <span className="text-neutral-400">$</span>
                          <FormattedNumberInput value={compRates.annualFlat} onChange={(v) => setCompRates(p => ({ ...p, annualFlat: v }))} className={inputCls2} />
                          <span className="text-neutral-400 whitespace-nowrap">/yr</span>
                        </div>
                      )}
                      {m.key === "platform" && (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-0.5">
                            <span className="text-neutral-400">$</span>
                            <FormattedNumberInput value={compRates.platform.fee} onChange={(v) => setCompRates(p => ({ ...p, platform: { ...p.platform, fee: v } }))} className={inputCls2} />
                            <span className="text-neutral-400 whitespace-nowrap">/yr</span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <span className="text-neutral-400">$</span>
                            <FormattedNumberInput value={compRates.platform.encRate} onChange={(v) => setCompRates(p => ({ ...p, platform: { ...p.platform, encRate: v } }))} className={inputCls2} />
                            <span className="text-neutral-400 whitespace-nowrap">/enc</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Yearly cost rows */}
              {Array.from({ length: termYears }, (_, i) => (
                <div key={i} className="grid grid-cols-[56px_1fr_1fr_1fr_1fr] gap-px bg-[#E8E0D8]">
                  <div className="bg-[#FAFAF9] px-2 py-1.5 flex items-center">
                    <p className="text-[9px] text-neutral-400">{i < 2 ? `Y${i + 1}` : isExtendedTerm ? "Y3+" : "Y3"}</p>
                  </div>
                  {modelDefs.map(m => {
                    const inv = computeInv(m.key);
                    const active = pricingModel === m.key;
                    return (
                      <div key={m.key} className={`px-2 py-1.5 ${active ? "bg-[#FFF5F3]" : "bg-white"}`}>
                        <p className={`text-right ${active ? "text-[#EA2C00] font-medium" : "text-neutral-600"}`}>{fmtCompact(inv.years[i] ?? 0)}</p>
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Total row */}
              <div className="grid grid-cols-[56px_1fr_1fr_1fr_1fr] gap-px bg-[#E8E0D8]">
                <div className="bg-[#FAFAF9] px-2 py-1.5 flex items-center">
                  <p className="text-[9px] font-semibold text-neutral-500">Total</p>
                </div>
                {modelDefs.map(m => {
                  const inv = computeInv(m.key);
                  const active = pricingModel === m.key;
                  return (
                    <div key={m.key} className={`px-2 py-1.5 ${active ? "bg-[#FFF5F3]" : "bg-white"}`}>
                      <p className={`text-right font-bold ${active ? "text-[#EA2C00]" : "text-neutral-700"}`}>{fmtCompact(inv.total)}</p>
                    </div>
                  );
                })}
              </div>

              {/* ROI row */}
              <div className="grid grid-cols-[56px_1fr_1fr_1fr_1fr] gap-px bg-[#E8E0D8]">
                <div className="bg-[#FAFAF9] px-2 py-1.5 flex items-center">
                  <p className="text-[9px] font-semibold text-neutral-500">ROI</p>
                </div>
                {modelDefs.map(m => {
                  const inv = computeInv(m.key);
                  const active = pricingModel === m.key;
                  return (
                    <div key={m.key} className={`px-2 py-1.5 ${active ? "bg-[#FFF5F3]" : "bg-white"}`}>
                      <p className={`text-right font-bold ${active ? "text-[#EA2C00]" : "text-neutral-700"}`}>{inv.roi.toFixed(0)}%</p>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="px-3 py-2 bg-[#FAFAF9] border-t border-[#E8E0D8]">
                <p className="text-[9px] text-[#9C8E7E]">
                  Value: <span className="font-semibold text-[#4A3F35]">{fmtCompact(totalValue)}</span> over {termYears} yr · Edit rates above, then select a model with the pills to apply.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface AssumptionsDrawerProps {
  setting: ProformaSettingSnapshot | null;
  config: ProformaConfig;
  onClose: () => void;
  onUpdate: (settingId: string, driverId: string, newValue: number, newExploreState: ExploreState) => void;
  onOnsetChange: (settingId: string, driverId: string, onset: DriverOnset, customOnsetMonths?: number) => void;
  onUpdateSetting: (id: string, updates: Partial<ProformaSettingSnapshot>) => void;
  onEditInExplore?: (settingId: string) => void;
}

export function AssumptionsDrawer({ setting, config, onClose, onUpdate, onOnsetChange, onUpdateSetting, onEditInExplore }: AssumptionsDrawerProps) {
  const activeDrivers = setting?.drivers.filter(d => d.value > 0) ?? [];
  const effectiveSetting = setting;
  const effectiveOnUpdate = onUpdateSetting;

  return (
    <AnimatePresence>
      {setting && effectiveSetting && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed top-0 right-0 h-full w-full max-w-[440px] bg-white z-50 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: setting.color }} />
                <div>
                  <h2 className="text-sm font-bold text-neutral-900">{setting.label}</h2>
                  <p className="text-[11px] text-neutral-400">Changes recalculate live</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">
              {/* Volume & Pricing */}
              <div className="px-5 py-5 border-b border-neutral-100">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3">Volume & Pricing</p>
                <VolumeAndPricingSection
                  setting={effectiveSetting}
                  config={config}
                  onUpdateSetting={effectiveOnUpdate}
                />
              </div>

              {/* Value Drivers */}
              <div className="px-5 py-5">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Value Drivers</p>
                <p className="text-[11px] text-neutral-400 mb-4">
                  Clinical inputs driving your model.
                </p>
                {activeDrivers.length === 0 ? (
                  <p className="text-sm text-neutral-400 text-center py-8">No active drivers to configure.</p>
                ) : (
                  <div>
                    {activeDrivers.map(driver => (
                      <ModelAssumptionRow
                        key={driver.id}
                        settingId={setting.id}
                        driver={driver}
                        // Estimates reflect the active scenario's volume; driver edits
                        // are shared across scenarios (scenarios differ only in deal terms).
                        setting={effectiveSetting}
                        config={config}
                        onUpdate={onUpdate}
                        onOnsetChange={onOnsetChange}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            {onEditInExplore && (
              <div className="px-5 py-3 border-t border-neutral-100 flex-shrink-0">
                <button
                  onClick={() => { onClose(); onEditInExplore(setting.id); }}
                  className="inline-flex items-center gap-1.5 text-xs text-[#EA2C00] hover:text-[#D42800] font-medium transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Edit drivers in Explore
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
