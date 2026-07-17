import { useRef, useState } from "react";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import { type AppRatItem, type AppRatCategoryId, makeItem, computeNet } from "@/lib/appRationalizationCalc";
import { AnimatedValue } from "@/components/explore/AnimatedValue";
import ArApplicationsStep from "./appRationalization/ArApplicationsStep";
import ConsolidationWaterfall from "@/components/forecast/ConsolidationWaterfall";
import RolloutBeat from "@/components/forecast/RolloutBeat";
import { Download } from "lucide-react";

function fmtM(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `$${(a / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000) return `$${Math.round(a / 1_000)}K`;
  return `$${Math.round(a)}`;
}

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
  const [exporting, setExporting] = useState(false);
  const nextId = useRef(0);

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const mod = await import("@/components/forecast/AppRationalizationPDFExport");
      await mod.generateAppRationalizationPDF(items, orgName, abridgePrice, termYears);
    } finally {
      setExporting(false);
    }
  };

  const addItem = (category: AppRatCategoryId, init?: Partial<AppRatItem>) =>
    setItems((prev) => [...prev, { ...makeItem(`ar-${nextId.current++}`, category), ...init }]);
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

        {step === "consolidation" && (() => {
          const net = computeNet(items, abridgePrice);
          return (
          <div data-testid="ar-step-consolidation" className="max-w-[1120px] mx-auto px-6 py-8">
            {/* Page header, matching the Applications screen */}
            <div className="flex items-start justify-between gap-6 mb-6">
              <div>
                <h1 className="font-abridge text-4xl uppercase tracking-tight text-[#1A1A1A]">Consolidation</h1>
                <p className="text-sm text-[#6B6B6B] mt-2.5">How much of your stack sunsets onto Abridge, and what you keep.</p>
              </div>
              {net.stackTotal > 0 && (
                <div className="flex flex-col items-end gap-3 shrink-0">
                  <button
                    onClick={handleExportPdf}
                    disabled={exporting}
                    className="flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-[#E8E2DA] bg-white text-[12px] font-bold text-[#1A1A1A] hover:border-[#1A1A1A] disabled:opacity-50 transition-colors"
                    data-testid="ar-export-pdf"
                  >
                    <Download className="w-3.5 h-3.5" strokeWidth={2.25} />
                    {exporting ? "Preparing…" : "Export PDF"}
                  </button>
                  <div className="text-right leading-none">
                    <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8C7E6E] mb-1.5">
                      {net.isNetCost ? "Net cost / yr" : "Net savings / yr"}
                    </div>
                    <AnimatedValue
                      value={Math.abs(net.netSavings)}
                      format={fmtM}
                      className={`text-[34px] font-extrabold tabular-nums ${net.isNetCost ? "text-[#1A1A1A]" : "text-[#EA2C00]"}`}
                      style={{ letterSpacing: "-0.01em" }}
                      data-testid="ar-net-hero"
                    />
                    <div className="text-[12px] text-[#8C7E6E] tabular-nums mt-1.5">
                      {fmtM(net.stackTotal)} across these tools today · {fmtM(net.stays)} stays
                    </div>
                  </div>
                </div>
              )}
            </div>

            <ConsolidationWaterfall items={items} />

            {/* Calm beat: how the stack phases in, on their timeline. The single timing section. */}
            <RolloutBeat items={items} termYears={termYears} abridgePrice={abridgePrice} onTermChange={setTermYears} />

            {/* On-demand "why" proof, on the way. Placeholder until the team lands the rationale copy. */}
            <div className="mt-6 flex items-center gap-3 rounded-xl border border-[#E8E2DA] bg-white/60 px-5 py-4" data-testid="ar-why-coming-soon">
              <span className="text-sm font-semibold text-[#1A1A1A]">Why Abridge can take these on</span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-[#8C7E6E] bg-[#F5F0EB] border border-[#E8E2DA] rounded-full px-2.5 py-1">Coming soon</span>
              <span className="text-[12.5px] text-[#8C7E6E] ml-auto hidden sm:block">The case for each capability is on the way.</span>
            </div>
          </div>
          );
        })()}
      </div>
    </div>
  );
}
