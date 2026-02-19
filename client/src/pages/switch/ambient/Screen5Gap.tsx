import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { DS, labelStyle, cardStyle, featuredCardStyle, primaryButtonStyle, backLinkStyle } from "./designTokens";
import { useAssessment } from "@/lib/assessment";
import { formatDollar, formatDollarFull } from "./ambientCalculator";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Legend, Tooltip,
} from "recharts";
import {
  type Domain, type ActivationLevel,
  DOMAIN_ORDER, DOMAIN_LABELS, ACTIVATION_LABELS, DOMAIN_WEIGHTS,
  computeGapForDomain, computeDomainScore, scoreToActivationLevel,
} from "./domainCalculations";

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

function FadeIn({ delay, children, className }: { delay: number; children: React.ReactNode; className?: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);
  return (
    <div className={className} style={{
      opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(8px)',
      transition: 'opacity 400ms ease-out, transform 400ms ease-out',
    }}>{children}</div>
  );
}

const inputStyle: React.CSSProperties = {
  fontFamily: DS.font, fontWeight: 600, fontSize: 15, color: DS.black,
  backgroundColor: DS.white, border: `1.5px solid ${DS.border}`, borderRadius: 8,
  padding: '10px 14px', width: '100%', outline: 'none', transition: 'border-color 150ms ease',
  textAlign: 'right' as const,
};

const selectStyle: React.CSSProperties = {
  fontFamily: DS.font, fontWeight: 500, fontSize: 14, color: DS.black,
  backgroundColor: DS.white, border: `1.5px solid ${DS.border}`, borderRadius: 8,
  padding: '10px 14px', width: '100%', outline: 'none', cursor: 'pointer',
  appearance: 'none' as const, WebkitAppearance: 'none' as const,
};

function EditField({ label, value, onChange, prefix, suffix, testId }: {
  label: string; value: number; onChange: (v: number) => void;
  prefix?: string; suffix?: string; testId: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <span style={{ fontSize: 13, color: DS.body, fontFamily: DS.font, flex: 1 }}>{label}</span>
      <div className="flex items-center gap-1" style={{ maxWidth: 140 }}>
        {prefix && <span style={{ fontSize: 13, color: DS.muted }}>{prefix}</span>}
        <FormattedNumberInput
          value={value}
          onChange={onChange}
          placeholder="0"
          style={{ ...inputStyle, minWidth: 80 }}
          onFocus={(e) => { e.currentTarget.style.borderColor = DS.red; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = DS.border; }}
          data-testid={testId}
        />
        {suffix && <span style={{ fontSize: 13, color: DS.muted }}>{suffix}</span>}
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
      <div className="flex items-center justify-between mb-1">
        <span style={{ fontSize: 13, color: DS.body, fontFamily: DS.font }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: DS.black, fontFamily: DS.font }}>{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-[#EA2C00]" style={{ height: 4 }} data-testid={testId} />
    </div>
  );
}

function EditPill({ label, options, value, onChange, testId }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void; testId: string;
}) {
  return (
    <div className="mb-3">
      <span style={{ fontSize: 13, color: DS.body, fontFamily: DS.font, display: 'block', marginBottom: 6 }}>{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button key={opt} type="button" onClick={() => onChange(opt)}
            style={{
              fontFamily: DS.font, fontWeight: value === opt ? 700 : 500, fontSize: 13,
              padding: '6px 14px', borderRadius: DS.radius.pill,
              border: `1.5px solid ${value === opt ? DS.black : DS.border}`,
              backgroundColor: value === opt ? DS.white : DS.bg,
              color: value === opt ? DS.black : DS.body, cursor: 'pointer',
            }}
            data-testid={`${testId}-${opt}`}
          >{opt}</button>
        ))}
      </div>
    </div>
  );
}

function DomainEditCard({ domain, domainState, onUpdate, gapValue, originalGapValue, score }: {
  domain: Domain; domainState: EditableDomainInputs;
  onUpdate: (level: ActivationLevel, inputs: Record<string, number | string>) => void;
  gapValue: number; originalGapValue: number; score: number;
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
    <div style={{
      backgroundColor: DS.white, border: `1px solid ${DS.border}`, borderRadius: 12,
      padding: expanded ? '20px' : '16px 20px', marginBottom: 12,
      transition: 'all 200ms ease',
    }} data-testid={`edit-card-${domain}`}>
      <button type="button" onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        data-testid={`toggle-${domain}`}
      >
        <div className="flex items-center gap-3">
          <div>
            <p style={{ fontWeight: 600, fontSize: 15, color: DS.black, fontFamily: DS.font, textAlign: 'left' }}>
              {DOMAIN_LABELS[domain]}
            </p>
            <p style={{ fontSize: 12, color: DS.muted, fontFamily: DS.font, fontStyle: 'italic', textAlign: 'left' }}>
              {ACTIVATION_LABELS[domain][level]}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p style={{ fontWeight: 700, fontSize: 17, color: changed ? DS.red : DS.black, fontFamily: DS.font }}>
              {formatDollar(Math.round(gapValue * HAIRCUT))}
            </p>
            <p style={{ fontSize: 11, color: DS.muted, fontFamily: DS.font }}>/ yr</p>
          </div>
          <ChevronDown size={16} style={{
            color: DS.muted, transition: 'transform 200ms',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
          }} />
        </div>
      </button>

      {expanded && (
        <div style={{ marginTop: 16, borderTop: `1px solid ${DS.border}`, paddingTop: 16 }}>
          <div className="mb-4">
            <p style={{ ...labelStyle, marginBottom: 6 }}>
              Activation Level
            </p>
            <div style={{ position: 'relative' }}>
              <select
                value={level}
                onChange={(e) => handleLevelChange(parseInt(e.target.value) as ActivationLevel)}
                style={selectStyle}
                data-testid={`select-activation-${domain}`}
              >
                {([1, 2, 3, 4] as ActivationLevel[]).map((l) => (
                  <option key={l} value={l}>{ACTIVATION_LABELS[domain][l]}</option>
                ))}
              </select>
              <ChevronDown size={14} style={{
                position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                color: DS.muted, pointerEvents: 'none',
              }} />
            </div>
          </div>

          <p style={{ ...labelStyle, marginBottom: 8 }}>
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

          <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${DS.border}` }}>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: 12, color: DS.muted, fontFamily: DS.font }}>Updated gap</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: changed ? DS.red : DS.muted, fontFamily: DS.font }}
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
    <div style={{
      backgroundColor: DS.white, border: `1px solid ${DS.border}`, borderRadius: 8,
      padding: '12px 16px', boxShadow: DS.shadow,
    }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: DS.black, fontFamily: DS.font, marginBottom: 6 }}>{label}</p>
      {actNow && <p style={{ fontSize: 12, color: DS.red, fontFamily: DS.font }}>Act Now: {formatDollarFull(actNow.value)}</p>}
      {current && <p style={{ fontSize: 12, color: DS.muted, fontFamily: DS.font }}>Current State: {formatDollarFull(current.value)}</p>}
      <p style={{ fontSize: 12, fontWeight: 700, color: DS.red, fontFamily: DS.font, marginTop: 4 }}>Gap: {formatDollarFull(gap)}</p>
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
    <div style={{ fontFamily: DS.font, paddingBottom: 80 }}>

      <div className="flex flex-col items-center justify-center text-center" style={{ minHeight: 'calc(100vh - 56px)', paddingTop: 80 }}>
        <FadeIn delay={0}>
          <p style={labelStyle} className="mb-3" data-testid="text-gap-label">
            Unrealized Enterprise Value
          </p>
          <p style={{ fontSize: 17, color: DS.body, lineHeight: 1.75, fontStyle: 'italic', fontFamily: DS.font, maxWidth: 400, margin: '0 auto' }} className="mb-10" data-testid="text-gap-pre-statement">
            Already in your operations. Already earned. Not yet realized.
          </p>
        </FadeIn>

        <FadeIn delay={200}>
          <p style={{ fontWeight: 700, fontSize: 'clamp(64px, 8vw, 96px)', color: DS.red, lineHeight: 1 }} className="mb-2" data-testid="value-hero-gap">
            <CountUpNumber target={displayedTotal} />
          </p>
          <p style={{ fontSize: 20, color: DS.muted }} className="mb-8">annually</p>
        </FadeIn>

        <FadeIn delay={600}>
          <div style={cardStyle} className="mb-8" data-testid="card-time-breakdowns">
            <div className="flex flex-wrap justify-center gap-12">
              <div className="text-center">
                <p style={{ fontWeight: 700, fontSize: 28, color: DS.black, fontFamily: DS.font }} data-testid="value-monthly">
                  ${displayedMonthly.toLocaleString()}
                </p>
                <p style={{ ...labelStyle, fontSize: 10, marginTop: 4 }}>Per Month</p>
              </div>
              <div className="text-center">
                <p style={{ fontWeight: 700, fontSize: 28, color: DS.black, fontFamily: DS.font }} data-testid="value-weekly">
                  ${displayedWeekly.toLocaleString()}
                </p>
                <p style={{ ...labelStyle, fontSize: 10, marginTop: 4 }}>Per Week</p>
              </div>
              <div className="text-center">
                <p style={{ fontWeight: 700, fontSize: 28, color: DS.black, fontFamily: DS.font }} data-testid="value-daily">
                  ${displayedDaily.toLocaleString()}
                </p>
                <p style={{ ...labelStyle, fontSize: 10, marginTop: 4 }}>Per Day</p>
              </div>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={1100}>
          <button type="button" onClick={handleOpenEdit}
            style={{
              fontSize: 13, color: DS.muted, cursor: 'pointer', background: 'none', border: 'none',
              fontFamily: DS.font, fontWeight: 500, textDecoration: 'underline', textUnderlineOffset: '2px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = DS.black)}
            onMouseLeave={(e) => (e.currentTarget.style.color = DS.muted)}
            data-testid="button-refine"
          >
            Refine my assumptions
          </button>
        </FadeIn>
      </div>

      <div ref={editSectionRef} style={{ paddingTop: 64 }}>
        <div className="max-w-[600px] mx-auto">

          <div style={cardStyle} className="mb-12" data-testid="card-domain-breakdown">
            <p style={labelStyle} className="mb-6">
              Domain Breakdown
            </p>
            {DOMAIN_ORDER.map((domain, idx) => (
              <div key={domain}>
                <div className="flex items-center justify-between" style={{ padding: '12px 0' }}>
                  <span style={{ fontWeight: 600, fontSize: 15, color: DS.black, fontFamily: DS.font }}>{DOMAIN_LABELS[domain]}</span>
                  <span style={{ fontWeight: 700, fontSize: 17, color: DS.black, fontFamily: DS.font }} data-testid={`domain-gap-${domain}`}>
                    {formatDollar(Math.round(gapValues[domain] * HAIRCUT))}
                  </span>
                </div>
                {idx < DOMAIN_ORDER.length - 1 && <div style={{ height: 1, backgroundColor: '#F0F0F0' }} />}
              </div>
            ))}
            <div style={{ height: 1, backgroundColor: DS.border, marginTop: 4 }} />
            <div className="flex items-center justify-between" style={{ backgroundColor: DS.bg, borderRadius: 8, padding: '14px 16px', marginTop: 12 }}>
              <span style={{ fontWeight: 600, fontSize: 15, color: DS.black, fontFamily: DS.font }}>Total Annual Gap</span>
              <span style={{ fontWeight: 700, fontSize: 20, color: DS.red, fontFamily: DS.font }} data-testid="value-total-gap">
                {formatDollar(displayedTotal)}
              </span>
            </div>
          </div>

          {isEditing && (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-4">
                <p style={labelStyle}>
                  Refine Assumptions
                </p>
                <button type="button" onClick={handleReset}
                  style={{ fontSize: 12, color: DS.muted, cursor: 'pointer', background: 'none', border: 'none', fontFamily: DS.font, fontWeight: 500, textDecoration: 'underline', textUnderlineOffset: '2px' }}
                  data-testid="button-reset"
                >
                  Reset to original
                </button>
              </div>
              {DOMAIN_ORDER.map((domain) => (
                <DomainEditCard
                  key={domain}
                  domain={domain}
                  domainState={editState[domain]}
                  onUpdate={(level, inputs) => handleEditDomain(domain, level, inputs)}
                  gapValue={gapValues[domain]}
                  originalGapValue={originalGaps[domain]}
                  score={editState[domain].activationLevel ? computeDomainScore(domain, editState[domain].activationLevel, editState[domain].inputs) : 0}
                  providers={providers}
                  annualEncounters={annualEncounters}
                  utilization={utilization}
                  timeSavings={timeSavings}
                />
              ))}
            </div>
          )}

          <div style={cardStyle} className="mb-12" data-testid="card-chart">
            <p style={labelStyle} className="mb-2">
              3-Year Projection
            </p>
            <p style={{ fontSize: 13, color: DS.muted, fontFamily: DS.font }} className="mb-6">
              Cumulative value captured vs. current trajectory
            </p>
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: DS.muted, fontFamily: DS.font }} />
                  <YAxis
                    tickFormatter={(v: number) => v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `$${Math.round(v / 1000)}K` : `$${v}`}
                    tick={{ fontSize: 12, fill: DS.muted, fontFamily: DS.font }}
                    width={70}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    formatter={(value: string) => <span style={{ fontSize: 12, color: DS.body, fontFamily: DS.font }}>{value === 'actNow' ? 'Act Now' : 'Current State'}</span>}
                    wrapperStyle={{ paddingTop: 12 }}
                  />
                  <Line type="monotone" dataKey="actNow" stroke={DS.red} strokeWidth={2} dot={{ r: 4, fill: DS.red }} fill="none" name="actNow" />
                  <Line type="monotone" dataKey="currentState" stroke={DS.muted} strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3, fill: DS.muted }} fill="none" name="currentState" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={cardStyle} className="mb-12" data-testid="card-cost-waiting">
            <p style={labelStyle} className="mb-6">
              The Cost of Waiting
            </p>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span style={{ fontSize: 15, color: DS.body, fontFamily: DS.font }}>Wait 6 months</span>
                <span style={{ fontWeight: 700, fontSize: 17, color: DS.red, fontFamily: DS.font }} data-testid="value-wait-6mo">
                  {formatDollarFull(permanentlyLost6mo)} lost
                </span>
              </div>
              <div style={{ height: 1, backgroundColor: '#F0F0F0' }} />
              <div className="flex items-center justify-between">
                <span style={{ fontSize: 15, color: DS.body, fontFamily: DS.font }}>Wait 12 months</span>
                <span style={{ fontWeight: 700, fontSize: 17, color: DS.red, fontFamily: DS.font }} data-testid="value-wait-12mo">
                  {formatDollarFull(permanentlyLost12mo)} lost
                </span>
              </div>
            </div>
          </div>

          <div
            style={{ backgroundColor: DS.black, borderRadius: DS.radius.card, padding: '32px' }}
            className="mb-12"
            data-testid="card-dark-summary"
          >
            <p style={{ fontSize: 17, color: DS.white, lineHeight: 1.75, fontFamily: DS.font }}>
              This is not an aspirational number. It is a measurement of the enterprise value currently flowing through your documentation infrastructure that is not being captured. Every day it compounds.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <button onClick={onBack} style={backLinkStyle} data-testid="button-back">
              Back
            </button>
            <button
              onClick={onNext}
              className="inline-flex items-center gap-2"
              style={primaryButtonStyle()}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = DS.redHover)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = DS.red)}
              data-testid="button-next"
            >
              See My Summary
              <ArrowRight size={16} />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
