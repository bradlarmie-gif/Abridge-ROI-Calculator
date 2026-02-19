import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { useAssessment } from "@/lib/assessment";
import { formatDollar, formatDollarFull } from "./ambientCalculator";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { Slider } from "@/components/ui/slider";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Legend, Tooltip,
} from "recharts";
import {
  type Domain, type ActivationLevel,
  DOMAIN_ORDER, DOMAIN_LABELS, ACTIVATION_LABELS, DOMAIN_WEIGHTS,
  computeGapForDomain, computeDomainScore, scoreToActivationLevel,
} from "./domainCalculations";
import StepFooter, { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";

interface Screen5Props {
  onNext: () => void;
  onBack: () => void;
}

interface EditableDomainInputs {
  activationLevel: ActivationLevel;
  inputs: Record<string, number | string>;
}

const HAIRCUT = 0.60;

function CountUpNumber({ target, duration = 1400, prefix = "$" }: { target: number; duration?: number; prefix?: string }) {
  const [current, setCurrent] = useState(0);
  const startTime = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    startTime.current = null;
    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const elapsed = timestamp - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return <>{prefix}{current.toLocaleString()}</>;
}

function EditField({ label, value, onChange, prefix, suffix, testId }: {
  label: string; value: number; onChange: (v: number) => void;
  prefix?: string; suffix?: string; testId: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <span className="text-sm text-black flex-1">{label}</span>
      <div className="flex items-center gap-1 max-w-[140px]">
        {prefix && <span className="text-sm text-[#888888]">{prefix}</span>}
        <FormattedNumberInput
          value={value}
          onChange={onChange}
          placeholder="0"
          className="w-full h-10 bg-white border-[#E5E7EB] text-right min-w-[80px]"
          data-testid={testId}
        />
        {suffix && <span className="text-sm text-[#888888]">{suffix}</span>}
      </div>
    </div>
  );
}

function EditSlider({ label, value, onChange, min, max, step, display, testId }: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step: number; display: string; testId: string;
}) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-black">{label}</span>
        <span className="text-sm font-bold text-black">{display}</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
        className="w-full"
        data-testid={testId}
      />
    </div>
  );
}

function EditPill({ label, options, value, onChange, testId }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void; testId: string;
}) {
  return (
    <div className="mb-3">
      <span className="block text-sm text-black mb-1.5">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button key={opt} type="button" onClick={() => onChange(opt)}
            className={`rounded-full px-4 py-2 text-sm cursor-pointer transition-all ${
              value === opt
                ? 'border-2 border-[#EA2C00] bg-[#EA2C00]/5 font-bold text-black'
                : 'border border-[#E5E7EB] bg-white font-medium text-black/80'
            }`}
            data-testid={`${testId}-${opt}`}
          >{opt}</button>
        ))}
      </div>
    </div>
  );
}

function DomainEditCard({ domain, domainState, onUpdate, gapValue, originalGapValue }: {
  domain: Domain; domainState: EditableDomainInputs;
  onUpdate: (level: ActivationLevel, inputs: Record<string, number | string>) => void;
  gapValue: number; originalGapValue: number;
  providers: number; annualEncounters: number; utilization: number; timeSavings: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const level = domainState.activationLevel;
  const inp = domainState.inputs;
  const changed = gapValue !== originalGapValue;

  const handleLevelChange = (newLevel: ActivationLevel) => {
    onUpdate(newLevel, inp);
  };

  const updateInput = (key: string, value: number | string) => {
    onUpdate(level, { ...inp, [key]: value });
  };

  return (
    <div className={`bg-white border border-[#E5E7EB] rounded-lg transition-all mb-3 ${expanded ? 'p-5' : 'px-5 py-4'}`}
      data-testid={`edit-card-${domain}`}>
      <button type="button" onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between bg-transparent border-none cursor-pointer p-0"
        data-testid={`toggle-${domain}`}
      >
        <div className="flex items-center gap-3">
          <div>
            <p className="font-semibold text-sm text-black text-left">
              {DOMAIN_LABELS[domain]}
            </p>
            <p className="text-xs text-[#888888] italic text-left">
              {ACTIVATION_LABELS[domain][level]}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className={`font-bold text-base ${changed ? 'text-[#EA2C00]' : 'text-black'}`}>
              {formatDollar(Math.round(gapValue * HAIRCUT))}
            </p>
            <p className="text-[11px] text-[#888888]">/ yr</p>
          </div>
          <ChevronDown size={16} className="text-[#888888] transition-transform duration-200"
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)' }} />
        </div>
      </button>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
          <div className="mb-4">
            <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-1.5">
              Activation Level
            </p>
            <div className="relative">
              <select
                value={level}
                onChange={(e) => handleLevelChange(parseInt(e.target.value) as ActivationLevel)}
                className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-2.5 text-sm font-medium text-black outline-none cursor-pointer appearance-none"
                data-testid={`select-activation-${domain}`}
              >
                {([1, 2, 3, 4] as ActivationLevel[]).map((l) => (
                  <option key={l} value={l}>{ACTIVATION_LABELS[domain][l]}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#888888] pointer-events-none" />
            </div>
          </div>

          <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
            {DOMAIN_LABELS[domain]} Inputs
          </p>

          {domain === 'capacity' && level === 2 && (
            <EditSlider label="Redeployment rate" value={(inp.redeployment as number) || 20}
              onChange={(v) => updateInput('redeployment', v)} min={0} max={100} step={1}
              display={`${(inp.redeployment as number) || 20}%`} testId="edit-slider-redeployment" />
          )}
          {domain === 'capacity' && level === 3 && (
            <>
              <EditField label="Monthly OT reduction" prefix="$" value={(inp.monthlyOT as number) || 0}
                onChange={(v) => updateInput('monthlyOT', v)} testId="edit-input-monthlyOT" />
              <EditField label="Additional patients / mo" value={(inp.monthlyPatients as number) || 0}
                onChange={(v) => updateInput('monthlyPatients', v)} testId="edit-input-monthlyPatients" />
            </>
          )}
          {domain === 'capacity' && level === 4 && (
            <>
              <EditField label="Additional patients / mo" value={(inp.additionalPatients as number) || 0}
                onChange={(v) => updateInput('additionalPatients', v)} testId="edit-input-additionalPatients" />
              <EditField label="Revenue per visit" prefix="$" value={(inp.revenuePerVisit as number) || 200}
                onChange={(v) => updateInput('revenuePerVisit', v)} testId="edit-input-revenuePerVisit" />
            </>
          )}

          {domain === 'revenue' && level === 2 && (
            <EditSlider label="Denial rate" value={(inp.denialRate as number) || 7}
              onChange={(v) => updateInput('denialRate', v)} min={1} max={20} step={1}
              display={`${(inp.denialRate as number) || 7}%`} testId="edit-slider-denialRate" />
          )}
          {domain === 'revenue' && level === 4 && (
            <>
              <EditField label="wRVU improvement" suffix="%" value={(inp.wrvuImprovement as number) || 0}
                onChange={(v) => updateInput('wrvuImprovement', v)} testId="edit-input-wrvuImprovement" />
              <EditField label="HCC capture improvement" suffix="%" value={(inp.hccImprovement as number) || 0}
                onChange={(v) => updateInput('hccImprovement', v)} testId="edit-input-hccImprovement" />
            </>
          )}

          {domain === 'workforce' && level === 1 && (
            <EditSlider label="After-hours charting" value={(inp.afterHours as number) || 3}
              onChange={(v) => updateInput('afterHours', v)} min={0} max={8} step={0.5}
              display={`${(inp.afterHours as number) || 3} hrs/wk`} testId="edit-slider-afterHours" />
          )}
          {domain === 'workforce' && level === 2 && (
            <EditField label="Annual turnover rate" suffix="%" value={(inp.turnoverRate as number) || 8}
              onChange={(v) => updateInput('turnoverRate', v)} testId="edit-input-turnoverRate" />
          )}
          {domain === 'workforce' && level === 3 && (
            <>
              <EditField label="After-hours reduction" suffix="hrs/wk" value={(inp.afterHoursReduction as number) || 0}
                onChange={(v) => updateInput('afterHoursReduction', v)} testId="edit-input-afterHoursReduction" />
              <EditField label="Turnover rate" suffix="%" value={(inp.turnoverRate as number) || 8}
                onChange={(v) => updateInput('turnoverRate', v)} testId="edit-input-turnoverRate2" />
            </>
          )}
          {domain === 'workforce' && level === 4 && (
            <>
              <EditField label="Turnover reduction" suffix="%" value={(inp.turnoverReduction as number) || 0}
                onChange={(v) => updateInput('turnoverReduction', v)} testId="edit-input-turnoverReduction" />
              <EditField label="OT/agency monthly savings" prefix="$" value={(inp.otSavings as number) || 0}
                onChange={(v) => updateInput('otSavings', v)} testId="edit-input-otSavings" />
            </>
          )}

          {domain === 'risk' && level === 1 && (
            <EditPill label="Documentation defensibility"
              options={['Low', 'Medium', 'High']}
              value={(inp.defensibility as string) || 'Medium'}
              onChange={(v) => updateInput('defensibility', v)} testId="edit-pill-defensibility" />
          )}
          {domain === 'risk' && level === 2 && (
            <EditSlider label="Audit-ready notes" value={(inp.auditReady as number) || 50}
              onChange={(v) => updateInput('auditReady', v)} min={0} max={100} step={1}
              display={`${(inp.auditReady as number) || 50}%`} testId="edit-slider-auditReady" />
          )}
          {domain === 'risk' && level === 3 && (
            <>
              <EditField label="CDI query rate (per 1K)" value={(inp.queryRate as number) || 15}
                onChange={(v) => updateInput('queryRate', v)} testId="edit-input-queryRate" />
              <EditField label="CDI query cost" prefix="$" value={(inp.queryCost as number) || 45}
                onChange={(v) => updateInput('queryCost', v)} testId="edit-input-queryCost" />
            </>
          )}
          {domain === 'risk' && level === 4 && (
            <EditPill label="AI initiatives planned (24mo)"
              options={['1\u20132', '3\u20135', '5+']}
              value={(inp.initiatives as string) || '1\u20132'}
              onChange={(v) => updateInput('initiatives', v)} testId="edit-pill-initiatives" />
          )}

          <div className="mt-3 pt-3 border-t border-[#E5E7EB]">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#888888]">Updated gap</span>
              <span className={`text-xs font-bold ${changed ? 'text-[#EA2C00]' : 'text-[#888888]'}`}
                data-testid={`updated-gap-${domain}`}>
                {formatDollar(Math.round(gapValue * HAIRCUT))} / yr
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const actNow = payload.find((p: any) => p.dataKey === 'actNow');
  const current = payload.find((p: any) => p.dataKey === 'currentState');
  const gap = (actNow?.value || 0) - (current?.value || 0);
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg p-3 shadow-sm">
      <p className="text-xs font-semibold text-black mb-1.5">{label}</p>
      {actNow && <p className="text-xs text-[#EA2C00]">Act Now: {formatDollarFull(actNow.value)}</p>}
      {current && <p className="text-xs text-[#888888]">Current State: {formatDollarFull(current.value)}</p>}
      <p className="text-xs font-bold text-[#EA2C00] mt-1">Gap: {formatDollarFull(gap)}</p>
    </div>
  );
}

export default function Screen5Gap({ onNext, onBack }: Screen5Props) {
  const { state } = useAssessment();
  const { inputs } = state;
  const editSectionRef = useRef<HTMLDivElement>(null);

  const providers = inputs.providers || 0;
  const annualEncounters = inputs.annualEncounters || 0;
  const utilization = inputs.utilization || 45;
  const timeSavings = inputs.timeSavedPerEncounter || 2.0;

  const originalGaps = useMemo(() => ({
    capacity: inputs.capacityGap || 0,
    revenue: inputs.revenueGap || 0,
    workforce: inputs.workforceGap || 0,
    risk: inputs.riskGap || 0,
  }), [inputs.capacityGap, inputs.revenueGap, inputs.workforceGap, inputs.riskGap]);

  const originalScores = useMemo(() => ({
    capacity: inputs.capacityScore || 0,
    revenue: inputs.revenueScore || 0,
    workforce: inputs.workforceScore || 0,
    risk: inputs.riskScore || 0,
  }), [inputs.capacityScore, inputs.revenueScore, inputs.workforceScore, inputs.riskScore]);

  const [isEditing, setIsEditing] = useState(false);

  const [editState, setEditState] = useState<Record<Domain, EditableDomainInputs>>(() => ({
    capacity: { activationLevel: scoreToActivationLevel('capacity', originalScores.capacity), inputs: {} },
    revenue: { activationLevel: scoreToActivationLevel('revenue', originalScores.revenue), inputs: {} },
    workforce: { activationLevel: scoreToActivationLevel('workforce', originalScores.workforce), inputs: {} },
    risk: { activationLevel: scoreToActivationLevel('risk', originalScores.risk), inputs: {} },
  }));

  const [savedOriginalEditState] = useState(() => JSON.parse(JSON.stringify(editState)));

  const gapValues = useMemo(() => {
    const gaps: Record<Domain, number> = { capacity: 0, revenue: 0, workforce: 0, risk: 0 };
    for (const d of DOMAIN_ORDER) {
      if (isEditing || Object.keys(editState[d].inputs).length > 0) {
        gaps[d] = computeGapForDomain(d, editState[d].activationLevel, editState[d].inputs,
          providers, annualEncounters, utilization, timeSavings);
      } else {
        gaps[d] = originalGaps[d];
      }
    }
    return gaps;
  }, [editState, isEditing, originalGaps, providers, annualEncounters, utilization, timeSavings]);

  const totalAnnualGap = gapValues.capacity + gapValues.revenue + gapValues.workforce + gapValues.risk;
  const displayedTotal = Math.round(totalAnnualGap * HAIRCUT);
  const displayedMonthly = Math.round(displayedTotal / 12);
  const displayedWeekly = Math.round(displayedTotal / 52);
  const displayedDaily = Math.round(displayedTotal / 365);

  const handleEditDomain = useCallback((domain: Domain, level: ActivationLevel, domainInputs: Record<string, number | string>) => {
    setEditState(prev => ({
      ...prev,
      [domain]: { activationLevel: level, inputs: domainInputs },
    }));
  }, []);

  const handleReset = () => {
    setEditState(JSON.parse(JSON.stringify(savedOriginalEditState)));
  };

  const handleOpenEdit = () => {
    setIsEditing(true);
    setTimeout(() => {
      editSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const dt = displayedTotal;
  const chartData = useMemo(() => [
    { label: 'Today', actNow: 0, currentState: 0 },
    { label: '6mo', actNow: Math.round(dt * 0.42), currentState: Math.round(dt * 0.02) },
    { label: '12mo', actNow: Math.round(dt * 0.95), currentState: Math.round(dt * 0.04) },
    { label: '18mo', actNow: Math.round(dt * 1.52), currentState: Math.round(dt * 0.06) },
    { label: '24mo', actNow: Math.round(dt * 2.18), currentState: Math.round(dt * 0.08) },
    { label: '36mo', actNow: Math.round(dt * 3.45), currentState: Math.round(dt * 0.11) },
  ], [dt]);

  const actNow3yr = Math.round(dt * 3.45);
  const wait6mo3yr = Math.round(dt * (3.45 - 0.42));
  const wait12mo3yr = Math.round(dt * (3.45 - 0.95));
  const permanentlyLost6mo = actNow3yr - wait6mo3yr;
  const permanentlyLost12mo = actNow3yr - wait12mo3yr;

  return (
    <div className={STEP_FOOTER_SPACER_CLASS}>

      <div className="flex flex-col items-center justify-center text-center mb-12">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0, duration: 0.5 }}>
          <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3" data-testid="text-gap-label">
            Unrealized Enterprise Value
          </p>
          <p className="text-base text-[#888888] italic max-w-[400px] mx-auto mb-10" data-testid="text-gap-pre-statement">
            Already in your operations. Already earned. Not yet realized.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
          <p className="text-[#EA2C00] font-bold leading-none text-[clamp(64px,8vw,96px)] mb-2" data-testid="value-hero-gap">
            <CountUpNumber target={displayedTotal} />
          </p>
          <p className="text-xl text-[#888888] mb-6">annually</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.5 }}>
          <button type="button" onClick={handleOpenEdit}
            className="text-sm text-[#888888] cursor-pointer bg-transparent border-none font-medium underline underline-offset-2 transition-colors"
            data-testid="button-refine"
          >
            Refine my assumptions
          </button>
        </motion.div>
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
        <div className="flex-1 max-w-[700px]">

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}>
            <div className="bg-[#F5F0EB] rounded-lg p-8 md:p-10 mb-8" data-testid="card-domain-breakdown">
              <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
                Domain Breakdown
              </p>
              <div className="h-px bg-[#E5E7EB] mb-6" />
              {DOMAIN_ORDER.map((domain, idx) => (
                <div key={domain}>
                  <div className="flex items-center justify-between py-3">
                    <span className="font-semibold text-sm text-black">{DOMAIN_LABELS[domain]}</span>
                    <span className="font-bold text-base text-black" data-testid={`domain-gap-${domain}`}>
                      {formatDollar(Math.round(gapValues[domain] * HAIRCUT))}
                    </span>
                  </div>
                  {idx < DOMAIN_ORDER.length - 1 && <div className="h-px bg-[#E5E7EB]/50" />}
                </div>
              ))}
              <div className="h-px bg-[#E5E7EB] mt-1" />
              <div className="bg-white/60 rounded-lg px-4 py-3.5 mt-3 flex items-center justify-between">
                <span className="font-semibold text-sm text-black">Total Annual Gap</span>
                <span className="font-bold text-xl text-[#EA2C00]" data-testid="value-total-gap">
                  {formatDollar(displayedTotal)}
                </span>
              </div>
            </div>
          </motion.div>

          <div ref={editSectionRef}>
            {isEditing && (
              <motion.div
                className="mb-8"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="bg-[#F5F0EB] rounded-lg p-8 md:p-10">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px]">
                      Refine Assumptions
                    </p>
                    <button type="button" onClick={handleReset}
                      className="text-xs text-[#888888] cursor-pointer bg-transparent border-none font-medium underline underline-offset-2 transition-colors"
                      data-testid="button-reset"
                    >
                      Reset to original
                    </button>
                  </div>
                  <div className="h-px bg-[#E5E7EB] mb-6" />
                  {DOMAIN_ORDER.map((domain) => (
                    <DomainEditCard
                      key={domain}
                      domain={domain}
                      domainState={editState[domain]}
                      onUpdate={(level, inputs) => handleEditDomain(domain, level, inputs)}
                      gapValue={gapValues[domain]}
                      originalGapValue={originalGaps[domain]}
                      providers={providers}
                      annualEncounters={annualEncounters}
                      utilization={utilization}
                      timeSavings={timeSavings}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.5 }}>
            <div className="bg-[#F5F0EB] rounded-lg p-8 md:p-10 mb-8" data-testid="card-chart">
              <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
                3-Year Projection
              </p>
              <p className="text-sm text-[#888888] mb-6">
                Cumulative value captured vs. current trajectory
              </p>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#888888' }} />
                    <YAxis
                      tickFormatter={(v: number) => v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `$${Math.round(v / 1000)}K` : `$${v}`}
                      tick={{ fontSize: 12, fill: '#888888' }}
                      width={70}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      formatter={(value: string) => <span className="text-xs text-black">{value === 'actNow' ? 'Act Now' : 'Current State'}</span>}
                      wrapperStyle={{ paddingTop: 12 }}
                    />
                    <Line type="monotone" dataKey="actNow" stroke="#EA2C00" strokeWidth={2} dot={{ r: 4, fill: '#EA2C00' }} fill="none" name="actNow" />
                    <Line type="monotone" dataKey="currentState" stroke="#888888" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3, fill: '#888888' }} fill="none" name="currentState" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>

          <StepFooter onBack={onBack} onNext={onNext} nextLabel="See My Summary" />
          <div className={STEP_FOOTER_SPACER_CLASS} />
        </div>

        <motion.div
          className="w-full lg:w-[320px] flex-shrink-0"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.6, ease: "easeOut" }}
        >
          <div className="bg-[#1A1A1A] rounded-xl p-6 lg:sticky lg:top-24" data-testid="panel-gap-summary">

            <p className="text-[10px] font-medium text-white/50 uppercase tracking-[1.5px] mb-4">
              Value at a Glance
            </p>

            <p className="font-bold text-3xl text-[#EA2C00] leading-none mb-1" data-testid="panel-hero-value">
              {formatDollar(displayedTotal)}
            </p>
            <p className="text-xs text-white/40 mb-5">unrealized annually</p>

            <div className="h-px bg-white/10 my-4" />

            <div className="grid grid-cols-3 gap-3 mb-5">
              <div>
                <p className="text-white font-bold text-lg leading-none" data-testid="value-monthly">
                  ${displayedMonthly.toLocaleString()}
                </p>
                <p className="text-[10px] text-white/40 uppercase tracking-wide mt-1">/ month</p>
              </div>
              <div>
                <p className="text-white font-bold text-lg leading-none" data-testid="value-weekly">
                  ${displayedWeekly.toLocaleString()}
                </p>
                <p className="text-[10px] text-white/40 uppercase tracking-wide mt-1">/ week</p>
              </div>
              <div>
                <p className="text-white font-bold text-lg leading-none" data-testid="value-daily">
                  ${displayedDaily.toLocaleString()}
                </p>
                <p className="text-[10px] text-white/40 uppercase tracking-wide mt-1">/ day</p>
              </div>
            </div>

            <div className="h-px bg-white/10 my-5" />

            <p className="text-[10px] font-medium text-white/50 uppercase tracking-[1.5px] mb-3">
              Cost of Waiting
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/70">Wait 6 months</span>
                <span className="font-bold text-sm text-[#EA2C00]" data-testid="value-wait-6mo">
                  {formatDollarFull(permanentlyLost6mo)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/70">Wait 12 months</span>
                <span className="font-bold text-sm text-[#EA2C00]" data-testid="value-wait-12mo">
                  {formatDollarFull(permanentlyLost12mo)}
                </span>
              </div>
            </div>

            <div className="h-px bg-white/10 my-5" />

            <p className="text-[10px] font-medium text-white/50 uppercase tracking-[1.5px] mb-3">
              Domain Gaps
            </p>
            <div className="space-y-2">
              {DOMAIN_ORDER.map((domain) => (
                <div key={domain} className="flex items-center justify-between text-sm">
                  <span className="text-white/70">{DOMAIN_LABELS[domain]}</span>
                  <span className="text-white font-semibold">
                    {formatDollar(Math.round(gapValues[domain] * HAIRCUT))}
                  </span>
                </div>
              ))}
            </div>

            <div className="h-px bg-white/10 my-5" />

            <p className="text-xs text-white/60 leading-relaxed italic">
              This is not an aspirational number. It is a measurement of the enterprise value currently flowing through your documentation infrastructure that is not being captured.
            </p>

          </div>
        </motion.div>
      </div>
    </div>
  );
}
