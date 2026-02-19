import { useState, useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { DS } from "./designTokens";
import { useAssessment, assessmentActions } from "@/lib/assessment";

interface Screen3Props {
  onNext: () => void;
  onBack: () => void;
}

const ABRIDGE_UTIL = 76;
const ABRIDGE_TIME = 4.0;
const INDUSTRY_AVG_UTIL = 45;

function GapBadge({ value, suffix }: { value: number; suffix: string }) {
  if (value <= 0) return null;
  return (
    <span
      style={{
        display: 'inline-block',
        backgroundColor: 'rgba(234, 44, 0, 0.08)',
        borderRadius: 999,
        padding: '3px 8px',
        fontFamily: DS.font,
        fontWeight: 600,
        fontSize: 12,
        color: DS.red,
        marginLeft: 8,
        whiteSpace: 'nowrap',
      }}
      data-testid="badge-gap"
    >
      +{typeof value === 'number' && value % 1 !== 0 ? value.toFixed(1) : value}{suffix}
    </span>
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
    if (utilization < 45) {
      return "Below industry average. Most ambient tools see significant utilization gains with focused adoption programs.";
    }
    if (utilization <= 60) {
      return "At or near industry average. There is meaningful headroom to the Abridge benchmark of 76%.";
    }
    if (utilization <= 75) {
      const additionalEncounters = encounterGap.toLocaleString();
      return `Above industry average. The gap to Abridge\u2019s 76% benchmark represents ${additionalEncounters} additional encounters annually.`;
    }
    return "Strong utilization. Your adoption profile is at or near top-quartile performance.";
  }, [utilMoved, utilization, encounterGap]);

  const timeInsight = useMemo(() => {
    if (!timeMoved) return null;
    const hoursGapCalc = Math.round((theirEncounters * Math.max(0, ABRIDGE_TIME - timeSavings)) / 60);
    if (timeSavings < 2.0) {
      return `Below the typical ambient AI range. At this efficiency level, the gap to Abridge\u2019s 4.0 min average represents ${hoursGapCalc.toLocaleString()} hours annually.`;
    }
    if (timeSavings <= 3.0) {
      const gap = (ABRIDGE_TIME - timeSavings).toFixed(1);
      return `Within the typical ambient AI range. The ${gap} minute gap to Abridge\u2019s average represents ${hoursGapCalc.toLocaleString()} hours across your encounter volume.`;
    }
    if (timeSavings < 4.0) {
      const gap = (ABRIDGE_TIME - timeSavings).toFixed(1);
      const addHours = hoursGapCalc.toLocaleString();
      return `Above average efficiency. A ${gap} minute improvement to Abridge\u2019s benchmark would return ${addHours} additional hours annually.`;
    }
    return "At or above Abridge\u2019s average. Your efficiency profile is strong.";
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
    <div style={{ fontFamily: DS.font, paddingTop: 80, paddingBottom: 80 }}>
      <div className="max-w-[600px] mx-auto">
        <p style={{ fontWeight: 600, fontSize: 11, color: DS.muted, letterSpacing: '2.5px', textTransform: 'uppercase' }} className="mb-2.5" data-testid="text-screen3-label">
          Current Performance
        </p>
        <h1 style={{ fontWeight: 700, fontSize: 'clamp(32px, 4vw, 48px)', color: DS.black, lineHeight: 1.15, fontFamily: DS.font }} className="mb-4" data-testid="text-screen3-headline">
          How is your ambient tool performing today?
        </h1>
        <p style={{ fontSize: 17, color: DS.body, lineHeight: 1.75, fontFamily: DS.font }} className="mb-14">
          Two inputs. These determine your documentation intelligence score.
        </p>

        <div className="mb-12">
          <p style={{ fontWeight: 600, fontSize: 11, color: DS.muted, letterSpacing: '2.5px', textTransform: 'uppercase', fontFamily: DS.font }} className="mb-2.5">
            Utilization Rate
          </p>
          <p style={{ fontSize: 15, color: DS.body, fontFamily: DS.font }} className="mb-6">
            What percentage of eligible encounters are being documented with ambient AI today?
          </p>

          <div className="text-center mb-4">
            <span style={{ fontFamily: DS.font, fontWeight: 700, fontSize: 64, color: DS.black, lineHeight: 1 }} data-testid="value-utilization">
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
            className="w-full accent-[#EA2C00]"
            style={{ height: 6 }}
            data-testid="slider-utilization"
          />

          <div className="flex items-center justify-center mt-4" style={{ gap: 32 }}>
            <div className="text-center">
              <p style={{ fontSize: 13, fontWeight: 700, color: DS.black, fontFamily: DS.font }}>45%</p>
              <p style={{ fontSize: 11, color: DS.muted, fontFamily: DS.font }}>Industry average</p>
            </div>
            <div style={{ width: 1, height: 28, backgroundColor: DS.border }} />
            <div className="text-center">
              <p style={{ fontSize: 13, fontWeight: 700, color: DS.red, fontFamily: DS.font }}>76%</p>
              <p style={{ fontSize: 11, color: DS.muted, fontFamily: DS.font }}>Abridge average</p>
            </div>
          </div>

          {utilInsight && (
            <p
              className="mt-5"
              style={{
                fontSize: 15, color: DS.body, fontStyle: 'italic', fontFamily: DS.font, lineHeight: 1.6,
                animation: 'fadeInUp 300ms ease-out forwards',
              }}
              data-testid="text-util-insight"
            >
              {utilInsight}
            </p>
          )}
        </div>

        <div
          className="mb-12"
          style={{
            opacity: utilMoved ? 1 : 0,
            transform: utilMoved ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 300ms ease-out, transform 300ms ease-out',
            pointerEvents: utilMoved ? 'auto' : 'none',
          }}
        >
          <p style={{ fontWeight: 600, fontSize: 11, color: DS.muted, letterSpacing: '2.5px', textTransform: 'uppercase', fontFamily: DS.font }} className="mb-2.5">
            Time Returned Per Encounter
          </p>
          <p style={{ fontSize: 15, color: DS.body, fontFamily: DS.font }} className="mb-6">
            How many minutes does your ambient tool save per documented encounter?
          </p>

          <div className="text-center mb-4">
            <span style={{ fontFamily: DS.font, fontWeight: 700, fontSize: 64, color: DS.black, lineHeight: 1 }} data-testid="value-time-savings">
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
            className="w-full accent-[#EA2C00]"
            style={{ height: 6 }}
            data-testid="slider-time-savings"
          />

          <div className="flex items-center justify-center mt-4" style={{ gap: 32 }}>
            <div className="text-center">
              <p style={{ fontSize: 13, fontWeight: 700, color: DS.black, fontFamily: DS.font }}>1.5–2.5 min</p>
              <p style={{ fontSize: 11, color: DS.muted, fontFamily: DS.font }}>Most ambient tools</p>
            </div>
            <div style={{ width: 1, height: 28, backgroundColor: DS.border }} />
            <div className="text-center">
              <p style={{ fontSize: 13, fontWeight: 700, color: DS.red, fontFamily: DS.font }}>4.0 min</p>
              <p style={{ fontSize: 11, color: DS.muted, fontFamily: DS.font }}>Abridge average</p>
            </div>
          </div>

          <label className="flex items-center gap-2.5 mt-4 cursor-pointer" data-testid="checkbox-unmeasured">
            <input
              type="checkbox"
              checked={unmeasuredChecked}
              onChange={handleUnmeasuredToggle}
              className="accent-[#EA2C00]"
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
            <p
              className="mt-5"
              style={{
                fontSize: 15, color: DS.body, fontStyle: 'italic', fontFamily: DS.font, lineHeight: 1.6,
                animation: 'fadeInUp 300ms ease-out forwards',
              }}
              data-testid="text-time-insight"
            >
              {timeInsight}
            </p>
          )}
        </div>

        {bothMoved && (
          <div style={{ animation: 'fadeInUp 300ms ease-out forwards' }}>
            <style>{`
              @keyframes fadeInUp {
                from { opacity: 0; transform: translateY(8px); }
                to { opacity: 1; transform: translateY(0); }
              }
            `}</style>

            <div
              style={{
                backgroundColor: DS.bg, border: `1px solid ${DS.border}`, borderRadius: DS.radius.card, padding: 28,
              }}
              className="mb-10"
              data-testid="card-live-summary"
            >
              <p style={{ fontWeight: 600, fontSize: 11, color: DS.muted, letterSpacing: '2.5px', textTransform: 'uppercase', fontFamily: DS.font }} className="mb-5">
                At Your Current Performance
              </p>

              <div className="flex items-center justify-between mb-3">
                <span style={{ fontSize: 13, color: DS.muted, fontFamily: DS.font }}>Encounters documented annually</span>
                <span style={{ fontSize: 17, fontWeight: 700, color: DS.black, fontFamily: DS.font }} data-testid="value-their-encounters">
                  {theirEncounters.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between mb-4">
                <span style={{ fontSize: 13, color: DS.muted, fontFamily: DS.font }}>Hours returned to physicians annually</span>
                <span style={{ fontSize: 17, fontWeight: 700, color: DS.black, fontFamily: DS.font }} data-testid="value-their-hours">
                  {theirHours.toLocaleString()}
                </span>
              </div>

              <div style={{ height: 1, backgroundColor: DS.border, marginBottom: 16 }} />

              <div className="flex items-center justify-between">
                <span style={{ fontSize: 13, color: DS.muted, fontFamily: DS.font }}>Gap to Abridge benchmark</span>
                <span style={{ fontSize: 17, fontWeight: 700, color: DS.red, fontFamily: DS.font }} data-testid="value-hour-gap">
                  +{hourGap.toLocaleString()} hours / year not yet captured
                </span>
              </div>

              <p className="mt-4" style={{ fontSize: 12, color: DS.muted, fontStyle: 'italic', fontFamily: DS.font }}>
                Gap calculated against Abridge average: 76% utilization, 4.0 min per encounter
              </p>
            </div>

            <p style={{ fontWeight: 600, fontSize: 11, color: DS.muted, letterSpacing: '2.5px', textTransform: 'uppercase', fontFamily: DS.font, textAlign: 'center' }} className="mb-6">
              How Your Tool Compares
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
              <div
                style={{
                  backgroundColor: DS.bg, border: `1px solid ${DS.border}`, borderRadius: DS.radius.card, padding: 24,
                }}
                data-testid="card-your-tool"
              >
                <p style={{ fontWeight: 600, fontSize: 11, color: DS.muted, letterSpacing: '2.5px', textTransform: 'uppercase', fontFamily: DS.font }} className="mb-5">
                  Your Current Tool
                </p>

                <p style={{ fontFamily: DS.font, fontWeight: 700, fontSize: 32, color: DS.black, lineHeight: 1 }} className="mb-1">
                  {utilization}%
                </p>
                <p style={{ fontSize: 12, color: DS.muted, fontFamily: DS.font }} className="mb-4">utilization rate</p>
                <div style={{ height: 1, backgroundColor: DS.border, marginBottom: 16 }} />

                <p style={{ fontFamily: DS.font, fontWeight: 700, fontSize: 32, color: DS.black, lineHeight: 1 }} className="mb-1">
                  {timeSavings.toFixed(1)} min
                </p>
                <p style={{ fontSize: 12, color: DS.muted, fontFamily: DS.font }} className="mb-4">per encounter</p>
                <div style={{ height: 1, backgroundColor: DS.border, marginBottom: 16 }} />

                <p style={{ fontFamily: DS.font, fontWeight: 700, fontSize: 24, color: DS.black, lineHeight: 1 }} className="mb-1">
                  {theirHours.toLocaleString()} hrs
                </p>
                <p style={{ fontSize: 12, color: DS.muted, fontFamily: DS.font }}>returned annually</p>
              </div>

              <div
                style={{
                  backgroundColor: DS.white, border: `1px solid ${DS.border}`, borderLeft: `4px solid ${DS.red}`,
                  borderRadius: DS.radius.card, padding: '24px 24px 24px 20px',
                }}
                data-testid="card-abridge"
              >
                <p style={{ fontWeight: 600, fontSize: 11, color: DS.red, letterSpacing: '2.5px', textTransform: 'uppercase', fontFamily: DS.font }} className="mb-5">
                  Abridge Average
                </p>

                <div className="flex items-center flex-wrap gap-1">
                  <p style={{ fontFamily: DS.font, fontWeight: 700, fontSize: 32, color: DS.black, lineHeight: 1 }}>
                    76%
                  </p>
                  <GapBadge value={ABRIDGE_UTIL - utilization} suffix="pp" />
                </div>
                <p style={{ fontSize: 12, color: DS.muted, fontFamily: DS.font }} className="mb-4 mt-1">utilization rate</p>
                <div style={{ height: 1, backgroundColor: DS.border, marginBottom: 16 }} />

                <div className="flex items-center flex-wrap gap-1">
                  <p style={{ fontFamily: DS.font, fontWeight: 700, fontSize: 32, color: DS.black, lineHeight: 1 }}>
                    4.0 min
                  </p>
                  <GapBadge value={Math.round((ABRIDGE_TIME - timeSavings) * 10) / 10} suffix=" min" />
                </div>
                <p style={{ fontSize: 12, color: DS.muted, fontFamily: DS.font }} className="mb-4 mt-1">per encounter</p>
                <div style={{ height: 1, backgroundColor: DS.border, marginBottom: 16 }} />

                <div className="flex items-center flex-wrap gap-1">
                  <p style={{ fontFamily: DS.font, fontWeight: 700, fontSize: 24, color: DS.black, lineHeight: 1 }}>
                    {abridgeHours.toLocaleString()} hrs
                  </p>
                  <GapBadge value={hourGap} suffix=" hrs" />
                </div>
                <p style={{ fontSize: 12, color: DS.muted, fontFamily: DS.font }} className="mt-1">returned annually</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between" style={{ marginTop: bothMoved ? 32 : 56 }}>
          <button onClick={onBack} style={{ fontSize: 15, color: DS.body, textDecoration: 'underline', textUnderlineOffset: '2px', cursor: 'pointer', background: 'none', border: 'none', fontFamily: DS.font, fontWeight: 500 }} data-testid="button-back">
            Back
          </button>
          <button
            onClick={handleNext}
            disabled={!bothMoved}
            className="inline-flex items-center gap-2"
            style={{
              fontFamily: DS.font, fontWeight: 600, fontSize: 15, padding: '15px 36px', borderRadius: DS.radius.input,
              backgroundColor: bothMoved ? DS.red : DS.border,
              color: bothMoved ? DS.white : DS.muted,
              border: 'none', cursor: bothMoved ? 'pointer' : 'not-allowed',
              transition: 'background 150ms ease',
            }}
            onMouseEnter={(e) => bothMoved && (e.currentTarget.style.backgroundColor = DS.redHover)}
            onMouseLeave={(e) => bothMoved && (e.currentTarget.style.backgroundColor = DS.red)}
            data-testid="button-next"
          >
            See the Four Domains
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
