import { useState } from "react";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import { type AppRatItem, type AppRatCategoryId, makeItem } from "@/lib/appRationalizationCalc";
import ArSetupStep from "./appRationalization/ArSetupStep";
import ArApplicationsStep from "./appRationalization/ArApplicationsStep";

type ArStep = "setup" | "applications" | "consolidation";

interface AppRationalizationFlowProps {
  onBack: () => void;
  onHome: () => void;
}

const STEP_INDEX: Record<ArStep, number> = { setup: 1, applications: 2, consolidation: 3 };
const STEP_LABELS = ["Setup", "Applications", "Consolidation", "The change", "Why we can"];

export default function AppRationalizationFlow({ onBack, onHome }: AppRationalizationFlowProps) {
  const [step, setStep] = useState<ArStep>("setup");
  const [orgName, setOrgName] = useState("");
  const [termYears, setTermYears] = useState(3);
  const [items, setItems] = useState<AppRatItem[]>([]);

  const addItem = (category: AppRatCategoryId, vendorName?: string) =>
    setItems((prev) => [...prev, { ...makeItem(`ar-${Date.now()}`, category), vendorName }]);
  const updateItem = (id: string, patch: Partial<AppRatItem>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <UnifiedHeader
        pathType="forecast"
        stepName="App Rationalization"
        currentStep={STEP_INDEX[step]}
        totalSteps={5}
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
        {step === "consolidation" && (
          <div data-testid="ar-step-consolidation" className="max-w-3xl mx-auto px-6 py-24 text-center">
            <h2 className="font-abridge text-3xl uppercase tracking-tight text-[#1A1A1A]">The consolidation</h2>
            <p className="text-sm text-[#6B6B6B] mt-3">Coming next: the two-sink flow that shows what Abridge takes on and what stays.</p>
            <button
              onClick={() => setStep("applications")}
              className="mt-6 text-sm font-semibold text-[#EA2C00]"
              data-testid="ar-back-to-applications"
            >
              ← Back to applications
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
