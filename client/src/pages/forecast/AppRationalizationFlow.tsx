import { useRef, useState } from "react";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import { type AppRatItem, type AppRatCategoryId, makeItem } from "@/lib/appRationalizationCalc";
import ArApplicationsStep from "./appRationalization/ArApplicationsStep";
import ConsolidationFlow from "@/components/forecast/ConsolidationFlow";
import ConsolidationBars from "@/components/forecast/ConsolidationBars";

type ArStep = "applications" | "consolidation";

interface AppRationalizationFlowProps {
  onBack: () => void;
  onHome: () => void;
}

const STEP_INDEX: Record<ArStep, number> = { applications: 1, consolidation: 2 };
const STEP_LABELS = ["Applications", "Consolidation"];

export default function AppRationalizationFlow({ onBack, onHome }: AppRationalizationFlowProps) {
  const [step, setStep] = useState<ArStep>("applications");
  const [orgName, setOrgName] = useState("");
  const [abridgePrice, setAbridgePrice] = useState(0);
  const [termYears, setTermYears] = useState(3);
  const [items, setItems] = useState<AppRatItem[]>([]);
  const nextId = useRef(0);

  const addItem = (category: AppRatCategoryId, vendorName?: string) =>
    setItems((prev) => [...prev, { ...makeItem(`ar-${nextId.current++}`, category), vendorName }]);
  const updateItem = (id: string, patch: Partial<AppRatItem>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  // Top-left Back steps back one screen; from the first step it exits the flow.
  // State stays intact while stepping because the flow only unmounts on exit.
  const handleBack = () => {
    if (step === "consolidation") setStep("applications");
    else onBack();
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <UnifiedHeader
        pathType="forecast"
        stepName="App Rationalization"
        currentStep={STEP_INDEX[step]}
        totalSteps={3}
        stepLabels={STEP_LABELS}
        onBack={handleBack}
        onHome={onHome}
      />
      <div className="pt-14 sm:pt-16">
        {step === "applications" && (
          <ArApplicationsStep
            items={items}
            orgName={orgName}
            onOrgNameChange={setOrgName}
            abridgePrice={abridgePrice}
            onAbridgePriceChange={setAbridgePrice}
            onAdd={addItem}
            onUpdate={updateItem}
            onRemove={removeItem}
            onContinue={() => setStep("consolidation")}
          />
        )}

        {step === "consolidation" && (
          <div data-testid="ar-step-consolidation" className="max-w-[1120px] mx-auto px-6 py-8">
            <ConsolidationFlow items={items} />
            <div className="mt-6">
              <ConsolidationBars items={items} abridgePrice={abridgePrice} termYears={termYears} onTermChange={setTermYears} />
            </div>

            {/* On-demand "why" proof, on the way. Placeholder until the team lands the rationale copy. */}
            <div className="mt-6 flex items-center gap-3 rounded-xl border border-[#E8E2DA] bg-white/60 px-5 py-4" data-testid="ar-why-coming-soon">
              <span className="text-sm font-semibold text-[#1A1A1A]">Why Abridge can take these on</span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-[#8C7E6E] bg-[#F5F0EB] border border-[#E8E2DA] rounded-full px-2.5 py-1">Coming soon</span>
              <span className="text-[12.5px] text-[#8C7E6E] ml-auto hidden sm:block">The case for each capability is on the way.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
