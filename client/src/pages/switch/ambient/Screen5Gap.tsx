import { useState, useEffect, useRef, useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { DS } from "./designTokens";
import { useAssessment } from "@/lib/assessment";
import { calculateAmbientScore, formatDollar, formatDollarFull } from "./ambientCalculator";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts";

interface Screen5Props {
  onNext: () => void;
  onBack: () => void;
}

function CountUpNumber({ target, duration = 1600, prefix = "$" }: { target: number; duration?: number; prefix?: string }) {
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

export default function Screen5Gap({ onNext, onBack }: Screen5Props) {
  const { state } = useAssessment();
  const { inputs } = state;
  const sectionBRef = useRef<HTMLDivElement>(null);
  const sectionCRef = useRef<HTMLDivElement>(null);

  const result = useMemo(() => calculateAmbientScore(
    inputs.providers, inputs.annualEncounters,
    inputs.utilization || 45, inputs.timeSavedPerEncounter || 2.0,
    inputs.dataMode,
  ), [inputs]);

  const [showCTA, setShowCTA] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowCTA(true), 2000);
    return () => clearTimeout(t);
  }, []);

  const dt = result.displayedTotal;
  const chartData = [
    { label: 'Today', abridge: 0, current: 0 },
    { label: '3mo', abridge: Math.round(dt * 0.18), current: 0 },
    { label: '6mo', abridge: Math.round(dt * 0.48), current: 0 },
    { label: 'Year 1', abridge: Math.round(dt * 0.85), current: Math.round(dt * 0.03) },
    { label: 'Year 2', abridge: Math.round(dt * 0.85 + dt), current: Math.round(dt * 0.06) },
    { label: 'Year 3', abridge: Math.round(dt * 0.85 + dt + dt * 1.08), current: Math.round(dt * 0.09) },
  ];

  const domainPills = [
    { key: 'C', label: 'Capacity', value: result.domains.capacity },
    { key: 'R', label: 'Revenue', value: result.domains.revenue },
    { key: 'W', label: 'Workforce', value: result.domains.workforce },
    { key: 'X', label: 'Risk', value: result.domains.risk },
  ];

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div style={{ fontFamily: DS.font, paddingBottom: 80 }}>
      <div className="flex flex-col items-center justify-center text-center" style={{ minHeight: 'calc(100vh - 56px)', paddingTop: 80 }}>
        <p style={{ fontWeight: 600, fontSize: 11, color: DS.muted, letterSpacing: '2.5px', textTransform: 'uppercase' }} className="mb-6" data-testid="text-screen5-label">
          Unrealized Enterprise Value
        </p>

        <p style={{ fontSize: 20, color: DS.body, lineHeight: 1.7 }} className="mb-6 max-w-[440px]">
          Based on your organization's profile, your documentation infrastructure is currently failing to capture
        </p>

        <p style={{ fontWeight: 700, fontSize: 'clamp(64px, 8vw, 96px)', color: DS.red, lineHeight: 1 }} className="mb-4" data-testid="value-hero-gap">
          <CountUpNumber target={result.displayedTotal} />
        </p>

        <p style={{ fontSize: 20, color: DS.muted }} className="mb-8">annually</p>

        <p style={{ fontSize: 17, color: DS.body, lineHeight: 1.75 }} className="mb-14 max-w-[400px]">
          Already in your operations.<br />
          Already earned. Not yet realized.
        </p>

        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {domainPills.map((d) => (
            <div
              key={d.key}
              className="flex items-center gap-1.5"
              style={{
                padding: '8px 16px', borderRadius: DS.radius.pill, fontSize: 14, fontWeight: 600,
                backgroundColor: DS.black, color: DS.white, fontFamily: DS.font,
              }}
              data-testid={`domain-value-${d.key}`}
            >
              <span>{d.key}</span>
              <span>{formatDollar(Math.round(d.value * result.haircut))}</span>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => scrollTo(sectionBRef)}
          style={{ fontSize: 15, color: DS.muted, cursor: 'pointer', background: 'none', border: 'none', fontFamily: DS.font, fontWeight: 500 }}
          data-testid="link-cost-waiting"
        >
          See the cost of waiting &rarr;
        </button>
      </div>

      <div ref={sectionBRef} style={{ paddingTop: 80 }}>
        <div className="max-w-[600px] mx-auto">
          <p style={{ fontWeight: 600, fontSize: 11, color: DS.muted, letterSpacing: '2.5px', textTransform: 'uppercase' }} className="mb-2.5">
            The Compounding Effect of Inaction
          </p>
          <h2 style={{ fontWeight: 700, fontSize: 36, color: DS.black, lineHeight: 1.2 }} className="mb-10">
            Every year at current state compounds the gap.
          </h2>

          <div className="mb-8" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid horizontal={true} vertical={false} stroke="#F0F0F0" />
                <XAxis dataKey="label" tick={{ fontSize: 13, fill: DS.muted, fontFamily: DS.font }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Line type="monotone" dataKey="abridge" stroke={DS.red} strokeWidth={2} dot={false} name="Abridge" />
                <Line type="monotone" dataKey="current" stroke={DS.muted} strokeWidth={1.5} strokeDasharray="6 4" dot={false} name="Current state" />
                <Legend
                  wrapperStyle={{ fontSize: 13, fontFamily: DS.font, color: DS.muted }}
                  iconType="plainline"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mb-8 overflow-x-auto">
            <table style={{ width: '100%', fontSize: 15, fontFamily: DS.font, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${DS.border}` }}>
                  <th style={{ textAlign: 'left', padding: '12px 0', fontWeight: 600, color: DS.muted, fontSize: 13 }}></th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 600, color: DS.muted, fontSize: 13 }}>Act Now</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 600, color: DS.muted, fontSize: 13 }}>Wait 6 mo</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 600, color: DS.muted, fontSize: 13 }}>Wait 12 mo</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: `1px solid ${DS.border}` }}>
                  <td style={{ padding: '12px 0', fontWeight: 600, color: DS.black }}>3-Year Value</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: DS.black, fontWeight: 600 }}>{formatDollar(result.switchNowValue)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: DS.black }}>{formatDollar(result.wait6MonthsValue)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: DS.black }}>{formatDollar(result.wait12MonthsValue)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '12px 0', fontWeight: 600, color: DS.black }}>Permanently Lost</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: DS.muted }}>&mdash;</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: DS.red, fontWeight: 600 }}>{formatDollar(result.wait6MonthsLoss)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: DS.red, fontWeight: 600 }}>{formatDollar(result.wait12MonthsLoss)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ backgroundColor: DS.black, borderRadius: DS.radius.card, padding: 32 }} className="mb-10" data-testid="card-monthly-cost">
            <p style={{ fontSize: 20, color: DS.white, fontWeight: 600, fontFamily: DS.font }} className="mb-3">
              Every month at current state leaves
            </p>
            <p style={{ fontSize: 36, fontWeight: 700, color: DS.red, fontFamily: DS.font }} className="mb-3">
              {formatDollarFull(result.monthlyGap)}
            </p>
            <p style={{ fontSize: 17, color: DS.white, lineHeight: 1.75, fontFamily: DS.font }} className="mb-3">
              in enterprise value permanently uncaptured.
            </p>
            <p style={{ fontSize: 13, color: DS.muted, fontFamily: DS.font }}>
              Conservative estimate. Methodology available on request.
            </p>
          </div>

          <div className="text-center mb-14">
            <button
              type="button"
              onClick={() => scrollTo(sectionCRef)}
              style={{ fontSize: 15, color: DS.muted, cursor: 'pointer', background: 'none', border: 'none', fontFamily: DS.font, fontWeight: 500 }}
              data-testid="link-full-summary"
            >
              See my full summary &rarr;
            </button>
          </div>
        </div>
      </div>

      <div ref={sectionCRef} style={{ paddingTop: 80 }}>
        <div className="max-w-[600px] mx-auto">
          <p style={{ fontWeight: 600, fontSize: 11, color: DS.muted, letterSpacing: '2.5px', textTransform: 'uppercase' }} className="mb-6">
            Your Documentation Intelligence Summary
          </p>

          <div style={{ backgroundColor: DS.bg, border: `1px solid ${DS.border}`, borderRadius: DS.radius.card, padding: 32 }} data-testid="card-summary">
            <div className="flex items-center justify-between mb-4">
              <span style={{ fontSize: 17, fontWeight: 600, color: DS.black }}>Documentation Intelligence Score</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: DS.black }}>{result.score} / 100</span>
            </div>
            <div style={{ width: '100%', height: 6, backgroundColor: DS.border, borderRadius: 3, overflow: 'hidden', marginBottom: 24 }}>
              <div style={{ height: '100%', width: `${Math.min(result.score, 100)}%`, backgroundColor: DS.red, borderRadius: 3 }} />
            </div>

            <div style={{ height: 1, backgroundColor: DS.border, marginBottom: 20 }} />

            {[
              { key: 'C', label: 'Capacity', value: result.domains.capacity, pct: result.utilizationPct },
              { key: 'R', label: 'Revenue', value: result.domains.revenue, pct: result.efficiencyPct },
              { key: 'W', label: 'Workforce', value: result.domains.workforce, pct: Math.min(100, Math.round((result.domains.workforce / (result.totalGap * 0.3 || 1)) * 100)) },
              { key: 'X', label: 'Risk', value: result.domains.risk, pct: Math.min(100, Math.round((result.domains.risk / (result.totalGap * 0.15 || 1)) * 100)) },
            ].map((d) => (
              <div key={d.key} className="flex items-center gap-3 mb-4">
                <div style={{ width: 24, height: 24, borderRadius: DS.radius.pill, backgroundColor: DS.black, color: DS.white, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {d.key}
                </div>
                <span style={{ fontSize: 15, color: DS.black, fontWeight: 600, width: 90 }}>{d.label}</span>
                <span style={{ fontSize: 15, color: DS.red, fontWeight: 700, width: 70, textAlign: 'right' }}>{formatDollar(Math.round(d.value * result.haircut))}</span>
                <div className="flex-1" style={{ height: 4, backgroundColor: DS.border, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(d.pct, 100)}%`, backgroundColor: DS.red, borderRadius: 2, transition: 'width 600ms ease-out' }} />
                </div>
              </div>
            ))}

            <div style={{ height: 1, backgroundColor: DS.border, margin: '20px 0' }} />

            <div className="flex items-center justify-between">
              <span style={{ fontSize: 17, fontWeight: 700, color: DS.black }}>Total Annual Gap</span>
              <span style={{ fontSize: 24, fontWeight: 700, color: DS.red }} data-testid="value-total-gap">{formatDollarFull(result.displayedTotal)}</span>
            </div>

            {inputs.entryEstimate && inputs.entryEstimate > 0 && (
              <div className="mt-4">
                <p style={{ fontSize: 13, color: DS.muted }}>
                  You estimated {formatDollarFull(inputs.entryEstimate)}. Our model shows {formatDollarFull(result.displayedTotal)}.
                  {result.displayedTotal > inputs.entryEstimate
                    ? " The gap is larger than expected."
                    : result.displayedTotal < inputs.entryEstimate
                      ? " The conservative model is tighter than your estimate."
                      : " Your intuition was accurate."}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-10">
            <button onClick={onBack} style={{ fontSize: 15, color: DS.body, textDecoration: 'underline', textUnderlineOffset: '2px', cursor: 'pointer', background: 'none', border: 'none', fontFamily: DS.font, fontWeight: 500 }} data-testid="button-back">
              Back
            </button>
            <button
              onClick={onNext}
              className="inline-flex items-center gap-2 transition-all duration-300"
              style={{
                fontFamily: DS.font, fontWeight: 600, fontSize: 15, padding: '15px 36px', borderRadius: DS.radius.input,
                backgroundColor: DS.red, color: DS.white, border: 'none', cursor: 'pointer',
                opacity: showCTA ? 1 : 0,
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
