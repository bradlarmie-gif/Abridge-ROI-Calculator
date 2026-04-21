import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, TrendingDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ForecastAlert } from "@/lib/forecastCalculator";
import type { ComparisonPricing, ForecastState } from "../types";

interface Props {
  alerts: ForecastAlert[];
  comparisons: ComparisonPricing[];
  applySwap: (cmp: ComparisonPricing) => void;
  state: ForecastState;
}

export function AlertsZone({ alerts, comparisons, applySwap }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [pendingSwap, setPendingSwap] = useState<ComparisonPricing | null>(null);

  const visible = alerts.filter((_, i) => !dismissed.has(alertKey(_, i)));

  if (visible.length === 0) return null;

  return (
    <div className="space-y-2" data-testid="alerts-zone">
      <AnimatePresence initial={false}>
        {visible.map((a, idx) => {
          const key = alertKey(a, idx);
          const isSavings = a.type === "pricing-savings";
          const cmp = a.comparisonId
            ? comparisons.find((c) => c.id === a.comparisonId)
            : null;
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              data-testid={`alert-${a.type}`}
              className={`relative overflow-hidden rounded-lg border-l-4 px-4 py-3 pr-9 flex items-start gap-3 bg-white border border-neutral-200 ${
                isSavings ? "border-l-emerald-500" : "border-l-red-500"
              }`}
            >
              {isSavings ? (
                <TrendingDown className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#1A1A1A]">{a.message}</p>
                {isSavings && cmp && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 text-xs"
                    data-testid={`btn-apply-swap-${cmp.id}`}
                    onClick={() => setPendingSwap(cmp)}
                  >
                    Apply this swap
                  </Button>
                )}
              </div>
              <button
                type="button"
                aria-label="Dismiss alert"
                data-testid={`btn-dismiss-alert-${idx}`}
                onClick={() => setDismissed((s) => new Set(s).add(key))}
                className="absolute right-2 top-2 p-1 rounded text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>

      <AlertDialog open={!!pendingSwap} onOpenChange={(o) => !o && setPendingSwap(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Swap pricing model?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace your current pricing with{" "}
              <strong>{pendingSwap?.label}</strong>. Your current pricing will be
              moved into the comparisons list so you can swap back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="btn-confirm-swap"
              onClick={() => {
                if (pendingSwap) applySwap(pendingSwap);
                setPendingSwap(null);
              }}
            >
              Apply swap
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function alertKey(a: ForecastAlert, idx: number): string {
  return `${a.type}-${a.comparisonId ?? ""}-${a.month ?? ""}-${idx}`;
}
