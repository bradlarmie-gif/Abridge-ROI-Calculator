import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronDown, ChevronUp, Download, Settings, TrendingUp, Clock, DollarSign, Building2, HeartPulse, BedDouble, Stethoscope, Info, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from "recharts";
import type { ProformaSettingSnapshot, ProformaConfig } from "./proformaTypes";
import { SETTING_COLORS, SETTING_LABELS, SETTING_UNIT_LABELS, DEFAULT_PROFORMA_CONFIG } from "./proformaTypes";
import { buildMonthlyCashFlows, groupByQuarter, calculateProformaSummary, calculateIRR, getYearlySummary } from "@/lib/proformaCalculations";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { generateProformaPDF } from "./ProformaPDFExport";
import { useToast } from "@/hooks/use-toast";

interface ProformaViewProps {
  settings: ProformaSettingSnapshot[];
  onUpdateSetting: (id: string, updates: Partial<ProformaSettingSnapshot>) => void;
  onBack: () => void;
  onHome: () => void;
}

const SETTING_ICONS: Record<string, typeof Building2> = {
  outpatient: Building2,
  ed: HeartPulse,
  inpatient: BedDouble,
  nursing: Stethoscope,
};

function fmt(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000).toLocaleString()}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

function fmtFull(n: number) {
  return `$${Math.round(n).toLocaleString()}`;
}

function fmtNum(n: number) {
  return n.toLocaleString();
}

function fmtPct(n: number) {
  const val = Math.round(n * 100);
  if (val > 999) return ">999%";
  return `${val}%`;
}

export default function ProformaView({
  settings,
  onUpdateSetting,
  onBack,
  onHome,
}: ProformaViewProps) {
  const [config, setConfig] = useState<ProformaConfig>({ ...DEFAULT_PROFORMA_CONFIG });
  const [showMethodology, setShowMethodology] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await generateProformaPDF(settings, config);
      toast({ title: "Proforma PDF exported" });
    } catch (e) {
      toast({ title: "Export failed", description: String(e), variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const cashFlows = useMemo(() => buildMonthlyCashFlows(settings, config), [settings, config]);
  const displayData = useMemo(() => config.viewMode === "quarterly" ? groupByQuarter(cashFlows) : cashFlows, [cashFlows, config.viewMode]);
  const summary = useMemo(() => calculateProformaSummary(settings, config, cashFlows), [settings, config, cashFlows]);
  const yearlyData = useMemo(() => getYearlySummary(cashFlows, settings), [cashFlows, settings]);

  const sensitivityIRR = useMemo(() => {
    const conservative = settings.map(s => ({ ...s, annualValue: s.annualValue * 0.8, retentionValue: s.retentionValue * 0.8 }));
    const optimistic = settings.map(s => ({ ...s, annualValue: s.annualValue * 1.2, retentionValue: s.retentionValue * 1.2 }));
    const consCF = buildMonthlyCashFlows(conservative, config);
    const optCF = buildMonthlyCashFlows(optimistic, config);
    const totalImplFees = settings.reduce((s, v) => s + v.implementationFee, 0);
    const consIRR = calculateIRR([-totalImplFees, ...consCF.map(r => r.netValue)]);
    const optIRR = calculateIRR([-totalImplFees, ...optCF.map(r => r.netValue)]);
    return { conservative: isFinite(consIRR) ? consIRR : 0, optimistic: isFinite(optIRR) ? optIRR : 0 };
  }, [settings, config]);

  const chartData = useMemo(() => {
    return displayData.map(row => {
      const entry: Record<string, number | string> = {
        label: row.label,
        period: row.period,
        investment: row.investment,
        total: row.totalValue,
        cumulativeNet: row.cumulativeNet,
      };
      settings.forEach(s => {
        entry[s.id] = Math.round(row.bySettings[s.id]?.value || 0);
      });
      return entry;
    });
  }, [displayData, settings]);

  const totalProvidersByMonth = useMemo(() => {
    return displayData.map(row => {
      let total = 0;
      settings.forEach(s => {
        total += row.bySettings[s.id]?.providers || 0;
      });
      return total;
    });
  }, [displayData, settings]);

  const paybackLabel = useMemo(() => {
    for (const row of displayData) {
      if (row.cumulativeNet >= 0) return row.label;
    }
    return null;
  }, [displayData]);

  const goLiveLabels = useMemo(() => {
    return settings
      .filter(s => s.goLiveMonth > 1)
      .map(s => ({
        label: config.viewMode === "monthly" ? `M${s.goLiveMonth}` : `Q${Math.ceil(s.goLiveMonth / 3)}`,
        name: s.label,
        color: s.color,
      }));
  }, [settings, config.viewMode]);

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader onHome={onHome} />
      <UnifiedHeaderSpacer />

      <div className="bg-[#1A1A1A] text-white py-12 px-4">
        <div className="max-w-[1000px] mx-auto">
          <div className="flex items-center justify-between mb-8">
            <button onClick={onBack} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors" data-testid="button-back-hub">
              <ArrowLeft className="w-4 h-4" /> Back to Hub
            </button>
            <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1">
              <button
                onClick={() => setConfig(c => ({ ...c, viewMode: "monthly" }))}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${config.viewMode === "monthly" ? "bg-white text-black" : "text-white/60 hover:text-white"}`}
                data-testid="toggle-monthly"
              >
                Monthly
              </button>
              <button
                onClick={() => setConfig(c => ({ ...c, viewMode: "quarterly" }))}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${config.viewMode === "quarterly" ? "bg-white text-black" : "text-white/60 hover:text-white"}`}
                data-testid="toggle-quarterly"
              >
                Quarterly
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div className="col-span-2 md:col-span-1">
              <p className="text-xs text-white/50 uppercase tracking-wide mb-1">Annual Value</p>
              <p className="text-3xl font-bold text-[#EA2C00]" data-testid="text-total-value">{fmt(summary.totalSystemValue)}</p>
            </div>
            <div>
              <p className="text-xs text-white/50 uppercase tracking-wide mb-1">Combined ROI</p>
              <p className="text-2xl font-bold" data-testid="text-roi">{summary.combinedROI.toFixed(1)}x</p>
            </div>
            <div>
              <p className="text-xs text-white/50 uppercase tracking-wide mb-1">IRR</p>
              <p className="text-2xl font-bold text-emerald-400" data-testid="text-irr">{fmtPct(summary.irr)}</p>
            </div>
            <div>
              <p className="text-xs text-white/50 uppercase tracking-wide mb-1">Payback</p>
              <p className="text-2xl font-bold" data-testid="text-payback">{summary.paybackMonth ? `${summary.paybackMonth} mo` : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-white/50 uppercase tracking-wide mb-1">Hours Returned</p>
              <p className="text-2xl font-bold" data-testid="text-hours">{fmtNum(summary.totalHours)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-8">

        <div className="flex gap-3 overflow-x-auto pb-4 mb-8 -mx-2 px-2">
          {settings.map(s => {
            const Icon = SETTING_ICONS[s.careSetting] || Building2;
            return (
              <div
                key={s.id}
                className="flex-shrink-0 bg-[#F9F6F2] rounded-xl p-4 min-w-[200px] border-l-4"
                style={{ borderLeftColor: s.color }}
                data-testid={`strip-card-${s.careSetting}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4" style={{ color: s.color }} />
                  <span className="text-sm font-bold text-neutral-900">{s.label}</span>
                </div>
                <p className="text-lg font-bold" style={{ color: s.color }}>{fmt(s.annualValue)}</p>
                <p className="text-xs text-neutral-500 mt-1">
                  {fmtNum(s.providerCount)} → {fmtNum(s.fullScaleProviders || s.providerCount)} {SETTING_UNIT_LABELS[s.careSetting]} · M{s.goLiveMonth}
                </p>
              </div>
            );
          })}
        </div>

        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-bold text-neutral-900">Value Growth Trajectory</h2>
            <div className="flex items-center gap-1.5 text-xs text-neutral-500">
              <Users className="w-3.5 h-3.5" />
              <span>
                {fmtNum(settings.reduce((s, v) => s + v.providerCount, 0))} → {fmtNum(settings.reduce((s, v) => s + v.fullScaleProviders, 0))} total {settings.length > 1 ? "units" : SETTING_UNIT_LABELS[settings[0]?.careSetting]}
              </span>
            </div>
          </div>
          <p className="text-sm text-neutral-500 mb-4">Monthly value as providers expand from pilot to full scale across settings</p>
          <div className="bg-[#F9F6F2] rounded-xl p-4 sm:p-6" data-testid="chart-ramp-up">
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={chartData} margin={{ top: 30, right: 20, left: 10, bottom: 10 }}>
                <defs>
                  {settings.map(s => (
                    <linearGradient key={`grad-${s.id}`} id={`grad-${s.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={s.color} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={s.color} stopOpacity={0.05} />
                    </linearGradient>
                  ))}
                  <linearGradient id="grad-investment" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1A1A1A" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#1A1A1A" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E0DB" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#888" }}
                  interval={config.viewMode === "monthly" ? 2 : 0}
                  axisLine={{ stroke: "#D5D0CB" }}
                />
                <YAxis
                  tickFormatter={(v: number) => fmt(v)}
                  tick={{ fontSize: 11, fill: "#888" }}
                  width={70}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip settings={settings} totalProvidersByMonth={totalProvidersByMonth} />} />

                {goLiveLabels.map(gl => (
                  <ReferenceLine
                    key={`golive-${gl.label}`}
                    x={gl.label}
                    stroke={gl.color}
                    strokeDasharray="4 4"
                    strokeOpacity={0.6}
                    label={{
                      value: `${gl.name} Go-Live`,
                      position: "insideTopRight",
                      fontSize: 9,
                      fill: gl.color,
                      dy: -5,
                    }}
                  />
                ))}

                {paybackLabel && (
                  <ReferenceLine
                    x={paybackLabel}
                    stroke="#059669"
                    strokeDasharray="4 4"
                    strokeOpacity={0.7}
                    label={{
                      value: "Payback",
                      position: "insideTopRight",
                      fontSize: 9,
                      fill: "#059669",
                      fontWeight: 600,
                      dy: -5,
                    }}
                  />
                )}

                <Area
                  type="monotone"
                  dataKey="investment"
                  stackId="inv"
                  fill="url(#grad-investment)"
                  stroke="#1A1A1A"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  name="Investment"
                />

                {settings.map(s => (
                  <Area
                    key={s.id}
                    type="monotone"
                    dataKey={s.id}
                    stackId="value"
                    fill={`url(#grad-${s.id})`}
                    stroke={s.color}
                    strokeWidth={2.5}
                    name={s.label}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>

            <div className="flex items-center justify-center gap-5 mt-3 text-xs">
              {settings.map(s => (
                <span key={s.id} className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 rounded-full inline-block" style={{ backgroundColor: s.color }} />
                  <span className="text-neutral-600">{s.label}</span>
                </span>
              ))}
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 rounded-full inline-block border-t border-dashed border-neutral-800" style={{ borderTopWidth: 2 }} />
                <span className="text-neutral-600">Investment</span>
              </span>
            </div>

            {config.retentionPhasing.year2Pct > 0 && (
              <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-neutral-400">
                <span>Retention phases in: {config.retentionPhasing.year1Pct}% Y1 → {config.retentionPhasing.year2Pct}% Y2 → {config.retentionPhasing.year3Pct}% Y3</span>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          className="bg-[#F9F6F2] rounded-xl p-6 mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          data-testid="panel-pricing"
        >
          <div className="flex items-center gap-2 mb-5">
            <Settings className="w-5 h-5 text-neutral-600" />
            <h2 className="text-lg font-bold text-neutral-900">Pricing & Configuration</h2>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <span className="text-sm font-medium text-neutral-600">Contract Term:</span>
            <div className="flex items-center gap-1 bg-white rounded-full p-0.5 border border-neutral-200">
              {([24, 36] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setConfig(c => ({ ...c, contractTermMonths: t }))}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${config.contractTermMonths === t ? "bg-[#1A1A1A] text-white" : "text-neutral-500 hover:text-neutral-900"}`}
                  data-testid={`toggle-term-${t}`}
                >
                  {t} months
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-300">
                  <th className="text-left py-2 font-medium text-neutral-500">Setting</th>
                  <th className="text-right py-2 font-medium text-neutral-500">Pilot</th>
                  <th className="text-right py-2 font-medium text-neutral-500">Full Scale</th>
                  <th className="text-right py-2 font-medium text-neutral-500">$/Unit/Mo</th>
                  <th className="text-right py-2 font-medium text-neutral-500">Go-Live</th>
                  <th className="text-right py-2 font-medium text-neutral-500">Impl. Fee</th>
                  <th className="text-right py-2 font-medium text-neutral-500">Monthly Cost</th>
                  <th className="text-right py-2 font-medium text-neutral-500">Annual Cost</th>
                </tr>
              </thead>
              <tbody>
                {settings.map(s => {
                  const monthlyCost = s.costPerUnit * s.providerCount;
                  return (
                    <tr key={s.id} className="border-b border-neutral-200">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                          <span className="font-medium text-neutral-900">{s.label}</span>
                        </div>
                      </td>
                      <td className="text-right py-3 text-neutral-700">{fmtNum(s.providerCount)}</td>
                      <td className="text-right py-3 text-neutral-700">{fmtNum(s.fullScaleProviders)}</td>
                      <td className="text-right py-3">
                        <FormattedNumberInput
                          value={s.costPerUnit}
                          onChange={(v) => onUpdateSetting(s.id, { costPerUnit: v })}
                          prefix="$"
                          className="w-20 text-right text-sm h-8 bg-white border border-neutral-300 rounded-lg px-2"
                          data-testid={`input-cost-${s.careSetting}`}
                        />
                      </td>
                      <td className="text-right py-3">
                        <select
                          value={s.goLiveMonth}
                          onChange={(e) => onUpdateSetting(s.id, { goLiveMonth: parseInt(e.target.value) })}
                          className="h-8 rounded-lg border border-neutral-300 bg-white px-2 text-sm text-right"
                          data-testid={`select-golive-view-${s.careSetting}`}
                        >
                          {Array.from({ length: config.contractTermMonths }, (_, i) => (
                            <option key={i + 1} value={i + 1}>M{i + 1}</option>
                          ))}
                        </select>
                      </td>
                      <td className="text-right py-3">
                        <FormattedNumberInput
                          value={s.implementationFee}
                          onChange={(v) => onUpdateSetting(s.id, { implementationFee: v })}
                          prefix="$"
                          className="w-24 text-right text-sm h-8 bg-white border border-neutral-300 rounded-lg px-2"
                          data-testid={`input-impl-${s.careSetting}`}
                        />
                      </td>
                      <td className="text-right py-3 font-medium text-neutral-900">{fmtFull(monthlyCost)}</td>
                      <td className="text-right py-3 font-medium text-neutral-900">{fmtFull(monthlyCost * 12)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-6 pt-6 border-t border-neutral-200">
            <p className="text-sm font-bold text-neutral-700 mb-1">Retention Benefit Phasing</p>
            <p className="text-xs text-neutral-500 mb-4">When do retention benefits materialize? Conservative default delays them.</p>
            <div className="grid grid-cols-3 gap-4">
              {(["year1Pct", "year2Pct", "year3Pct"] as const).map((key, idx) => (
                <div key={key}>
                  <label className="block text-xs text-neutral-500 mb-1">Year {idx + 1}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={config.retentionPhasing[key]}
                      onChange={(e) => setConfig(c => ({
                        ...c,
                        retentionPhasing: { ...c.retentionPhasing, [key]: parseInt(e.target.value) }
                      }))}
                      className="flex-1 accent-[#EA2C00]"
                      data-testid={`slider-retention-y${idx + 1}`}
                    />
                    <span className="text-sm font-bold text-neutral-900 w-10 text-right">{config.retentionPhasing[key]}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-lg font-bold text-neutral-900 mb-1">3-Year Financial Summary</h2>
          <p className="text-sm text-neutral-500 mb-4">Phased projection with conservative retention modeling</p>
          <div className="overflow-x-auto" data-testid="table-pnl">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-neutral-300">
                  <th className="text-left py-3 font-medium text-neutral-500"></th>
                  {yearlyData.map(y => (
                    <th key={y.label} className="text-right py-3 font-bold text-neutral-900 px-4">{y.label}</th>
                  ))}
                  <th className="text-right py-3 font-bold text-neutral-900 px-4">{config.contractTermMonths}-Mo Total</th>
                </tr>
              </thead>
              <tbody>
                {settings.map(s => (
                  <tr key={s.id} className="border-b border-neutral-100">
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="font-medium text-neutral-800">{s.label}</span>
                      </div>
                    </td>
                    {yearlyData.map(y => (
                      <td key={y.label} className="text-right py-2.5 px-4 text-neutral-700">
                        {fmt(y.bySettings[s.id]?.value || 0)}
                      </td>
                    ))}
                    <td className="text-right py-2.5 px-4 font-medium text-neutral-900">
                      {fmt(yearlyData.reduce((sum, y) => sum + (y.bySettings[s.id]?.value || 0), 0))}
                    </td>
                  </tr>
                ))}
                <tr className="border-b border-neutral-300 bg-neutral-50">
                  <td className="py-2.5 font-bold text-neutral-900">Total Value</td>
                  {yearlyData.map(y => (
                    <td key={y.label} className="text-right py-2.5 px-4 font-bold text-neutral-900">{fmt(y.totalValue)}</td>
                  ))}
                  <td className="text-right py-2.5 px-4 font-bold text-[#EA2C00]">{fmt(summary.threeYearValue)}</td>
                </tr>
                <tr className="border-b border-neutral-100 text-neutral-500">
                  <td className="py-2.5 pl-4 text-neutral-400">Retention (phased)</td>
                  {yearlyData.map(y => (
                    <td key={y.label} className="text-right py-2.5 px-4 text-neutral-400">{fmt(y.retentionValue)}</td>
                  ))}
                  <td className="text-right py-2.5 px-4 text-neutral-400">
                    {fmt(yearlyData.reduce((s, y) => s + y.retentionValue, 0))}
                  </td>
                </tr>
                <tr className="border-b border-neutral-200">
                  <td className="py-2.5 font-medium text-red-600">Investment</td>
                  {yearlyData.map(y => (
                    <td key={y.label} className="text-right py-2.5 px-4 text-red-600">({fmt(y.investment)})</td>
                  ))}
                  <td className="text-right py-2.5 px-4 font-medium text-red-600">({fmt(summary.threeYearInvestment)})</td>
                </tr>
                <tr className="bg-neutral-50">
                  <td className="py-3 font-bold text-neutral-900">Net Value</td>
                  {yearlyData.map(y => (
                    <td key={y.label} className={`text-right py-3 px-4 font-bold ${y.netValue >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                      {y.netValue >= 0 ? fmt(y.netValue) : `(${fmt(Math.abs(y.netValue))})`}
                    </td>
                  ))}
                  <td className={`text-right py-3 px-4 font-bold text-lg ${summary.threeYearNet >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                    {summary.threeYearNet >= 0 ? fmt(summary.threeYearNet) : `(${fmt(Math.abs(summary.threeYearNet))})`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="bg-[#F9F6F2] rounded-xl p-6 text-center" data-testid="panel-irr">
            <TrendingUp className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
            <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Internal Rate of Return</p>
            <p className="text-4xl font-bold text-emerald-600">{fmtPct(summary.irr)}</p>
            <div className="mt-3 flex justify-center gap-4 text-xs text-neutral-500">
              <span>Conservative: {fmtPct(sensitivityIRR.conservative)}</span>
              <span>Optimistic: {fmtPct(sensitivityIRR.optimistic)}</span>
            </div>
          </div>
          <div className="bg-[#F9F6F2] rounded-xl p-6 text-center" data-testid="panel-payback">
            <Clock className="w-6 h-6 text-[#EA2C00] mx-auto mb-2" />
            <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Payback Period</p>
            <p className="text-4xl font-bold text-neutral-900">{summary.paybackMonth ?? "—"}</p>
            <p className="text-sm text-neutral-500 mt-1">{summary.paybackMonth ? "months" : "Beyond contract"}</p>
          </div>
          <div className="bg-[#F9F6F2] rounded-xl p-6 text-center" data-testid="panel-3yr-net">
            <DollarSign className="w-6 h-6 text-[#EA2C00] mx-auto mb-2" />
            <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">{config.contractTermMonths}-Mo Net Value</p>
            <p className={`text-4xl font-bold ${summary.threeYearNet >= 0 ? "text-emerald-700" : "text-red-600"}`}>
              {fmt(summary.threeYearNet)}
            </p>
            <p className="text-sm text-neutral-500 mt-1">{fmtNum(summary.totalHours)} total hours returned</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-10"
        >
          <button
            onClick={() => setShowMethodology(!showMethodology)}
            className="w-full flex items-center justify-between p-4 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors text-sm"
            data-testid="button-methodology"
          >
            <span className="flex items-center gap-2 text-neutral-600">
              <Info className="w-4 h-4" />
              How we calculated this — IRR methodology & retention phasing
            </span>
            {showMethodology ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
          </button>
          {showMethodology && (
            <div className="mt-2 p-6 bg-white border border-neutral-200 rounded-xl text-sm text-neutral-600 space-y-3">
              <p><strong className="text-neutral-900">Internal Rate of Return (IRR):</strong> Calculated using Newton-Raphson method on monthly net cash flows with an initial period-0 outflow (implementation fees). Monthly IRR is annualized via compound formula: (1 + monthly rate)^12 - 1.</p>
              <p><strong className="text-neutral-900">Provider Expansion:</strong> Providers scale linearly from pilot count to full-scale count over the contract term. This models a realistic organizational rollout trajectory where value grows as more providers adopt Abridge.</p>
              <p><strong className="text-neutral-900">Retention Phasing:</strong> Clinician/nurse retention benefits are conservatively phased — {config.retentionPhasing.year1Pct}% in Year 1, {config.retentionPhasing.year2Pct}% in Year 2, {config.retentionPhasing.year3Pct}% in Year 3. This reflects that retention impact takes time to materialize.</p>
              <p><strong className="text-neutral-900">Adoption Ramp:</strong> Each care setting follows an S-curve adoption model over 12 months from its go-live date. Value scales with adoption progress using a power function (progress^0.8).</p>
              <p><strong className="text-neutral-900">Sensitivity:</strong> Conservative scenario applies a 20% reduction to all value drivers. Optimistic applies a 20% increase. This brackets the range of likely outcomes.</p>
            </div>
          )}
        </motion.div>

        <div className="flex items-center justify-between py-6 border-t border-neutral-200">
          <Button
            variant="outline"
            onClick={onBack}
            className="gap-2"
            data-testid="button-edit-settings"
          >
            <Settings className="w-4 h-4" /> Edit Settings
          </Button>
          <Button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="gap-2 bg-[#EA2C00] hover:bg-[#D42800] text-white px-8 h-12 text-base font-semibold"
            data-testid="button-export-pdf"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isExporting ? "Exporting..." : "Export Proforma PDF"}
          </Button>
        </div>

        <p className="text-[11px] text-neutral-400 leading-relaxed mt-4 mb-8 text-center max-w-2xl mx-auto">
          Projections are modeled estimates based on user-provided inputs and published benchmarks. Retention benefits are conservatively phased. Actual results may vary. This does not constitute a guarantee of financial outcomes.
        </p>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label, settings, totalProvidersByMonth }: any) {
  if (!active || !payload) return null;
  const settingItems = payload.filter((p: any) => p.dataKey !== "investment" && p.dataKey !== "cumulativeNet" && p.dataKey !== "total");
  const investmentItem = payload.find((p: any) => p.dataKey === "investment");
  const total = settingItems.reduce((s: number, p: any) => s + (p.value || 0), 0);

  const periodIdx = payload[0]?.payload?.period ? payload[0].payload.period - 1 : 0;
  const providerCount = totalProvidersByMonth?.[periodIdx] || 0;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-neutral-200 p-4 text-sm min-w-[220px]">
      <div className="flex items-center justify-between mb-2">
        <p className="font-bold text-neutral-900">{label}</p>
        {providerCount > 0 && (
          <span className="text-xs text-neutral-400 flex items-center gap-1">
            <Users className="w-3 h-3" /> {fmtNum(providerCount)}
          </span>
        )}
      </div>
      {settingItems.map((item: any) => (
        <div key={item.dataKey} className="flex justify-between gap-4 mb-1">
          <span className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-neutral-600">{item.name}</span>
          </span>
          <span className="font-medium text-neutral-900">{fmt(item.value)}</span>
        </div>
      ))}
      <div className="border-t border-neutral-200 mt-2 pt-2 flex justify-between">
        <span className="font-bold text-neutral-900">Total Value</span>
        <span className="font-bold text-[#EA2C00]">{fmt(total)}</span>
      </div>
      {investmentItem && (
        <div className="flex justify-between mt-1">
          <span className="text-neutral-500">Investment</span>
          <span className="text-neutral-700">({fmt(investmentItem.value)})</span>
        </div>
      )}
      <div className="flex justify-between mt-1">
        <span className="font-medium text-neutral-500">Net</span>
        <span className={`font-medium ${total - (investmentItem?.value || 0) >= 0 ? "text-emerald-700" : "text-red-600"}`}>
          {fmt(total - (investmentItem?.value || 0))}
        </span>
      </div>
    </div>
  );
}
