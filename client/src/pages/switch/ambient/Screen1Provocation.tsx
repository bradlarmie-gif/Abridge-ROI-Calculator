import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { DS, labelStyle, bodyStyle, primaryButtonStyle } from "./designTokens";
import { useAssessment, assessmentActions } from "@/lib/assessment";
import type { DataMode } from "@/lib/switchGapCalculator";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import abridgeLogo from '@assets/abridge-logo-wordmark-red_1769020684647.png';

interface Screen1Props {
  onNext: () => void;
}

type PillChoice = "knows" | "estimates" | "never" | null;

const PILLS: { id: PillChoice; label: string; dataMode: DataMode }[] = [
  { id: "knows", label: "I know the number", dataMode: "measured" },
  { id: "estimates", label: "I have a rough sense", dataMode: "estimated" },
  { id: "never", label: "I\u2019ve never calculated it", dataMode: "benchmark" },
];

const RESPONSES: Record<string, string> = {
  knows: "Good. Let\u2019s validate it.",
  estimates: "Let\u2019s sharpen it.",
  never: "Most haven\u2019t. That\u2019s exactly why this exists.",
};

export default function Screen1Provocation({ onNext }: Screen1Props) {
  const { dispatch } = useAssessment();
  const [selected, setSelected] = useState<PillChoice>(null);
  const [showResponse, setShowResponse] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [showCTA, setShowCTA] = useState(false);
  const [entryEstimate, setEntryEstimate] = useState<number>(0);

  const handleSelect = (pill: typeof PILLS[0]) => {
    setSelected(pill.id);
    setShowResponse(false);
    setShowInput(false);
    setShowCTA(false);

    dispatch(assessmentActions.updateInput("dataMode", pill.dataMode));

    setTimeout(() => setShowResponse(true), 400);
    if (pill.id === "knows") {
      setTimeout(() => setShowInput(true), 700);
    }
    setTimeout(() => setShowCTA(true), 1200);
  };

  const handleBegin = () => {
    if (selected === "knows" && entryEstimate > 0) {
      dispatch(assessmentActions.updateInput("entryEstimate", entryEstimate));
    }
    onNext();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-5 md:px-10"
      style={{ backgroundColor: DS.bg, fontFamily: DS.font }}
    >
      <a
        href="/"
        className="fixed top-0 left-0 z-50 flex items-center"
        style={{ padding: '24px 24px' }}
        data-testid="link-logo-home-screen1"
      >
        <img src={abridgeLogo} alt="Abridge" className="h-5" />
      </a>

      <div className="w-full max-w-[480px] text-center">
        <p
          style={{ ...labelStyle, letterSpacing: '2px' }}
          className="mb-8"
          data-testid="text-screen1-label"
        >
          Before We Begin
        </p>

        <h1
          style={{
            fontWeight: 700,
            fontSize: 44,
            color: DS.black,
            lineHeight: 1.15,
            fontFamily: DS.font,
            maxWidth: 480,
            margin: '0 auto 16px',
          }}
          className="hidden md:block"
          data-testid="text-screen1-headline"
        >
          What is ambient documentation actually returning to your organization?
        </h1>
        <h1
          style={{
            fontWeight: 700,
            fontSize: 34,
            color: DS.black,
            lineHeight: 1.15,
            fontFamily: DS.font,
            maxWidth: 480,
            margin: '0 auto 16px',
          }}
          className="block md:hidden"
          data-testid="text-screen1-headline-mobile"
        >
          What is ambient documentation actually returning to your organization?
        </h1>

        <p
          style={{ ...bodyStyle, textAlign: 'center', marginBottom: 48 }}
          data-testid="text-screen1-body"
        >
          Not what you paid for it.<br />
          What it is actually returning.
        </p>

        <div className="mx-auto" style={{ width: 56, height: 1, backgroundColor: DS.border, marginBottom: 48 }} />

        <div className="flex flex-wrap justify-center" style={{ gap: 12, marginBottom: 32 }}>
          {PILLS.map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => handleSelect(pill)}
              style={{
                fontFamily: DS.font,
                fontWeight: selected === pill.id ? 700 : 500,
                fontSize: 14,
                padding: '12px 24px',
                borderRadius: DS.radius.pill,
                border: `1.5px solid ${selected === pill.id ? DS.black : DS.border}`,
                backgroundColor: DS.white,
                color: selected === pill.id ? DS.black : DS.body,
                cursor: 'pointer',
                transition: 'all 150ms ease',
                minWidth: 180,
              }}
              data-testid={`pill-entry-${pill.id}`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        <div
          className="transition-all duration-300"
          style={{ opacity: showResponse ? 1 : 0, transform: showResponse ? 'translateY(0)' : 'translateY(6px)' }}
        >
          {selected && (
            <p
              style={{ fontFamily: DS.font, fontWeight: 400, fontSize: 17, color: DS.body, lineHeight: 1.75, fontStyle: 'italic' }}
              className="mb-6"
              data-testid="text-screen1-response"
            >
              {RESPONSES[selected]}
            </p>
          )}
        </div>

        {selected === "knows" && (
          <div
            className="max-w-[280px] mx-auto mb-6 transition-all duration-300"
            style={{ opacity: showInput ? 1 : 0, transform: showInput ? 'translateY(0)' : 'translateY(6px)' }}
          >
            <p
              className="text-left mb-2.5"
              style={{ ...labelStyle }}
            >
              Your Estimate
            </p>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 18, color: DS.muted, fontFamily: DS.font }}>$</span>
              <FormattedNumberInput
                value={entryEstimate}
                onChange={setEntryEstimate}
                className="flex-1"
                placeholder="annually"
                data-testid="input-entry-estimate"
              />
              <span style={{ fontSize: 13, color: DS.muted, fontFamily: DS.font }}>/ year</span>
            </div>
            <p
              className="text-left mt-2"
              style={{ fontWeight: 400, fontSize: 13, color: DS.muted, fontFamily: DS.font }}
            >
              Optional — we'll reference this in your results.
            </p>
          </div>
        )}

        <div
          className="transition-all duration-300"
          style={{ opacity: showCTA ? 1 : 0, transform: showCTA ? 'translateY(0)' : 'translateY(6px)' }}
        >
          <button
            onClick={handleBegin}
            className="inline-flex items-center gap-2"
            style={primaryButtonStyle()}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = DS.redHover)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = DS.red)}
            data-testid="button-begin-assessment"
          >
            Begin the Assessment
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
