import { ArrowLeft } from "lucide-react";

export type MethodologyNavKey = "overview" | "outpatient" | "ed" | "inpatient" | "nursing" | "continuum";

const SETTINGS: { key: MethodologyNavKey; label: string }[] = [
  { key: "outpatient", label: "Outpatient" },
  { key: "ed", label: "Emergency" },
  { key: "inpatient", label: "Inpatient" },
  { key: "nursing", label: "Nursing" },
];

/**
 * Shared chrome for every editorial methodology page: back, the ABRIDGE
 * wordmark, and one switcher used identically on the four setting pages and
 * the continuum capstone, so navigation never looks different between them.
 */
export function MethodologyHeader({
  active,
  activeLabel,
  onBack,
  onHome,
  onNavigate,
}: {
  active: MethodologyNavKey;
  activeLabel: string;
  onBack: () => void;
  onHome: () => void;
  onNavigate?: (key: MethodologyNavKey) => void;
}) {
  const tab = (isActive: boolean) =>
    isActive
      ? "text-[12px] font-bold rounded-[9px] px-3 py-1.5 bg-white shadow-sm text-[#1A1A1A]"
      : "text-[12px] font-semibold rounded-[9px] px-3 py-1.5 text-[#8C8073] hover:text-[#443A32] transition-colors";

  return (
    <div className="h-16 border-b border-[#E8E2DA]">
      <div className="max-w-[1120px] mx-auto h-full px-5 sm:px-8 lg:px-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            aria-label="Back"
            className="w-8 h-8 rounded-full border border-[#E8E2DA] bg-white flex items-center justify-center text-[#5E534A] hover:text-[#EA2C00] hover:border-[#EA2C00] transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button onClick={onHome} className="font-abridge text-[22px] text-[#EA2C00] tracking-[0.03em]">ABRIDGE</button>
          <span className="hidden sm:inline text-[#B4A896]">|</span>
          <span className="hidden sm:inline text-[11px] font-extrabold tracking-[0.14em] uppercase text-[#8C8073]">The Value Methodology</span>
        </div>
        <div className="hidden md:flex items-center gap-1 bg-[#F2EDE5] rounded-[12px] p-1">
          <button onClick={() => onNavigate?.("overview")} className={tab(active === "overview")}>
            The Methodology
          </button>
          <span className="w-px h-4 bg-[#DCD3C6] mx-1" />
          {SETTINGS.map((s) => (
            <button key={s.key} onClick={() => onNavigate?.(s.key)} className={tab(s.key === active)}>
              {s.label}
            </button>
          ))}
          <span className="w-px h-4 bg-[#DCD3C6] mx-1" />
          <button onClick={() => onNavigate?.("continuum")} className={tab(active === "continuum")}>
            Across settings
          </button>
        </div>
        <span className="md:hidden text-[11px] font-extrabold tracking-[0.14em] uppercase text-[#8C8073]">{activeLabel}</span>
      </div>
    </div>
  );
}
