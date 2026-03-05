import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronDown, ChevronUp, Download, Settings, TrendingUp, Clock, DollarSign, Building2, HeartPulse, BedDouble, Stethoscope, Info, Loader2, Users, BarChart3, Shield, Save, X, GitCompare, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceDot, CartesianGrid } from "recharts";
import type { ProformaSettingSnapshot, ProformaConfig, ProformaScenario } from "./proformaTypes";
import { SETTING_COLORS, SETTING_LABELS, SETTING_UNIT_LABELS, DEFAULT_PROFORMA_CONFIG } from "./proformaTypes";
import { buildMonthlyCashFlows, groupByQuarter, groupByYear, calculateProformaSummary, calculateAnnualIRR, getYearlySummary, buildAnnualIRRCashFlows, getContractStartDate } from "@/lib/proformaCalculations";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { generateProformaPDF } from "./ProformaPDFExport";
import { PDFExportModal } from "@/components/switch/PDFExportModal";
import { useToast } from "@/hooks/use-toast";

interface ProformaViewProps {
  settings: ProformaSettingSnapshot[];
  onUpdateSetting: (id: string, updates: Partial<ProformaSettingSnapshot>) => void;
  onBack: () => void;
  onHome: () => void;
  scenarios?: ProformaScenario[];
  onSaveScenario?: (scenario: ProformaScenario) => void;
  onDeleteScenario?: (id: string) => void;
}

const SETTING_ICONS: Record<string, typeof Building2> = {
  outpatient: Building2,
  ed: HeartPulse,
  inpatient: BedDouble,
  nursing: Stethoscope,
};

function useIsMobile(breakpoint = 820) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return isMobile;
}

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

function fmtPct(n: number, cap = 200) {
  const val = Math.round(n * 100);
  if (val > cap) return `${cap}%+`;
  return `${val}%`;
}

function contractTermLabel(months: number): string {
  return `${months / 12}-Year`;
}

const CHART_COLORS = {
  doc: "#1A1A1A",
  time: "#EA2C00",
  retention: "#B45309",
  investment: "#78716C",
};

const SCENARIO_COLORS = ["#EA2C00", "#78716C", "#1A1A1A"];
const SCENARIO_DASHES = ["", "8 4", "4 4"];

export default function ProformaView({
  settings,
  onUpdateSetting,
  onBack,
  onHome,
  scenarios = [],
  onSaveScenario,
  onDeleteScenario,
}: ProformaViewProps) {
  const isMobile = useIsMobile();
  const [config, setConfig] = useState<ProformaConfig>(() => ({
    ...DEFAULT_PROFORMA_CONFIG,
  }));
  const [showMethodology, setShowMethodology] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [scenarioName, setScenarioName] = useState("");
  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null);
  const [editingScenarioName, setEditingScenarioName] = useState("");
  const [compareMode, setCompareMode] = useState(false);
  const { toast } = useToast();

  const handleSaveScenario = () => {
    const name = scenarioName.trim() || `Scenario ${scenarios.length + 1}`;
    const scenario: ProformaScenario = {
      id: `scenario-${Date.now()}`,
      name,
      settings: JSON.parse(JSON.stringify(settings)),
      config: JSON.parse(JSON.stringify(config)),
      createdAt: Date.now(),
    };
    onSaveScenario?.(scenario);
    setShowSaveDialog(false);
    setScenarioName("");
    toast({ title: `Scenario "${name}" saved` });
  };

  const handleRenameScenario = (id: string, newName: string) => {
    const existing = scenarios.find(s => s.id === id);
    if (existing && onSaveScenario) {
      onSaveScenario({ ...existing, name: newName.trim() || existing.name });
    }
    setEditingScenarioId(null);
    setEditingScenarioName("");
  };

  const scenarioSummaries = useMemo(() => {
    return scenarios.map(sc => {
      const cf = buildMonthlyCashFlows(sc.settings, sc.config);
      const sum = calculateProformaSummary(sc.settings, sc.config, cf);
      const displayRows = sc.config.viewMode === "yearly"
        ? groupByYear(cf, getContractStartDate())
        : groupByQuarter(cf, getContractStartDate());
      const chartRows = displayRows.map(row => ({
        label: row.label,
        total: row.totalValue,
        investment: row.investment,
        cumulativeNet: row.cumulativeNet,
      }));
      return { ...sc, summary: sum, chartData: chartRows };
    });
  }, [scenarios]);

  const startDate = useMemo(() => getContractStartDate(), []);

  const [showExportModal, setShowExportModal] = useState(false);

  const handleExportPDF = async (clientName: string, preparedBy: string) => {
    setIsExporting(true);
    try {
      await generateProformaPDF(settings, config, clientName, preparedBy);
      setShowExportModal(false);
      toast({ title: "Proforma PDF exported" });
    } catch (e) {
      toast({ title: "Export failed", description: String(e), variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const cashFlows = useMemo(() => buildMonthlyCashFlows(settings, config), [settings, config]);
  const displayData = useMemo(() => {
    if (config.viewMode === "yearly") return groupByYear(cashFlows, startDate);
    return groupByQuarter(cashFlows, startDate);
  }, [cashFlows, config.viewMode, startDate]);
  const summary = useMemo(() => calculateProformaSummary(settings, config, cashFlows), [settings, config, cashFlows]);
  const yearlyData = useMemo(() => getYearlySummary(cashFlows, settings, startDate), [cashFlows, settings, startDate]);

  const hasInvestment = useMemo(() => {
    return settings.some(s => s.implementationFee > 0 || s.costPerUnit > 0 || (s.annualLicenseFee || 0) > 0 || (s.costPerEncounter || 0) > 0);
  }, [settings]);

  const totalProviders = useMemo(() => {
    return settings.reduce((s, v) => s + v.providerCount, 0);
  }, [settings]);

  const fteEquivalent = useMemo(() => {
    return summary.totalHours / 2080;
  }, [summary.totalHours]);

  const perProviderValue = useMemo(() => {
    return totalProviders > 0 ? summary.runRateValue / totalProviders : 0;
  }, [summary.runRateValue, totalProviders]);

  const sensitivityAnalysis = useMemo(() => {
    const scaleSettings = (s: ProformaSettingSnapshot, valueFactor: number) => ({
      ...s,
      annualValue: s.annualValue * valueFactor,
      retentionValue: s.retentionValue * valueFactor,
      drivers: s.drivers.map(d => ({ ...d, value: d.value * valueFactor })),
    });
    const conservativeSettings = settings.map(s => scaleSettings(s, 0.7));
    const optimisticSettings = settings.map(s => scaleSettings(s, 1.3));
    const consCF = buildMonthlyCashFlows(conservativeSettings, config);
    const optCF = buildMonthlyCashFlows(optimisticSettings, config);
    const consSummary = calculateProformaSummary(conservativeSettings, config, consCF);
    const optSummary = calculateProformaSummary(optimisticSettings, config, optCF);
    const consIRR = calculateAnnualIRR(buildAnnualIRRCashFlows(conservativeSettings, config, consCF));
    const optIRR = calculateAnnualIRR(buildAnnualIRRCashFlows(optimisticSettings, config, optCF));
    return {
      conservative: {
        annualValue: consSummary.runRateValue,
        valueToCost: consSummary.valueToCost,
        irr: consIRR.isValid ? consIRR.annualizedRate : 0,
        irrValid: consIRR.isValid,
        irrMethod: consIRR.method,
        paybackMonth: consSummary.paybackMonth,
        termNet: consSummary.termNet,
        simpleROI: consSummary.simpleROI,
      },
      base: {
        annualValue: summary.runRateValue,
        valueToCost: summary.valueToCost,
        irr: summary.irr,
        irrValid: summary.irrValid,
        irrMethod: summary.irrMethod,
        paybackMonth: summary.paybackMonth,
        termNet: summary.termNet,
        simpleROI: summary.simpleROI,
      },
      optimistic: {
        annualValue: optSummary.runRateValue,
        valueToCost: optSummary.valueToCost,
        irr: optIRR.isValid ? optIRR.annualizedRate : 0,
        irrValid: optIRR.isValid,
        irrMethod: optIRR.method,
        paybackMonth: optSummary.paybackMonth,
        termNet: optSummary.termNet,
        simpleROI: optSummary.simpleROI,
      },
    };
  }, [settings, config, summary]);

  const chartData = useMemo(() => {
    return displayData.map(row => {
      const entry: Record<string, number | string> = {
        label: row.label,
        period: row.period,
        investment: row.investment,
        docValue: row.docValue,
        timeValue: row.timeValue,
        retentionValue: row.retentionValue,
        total: row.totalValue,
        cumulativeNet: row.cumulativeNet,
      };
      settings.forEach(s => {
        entry[s.id] = Math.round(row.bySettings[s.id]?.value || 0);
      });
      return entry;
    });
  }, [displayData, settings]);

  const totalProvidersByPeriod = useMemo(() => {
    return displayData.map(row => {
      let total = 0;
      settings.forEach(s => {
        total += row.bySettings[s.id]?.providers || 0;
      });
      return total;
    });
  }, [displayData, settings]);

  const legendTotals = useMemo(() => {
    const allMonths = buildMonthlyCashFlows(settings, config);
    const doc = allMonths.reduce((s, r) => s + r.docValue, 0);
    const time = allMonths.reduce((s, r) => s + r.timeValue, 0);
    const retention = allMonths.reduce((s, r) => s + r.retentionValue, 0);
    const inv = allMonths.reduce((s, r) => s + r.investment, 0);
    const total = doc + time + retention;
    return { doc, time, retention, inv, total };
  }, [settings, config]);

  const lastChartPoint = useMemo(() => {
    if (chartData.length === 0) return null;
    const last = chartData[chartData.length - 1];
    return {
      label: last.label as string,
      totalValue: (last.docValue as number) + (last.timeValue as number) + (last.retentionValue as number),
      investment: last.investment as number,
    };
  }, [chartData]);

  const paybackLabel = useMemo(() => {
    if (!summary.paybackMonth) return null;
    if (config.viewMode === "yearly") {
      const yearIdx = Math.ceil(summary.paybackMonth / 12) - 1;
      const d = new Date(startDate.getFullYear(), startDate.getMonth() + yearIdx * 12, 1);
      return String(d.getFullYear());
    }
    const monthIdx = summary.paybackMonth - 1;
    const d = new Date(startDate.getFullYear(), startDate.getMonth() + monthIdx, 1);
    const q = Math.floor(d.getMonth() / 3) + 1;
    const yr = String(d.getFullYear()).slice(-2);
    return `Q${q} '${yr}`;
  }, [summary.paybackMonth, startDate, config.viewMode]);

  const goLiveLabels = useMemo(() => {
    const quarterData = groupByQuarter(cashFlows, startDate);
    return settings
      .filter(s => s.goLiveMonth > 1)
      .map(s => {
        const qIdx = Math.ceil(s.goLiveMonth / 3) - 1;
        const qRow = quarterData[qIdx];
        return {
          label: qRow?.label || `Q${qIdx + 1}`,
          name: s.label,
          color: s.color,
        };
      });
  }, [settings, cashFlows, startDate]);

  const hasDelayedDrivers = settings.some(s => s.drivers.some(d => d.onset === "delayed"));
  const timeSavingsOnsetLabel = useMemo(() => {
    const firstGoLive = Math.min(...settings.map(s => s.goLiveMonth));
    const onsetMonth = firstGoLive + 3;
    const quarterData = groupByQuarter(cashFlows, startDate);
    const qIdx = Math.ceil(onsetMonth / 3) - 1;
    return quarterData[qIdx]?.label || `Q${qIdx + 1}`;
  }, [settings, cashFlows, startDate]);

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader onHome={onHome} />
      <UnifiedHeaderSpacer />

      {/* HERO */}
      <div className="bg-[#1A1A1A] text-white py-8 sm:py-12 px-4">
        <div className="max-w-[1000px] mx-auto">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <button onClick={onBack} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm" data-testid="button-back-hub">
              <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Back to Hub</span><span className="sm:hidden">Back</span>
            </button>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-white/10 rounded-full px-2 py-1">
                <button
                  onClick={() => setConfig(c => ({ ...c, viewMode: "quarterly" }))}
                  className={`px-2.5 sm:px-3 py-1 rounded-full text-xs font-medium transition-colors ${config.viewMode === "quarterly" ? "bg-white text-black" : "text-white/60 hover:text-white"}`}
                  data-testid="toggle-quarterly"
                >
                  Quarters
                </button>
                <button
                  onClick={() => setConfig(c => ({ ...c, viewMode: "yearly" }))}
                  className={`px-2.5 sm:px-3 py-1 rounded-full text-xs font-medium transition-colors ${config.viewMode === "yearly" ? "bg-white text-black" : "text-white/60 hover:text-white"}`}
                  data-testid="toggle-yearly"
                >
                  Years
                </button>
              </div>
              {scenarios.length > 0 && (
                <button
                  onClick={() => setCompareMode(!compareMode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${compareMode ? "bg-white text-black" : "bg-white/10 text-white/70 hover:text-white"}`}
                  data-testid="toggle-compare"
                >
                  <GitCompare className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Compare</span>
                </button>
              )}
              <button
                onClick={() => {
                  if (scenarios.length >= 3) {
                    toast({ title: "Maximum 3 scenarios", description: "Delete one to save a new scenario", variant: "destructive" });
                    return;
                  }
                  setScenarioName(`Scenario ${scenarios.length + 1}`);
                  setShowSaveDialog(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/10 text-white/70 hover:text-white transition-colors"
                title="Save as Scenario"
                data-testid="button-save-scenario"
              >
                <Save className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Save as Scenario</span>
              </button>
            </div>
          </div>

          {scenarios.length > 0 && (
            <div className="flex items-center gap-2 mb-4 sm:mb-6 overflow-x-auto pb-1 touch-manipulation" style={{ WebkitOverflowScrolling: 'touch' }} data-testid="scenario-tabs">
              <span className="text-[12px] text-white/40 uppercase tracking-wider mr-1 flex-shrink-0">Saved:</span>
              {scenarios.map((sc, idx) => (
                <div key={sc.id} className="flex items-center gap-1 flex-shrink-0">
                  {editingScenarioId === sc.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={editingScenarioName}
                        onChange={(e) => setEditingScenarioName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRenameScenario(sc.id, editingScenarioName);
                          if (e.key === "Escape") setEditingScenarioId(null);
                        }}
                        onBlur={() => handleRenameScenario(sc.id, editingScenarioName)}
                        className="bg-white/20 text-white text-xs px-2 py-1 rounded w-28 outline-none"
                        autoFocus
                        data-testid={`input-rename-scenario-${idx}`}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-0.5 bg-white/10 rounded-full pl-2.5 pr-1 py-1">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: SCENARIO_COLORS[idx % 3] }} />
                      <span className="text-xs text-white/80 mx-1 max-w-[140px] truncate">{sc.name} <span className="text-white/40">· {getPricingTag(sc.settings)}</span></span>
                      <button
                        onClick={() => { setEditingScenarioId(sc.id); setEditingScenarioName(sc.name); }}
                        className="p-1.5 text-white/40 hover:text-white transition-colors"
                        title="Rename scenario"
                        data-testid={`button-rename-scenario-${idx}`}
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => {
                          onDeleteScenario?.(sc.id);
                          if (scenarios.length <= 1) setCompareMode(false);
                        }}
                        className="p-1.5 text-white/40 hover:text-red-400 transition-colors"
                        title="Delete scenario"
                        data-testid={`button-delete-scenario-${idx}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Mobile: Annual Value on top, then 2x2 grid */}
          <div className="min-[820px]:hidden">
            <div className="mb-4">
              <p className="text-xs text-white/50 uppercase tracking-wide mb-1">Annual Value at Scale</p>
              <p className="text-3xl font-bold text-[#EA2C00]" data-testid="text-total-value">{fmt(summary.runRateValue)}</p>
              {totalProviders > 0 && (
                <p className="text-[12px] text-white/50 mt-0.5" data-testid="text-per-provider-mobile">per provider: {fmt(perProviderValue)}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[12px] text-white/50 uppercase tracking-wide mb-1">Value-to-Cost</p>
                <p className="text-xl font-bold text-[#E8350A]" data-testid="text-vtc">{hasInvestment ? `${summary.valueToCost.toFixed(1)}x` : "N/A"}</p>
                {hasInvestment && (
                  <p className="text-[12px] text-white/40 mt-0.5" data-testid="text-vtc-benchmark-mobile">
                    Typical: 3–7x
                  </p>
                )}
              </div>
              <div>
                <p className="text-[12px] text-white/50 uppercase tracking-wide mb-1">Payback</p>
                <p className="text-xl font-bold" data-testid="text-payback">{summary.paybackMonth ? `${summary.paybackMonth} mo` : "—"}</p>
                {summary.paybackMonth && (
                  <p className="text-[12px] text-white/40 mt-0.5" data-testid="text-payback-benchmark-mobile">
                    Typical: 4–12 mo
                  </p>
                )}
              </div>
              <div>
                <p className="text-[12px] text-white/50 uppercase tracking-wide mb-1">Simple ROI</p>
                <p className="text-xl font-bold" data-testid="text-roi">{Math.round(summary.simpleROI * 100)}%</p>
                <p className="text-[12px] text-white/40 mt-0.5" data-testid="text-roi-benchmark-mobile">
                  Typical: 200–600%
                </p>
              </div>
              <div>
                <p className="text-[12px] text-white/50 uppercase tracking-wide mb-1">Hours Returned</p>
                <p className="text-xl font-bold" data-testid="text-hours">{fmtNum(summary.totalHours)}</p>
                {summary.totalHours > 0 && (
                  <p className="text-[12px] text-white/50 mt-0.5" data-testid="text-fte-mobile">≈ {fteEquivalent.toFixed(1)} FTEs</p>
                )}
              </div>
            </div>
          </div>

          {/* Desktop: 5 cols */}
          <div className="hidden min-[820px]:grid grid-cols-5 gap-6">
            <div>
              <p className="text-xs text-white/50 uppercase tracking-wide mb-1">Annual Value at Scale</p>
              <p className="text-3xl font-bold text-[#EA2C00]">{fmt(summary.runRateValue)}</p>
              {totalProviders > 0 && (
                <p className="text-[12px] text-white/50 mt-1" data-testid="text-per-provider">per provider: {fmt(perProviderValue)}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-white/50 uppercase tracking-wide mb-1">Value-to-Cost</p>
              <p className="text-2xl font-bold text-[#E8350A]">{hasInvestment ? `${summary.valueToCost.toFixed(1)}x` : "N/A"}</p>
              {hasInvestment && (
                <p className="text-[12px] text-white/40 mt-1" data-testid="text-vtc-benchmark">
                  Typical: 3–7x
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-white/50 uppercase tracking-wide mb-1">Payback</p>
              <p className="text-2xl font-bold">{summary.paybackMonth ? `${summary.paybackMonth} mo` : "—"}</p>
              {summary.paybackMonth && (
                <p className="text-[12px] text-white/40 mt-1" data-testid="text-payback-benchmark">
                  Typical: 4–12 mo
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-white/50 uppercase tracking-wide mb-1">Simple ROI</p>
              <p className="text-2xl font-bold">{Math.round(summary.simpleROI * 100)}%</p>
              <p className="text-[12px] text-white/40 mt-1" data-testid="text-roi-benchmark">
                Typical: 200–600%
              </p>
            </div>
            <div>
              <p className="text-xs text-white/50 uppercase tracking-wide mb-1">Hours Returned</p>
              <p className="text-2xl font-bold">{fmtNum(summary.totalHours)}</p>
              {summary.totalHours > 0 && (
                <p className="text-[12px] text-white/50 mt-1" data-testid="text-fte">≈ {fteEquivalent.toFixed(1)} FTEs</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {/* Setting strip cards */}
        <div className="flex gap-3 overflow-x-auto pb-4 mb-6 sm:mb-8 -mx-2 px-2">
          {settings.map(s => {
            const Icon = SETTING_ICONS[s.careSetting] || Building2;
            return (
              <div
                key={s.id}
                className="flex-shrink-0 bg-[#F9F6F2] rounded-xl p-3 sm:p-4 min-w-[160px] sm:min-w-[200px] border-l-4"
                style={{ borderLeftColor: s.color }}
                data-testid={`strip-card-${s.careSetting}`}
              >
                <div className="flex items-center gap-2 mb-1 sm:mb-2">
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: s.color }} />
                  <span className="text-xs sm:text-sm font-bold text-neutral-900">{s.label}</span>
                </div>
                <p className="text-base sm:text-lg font-bold" style={{ color: s.color }}>{fmt(s.annualValue)}</p>
                <p className="text-[12px] sm:text-xs text-neutral-500 mt-1">
                  {(() => {
                    const cYears = Math.ceil(config.contractTermMonths / 12);
                    const yp = s.yearlyProviders;
                    if (!yp) return `${fmtNum(s.providerCount)} → ${fmtNum(s.fullScaleProviders || s.providerCount)} ${SETTING_UNIT_LABELS[s.careSetting]}`;
                    const finalCount = cYears >= 3 ? yp.year3 : cYears >= 2 ? yp.year2 : yp.year1;
                    if (cYears <= 1) return `${fmtNum(yp.year1)} ${SETTING_UNIT_LABELS[s.careSetting]}`;
                    return `Y1: ${fmtNum(yp.year1)} → Y${cYears}: ${fmtNum(finalCount)} ${SETTING_UNIT_LABELS[s.careSetting]}`;
                  })()}
                </p>
              </div>
            );
          })}
        </div>

        {/* CHART */}
        <motion.div
          className="mb-8 sm:mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900">Value Growth Trajectory</h2>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-neutral-500">
              <Users className="w-3.5 h-3.5" />
              <span>
                {(() => {
                  const cYears = Math.ceil(config.contractTermMonths / 12);
                  const y1 = settings.reduce((s, v) => s + (v.yearlyProviders?.year1 || v.providerCount), 0);
                  const yFinal = settings.reduce((s, v) => s + (cYears >= 3 ? (v.yearlyProviders?.year3 || v.fullScaleProviders || v.providerCount) : cYears >= 2 ? (v.yearlyProviders?.year2 || v.fullScaleProviders || v.providerCount) : (v.yearlyProviders?.year1 || v.providerCount)), 0);
                  const label = settings.length > 1 ? "units" : SETTING_UNIT_LABELS[settings[0]?.careSetting];
                  if (cYears <= 1) return `${fmtNum(y1)} total ${label}`;
                  return `${fmtNum(y1)} → ${fmtNum(yFinal)} total ${label}`;
                })()}
              </span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 mb-3 sm:mb-4">
            {config.viewMode === "yearly"
              ? "Annual value by driver type"
              : isMobile
                ? "Quarterly value by driver type"
                : `Quarterly value by driver type — Year 1 reflects partial retention and capacity effects. Years 2${Math.ceil(config.contractTermMonths / 12) > 2 ? `-${Math.ceil(config.contractTermMonths / 12)}` : ""} reflect maturing adoption across all value drivers.`}
          </p>
          <div className="bg-[#F9F6F2] rounded-xl p-3 sm:p-6" data-testid="chart-ramp-up">
            <ResponsiveContainer width="100%" height={isMobile ? 300 : 420}>
              <ComposedChart data={chartData} margin={isMobile ? { top: 20, right: 10, left: 0, bottom: 20 } : { top: 30, right: 60, left: 10, bottom: 10 }}>
                <defs>
                  <linearGradient id="grad-doc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.doc} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={CHART_COLORS.doc} stopOpacity={0.03} />
                  </linearGradient>
                  <linearGradient id="grad-time" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.time} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={CHART_COLORS.time} stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="grad-retention" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.retention} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={CHART_COLORS.retention} stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="grad-investment" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.investment} stopOpacity={0.12} />
                    <stop offset="100%" stopColor={CHART_COLORS.investment} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E0DB" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: isMobile ? 10 : 12, fill: "#666" }}
                  interval={config.viewMode === "quarterly" ? (isMobile ? 2 : 1) : 0}
                  axisLine={{ stroke: "#D5D0CB" }}
                  angle={0}
                  textAnchor="middle"
                  height={30}
                />
                <YAxis
                  tickFormatter={(v: number) => fmt(v)}
                  tick={{ fontSize: isMobile ? 10 : 12, fill: "#666" }}
                  width={isMobile ? 55 : 80}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip settings={settings} totalProvidersByPeriod={totalProvidersByPeriod} />} />

                {config.viewMode === "quarterly" && !isMobile && goLiveLabels.length > 1 && goLiveLabels.map((gl, idx) => (
                  <ReferenceLine
                    key={`golive-${gl.label}`}
                    x={gl.label}
                    stroke={gl.color}
                    strokeDasharray="6 3"
                    strokeOpacity={0.45}
                    strokeWidth={1.5}
                    label={{
                      value: `${gl.name} Go-Live`,
                      position: "insideTopLeft",
                      fontSize: 9,
                      fill: gl.color,
                      dy: 8 + idx * 18,
                    }}
                  />
                ))}

                {paybackLabel && (
                  <ReferenceLine
                    x={paybackLabel}
                    stroke={CHART_COLORS.retention}
                    strokeDasharray="6 3"
                    strokeOpacity={0.6}
                    strokeWidth={1.5}
                    label={isMobile ? undefined : {
                      value: "Payback",
                      position: "insideTopRight",
                      fontSize: 10,
                      fill: CHART_COLORS.retention,
                      fontWeight: 600,
                      dy: 8,
                    }}
                  />
                )}

                <Area
                  type="monotone"
                  dataKey="investment"
                  stackId="inv"
                  fill="url(#grad-investment)"
                  stroke={CHART_COLORS.investment}
                  strokeWidth={isMobile ? 1 : 1.5}
                  name="Investment"
                />

                <Area
                  type="monotone"
                  dataKey="docValue"
                  stackId="value"
                  fill="url(#grad-doc)"
                  stroke={CHART_COLORS.doc}
                  strokeWidth={isMobile ? 1.5 : 2.5}
                  name="Doc Quality"
                />
                <Area
                  type="monotone"
                  dataKey="timeValue"
                  stackId="value"
                  fill="url(#grad-time)"
                  stroke={CHART_COLORS.time}
                  strokeWidth={isMobile ? 1.5 : 2.5}
                  name="Capacity & Efficiency"
                />
                <Area
                  type="monotone"
                  dataKey="retentionValue"
                  stackId="value"
                  fill="url(#grad-retention)"
                  stroke={CHART_COLORS.retention}
                  strokeWidth={isMobile ? 1.5 : 2.5}
                  name="Retention"
                />

                {!isMobile && lastChartPoint && lastChartPoint.totalValue > 0 && (
                  <ReferenceDot
                    x={lastChartPoint.label}
                    y={lastChartPoint.totalValue}
                    r={0}
                    label={{
                      value: fmt(lastChartPoint.totalValue),
                      position: "right",
                      fontSize: 11,
                      fontWeight: 700,
                      fill: CHART_COLORS.time,
                      dx: 4,
                    }}
                  />
                )}
                {!isMobile && lastChartPoint && lastChartPoint.investment > 0 && (
                  <ReferenceDot
                    x={lastChartPoint.label}
                    y={lastChartPoint.investment}
                    r={0}
                    label={{
                      value: fmt(lastChartPoint.investment),
                      position: "right",
                      fontSize: 10,
                      fontWeight: 600,
                      fill: "#666",
                      dx: 4,
                    }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>

            <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-center gap-x-4 gap-y-2 sm:gap-6 mt-4 text-xs sm:text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-2.5 rounded-sm inline-block opacity-80" style={{ backgroundColor: CHART_COLORS.doc }} />
                <span className="text-neutral-600">Doc Quality</span>
                {legendTotals.doc > 0 && (
                  <span className="text-neutral-400 font-medium">{fmt(legendTotals.doc)} {legendTotals.total > 0 ? `(${Math.round((legendTotals.doc / legendTotals.total) * 100)}%)` : ""}</span>
                )}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-2.5 rounded-sm inline-block opacity-80" style={{ backgroundColor: CHART_COLORS.time }} />
                <span className="text-neutral-600">Capacity & Efficiency</span>
                {legendTotals.time > 0 && (
                  <span className="text-neutral-400 font-medium">{fmt(legendTotals.time)} {legendTotals.total > 0 ? `(${Math.round((legendTotals.time / legendTotals.total) * 100)}%)` : ""}</span>
                )}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-2.5 rounded-sm inline-block opacity-80" style={{ backgroundColor: CHART_COLORS.retention }} />
                <span className="text-neutral-600">Retention</span>
                {legendTotals.retention > 0 && (
                  <span className="text-neutral-400 font-medium">{fmt(legendTotals.retention)} {legendTotals.total > 0 ? `(${Math.round((legendTotals.retention / legendTotals.total) * 100)}%)` : ""}</span>
                )}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-0.5 rounded-full inline-block" style={{ borderTop: `2px solid ${CHART_COLORS.investment}` }} />
                <span className="text-neutral-600">Investment</span>
                {legendTotals.inv > 0 && (
                  <span className="text-neutral-400 font-medium">{fmt(legendTotals.inv)}</span>
                )}
              </span>
            </div>

            {config.retentionPhasing.year2Pct > 0 && (
              <div className="flex items-center justify-center gap-4 mt-2 text-[12px] text-neutral-400">
                <span>Retention: {config.retentionPhasing.year1Pct}% Y1 → {config.retentionPhasing.year2Pct}% Y2 → {config.retentionPhasing.year3Pct}% Y3{config.contractTermMonths > 36 ? "+" : ""}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* PRICING & CONFIG */}
        <motion.div
          className="bg-[#F9F6F2] rounded-xl p-4 sm:p-6 mb-8 sm:mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          data-testid="panel-pricing"
        >
          <div className="flex items-center gap-2 mb-4 sm:mb-5">
            <Settings className="w-5 h-5 text-neutral-600" />
            <h2 className="text-base sm:text-lg font-bold text-neutral-900">Pricing & Configuration</h2>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6 flex-wrap">
            <span className="text-xs sm:text-sm font-medium text-neutral-600">Contract:</span>
            <div className="flex items-center gap-1 bg-white rounded-full p-0.5 border border-neutral-200">
              {([24, 36] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setConfig(c => ({ ...c, contractTermMonths: t }))}
                  className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors ${config.contractTermMonths === t && ![24, 36].includes(config.contractTermMonths) ? "" : config.contractTermMonths === t ? "bg-[#1A1A1A] text-white" : "text-neutral-500 hover:text-neutral-900"}`}
                  data-testid={`toggle-term-${t}`}
                >
                  {t / 12}-Year
                </button>
              ))}
              <button
                onClick={() => setConfig(c => ({ ...c, contractTermMonths: ![24, 36].includes(c.contractTermMonths) ? c.contractTermMonths : 48 }))}
                className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors ${![24, 36].includes(config.contractTermMonths) ? "bg-[#1A1A1A] text-white" : "text-neutral-500 hover:text-neutral-900"}`}
                data-testid="toggle-term-custom"
              >
                Custom
              </button>
            </div>
            {![24, 36].includes(config.contractTermMonths) && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={config.contractTermMonths / 12}
                  onChange={(e) => {
                    const years = Math.max(1, Math.min(6, parseInt(e.target.value) || 1));
                    setConfig(c => ({ ...c, contractTermMonths: years * 12 }));
                  }}
                  className="w-16 h-8 rounded-lg border border-neutral-300 bg-white px-2 text-sm text-center"
                  data-testid="input-custom-years"
                />
                <span className="text-xs sm:text-sm text-neutral-500">years</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {settings.map(s => {
              const Icon = SETTING_ICONS[s.careSetting] || Building2;
              const yp = s.yearlyProviders || { year1: s.providerCount, year2: s.fullScaleProviders || s.providerCount, year3: s.fullScaleProviders || s.providerCount };
              const isFlat = s.pricingModel === "annualFlat";
              const isEnc = s.pricingModel === "perEncounter";
              const flatFee = s.annualLicenseFee || 0;
              const encAnnual = (s.costPerEncounter || 0) * s.encounters;
              const baseProv = s.providerCount || 1;
              const ye = s.yearlyEncounters ?? { year1: s.encounters, year2: s.encounters, year3: s.encounters };
              const y1Months = 13 - s.goLiveMonth;
              const y1Cost = isFlat ? flatFee * (y1Months / 12) : isEnc ? (s.costPerEncounter || 0) * ye.year1 * (y1Months / 12) : s.costPerUnit * yp.year1 * y1Months;
              const y2Cost = isFlat ? flatFee : isEnc ? (s.costPerEncounter || 0) * ye.year2 : s.costPerUnit * yp.year2 * 12;
              const y3Cost = isFlat ? flatFee : isEnc ? (s.costPerEncounter || 0) * ye.year3 : s.costPerUnit * yp.year3 * 12;
              const unitLabel = SETTING_UNIT_LABELS[s.careSetting];
              const contractYears = Math.ceil(config.contractTermMonths / 12);
              const showY2 = contractYears >= 2;
              const showY3 = contractYears >= 3;
              return (
                <div
                  key={s.id}
                  className="bg-white rounded-xl overflow-hidden border border-neutral-200"
                  data-testid={`pricing-card-${s.careSetting}`}
                >
                  <div className="flex">
                    <div className="w-1.5 flex-shrink-0" style={{ backgroundColor: s.color }} />
                    <div className="flex-1 p-4 sm:p-5">
                      <div className="flex items-center gap-2.5 mb-4">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${s.color}15` }}>
                          <Icon className="w-4 h-4" style={{ color: s.color }} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-neutral-900">{s.label}</h3>
                          <p className="text-xs text-neutral-500">{showY2 ? `${fmtNum(yp.year1)} → ${fmtNum(showY3 ? yp.year3 : yp.year2)} ${unitLabel}` : `${fmtNum(yp.year1)} ${unitLabel}`}</p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-[12px] font-medium text-neutral-400 uppercase tracking-[1.5px] mb-2">Rollout Plan</p>
                        {isEnc ? (
                          <div className={`grid gap-3 ${showY3 ? 'grid-cols-3' : showY2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            <div>
                              <label className="block text-[12px] text-neutral-500 mb-1">Y1 encounters</label>
                              <FormattedNumberInput
                                value={ye.year1}
                                onChange={(v) => onUpdateSetting(s.id, { yearlyEncounters: { ...ye, year1: Math.max(v, 1) } })}
                                className="w-full text-right text-sm h-8 bg-white border border-neutral-300 rounded-lg px-2"
                                data-testid={`input-y1-enc-${s.careSetting}`}
                              />
                            </div>
                            {showY2 && (
                              <div>
                                <label className="block text-[12px] text-neutral-500 mb-1">Y2 encounters</label>
                                <FormattedNumberInput
                                  value={ye.year2}
                                  onChange={(v) => onUpdateSetting(s.id, { yearlyEncounters: { ...ye, year2: Math.max(v, 1) } })}
                                  className="w-full text-right text-sm h-8 bg-white border border-neutral-300 rounded-lg px-2"
                                  data-testid={`input-y2-enc-${s.careSetting}`}
                                />
                              </div>
                            )}
                            {showY3 && (
                              <div>
                                <label className="block text-[12px] text-neutral-500 mb-1">Y3{contractYears > 3 ? "+" : ""} encounters</label>
                                <FormattedNumberInput
                                  value={ye.year3}
                                  onChange={(v) => onUpdateSetting(s.id, { yearlyEncounters: { ...ye, year3: Math.max(v, 1) } })}
                                  className="w-full text-right text-sm h-8 bg-white border border-neutral-300 rounded-lg px-2"
                                  data-testid={`input-y3-enc-${s.careSetting}`}
                                />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className={`grid gap-3 ${showY3 ? 'grid-cols-3' : showY2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            <div>
                              <label className="block text-[12px] text-neutral-500 mb-1">Y1 {unitLabel}</label>
                              <FormattedNumberInput
                                value={yp.year1}
                                onChange={(v) => onUpdateSetting(s.id, { yearlyProviders: { ...yp, year1: Math.max(v, 1) } })}
                                className="w-full text-right text-sm h-8 bg-white border border-neutral-300 rounded-lg px-2"
                                data-testid={`input-y1-${s.careSetting}`}
                              />
                            </div>
                            {showY2 && (
                              <div>
                                <label className="block text-[12px] text-neutral-500 mb-1">Y2 {unitLabel}</label>
                                <FormattedNumberInput
                                  value={yp.year2}
                                  onChange={(v) => onUpdateSetting(s.id, { yearlyProviders: { ...yp, year2: Math.max(v, 1) } })}
                                  className="w-full text-right text-sm h-8 bg-white border border-neutral-300 rounded-lg px-2"
                                  data-testid={`input-y2-${s.careSetting}`}
                                />
                              </div>
                            )}
                            {showY3 && (
                              <div>
                                <label className="block text-[12px] text-neutral-500 mb-1">Y3{contractYears > 3 ? "+" : ""} {unitLabel}</label>
                                <FormattedNumberInput
                                  value={yp.year3}
                                  onChange={(v) => onUpdateSetting(s.id, { yearlyProviders: { ...yp, year3: Math.max(v, 1) } })}
                                  className="w-full text-right text-sm h-8 bg-white border border-neutral-300 rounded-lg px-2"
                                  data-testid={`input-y3-${s.careSetting}`}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="mb-4">
                        <p className="text-[12px] font-medium text-neutral-400 uppercase tracking-[1.5px] mb-2">Pricing</p>
                        <div className="flex gap-1.5 mb-3">
                          {(["perUnit", "annualFlat", "perEncounter"] as const).map(pm => (
                            <button
                              key={pm}
                              onClick={() => onUpdateSetting(s.id, { pricingModel: pm })}
                              className={`px-2.5 py-1 rounded-full text-[12px] font-medium transition-colors ${(pm === "perUnit" && !s.pricingModel) || s.pricingModel === pm ? "bg-[#1A1A1A] text-white" : "text-neutral-500 hover:text-neutral-900 bg-neutral-100"}`}
                              data-testid={`toggle-${pm}-${s.careSetting}`}
                            >
                              {pm === "perUnit" ? "Per Unit/Mo" : pm === "annualFlat" ? "Annual License" : "Per Encounter"}
                            </button>
                          ))}
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {s.pricingModel === "annualFlat" ? (
                            <div>
                              <label className="block text-[12px] text-neutral-500 mb-1">Annual Fee</label>
                              <FormattedNumberInput
                                value={s.annualLicenseFee || 0}
                                onChange={(v) => onUpdateSetting(s.id, { annualLicenseFee: Math.max(v, 0) })}
                                prefix="$"
                                className="w-full text-right text-sm h-8 bg-white border border-neutral-300 rounded-lg px-2"
                                data-testid={`input-annual-fee-${s.careSetting}`}
                              />
                            </div>
                          ) : s.pricingModel === "perEncounter" ? (
                            <div>
                              <label className="block text-[12px] text-neutral-500 mb-1">$/Encounter</label>
                              <FormattedNumberInput
                                value={s.costPerEncounter || 0}
                                onChange={(v) => onUpdateSetting(s.id, { costPerEncounter: Math.max(v, 0) })}
                                prefix="$"
                                className="w-full text-right text-sm h-8 bg-white border border-neutral-300 rounded-lg px-2"
                                data-testid={`input-cost-encounter-${s.careSetting}`}
                              />
                            </div>
                          ) : (
                            <div>
                              <label className="block text-[12px] text-neutral-500 mb-1">$/Unit/Mo</label>
                              <FormattedNumberInput
                                value={s.costPerUnit}
                                onChange={(v) => onUpdateSetting(s.id, { costPerUnit: v })}
                                prefix="$"
                                className="w-full text-right text-sm h-8 bg-white border border-neutral-300 rounded-lg px-2"
                                data-testid={`input-cost-${s.careSetting}`}
                              />
                            </div>
                          )}
                          <div>
                            <label className="block text-[12px] text-neutral-500 mb-1">Go-Live</label>
                            <select
                              value={s.goLiveMonth}
                              onChange={(e) => onUpdateSetting(s.id, { goLiveMonth: parseInt(e.target.value) })}
                              className="w-full h-8 rounded-lg border border-neutral-300 bg-white px-2 text-sm"
                              data-testid={`select-golive-view-${s.careSetting}`}
                            >
                              {Array.from({ length: config.contractTermMonths }, (_, i) => (
                                <option key={i + 1} value={i + 1}>Month {i + 1}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[12px] text-neutral-500 mb-1">Impl. Fee</label>
                            <FormattedNumberInput
                              value={s.implementationFee}
                              onChange={(v) => onUpdateSetting(s.id, { implementationFee: v })}
                              prefix="$"
                              className="w-full text-right text-sm h-8 bg-white border border-neutral-300 rounded-lg px-2"
                              data-testid={`input-impl-${s.careSetting}`}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="bg-[#F9F6F2] rounded-lg px-3 py-2.5">
                        <p className="text-[12px] font-medium text-neutral-400 uppercase tracking-[1.5px] mb-1.5">Annual Investment</p>
                        <div className={`grid gap-3 ${showY3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                          <div>
                            <p className="text-[12px] text-neutral-500">Year 1</p>
                            <p className="text-sm font-semibold text-neutral-800">{fmtFull(y1Cost)}</p>
                          </div>
                          <div>
                            <p className="text-[12px] text-neutral-500">Year 2</p>
                            <p className="text-sm font-semibold text-neutral-800">{fmtFull(y2Cost)}</p>
                          </div>
                          {showY3 && (
                            <div>
                              <p className="text-[12px] text-neutral-500">Year 3</p>
                              <p className="text-sm font-semibold text-neutral-800">{fmtFull(y3Cost)}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Retention phasing */}
          <div className="mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-neutral-200">
            <p className="text-sm font-bold text-neutral-700 mb-1">Retention Benefit Phasing</p>
            <p className="text-xs text-neutral-500 mb-1">When do retention benefits materialize?</p>
            <p className="text-xs text-neutral-400 mb-3 sm:mb-4">This reflects the organizational behavior change timeline — separate from the 3-month clinical onset delay already built into capacity & efficiency cash flows.</p>
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {(["year1Pct", "year2Pct", "year3Pct"] as const).map((key, idx) => (
                <div key={key}>
                  <label className="block text-[12px] sm:text-xs text-neutral-500 mb-1">Year {idx + 1}{idx === 2 && config.contractTermMonths > 36 ? "+" : ""}</label>
                  <div className="flex items-center gap-1 sm:gap-2">
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
                    <span className="text-xs sm:text-sm font-bold text-neutral-900 w-8 sm:w-10 text-right">{config.retentionPhasing[key]}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* FINANCIAL SUMMARY */}
        <motion.div
          className="mb-8 sm:mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-base sm:text-lg font-bold text-neutral-900 mb-1">{contractTermLabel(config.contractTermMonths)} Financial Summary</h2>
          <p className="text-xs sm:text-sm text-neutral-500 mb-3 sm:mb-4">Phased projection with onset timing and conservative retention modeling</p>
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 touch-manipulation" style={{ WebkitOverflowScrolling: 'touch' }} data-testid="table-pnl">
            <table className="w-full text-xs sm:text-sm min-w-[340px]">
              <thead>
                <tr className="border-b-2 border-neutral-300">
                  <th className="text-left py-2 sm:py-3 font-medium text-neutral-500 pr-2"></th>
                  {yearlyData.map(y => (
                    <th key={y.label} className="text-right py-2 sm:py-3 font-bold text-neutral-900 px-1.5 sm:px-4">{y.label}</th>
                  ))}
                  <th className="text-right py-2 sm:py-3 font-bold text-neutral-900 px-1.5 sm:px-4">Total</th>
                </tr>
              </thead>
              <tbody>
                {settings.map(s => (
                  <tr key={s.id} className="border-b border-neutral-100">
                    <td className="py-2 sm:py-2.5 pr-2">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="font-medium text-neutral-800 truncate max-w-[80px] sm:max-w-none">{isMobile ? (s.label.length > 10 ? s.label.substring(0, 8) + "..." : s.label) : s.label}</span>
                      </div>
                    </td>
                    {yearlyData.map(y => (
                      <td key={y.label} className="text-right py-2 sm:py-2.5 px-1.5 sm:px-4 text-neutral-700">
                        {fmt(y.bySettings[s.id]?.value || 0)}
                      </td>
                    ))}
                    <td className="text-right py-2 sm:py-2.5 px-1.5 sm:px-4 font-medium text-neutral-900">
                      {fmt(yearlyData.reduce((sum, y) => sum + (y.bySettings[s.id]?.value || 0), 0))}
                    </td>
                  </tr>
                ))}
                <tr className="border-b border-neutral-300 bg-neutral-50">
                  <td className="py-2 sm:py-2.5 font-bold text-neutral-900">Total Value</td>
                  {yearlyData.map(y => (
                    <td key={y.label} className="text-right py-2 sm:py-2.5 px-1.5 sm:px-4 font-bold text-neutral-900">{fmt(y.totalValue)}</td>
                  ))}
                  <td className="text-right py-2 sm:py-2.5 px-1.5 sm:px-4 font-bold text-[#EA2C00]">{fmt(summary.termValue)}</td>
                </tr>
                {!isMobile && (
                  <>
                    <tr className="border-b border-neutral-100">
                      <td className="py-2 pl-4 text-xs" style={{ color: CHART_COLORS.doc }}>Doc Quality (immediate)</td>
                      {yearlyData.map(y => (
                        <td key={y.label} className="text-right py-2 px-4 text-xs text-neutral-500">{fmt(y.docValue)}</td>
                      ))}
                      <td className="text-right py-2 px-4 text-xs text-neutral-500">
                        {fmt(yearlyData.reduce((s, y) => s + y.docValue, 0))}
                      </td>
                    </tr>
                    <tr className="border-b border-neutral-100">
                      <td className="py-2 pl-4 text-xs" style={{ color: CHART_COLORS.time }}>Capacity & Efficiency (3mo delay)</td>
                      {yearlyData.map(y => (
                        <td key={y.label} className="text-right py-2 px-4 text-xs text-neutral-500">{fmt(y.timeValue)}</td>
                      ))}
                      <td className="text-right py-2 px-4 text-xs text-neutral-500">
                        {fmt(yearlyData.reduce((s, y) => s + y.timeValue, 0))}
                      </td>
                    </tr>
                    <tr className="border-b border-neutral-100">
                      <td className="py-2 pl-4 text-xs" style={{ color: CHART_COLORS.retention }}>Retention (phased)</td>
                      {yearlyData.map(y => (
                        <td key={y.label} className="text-right py-2 px-4 text-xs text-neutral-500">{fmt(y.retentionValue)}</td>
                      ))}
                      <td className="text-right py-2 px-4 text-xs text-neutral-500">
                        {fmt(yearlyData.reduce((s, y) => s + y.retentionValue, 0))}
                      </td>
                    </tr>
                  </>
                )}
                {!isMobile && (
                  <tr className="border-b border-neutral-100">
                    <td className="py-2 pl-4 text-neutral-500 text-xs">Active Providers</td>
                    {yearlyData.map(y => {
                      const totalProviders = settings.reduce((sum, s) => sum + (y.bySettings[s.id]?.providers || 0), 0);
                      return (
                        <td key={y.label} className="text-right py-2 px-4 text-xs text-neutral-500">{fmtNum(totalProviders)}</td>
                      );
                    })}
                    <td className="text-right py-2 px-4 text-xs text-neutral-500">
                      {(() => {
                        const finalMonth = cashFlows[cashFlows.length - 1];
                        return finalMonth ? fmtNum(settings.reduce((sum, s) => sum + (finalMonth.bySettings[s.id]?.providers || 0), 0)) : "—";
                      })()}
                    </td>
                  </tr>
                )}
                <tr className="border-b border-neutral-200">
                  <td className="py-2 sm:py-2.5 font-medium text-red-600">Investment</td>
                  {yearlyData.map(y => (
                    <td key={y.label} className="text-right py-2 sm:py-2.5 px-1.5 sm:px-4 text-red-600">({fmt(y.investment)})</td>
                  ))}
                  <td className="text-right py-2 sm:py-2.5 px-1.5 sm:px-4 font-medium text-red-600">({fmt(summary.termInvestment)})</td>
                </tr>
                <tr className="bg-neutral-50">
                  <td className="py-2.5 sm:py-3 font-bold text-neutral-900">Net Value</td>
                  {yearlyData.map(y => (
                    <td key={y.label} className={`text-right py-2.5 sm:py-3 px-1.5 sm:px-4 font-bold ${y.netValue >= 0 ? "text-[#E8350A]" : "text-red-600"}`}>
                      {y.netValue >= 0 ? fmt(y.netValue) : `(${fmt(Math.abs(y.netValue))})`}
                    </td>
                  ))}
                  <td className={`text-right py-2.5 sm:py-3 px-1.5 sm:px-4 font-bold ${isMobile ? "text-base" : "text-lg"} ${summary.termNet >= 0 ? "text-[#E8350A]" : "text-red-600"}`}>
                    {summary.termNet >= 0 ? fmt(summary.termNet) : `(${fmt(Math.abs(summary.termNet))})`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* METRIC PANELS - 2x2 on mobile, 4 cols on desktop */}
        <motion.div
          className="grid grid-cols-2 min-[820px]:grid-cols-4 gap-3 sm:gap-4 mb-8 sm:mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="bg-[#F9F6F2] rounded-xl p-4 sm:p-5 text-center" data-testid="panel-vtc">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-[#E8350A] mx-auto mb-1.5 sm:mb-2" />
            <p className="text-[9px] sm:text-[12px] text-neutral-500 uppercase tracking-wide mb-0.5 sm:mb-1">Value-to-Cost</p>
            <p className="text-2xl sm:text-3xl font-bold text-[#E8350A]" data-testid="text-vtc-panel">{hasInvestment ? `${summary.valueToCost.toFixed(1)}x` : "N/A"}</p>
            <p className="text-[9px] sm:text-[12px] text-neutral-400 mt-0.5">{hasInvestment ? "total return per $1 spent" : "No cost entered"}</p>
          </div>
          <div className="bg-[#F9F6F2] rounded-xl p-4 sm:p-5 text-center" data-testid="panel-simple-roi">
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-[#EA2C00] mx-auto mb-1.5 sm:mb-2" />
            <p className="text-[9px] sm:text-[12px] text-neutral-500 uppercase tracking-wide mb-0.5 sm:mb-1">Simple ROI</p>
            <p className="text-2xl sm:text-3xl font-bold text-neutral-900">{Math.round(summary.simpleROI * 100)}%</p>
            {hasInvestment && summary.irrValid && (
              <p className="text-[9px] sm:text-[12px] text-neutral-400 mt-1.5">{summary.irrMethod === "mirr" ? "MIRR" : "IRR"}: {fmtPct(summary.irr)}</p>
            )}
          </div>
          <div className="bg-[#F9F6F2] rounded-xl p-4 sm:p-5 text-center" data-testid="panel-payback">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-[#EA2C00] mx-auto mb-1.5 sm:mb-2" />
            <p className="text-[9px] sm:text-[12px] text-neutral-500 uppercase tracking-wide mb-0.5 sm:mb-1">Payback</p>
            <p className="text-2xl sm:text-3xl font-bold text-neutral-900">{summary.paybackMonth ?? "—"}</p>
            <p className="text-[9px] sm:text-[12px] text-neutral-400 mt-0.5">{summary.paybackMonth ? "months" : ""}</p>
          </div>
          <div className="bg-[#F9F6F2] rounded-xl p-4 sm:p-5 text-center" data-testid="panel-3yr-net">
            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-[#E8350A] mx-auto mb-1.5 sm:mb-2" />
            <p className="text-[9px] sm:text-[12px] text-neutral-500 uppercase tracking-wide mb-0.5 sm:mb-1">{contractTermLabel(config.contractTermMonths)} Net</p>
            <p className={`text-2xl sm:text-3xl font-bold ${summary.termNet >= 0 ? "text-[#E8350A]" : "text-red-600"}`}>
              {fmt(summary.termNet)}
            </p>
          </div>
        </motion.div>

        {/* SENSITIVITY ANALYSIS */}
        <motion.div
          className="mb-8 sm:mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.27 }}
          data-testid="panel-sensitivity"
        >
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-600" />
            <h2 className="text-base sm:text-lg font-bold text-neutral-900">Sensitivity Analysis</h2>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 mb-3 sm:mb-4">What if value drivers realize at different rates?</p>

          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div className="grid grid-cols-3">
              {([
                { key: "conservative" as const, label: "Conservative", sublabel: "70% Realization", accent: "#78716C", isBase: false },
                { key: "base" as const, label: "Base Case", sublabel: "Your Assumptions", accent: "#EA2C00", isBase: true },
                { key: "optimistic" as const, label: "Optimistic", sublabel: "130% Realization", accent: "#1A1A1A", isBase: false },
              ] as const).map((scenario, idx) => {
                const data = sensitivityAnalysis[scenario.key];
                return (
                  <div
                    key={scenario.key}
                    className={`p-3 sm:p-5 ${idx < 2 ? "border-r border-neutral-100" : ""} ${scenario.isBase ? "bg-[#FAFAF9]" : ""}`}
                    data-testid={`sensitivity-${scenario.key}`}
                  >
                    <div className="h-0.5 rounded-full mb-3 sm:mb-4" style={{ backgroundColor: scenario.accent }} />
                    <p className="text-[12px] sm:text-xs font-bold text-neutral-900 mb-0.5">{scenario.label}</p>
                    <p className="text-[9px] sm:text-[12px] text-neutral-400 mb-3 sm:mb-4">{scenario.sublabel}</p>

                    <div className="space-y-3 sm:space-y-4">
                      <div>
                        <p className="text-[9px] sm:text-[12px] text-neutral-400 uppercase tracking-wider mb-0.5">Annual Value</p>
                        <p className={`text-sm sm:text-lg font-bold ${scenario.isBase ? "text-[#EA2C00]" : "text-neutral-900"}`} data-testid={`sensitivity-value-${scenario.key}`}>{fmt(data.annualValue)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] sm:text-[12px] text-neutral-400 uppercase tracking-wider mb-0.5">Value-to-Cost</p>
                        <p className={`text-sm sm:text-lg font-bold ${scenario.isBase ? "text-[#EA2C00]" : "text-neutral-900"}`} data-testid={`sensitivity-vtc-${scenario.key}`}>
                          {hasInvestment ? `${data.valueToCost.toFixed(1)}x` : "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] sm:text-[12px] text-neutral-400 uppercase tracking-wider mb-0.5">Payback</p>
                        <p className="text-sm sm:text-lg font-bold text-neutral-900" data-testid={`sensitivity-payback-${scenario.key}`}>
                          {data.paybackMonth ? `${data.paybackMonth} mo` : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] sm:text-[12px] text-neutral-400 uppercase tracking-wider mb-0.5">Net Value</p>
                        <p className={`text-sm sm:text-lg font-bold ${data.termNet >= 0 ? "text-neutral-900" : "text-red-600"}`} data-testid={`sensitivity-net-${scenario.key}`}>
                          {fmt(data.termNet)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {(() => {
              const consVal = sensitivityAnalysis.conservative.annualValue;
              const baseVal = sensitivityAnalysis.base.annualValue;
              const optVal = sensitivityAnalysis.optimistic.annualValue;
              const minVal = Math.min(consVal, baseVal, optVal);
              const maxVal = Math.max(consVal, baseVal, optVal);
              const range = maxVal - minVal || 1;
              const pos = (v: number) => ((v - minVal) / range) * 100;
              const consPos = pos(consVal);
              const basePos = pos(baseVal);
              const optPos = pos(optVal);

              return (
                <div className="px-4 sm:px-6 py-4 sm:py-5 border-t border-neutral-100">
                  <p className="text-[12px] sm:text-xs font-medium text-neutral-500 mb-3">Annual Value Range</p>
                  <div className="relative h-6 mb-1">
                    <div className="absolute top-1/2 left-0 right-0 h-px bg-neutral-200 -translate-y-1/2" />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-neutral-400 ring-2 ring-white"
                      style={{ left: `${consPos}%`, marginLeft: "-4px" }}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#EA2C00] ring-2 ring-white"
                      style={{ left: `${basePos}%`, marginLeft: "-6px" }}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-neutral-800 ring-2 ring-white"
                      style={{ left: `${optPos}%`, marginLeft: "-4px" }}
                    />
                  </div>
                  <div className="relative h-4">
                    <span
                      className="absolute text-[9px] sm:text-[12px] text-neutral-400 font-medium -translate-x-1/2"
                      style={{ left: `${consPos}%` }}
                    >
                      {fmt(consVal)}
                    </span>
                    <span
                      className="absolute text-[9px] sm:text-[12px] text-[#EA2C00] font-bold -translate-x-1/2"
                      style={{ left: `${basePos}%` }}
                    >
                      {fmt(baseVal)}
                    </span>
                    <span
                      className="absolute text-[9px] sm:text-[12px] text-neutral-700 font-medium -translate-x-1/2"
                      style={{ left: `${optPos}%` }}
                    >
                      {fmt(optVal)}
                    </span>
                  </div>
                </div>
              );
            })()}

            <div className="px-4 sm:px-6 pb-4 sm:pb-5">
              <p className="text-[12px] sm:text-xs text-neutral-400 leading-relaxed">
                Scenarios vary only value realization (70%–130%). Investment held constant at {fmt(summary.termInvestment)}.
              </p>
            </div>
          </div>
        </motion.div>

        {/* METHODOLOGY */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-8 sm:mb-10"
        >
          <button
            onClick={() => setShowMethodology(!showMethodology)}
            className="w-full flex items-center justify-between p-3 sm:p-4 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors text-xs sm:text-sm"
            data-testid="button-methodology"
          >
            <span className="flex items-center gap-2 text-neutral-600">
              <Info className="w-4 h-4 flex-shrink-0" />
              <span>{isMobile ? "Methodology" : "How we calculated this — onset timing, IRR methodology & retention phasing"}</span>
            </span>
            {showMethodology ? <ChevronUp className="w-4 h-4 text-neutral-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-neutral-400 flex-shrink-0" />}
          </button>
          {showMethodology && (
            <div className="mt-2 p-4 sm:p-6 bg-white border border-neutral-200 rounded-xl text-xs sm:text-sm text-neutral-600 space-y-3">
              <p><strong className="text-neutral-900">Driver Onset Timing:</strong> Different value drivers materialize at different speeds. <strong style={{ color: '#1A1A1A' }}>Documentation quality</strong> improvements (wRVU, HCC, denials, DRG) kick in immediately — the AI produces better notes from day one. <strong className="text-[#EA2C00]">Capacity & efficiency</strong> gains (patient access, throughput, cost reduction, OT) take ~3 months as organizations operationalize freed-up capacity. <strong style={{ color: '#B45309' }}>Retention/wellbeing</strong> benefits phase in over years per your configured phasing.</p>
              <p><strong className="text-neutral-900">Value-to-Cost:</strong> Total contract value divided by total contract cost (implementation fees + subscription). A {summary.valueToCost.toFixed(1)}x ratio means you receive ${summary.valueToCost.toFixed(2)} in value for every $1 invested. This is the most intuitive metric for evaluating subscription technology commitments.</p>
              <p><strong className="text-neutral-900">Simple ROI:</strong> Total contract net value divided by total contract cost. {Math.round(summary.simpleROI * 100)}% means you get back ${(1 + summary.simpleROI).toFixed(2)} for every $1 invested, net of the investment itself.</p>
              <p><strong className="text-neutral-900">Internal Rate of Return (IRR):</strong> Calculated on annual cash flow periods — Period 0 is the total cost basis (implementation fees plus full contract subscription), and subsequent periods are annual gross value realized. This total-cost-basis approach answers the natural question: "What is my annualized return on total spend?" Capped at 200% for presentation credibility. Newton-Raphson with bisection fallback; cross-validated via NPV. Non-conventional flows use MIRR.</p>
              <p><strong className="text-neutral-900">Provider Expansion:</strong> Providers scale linearly from pilot count to full-scale count over the contract term. This models a realistic organizational rollout trajectory.</p>
              <p><strong className="text-neutral-900">Retention Phasing:</strong> Clinician/nurse retention benefits are conservatively phased — {config.retentionPhasing.year1Pct}% in Year 1, {config.retentionPhasing.year2Pct}% in Year 2, {config.retentionPhasing.year3Pct}% in Year 3{config.contractTermMonths > 36 ? "+" : ""}. Retention benefits ramp gradually within each year — reaching the configured phasing percentage by year-end. Year 1 at 20% means retention builds from 0% to 20% over the course of the year, not 20% from day one. This reflects the reality that retention improvements compound over time as documentation burden decreases and clinician satisfaction improves.</p>
              <p><strong className="text-neutral-900">Sensitivity:</strong> Two-sided analysis varying only value realization rate. Conservative models 70% realization (not all drivers materialize fully). Optimistic models 130% realization (better-than-expected outcomes). Subscription cost is held constant across all scenarios — it's contractual. This brackets the range of likely financial outcomes.</p>
            </div>
          )}
        </motion.div>

        {/* FOOTER ACTIONS */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 py-6 border-t border-neutral-200">
          <Button
            variant="outline"
            onClick={onBack}
            className="gap-2 order-2 sm:order-1"
            data-testid="button-edit-settings"
          >
            <Settings className="w-4 h-4" /> Edit Settings
          </Button>
          <Button
            onClick={() => setShowExportModal(true)}
            className="gap-2 bg-[#EA2C00] hover:bg-[#D42800] text-white px-6 sm:px-8 h-12 text-base font-semibold order-1 sm:order-2"
            data-testid="button-export-pdf"
          >
            <Download className="w-4 h-4" />
            Export Proforma PDF
          </Button>
        </div>

        {compareMode && scenarioSummaries.length > 0 && (
          <motion.div
            className="mb-8 sm:mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            data-testid="panel-scenario-comparison"
          >
            <div className="flex items-center gap-2 mb-1">
              <GitCompare className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-600" />
              <h2 className="text-base sm:text-lg font-bold text-neutral-900">Scenario Comparison</h2>
            </div>
            <p className="text-xs sm:text-sm text-neutral-500 mb-4">Current configuration vs. saved scenarios side-by-side</p>

            <div className="bg-[#F9F6F2] rounded-xl p-4 sm:p-6 mb-4">
              <div className="overflow-x-auto -mx-2 px-2 touch-manipulation" style={{ WebkitOverflowScrolling: 'touch' }} data-testid="comparison-table">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b-2 border-neutral-300">
                      <th className="text-left py-2 sm:py-3 font-medium text-neutral-500 pr-4 min-w-[120px]">Metric</th>
                      <th className="text-right py-2 sm:py-3 font-bold text-neutral-900 px-3 sm:px-4 min-w-[100px]">
                        <div className="flex items-center justify-end gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-[#1A1A1A]" />
                          Current
                        </div>
                      </th>
                      {scenarioSummaries.map((sc, idx) => (
                        <th key={sc.id} className="text-right py-2 sm:py-3 font-bold text-neutral-900 px-3 sm:px-4 min-w-[100px]">
                          <div className="flex items-center justify-end gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: SCENARIO_COLORS[idx % 3] }} />
                            <span className="truncate max-w-[80px]">{sc.name}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "Pricing", current: getPricingLabel(settings), values: scenarioSummaries.map(s => getPricingLabel(s.settings)), isText: true },
                      { label: "Annual Value at Scale", current: fmt(summary.runRateValue), values: scenarioSummaries.map(s => fmt(s.summary.runRateValue)) },
                      { label: `${contractTermLabel(config.contractTermMonths)} Value`, current: fmt(summary.termValue), values: scenarioSummaries.map(s => fmt(s.summary.termValue)) },
                      { label: "Total Investment", current: fmt(summary.termInvestment), values: scenarioSummaries.map(s => fmt(s.summary.termInvestment)) },
                      { label: "Net Value", current: fmt(summary.termNet), values: scenarioSummaries.map(s => fmt(s.summary.termNet)) },
                      { label: "Value-to-Cost", current: hasInvestment ? `${summary.valueToCost.toFixed(1)}x` : "N/A", values: scenarioSummaries.map(s => s.summary.termInvestment > 0 ? `${s.summary.valueToCost.toFixed(1)}x` : "N/A") },
                      { label: "Simple ROI", current: `${Math.round(summary.simpleROI * 100)}%`, values: scenarioSummaries.map(s => `${Math.round(s.summary.simpleROI * 100)}%`) },
                      { label: "Payback", current: summary.paybackMonth ? `${summary.paybackMonth} mo` : "—", values: scenarioSummaries.map(s => s.summary.paybackMonth ? `${s.summary.paybackMonth} mo` : "—") },
                      { label: "Hours Returned", current: fmtNum(summary.totalHours), values: scenarioSummaries.map(s => fmtNum(s.summary.totalHours)) },
                    ].map((row, ri) => (
                      <tr key={row.label} className={`border-b ${ri === 4 ? "border-neutral-300 bg-neutral-50" : ri === 0 ? "border-neutral-200 bg-amber-50/50" : "border-neutral-100"}`}>
                        <td className="py-2 sm:py-2.5 pr-4 font-medium text-neutral-700">{row.label}</td>
                        <td className={`${(row as any).isText ? "text-left" : "text-right"} py-2 sm:py-2.5 px-3 sm:px-4 ${ri === 4 ? "font-bold text-neutral-900" : ri === 0 ? "text-neutral-600 text-xs" : "text-neutral-700"}`}>{row.current}</td>
                        {row.values.map((v, i) => (
                          <td key={i} className={`${(row as any).isText ? "text-left text-xs" : "text-right"} py-2 sm:py-2.5 px-3 sm:px-4 ${ri === 4 ? "font-bold" : ""}`} style={{ color: ri === 4 ? SCENARIO_COLORS[i % 3] : undefined }}>{v}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-[#F9F6F2] rounded-xl p-3 sm:p-6" data-testid="comparison-chart">
              <p className="text-xs sm:text-sm font-medium text-neutral-600 mb-3">Value Trajectory Overlay</p>
              <ResponsiveContainer width="100%" height={isMobile ? 260 : 360}>
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
                  <Line
                    data={chartData}
                    type="monotone"
                    dataKey="total"
                    stroke="#1A1A1A"
                    strokeWidth={2.5}
                    dot={false}
                    name="Current"
                  />
                  {scenarioSummaries.map((sc, idx) => (
                    <Line
                      key={sc.id}
                      data={sc.chartData}
                      type="monotone"
                      dataKey="total"
                      stroke={SCENARIO_COLORS[idx % 3]}
                      strokeWidth={2}
                      strokeDasharray={SCENARIO_DASHES[idx % 3]}
                      dot={false}
                      name={sc.name}
                    />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-3 text-[12px] sm:text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-0.5 bg-[#1A1A1A] inline-block rounded-full" />
                  <span className="text-neutral-600">Current</span>
                </span>
                {scenarioSummaries.map((sc, idx) => (
                  <span key={sc.id} className="flex items-center gap-1.5">
                    <span className="w-4 h-0.5 inline-block rounded-full" style={{ backgroundColor: SCENARIO_COLORS[idx % 3], borderTop: SCENARIO_DASHES[idx % 3] ? "2px dashed" : undefined }} />
                    <span className="text-neutral-600">{sc.name}</span>
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <p className="text-[12px] sm:text-xs text-neutral-400 leading-relaxed mt-3 sm:mt-4 mb-6 sm:mb-8 text-center max-w-2xl mx-auto">
          Projections are modeled estimates based on user-provided inputs and published benchmarks. Retention benefits are conservatively phased. Driver onset timing reflects typical healthcare implementation timelines. This does not constitute a guarantee of financial outcomes.
        </p>
      </div>

      <AnimatePresence>
        {showSaveDialog && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSaveDialog(false)}
          >
            <motion.div
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-neutral-900">Save as Scenario</h3>
                <button onClick={() => setShowSaveDialog(false)} className="p-1 text-neutral-400 hover:text-neutral-600" data-testid="button-close-save-dialog">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-neutral-500 mb-4">
                Save your current deal configuration as a named scenario so you can compare different approaches side by side.
              </p>
              <input
                type="text"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveScenario(); }}
                placeholder="e.g., Conservative Rollout"
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm mb-4 outline-none focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00]/30"
                autoFocus
                data-testid="input-scenario-name"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowSaveDialog(false)}
                  className="flex-1"
                  data-testid="button-cancel-save"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveScenario}
                  className="flex-1 bg-[#EA2C00] hover:bg-[#D42800] text-white"
                  data-testid="button-confirm-save"
                >
                  Save
                </Button>
              </div>
              <p className="text-[12px] text-neutral-400 mt-3 text-center">
                {scenarios.length}/3 scenarios used
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <PDFExportModal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExportPDF}
        isExporting={isExporting}
        documentType="proforma"
      />
    </div>
  );
}

function CustomTooltip({ active, payload, label, settings, totalProvidersByPeriod }: any) {
  if (!active || !payload) return null;

  const docItem = payload.find((p: any) => p.dataKey === "docValue");
  const timeItem = payload.find((p: any) => p.dataKey === "timeValue");
  const retentionItem = payload.find((p: any) => p.dataKey === "retentionValue");
  const investmentItem = payload.find((p: any) => p.dataKey === "investment");

  const total = (docItem?.value || 0) + (timeItem?.value || 0) + (retentionItem?.value || 0);
  const periodIdx = payload[0]?.payload?.period ? payload[0].payload.period - 1 : 0;
  const providerCount = totalProvidersByPeriod?.[periodIdx] || 0;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-neutral-200 p-3 sm:p-4 text-xs sm:text-sm min-w-[200px] sm:min-w-[240px]">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <p className="font-bold text-neutral-900">{label}</p>
        {providerCount > 0 && (
          <span className="text-[12px] sm:text-xs text-neutral-400 flex items-center gap-1">
            <Users className="w-3 h-3" /> {fmtNum(providerCount)}
          </span>
        )}
      </div>

      {(docItem?.value || 0) > 0 && (
        <div className="flex justify-between gap-3 mb-1">
          <span className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.doc }} />
            <span className="text-neutral-600">Doc Quality</span>
          </span>
          <span className="font-medium text-neutral-900">{fmt(docItem.value)}</span>
        </div>
      )}
      {(timeItem?.value || 0) > 0 && (
        <div className="flex justify-between gap-3 mb-1">
          <span className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.time }} />
            <span className="text-neutral-600">Capacity & Efficiency</span>
          </span>
          <span className="font-medium text-neutral-900">{fmt(timeItem.value)}</span>
        </div>
      )}
      {(retentionItem?.value || 0) > 0 && (
        <div className="flex justify-between gap-3 mb-1">
          <span className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.retention }} />
            <span className="text-neutral-600">Retention</span>
          </span>
          <span className="font-medium text-neutral-900">{fmt(retentionItem.value)}</span>
        </div>
      )}

      <div className="border-t border-neutral-200 mt-2 pt-2 flex justify-between">
        <span className="font-bold text-neutral-900">Total</span>
        <span className="font-bold text-[#EA2C00]">{fmt(total)}</span>
      </div>
      {investmentItem && (
        <div className="flex justify-between mt-1">
          <span className="text-neutral-500">Investment</span>
          <span className="text-neutral-700">({fmt(investmentItem.value)})</span>
        </div>
      )}
    </div>
  );
}
