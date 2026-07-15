import { useRef, useState } from "react";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import { type AppRatItem, type AppRatCategoryId, makeItem, computeTotals } from "@/lib/appRationalizationCalc";
import ArSetupStep from "./appRationalization/ArSetupStep";
import ArApplicationsStep from "./appRationalization/ArApplicationsStep";
import ConsolidationFlow from "@/components/forecast/ConsolidationFlow";
import { AnimatedValue } from "@/components/explore/AnimatedValue";
import RoadmapChart from "@/components/forecast/RoadmapChart";

type ArStep = "setup" | "applications" | "consolidation" | "change";

interface AppRationalizationFlowProps {
  onBack: () => void;
  onHome: () => void;
}

const STEP_INDEX: Record<ArStep, number> = { setup: 1, applications: 2, consolidation: 3, change: 4 };
const STEP_LABELS = ["Setup", "Applications", "Consolidation", "The change"];

export default function AppRationalizationFlow({ onBack, onHome }: AppRationalizationFlowProps) {
  const [step, setStep] = useState<ArStep>("setup");
  const [orgName, setOrgName] = useState("");
  const [termYears, setTermYears] = useState(3);
  const [items, setItems] = useState<AppRatItem[]>([]);
  const nextId = useRef(0);

  const addItem = (category: AppRatCategoryId, vendorName?: string) =>
    setItems((prev) => [...prev, { ...makeItem(`ar-${nextId.current++}`, category), vendorName }]);
  const updateItem = (id: string, patch: Partial<AppRatItem>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const fmtM = (n: number): string => {
    if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}K`;
    return `$${Math.round(n)}`;
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <UnifiedHeader
        pathType="forecast"
        stepName="App Rationalization"
        currentStep={STEP_INDEX[step]}
        totalSteps={4}
        stepLabels={STEP_LABELS}
        onBack={onBack}
        onHome={onHome}
      />
      <div className="pt-14 sm:pt-16">
        {step === "setup" && (
          <ArSetupStep
            orgName={orgName}
            termYears={termYears}
            onChange={(p) => { if (p.orgName !== undefined) setOrgName(p.orgName); if (p.termYears !== undefined) setTermYears(p.termYears); }}
            onContinue={() => setStep("applications")}
          />
        )}
        {step === "applications" && (
          <ArApplicationsStep
            items={items}
            onAdd={addItem}
            onUpdate={updateItem}
            onRemove={removeItem}
            onContinue={() => setStep("consolidation")}
          />
        )}
        {step === "consolidation" && (() => {
          const totals = computeTotals(items);
          return (
            <div data-testid="ar-step-consolidation" className="max-w-[1120px] mx-auto px-6 py-8">
              <h1 className="font-abridge text-4xl uppercase tracking-tight text-[#1A1A1A] text-center">Consolidation</h1>
              <p className="text-[15px] text-[#1A1A1A] text-center mt-3 mb-8">
                <AnimatedValue value={totals.toAbridge} format={fmtM} className="font-bold text-[#EA2C00] tabular-nums" /> to Abridge
                {" · "}
                <AnimatedValue value={totals.stays} format={fmtM} className="font-bold tabular-nums" /> stays
                {" · from a "}
                <AnimatedValue value={totals.stackTotal} format={fmtM} className="font-bold tabular-nums" /> stack
              </p>
              <ConsolidationFlow items={items} />

              {/* On-demand "why" proof, on the way. Placeholder until the team lands the rationale copy. */}
              <div className="mt-6 flex items-center gap-3 rounded-xl border border-[#E8E2DA] bg-white/60 px-5 py-4" data-testid="ar-why-coming-soon">
                <span className="text-sm font-semibold text-[#1A1A1A]">Why Abridge can take these on</span>
                <span className="text-[10px] font-bold uppercase tracking-wide text-[#8C7E6E] bg-[#F5F0EB] border border-[#E8E2DA] rounded-full px-2.5 py-1">Coming soon</span>
                <span className="text-[12.5px] text-[#8C7E6E] ml-auto hidden sm:block">The case for each capability is on the way.</span>
              </div>

              <div className="mt-8 flex items-center justify-center gap-6">
                <button
                  onClick={() => setStep("applications")}
                  className="text-sm font-semibold text-[#8C7E6E] hover:text-[#1A1A1A] transition-colors"
                  data-testid="ar-back-to-applications"
                >
                  ← Back to applications
                </button>
                <button
                  onClick={() => setStep("change")}
                  className="h-11 px-6 rounded-xl bg-[#EA2C00] text-white text-sm font-semibold"
                  data-testid="ar-see-the-change"
                >
                  See the change →
                </button>
              </div>
            </div>
          );
        })()}
        {step === "change" && (
          <div data-testid="ar-step-change" className="max-w-[940px] mx-auto px-6 py-8">
            <h1 className="font-abridge text-4xl uppercase tracking-tight text-[#1A1A1A] text-center">The change</h1>
            <p className="text-[15px] text-[#6B6B6B] text-center mt-3 mb-8">
              Watch the stack come apart, tool by tool, as each reaches a point where Abridge can take it on.
            </p>
            <RoadmapChart items={items} termYears={termYears} />
            <div className="mt-8 text-center">
              <button
                onClick={() => setStep("consolidation")}
                className="text-sm font-semibold text-[#8C7E6E] hover:text-[#1A1A1A] transition-colors"
                data-testid="ar-back-to-consolidation"
              >
                ← Back to the consolidation
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
