import { ReactNode } from "react";

/**
 * Shared editorial chrome for the Explore editorial preview (?explorepreview=1).
 * Matches the locked mockup kit exactly: #FDFCFA page, #DED5C8 hairlines,
 * ABRIDGE coral wordmark, "Explore · {step}", Data request chip, 9-dot progress
 * with the active dot elongated coral.
 */
export function EditorialHeader({
  stepName,
  stepIndex, // 1-based
  onDataRequest,
}: {
  stepName: string;
  stepIndex: number;
  onDataRequest?: () => void;
}) {
  return (
    <div className="h-[58px] border-b border-[#DED5C8]">
      <div className="max-w-[1160px] mx-auto h-full flex items-center justify-between px-12">
        <div className="font-abridge text-[20px] text-[#EA2C00] tracking-[0.5px]">ABRIDGE</div>
        <div className="text-[14px] text-[#5E534A]">
          Explore · <b className="text-[#1A1A1A] font-bold">{stepName}</b>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={onDataRequest}
            className="text-[12px] font-bold text-[#2E2822] border border-[#DED5C8] rounded-[12px] px-[13px] py-[7px] bg-white"
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
