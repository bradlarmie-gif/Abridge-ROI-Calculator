import { ArrowLeft } from "lucide-react";
import abridgeLogo from "@assets/abridge-logo-wordmark-red_1769020684647.png";

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
  // The Ambient Documentation story is the only page that takes the default.
  // Care Signals / CDS / Pre-Bill each pass their own product name, so leaving
  // this as "The Value Methodology" meant the flagship row on The Case opened a
  // page whose rail announced a different thing than the row you clicked.
  railLabel = "Ambient Documentation",
}: {
  active?: MethodologyNavKey;
  activeLabel: string;
  onBack: () => void;
  onHome: () => void;
  /** Omit to render the chrome WITHOUT the switcher — a standalone story page
   *  (Pre-Bill) has nowhere to switch to, and an empty tab group reads broken. */
  onNavigate?: (key: MethodologyNavKey) => void;
  /** The small rail caption beside the wordmark. */
  railLabel?: string;
}) {
  const tab = (isActive: boolean) =>
    isActive
      ? "text-[12px] font-bold rounded-[9px] px-3 py-1.5 bg-white shadow-sm text-[#1A1A1A]"
      : "text-[12px] font-semibold rounded-[9px] px-3 py-1.5 text-[#8C8073] hover:text-[#443A32] transition-colors";

  return (
    <div className="h-16 border-b border-[#E8E2DA]">
      <div className="max-w-[1120px] mx-auto h-full px-5 sm:px-8 lg:px-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Same order and style as the app header: wordmark, divider, ← Back. */}
          <button onClick={onHome} data-testid="link-logo-home" className="flex items-center flex-shrink-0 transition-opacity hover:opacity-70">
            <img src={abridgeLogo} alt="Abridge" className="h-5 sm:h-6" />
          </button>
          <div className="w-px h-5 bg-slate-200 hidden sm:block" />
          <button
            onClick={onBack}
            data-testid="button-back"
            className="flex items-center gap-1 text-slate-600 hover:text-slate-900 transition-colors p-1.5 -ml-1 rounded-md hover:bg-slate-100 flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-sm font-medium hidden sm:inline">Back</span>
          </button>
          <span className="hidden sm:inline text-[#B4A896]">|</span>
          <span className="hidden sm:inline text-[11px] font-extrabold tracking-[0.14em] uppercase text-[#8C8073]">{railLabel}</span>
        </div>
        {onNavigate && (
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
        )}
        <span className="md:hidden text-[11px] font-extrabold tracking-[0.14em] uppercase text-[#8C8073]">{activeLabel}</span>
      </div>
    </div>
  );
}
