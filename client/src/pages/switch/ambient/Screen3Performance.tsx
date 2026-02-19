import { useState, useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { DS, labelStyle, bodyStyle, cardStyle, primaryButtonStyle, backLinkStyle } from "./designTokens";
import { useAssessment, assessmentActions } from "@/lib/assessment";

interface Screen3Props {
  onNext: () => void;
  onBack: () => void;
}

const ABRIDGE_UTIL = 76;
const ABRIDGE_TIME = 4.0;

function GapBadge({ value, suffix }: { value: number; suffix: string }) {
  if (value <= 0) return null;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        backgroundColor: 'rgba(234, 44, 0, 0.08)',
        borderRadius: 999,
        padding: '2px 8px',
        fontFamily: DS.font,
        fontWeight: 600,
        fontSize: 12,
        color: DS.red,
        marginLeft: 6,
        whiteSpace: 'nowrap',
      }}
      data-testid="badge-gap"
    >
      +{typeof value === 'number' && value % 1 !== 0 ? value.toFixed(1) : value}{suffix}
    </span>
  );
}

function BenchmarkPill({ value, label, isRed }: { value: string; label: string; isRed?: boolean }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 16px',
      borderRadius: DS.radius.pill,
      backgroundColor: isRed ? DS.white : DS.bg,
      border: `1px solid ${isRed ? DS.red : DS.border}`,
    }}>
      <span style={{ fontFamily: DS.font, fontWeight: 700, fontSize: 13, color: isRed ? DS.red : DS.muted }}>{value}</span>
      <span style={{ fontFamily: DS.font, fontSize: 12, color: isRed ? DS.red : DS.muted }}>{label}</span>
    </div>
  );
}

export default function Screen3Performance({ onNext, onBack }: Screen3Props) {
  const { state, dispatch } = useAssessment();
  const { inputs } = state;

  const [utilization, setUtilization] = useState(inputs.utilization || 50);
  const [timeSavings, setTimeSavings] = useState(inputs.timeSavedPerEncounter || 2.0);
  const [utilMoved, setUtilMoved] = useState(false);
  const [timeMoved, setTimeMoved] = useState(false);
  const [unmeasuredChecked, setUnmeasuredChecked] = useState(false);

  const bothMoved = utilMoved && timeMoved;

  const theirEncounters = Math.round(inputs.annualEncounters * (utilization / 100));
  const abridgeEncounters = Math.round(inputs.annualEncounters * (ABRIDGE_UTIL / 100));
  const encounterGap = Math.max(0, abridgeEncounters - theirEncounters);

  const theirHours = Math.round((theirEncounters * timeSavings) / 60);
  const abridgeHours = Math.round((abridgeEncounters * ABRIDGE_TIME) / 60);
  const hourGap = Math.max(0, abridgeHours - theirHours);

  const utilInsight = useMemo(() => {
    if (!utilMoved) return null;
    if (utilization < 45) return `Below industry average — significant headroom to benchmark.`;
    if (utilization <= 60) return `Near industry average — ${encounterGap.toLocaleString()} encounter gap to Abridge benchmark.`;
    if (utilization <= 75) return `Above average — ${encounterGap.toLocaleString()} encounter gap to close.`;
    return "At or above Abridge benchmark — strong utilization.";
  }, [utilMoved, utilization, encounterGap]);

  const timeInsight = useMemo(() => {
    if (!timeMoved) return null;
    const hoursGapCalc = Math.round((theirEncounters * Math.max(0, ABRIDGE_TIME - timeSavings)) / 60);
    if (timeSavings < 2.0) return `Below typical range — ${hoursGapCalc.toLocaleString()} hour gap to Abridge benchmark.`;
    if (timeSavings <= 3.0) {
      const gap = (ABRIDGE_TIME - timeSavings).toFixed(1);
      return `Within typical range — ${gap} min gap represents ${hoursGapCalc.toLocaleString()} hours.`;
    }
    if (timeSavings < 4.0) {
      const gap = (ABRIDGE_TIME - timeSavings).toFixed(1);
      return `Above average — ${gap} min to Abridge benchmark.`;
    }
    return "At or above Abridge benchmark.";
  }, [timeMoved, timeSavings, theirEncounters]);

  const handleUtilChange = (val: number) => {
    setUtilization(val);
    if (!utilMoved) setUtilMoved(true);
  };

  const handleTimeChange = (val: number) => {
    setTimeSavings(val);
    if (!timeMoved) setTimeMoved(true);
    if (unmeasuredChecked) setUnmeasuredChecked(false);
  };

  const handleUnmeasuredToggle = () => {
    const next = !unmeasuredChecked;
    setUnmeasuredChecked(next);
    if (next) {
      setTimeSavings(2.0);
      if (!timeMoved) setTimeMoved(true);
    }
  };

  const handleNext = () => {
    dispatch(assessmentActions.updateInput('utilization', utilization));
    dispatch(assessmentActions.updateInput('timeSavedPerEncounter', timeSavings));
    onNext();
  };

  return (
    <div style={{ fontFamily: DS.font, paddingTop: 72, paddingBottom: 80 }}>
      <div className="max-w-[640px] mx-auto mb-10">
        <p style={labelStyle} className="mb-3" data-testid="text-screen3-label">
          Current Performance
        </p>
        <h1 style={{ fontWeight: 700, fontSize: 44, color: DS.black, lineHeight: 1.15, fontFamily: DS.font }} className="mb-4 hidden md:block" data-testid="text-screen3-headline">
          How is your ambient tool performing today?
        </h1>
        <h1 style={{ fontWeight: 700, fontSize: 32, color: DS.black, lineHeight: 1.15, fontFamily: DS.font }} className="mb-4 block md:hidden">
          How is your ambient tool performing today?
        </h1>
        <p style={bodyStyle}>
          Two inputs. These determine your documentation intelligence score.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row" style={{ gap: 32 }}>
        <div className="flex-1 max-w-[640px]">
          <div className="mb-10">
            <p style={labelStyle} className="mb-2">
              Utilization Rate
            </p>
            <p style={{ fontSize: 15, color: DS.body, fontFamily: DS.font }} className="mb-6">
              What % of eligible encounters are being documented?
            </p>

            <div className="text-center mb-4">
              <span style={{ fontFamily: DS.font, fontWeight: 700, fontSize: 56, color: DS.black, lineHeight: 1 }} data-testid="value-utilization">
                {utilization}%
              </span>
            </div>

            <input
              type="range"
              min={10}
              max={95}
              step={5}
              value={utilization}
              onChange={(e) => handleUtilChange(parseInt(e.target.value))}
              className="w-full accent-[#0F0F0F]"
              style={{ height: 4 }}
              data-testid="slider-utilization"
            />

            <div className="flex items-center justify-center mt-4" style={{ gap: 12 }}>
              <BenchmarkPill value="45%" label="Industry avg" />
              <BenchmarkPill value="76%" label="Abridge avg" isRed />
            </div>

            {utilInsight && (
              <p className="mt-5" style={{ fontSize: 13, color: DS.body, fontStyle: 'italic', fontFamily: DS.font, lineHeight: 1.6 }} data-testid="text-util-insight">
                {utilInsight}
              </p>
            )}
          </div>

          <div
            className="mb-10"
            style={{
              opacity: utilMoved ? 1 : 0,
              transform: utilMoved ? 'translateY(0)' : 'translateY(8px)',
              transition: 'opacity 300ms ease-out, transform 300ms ease-out',
              pointerEvents: utilMoved ? 'auto' : 'none',
            }}
          >
            <p style={labelStyle} className="mb-2">
              Time Returned / Encounter
            </p>
            <p style={{ fontSize: 15, color: DS.body, fontFamily: DS.font }} className="mb-6">
              Minutes saved per documented encounter
            </p>

            <div className="text-center mb-4">
              <span style={{ fontFamily: DS.font, fontWeight: 700, fontSize: 56, color: DS.black, lineHeight: 1 }} data-testid="value-time-savings">
                {timeSavings.toFixed(1)} min
              </span>
            </div>

            <input
              type="range"
              min={0.5}
              max={6.0}
              step={0.25}
              value={timeSavings}
              onChange={(e) => handleTimeChange(parseFloat(e.target.value))}
              className="w-full accent-[#0F0F0F]"
              style={{ height: 4 }}
              data-testid="slider-time-savings"
            />

            <div className="flex items-center justify-center mt-4" style={{ gap: 12 }}>
              <BenchmarkPill value="1.5–2.5 min" label="Most tools" />
              <BenchmarkPill value="4.0 min" label="Abridge avg" isRed />
            </div>

            <label className="flex items-center gap-2.5 mt-4 cursor-pointer" data-testid="checkbox-unmeasured">
              <input
                type="checkbox"
                checked={unmeasuredChecked}
                onChange={handleUnmeasuredToggle}
                className="accent-[#0F0F0F]"
                style={{ width: 16, height: 16 }}
              />
              <span style={{ fontSize: 13, color: DS.body, fontFamily: DS.font }}>
                I haven't measured this precisely
              </span>
            </label>
            {unmeasuredChecked && (
              <p className="mt-2" style={{ fontSize: 13, color: DS.muted, fontFamily: DS.font }}>
                Using industry benchmark: 2.0 min
              </p>
            )}

            {timeInsight && (
              <p className="mt-5" style={{ fontSize: 13, color: DS.body, fontStyle: 'italic', fontFamily: DS.font, lineHeight: 1.6 }} data-testid="text-time-insight">
                {timeInsight}
              </p>
            )}
          </div>
        </div>

        {bothMoved && (
          <div className="hidden lg:block w-[320px] shrink-0">
            <div className="sticky top-24" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={cardStyle} data-testid="card-live-summary">
                <p style={labelStyle} className="mb-5">
                  At Your Current Performance
                </p>

                <div className="flex items-center justify-between mb-3">
                  <span style={{ fontSize: 13, color: DS.muted, fontFamily: DS.font }}>Encounters documented annually</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: DS.black, fontFamily: DS.font }} data-testid="value-their-encounters">
                    {theirEncounters.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span style={{ fontSize: 13, color: DS.muted, fontFamily: DS.font }}>Hours returned annually</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: DS.black, fontFamily: DS.font }} data-testid="value-their-hours">
                    {theirHours.toLocaleString()}
                  </span>
                </div>

                <div style={{ height: 1, backgroundColor: DS.border, marginBottom: 16 }} />

                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 13, color: DS.muted, fontFamily: DS.font }}>Gap to Abridge benchmark</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: DS.red, fontFamily: DS.font }} data-testid="value-hour-gap">
                    +{hourGap.toLocaleString()} hrs / yr
                  </span>
                </div>

                <p className="mt-4" style={{ fontSize: 12, color: DS.muted, fontStyle: 'italic', fontFamily: DS.font }}>
                  Gap vs Abridge avg: 76% utilization, 4.0 min/encounter
                </p>
              </div>

              <div style={cardStyle} data-testid="card-comparison">
                <p style={labelStyle} className="mb-5 text-center">
                  How Your Tool Compares
                </p>

                <div className="grid grid-cols-2" style={{ gap: 0 }}>
                  <div style={{ paddingRight: 16 }}>
                    <p style={{ ...labelStyle, fontSize: 10, marginBottom: 16 }}>Your Current Tool</p>

                    <p style={{ fontFamily: DS.font, fontWeight: 700, fontSize: 24, color: DS.black, lineHeight: 1 }} className="mb-1">
                      {utilization}%
                    </p>
                    <p style={{ fontSize: 11, color: DS.muted, fontFamily: DS.font }} className="mb-3">utilization rate</p>
                    <div style={{ height: 1, backgroundColor: DS.border, marginBottom: 12 }} />

                    <p style={{ fontFamily: DS.font, fontWeight: 700, fontSize: 24, color: DS.black, lineHeight: 1 }} className="mb-1">
                      {timeSavings.toFixed(1)} min
                    </p>
                    <p style={{ fontSize: 11, color: DS.muted, fontFamily: DS.font }} className="mb-3">per encounter</p>
                    <div style={{ height: 1, backgroundColor: DS.border, marginBottom: 12 }} />

                    <p style={{ fontFamily: DS.font, fontWeight: 700, fontSize: 20, color: DS.black, lineHeight: 1 }} className="mb-1">
                      {theirHours.toLocaleString()} hrs
                    </p>
                    <p style={{ fontSize: 11, color: DS.muted, fontFamily: DS.font }}>returned annually</p>
                  </div>

                  <div style={{ paddingLeft: 16, borderLeft: `4px solid ${DS.red}` }}>
                    <p style={{ ...labelStyle, fontSize: 10, color: DS.red, marginBottom: 16 }}>Abridge Average</p>

                    <div className="flex items-center flex-wrap gap-1">
                      <p style={{ fontFamily: DS.font, fontWeight: 700, fontSize: 24, color: DS.black, lineHeight: 1 }}>76%</p>
                      <GapBadge value={ABRIDGE_UTIL - utilization} suffix="pp" />
                    </div>
                    <p style={{ fontSize: 11, color: DS.muted, fontFamily: DS.font }} className="mb-3 mt-1">utilization rate</p>
                    <div style={{ height: 1, backgroundColor: DS.border, marginBottom: 12 }} />

                    <div className="flex items-center flex-wrap gap-1">
                      <p style={{ fontFamily: DS.font, fontWeight: 700, fontSize: 24, color: DS.black, lineHeight: 1 }}>4.0 min</p>
                      <GapBadge value={Math.round((ABRIDGE_TIME - timeSavings) * 10) / 10} suffix=" min" />
                    </div>
                    <p style={{ fontSize: 11, color: DS.muted, fontFamily: DS.font }} className="mb-3 mt-1">per encounter</p>
                    <div style={{ height: 1, backgroundColor: DS.border, marginBottom: 12 }} />

                    <div className="flex items-center flex-wrap gap-1">
                      <p style={{ fontFamily: DS.font, fontWeight: 700, fontSize: 20, color: DS.black, lineHeight: 1 }}>
                        {abridgeHours.toLocaleString()} hrs
                      </p>
                      <GapBadge value={hourGap} suffix=" hrs" />
                    </div>
                    <p style={{ fontSize: 11, color: DS.muted, fontFamily: DS.font }} className="mt-1">returned annually</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {bothMoved && (
          <div className="block lg:hidden" style={{ marginTop: 16 }}>
            <div style={cardStyle} data-testid="card-live-summary-mobile">
              <p style={labelStyle} className="mb-5">At Your Current Performance</p>
              <div className="flex items-center justify-between mb-3">
                <span style={{ fontSize: 13, color: DS.muted, fontFamily: DS.font }}>Encounters documented</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: DS.black, fontFamily: DS.font }}>{theirEncounters.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between mb-3">
                <span style={{ fontSize: 13, color: DS.muted, fontFamily: DS.font }}>Hours returned</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: DS.black, fontFamily: DS.font }}>{theirHours.toLocaleString()}</span>
              </div>
              <div style={{ height: 1, backgroundColor: DS.border, marginBottom: 12 }} />
              <div className="flex items-center justify-between">
                <span style={{ fontSize: 13, color: DS.muted, fontFamily: DS.font }}>Gap to benchmark</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: DS.red, fontFamily: DS.font }}>+{hourGap.toLocaleString()} hrs / yr</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="max-w-[640px] mx-auto flex items-center justify-between" style={{ marginTop: 32 }}>
        <button onClick={onBack} style={backLinkStyle} data-testid="button-back">
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={!bothMoved}
          className="inline-flex items-center gap-2"
          style={primaryButtonStyle(bothMoved)}
          onMouseEnter={(e) => bothMoved && (e.currentTarget.style.backgroundColor = DS.redHover)}
          onMouseLeave={(e) => bothMoved && (e.currentTarget.style.backgroundColor = DS.red)}
          data-testid="button-next"
        >
          See the Four Domains
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
