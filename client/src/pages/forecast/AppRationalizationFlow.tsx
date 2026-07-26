import { useRef, useState } from "react";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import { type AppRatItem, type AppRatCategoryId, makeItem } from "@/lib/appRationalizationCalc";
import ArApplicationsStep from "./appRationalization/ArApplicationsStep";
import ArConsolidationView from "@/components/forecast/ArConsolidationView";
import ConsolidationTiming from "@/components/forecast/ConsolidationTiming";
import ArMoatView from "@/components/forecast/ArMoatView";
import { useToast } from "@/hooks/use-toast";
import { Download } from "lucide-react";

type ArStep = "applications" | "consolidation" | "timing" | "moat";

interface AppRationalizationFlowProps {
  onBack: () => void;
  onHome: () => void;
}

const STEP_INDEX: Record<ArStep, number> = { applications: 1, consolidation: 2, timing: 3, moat: 4 };
const STEP_LABELS = ["Applications", "Consolidation", "When it lands", "Why only Abridge"];

export default function AppRationalizationFlow({ onBack, onHome }: AppRationalizationFlowProps) {
  const [step, setStep] = useState<ArStep>("applications");
  const [orgName, setOrgName] = useState("");
  const [abridgePrice, setAbridgePrice] = useState(0);
  const [horizonYears, setHorizonYears] = useState(3);
  const [items, setItems] = useState<AppRatItem[]>([]);
  const [exporting, setExporting] = useState(false);
  const nextId = useRef(0);
  const { toast } = useToast();

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const mod = await import("@/components/forecast/AppRationalizationPDFExport");
      await mod.generateAppRationalizationPDF(items, orgName, abridgePrice, horizonYears);
    } catch (err) {
      // Never fail silently: a throw inside pdf().toBlob() used to be swallowed by
      // a catch-less try/finally, so the button did nothing. Log for debugging and
      // surface a brief, non-blocking message so the rep knows to retry.
      console.error("App Rationalization PDF export failed:", err);
      toast({
        title: "Export failed",
        description: "The PDF couldn't be generated. Please try again.",
        variant: "destructive",
      });
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
    if (step === "moat") setStep("timing");
    else if (step === "timing") setStep("consolidation");
    else if (step === "consolidation") setStep("applications");
    else onBack();
  };

  // The export button, top-right on every step past Applications. One handler,
  // one testid, so the export stays reachable throughout the value story.
  const exportButton = (
    <div className="flex justify-end mb-5">
      <button
        onClick={handleExportPdf}
        disabled={exporting}
        className="flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-[#E8E2DA] bg-white text-[12px] font-bold text-[#1A1A1A] hover:border-[#1A1A1A] disabled:opacity-50 transition-colors"
        data-testid="ar-export-pdf"
      >
        <Download className="w-3.5 h-3.5" strokeWidth={2.25} />
        {exporting ? "Preparing…" : "Export PDF"}
      </button>
    </div>
  );

  // A primary CTA that advances to the next step (coral, plain copy).
  const nextCta = (label: string, onClick: () => void, testid: string) => (
    <div className="flex justify-end mt-8">
      <button
        onClick={onClick}
        className="h-11 px-5 rounded-xl bg-[#EA2C00] text-white text-sm font-bold"
        data-testid={testid}
      >
        {label}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFCFA]">
      <UnifiedHeader
        pathType="forecast"
        stepName="App Rationalization"
        currentStep={STEP_INDEX[step]}
        totalSteps={4}
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
            {exportButton}
            <ArConsolidationView items={items} abridgePrice={abridgePrice} />
            {nextCta("See when it lands →", () => setStep("timing"), "ar-see-timing")}
          </div>
        )}

        {step === "timing" && (
          <div data-testid="ar-step-timing" className="max-w-[1120px] mx-auto px-6 py-8">
            {exportButton}
            <ConsolidationTiming
              items={items}
              horizonYears={horizonYears}
              onHorizonChange={setHorizonYears}
              onUpdateItem={updateItem}
            />
            {nextCta("Why only Abridge →", () => setStep("moat"), "ar-see-moat")}
          </div>
        )}

        {step === "moat" && (
          <div data-testid="ar-step-moat" className="max-w-[1120px] mx-auto px-6 py-8">
            {exportButton}
            <ArMoatView items={items} />
          </div>
        )}
      </div>
    </div>
  );
}
