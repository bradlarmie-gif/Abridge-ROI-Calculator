import { ChevronDown, Trash2, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import type { ExploreDriver } from "@/lib/exploreDrivers";
import type { MeasureDriverEntry } from "@/lib/measureCalculator";

interface MeasureDriverCardProps {
  driver: ExploreDriver;
  entry: MeasureDriverEntry;
  onUpdate: (updates: Partial<MeasureDriverEntry>) => void;
  onRemove: () => void;
}

export default function MeasureDriverCard({ driver, entry, onUpdate, onRemove }: MeasureDriverCardProps) {
  const isQuantifiable = driver.visibility === 'quantified' && Boolean(driver.measureDefaults);
  const md = driver.measureDefaults;

  const delta = entry.withAbridge - entry.withoutAbridge;
  const realizedValue = isQuantifiable
    ? Math.round(delta * entry.valuePerUnit * (entry.attributionPercent / 100) * (entry.realizationPercent / 100))
    : 0;

  const formatCurrency = (n: number) => '$' + Math.round(n).toLocaleString();
  const formatNumber = (n: number) => n.toLocaleString();

  return (
    <div>
      <div className={`w-full p-4 text-left transition-all ${
        entry.expanded ? "bg-white rounded-t-lg border border-[#E5E5E5] border-b-0" : "bg-white rounded-lg border border-[#E5E5E5] hover:border-[#D1D5DB]"
      }`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-black">{driver.label}</p>
              {isQuantifiable && (
                <span
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#F5F0EB] text-[10px] font-semibold text-[#888888]"
                  title="Quantifiable — carries dollar value"
                  data-testid={`badge-quantifiable-${driver.id}`}
                >
                  $
                </span>
              )}
            </div>
            <p className="text-sm text-[#888888] mt-0.5">{driver.shortDescription}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isQuantifiable && !entry.expanded && (
              <span className="text-sm font-semibold text-[#EA2C00]">
                {realizedValue !== 0 ? formatCurrency(realizedValue) : '—'}
              </span>
            )}
            {!isQuantifiable && !entry.expanded && (
              <span className="text-xs text-[#888888] italic">Qualitative</span>
            )}
            <button
              onClick={() => onUpdate({ expanded: !entry.expanded })}
              className="p-1 hover:bg-[#F5F0EB] rounded transition-colors"
              data-testid={`button-expand-${driver.id}`}
            >
              <ChevronDown className={`w-5 h-5 text-[#888888] transition-transform ${entry.expanded ? 'rotate-0' : '-rotate-90'}`} />
            </button>
            <button
              onClick={onRemove}
              className="p-1 hover:bg-[#FCE8E2] rounded transition-colors text-[#888888] hover:text-[#EA2C00]"
              data-testid={`button-remove-${driver.id}`}
              title="Stop tracking this driver"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {entry.expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-b-lg border border-[#E5E5E5] border-t-0 p-5 space-y-5">
              {isQuantifiable && md ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-[#888888] uppercase tracking-wide mb-1.5 block">
                        Without Abridge
                      </label>
                      <FormattedNumberInput
                        value={entry.withoutAbridge}
                        onChange={(v: number) => onUpdate({ withoutAbridge: v })}
                        className="h-11 bg-white"
                        data-testid={`input-without-${driver.id}`}
                      />
                      <p className="text-xs text-[#888888] mt-1">{md.deltaLabel}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[#EA2C00] uppercase tracking-wide mb-1.5 block">
                        With Abridge
                      </label>
                      <FormattedNumberInput
                        value={entry.withAbridge}
                        onChange={(v: number) => onUpdate({ withAbridge: v })}
                        className="h-11 bg-white"
                        data-testid={`input-with-${driver.id}`}
                      />
                      <p className="text-xs text-[#888888] mt-1">Δ {delta >= 0 ? '+' : ''}{formatNumber(delta)} {md.deltaUnit}</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[#888888] uppercase tracking-wide mb-1.5 block">
                      {md.valuePerUnitLabel}
                    </label>
                    <div className="relative">
                      {md.valuePerUnitPrefix && (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#888888] z-10">{md.valuePerUnitPrefix}</span>
                      )}
                      <FormattedNumberInput
                        value={entry.valuePerUnit}
                        onChange={(v: number) => onUpdate({ valuePerUnit: v })}
                        className={`h-11 bg-white ${md.valuePerUnitPrefix ? 'pl-7' : ''}`}
                        data-testid={`input-value-per-unit-${driver.id}`}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-[#888888] uppercase tracking-wide">
                        Abridge Attribution
                        <Info className="inline w-3 h-3 ml-1 text-[#AAAAAA]" />
                      </label>
                      <span className="text-sm font-semibold text-black">{entry.attributionPercent}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={entry.attributionPercent}
                      onChange={(e) => onUpdate({ attributionPercent: Number(e.target.value) })}
                      className="w-full accent-[#EA2C00]"
                      data-testid={`slider-attribution-${driver.id}`}
                    />
                    <p className="text-xs text-[#888888] mt-1">Of the observed change, what share is attributable to Abridge? Lower this if other initiatives share credit.</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-[#888888] uppercase tracking-wide">
                        Realization Rate
                      </label>
                      <span className="text-sm font-semibold text-black">{entry.realizationPercent}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={entry.realizationPercent}
                      onChange={(e) => onUpdate({ realizationPercent: Number(e.target.value) })}
                      className="w-full accent-[#EA2C00]"
                      data-testid={`slider-realization-${driver.id}`}
                    />
                    <p className="text-xs text-[#888888] mt-1">What share of gross opportunity converts to captured value (workflow, payer mix, coder judgment).</p>
                  </div>

                  <div className="bg-[#F5F0EB] rounded-lg p-4">
                    <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">Realized Impact</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#666666]">Δ {md.deltaUnit}</span>
                        <span className="font-medium text-black">{formatNumber(delta)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#666666]">× {md.valuePerUnitLabel}</span>
                        <span className="font-medium text-black">{md.valuePerUnitPrefix || ''}{formatNumber(entry.valuePerUnit)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#666666]">× Attribution</span>
                        <span className="font-medium text-black">{entry.attributionPercent}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#666666]">× Realization</span>
                        <span className="font-medium text-black">{entry.realizationPercent}%</span>
                      </div>
                      <div className="h-px bg-[#E5E5E5] my-2" />
                      <div className="flex justify-between">
                        <span className="font-semibold text-black">Realized impact</span>
                        <span className="font-bold text-[#EA2C00]" data-testid={`text-realized-${driver.id}`}>{formatCurrency(realizedValue)}</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-[#888888] uppercase tracking-wide mb-1.5 block">
                        Without Abridge
                      </label>
                      <FormattedNumberInput
                        value={entry.withoutAbridge}
                        onChange={(v: number) => onUpdate({ withoutAbridge: v })}
                        className="h-11 bg-white"
                        data-testid={`input-without-${driver.id}`}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-[#EA2C00] uppercase tracking-wide mb-1.5 block">
                        With Abridge
                      </label>
                      <FormattedNumberInput
                        value={entry.withAbridge}
                        onChange={(v: number) => onUpdate({ withAbridge: v })}
                        className="h-11 bg-white"
                        data-testid={`input-with-${driver.id}`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[#888888] uppercase tracking-wide mb-1.5 block">
                      Notes
                    </label>
                    <textarea
                      value={entry.notes ?? ''}
                      onChange={(e) => onUpdate({ notes: e.target.value })}
                      placeholder="Qualitative observations about this outcome…"
                      className="w-full h-20 bg-white border border-[#E5E5E5] rounded-lg p-3 text-sm focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00]/20 outline-none resize-none"
                      data-testid={`textarea-notes-${driver.id}`}
                    />
                  </div>

                  <div className="bg-[#F5F0EB] rounded-lg p-3">
                    <p className="text-xs text-[#666666] italic">
                      Qualitative outcome — tracked for evidence but not modeled financially.
                    </p>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
