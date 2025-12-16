import { ChevronRight } from "lucide-react";

interface StrategicDriverCardProps {
  title: string;
  active: boolean;
  onClick: () => void;
  onShowWork?: () => void;
  testId?: string;
}

export function StrategicDriverCard({
  title,
  active,
  onClick,
  onShowWork,
  testId,
}: StrategicDriverCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={`
        flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer
        transition-all duration-200
        ${active
          ? "bg-white border-2 border-black shadow-sm"
          : "bg-white border border-neutral-200 opacity-40"
        }
      `}
      data-testid={testId}
    >
      <span
        className={`
          text-sm
          ${active ? "font-semibold text-black" : "text-neutral-500"}
        `}
      >
        {title}
      </span>
      {active && onShowWork && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onShowWork();
          }}
          className="text-neutral-400 hover:text-black transition-colors"
          data-testid={`${testId}-show-work`}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
