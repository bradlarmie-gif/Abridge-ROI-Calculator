import { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

/**
 * Shared editorial chrome for the Explore editorial preview (?explorepreview=1).
 * Matches the locked mockup kit exactly: #FDFCFA page, #E8E2DA hairlines,
 * ABRIDGE coral wordmark, "Explore · {step}", Data request chip, 9-dot progress
 * with the active dot elongated coral.
 */
export function EditorialHeader({
  stepName,
  stepIndex, // 1-based
  onDataRequest,
  onBack,
}: {
  stepName: string;
  stepIndex: number;
  onDataRequest?: () => void;
  onBack?: () => void;
}) {
  return (
    <div className="h-[58px] border-b border-[#E8E2DA]">
      <div className="max-w-[1160px] mx-auto h-full flex items-center justify-between px-12">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              aria-label="Back"
              data-testid="ed-header-back"
              className="w-8 h-8 rounded-full border border-[#E8E2DA] bg-white flex items-center justify-center text-[#5E534A] hover:text-[#EA2C00] hover:border-[#EA2C00] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="font-abridge text-[20px] text-[#EA2C00] tracking-[0.5px]">ABRIDGE</div>
        </div>
        <div className="text-[14px] text-[#5E534A]">
          Explore · <b className="text-[#1A1A1A] font-bold">{stepName}</b>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={onDataRequest}
            className="text-[12px] font-bold text-[#2E2822] border border-[#E8E2DA] rounded-[12px] px-[13px] py-[7px] bg-white"
          >
            Data request
          </button>
          <div className="flex gap-[6px]">
            {Array.from({ length: 9 }).map((_, i) => (
              <span
                key={i}
                className={
                  i === stepIndex - 1
                    ? "h-2 w-5 rounded-full bg-[#EA2C00]"
                    : "h-2 w-2 rounded-full bg-[#E0D6C8]"
                }
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function EditorialShell({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[#FDFCFA] font-sans text-[#1A1A1A] antialiased">{children}</div>;
}
