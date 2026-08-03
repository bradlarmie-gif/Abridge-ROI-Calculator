import { ReactNode, useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Collapsible "assumptions" disclosure for Explore driver cards. The card leads
 * with the pitch (value + build ledger); the editable knobs tuck behind this
 * quiet row and open into a light, contained tray. Collapsed by default so the
 * story reads first, then the levers are one calm click away.
 *
 * Deliberately un-bulky: the trigger is a plain text row with a small inline
 * chevron (no boxed button), and the tray is a thin-hairline warm panel, not a
 * heavy card. Tokens match the editorial kit — ink #3E3B37, faint #A79E92,
 * line #EFE9E0, tray #FBF8F3 / #EFE8DE.
 */
export function AssumptionsDisclosure({
  children,
  label = "Adjust assumptions",
  defaultOpen = false,
}: {
  children: ReactNode;
  label?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mt-[22px] border-t border-[#EFE9E0] pt-[14px]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="group flex items-center gap-2 text-left"
        data-testid="button-adjust-assumptions"
      >
        <span className="text-[10.5px] font-extrabold tracking-[0.09em] uppercase text-[#3E3B37]">
          {label}
        </span>
        <ChevronDown
          className={`w-[15px] h-[15px] text-[#A79E92] transition-transform duration-200 group-hover:text-[#7C766F] ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div className="mt-4 rounded-[14px] border border-[#EFE8DE] bg-[#FBF8F3] p-[18px] [&>*:first-child]:mt-0">
          {children}
        </div>
      )}
    </div>
  );
}
