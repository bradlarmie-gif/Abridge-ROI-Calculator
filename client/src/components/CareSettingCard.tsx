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
        "relative bg-white rounded-lg flex items-center gap-4 text-left transition-all duration-200",
        compact ? "px-4 py-3" : "px-6 py-6 min-h-[120px]",
        disabled
          ? "opacity-60 cursor-not-allowed border border-neutral-200"
          : selected
          ? "border-2 shadow-sm scale-[1.02]"
          : "border border-[#D1D5DB] md:hover:shadow-sm"
      )}
      style={selected && !disabled ? { borderColor: '#F03319', backgroundColor: '#FFFBFA' } : undefined}
      data-testid={`card-setting-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div
        className={cn(
          "rounded-lg flex items-center justify-center flex-shrink-0",
          compact ? "h-10 w-10" : "h-14 w-14",
          "bg-[#F3E9DD]"
        )}
      >
        <Icon className={cn(compact ? "h-5 w-5" : "h-9 w-9")} style={{ color: '#111111' }} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className={cn("font-semibold text-black", compact ? "text-sm" : "text-base")}>
          {title}
        </div>
      </div>

      {disabled && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500">
          Coming Soon
        </span>
      )}

      {selected && !disabled && (
        <span 
          className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full"
          style={{ backgroundColor: '#FEECEC', color: '#F03319' }}
        >
          Selected
        </span>
      )}
    </button>
  );
}
