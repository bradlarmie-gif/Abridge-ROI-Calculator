import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { DOMAIN_COLORS } from "@/lib/domainColors";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit, ArrowRight, Building2, Stethoscope, HeartPulse, BedDouble, Layers, ChevronDown, ChevronUp, TrendingUp, Clock, DollarSign, BarChart3, X, Sliders, Download, Loader2, Presentation, MoreHorizontal } from "lucide-react";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import type { ProformaSettingSnapshot, ProformaConfig, ProformaSummary } from "./proformaTypes";
import type { CostOffset } from "./proformaTypes";
import { SETTING_COLORS, SETTING_LABELS, SETTING_UNIT_LABELS, CONTRACT_TERM_OPTIONS } from "./proformaTypes";
import { buildMonthlyCashFlows, calculateProformaSummary, computeYearlyEncounters, groupByQuarter } from "@/lib/proformaCalculations";
import { ComposedChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, ResponsiveContainer } from "recharts";
import type { ProformaCashFlowRow } from "./proformaTypes";
import ProformaView from "./ProformaView";
import { AssumptionsDrawer, VolumeAndPricingSection, buildDriverChangeUpdate } from "./ModelAssumptionDrawer";
import ProformaPresent from "./ProformaPresent";
import type { DriverOnset } from "./proformaTypes";
import type { ExploreState } from "../explore/ExploreFlow";

interface ProformaHubProps {
  settings: ProformaSettingSnapshot[];
  config: ProformaConfig;
  onConfigChange: (config: ProformaConfig) => void;
  onAddSetting: (careSetting?: string) => void;
  onEditSetting: (id: string) => void;
  onRemoveSetting: (id: string) => void;
  onUpdateSetting: (id: string, updates: Partial<ProformaSettingSnapshot>) => void;
  onHome: () => void;
  onBack: () => void;
}

const SETTING_ICONS: Record<string, typeof Building2> = {
  outpatient: Building2,
  ed: HeartPulse,
  inpatient: BedDouble,
  nursing: Stethoscope,
};

function contractTermLabel(months: number): string {
  return `${months / 12}-Year`;
}

const ALL_SETTINGS = ["outpatient", "ed", "inpatient", "nursing"] as const;

function fmt(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) {
    const k = Math.round(n / 1_000);
    if (Math.abs(k) >= 1_000) return `$${(n / 1_000_000).toFixed(1)}M`; // $999.5k+ rolls to $1.0M, never "$1000K"
    return `$${k.toLocaleString()}K`;
  }
  return `$${Math.round(n).toLocaleString()}`;
}

function fmtNum(n: number) {
  return n.toLocaleString();
}


function RolloutTimeline({ settings, contractMonths, onContractTermChange }: {
  settings: ProformaSettingSnapshot[];
  contractMonths: number;
  onContractTermChange: (months: number) => void;
}) {
  if (settings.length === 0) return null;
  const totalMonths = contractMonths;
  return (
    <div className="mb-6" data-testid="rollout-timeline">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[12px] font-medium text-[#9C8E7E] uppercase tracking-[1.5px]">Deployment Timeline</p>
        <div className="flex items-center gap-0.5 bg-[#F5F0EB] rounded-full p-0.5">
          {CONTRACT_TERM_OPTIONS.map(({ label, months }) => (
            <button
              key={months}
              onClick={() => onContractTermChange(months)}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                contractMonths === months ? "bg-white text-neutral-900 shadow-sm" : "text-[#8C7E6E] hover:text-neutral-900"
              }`}
              data-testid={`toggle-term-${months}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="relative bg-[#F5F0EB] rounded-lg overflow-hidden" style={{ height: `${settings.length * 36 + 24}px` }}>
        <div className="absolute inset-0 flex">
          {Array.from({ length: Math.ceil(totalMonths / 12) }, (_, i) => (
            <div key={i} className="flex-1 border-r border-[#DDD6CC]/60 relative">
              <span className="absolute top-1 left-1.5 text-[9px] text-[#A39888] font-medium">Y{i + 1}</span>
            </div>
          ))}
        </div>
        {settings.map((s, idx) => {
          const startPct = ((s.goLiveMonth - 1) / totalMonths) * 100;
          const rampMonths = Math.min(12, totalMonths - s.goLiveMonth + 1);
          const rampPct = (rampMonths / totalMonths) * 100;
          const totalActivePct = ((totalMonths - s.goLiveMonth + 1) / totalMonths) * 100;
          const postRampPct = totalActivePct - rampPct;
          const hasPostRamp = postRampPct > 1;
          return (
            <div key={s.id} className="absolute left-0 right-0" style={{ top: `${idx * 36 + 20}px`, height: "28px" }}>
              {/* Ramp phase — solid, labeled */}
              <div
                className={`absolute flex items-center px-2 gap-1.5 ${hasPostRamp ? "rounded-l-md" : "rounded-md"}`}
                style={{ left: `${startPct}%`, width: `${rampPct}%`, height: "100%", backgroundColor: s.color }}
              >
                <span className="text-[12px] font-bold text-white truncate">{s.label}</span>
                <span className="text-[9px] text-white/70 whitespace-nowrap">M{s.goLiveMonth}</span>
              </div>
              {/* At-scale phase — visible but distinct */}
              {hasPostRamp && (
                <div
                  className="absolute rounded-r-md flex items-center justify-end px-2"
                  style={{ left: `${startPct + rampPct}%`, width: `${postRampPct}%`, height: "100%", backgroundColor: s.color, opacity: 0.55 }}
                >
                  {postRampPct > 10 && (
                    <span className="text-[9px] text-white font-medium whitespace-nowrap">At Scale</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const QUADRANT_COLORS = DOMAIN_COLORS; // one app-wide palette (lib/domainColors)

const DISPLACEMENT_COLOR = "#2D6F6B";

function ValueCompositionBar({ setting, scale = 1 }: { setting: ProformaSettingSnapshot; scale?: number }) {
  const total = setting.annualValue;
  if (total <= 0) return null;
  const cap = setting.capacityValue ?? 0;
  const wf = setting.workforceValue ?? 0;
  const rev = setting.revenueValue ?? 0;
  const qual = setting.qualityValue ?? 0;
  const segments = [
    { key: "Capacity", value: cap },
    { key: "Workforce", value: wf },
    { key: "Revenue", value: rev },
    { key: "Quality", value: qual },
  ].filter(s => s.value > 0);
  if (segments.length === 0) return null;
  return (
    <div className="mt-3" data-testid={`value-bar-${setting.careSetting}`}>
      <div className="flex rounded-full overflow-hidden h-2">
        {segments.map(s => (
          <div
            key={s.key}
            style={{ width: `${(s.value / total) * 100}%`, backgroundColor: QUADRANT_COLORS[s.key] }}
            title={`${s.key}: ${fmt(s.value * scale)}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-3 mt-1.5">
        {segments.map(s => (
          <span key={s.key} className="text-[9px] text-[#A39888]">
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: QUADRANT_COLORS[s.key] }} />
            {s.key} {fmt(s.value * scale)}
          </span>
        ))}
      </div>
    </div>
  );
}

const TRANSITION_OPTIONS = [
  { label: "Day 1", months: 0 },
  { label: "6 mo",  months: 6 },
  { label: "12 mo", months: 12 },
  { label: "18 mo", months: 18 },
  { label: "24 mo", months: 24 },
  { label: "36 mo", months: 36 },
] as const;

function CostOffsetsSection({
  setting,
  onUpdateSetting,
}: {
  setting: ProformaSettingSnapshot;
  onUpdateSetting: (id: string, updates: Partial<ProformaSettingSnapshot>) => void;
}) {
  const offsets = setting.costOffsets ?? [];

  const updateOffset = (id: string, updates: Partial<CostOffset>) => {
    onUpdateSetting(setting.id, {
      costOffsets: offsets.map(o => o.id === id ? { ...o, ...updates } : o),
    });
  };

  const addOffset = () => {
    const newOffset: CostOffset = {
      id: `offset-${Date.now()}`,
      label: "",
      annualSpend: 0,
      displacementPct: 100,
      transitionMonths: 12,
    };
    onUpdateSetting(setting.id, { costOffsets: [...offsets, newOffset] });
  };

  const removeOffset = (id: string) => {
    onUpdateSetting(setting.id, { costOffsets: offsets.filter(o => o.id !== id) });
  };

  return (
    <div className="mt-4 pt-4 border-t border-[#F0EAE2]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: DISPLACEMENT_COLOR }} />
          <p className="text-xs font-semibold text-neutral-700 uppercase tracking-wider">Cost Offsets</p>
        </div>
        <button
          onClick={addOffset}
          className="inline-flex items-center gap-1 text-xs text-[#EA2C00] hover:text-[#D42800] font-medium transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add offset
        </button>
      </div>

      {offsets.length === 0 && (
        <p className="text-xs text-neutral-400 italic text-center py-3">
          Add a tool or service you're replacing — displaced cost appears as additional value in the proforma.
        </p>
      )}

      <div className="space-y-3">
        {offsets.map(o => {
          const targetAnnual = o.annualSpend * o.displacementPct / 100;
          return (
            <div key={o.id} className="bg-[#F5F0EB] rounded-lg p-3 space-y-2.5">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Tool or service (e.g. Dragon Medical One)"
                  value={o.label}
                  onChange={e => updateOffset(o.id, { label: e.target.value })}
                  className="flex-1 h-8 text-xs border border-[#DDD6CC] rounded-lg px-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/20"
                />
                <button onClick={() => removeOffset(o.id)} className="p-1 text-neutral-400 hover:text-red-500 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-neutral-500 whitespace-nowrap">Current spend</span>
                <span className="text-[11px] text-neutral-400">$</span>
                <FormattedNumberInput
                  value={o.annualSpend}
                  onChange={v => updateOffset(o.id, { annualSpend: v })}
                  className="flex-1 h-7 text-xs border border-[#DDD6CC] rounded-lg px-2 text-right bg-white focus:outline-none"
                />
                <span className="text-[11px] text-neutral-400 whitespace-nowrap">/ yr</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-neutral-500 whitespace-nowrap">% displaced</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={o.displacementPct}
                  onChange={e => updateOffset(o.id, { displacementPct: parseInt(e.target.value) })}
                  className="flex-1 accent-[#2D6F6B]"
                  style={{ height: "6px" }}
                />
                <span className="text-[11px] font-semibold text-neutral-700 w-10 text-right">{o.displacementPct}%</span>
              </div>

              <div>
                <p className="text-[10px] text-neutral-500 mb-1.5">Transition completes in</p>
                <div className="flex items-center gap-1 flex-wrap">
                  {TRANSITION_OPTIONS.map(({ label, months }) => (
                    <button
                      key={months}
                      onClick={() => updateOffset(o.id, { transitionMonths: months })}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                        o.transitionMonths === months
                          ? "bg-[#1A1A1A] text-white"
                          : "bg-white text-neutral-500 hover:bg-neutral-100 border border-[#DDD6CC]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {targetAnnual > 0 && (
                <div className="flex items-center justify-end gap-1.5 pt-0.5">
                  <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: DISPLACEMENT_COLOR }} />
                  <span className="text-[11px] font-semibold" style={{ color: DISPLACEMENT_COLOR }}>
                    {fmt(targetAnnual)} / yr displaced at scale
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ProformaHub({
  settings,
  config,
  onConfigChange,
  onAddSetting,
  onEditSetting,
  onRemoveSetting,
  onUpdateSetting,
  onHome,
  onBack,
}: ProformaHubProps) {
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [presenting, setPresenting] = useState(false);
  const [presentOrgName, setPresentOrgName] = useState("");
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  useEffect(() => {
    if (!editingId) return;
    const el = cardRefs.current[editingId];
    if (!el) return;
    // Align the TOP of the expanded card to the top of the viewport (minus the
    // sticky bar via scroll-mt). "nearest" used to bring the now-tall card's
    // BOTTOM into view, dropping the user at the bottom of the card on expand.
    setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }, [editingId]);
  const [assumptionsDrawerSettingId, setAssumptionsDrawerSettingId] = useState<string | null>(null);

  const addedSettings = settings.map(s => s.careSetting);
  const hasNursing = settings.some(s => s.careSetting === "nursing");
  const availableSettings = ALL_SETTINGS.filter(s => !addedSettings.includes(s));

  const proformaA = useMemo(() => {
    if (settings.length === 0) return null;
    const cashFlows = buildMonthlyCashFlows(settings, config);
    return { cashFlows, summary: calculateProformaSummary(settings, config, cashFlows) };
  }, [settings, config]);

  const summary = proformaA?.summary ?? null;

  // Per-setting contract totals — runs the same cash flow engine as the sensitivity analysis
  // so the hub card value/investment ratio matches the ProformaView ROI exactly.
  const perSettingTotals = useMemo(() => {
    const map: Record<string, { contractValue: number; contractInvestment: number }> = {};
    // Strip systemWideFee so each card shows only its own direct costs — the system fee is
    // a deal-level charge counted once in the global total, not per setting.
    const settingConfig = { ...config, systemWideFee: undefined };
    for (const setting of settings) {
      const flows = buildMonthlyCashFlows([setting], settingConfig);
      const contractValue = flows.reduce((s, r) => s + r.totalValue, 0);
      const contractInvestment = flows.reduce((s, r) => s + r.investment, 0) + (setting.implementationFee ?? 0);
      map[setting.id] = { contractValue, contractInvestment };
    }
    return map;
  }, [settings, config]);

  const totalHours = settings.reduce((s, v) => s + v.totalHoursSaved, 0);
  const totalProviders = settings.reduce((s, v) => s + v.providerCount, 0);

  const handleDriverChangeWithExplore = useCallback((settingId: string, driverId: string, newValue: number, newExploreState: ExploreState) => {
    const setting = settings.find(s => s.id === settingId);
    if (!setting) return;
    onUpdateSetting(settingId, buildDriverChangeUpdate(setting, driverId, newValue, newExploreState));
  }, [settings, onUpdateSetting]);

  const handleDriverOnsetChange = useCallback((settingId: string, driverId: string, onset: DriverOnset, customOnsetMonths?: number) => {
    const setting = settings.find(s => s.id === settingId);
    if (!setting) return;
    const updatedDrivers = setting.drivers.map(d =>
      d.id === driverId
        ? { ...d, onset, ...(customOnsetMonths !== undefined ? { customOnsetMonths } : {}) }
        : d
    );
    onUpdateSetting(settingId, { drivers: updatedDrivers });
  }, [settings, onUpdateSetting]);

  return (
    <div className="min-h-screen bg-[#FAFAF7]">
      <UnifiedHeader
        pathType="explore"
        currentStep={1}
        totalSteps={2}
        stepName="Business Case"
        onHome={onHome}
        onBack={onBack}
        rightAction={settings.length > 0 ? (
          <button
            onClick={() => { setEditingId(null); setConfirmRemove(null); setPresenting(true); }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-[#F0EBE4] text-[#8C7E6F] hover:bg-[#E8E2DA] transition-all"
            data-testid="button-present"
          >
            <Presentation className="w-3.5 h-3.5" />
            Present
          </button>
        ) : undefined}
      />
      <UnifiedHeaderSpacer />

      <div className="bg-[#1A1A1A] text-white py-14 px-4">
        <div className="max-w-[900px] mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-5">
            <Layers className="w-4 h-4" />
            <span className="text-xs font-medium tracking-wide">ORGANIZATION PROFORMA</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Design Your Deal Structure</h1>
          <p className="text-lg text-white/60 max-w-xl mx-auto">
            Layer care settings, sequence the rollout, and model the financial case for your organization.
          </p>
        </div>
      </div>

      <div className="max-w-[900px] mx-auto px-4 sm:px-6 -mt-8">

        {settings.length > 0 && summary && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#F9F6F2] rounded-xl border border-[#E8E2DA] shadow-sm p-5 mb-6"
            data-testid="proforma-summary-bar"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-4">
              <div>
                <p className="text-xs text-[#8C7E6E] mb-1">Annual Value at Scale</p>
                <p className="text-xl font-bold text-[#EA2C00]" data-testid="hub-annual-value">{fmt(summary.runRateValue)}</p>
              </div>
              <div>
                <p className="text-xs text-[#8C7E6E] mb-1">{contractTermLabel(config.contractTermMonths)} Total</p>
                <p className="text-xl font-bold text-neutral-900" data-testid="hub-3yr-value">{fmt(summary.termValue)}</p>
              </div>
              <div>
                <p className="text-xs text-[#8C7E6E] mb-1">Total Investment</p>
                <p className="text-xl font-bold text-neutral-900" data-testid="hub-investment">{fmt(summary.termInvestment)}</p>
              </div>
              <div>
                <p className="text-xs text-[#8C7E6E] mb-1">Net {contractTermLabel(config.contractTermMonths)} Value</p>
                <p className={`text-xl font-bold ${summary.termNet >= 0 ? "text-[#E8350A]" : "text-[#9CA3AF]"}`} data-testid="hub-net-value">{fmt(summary.termNet)}</p>
              </div>
            </div>
            <div className="border-t border-[#E8E2DA] pt-3 grid grid-cols-3 gap-4 text-center">
              <div className="flex flex-col items-center">
                <TrendingUp className="w-3.5 h-3.5 text-[#E8350A] mb-1" />
                <p className="text-sm font-bold text-[#E8350A]" data-testid="hub-vtc">{summary.valueToCost > 0 ? `${summary.valueToCost.toFixed(1)}x` : "N/A"}</p>
                <p className="text-[12px] text-[#A39888]">Value-to-Cost</p>
              </div>
              <div className="flex flex-col items-center">
                <Clock className="w-3.5 h-3.5 text-[#A39888] mb-1" />
                <p className="text-sm font-bold text-neutral-900" data-testid="hub-payback">{summary.paybackMonth ? `${summary.paybackMonth} mo` : "—"}</p>
                <p className="text-[12px] text-[#A39888]">Payback</p>
              </div>
              <div className="flex flex-col items-center">
                <DollarSign className="w-3.5 h-3.5 text-[#A39888] mb-1" />
                <p className="text-sm font-bold text-neutral-900" data-testid="hub-hours">{fmtNum(totalHours)}</p>
                <p className="text-[12px] text-[#A39888]">Hours/Year</p>
              </div>
            </div>
          </motion.div>
        )}

        {settings.length > 0 && (
          <RolloutTimeline
            settings={settings}
            contractMonths={config.contractTermMonths}
            onContractTermChange={(months) => {
              const newYears = Math.ceil(months / 12);
              const oldYears = Math.ceil(config.contractTermMonths / 12);
              // When shortening the contract, promote the old terminal utilization to the new last year
              // so the projection target stays consistent rather than dropping to a mid-ramp value
              let yu = config.yearlyUtilization;
              let nyu = config.nursingYearlyUtilization;
              if (newYears < oldYears) {
                const terminal = oldYears >= 3 ? yu.year3 : yu.year2;
                const nursingTerminal = nyu ? (oldYears >= 3 ? nyu.year3 : nyu.year2) : terminal;
                if (newYears === 2) {
                  yu = { ...yu, year2: terminal };
                  if (nyu) nyu = { ...nyu, year2: nursingTerminal };
                } else if (newYears === 1) {
                  yu = { ...yu, year1: terminal };
                  if (nyu) nyu = { ...nyu, year1: nursingTerminal };
                }
              }
              onConfigChange({ ...config, contractTermMonths: months, yearlyUtilization: yu, nursingYearlyUtilization: nyu });
            }}
          />
        )}

        {settings.length > 0 && (
          <div className="flex items-center justify-between gap-4 px-1 mb-5">
            <div>
              <p className="text-xs font-medium text-neutral-700">System-wide Annual Fee</p>
              <p className="text-[11px] text-[#A39888]">Enterprise license covering all settings (e.g. shared Abridge platform fee)</p>
            </div>
            <div className="relative flex-shrink-0 w-36">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-neutral-400">$</span>
              <FormattedNumberInput
                value={config.systemWideFee ?? 0}
                onChange={(v) => onConfigChange({ ...config, systemWideFee: v || undefined })}
                className="w-full text-xs border border-[#E8E2DA] rounded-lg py-1.5 pl-5 pr-2 text-right bg-white"
                placeholder="0"
              />
            </div>
          </div>
        )}

        <div className="space-y-4 mb-8">
          <AnimatePresence mode="popLayout">
            {settings.map((setting, idx) => {
              const Icon = SETTING_ICONS[setting.careSetting] || Building2;
              const color = SETTING_COLORS[setting.careSetting];
              const unitLabel = SETTING_UNIT_LABELS[setting.careSetting];
              const isEditing = editingId === setting.id;
              const isEncPricing = setting.pricingModel === "perEncounter";
              const ye = isEncPricing
                ? (setting.yearlyEncounters ?? computeYearlyEncounters(setting, config))
                : { year1: 0, year2: 0, year3: 0 };
              const defaultUtil = setting.careSetting === "nursing" && config.nursingYearlyUtilization
                ? config.nursingYearlyUtilization
                : config.yearlyUtilization;
              const yu = setting.yearlyUtilization ?? defaultUtil;
              const contractYears = Math.ceil(config.contractTermMonths / 12);
              const totals = perSettingTotals[setting.id] ?? { contractValue: 0, contractInvestment: 0 };
              // Breakdown (composition bar + driver chips) reads the whole-term total, not the
              // annual run-rate, so it reconciles to the N-Year headline and moves with the term.
              const termFactor = setting.annualValue > 0 ? totals.contractValue / setting.annualValue : 0;
              return (
                <motion.div
                  key={setting.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white rounded-xl overflow-hidden border border-[#E8E2DA] shadow-sm scroll-mt-24"
                  data-testid={`proforma-setting-card-${setting.careSetting}`}
                  ref={(el) => { cardRefs.current[setting.id] = el; }}
                >
                  <div className="flex">
                    <div className="w-1 flex-shrink-0" style={{ backgroundColor: color }} />
                    <div className="flex-1 p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}12` }}>
                            <Icon className="w-5 h-5" style={{ color }} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-neutral-900">{setting.label}</h3>
                            </div>
                            <p className="text-sm text-[#8C7E6E] flex items-center gap-1.5 flex-wrap">
                              {isEncPricing
                                ? (() => {
                                    // Encounter counts stay annual (no quarterly-encounters field — derived
                                    // by design), but the util ramp reads Q1→Q12 when utilization is quarterly.
                                    const startYu = setting.quarterlyUtilization ? setting.quarterlyUtilization.q1 : (yu.year1 ?? 0);
                                    const termYu = setting.quarterlyUtilization
                                      ? setting.quarterlyUtilization.q12
                                      : (contractYears >= 3 ? (yu.year3 ?? yu.year2 ?? yu.year1 ?? 0) : contractYears === 2 ? (yu.year2 ?? yu.year1 ?? 0) : (yu.year1 ?? 0));
                                    const abr1 = Math.round((ye.year1 ?? 0) * startYu / 100);
                                    const termYe = contractYears >= 3 ? (ye.year3 ?? ye.year2 ?? ye.year1 ?? 0) : contractYears === 2 ? (ye.year2 ?? ye.year1 ?? 0) : (ye.year1 ?? 0);
                                    const abrTerm = Math.round(termYe * termYu / 100);
                                    return `${fmtNum(abr1)} → ${fmtNum(abrTerm)} Abridge ${setting.careSetting === "inpatient" ? "discharges" : "encounters"} · ${startYu}% → ${termYu}% utilization`;
                                  })()
                                : (() => {
                                    // In quarterly mode the ramp starts at Q1 (not the yearly Y1/Q4
                                    // value) and tops out at Q12 — mirror what the engine actually models.
                                    const startProv = setting.quarterlyProviders ? setting.quarterlyProviders.q1 : setting.providerCount;
                                    // Terminal providers must follow the contract term, not the fixed
                                    // 3-year full-scale, so a 2-year deal reads its Y2 end (matches the value).
                                    const yp = setting.yearlyProviders;
                                    const endProv = setting.quarterlyProviders ? setting.quarterlyProviders.q12
                                      : yp ? (contractYears >= 3 ? (yp.year3 ?? yp.year2 ?? yp.year1) : contractYears === 2 ? (yp.year2 ?? yp.year1) : yp.year1)
                                      : setting.fullScaleProviders;
                                    const atScaleUtil = setting.quarterlyUtilization
                                      ? setting.quarterlyUtilization.q12
                                      : (contractYears >= 3 ? yu.year3 : contractYears === 2 ? yu.year2 : yu.year1);
                                    return `${fmtNum(startProv)} → ${fmtNum(endProv)} ${unitLabel} · ${atScaleUtil}% utilization at scale`;
                                  })()
                              }
                            </p>
                          </div>
                        </div>
                        {/* Top-right holds only the overflow → Delete. Edit actions live in the
                            labeled footer row so destructive + edit aren't adjacent bare icons. */}
                        <div className="flex items-center gap-1">
                          {confirmRemove === setting.id ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-[#8C7E6E]">Delete setting?</span>
                              <button
                                onClick={() => { onRemoveSetting(setting.id); setConfirmRemove(null); }}
                                className="px-2 py-1 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
                                data-testid={`button-confirm-remove-${setting.careSetting}`}
                              >
                                Remove
                              </button>
                              <button
                                onClick={() => setConfirmRemove(null)}
                                className="px-2 py-1 text-xs text-[#8C7E6E] hover:text-[#6B5E4F]"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmRemove(setting.id)}
                              className="p-2 rounded-lg hover:bg-[#F5F0EB] text-[#A39888] hover:text-[#6B5E4F] transition-colors"
                              data-testid={`button-remove-${setting.careSetting}`}
                              aria-label="Setting options"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-3">
                        <div>
                          <p className="text-xs text-[#8C7E6E] mb-1">{contractYears}-Year Value</p>
                          <p className="text-lg font-bold" style={{ color }}>{fmt(totals.contractValue)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[#8C7E6E] mb-1">{contractYears}-Year Investment</p>
                          {/* No per-setting cost (e.g. covered by the system-wide fee) → show "—" not "$0". */}
                          <p className="text-lg font-bold text-neutral-900">{totals.contractInvestment > 0 ? fmt(totals.contractInvestment) : "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[#8C7E6E] mb-1">Go-Live Month</p>
                          <select
                            value={setting.goLiveMonth}
                            onChange={(e) => onUpdateSetting(setting.id, { goLiveMonth: parseInt(e.target.value) })}
                            className="h-8 w-full rounded-lg border border-[#DDD6CC] bg-white px-2 text-sm font-medium text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/30"
                            data-testid={`select-golive-${setting.careSetting}`}
                          >
                            {Array.from({ length: Math.max(1, config.contractTermMonths - 1) }, (_, i) => (
                              <option key={i + 1} value={i + 1}>Month {i + 1}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <ValueCompositionBar setting={setting} scale={termFactor} />

                      <div className="flex items-start justify-between gap-3 mt-3">
                        <div className="flex flex-wrap gap-1.5 flex-1">
                          {setting.drivers.slice(0, 4).map(d => (
                            <span key={d.id} className="text-[12px] bg-[#F5F0EB] px-2 py-0.5 rounded-full text-[#6B5E4F] border border-[#E8E2DA]">
                              {d.name}: {fmt(d.value * termFactor)}
                            </span>
                          ))}
                          {setting.drivers.length > 4 && (
                            <span className="text-[12px] text-[#A39888] px-1.5 py-0.5">+{setting.drivers.length - 4} more</span>
                          )}
                        </div>
                        <div className="shrink-0 flex items-center gap-3">
                          <button
                            onClick={() => setEditingId(isEditing ? null : setting.id)}
                            className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors ${isEditing ? 'text-[#EA2C00]' : 'text-[#6B5E4F] hover:text-[#4A3F35]'}`}
                            data-testid={`button-edit-${setting.careSetting}`}
                          >
                            <BarChart3 className="w-3 h-3" />
                            Volumes &amp; Pricing
                          </button>
                          <span className="text-[#D8CFC4] select-none">&middot;</span>
                          <button
                            onClick={() => setAssumptionsDrawerSettingId(setting.id)}
                            className="inline-flex items-center gap-1.5 text-xs text-[#6B5E4F] hover:text-[#4A3F35] font-medium transition-colors"
                            data-testid={`button-edit-assumptions-${setting.careSetting}`}
                          >
                            <Sliders className="w-3 h-3" />
                            Assumptions
                          </button>
                        </div>
                      </div>

                      <AnimatePresence>
                        {isEditing && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-4 pt-4 border-t border-[#F0EAE2]">
                              <VolumeAndPricingSection
                                setting={setting}
                                config={config}
                                onUpdateSetting={onUpdateSetting}
                              />
                              <CostOffsetsSection setting={setting} onUpdateSetting={onUpdateSetting} />
                              <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#F0EAE2]">
                                <button
                                  onClick={() => onEditSetting(setting.id)}
                                  className="inline-flex items-center gap-1.5 text-xs text-[#EA2C00] hover:text-[#D42800] font-medium transition-colors"
                                >
                                  Edit in Explore
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="text-xs text-[#8C7E6E] hover:text-[#6B5E4F] font-medium"
                                >
                                  Done
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {settings.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center pt-8 pb-6"
          >
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#F5F0EB] flex items-center justify-center">
              <Layers className="w-7 h-7 text-[#A39888]" />
            </div>
            <h3 className="text-xl font-bold text-neutral-900 mb-1.5">Start Building Your Proforma</h3>
            <p className="text-[#8C7E6E] mb-0 max-w-md mx-auto">
              Complete the Explore flow for a care setting, then add it here to build a multi-setting financial model.
            </p>
          </motion.div>
        )}

        {availableSettings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <p className="text-sm font-medium text-[#8C7E6E] mb-3">Add a care setting</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {availableSettings.map(s => {
                const Icon = SETTING_ICONS[s] || Building2;
                return (
                  <button
                    key={s}
                    onClick={() => onAddSetting(s)}
                    className="group flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-[#DDD6CC] hover:border-[#EA2C00] hover:bg-[#EA2C00]/5 transition-all"
                    data-testid={`button-add-${s}`}
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#F5F0EB] group-hover:bg-[#EA2C00]/10 transition-colors">
                      <Icon className="w-5 h-5 text-[#A39888] group-hover:text-[#EA2C00] transition-colors" />
                    </div>
                    <span className="text-sm font-medium text-[#6B5E4F] group-hover:text-[#EA2C00] transition-colors">
                      {SETTING_LABELS[s]}
                    </span>
                    <Plus className="w-4 h-4 text-[#A39888] group-hover:text-[#EA2C00] transition-colors" />
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}



      </div>

      {settings.length > 0 && (
        <ProformaView
          embedded
          settings={settings}
          config={config}
          onConfigChange={onConfigChange}
          onUpdateSetting={onUpdateSetting}
          onBack={onBack}
          onHome={onHome}
        />
      )}

      <AssumptionsDrawer
        setting={settings.find(s => s.id === assumptionsDrawerSettingId) ?? null}
        config={config}
        onClose={() => setAssumptionsDrawerSettingId(null)}
        onUpdate={handleDriverChangeWithExplore}
        onOnsetChange={handleDriverOnsetChange}
        onUpdateSetting={onUpdateSetting}
        onEditInExplore={onEditSetting}
      />

      <AnimatePresence>
        {presenting && summary && (
          <ProformaPresent
            settings={settings}
            config={config}
            summary={summary}
            perSettingTotals={perSettingTotals}
            orgName={presentOrgName}
            onOrgNameChange={setPresentOrgName}
            onExit={() => setPresenting(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
