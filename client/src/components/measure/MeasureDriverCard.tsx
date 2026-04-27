import { useMemo } from "react";
import { Plus, Trash2, ChevronDown, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import type { ExploreDriver } from "@/lib/exploreDrivers";
import { getRealizedValueForEntry, getEffectiveWithWithout, type MeasureDriverEntry } from "@/lib/measureCalculator";
import MeasureTrendChart from "./MeasureTrendChart";

interface MeasureDriverCardProps {
  driver: ExploreDriver;
  entry: MeasureDriverEntry;
  onUpdate: (updates: Partial<MeasureDriverEntry>) => void;
  onRemove: () => void;
}

export default function MeasureDriverCard({ driver, entry, onUpdate, onRemove }: MeasureDriverCardProps) {
  const isQuantifiable = driver.visibility === 'quantified' && Boolean(driver.measureDefaults);
  const md = driver.measureDefaults;

  const sortedMonthly = useMemo(() => {
    return (entry.monthlyData || [])
      .map((point, originalIdx) => ({ point, originalIdx }))
      .sort((a, b) => a.point.month.localeCompare(b.point.month));
  }, [entry.monthlyData]);

  const sortedPoints = sortedMonthly.map(s => s.point);
  const latestMonthlyPoint = sortedPoints.length > 0 ? sortedPoints[sortedPoints.length - 1] : null;

  const { withAbridge: effectiveWithAbridge, withoutAbridge: effectiveWithoutAbridge } = getEffectiveWithWithout(entry);
  const delta = effectiveWithAbridge - effectiveWithoutAbridge;
  const realizedValue = getRealizedValueForEntry(entry, isQuantifiable);
  void effectiveWithoutAbridge;

  const formatCurrency = (n: number) => '$' + Math.round(n).toLocaleString();
  const formatNumber = (n: number) => n.toLocaleString();

  const addMonthlyRow = () => {
    let nextMonth: string;
    if (sortedMonthly.length === 0) {
      const now = new Date();
      nextMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    } else {
      const earliest = sortedMonthly[0].point.month;
      const [y, m] = earliest.split('-').map(Number);
      const d = new Date(y, m - 2, 1);
      nextMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    const seed = entry.withAbridge !== 0 || entry.withoutAbridge !== 0
      ? { withAbridge: entry.withAbridge, withoutAbridge: entry.withoutAbridge }
      : { withAbridge: 0, withoutAbridge: 0 };
    const newPoint = { month: nextMonth, ...seed };
    onUpdate({ monthlyData: [...(entry.monthlyData || []), newPoint] });
  };

  const updateMonthlyRow = (index: number, updates: Partial<{ month: string; withAbridge: number; withoutAbridge: number }>) => {
    const next = [...(entry.monthlyData || [])];
    next[index] = { ...next[index], ...updates };
    onUpdate({ monthlyData: next });
  };

  const removeMonthlyRow = (index: number) => {
    const next = [...(entry.monthlyData || [])];
    next.splice(index, 1);
    onUpdate({ monthlyData: next });
  };

  const switchToMonthlyMode = () => {
    if (entry.isMonthlyMode) return;
    if (!entry.monthlyData || entry.monthlyData.length === 0) {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      onUpdate({
        isMonthlyMode: true,
        monthlyData: [{
          month: currentMonth,
          withAbridge: entry.withAbridge,
          withoutAbridge: entry.withoutAbridge,
        }],
      });
    } else {
      onUpdate({ isMonthlyMode: true });
    }
  };

  const monthlyEntrySection = (
    <div className="space-y-4">
      <div className="bg-[#F5F0EB] rounded-lg p-4">
        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Monthly entries</p>
        {(entry.monthlyData || []).length === 0 && (
          <p className="text-sm text-[#666666] italic mb-3" data-testid={`monthly-empty-${driver.id}`}>No monthly data yet. Add a month to begin tracking.</p>
        )}
        <div className="space-y-2">
          {sortedMonthly.map(({ point, originalIdx }, sortedIdx) => {
            const rowDelta = point.withAbridge - point.withoutAbridge;
            return (
              <div key={`row-${originalIdx}`} className="bg-white rounded-md p-3 grid grid-cols-12 gap-2 items-center">
                <input
                  type="month"
                  value={point.month}
                  onChange={(e) => updateMonthlyRow(originalIdx, { month: e.target.value })}
                  className="col-span-3 h-9 px-2 border border-[#E5E5E5] rounded text-sm focus:border-[#EA2C00] outline-none"
                  data-testid={`month-${driver.id}-${sortedIdx}`}
                />
                <div className="col-span-3">
                  <FormattedNumberInput
                    value={point.withoutAbridge}
                    onChange={(v: number) => updateMonthlyRow(originalIdx, { withoutAbridge: v })}
                    className="h-9 bg-white text-sm"
                    placeholder="Without"
                    data-testid={`monthly-without-${driver.id}-${sortedIdx}`}
                  />
                </div>
                <div className="col-span-3">
                  <FormattedNumberInput
                    value={point.withAbridge}
                    onChange={(v: number) => updateMonthlyRow(originalIdx, { withAbridge: v })}
                    className="h-9 bg-white text-sm"
                    placeholder="With"
                    data-testid={`monthly-with-${driver.id}-${sortedIdx}`}
                  />
                </div>
                <div className="col-span-2 text-xs text-[#666666] text-right">
                  Δ {rowDelta >= 0 ? '+' : ''}{formatNumber(rowDelta)}
                </div>
                <button
                  onClick={() => removeMonthlyRow(originalIdx)}
                  className="col-span-1 p-1 text-[#888888] hover:text-[#EA2C00] flex justify-end"
                  data-testid={`remove-month-${driver.id}-${sortedIdx}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
        <button
          onClick={addMonthlyRow}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#EA2C00] hover:text-[#EA2C00]/80"
          data-testid={`add-month-${driver.id}`}
        >
          <Plus className="w-4 h-4" /> Add a month
        </button>
      </div>

      {isQuantifiable && md && (
        <MeasureTrendChart data={sortedPoints} unit={md.deltaUnit} />
      )}
      {!isQuantifiable && (
        <MeasureTrendChart data={sortedPoints} unit="value" />
      )}

      {latestMonthlyPoint && (
        <div className="bg-[#F5F0EB] rounded-lg p-3 text-xs text-[#666666]">
          Latest entry ({latestMonthlyPoint.month}) feeds the realized impact calculation below.
          Latest Δ: {delta >= 0 ? '+' : ''}{formatNumber(delta)} {md?.deltaUnit ?? 'value'}.
        </div>
      )}
    </div>
  );

  const tabSwitcher = (
    <div className="flex items-center gap-1 p-1 bg-[#F5F0EB] rounded-lg w-fit">
      <button
        onClick={() => onUpdate({ isMonthlyMode: false })}
        className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
          !entry.isMonthlyMode ? 'bg-white text-black shadow-sm' : 'text-[#888888] hover:text-black'
        }`}
        data-testid={`tab-snapshot-${driver.id}`}
      >
        Snapshot
      </button>
      <button
        onClick={switchToMonthlyMode}
        className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
          entry.isMonthlyMode ? 'bg-white text-black shadow-sm' : 'text-[#888888] hover:text-black'
        }`}
        data-testid={`tab-monthly-${driver.id}`}
      >
        Monthly trend
      </button>
    </div>
  );

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
            {entry.isMonthlyMode && (
              <span
                className="text-[10px] font-medium text-[#888888] bg-[#F5F0EB] px-1.5 py-0.5 rounded"
                title="Tracked monthly"
                data-testid={`badge-monthly-${driver.id}`}
              >
                monthly
              </span>
            )}
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
              {tabSwitcher}

              {isQuantifiable && md ? (
                <>
                  {!entry.isMonthlyMode ? (
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
                  ) : (
                    monthlyEntrySection
                  )}

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
                  {!entry.isMonthlyMode ? (
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
                  ) : (
                    monthlyEntrySection
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
