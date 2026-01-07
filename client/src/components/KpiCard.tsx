import { Card, CardContent } from "@/components/ui/card";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  subtitle?: string;
  icon?: ReactNode;
  variant?: "default" | "positive" | "negative" | "neutral" | "black";
}

export function KpiCard({ label, value, subtitle, icon, variant = "default" }: KpiCardProps) {
  const borderColors = {
    default: "border-l-primary",
    positive: "border-l-green-500 dark:border-l-green-400",
    negative: "border-l-red-500 dark:border-l-red-400",
    neutral: "border-l-blue-500 dark:border-l-blue-400",
    black: "border-l-neutral-900 dark:border-l-neutral-300",
  };

  return (
    <Card className={cn("relative overflow-visible border-t border-r border-b border-neutral-200 border-l-4", borderColors[variant])}>
      <CardContent className="p-4">
        {icon && (
          <div className="absolute top-3 right-3 opacity-15">{icon}</div>
        )}
        <div className="space-y-1">
          <p 
            className="text-2xl font-bold font-mono tracking-tight"
            data-testid={`kpi-value-${label.toLowerCase().replace(/\s+/g, '-')}`}
          >
            {value}
          </p>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          {subtitle && (
            <p className="text-xs text-neutral-500 mt-1">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface KpiGridProps {
  children: ReactNode;
}

export function KpiGrid({ children }: KpiGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {children}
    </div>
  );
}
