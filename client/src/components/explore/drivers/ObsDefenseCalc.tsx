import type { ExploreCalcComponentProps } from "@/lib/exploreDrivers";
import { NumberField } from "@/components/NumberField";

type Props = ExploreCalcComponentProps;

const PREVENTABLE_SCENARIOS = [
  { label: "Conservative", value: "conservative" as const, pct: 25, hint: "Documentation gaps are a minor factor" },
  { label: "Typical", value: "typical" as const, pct: 40, hint: "Documentation a primary denial driver" },
  { label: "Aggressive", value: "aggressive" as const, pct: 55, hint: "High denial volume, doc-driven patterns" },
];

export default function ObsDefenseCalc({ state, updateDocQualityInputs }: Props) {
  const { docQualityInputs, annualEncounters, utilizationPercent } = state;
  const dq = docQualityInputs;
  const eligibleAdmissions = Math.round(annualEncounters * (utilizationPercent / 100));

  const preventablePcts: Record<string, number> = { conservative: 25, typical: 40, aggressive: 55, custom: dq.ipObsDefenseCustomPercent ?? 40 };
  const preventablePct = preventablePcts[dq.ipObsDefensePreventableScenario] / 100;

  const downgrades = Math.round(eligibleAdmissions * (dq.ipObsDefenseDenialRate / 100));
  const preventable = Math.round(downgrades * preventablePct);
  const gross = preventable * dq.ipObsDefenseRevenueDelta;
  const net = Math.round(gross * (dq.ipObsDefenseRealization / 100));

  const fmt = (n: number) => '$' + Math.round(n).toLocaleString();
  const fmtN = (n: number) => n.toLocaleString();

  return (
    <div>
      <p className="text-[13px] text-[#666666] leading-relaxed mb-4">
        Payers audit inpatient admissions against the two-midnight rule — was inpatient-level care medically necessary at admission? The physician made that judgment. When the note doesn't capture the clinical reasoning behind it, the payer downgrades to observation status and recoups the difference. Ambient documentation captures the admission conversation — acuity, alternatives considered, the "why this patient stays" — giving the record something to stand on when the audit arrives.
      </p>
      <div className="bg-[#FFF8F0] border border-[#EA2C00]/20 rounded-lg px-4 py-3 mb-6 flex items-start gap-2">
        <span className="text-[#EA2C00] text-sm mt-0.5 shrink-0">ⓘ</span>
        <p className="text-xs text-[#666666]">
          <strong>What this models:</strong> IP-to-Obs downgrades where better admission-day documentation would have prevented the denial or materially strengthened the appeal. The financial stake is the revenue delta between inpatient and observation payment — not the full claim.
        </p>
      </div>

      {/* STEP 1 */}
      <div className="mb-10">
        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">Step 1: Annual IP-to-Obs Downgrades</p>
        <div className="bg-[#F5F0EB] rounded-lg p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
            <div className="flex-1">
              <label className="text-[13px] text-[#666666] mb-1.5 block">Admissions</label>
              <div className="h-12 bg-white border border-[#E5E5E5] rounded-lg px-4 flex items-center">
                <span className="font-semibold text-black">{fmtN(eligibleAdmissions)}</span>
              </div>
            </div>
            <span className="text-[#888888] text-xl hidden sm:block">×</span>
            <div className="flex-1">
              <label className="text-[13px] text-[#666666] mb-1.5 block">IP-to-Obs Downgrade Rate</label>
              <div className="relative">
                <NumberField
                  min={1}
                  max={15}
                  value={dq.ipObsDefenseDenialRate}
                  onValueChange={(v) => updateDocQualityInputs({ ipObsDefenseDenialRate: v })}
                  className="w-full h-12 bg-white border border-[#E5E5E5] rounded-lg px-4 pr-8 text-black font-semibold text-base"
                  data-testid="input-obs-denial-rate"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#888888]">%</span>
              </div>
            </div>
          </div>
          <div className="text-center py-2">
            <span className="text-[13px] text-[#666666]">= </span>
            <span className="font-semibold text-black">{fmtN(downgrades)} IP-to-Obs downgrades per year</span>
          </div>
          <p className="text-[13px] text-[#888888] mt-3">
            Medical necessity downgrade rates typically range 3–8% of inpatient admissions. Your revenue cycle or denial management team should have this figure.
          </p>
        </div>
      </div>

      {/* STEP 2 */}
      <div className="mb-10">
        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">Step 2: Revenue at Stake per Downgrade</p>
        <div className="bg-[#F5F0EB] rounded-lg p-5">
          <div className="flex-1">
            <label className="text-[13px] text-[#666666] mb-1.5 block">Inpatient-to-Observation Revenue Delta</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#888888] z-10">$</span>
              <NumberField
                value={dq.ipObsDefenseRevenueDelta}
                onValueChange={(v) => updateDocQualityInputs({ ipObsDefenseRevenueDelta: v })}
                className="w-full h-12 bg-white border border-[#E5E5E5] rounded-lg pl-8 pr-4 text-black font-semibold text-base"
                data-testid="input-obs-delta"
              />
            </div>
          </div>
          <p className="text-[13px] text-[#888888] mt-3">
            The difference between what the hospital receives under inpatient DRG versus outpatient APC rates for the same case. Medicare delta typically runs $3,000–$8,000 per case; commercial payers vary by contract. $5,000 is a conservative starting point.
          </p>
        </div>
      </div>

      {/* STEP 3 */}
      <div className="mb-10">
        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">Step 3: Documentation-Preventable Downgrades</p>
        <p className="text-[13px] text-[#666666] mb-4">
          Of your IP-to-Obs downgrades, what share were lost on documentation grounds — not payer policy? This is the portion where the physician's clinical judgment was sound but the note didn't capture the reasoning well enough to withstand audit.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-3">
          {PREVENTABLE_SCENARIOS.map((s) => (
            <button
              key={s.value}
              onClick={() => updateDocQualityInputs({ ipObsDefensePreventableScenario: s.value })}
              className={`p-2 sm:p-4 rounded-lg border transition-all text-center ${
                dq.ipObsDefensePreventableScenario === s.value
                  ? "bg-[#EA2C00] border-[#EA2C00] text-white"
                  : "bg-white border-[#E5E5E5] text-black hover:border-[#D1D5DB]"
              }`}
              data-testid={`button-obs-${s.value}`}
            >
              <p className={`text-xs capitalize mb-1 ${dq.ipObsDefensePreventableScenario === s.value ? 'text-white/80' : 'text-[#888888]'}`}>
                {s.label}
              </p>
              <p className="text-sm font-semibold">{s.pct}%</p>
              <p className={`text-[10px] mt-0.5 leading-tight ${dq.ipObsDefensePreventableScenario === s.value ? 'text-white/70' : 'text-[#AAAAAA]'}`}>
                {s.hint}
              </p>
            </button>
          ))}
          <button
            onClick={() => updateDocQualityInputs({ ipObsDefensePreventableScenario: 'custom' })}
            className={`p-2 sm:p-4 rounded-lg border transition-all text-center ${
              dq.ipObsDefensePreventableScenario === 'custom'
                ? "bg-[#EA2C00] border-[#EA2C00] text-white"
                : "bg-white border-[#E5E5E5] text-black hover:border-[#D1D5DB]"
            }`}
            data-testid="button-obs-custom"
          >
            <p className={`text-xs capitalize mb-1 ${dq.ipObsDefensePreventableScenario === 'custom' ? 'text-white/80' : 'text-[#888888]'}`}>
              Custom
            </p>
            <p className="text-sm font-semibold">{dq.ipObsDefensePreventableScenario === 'custom' ? `${dq.ipObsDefenseCustomPercent ?? 40}%` : 'set %'}</p>
            <p className={`text-[10px] mt-0.5 leading-tight ${dq.ipObsDefensePreventableScenario === 'custom' ? 'text-white/70' : 'text-[#AAAAAA]'}`}>
              Set your own
            </p>
          </button>
        </div>

        {dq.ipObsDefensePreventableScenario === 'custom' && (
          <div className="flex items-center gap-3 mb-3">
            <label className="text-[13px] text-[#666666] flex-shrink-0">Documentation-preventable %</label>
            <div className="relative flex-1">
              <input
                type="text"
                inputMode="decimal"
                value={dq.ipObsDefenseCustomPercent ?? 40}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9.]/g, '');
                  const n = parseFloat(raw);
                  if (raw === '') { updateDocQualityInputs({ ipObsDefenseCustomPercent: 0 }); }
                  else if (!isNaN(n) && n >= 0 && n <= 100) { updateDocQualityInputs({ ipObsDefenseCustomPercent: n }); }
                }}
                className="w-full h-10 bg-white border border-[#E5E5E5] rounded-lg px-3 pr-8 text-sm font-semibold text-black focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/30"
                data-testid="input-obs-custom"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
            </div>
          </div>
        )}
        <div className="bg-[#F5F0EB] rounded-lg p-4 text-center">
          <span className="text-[13px] text-[#666666]">{fmtN(downgrades)} × {preventablePcts[dq.ipObsDefensePreventableScenario]}% = </span>
          <span className="font-semibold text-black">{fmtN(preventable)} documentation-preventable downgrades</span>
        </div>
      </div>

      {/* STEP 4 */}
      <div className="mb-8">
        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">Step 4: Realization</p>
        <p className="text-[13px] text-[#666666] mb-4">
          Not every prevented downgrade translates to recovered revenue — some denials go to appeal, some are written off. This accounts for the full cycle from denial to actual collection.
        </p>
        <div className="bg-[#F5F0EB] rounded-lg p-5">
          <div className="flex items-center gap-3 mb-3">
            <input
              type="range"
              min={20}
              max={80}
              step={5}
              value={dq.ipObsDefenseRealization}
              onChange={(e) => updateDocQualityInputs({ ipObsDefenseRealization: Number(e.target.value) })}
              className="flex-1 h-2 bg-[#E5E5E5] rounded-lg appearance-none cursor-pointer accent-[#EA2C00]"
              data-testid="slider-obs-realization"
            />
            <div className="flex items-center gap-1 bg-white rounded-lg px-3 py-1.5 border border-[#D1D5DB]">
              <span className="text-sm font-bold text-[#EA2C00]">{dq.ipObsDefenseRealization}%</span>
            </div>
          </div>
          <p className="text-[13px] text-[#888888]">50% is a reasonable midpoint — assumes roughly half of documentation-preventable denials are actually prevented or reversed.</p>
        </div>
      </div>

      {/* Calculation breakdown */}
      <div className="bg-[#F5F0EB] rounded-lg p-4 mb-6">
        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">How This Calculates</p>
        <div className="space-y-1.5 text-xs text-[#666666]">
          <div className="flex justify-between gap-2">
            <span>Annual admissions</span>
            <span className="font-medium text-black">{fmtN(eligibleAdmissions)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span>× IP-to-Obs downgrade rate ({dq.ipObsDefenseDenialRate}%)</span>
            <span className="font-medium text-black">{fmtN(downgrades)} downgrades</span>
          </div>
          <div className="flex justify-between gap-2">
            <span>× Documentation-preventable ({preventablePcts[dq.ipObsDefensePreventableScenario]}%)</span>
            <span className="font-medium text-black">{fmtN(preventable)} cases</span>
          </div>
          <div className="flex justify-between gap-2">
            <span>× Revenue delta per case</span>
            <span className="font-medium text-black">{fmt(dq.ipObsDefenseRevenueDelta)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span>× Realization ({dq.ipObsDefenseRealization}%)</span>
            <span className="font-medium text-black">{fmt(gross)}</span>
          </div>
          <div className="h-px bg-[#D1D5DB] my-2" />
          <div className="flex justify-between gap-2 text-sm">
            <span className="font-semibold text-black">Annual Obs Defense Value</span>
            <span className="font-bold text-[#EA2C00]">{fmt(net)}</span>
          </div>
        </div>
      </div>

      {/* Final Value */}
      <div className="border-t border-[#E5E5E5] pt-6">
        <div className="flex justify-between items-center mb-4">
          <span className="font-semibold text-black">Annual Obs Defense Value</span>
          <span className="text-2xl font-bold text-[#EA2C00]" data-testid="text-obs-net">{fmt(net)}</span>
        </div>
      </div>
    </div>
  );
}
