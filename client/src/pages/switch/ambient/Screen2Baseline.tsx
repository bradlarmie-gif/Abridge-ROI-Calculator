import { useState, useMemo } from "react";
import { ArrowRight, Check } from "lucide-react";
import { DS } from "./designTokens";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import type { SwitchInputs } from "@/lib/switchGapCalculator";

interface Screen2Props {
  inputs: SwitchInputs;
  updateInput: <K extends keyof SwitchInputs>(key: K, value: SwitchInputs[K]) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function Screen2Baseline({ inputs, updateInput, onNext, onBack }: Screen2Props) {
  const [showEstimator, setShowEstimator] = useState(false);

  const hasBothInputs = inputs.providers > 0 && inputs.annualEncounters > 0;
  const hasFirstInput = inputs.providers > 0;

  const estimatedEncounters = useMemo(() => inputs.providers * 2000, [inputs.providers]);
  const encountersPerDay = useMemo(() => {
    if (!inputs.providers || !inputs.annualEncounters) return 0;
    return Math.round((inputs.annualEncounters / inputs.providers) / 220);
  }, [inputs.providers, inputs.annualEncounters]);
  const showGuardrail = inputs.providers > 0 && inputs.annualEncounters > 0 && (inputs.annualEncounters / inputs.providers) > 3500;

  return (
    <div className="flex flex-col lg:flex-row gap-12" style={{ fontFamily: DS.font }}>
      <div className="flex-1 max-w-[420px]" style={{ paddingTop: 80, paddingBottom: 80 }}>
        <p style={{ fontWeight: 600, fontSize: 11, color: DS.muted, letterSpacing: '2.5px', textTransform: 'uppercase' }} className="mb-2.5" data-testid="text-screen2-label">
          Your Organization
        </p>
        <h1 style={{ fontWeight: 700, fontSize: 'clamp(38px, 5vw, 52px)', color: DS.black, lineHeight: 1.15 }} className="mb-4" data-testid="text-screen2-headline">
          Let's establish your baseline.
        </h1>
        <p style={{ fontSize: 17, color: DS.body, lineHeight: 1.75 }} className="mb-14">
          Two inputs. Benchmarks handle the rest.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div>
            <p style={{ fontWeight: 600, fontSize: 11, color: DS.muted, letterSpacing: '2.5px', textTransform: 'uppercase' }} className="mb-2.5">Providers</p>
            <p style={{ fontSize: 17, color: DS.body, lineHeight: 1.75 }} className="mb-4">
              Physicians and APPs using ambient documentation
            </p>
            <FormattedNumberInput
              value={inputs.providers}
              onChange={(v) => updateInput("providers", v || 0)}
              placeholder="providers"
              style={{
                fontFamily: DS.font, fontWeight: 600, fontSize: 17, color: DS.black,
                backgroundColor: DS.white, border: `1.5px solid ${DS.border}`, borderRadius: 10,
                padding: '14px 18px', width: '100%', outline: 'none', transition: 'border-color 150ms ease',
              }}
              onFocus={(e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = DS.red; }}
              onBlur={(e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = DS.border; }}
              data-testid="input-providers"
            />
          </div>

          <div>
            <p style={{ fontWeight: 600, fontSize: 11, color: DS.muted, letterSpacing: '2.5px', textTransform: 'uppercase' }} className="mb-2.5">Encounters</p>
            <p style={{ fontSize: 17, color: DS.body, lineHeight: 1.75 }} className="mb-4">
              Annual encounters where ambient is available
            </p>
            <FormattedNumberInput
              value={inputs.annualEncounters}
              onChange={(v) => {
                updateInput("annualEncounters", v || 0);
                updateInput("encountersEstimated", false);
              }}
              placeholder="encounters / year"
              style={{
                fontFamily: DS.font, fontWeight: 600, fontSize: 17, color: DS.black,
                backgroundColor: DS.white, border: `1.5px solid ${DS.border}`, borderRadius: 10,
                padding: '14px 18px', width: '100%', outline: 'none', transition: 'border-color 150ms ease',
              }}
              onFocus={(e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = DS.red; }}
              onBlur={(e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = DS.border; }}
              data-testid="input-encounters"
            />
            <button
              type="button"
              onClick={() => setShowEstimator(!showEstimator)}
              className="mt-3"
              style={{ fontSize: 15, color: DS.body, textDecoration: 'underline', textUnderlineOffset: '2px', cursor: 'pointer', background: 'none', border: 'none', fontFamily: DS.font, fontWeight: 500 }}
              data-testid="button-help-estimate"
            >
              Help me estimate
            </button>
            {showEstimator && inputs.providers > 0 && (
              <div className="mt-3" style={{ backgroundColor: DS.bg, border: `1px solid ${DS.border}`, borderRadius: DS.radius.card, padding: 24 }}>
                <p style={{ fontSize: 17, color: DS.body, lineHeight: 1.75 }} className="mb-3">
                  <span style={{ fontWeight: 700, color: DS.black }}>{inputs.providers.toLocaleString()}</span> providers &times; 2,000 typical = <span style={{ fontWeight: 700, color: DS.black }}>{estimatedEncounters.toLocaleString()}</span>
                </p>
                <button
                  type="button"
                  onClick={() => { updateInput("annualEncounters", estimatedEncounters); updateInput("encountersEstimated", true); setShowEstimator(false); }}
                  style={{ fontFamily: DS.font, fontWeight: 600, fontSize: 14, padding: '10px 22px', borderRadius: DS.radius.pill, border: `1.5px solid ${DS.black}`, backgroundColor: DS.bg, color: DS.black, cursor: 'pointer' }}
                  data-testid="button-use-estimate"
                >
                  Use {estimatedEncounters.toLocaleString()}
                </button>
              </div>
            )}
            {showGuardrail && (
              <p className="mt-2" style={{ fontSize: 13, color: DS.muted, fontFamily: DS.font }} data-testid="text-guardrail">
                That's ~{encountersPerDay} per provider per day — want to double-check?
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between" style={{ marginTop: 56 }}>
          <button onClick={onBack} style={{ fontSize: 15, color: DS.body, textDecoration: 'underline', textUnderlineOffset: '2px', cursor: 'pointer', background: 'none', border: 'none', fontFamily: DS.font, fontWeight: 500 }} data-testid="button-back">
            Back
          </button>
          <button
            onClick={onNext}
            disabled={!hasBothInputs}
            className="inline-flex items-center gap-2"
            style={{
              fontFamily: DS.font, fontWeight: 600, fontSize: 15, padding: '15px 36px', borderRadius: DS.radius.input,
              backgroundColor: hasBothInputs ? DS.red : DS.border, color: hasBothInputs ? DS.white : DS.muted,
              border: 'none', cursor: hasBothInputs ? 'pointer' : 'not-allowed', transition: 'background 150ms ease',
            }}
            onMouseEnter={(e) => hasBothInputs && (e.currentTarget.style.backgroundColor = DS.redHover)}
            onMouseLeave={(e) => hasBothInputs && (e.currentTarget.style.backgroundColor = DS.red)}
            data-testid="button-next"
          >
            See My Utilization Reality
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {hasFirstInput && (
        <div className="hidden lg:block w-[300px] shrink-0" style={{ paddingTop: 80 }}>
          <div className="sticky top-24" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ backgroundColor: DS.bg, border: `1px solid ${DS.border}`, borderRadius: 14, padding: 28 }}>
              <p style={{ fontWeight: 600, fontSize: 11, color: DS.muted, letterSpacing: '2.5px', textTransform: 'uppercase' }} className="mb-4">
                What We'll Model
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {["Capacity creation", "Revenue integrity", "Workforce stability", "Risk & compliance"].map((item) => (
                  <div key={item} className="flex items-center gap-2.5">
                    <Check size={16} color={DS.black} />
                    <span style={{ fontSize: 15, color: DS.black, fontFamily: DS.font }}>{item}</span>
                  </div>
                ))}
              </div>
              <div style={{ height: 1, backgroundColor: DS.border, margin: '20px 0' }} />
              <p style={{ fontWeight: 600, fontSize: 11, color: DS.muted, letterSpacing: '2.5px', textTransform: 'uppercase' }} className="mb-3">
                Baseline
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 15 }}>
                <div className="flex justify-between gap-2"><span style={{ color: DS.muted }}>Providers</span><span style={{ color: DS.black, fontWeight: 700 }} data-testid="text-rail-providers">{inputs.providers > 0 ? inputs.providers.toLocaleString() : "\u2014"}</span></div>
                <div className="flex justify-between gap-2"><span style={{ color: DS.muted }}>Encounters</span><span style={{ color: DS.black, fontWeight: 700 }} data-testid="text-rail-encounters">{inputs.annualEncounters > 0 ? inputs.annualEncounters.toLocaleString() : "\u2014"}</span></div>
              </div>
            </div>
            <div style={{ backgroundColor: DS.black, borderRadius: DS.radius.card, padding: 32 }}>
              <p style={{ fontSize: 17, color: DS.white, lineHeight: 1.75, fontFamily: DS.font }}>
                Most organizations at your scale have never mapped what their documentation infrastructure is actually returning.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
