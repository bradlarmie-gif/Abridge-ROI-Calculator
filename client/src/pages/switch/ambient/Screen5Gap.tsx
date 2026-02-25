import { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { useAssessment } from "@/lib/assessment";
import { formatDollar, formatDollarFull } from "./ambientCalculator";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Legend, Tooltip,
} from "recharts";
import {
  type Domain,
  DOMAIN_ORDER, DOMAIN_LABELS,
} from "./domainCalculations";
import StepFooter, { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";

interface Screen5Props {
  onNext: () => void;
  onBack: () => void;
}

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

  const domainGaps: Record<Domain, number> = useMemo(() => ({
    capacity: inputs.capacityGap || 0,
    revenue: inputs.revenueGap || 0,
    workforce: inputs.workforceGap || 0,
    risk: inputs.riskGap || 0,
  }), [inputs.capacityGap, inputs.revenueGap, inputs.workforceGap, inputs.riskGap]);

  const domainHasValue: Record<Domain, boolean> = useMemo(() => ({
    capacity: inputs.capacityHasValue || false,
    revenue: inputs.revenueHasValue || false,
    workforce: inputs.workforceHasValue || false,
    risk: inputs.riskHasValue || false,
  }), [inputs.capacityHasValue, inputs.revenueHasValue, inputs.workforceHasValue, inputs.riskHasValue]);

  const totalAnnualGap = useMemo(() => {
    let sum = 0;
    for (const d of DOMAIN_ORDER) {
      if (domainHasValue[d]) sum += domainGaps[d];
    }
    return sum;
  }, [domainGaps, domainHasValue]);

  const hasMeasuredDomains = DOMAIN_ORDER.some(d => domainHasValue[d]);

  const displayedTotal = totalAnnualGap;
  const displayedMonthly = Math.round(displayedTotal / 12);
  const displayedWeekly = Math.round(displayedTotal / 52);
  const displayedDaily = Math.round(displayedTotal / 365);

  const dt = displayedTotal;
  const chartData = useMemo(() => [
    { label: 'Today', actNow: 0, currentState: 0 },
    { label: '6mo', actNow: Math.round(dt * 0.42), currentState: Math.round(dt * 0.02) },
    { label: '12mo', actNow: Math.round(dt * 0.95), currentState: Math.round(dt * 0.04) },
    { label: '18mo', actNow: Math.round(dt * 1.52), currentState: Math.round(dt * 0.06) },
    { label: '24mo', actNow: Math.round(dt * 2.18), currentState: Math.round(dt * 0.08) },
    { label: '36mo', actNow: Math.round(dt * 3.45), currentState: Math.round(dt * 0.11) },
  ], [dt]);

  const permanentlyLost6mo = Math.round(dt * 0.42);
  const permanentlyLost12mo = Math.round(dt * 0.95);

  return (
    <div className={STEP_FOOTER_SPACER_CLASS}>

      <div className="flex flex-col items-center justify-center text-center mb-12">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0, duration: 0.5 }}>
          <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3" data-testid="text-gap-label">
            {hasMeasuredDomains ? 'Measured Enterprise Value' : 'Enterprise Value Assessment'}
          </p>
          <p className="text-base text-[#888888] italic max-w-[400px] mx-auto mb-10" data-testid="text-gap-pre-statement">
            {hasMeasuredDomains
              ? 'Based on the domains you\'ve measured. Additional value may exist in unmeasured domains.'
              : 'No domains have measured values yet. Complete domain inputs to see your enterprise value.'
            }
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
          {hasMeasuredDomains ? (
            <>
              <p className="text-[#EA2C00] font-bold leading-none text-[clamp(64px,8vw,96px)] mb-2" data-testid="value-hero-gap">
                <CountUpNumber target={displayedTotal} />
              </p>
              <p className="text-xl text-[#888888] mb-6">annually</p>
            </>
          ) : (
            <>
              <p className="text-[clamp(48px,6vw,72px)] font-bold text-[#888888]/30 leading-none mb-2" data-testid="value-hero-gap">
                Not yet measured
              </p>
              <p className="text-lg text-[#888888] mb-6">Complete domain inputs to calculate</p>
            </>
          )}
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
                    <span className={`font-bold text-base ${domainHasValue[domain] ? 'text-black' : 'text-[#888888]'}`} data-testid={`domain-gap-${domain}`}>
                      {domainHasValue[domain] ? formatDollar(domainGaps[domain]) : 'Not yet measured'}
                    </span>
                  </div>
                  {idx < DOMAIN_ORDER.length - 1 && <div className="h-px bg-[#E5E7EB]/50" />}
                </div>
              ))}
              <div className="h-px bg-[#E5E7EB] mt-1" />
              <div className="bg-white/60 rounded-lg px-4 py-3.5 mt-3 flex items-center justify-between">
                <span className="font-semibold text-sm text-black">Total Measured Value</span>
                <span className="font-bold text-xl text-[#EA2C00]" data-testid="value-total-gap">
                  {hasMeasuredDomains ? formatDollar(displayedTotal) : 'Not yet measured'}
                </span>
              </div>
              <p className="text-xs text-[#888888] italic mt-2">
                Total includes only domains with measured values.
              </p>
            </div>
          </motion.div>

          {hasMeasuredDomains && (
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
          )}

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

            {hasMeasuredDomains ? (
              <>
                <p className="font-bold text-3xl text-[#EA2C00] leading-none mb-1" data-testid="panel-hero-value">
                  {formatDollar(displayedTotal)}
                </p>
                <p className="text-xs text-white/40 mb-5">measured annually</p>
              </>
            ) : (
              <>
                <p className="font-bold text-xl text-white/30 leading-none mb-1" data-testid="panel-hero-value">
                  Not yet measured
                </p>
                <p className="text-xs text-white/40 mb-5">complete domain inputs to see value</p>
              </>
            )}

            {hasMeasuredDomains && (
              <>
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
              </>
            )}

            <div className="h-px bg-white/10 my-5" />

            <p className="text-[10px] font-medium text-white/50 uppercase tracking-[1.5px] mb-3">
              Domain Values
            </p>
            <div className="space-y-2">
              {DOMAIN_ORDER.map((domain) => (
                <div key={domain} className="flex items-center justify-between text-sm">
                  <span className="text-white/70">{DOMAIN_LABELS[domain]}</span>
                  <span className={domainHasValue[domain] ? "text-white font-semibold" : "text-white/30 text-xs"}>
                    {domainHasValue[domain] ? formatDollar(domainGaps[domain]) : 'Not measured'}
                  </span>
                </div>
              ))}
            </div>

            <div className="h-px bg-white/10 my-5" />

            <p className="text-xs text-white/60 leading-relaxed italic">
              {hasMeasuredDomains
                ? 'Based on your measured inputs. Unmeasured domains may represent additional value.'
                : 'Complete domain inputs to see your enterprise value measurement.'
              }
            </p>

          </div>
        </motion.div>
      </div>
    </div>
  );
}
