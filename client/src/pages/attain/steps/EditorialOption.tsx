import { Check } from "lucide-react";

/**
 * Style A "Editorial list" option renderer, shared by the Align questions
 * (ChooseQuestion) and the Plan metric menus (MeasurementPlanSurface) so both
 * surfaces read as one treatment. No per-option boxes: options are full-width
 * rows separated by thin hairline dividers. An unselected row is plain, a
 * near-black (#1A1A1A) medium title over a muted description. A selected row
 * shows a coral (#EA2C00) left-accent bar, a coral title, and a small coral
 * check on the right. The whole row is the click target; hover is a subtle warm
 * wash. Works for single-select and multi-select alike, since the parent owns
 * selection state and marks each selected row independently.
 */

export function EditorialOptionList({ children }: { children: React.ReactNode }) {
  return <div className="border-t border-[#EFEAE1]">{children}</div>;
}

/** The always-visible select indicator: a checkbox for multi-select (pick any)
 * and a radio for single-select (pick one), so a row reads as selectable and
 * the two modes are distinct at a glance. Empty and outlined when unselected,
 * coral-filled when selected. */
function SelectIndicator({ multi, selected }: { multi: boolean; selected: boolean }) {
  const base = "mt-0.5 flex-shrink-0 grid place-items-center w-[18px] h-[18px] border-[1.5px] transition-colors";
  if (multi) {
    return (
      <span className={`${base} rounded-[5px] ${selected ? "bg-[#EA2C00] border-[#EA2C00]" : "border-[#CFC6B8] bg-white group-hover:border-[#B4A896]"}`} aria-hidden>
        {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </span>
    );
  }
  return (
    <span className={`${base} rounded-full ${selected ? "border-[#EA2C00]" : "border-[#CFC6B8] bg-white group-hover:border-[#B4A896]"}`} aria-hidden>
      {selected && <span className="w-[9px] h-[9px] rounded-full bg-[#EA2C00]" />}
    </span>
  );
}

export function EditorialOptionRow({
  title,
  description,
  selected,
  multi,
  onClick,
  note,
  testId,
}: {
  title: string;
  description?: string;
  selected: boolean;
  /** true = checkbox (multi-select), false = radio (single-select). Drives the
   * indicator so the row's mode reads at a glance. */
  multi: boolean;
  onClick: () => void;
  /** Optional extra content under the description (e.g. an Align-proof note). */
  note?: React.ReactNode;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="group relative w-full text-left pl-4 pr-3 py-4 border-b border-[#EFEAE1] transition-colors duration-150 hover:bg-[#F2EDE5]"
      data-testid={testId}
      data-selected={selected}
    >
      {/* The coral bar marks a SELECTED row only. Hover feedback is the darker
          wash alone, never the bar. */}
      {selected && (
        <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[#EA2C00]" aria-hidden />
      )}
      <div className="flex items-start gap-3.5">
        <SelectIndicator multi={multi} selected={selected} />
        <div className="min-w-0 flex-1">
          <p
            className={`text-[16px] leading-snug ${
              selected ? "font-semibold text-[#EA2C00]" : "font-medium text-[#1A1A1A]"
            }`}
          >
            {title}
          </p>
          {description && (
            <p className="text-[13px] text-[#8C8C8C] leading-snug mt-1 max-w-[560px]">{description}</p>
          )}
          {note}
        </div>
      </div>
    </button>
  );
}
