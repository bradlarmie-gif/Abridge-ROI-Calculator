import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { DS } from "./designTokens";
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

function DomainEditCard({ domain, domainState, onUpdate, gapValue, originalGapValue, score,
  providers, annualEncounters, utilization, timeSavings }: {
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
      backgroundColor: DS.bg, border: `1px solid ${DS.border}`, borderRadius: 12,
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
            <p style={{ fontSize: 11, fontWeight: 600, color: DS.muted, letterSpacing: '2px', textTransform: 'uppercase', fontFamily: DS.font, marginBottom: 6 }}>
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

          <p style={{ fontSize: 11, fontWeight: 600, color: DS.muted, letterSpacing: '2px', textTransform: 'uppercase', fontFamily: DS.font, marginBottom: 8 }}>
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
      padding: '12px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
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

  const domainScoresForBars = useMemo(() => {
    const scores: Record<Domain, number> = { capacity: 0, revenue: 0, workforce: 0, risk: 0 };
    for (const d of DOMAIN_ORDER) {
      scores[d] = computeDomainScore(d, editState[d].activationLevel, editState[d].inputs);
    }
    return scores;
  }, [editState]);

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

      {/* SECTION 1 — THE NUMBER */}
      <div className="flex flex-col items-center justify-center text-center" style={{ minHeight: 'calc(100vh - 56px)', paddingTop: 80 }}>
        <FadeIn delay={0}>
          <p style={{ fontWeight: 600, fontSize: 11, color: DS.muted, letterSpacing: '2.5px', textTransform: 'uppercase' }} className="mb-10" data-testid="text-gap-label">
            Unrealized Enterprise Value
          </p>
        </FadeIn>

        <FadeIn delay={200}>
          <p style={{ fontWeight: 700, fontSize: 'clamp(64px, 8vw, 96px)', color: DS.red, lineHeight: 1 }} className="mb-2" data-testid="value-hero-gap">
            <CountUpNumber target={displayedTotal} />
          </p>
          <p style={{ fontSize: 20, color: DS.muted }} className="mb-8">annually</p>
        </FadeIn>

        <FadeIn delay={600}>
          <div className="flex flex-wrap justify-center gap-12 mb-8">
            <div className="text-center">
              <p style={{ fontWeight: 700, fontSize: 28, color: DS.black, fontFamily: DS.font }} data-testid="value-monthly">
                ${displayedMonthly.toLocaleString()}
              </p>
              <p style={{ fontSize: 11, color: DS.muted, letterSpacing: '2px', textTransform: 'uppercase', fontFamily: DS.font }}>Per Month</p>
            </div>
            <div className="text-center">
              <p style={{ fontWeight: 700, fontSize: 28, color: DS.black, fontFamily: DS.font }} data-testid="value-weekly">
                ${displayedWeekly.toLocaleString()}
              </p>
              <p style={{ fontSize: 11, color: DS.muted, letterSpacing: '2px', textTransform: 'uppercase', fontFamily: DS.font }}>Per Week</p>
            </div>
            <div className="text-center">
              <p style={{ fontWeight: 700, fontSize: 28, color: DS.black, fontFamily: DS.font }} data-testid="value-daily">
                ${displayedDaily.toLocaleString()}
              </p>
              <p style={{ fontSize: 11, color: DS.muted, letterSpacing: '2px', textTransform: 'uppercase', fontFamily: DS.font }}>Per Day</p>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={900}>
          <p style={{ fontSize: 17, color: DS.body, lineHeight: 1.75, fontStyle: 'italic' }} className="mb-8 max-w-[400px]">
            Already in your operations.<br />
            Already earned. Not yet realized.
          </p>
        </FadeIn>

        <FadeIn delay={1100}>
          <button type="button" onClick={handleOpenEdit}
            style={{
              fontSize: 13, color: DS.muted, cursor: 'pointer', background: 'none', border: 'none',
              fontFamily: DS.font, fontWeight: 500, textDecoration: 'underline', textUnderlineOffset: '2px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = DS.black)}
            onMouseLeave={(e) => (e.currentTarget.style.color = DS.muted)}
            data-testid="link-edit-inputs"
          >
            Review or adjust your inputs &rarr;
          </button>
        </FadeIn>
      </div>

      {/* SECTION 2 — DOMAIN BREAKDOWN */}
      <div ref={editSectionRef} style={{ paddingTop: 64 }}>
        <div className="max-w-[600px] mx-auto">
          <p style={{ fontWeight: 600, fontSize: 11, color: DS.muted, letterSpacing: '2.5px', textTransform: 'uppercase' }} className="mb-6" data-testid="text-breakdown-label">
            Where the Gap Lives
          </p>

          {isEditing && (
            <p style={{ fontSize: 13, color: DS.muted, fontFamily: DS.font, marginBottom: 16 }}>
              Editing inputs here updates dollar projections only. Your Documentation Intelligence Score is fixed.
            </p>
          )}

          {!isEditing ? (
            <>
              {DOMAIN_ORDER.map((domain) => {
                const score = domainScoresForBars[domain];
                const gapVal = Math.round(gapValues[domain] * HAIRCUT);
                return (
                  <div key={domain} className="flex items-center gap-4" style={{ marginBottom: 16 }}
                    data-testid={`gap-row-${domain}`}>
                    <div style={{ minWidth: 120 }}>
                      <p style={{ fontWeight: 600, fontSize: 15, color: DS.black, fontFamily: DS.font }}>{DOMAIN_LABELS[domain]}</p>
                      <p style={{ fontSize: 12, color: DS.muted, fontFamily: DS.font, fontStyle: 'italic' }}>
                        {ACTIVATION_LABELS[domain][editState[domain].activationLevel]}
                      </p>
                    </div>
                    <div style={{ flex: 1, height: 6, backgroundColor: DS.border, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', backgroundColor: DS.red, borderRadius: 3,
                        width: `${Math.min(score, 100)}%`, transition: 'width 300ms ease-out',
                      }} />
                    </div>
                    <div className="text-right" style={{ minWidth: 90 }}>
                      <p style={{ fontWeight: 700, fontSize: 17, color: DS.black, fontFamily: DS.font }}>{formatDollar(gapVal)}</p>
                      <p style={{ fontSize: 11, color: DS.muted, fontFamily: DS.font }}>/ yr</p>
                    </div>
                  </div>
                );
              })}

              <div style={{ height: 1, backgroundColor: DS.border, margin: '16px 0' }} />
              <div className="flex items-center justify-between">
                <span style={{ fontSize: 15, fontWeight: 600, color: DS.black, fontFamily: DS.font }}>Total Annual Gap</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: DS.red, fontFamily: DS.font }} data-testid="value-total-gap">
                  {formatDollarFull(displayedTotal)}
                </span>
              </div>
            </>
          ) : (
            <>
              {DOMAIN_ORDER.map((domain) => (
                <DomainEditCard
                  key={domain}
                  domain={domain}
                  domainState={editState[domain]}
                  onUpdate={(level, inp) => handleEditDomain(domain, level, inp)}
                  gapValue={gapValues[domain]}
                  originalGapValue={originalGaps[domain]}
                  score={domainScoresForBars[domain]}
                  providers={providers}
                  annualEncounters={annualEncounters}
                  utilization={utilization}
                  timeSavings={timeSavings}
                />
              ))}

              <div style={{ height: 1, backgroundColor: DS.border, margin: '16px 0' }} />
              <div className="flex items-center justify-between mb-6">
                <span style={{ fontSize: 15, fontWeight: 600, color: DS.black, fontFamily: DS.font }}>Total Annual Gap</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: DS.red, fontFamily: DS.font }} data-testid="value-total-gap-edit">
                  {formatDollarFull(displayedTotal)}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <button type="button" onClick={() => setIsEditing(false)}
                  style={{
                    fontFamily: DS.font, fontWeight: 600, fontSize: 14, padding: '10px 24px', borderRadius: DS.radius.input,
                    backgroundColor: DS.red, color: DS.white, border: 'none', cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = DS.redHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = DS.red)}
                  data-testid="button-apply-changes"
                >
                  Apply Changes
                </button>
                <button type="button" onClick={handleReset}
                  style={{
                    fontFamily: DS.font, fontWeight: 500, fontSize: 13, color: DS.muted,
                    background: 'none', border: 'none', cursor: 'pointer',
                    textDecoration: 'underline', textUnderlineOffset: '2px',
                  }}
                  data-testid="button-reset"
                >
                  Reset to Original
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* SECTION 3 — THE GRAPH */}
      <div style={{ paddingTop: 64 }}>
        <div className="max-w-[600px] mx-auto">
          <p style={{ fontWeight: 600, fontSize: 11, color: DS.muted, letterSpacing: '2.5px', textTransform: 'uppercase' }} className="mb-2.5">
            The Compounding Effect of Inaction
          </p>
          <h2 style={{ fontWeight: 600, fontSize: 28, color: DS.black, lineHeight: 1.3, fontFamily: DS.font }} className="mb-8">
            Every year at current activation compounds the gap.
          </h2>

          <div className="mb-6" style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid horizontal={true} vertical={false} stroke="#F0F0EE" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: DS.muted, fontFamily: DS.font }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="actNow" stroke={DS.red} strokeWidth={2} dot={false} name="Act Now" />
                <Line type="monotone" dataKey="currentState" stroke={DS.muted} strokeWidth={1.5} strokeDasharray="6 4" dot={false} name="Current State" />
                <Legend wrapperStyle={{ fontSize: 13, fontFamily: DS.font, color: DS.muted }} iconType="plainline" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SECTION 4 — COST OF WAITING TABLE */}
      <div style={{ paddingTop: 48 }}>
        <div className="max-w-[600px] mx-auto">
          <p style={{ fontWeight: 600, fontSize: 11, color: DS.muted, letterSpacing: '2.5px', textTransform: 'uppercase' }} className="mb-6">
            Cost of Waiting
          </p>

          <div className="mb-4 overflow-x-auto">
            <table style={{ width: '100%', fontSize: 15, fontFamily: DS.font, borderCollapse: 'collapse' }} data-testid="table-cost-waiting">
              <thead>
                <tr style={{ borderBottom: `1px solid ${DS.border}` }}>
                  <th style={{ textAlign: 'left', padding: '12px 0', fontWeight: 600, color: DS.muted, fontSize: 13 }}></th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 600, color: DS.black, fontSize: 13 }}>Act Now</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 400, color: DS.muted, fontSize: 13 }}>Wait 6mo</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 400, color: DS.muted, fontSize: 13 }}>Wait 12mo</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: `1px solid ${DS.border}` }}>
                  <td style={{ padding: '12px 0', fontWeight: 600, color: DS.black }}>3-Year Value</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: DS.black, fontWeight: 600 }}>{formatDollar(actNow3yr)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: DS.black }}>{formatDollar(wait6mo3yr)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: DS.black }}>{formatDollar(wait12mo3yr)}</td>
                </tr>
                <tr style={{ borderBottom: `1px solid ${DS.border}` }}>
                  <td style={{ padding: '12px 0', fontWeight: 700, color: DS.black }}>Permanently Lost</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: DS.muted }}>&mdash;</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: DS.red, fontWeight: 600 }} data-testid="value-lost-6mo">{formatDollar(permanentlyLost6mo)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: DS.red, fontWeight: 600 }} data-testid="value-lost-12mo">{formatDollar(permanentlyLost12mo)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '12px 0', fontWeight: 600, color: DS.black }}>Monthly Cost</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: DS.black }}>{formatDollar(displayedMonthly)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: DS.black }}>{formatDollar(Math.round(wait6mo3yr / 36))}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: DS.black }}>{formatDollar(Math.round(wait12mo3yr / 36))}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p style={{ fontSize: 13, color: DS.muted, fontStyle: 'italic', fontFamily: DS.font, lineHeight: 1.6 }}>
            Value not captured in earlier periods is permanently lost &mdash; it does not shift forward in time.
          </p>
        </div>
      </div>

      {/* SECTION 5 — THE STATEMENT */}
      <div style={{ paddingTop: 48 }}>
        <div className="max-w-[600px] mx-auto">
          <div style={{ backgroundColor: DS.black, borderRadius: DS.radius.card, padding: 32 }} className="mb-10" data-testid="card-dark-statement">
            <p style={{ fontSize: 20, color: DS.white, fontWeight: 600, fontFamily: DS.font }} className="mb-3">
              Every month at current activation levels leaves
            </p>
            <p style={{ fontSize: 36, fontWeight: 700, color: DS.red, fontFamily: DS.font }} className="mb-3" data-testid="value-dark-monthly">
              {formatDollarFull(displayedMonthly)}
            </p>
            <p style={{ fontSize: 20, color: DS.white, fontWeight: 600, fontFamily: DS.font }} className="mb-4">
              in enterprise value permanently uncaptured.
            </p>
            <p style={{ fontSize: 15, color: DS.muted, fontFamily: DS.font, lineHeight: 1.7 }} className="mb-4">
              This is not a projection of what better technology could deliver. It is a map of what your current documentation infrastructure is failing to capture &mdash; right now, inside your existing operations.
            </p>
            <p style={{ fontSize: 13, color: DS.body, fontFamily: DS.font }}>
              Conservative estimate. Based on your inputs. Methodology available on request.
            </p>
          </div>

          {/* CTA */}
          <div className="flex items-center justify-between">
            <button onClick={onBack}
              style={{
                fontSize: 15, color: DS.body, textDecoration: 'underline', textUnderlineOffset: '2px',
                cursor: 'pointer', background: 'none', border: 'none', fontFamily: DS.font, fontWeight: 500,
              }}
              data-testid="button-back"
            >
              Back
            </button>
            <button onClick={onNext}
              className="inline-flex items-center gap-2"
              style={{
                fontFamily: DS.font, fontWeight: 600, fontSize: 15, padding: '15px 36px', borderRadius: DS.radius.input,
                backgroundColor: DS.red, color: DS.white, border: 'none', cursor: 'pointer',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = DS.redHover)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = DS.red)}
              data-testid="button-next"
            >
              See My Invitation
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
