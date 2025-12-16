import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface CareSettingCardProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  selected: boolean;
  disabled?: boolean;
  compact?: boolean;
  onClick: () => void;
}

export function CareSettingCard({
  icon: Icon,
  title,
  subtitle,
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
        compact ? "px-4 py-3" : "px-6 py-4",
        disabled
          ? "opacity-60 cursor-not-allowed border border-neutral-200"
          : selected
          ? "border-2 border-black shadow-md"
          : "border border-neutral-200 shadow-sm hover:border-black hover:shadow-md"
      )}
      data-testid={`card-setting-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div
        className={cn(
          "rounded-full flex items-center justify-center flex-shrink-0",
          compact ? "h-8 w-8" : "h-10 w-10",
          "bg-[#F3E9DD]"
        )}
      >
        <Icon className={cn("text-black", compact ? "h-4 w-4" : "h-5 w-5")} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className={cn("font-semibold text-black", compact ? "text-sm" : "text-base")}>
          {title}
        </div>
        <div className={cn("text-muted-foreground truncate", compact ? "text-xs" : "text-sm")}>
          {subtitle}
        </div>
      </div>

      {selected && !disabled && (
        <span className="absolute top-2 right-2 text-xs px-2 py-0.5 bg-black text-white rounded-full">
          Selected
        </span>
      )}
    </button>
  );
}
