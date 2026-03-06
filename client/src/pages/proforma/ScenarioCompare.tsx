import { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Download, Plus, Pencil, Copy, EyeOff, Trophy, TrendingUp, Clock, DollarSign, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ComposedChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import type { ProformaSettingSnapshot, ProformaConfig, ProformaScenario, ProformaSummary, ProformaCashFlowRow } from "./proformaTypes";
import { SCENARIO_COLORS, SCENARIO_DASHES, MAX_SCENARIOS, SETTING_LABELS, SETTING_UNIT_LABELS } from "./proformaTypes";
import { buildMonthlyCashFlows, groupByQuarter, calculateProformaSummary, getYearlySummary, getContractStartDate } from "@/lib/proformaCalculations";
import { useIsMobile } from "@/hooks/use-mobile";

function fmt(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000).toLocaleString()}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

function fmtNum(n: number) {
  return n.toLocaleString();
}

function getPricingTag(settings: ProformaSettingSnapshot[]): string {
  const models = new Set(settings.map(s => s.pricingModel || "perUnit"));
  if (models.size > 1) return "Mixed";
  const model = models.values().next().value;
  if (model === "annualFlat") return "Annual License";
  if (model === "perEncounter") return "Per Encounter";
  return "Per Provider";
}

function getPricingLabel(settings: ProformaSettingSnapshot[]): string {
  if (settings.length === 0) return "—";
  const parts = settings.map(s => {
    const pm = s.pricingModel || "perUnit";
    if (pm === "annualFlat") return `Enterprise @ ${fmt(s.annualLicenseFee || 0)}/yr`;
    if (pm === "perEncounter") return `Per Encounter @ ${fmt(s.costPerEncounter || 0)}`;
    return `Per Provider @ ${fmt(s.costPerUnit)}/mo`;
  });
  const unique = [...new Set(parts)];
  return unique.join("; ");
}

function getSettingsSummary(settings: ProformaSettingSnapshot[]): string {
  return settings.map(s => {
    const label = s.careSetting === "ed" ? "ED" : s.careSetting === "outpatient" ? "OP" : s.careSetting === "inpatient" ? "IP" : "Nursing";
    return label;
  }).join(" + ");
}

function getProviderRange(settings: ProformaSettingSnapshot[]): string {
  const pilot = settings.reduce((s, v) => s + v.providerCount, 0);
  const full = settings.reduce((s, v) => s + v.fullScaleProviders, 0);
  return `${fmtNum(pilot)} → ${fmtNum(full)}`;
}

interface ScenarioData {
  scenario: ProformaScenario;
  cashFlows: ProformaCashFlowRow[];
  summary: ProformaSummary;
  yearlyData: ReturnType<typeof getYearlySummary>;
  chartData: { label: string; total: number }[];
}

interface ScenarioCompareProps {
  scenarios: ProformaScenario[];
  currentSettings: ProformaSettingSnapshot[];
  currentConfig: ProformaConfig;
  onBack: () => void;
  onEditScenario: (id: string) => void;
  onDuplicateScenario: (id: string) => void;
  onDeleteScenario: (id: string) => void;
  onExportComparisonPDF?: () => void;
  onAddScenario: () => void;
}

export default function ScenarioCompare({
  scenarios,
  currentSettings,
  currentConfig,
  onBack,
  onEditScenario,
  onDuplicateScenario,
  onDeleteScenario,
  onExportComparisonPDF,
  onAddScenario,
}: ScenarioCompareProps) {
  const isMobile = useIsMobile();
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [mobileActiveIdx, setMobileActiveIdx] = useState(0);

  const visibleScenarios = scenarios.filter(s => !hiddenIds.has(s.id));

  const scenarioData = useMemo<ScenarioData[]>(() => {
    return visibleScenarios.map(sc => {
      const cf = buildMonthlyCashFlows(sc.settings, sc.config);
      const sum = calculateProformaSummary(sc.settings, sc.config, cf);
      const yearly = getYearlySummary(cf, sc.settings, getContractStartDate());
      const grouped = groupByQuarter(cf, getContractStartDate());
      const chartData = grouped.map(row => ({
        label: row.label,
        total: row.totalValue,
      }));
      return { scenario: sc, cashFlows: cf, summary: sum, yearlyData: yearly, chartData };
    });
  }, [visibleScenarios]);

  const toggleHide = (id: string) => {
    setHiddenIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const colCount = scenarioData.length;

  const kpis = useMemo(() => {
    if (colCount === 0) return [];
    const rows = [
      {
        label: "3-Year Net Value",
        icon: DollarSign,
        values: scenarioData.map(d => d.summary.termNet),
        format: (v: number) => fmt(v),
        higherIsBetter: true,
      },
      {
        label: "Value-to-Cost",
        icon: TrendingUp,
        values: scenarioData.map(d => d.summary.valueToCost),
        format: (v: number) => `${v.toFixed(1)}x`,
        higherIsBetter: true,
      },
      {
        label: "Payback",
        icon: Clock,
        values: scenarioData.map(d => d.summary.paybackMonth ?? 999),
        format: (v: number) => v >= 999 ? "—" : `${v} mo`,
        higherIsBetter: false,
      },
      {
        label: "Annual Value at Scale",
        icon: BarChart3,
        values: scenarioData.map(d => d.summary.runRateValue),
        format: (v: number) => fmt(v),
        higherIsBetter: true,
      },
    ];

    return rows.map(row => {
      const bestIdx = row.higherIsBetter
        ? row.values.indexOf(Math.max(...row.values))
        : row.values.indexOf(Math.min(...row.values));
      const baseValue = row.values[0];
      const deltas = row.values.map((v, i) => i === 0 ? null : v - baseValue);
      return { ...row, bestIdx, deltas };
    });
  }, [scenarioData, colCount]);

  const recommendation = useMemo(() => {
    if (colCount < 2) return null;
    const highestROIIdx = scenarioData.reduce((best, d, i) => d.summary.valueToCost > scenarioData[best].summary.valueToCost ? i : best, 0);
    const fastestPaybackIdx = scenarioData.reduce((best, d, i) => {
      const curr = d.summary.paybackMonth ?? 999;
      const bestVal = scenarioData[best].summary.paybackMonth ?? 999;
      return curr < bestVal ? i : best;
    }, 0);
    const highestNetIdx = scenarioData.reduce((best, d, i) => d.summary.termNet > scenarioData[best].summary.termNet ? i : best, 0);

    return {
      highestROI: { name: scenarioData[highestROIIdx].scenario.name, value: `${scenarioData[highestROIIdx].summary.valueToCost.toFixed(1)}x` },
      fastestPayback: { name: scenarioData[fastestPaybackIdx].scenario.name, value: scenarioData[fastestPaybackIdx].summary.paybackMonth ? `${scenarioData[fastestPaybackIdx].summary.paybackMonth} mo` : "—" },
      highestNet: { name: scenarioData[highestNetIdx].scenario.name, value: fmt(scenarioData[highestNetIdx].summary.termNet) },
    };
  }, [scenarioData, colCount]);

  if (scenarios.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <BarChart3 className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-neutral-900 mb-2">No scenarios saved yet</h2>
          <p className="text-sm text-neutral-500 mb-6">Build your proforma and save it as a scenario to start comparing approaches.</p>
          <Button onClick={onBack} className="bg-[#EA2C00] hover:bg-[#D42800] text-white" data-testid="button-back-empty">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Proforma
          </Button>
        </div>
      </div>
    );
  }

  const renderEmptySlot = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex-1 min-w-[280px] bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-xl p-6 flex flex-col items-center justify-center text-center"
      data-testid="empty-scenario-slot"
    >
      <Plus className="w-8 h-8 text-neutral-300 mb-3" />
      <h3 className="text-sm font-bold text-neutral-700 mb-1">Add a scenario to compare</h3>
      <p className="text-xs text-neutral-500 mb-4 max-w-[200px]">Duplicate your current scenario and change one variable to see the impact side by side.</p>
      <Button
        onClick={onAddScenario}
        className="bg-[#EA2C00] hover:bg-[#D42800] text-white text-xs"
        data-testid="button-add-scenario-empty"
      >
        <Copy className="w-3.5 h-3.5 mr-1.5" /> Duplicate & Edit
      </Button>
    </motion.div>
  );

  const formatDelta = (delta: number | null, format: (v: number) => string, higherIsBetter: boolean) => {
    if (delta === null || delta === 0) return null;
    const isPositive = higherIsBetter ? delta > 0 : delta < 0;
    const sign = delta > 0 ? "+" : "";
    return (
      <span className={`text-[10px] font-medium ${isPositive ? "text-green-600" : "text-red-500"}`}>
        {sign}{format(delta)}
      </span>
    );
  };

  const gridCols = colCount <= 1 ? "grid-cols-1 sm:grid-cols-2" : colCount === 2 ? "grid-cols-1 sm:grid-cols-2" : colCount === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div className="min-h-screen bg-white" data-testid="scenario-compare-view">
      <div className="sticky top-0 z-30 bg-white border-b border-neutral-200 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
            data-testid="button-back-compare"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Proforma</span>
          </button>
          <h1 className="text-sm sm:text-base font-bold text-neutral-900">Scenario Comparison</h1>
          <div className="flex items-center gap-2">
            {scenarios.length < MAX_SCENARIOS && (
              <Button
                variant="outline"
                size="sm"
                onClick={onAddScenario}
                className="text-xs gap-1.5"
                data-testid="button-add-scenario-top"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </Button>
            )}
            {onExportComparisonPDF && colCount >= 2 && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExportComparisonPDF}
                className="text-xs gap-1.5"
                data-testid="button-export-comparison"
              >
                <Download className="w-3.5 h-3.5" /> Export PDF
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {isMobile && colCount > 1 && (
          <div className="flex items-center justify-center gap-2 mb-4">
            {scenarioData.map((d, idx) => (
              <button
                key={d.scenario.id}
                onClick={() => setMobileActiveIdx(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${mobileActiveIdx === idx ? "scale-125" : "opacity-40"}`}
                style={{ backgroundColor: SCENARIO_COLORS[idx % SCENARIO_COLORS.length] }}
                data-testid={`dot-scenario-${idx}`}
              />
            ))}
          </div>
        )}

        <div className={`grid ${gridCols} gap-4 mb-6`}>
          <AnimatePresence mode="popLayout">
            {(isMobile && colCount > 1 ? [scenarioData[mobileActiveIdx]] : scenarioData).map((d, idx) => {
              const actualIdx = isMobile && colCount > 1 ? mobileActiveIdx : idx;
              return (
                <motion.div
                  key={d.scenario.id}
                  layout
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="rounded-xl border border-neutral-200 overflow-hidden"
                  style={{ borderTopColor: SCENARIO_COLORS[actualIdx % SCENARIO_COLORS.length], borderTopWidth: 3 }}
                  data-testid={`scenario-column-${actualIdx}`}
                >
                  <div className="p-4 bg-white">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: SCENARIO_COLORS[actualIdx % SCENARIO_COLORS.length] }} />
                        <h3 className="text-sm font-bold text-neutral-900 truncate max-w-[160px]" data-testid={`scenario-name-${actualIdx}`}>{d.scenario.name}</h3>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => onEditScenario(d.scenario.id)} className="p-1.5 text-neutral-400 hover:text-neutral-700 transition-colors" title="Edit" data-testid={`button-edit-scenario-${actualIdx}`}>
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button onClick={() => onDuplicateScenario(d.scenario.id)} className="p-1.5 text-neutral-400 hover:text-neutral-700 transition-colors" title="Duplicate" data-testid={`button-duplicate-scenario-${actualIdx}`}>
                          <Copy className="w-3 h-3" />
                        </button>
                        {colCount > 1 && (
                          <button onClick={() => toggleHide(d.scenario.id)} className="p-1.5 text-neutral-400 hover:text-red-500 transition-colors" title="Remove from comparison" data-testid={`button-hide-scenario-${actualIdx}`}>
                            <EyeOff className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1 text-[11px] text-neutral-500">
                      <p><span className="text-neutral-400">Pricing:</span> {getPricingTag(d.scenario.settings)}</p>
                      <p><span className="text-neutral-400">Settings:</span> {getSettingsSummary(d.scenario.settings)}</p>
                      <p><span className="text-neutral-400">Providers:</span> {getProviderRange(d.scenario.settings)}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {colCount === 1 && !isMobile && renderEmptySlot()}
        </div>

        {colCount >= 1 && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-6"
            >
              <h2 className="text-sm font-bold text-neutral-900 mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#EA2C00]" />
                Key Performance Indicators
              </h2>
              <div className="bg-[#F9F6F2] rounded-xl overflow-hidden" data-testid="kpi-comparison">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b-2 border-neutral-300">
                        <th className="text-left py-3 px-4 font-medium text-neutral-500 min-w-[130px]">KPI</th>
                        {scenarioData.map((d, idx) => (
                          <th key={d.scenario.id} className="text-right py-3 px-4 font-bold text-neutral-900 min-w-[120px]">
                            <div className="flex items-center justify-end gap-1.5">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: SCENARIO_COLORS[idx % SCENARIO_COLORS.length] }} />
                              <span className="truncate max-w-[100px]">{d.scenario.name}</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {kpis.map((kpi, ri) => (
                        <tr key={kpi.label} className="border-b border-neutral-100">
                          <td className="py-2.5 px-4 font-medium text-neutral-700 flex items-center gap-2">
                            <kpi.icon className="w-3.5 h-3.5 text-neutral-400" />
                            {kpi.label}
                          </td>
                          {kpi.values.map((v, i) => (
                            <td key={i} className="text-right py-2.5 px-4" data-testid={`kpi-${ri}-scenario-${i}`}>
                              <div className="flex flex-col items-end">
                                <span className={`font-bold ${i === kpi.bestIdx && colCount > 1 ? "text-[#EA2C00]" : "text-neutral-900"}`}>
                                  {kpi.format(v)}
                                  {i === kpi.bestIdx && colCount > 1 && (
                                    <span className="ml-1 text-[#EA2C00] animate-pulse" data-testid={`star-${ri}-${i}`}>★</span>
                                  )}
                                </span>
                                {kpi.deltas[i] !== null && kpi.deltas[i] !== 0 && formatDelta(kpi.deltas[i], kpi.format, kpi.higherIsBetter)}
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mb-6"
            >
              <h2 className="text-sm font-bold text-neutral-900 mb-3">Financial Comparison</h2>
              <div className="bg-[#F9F6F2] rounded-xl overflow-hidden" data-testid="financial-comparison">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b-2 border-neutral-300">
                        <th className="text-left py-3 px-4 font-medium text-neutral-500 min-w-[130px]"></th>
                        {scenarioData.map((d, idx) => (
                          <th key={d.scenario.id} className="text-right py-3 px-4 font-bold text-neutral-900 min-w-[100px]">
                            <div className="flex items-center justify-end gap-1.5">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: SCENARIO_COLORS[idx % SCENARIO_COLORS.length] }} />
                              <span className="truncate max-w-[80px]">{d.scenario.name}</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const maxYears = Math.max(...scenarioData.map(d => d.yearlyData.length));
                        const rows: { label: string; values: number[]; isBold?: boolean; isHighlight?: boolean }[] = [];

                        for (let y = 0; y < maxYears; y++) {
                          rows.push({
                            label: `Year ${y + 1} Value`,
                            values: scenarioData.map(d => d.yearlyData[y]?.totalValue ?? 0),
                          });
                        }
                        rows.push({
                          label: "Total Value",
                          values: scenarioData.map(d => d.summary.termValue),
                          isBold: true,
                        });
                        rows.push({
                          label: "Total Investment",
                          values: scenarioData.map(d => d.summary.termInvestment),
                        });
                        rows.push({
                          label: "Net Value",
                          values: scenarioData.map(d => d.summary.termNet),
                          isBold: true,
                          isHighlight: true,
                        });

                        return rows.map((row, ri) => {
                          const allSame = row.values.length > 1 && row.values.every(v => Math.abs(v - row.values[0]) < 100);
                          return (
                            <tr key={row.label} className={`border-b ${row.isHighlight ? "border-neutral-300 bg-neutral-50" : "border-neutral-100"}`}>
                              <td className={`py-2 px-4 ${row.isBold ? "font-bold text-neutral-900" : "font-medium text-neutral-600"}`}>{row.label}</td>
                              {row.values.map((v, i) => (
                                <td key={i} className={`text-right py-2 px-4 ${allSame ? "text-neutral-400" : row.isBold ? "font-bold text-neutral-900" : "text-neutral-700"}`} style={row.isHighlight ? { color: SCENARIO_COLORS[i % SCENARIO_COLORS.length] } : undefined}>
                                  {fmt(v)}
                                </td>
                              ))}
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-6"
            >
              <h2 className="text-sm font-bold text-neutral-900 mb-3">Value Driver Comparison</h2>
              <div className="bg-[#F9F6F2] rounded-xl overflow-hidden" data-testid="driver-comparison">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b-2 border-neutral-300">
                        <th className="text-left py-3 px-4 font-medium text-neutral-500 min-w-[130px]">Driver</th>
                        {scenarioData.map((d, idx) => (
                          <th key={d.scenario.id} className="text-right py-3 px-4 font-bold text-neutral-900 min-w-[120px]">
                            <span className="truncate max-w-[80px]">{d.scenario.name}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: "Documentation Quality", key: "doc" as const },
                        { label: "Capacity & Efficiency", key: "time" as const },
                        { label: "Retention & Wellbeing", key: "retention" as const },
                      ].map(driver => {
                        const values = scenarioData.map(d => {
                          const cf = d.cashFlows;
                          if (driver.key === "doc") return cf.reduce((s, r) => s + r.docValue, 0);
                          if (driver.key === "time") return cf.reduce((s, r) => s + r.timeValue, 0);
                          return cf.reduce((s, r) => s + r.retentionValue, 0);
                        });
                        const totals = scenarioData.map(d => d.summary.termValue);
                        const pcts = values.map((v, i) => totals[i] > 0 ? Math.round(v / totals[i] * 100) : 0);
                        const allSame = values.length > 1 && values.every(v => Math.abs(v - values[0]) < 100);
                        const baseVal = values[0];

                        return (
                          <tr key={driver.label} className="border-b border-neutral-100">
                            <td className="py-2.5 px-4 font-medium text-neutral-700">{driver.label}</td>
                            {values.map((v, i) => {
                              const delta = i === 0 ? null : v - baseVal;
                              return (
                                <td key={i} className={`text-right py-2.5 px-4 ${allSame ? "text-neutral-400" : "text-neutral-700"}`}>
                                  <div className="flex flex-col items-end">
                                    <span>{fmt(v)} <span className="text-[10px] text-neutral-400">({pcts[i]}%)</span></span>
                                    {delta !== null && Math.abs(delta) > 100 && (
                                      <span className={`text-[10px] font-medium ${delta > 0 ? "text-green-600" : "text-red-500"}`}>
                                        {delta > 0 ? "+" : ""}{fmt(delta)}
                                      </span>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>

            {colCount >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="mb-6"
              >
                <h2 className="text-sm font-bold text-neutral-900 mb-3">Value Trajectory Overlay</h2>
                <div className="bg-[#F9F6F2] rounded-xl p-4 sm:p-6" data-testid="comparison-chart-overlay">
                  <ResponsiveContainer width="100%" height={isMobile ? 260 : 380}>
                    <ComposedChart margin={isMobile ? { top: 10, right: 10, left: 0, bottom: 10 } : { top: 20, right: 40, left: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E0DB" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: isMobile ? 10 : 12, fill: "#666" }}
                        allowDuplicatedCategory={false}
                        axisLine={{ stroke: "#D5D0CB" }}
                      />
                      <YAxis
                        tickFormatter={(v: number) => fmt(v)}
                        tick={{ fontSize: isMobile ? 10 : 12, fill: "#666" }}
                        width={isMobile ? 55 : 80}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      {scenarioData.map((d, idx) => (
                        <Line
                          key={d.scenario.id}
                          data={d.chartData}
                          type="monotone"
                          dataKey="total"
                          stroke={SCENARIO_COLORS[idx % SCENARIO_COLORS.length]}
                          strokeWidth={idx === 0 ? 2.5 : 2}
                          strokeDasharray={SCENARIO_DASHES[idx % SCENARIO_DASHES.length]}
                          dot={false}
                          name={d.scenario.name}
                          animationDuration={800 + idx * 400}
                        />
                      ))}
                    </ComposedChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-3">
                    {scenarioData.map((d, idx) => (
                      <span key={d.scenario.id} className="flex items-center gap-1.5 text-[11px]">
                        <span className="w-4 h-0.5 inline-block rounded-full" style={{ backgroundColor: SCENARIO_COLORS[idx % SCENARIO_COLORS.length] }} />
                        <span className="text-neutral-600">{d.scenario.name}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {recommendation && colCount >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-6"
              >
                <div className="bg-gradient-to-r from-neutral-900 to-neutral-800 rounded-xl p-4 sm:p-6 text-white" data-testid="recommendation-bar">
                  <p className="text-xs text-white/50 uppercase tracking-wider mb-2">Key Tradeoffs</p>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    <span>
                      <span className="text-white/60">Highest ROI:</span>{" "}
                      <span className="font-bold">{recommendation.highestROI.name}</span>{" "}
                      <span className="text-[#EA2C00]">({recommendation.highestROI.value})</span>
                    </span>
                    <span>
                      <span className="text-white/60">Fastest Payback:</span>{" "}
                      <span className="font-bold">{recommendation.fastestPayback.name}</span>{" "}
                      <span className="text-[#EA2C00]">({recommendation.fastestPayback.value})</span>
                    </span>
                    <span>
                      <span className="text-white/60">Highest Net Value:</span>{" "}
                      <span className="font-bold">{recommendation.highestNet.name}</span>{" "}
                      <span className="text-[#EA2C00]">({recommendation.highestNet.value})</span>
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {hiddenIds.size > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-xs text-neutral-400">Hidden:</span>
                {scenarios.filter(s => hiddenIds.has(s.id)).map(s => (
                  <button
                    key={s.id}
                    onClick={() => toggleHide(s.id)}
                    className="text-xs text-neutral-500 underline hover:text-neutral-800 transition-colors"
                    data-testid={`button-unhide-${s.id}`}
                  >
                    {s.name} (show)
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
