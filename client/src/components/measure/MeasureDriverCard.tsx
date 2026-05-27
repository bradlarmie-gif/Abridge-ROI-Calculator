import { useMemo } from "react";
import { Plus, Trash2, ChevronDown, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { EXPLORE_DRIVERS, type ExploreDriver } from "@/lib/exploreDrivers";
import { getRealizedValueForEntry, getEffectiveWithWithout, type MeasureDriverEntry, type EntryDataSource } from "@/lib/measureCalculator";
import MeasureTrendChart from "./MeasureTrendChart";
import EmDistributionInput from "./EmDistributionInput";

const PHASE_LABEL: Record<string, string> = {
  emerging: 'Emerging',
  demonstrated: 'Demonstrated',
  strategic: 'Strategic',
};

const PHASE_COLOR: Record<string, string> = {
  emerging: 'bg-amber-50 text-amber-700',
  demonstrated: 'bg-blue-50 text-blue-700',
  strategic: 'bg-purple-50 text-purple-700',
};

const SETTING_BADGE_LABEL: Record<string, string> = {
  outpatient: 'OP',
  ed: 'ED',
  inpatient: 'IP',
  nursing: 'Nsg',
};

interface MeasureDriverCardProps {
  driver: ExploreDriver;
  entry: MeasureDriverEntry;
  onUpdate: (updates: Partial<MeasureDriverEntry>) => void;
  onRemove: () => void;
  isMultiSetting?: boolean;
  abridgeEncounters?: number;
}

export default function MeasureDriverCard({ driver, entry, onUpdate, onRemove, isMultiSetting, abridgeEncounters }: MeasureDriverCardProps) {
  const isQuantifiable = driver.visibility === 'quantified' && Boolean(driver.measureDefaults);
  const md = driver.measureDefaults;
  const isPerEnc = Boolean(md?.isPerEncounterRate) && (abridgeEncounters ?? 0) > 0;

  const sortedMonthly = useMemo(() => {
    return (entry.monthlyData || [])
      .map((point, originalIdx) => ({ point, originalIdx }))
      .sort((a, b) => a.point.month.localeCompare(b.point.month));
  }, [entry.monthlyData]);

  const sortedPoints = sortedMonthly.map(s => s.point);
  const latestMonthlyPoint = sortedPoints.length > 0 ? sortedPoints[sortedPoints.length - 1] : null;

  const { withAbridge: effectiveWithAbridge, withoutAbridge: effectiveWithoutAbridge } = getEffectiveWithWithout(entry);
  const lowerIsBetter = md?.lowerIsBetter ?? false;
  const delta = lowerIsBetter ? effectiveWithoutAbridge - effectiveWithAbridge : effectiveWithAbridge - effectiveWithoutAbridge;
  const realizedValue = isPerEnc
    ? Math.round(delta * entry.valuePerUnit * abridgeEncounters! * (entry.attributionPercent / 100))
    : getRealizedValueForEntry({ ...entry, lowerIsBetter }, isQuantifiable);

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
    onUpdate({ monthlyData: [...(entry.monthlyData || []), { month: nextMonth, ...seed }] });
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
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    onUpdate({
      isMonthlyMode: true,
      monthlyData: (entry.monthlyData && entry.monthlyData.length > 0)
        ? entry.monthlyData
        : [{ month: currentMonth, withAbridge: entry.withAbridge, withoutAbridge: entry.withoutAbridge }],
    });
  };

  const monthlyEntrySection = (
    <div className="space-y-4">
      <div className="bg-[#F5F0EB] rounded-xl p-4">
        <p className="text-[11px] font-semibold text-[#888888] uppercase tracking-[1.5px] mb-3">Monthly entries</p>
        {(entry.monthlyData || []).length === 0 && (
          <p className="text-sm text-[#888888] italic mb-3">No monthly data yet. Add a month to begin tracking.</p>
        )}
        <div className="space-y-2">
          {sortedMonthly.map(({ point, originalIdx }, sortedIdx) => {
            const rowDelta = lowerIsBetter ? point.withoutAbridge - point.withAbridge : point.withAbridge - point.withoutAbridge;
            return (
              <div key={`row-${originalIdx}`} className="bg-white rounded-lg p-3 grid grid-cols-12 gap-2 items-center">
                <input
                  type="month"
                  value={point.month}
                  onChange={(e) => updateMonthlyRow(originalIdx, { month: e.target.value })}
                  className="col-span-3 h-9 px-2 border border-[#E5E5E5] rounded-lg text-sm focus:border-[#EA2C00] outline-none"
                  data-testid={`month-${driver.id}-${sortedIdx}`}
                />
                <div className="col-span-3">
                  <FormattedNumberInput
                    value={point.withoutAbridge}
                    onChange={(v: number) => updateMonthlyRow(originalIdx, { withoutAbridge: v })}
                    className="h-9 bg-white text-sm"
                    placeholder="Before"
                    data-testid={`monthly-without-${driver.id}-${sortedIdx}`}
                  />
                </div>
                <div className="col-span-3">
                  <FormattedNumberInput
                    value={point.withAbridge}
                    onChange={(v: number) => updateMonthlyRow(originalIdx, { withAbridge: v })}
                    className="h-9 bg-white text-sm"
                    placeholder="After"
                    data-testid={`monthly-with-${driver.id}-${sortedIdx}`}
                  />
                </div>
                <div className="col-span-2 text-xs text-[#888888] text-right tabular-nums">
                  {rowDelta >= 0 ? '+' : ''}{formatNumber(rowDelta)}
                </div>
                <button
                  onClick={() => removeMonthlyRow(originalIdx)}
                  className="col-span-1 p-1 text-[#BBBBBB] hover:text-[#EA2C00] flex justify-end transition-colors"
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
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#EA2C00] hover:text-[#EA2C00]/80 transition-colors"
          data-testid={`add-month-${driver.id}`}
        >
          <Plus className="w-4 h-4" /> Add a month
        </button>
      </div>

      {isQuantifiable && md ? (
        <MeasureTrendChart data={sortedPoints} unit={md.deltaUnit} />
      ) : (
        <MeasureTrendChart data={sortedPoints} unit="value" />
      )}

      {latestMonthlyPoint && (
        <p className="text-xs text-[#888888]">
          Latest entry ({latestMonthlyPoint.month}) used in calculation — Δ {delta >= 0 ? '+' : ''}{formatNumber(delta)} {md?.deltaUnit ?? 'value'}.
        </p>
      )}
    </div>
  );

  const tabSwitcher = (
    <div className="flex items-center gap-1 p-1 bg-[#F5F0EB] rounded-xl w-fit">
      <button
        onClick={() => onUpdate({ isMonthlyMode: false })}
        className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
          !entry.isMonthlyMode ? 'bg-white text-black shadow-sm' : 'text-[#888888] hover:text-black'
        }`}
        data-testid={`tab-snapshot-${driver.id}`}
      >
        Snapshot
      </button>
      <button
        onClick={switchToMonthlyMode}
        className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
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
      {/* Card header — always visible */}
      <div className={`w-full p-4 text-left transition-all ${
        entry.expanded
          ? "bg-white rounded-t-xl border border-[#E5E5E5] border-b-0"
          : "bg-white rounded-xl border border-[#E5E5E5] hover:border-[#D1D5DB]"
      }`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-black text-sm">{driver.label}</p>
              {isQuantifiable ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
                  Financial
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F5F0EB] text-[#888888] text-[10px] font-semibold">
                  Signal
                </span>
              )}
              {driver.measurePhase && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${PHASE_COLOR[driver.measurePhase]}`}>
                  {PHASE_LABEL[driver.measurePhase]}
                </span>
              )}
              {isMultiSetting && driver.settings.map(s => (
                <span key={s} className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#F0EBE4] text-[9px] font-bold text-[#8C7E6E] uppercase tracking-wide">
                  {SETTING_BADGE_LABEL[s] ?? s}
                </span>
              ))}
            </div>
            <p className="text-xs text-[#888888] mt-0.5 leading-relaxed">{driver.shortDescription}</p>
            {driver.prerequisites && driver.prerequisites.length > 0 && (
              <p className="text-[10px] text-[#AAAAAA] mt-0.5 italic">
                Builds on: {driver.prerequisites.map(pid => EXPLORE_DRIVERS.find(x => x.id === pid)?.label ?? pid).join(', ')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {entry.isMonthlyMode && (
              <span className="text-[10px] font-medium text-[#888888] bg-[#F5F0EB] px-1.5 py-0.5 rounded-md">
                monthly
              </span>
            )}
            {isQuantifiable && !entry.expanded && (
              <span className="text-sm font-bold text-[#EA2C00] tabular-nums">
                {realizedValue !== 0 ? formatCurrency(realizedValue) : '—'}
              </span>
            )}
            <button
              onClick={() => onUpdate({ expanded: !entry.expanded })}
              className="p-1.5 hover:bg-[#F5F0EB] rounded-lg transition-colors"
              data-testid={`button-expand-${driver.id}`}
            >
              <ChevronDown className={`w-4 h-4 text-[#AAAAAA] transition-transform duration-200 ${entry.expanded ? 'rotate-0' : '-rotate-90'}`} />
            </button>
            <button
              onClick={onRemove}
              className="p-1.5 hover:bg-[#FCE8E2] rounded-lg transition-colors text-[#BBBBBB] hover:text-[#EA2C00]"
              data-testid={`button-remove-${driver.id}`}
              title="Stop tracking this driver"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded body */}
      <AnimatePresence>
        {entry.expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-b-xl border border-[#E5E5E5] border-t-0 p-5 space-y-5">

              {isQuantifiable && md ? (
                <>
                  {/* E&M distribution drivers: replace before/after inputs + Financial Translation with EmDistributionInput */}
                  {md.emCodes ? (
                    <EmDistributionInput
                      codes={md.emCodes}
                      before={entry.distributionData?.before ?? {}}
                      after={entry.distributionData?.after ?? {}}
                      onBeforeChange={(before) => onUpdate({ distributionData: { before, after: entry.distributionData?.after ?? {} } })}
                      onAfterChange={(after) => onUpdate({ distributionData: { before: entry.distributionData?.before ?? {}, after } })}
                      driverId={driver.id}
                      highComplexityCodes={md.highComplexityCodes}
                    />
                  ) : (
                    <>
                      {tabSwitcher}

                      {!entry.isMonthlyMode ? (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-semibold text-[#888888] uppercase tracking-wide mb-1.5 block">
                              Before Abridge
                            </label>
                            <FormattedNumberInput
                              value={entry.withoutAbridge}
                              onChange={(v: number) => onUpdate({ withoutAbridge: v })}
                              className="h-10 bg-white"
                              data-testid={`input-without-${driver.id}`}
                            />
                            <p className="text-[11px] text-[#AAAAAA] mt-1">{md.deltaUnit}</p>
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-[#EA2C00] uppercase tracking-wide mb-1.5 block">
                              With Abridge
                            </label>
                            <FormattedNumberInput
                              value={entry.withAbridge}
                              onChange={(v: number) => onUpdate({ withAbridge: v })}
                              className="h-10 bg-white border-[#EA2C00]/30 focus:border-[#EA2C00]"
                              data-testid={`input-with-${driver.id}`}
                            />
                            <p className="text-[11px] text-[#AAAAAA] mt-1">
                              {delta !== 0 && (
                                <span className={delta > 0 ? 'text-emerald-600 font-medium' : 'text-red-500 font-medium'}>
                                  {lowerIsBetter
                                    ? `${delta > 0 ? '-' : '+'}${formatNumber(Math.abs(delta))} ${md.deltaUnit}`
                                    : `${delta > 0 ? '+' : ''}${formatNumber(delta)} ${md.deltaUnit}`}
                                </span>
                              )}
                              {delta === 0 && md.deltaUnit}
                            </p>
                          </div>
                        </div>
                      ) : (
                        monthlyEntrySection
                      )}

                      {md.isPerEncounterRate && (abridgeEncounters ?? 0) > 0 && (() => {
                        const latestWith = entry.isMonthlyMode && entry.monthlyData?.length
                          ? [...entry.monthlyData].sort((a, b) => a.month.localeCompare(b.month)).at(-1)!.withAbridge
                          : entry.withAbridge;
                        const latestWithout = entry.isMonthlyMode && entry.monthlyData?.length
                          ? [...entry.monthlyData].sort((a, b) => a.month.localeCompare(b.month)).at(-1)!.withoutAbridge
                          : entry.withoutAbridge;
                        const encDelta = latestWith - latestWithout;
                        if (encDelta === 0) return null;
                        return (
                          <div className="mt-2 px-3 py-2 bg-[#F5F0EB] rounded-lg text-[11px] text-[#666666]">
                            {Math.abs(encDelta).toFixed(2)} wRVUs/enc × {abridgeEncounters!.toLocaleString()} Abridge encounters
                            <span className="font-semibold text-black ml-1">
                              = {Math.round(Math.abs(encDelta) * abridgeEncounters!).toLocaleString()} total wRVUs/yr
                            </span>
                          </div>
                        );
                      })()}

                      {/* Benchmark hint */}
                      {md.benchmarkHint && (
                        <div className="flex items-start gap-2 bg-blue-50 rounded-lg px-3 py-2">
                          <Info className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
                          <p className="text-[11px] text-blue-600">{md.benchmarkHint}</p>
                        </div>
                      )}

                      {/* Conversion factor */}
                      <div>
                        <label className="text-[11px] font-semibold text-[#888888] uppercase tracking-wide mb-1.5 block">
                          {md.valuePerUnitLabel}
                        </label>
                        <div className="relative">
                          {md.valuePerUnitPrefix && (
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#888888] z-10 pointer-events-none">{md.valuePerUnitPrefix}</span>
                          )}
                          <FormattedNumberInput
                            value={entry.valuePerUnit}
                            onChange={(v: number) => onUpdate({ valuePerUnit: v })}
                            className={`h-10 bg-white ${md.valuePerUnitPrefix ? 'pl-7' : ''}`}
                            data-testid={`input-value-per-unit-${driver.id}`}
                          />
                        </div>
                      </div>

                      {/* Scale input (HAI rate drivers) */}
                      {md.scaleInput && (
                        <div>
                          <label className="text-[11px] font-semibold text-[#888888] uppercase tracking-wide mb-1.5 block">
                            {md.scaleInput.label}
                          </label>
                          <div className="relative">
                            <FormattedNumberInput
                              value={entry.scaleValue ?? md.scaleInput.defaultValue}
                              onChange={(v: number) => onUpdate({ scaleValue: v })}
                              className="h-10 bg-white"
                              data-testid={`input-scale-${driver.id}`}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#AAAAAA] pointer-events-none">
                              {md.scaleInput.unit}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Attribution — single slider */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[11px] font-semibold text-[#888888] uppercase tracking-wide flex items-center gap-1">
                            Abridge Attribution
                            <Info className="w-3 h-3 text-[#CCCCCC]" />
                          </label>
                          <span className="text-sm font-bold text-black tabular-nums">{entry.attributionPercent}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={entry.attributionPercent}
                          onChange={(e) => onUpdate({ attributionPercent: Number(e.target.value) })}
                          className="w-full accent-[#EA2C00] h-1.5 cursor-pointer"
                          data-testid={`slider-attribution-${driver.id}`}
                        />
                        <p className="text-[11px] text-[#AAAAAA] mt-1.5">Lower if other initiatives share credit for this outcome.</p>
                      </div>

                      {/* Realized impact summary */}
                      {delta !== 0 && (
                        <div className="bg-[#FAFAF8] border border-[#E8E8E8] rounded-xl p-4">
                          <p className="text-[11px] font-semibold text-[#888888] uppercase tracking-[1.5px] mb-3">Financial Translation</p>
                          <div className="space-y-1.5 text-sm">
                            <div className="flex justify-between items-center">
                              <span className="text-[#888888]">{lowerIsBetter ? 'Improvement' : 'Δ'} {md.deltaUnit}</span>
                              <span className="font-medium text-black tabular-nums">{delta >= 0 ? '+' : ''}{formatNumber(delta)}</span>
                            </div>
                            {isPerEnc && (
                              <div className="flex justify-between items-center">
                                <span className="text-[#888888]">× Abridge encounters</span>
                                <span className="font-medium text-black tabular-nums">{abridgeEncounters!.toLocaleString()}</span>
                              </div>
                            )}
                            {md.scaleInput && (
                              <div className="flex justify-between items-center">
                                <span className="text-[#888888]">× {md.scaleInput.label} ÷ {md.scaleInput.divisor}</span>
                                <span className="font-medium text-black tabular-nums">
                                  {(entry.scaleValue ?? md.scaleInput.defaultValue).toLocaleString()} ÷ {md.scaleInput.divisor}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between items-center">
                              <span className="text-[#888888]">× {md.valuePerUnitLabel}</span>
                              <span className="font-medium text-black tabular-nums">{md.valuePerUnitPrefix || ''}{entry.valuePerUnit.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[#888888]">× Attribution</span>
                              <span className="font-medium text-black tabular-nums">{entry.attributionPercent}%</span>
                            </div>
                            <div className="h-px bg-[#E8E8E8] my-1" />
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-black">Realized value</span>
                              <span className="font-bold text-[#EA2C00] text-base tabular-nums" data-testid={`text-realized-${driver.id}`}>
                                {formatCurrency(realizedValue)}
                              </span>
                            </div>
                          </div>
                          <p className="text-[10px] text-[#AAAAAA] mt-3 italic">
                            This represents what Abridge's impact could mean financially — not a guarantee of realized revenue.
                          </p>
                        </div>
                      )}

                      {/* Notes — financial drivers */}
                      <div>
                        <label className="text-[11px] font-semibold text-[#888888] uppercase tracking-wide mb-1.5 block">
                          Context Notes
                        </label>
                        <textarea
                          value={entry.notes ?? ''}
                          onChange={(e) => onUpdate({ notes: e.target.value })}
                          placeholder="Where did this data come from? Any caveats, exclusions, or context the executive team should know?"
                          className="w-full h-16 bg-[#FAFAF8] border border-[#E5E5E5] rounded-xl p-3 text-sm focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00]/20 outline-none resize-none"
                          data-testid={`textarea-notes-${driver.id}`}
                        />
                      </div>
                    </>
                  )}

                  {/* Source + timestamp — shown for ALL financial drivers */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-[#888888] uppercase tracking-wide mb-1.5 block">
                        Data Source
                      </label>
                      <select
                        value={entry.entryDataSource ?? ''}
                        onChange={(e) => onUpdate({ entryDataSource: (e.target.value as EntryDataSource) || undefined })}
                        className="w-full h-9 bg-[#FAFAF8] border border-[#E5E5E5] rounded-xl px-3 text-sm text-[#444] focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00]/20 outline-none"
                        data-testid={`select-source-${driver.id}`}
                      >
                        <option value="">Not specified</option>
                        <option value="ehr">EHR</option>
                        <option value="survey">Survey</option>
                        <option value="admin_data">Admin data</option>
                        <option value="chart_review">Chart review</option>
                        <option value="manual_entry">Manual entry</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-[#888888] uppercase tracking-wide mb-1.5 block">
                        Measured On
                      </label>
                      <input
                        type="date"
                        value={entry.measuredAt ?? ''}
                        onChange={(e) => onUpdate({ measuredAt: e.target.value || undefined })}
                        className="w-full h-9 bg-[#FAFAF8] border border-[#E5E5E5] rounded-xl px-3 text-sm text-[#444] focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00]/20 outline-none"
                        data-testid={`input-measured-at-${driver.id}`}
                      />
                    </div>
                  </div>
                </>
              ) : (
                /* Signal / qualitative driver */
                <>
                  {tabSwitcher}

                  {!entry.isMonthlyMode ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-[#888888] uppercase tracking-wide mb-1.5 block">
                          Before Abridge
                        </label>
                        <FormattedNumberInput
                          value={entry.withoutAbridge}
                          onChange={(v: number) => onUpdate({ withoutAbridge: v })}
                          className="h-10 bg-white"
                          data-testid={`input-without-${driver.id}`}
                        />
                        {md?.deltaUnit && <p className="text-[11px] text-[#AAAAAA] mt-1">{md.deltaUnit}</p>}
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-[#EA2C00] uppercase tracking-wide mb-1.5 block">
                          With Abridge
                        </label>
                        <FormattedNumberInput
                          value={entry.withAbridge}
                          onChange={(v: number) => onUpdate({ withAbridge: v })}
                          className="h-10 bg-white"
                          data-testid={`input-with-${driver.id}`}
                        />
                        <p className="text-[11px] text-[#AAAAAA] mt-1">
                          {delta !== 0 ? (
                            <span className={delta > 0 ? 'text-emerald-600 font-medium' : 'text-red-500 font-medium'}>
                              {lowerIsBetter
                                ? `↓ ${formatNumber(Math.abs(delta))}${md?.deltaUnit ? ` ${md.deltaUnit}` : ''}`
                                : `↑ ${formatNumber(delta)}${md?.deltaUnit ? ` ${md.deltaUnit}` : ''}`}
                            </span>
                          ) : md?.deltaUnit ? md.deltaUnit : null}
                        </p>
                      </div>
                    </div>
                  ) : (
                    monthlyEntrySection
                  )}

                  <div>
                    <label className="text-[11px] font-semibold text-[#888888] uppercase tracking-wide mb-1.5 block">
                      Notes
                    </label>
                    <textarea
                      value={entry.notes ?? ''}
                      onChange={(e) => onUpdate({ notes: e.target.value })}
                      placeholder="What are you observing? What's the story behind this signal?"
                      className="w-full h-20 bg-[#FAFAF8] border border-[#E5E5E5] rounded-xl p-3 text-sm focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00]/20 outline-none resize-none"
                      data-testid={`textarea-notes-${driver.id}`}
                    />
                  </div>

                  {/* Source + timestamp */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-[#888888] uppercase tracking-wide mb-1.5 block">
                        Data Source
                      </label>
                      <select
                        value={entry.entryDataSource ?? ''}
                        onChange={(e) => onUpdate({ entryDataSource: (e.target.value as EntryDataSource) || undefined })}
                        className="w-full h-9 bg-[#FAFAF8] border border-[#E5E5E5] rounded-xl px-3 text-sm text-[#444] focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00]/20 outline-none"
                        data-testid={`select-source-${driver.id}`}
                      >
                        <option value="">Not specified</option>
                        <option value="ehr">EHR</option>
                        <option value="survey">Survey</option>
                        <option value="admin_data">Admin data</option>
                        <option value="chart_review">Chart review</option>
                        <option value="manual_entry">Manual entry</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-[#888888] uppercase tracking-wide mb-1.5 block">
                        Measured On
                      </label>
                      <input
                        type="date"
                        value={entry.measuredAt ?? ''}
                        onChange={(e) => onUpdate({ measuredAt: e.target.value || undefined })}
                        className="w-full h-9 bg-[#FAFAF8] border border-[#E5E5E5] rounded-xl px-3 text-sm text-[#444] focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00]/20 outline-none"
                        data-testid={`input-measured-at-${driver.id}`}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-[#AAAAAA]">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#AAAAAA] flex-shrink-0" />
                    Signal tracked — adds qualitative evidence, not modeled financially.
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
