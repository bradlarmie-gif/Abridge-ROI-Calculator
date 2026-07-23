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

export function EditorialOptionRow({
  title,
  description,
  selected,
  onClick,
  note,
  testId,
}: {
  title: string;
  description?: string;
  selected: boolean;
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
      className="group relative w-full text-left pl-5 pr-3 py-4 border-b border-[#EFEAE1] transition-colors duration-200 hover:bg-[#FBFAF7]"
      data-testid={testId}
      data-selected={selected}
    >
      {selected && (
        <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[#EA2C00]" aria-hidden />
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
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
        {selected && (
          <Check
            className="w-[18px] h-[18px] text-[#EA2C00] flex-shrink-0 mt-0.5"
            strokeWidth={2.75}
            aria-hidden
          />
        )}
      </div>
    </button>
  );
}
