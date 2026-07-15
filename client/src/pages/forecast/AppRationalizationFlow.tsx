import { useRef, useState } from "react";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import { type AppRatItem, type AppRatCategoryId, makeItem, computeTotals } from "@/lib/appRationalizationCalc";
import ArApplicationsStep from "./appRationalization/ArApplicationsStep";
import ConsolidationFlow from "@/components/forecast/ConsolidationFlow";
import { AnimatedValue } from "@/components/explore/AnimatedValue";
import RoadmapChart from "@/components/forecast/RoadmapChart";

type ArStep = "applications" | "consolidation" | "change";

interface AppRationalizationFlowProps {
  onBack: () => void;
  onHome: () => void;
}

const STEP_INDEX: Record<ArStep, number> = { applications: 1, consolidation: 2, change: 3 };
const STEP_LABELS = ["Applications", "Consolidation", "The change"];
const TERM_OPTIONS = [2, 3, 4, 5];

export default function AppRationalizationFlow({ onBack, onHome }: AppRationalizationFlowProps) {
  const [step, setStep] = useState<ArStep>("applications");
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
        totalSteps={3}
        stepLabels={STEP_LABELS}
        onBack={onBack}
        onHome={onHome}
      />
      <div className="pt-14 sm:pt-16">
        {step === "applications" && (
          <ArApplicationsStep
            items={items}
            orgName={orgName}
            onOrgNameChange={setOrgName}
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
                <button onClick={() => setStep("applications")} className="text-sm font-semibold text-[#8C7E6E] hover:text-[#1A1A1A] transition-colors" data-testid="ar-back-to-applications">← Back to applications</button>
                <button onClick={() => setStep("change")} className="h-11 px-6 rounded-xl bg-[#EA2C00] text-white text-sm font-semibold" data-testid="ar-see-the-change">See the change →</button>
              </div>
            </div>
          );
        })()}

        {step === "change" && (
          <div data-testid="ar-step-change" className="max-w-[940px] mx-auto px-6 py-8">
            <h1 className="font-abridge text-4xl uppercase tracking-tight text-[#1A1A1A] text-center">The change</h1>
            <p className="text-[15px] text-[#6B6B6B] text-center mt-3 mb-6">
              Watch the stack come apart, tool by tool, as each reaches a point where Abridge can take it on.
            </p>
            <div className="flex items-center justify-center gap-2.5 mb-6" data-testid="ar-term-control">
              <span className="text-[11px] font-bold uppercase tracking-[1.5px] text-[#8C7E6E]">Contract term</span>
              <select
                value={termYears}
                onChange={(e) => setTermYears(Number(e.target.value))}
                className="h-9 bg-white border border-[#E8E2DA] rounded-[9px] px-3 text-sm text-[#1A1A1A] outline-none focus:border-[#1A1A1A]"
                data-testid="ar-term-select"
              >
                {TERM_OPTIONS.map((y) => <option key={y} value={y}>{y} years</option>)}
              </select>
            </div>
            <RoadmapChart items={items} termYears={termYears} />
            <div className="mt-8 text-center">
              <button onClick={() => setStep("consolidation")} className="text-sm font-semibold text-[#8C7E6E] hover:text-[#1A1A1A] transition-colors" data-testid="ar-back-to-consolidation">← Back to the consolidation</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
