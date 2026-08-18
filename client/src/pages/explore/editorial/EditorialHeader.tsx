import { ReactNode } from "react";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";

/**
 * Explore chrome. Delegates to the app-wide UnifiedHeader so Explore shares the
 * one header shell with the hub and every other flow (same logo/back, breadcrumb,
 * progress dots, and a right-side action slot). The Data-request control lives in
 * that action slot. Keeps its own prop shape so the 9 Explore screens don't change.
 */
export function EditorialHeader({
  stepName,
  stepIndex, // 1-based
  onDataRequest,
  onBack,
  onHome,
}: {
  stepName: string;
  stepIndex: number;
  onDataRequest?: () => void;
  onBack?: () => void;
  onHome?: () => void;
}) {
  return (
    <>
      <UnifiedHeader
        pathType="explore"
        pathLabel="Value Model"
        currentStep={stepIndex}
        totalSteps={9}
        stepName={stepName}
        onBack={onBack}
        onHome={onHome}
        rightAction={
          onDataRequest ? (
            <button
              onClick={onDataRequest}
              data-testid="ed-header-data-request"
              className="inline-flex items-center h-8 px-3 rounded-lg border border-[#E8E2DA] bg-white text-[12px] font-bold text-[#1A1A1A] hover:border-[#1A1A1A] transition-colors whitespace-nowrap"
            >
              Data request
            </button>
          ) : undefined
        }
      />
      <UnifiedHeaderSpacer />
    </>
  );
}

export function EditorialShell({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[#FFFFFF] font-sans text-[#1A1A1A] antialiased">{children}</div>;
}
