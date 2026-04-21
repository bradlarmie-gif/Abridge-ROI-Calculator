import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { type ForecastState, VALUE_DOMAIN_LABELS } from "../types";
import { fmtCurrencyShort } from "./charts/shared";
import { DOMAIN_BADGE_CLASS } from "./constants";

const CARD_BG = "bg-[#FAF8F5]";
const CARD_BORDER = "border border-[#E8E2DA]";

interface Props {
  state: ForecastState;
}

function formatMetric(v: number | undefined, unitLabel?: string): string {
  if (v === undefined || v === null) return "—";
  const formatted = Math.abs(v) >= 100 ? Math.round(v).toLocaleString() : v.toFixed(2);
  return unitLabel ? `${formatted} ${unitLabel}` : formatted;
}

export function MeasuredOutcomesPanel({ state }: Props) {
  const [open, setOpen] = useState(true);

  const measureDrivers = useMemo(
    () => state.valueDrivers.filter((d) => d.source === "measure"),
    [state.valueDrivers],
  );

  const adjusted = useMemo(
    () =>
      measureDrivers.map((d) => ({
        driver: d,
        adjustedValue:
          (d.projectedDelta || 0) * (d.confidence / 100) * (d.realizationPct / 100),
      })),
    [measureDrivers],
  );

  const total = useMemo(
    () => adjusted.reduce((acc, row) => acc + row.adjustedValue, 0),
    [adjusted],
  );

  if (state.importSource.type !== "measure" || measureDrivers.length === 0) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 }}
      className={`${CARD_BG} ${CARD_BORDER} rounded-xl p-4 md:p-5 mb-8`}
      data-testid="section-measured-outcomes"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3"
        data-testid="btn-toggle-measured-outcomes"
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#EA2C00]" />
          <h2 className="text-[11px] uppercase tracking-[2px] text-[#666666] font-semibold">
            What We&apos;ve Proven
          </h2>
          <Badge className="text-[9px] uppercase tracking-wide bg-[#FBE9E2] text-[#A82200] hover:bg-[#FBE9E2]">
            from Measure
          </Badge>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-[#666666] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="overflow-x-auto mt-4 rounded-lg border border-[#E8E2DA] bg-white">
              <table className="w-full text-sm" data-testid="table-measured-outcomes">
                <thead className="bg-[#FAFAFA] border-b border-[#E8E2DA]">
                  <tr
                    className="text-[10px] uppercase text-[#888888]"
                    style={{ letterSpacing: "1.5px" }}
                  >
                    <th className="text-left font-semibold px-4 py-2.5">Outcome</th>
                    <th className="text-left font-semibold px-3 py-2.5">Domain</th>
                    <th className="text-right font-semibold px-3 py-2.5">Before → After</th>
                    <th className="text-right font-semibold px-4 py-2.5">Annual Value</th>
                  </tr>
                </thead>
                <tbody>
                  {adjusted.map(({ driver: d, adjustedValue }, i) => (
                    <tr
                      key={d.id}
                      className={i % 2 === 0 ? "bg-white" : "bg-[#FCFAF8]"}
                      data-testid={`row-measured-${d.id}`}
                    >
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-[#1A1A1A]">{d.label}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge
                          variant="outline"
                          className={`text-[10px] uppercase tracking-wide ${DOMAIN_BADGE_CLASS[d.domain]}`}
                        >
                          {VALUE_DOMAIN_LABELS[d.domain]}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs font-mono text-[#1A1A1A]">
                        <span className="text-[#666666]">
                          {formatMetric(d.baselineValue, d.unitLabel)}
                        </span>
                        <span className="text-[#999999] mx-1.5">→</span>
                        <span className="font-semibold">
                          {formatMetric(d.measuredValue, d.unitLabel)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="font-semibold text-[#1A1A1A]">
                          {fmtCurrencyShort(adjustedValue)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[#FAFAFA] border-t border-[#E8E2DA]">
                  <tr>
                    <td colSpan={3} className="px-4 py-2.5 text-right">
                      <span
                        className="text-[10px] uppercase tracking-widest text-[#666666] font-semibold"
                      >
                        Total estimated annual value
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span
                        className="text-base font-bold text-[#EA2C00] font-abridge"
                        data-testid="text-measured-total"
                      >
                        {fmtCurrencyShort(total)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="text-[10px] text-[#999999] mt-2">
              Annual value = projected Δ × confidence × realization, summed across measured drivers.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
