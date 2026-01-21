import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface CareSettingCardProps {
  icon: LucideIcon;
  title: string;
  selected: boolean;
  disabled?: boolean;
  compact?: boolean;
  onClick: () => void;
}

export function CareSettingCard({
  icon: Icon,
  title,
  selected,
  disabled = false,
  compact = false,
  onClick,
}: CareSettingCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative bg-white rounded-xl flex items-center gap-4 text-left transition-all duration-200",
        compact ? "px-4 py-3" : "px-4 py-4",
        disabled
          ? "opacity-60 cursor-not-allowed border border-neutral-200"
          : selected
          ? "border-2 shadow-sm"
          : "border border-neutral-200 hover:border-neutral-300 hover:shadow-sm"
      )}
      style={selected && !disabled ? { borderColor: '#EA2C00' } : undefined}
      data-testid={`card-setting-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div
        className={cn(
          "rounded-lg flex items-center justify-center flex-shrink-0",
          compact ? "h-10 w-10" : "h-12 w-12",
          "bg-[#F3E9DD]"
        )}
      >
        <Icon className={cn(compact ? "h-5 w-5" : "h-6 w-6")} style={{ color: '#111111' }} />
      </div>
      
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className={cn("font-medium text-neutral-900", compact ? "text-sm" : "text-base")}>
          {title}
        </span>
        {disabled && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500 whitespace-nowrap">
            Coming Soon
          </span>
        )}
      </div>
    </button>
  );
}
