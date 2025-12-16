interface StrategicDriverCardProps {
  title: string;
  active: boolean;
  onClick: () => void;
  testId?: string;
}

export function StrategicDriverCard({
  title,
  active,
  onClick,
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
          ? "bg-white border-2 border-black shadow-sm opacity-100"
          : "bg-white border border-neutral-200 opacity-40 shadow-none"
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
      <span
        className={`
          text-xs px-2 py-0.5 rounded-full
          ${active
            ? "bg-neutral-200 text-black"
            : "bg-neutral-100 text-neutral-500"
          }
        `}
        data-testid={`${testId}-status`}
      >
        {active ? "Enabled" : "Disabled"}
      </span>
    </div>
  );
}
