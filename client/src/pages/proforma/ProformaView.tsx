import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronDown, ChevronUp, Download, Settings, TrendingUp, Clock, DollarSign, Building2, HeartPulse, BedDouble, Stethoscope, Info, Loader2, Users, BarChart3, Shield, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceDot, CartesianGrid, Legend } from "recharts";
import type { ProformaSettingSnapshot, ProformaConfig, ProformaScenario } from "./proformaTypes";
import { SETTING_LABELS, SETTING_UNIT_LABELS, ONSET_DELAY_MONTHS } from "./proformaTypes";
import { buildMonthlyCashFlows, groupByQuarter, groupByYear, calculateProformaSummary, getYearlySummary, getContractStartDate } from "@/lib/proformaCalculations";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { generateProformaPDF } from "./ProformaPDFExport";
import { PDFExportModal } from "@/components/switch/PDFExportModal";
import { useToast } from "@/hooks/use-toast";

interface ProformaViewProps {
  settings: ProformaSettingSnapshot[];
  config: ProformaConfig;
  onConfigChange: (config: ProformaConfig) => void;
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
    const yp = s.yearlyPricing;
    const varied = yp && (yp.year1 !== yp.year2 || yp.year2 !== yp.year3);
    if (pm === "annualFlat") {
      const p = yp?.year1 ?? (s.annualLicenseFee || 0);
      return varied ? `Enterprise @ ${fmt(yp!.year1)}→${fmt(yp!.year3)}/yr` : `Enterprise @ ${fmt(p)}/yr`;
    }
    if (pm === "perEncounter") {
      const p = yp?.year1 ?? (s.costPerEncounter || 0);
      return varied ? `Per Encounter @ ${fmt(yp!.year1)}→${fmt(yp!.year3)}` : `Per Encounter @ ${fmt(p)}`;
    }
    const p = yp?.year1 ?? s.costPerUnit;
    return varied ? `Per Provider @ ${fmt(yp!.year1)}→${fmt(yp!.year3)}/mo` : `Per Provider @ ${fmt(p)}/mo`;
  });
  const unique = [...new Set(parts)];
  return unique.join("; ");
}

function fmtPct(n: number) {
  const val = Math.round(n * 100);
  return `${val}%`;
}


function contractTermLabel(months: number): string {
  return `${months / 12}-Year`;
}

interface DiffItem {
  label: string;
  valueA: string;
  valueB: string;
  category: "scope" | "drivers" | "pricing";
}

function getScenarioDiffs(a: ProformaScenario, b: ProformaScenario): DiffItem[] {
  const diffs: DiffItem[] = [];

  const settingsA = a.settings.map(s => s.careSetting);
  const settingsB = b.settings.map(s => s.careSetting);
  const allSettingTypes = Array.from(new Set([...settingsA, ...settingsB]));
  for (const st of allSettingTypes) {
    const inA = settingsA.includes(st);
    const inB = settingsB.includes(st);
    if (inA !== inB) {
      diffs.push({ label: SETTING_LABELS[st] || st, valueA: inA ? "included" : "—", valueB: inB ? "included" : "—", category: "scope" });
    }
  }

  for (const sa of a.settings) {
    const sb = b.settings.find(s => s.careSetting === sa.careSetting);
    if (!sb) continue;
    if (sa.providerCount !== sb.providerCount) {
      diffs.push({
        label: `${SETTING_LABELS[sa.careSetting]} ${SETTING_UNIT_LABELS[sa.careSetting] || "providers"}`,
        valueA: sa.providerCount.toLocaleString(),
        valueB: sb.providerCount.toLocaleString(),
        category: "scope",
      });
    }
  }

  for (const sa of a.settings) {
    const sb = b.settings.find(s => s.careSetting === sa.careSetting);
    if (!sb) continue;

    const wrvuA = sa.fullExploreState?.docQualityInputs?.wrvuScenario;
    const wrvuB = sb.fullExploreState?.docQualityInputs?.wrvuScenario;
    if (wrvuA && wrvuB && wrvuA !== wrvuB) {
      const pct: Record<string, string> = { conservative: "5%", typical: "7%", aggressive: "10%" };
      diffs.push({ label: "wRVU Capture", valueA: `${pct[wrvuA] || wrvuA} (${wrvuA})`, valueB: `${pct[wrvuB] || wrvuB} (${wrvuB})`, category: "drivers" });
    }

    const hccA = sa.fullExploreState?.docQualityInputs?.hccEnabled;
    const hccB = sb.fullExploreState?.docQualityInputs?.hccEnabled;
    if (hccA !== undefined && hccB !== undefined && hccA !== hccB) {
      diffs.push({ label: "HCC Capture", valueA: hccA ? "on" : "off", valueB: hccB ? "on" : "off", category: "drivers" });
    }

    const retA = sa.fullExploreState?.timeDriverInputs?.calculateRetentionValue;
    const retB = sb.fullExploreState?.timeDriverInputs?.calculateRetentionValue;
    if (retA !== undefined && retB !== undefined && retA !== retB) {
      diffs.push({ label: "Retention Value", valueA: retA ? "modeled" : "off", valueB: retB ? "modeled" : "off", category: "drivers" });
    }

    const paA = sa.fullExploreState?.timeDriverInputs?.patientAccessEnabled;
    const paB = sb.fullExploreState?.timeDriverInputs?.patientAccessEnabled;
    if (paA !== undefined && paB !== undefined && paA !== paB) {
      diffs.push({ label: "Patient Access", valueA: paA ? "on" : "off", valueB: paB ? "on" : "off", category: "drivers" });
    }

    const denA = sa.fullExploreState?.docQualityInputs?.denialsEnabled;
    const denB = sb.fullExploreState?.docQualityInputs?.denialsEnabled;
    if (denA !== undefined && denB !== undefined && denA !== denB) {
      diffs.push({ label: "Denial Prevention", valueA: denA ? "on" : "off", valueB: denB ? "on" : "off", category: "drivers" });
    }

    if (Math.abs(sa.utilizationPercent - sb.utilizationPercent) > 2) {
      diffs.push({ label: `${SETTING_LABELS[sa.careSetting]} Utilization`, valueA: `${sa.utilizationPercent}%`, valueB: `${sb.utilizationPercent}%`, category: "drivers" });
    }
  }

  const priceA = getPricingLabel(a.settings);
  const priceB = getPricingLabel(b.settings);
  if (priceA !== priceB) {
    diffs.push({ label: "Pricing", valueA: priceA, valueB: priceB, category: "pricing" });
  }

  return diffs;
}

function DriverInput({ driver, careSetting, hint, onChangeValue }: {
  driver: { id: string; name: string; value: number; onset: string };
  careSetting: string;
  hint: string;
  onChangeValue: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [rawText, setRawText] = useState('');

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium text-neutral-700">{driver.name}</label>
        <span className="text-[10px] text-neutral-400 capitalize">{driver.onset} onset</span>
      </div>
      <div className="flex items-center gap-1 mb-1">
        <span className="text-xs text-neutral-400">$</span>
        <input
          type="text"
          value={editing ? rawText : (driver.value > 0 ? Math.round(driver.value).toLocaleString() : '')}
          onChange={(e) => {
            const cleaned = e.target.value.replace(/[^0-9]/g, '');
            setRawText(cleaned);
            onChangeValue(parseFloat(cleaned) || 0);
          }}
          onFocus={() => {
            setEditing(true);
            setRawText(driver.value > 0 ? String(Math.round(driver.value)) : '');
          }}
          onBlur={() => { setEditing(false); }}
          className="w-full border border-neutral-200 rounded px-2 py-1.5 text-sm text-neutral-800 focus:outline-none focus:border-neutral-400"
          data-testid={`input-driver-${careSetting}-${driver.id}`}
        />
        <span className="text-[10px] text-neutral-400 whitespace-nowrap">/yr</span>
      </div>
      <p className="text-[10px] text-neutral-400 leading-relaxed">{hint}</p>
    </div>
  );
}

const CHART_COLORS = {
  doc: "#1E3A5F",
  time: "#EA2C00",
  retention: "#D4930A",
  investment: "#6B7280",
};

export default function ProformaView({
  settings,
  config,
  onConfigChange,
  onUpdateSetting,
  onBack,
  onHome,
}: ProformaViewProps) {
  const isMobile = useIsMobile();
  const setConfig = (updater: ProformaConfig | ((prev: ProformaConfig) => ProformaConfig)) => {
    if (typeof updater === "function") {
      onConfigChange(updater(config));
    } else {
      onConfigChange(updater);
    }
  };
  const [activeTab, setActiveTab] = useState<'summary' | 'assumptions' | 'detail'>('summary');
  const [showMethodology, setShowMethodology] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [versionA, setVersionA] = useState<ProformaScenario | null>(null);
  const [versionB, setVersionB] = useState<ProformaScenario | null>(null);
  const { toast } = useToast();

  function snapshotCurrent(label: "A" | "B") {
    const scenario: ProformaScenario = {
      id: `v${label}-${Date.now()}`,
      name: `Version ${label}`,
      settings: JSON.parse(JSON.stringify(settings)),
      config: JSON.parse(JSON.stringify(config)),
      createdAt: Date.now(),
    };
    if (label === "A") setVersionA(scenario);
    else setVersionB(scenario);
  }

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

  const totalFullScaleProviders = useMemo(() => {
    return settings.reduce((s, v) => s + (v.fullScaleProviders || v.providerCount), 0);
  }, [settings]);

  const fteEquivalent = useMemo(() => {
    return summary.totalHours / 2080;
  }, [summary.totalHours]);

  const perProviderValue = useMemo(() => {
    return totalFullScaleProviders > 0 ? summary.runRateValue / totalFullScaleProviders : 0;
  }, [summary.runRateValue, totalFullScaleProviders]);

  const hoursPerProvider = useMemo(() => {
    return totalFullScaleProviders > 0 ? Math.round(summary.totalHours / totalFullScaleProviders) : 0;
  }, [summary.totalHours, totalFullScaleProviders]);

  const sensitivityAnalysis = useMemo(() => {
    const buildScaled = (factor: number) => {
      const scaledValue = summary.termValue * factor;
      const scaledNet = scaledValue - summary.termInvestment;
      const scaledVTC = summary.termInvestment > 0 ? scaledValue / summary.termInvestment : 0;
      const scaledROI = summary.termInvestment > 0 ? scaledNet / summary.termInvestment : 0;
      const scaledAnnual = summary.runRateValue * factor;

      const totalImplFees = settings.reduce((s, v) => s + v.implementationFee, 0);

      let scaledPayback: number | null = null;
      let cumValue = -totalImplFees;
      for (const row of cashFlows) {
        const scaledMonthValue = row.totalValue * factor;
        cumValue += scaledMonthValue - row.investment;
        if (cumValue >= 0 && scaledPayback === null) {
          scaledPayback = row.period;
        }
      }

      return {
        annualValue: scaledAnnual,
        valueToCost: scaledVTC,
        paybackMonth: scaledPayback,
        termNet: scaledNet,
        simpleROI: scaledROI,
      };
    };

    return {
      conservative: buildScaled(0.7),
      base: {
        annualValue: summary.runRateValue,
        valueToCost: summary.valueToCost,
        paybackMonth: summary.paybackMonth,
        termNet: summary.termNet,
        simpleROI: summary.simpleROI,
      },
      optimistic: buildScaled(1.3),
    };
  }, [settings, config, summary, cashFlows]);

  const chartData = useMemo(() => {
    let cumValue = 0;
    let cumInvestment = 0;
    let cumDoc = 0;
    let cumTime = 0;
    let cumRetention = 0;
    const totalImplFees = settings.reduce((s, v) => s + v.implementationFee, 0);
    cumInvestment += totalImplFees;
    return displayData.map(row => {
      cumValue += row.totalValue;
      cumInvestment += row.investment;
      cumDoc += row.docValue;
      cumTime += row.timeValue;
      cumRetention += row.retentionValue;
      const entry: Record<string, number | string> = {
        label: row.label,
        period: row.period,
        investment: row.investment,
        docValue: row.docValue,
        timeValue: row.timeValue,
        retentionValue: row.retentionValue,
        total: row.totalValue,
        cumulativeNet: row.cumulativeNet,
        cumulativeValue: cumValue,
        cumulativeInvestment: cumInvestment,
        cumDocValue: cumDoc,
        cumTimeValue: cumTime,
        cumRetentionValue: cumRetention,
      };
      settings.forEach(s => {
        entry[s.id] = Math.round(row.bySettings[s.id]?.value || 0);
      });
      return entry;
    });
  }, [displayData, settings]);

  const monthlyChartData = useMemo(() => {
    let cumDoc = 0, cumTime = 0, cumRetention = 0, cumInvestment = 0;
    const totalImplFees = settings.reduce((s, v) => s + v.implementationFee, 0);
    cumInvestment += totalImplFees;
    return cashFlows.map((row, i) => {
      cumDoc += row.docValue;
      cumTime += row.timeValue;
      cumRetention += row.retentionValue;
      cumInvestment += row.investment;
      const month = i + 1;
      const d = new Date(startDate.getFullYear(), startDate.getMonth() + month - 1, 1);
      const calQ = Math.floor(d.getMonth() / 3) + 1;
      const yearStr = String(d.getFullYear()).slice(2);
      const isQuarterEnd = month % 3 === 0;
      const label = isQuarterEnd ? `Q${calQ} '${yearStr}` : '';
      return {
        month,
        period: month,
        label: label || `_${month}`,
        displayLabel: label,
        cumDocValue: cumDoc,
        cumTimeValue: cumTime,
        cumRetentionValue: cumRetention,
        cumulativeInvestment: cumInvestment,
        cumulativeValue: cumDoc + cumTime + cumRetention,
        cumulativeNet: row.cumulativeNet,
        investment: row.investment,
        docValue: row.docValue,
        timeValue: row.timeValue,
        retentionValue: row.retentionValue,
      };
    });
  }, [cashFlows, settings, startDate]);

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
    const doc = cashFlows.reduce((s, r) => s + r.docValue, 0);
    const time = cashFlows.reduce((s, r) => s + r.timeValue, 0);
    const retention = cashFlows.reduce((s, r) => s + r.retentionValue, 0);
    const inv = cashFlows.reduce((s, r) => s + r.investment, 0);
    const total = doc + time + retention;
    return { doc, time, retention, inv, total };
  }, [cashFlows]);

  const isNursingOnly = settings.length > 0 && settings.every(s => s.careSetting === "nursing");
  const docQualityLabel = isNursingOnly ? "Quality" : "Doc Quality";

  const lastChartPoint = useMemo(() => {
    if (monthlyChartData.length === 0) return null;
    const last = monthlyChartData[monthlyChartData.length - 1];
    return {
      label: last.label,
      totalValue: last.cumulativeValue,
      investment: last.cumulativeInvestment,
    };
  }, [monthlyChartData]);

  const paybackLabel = useMemo(() => {
    if (!summary.paybackMonth || summary.paybackMonth <= 0) return null;
    const m = summary.paybackMonth;
    const nearestQuarterMonth = Math.ceil(m / 3) * 3;
    const d = new Date(startDate.getFullYear(), startDate.getMonth() + nearestQuarterMonth - 1, 1);
    const calQ = Math.floor(d.getMonth() / 3) + 1;
    const yearStr = String(d.getFullYear()).slice(2);
    return `Q${calQ} '${yearStr}`;
  }, [summary.paybackMonth, startDate]);

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
    const onsetMonth = firstGoLive + ONSET_DELAY_MONTHS.delayed;
    const quarterData = groupByQuarter(cashFlows, startDate);
    const qIdx = Math.ceil(onsetMonth / 3) - 1;
    return quarterData[qIdx]?.label || `Q${qIdx + 1}`;
  }, [settings, cashFlows, startDate]);

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader 
        pathType="explore" 
        currentStep={2} 
        totalSteps={2} 
        stepName="Financial Proforma" 
        onHome={onHome}
        showBack={false}
      />
      <UnifiedHeaderSpacer />

      <div className="sticky top-[56px] z-30 bg-white border-b border-neutral-200">
        <div className="max-w-5xl mx-auto px-4 flex gap-0">
          {(['summary', 'assumptions', 'detail'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-medium capitalize border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-[#EA2C00] text-[#EA2C00]'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800'
              }`}
              data-testid={`tab-${tab}`}
            >
              {tab === 'summary' ? 'Summary' : tab === 'assumptions' ? 'Assumptions' : 'Detail'}
            </button>
          ))}
        </div>
      </div>

      {/* HERO */}
      {activeTab === 'summary' && (
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
              <div className="flex items-center gap-2">
                {versionA ? (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex items-center gap-1.5 bg-white/15 rounded-full pl-2.5 pr-1.5 py-1"
                    data-testid="chip-version-a"
                  >
                    <div className="w-2 h-2 rounded-full bg-white" />
                    <span className="text-xs text-white font-medium">A saved</span>
                    <button onClick={() => { setVersionA(null); setVersionB(null); }}
                      className="ml-0.5 text-white/40 hover:text-white transition-colors p-0.5"
                      data-testid="button-clear-version-a"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </motion.div>
                ) : (
                  <button
                    onClick={() => snapshotCurrent("A")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-all"
                    data-testid="button-save-version-a"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Save as A</span>
                  </button>
                )}

                {versionA && (
                  versionB ? (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex items-center gap-1.5 bg-[#EA2C00]/30 rounded-full pl-2.5 pr-1.5 py-1"
                      data-testid="chip-version-b"
                    >
                      <div className="w-2 h-2 rounded-full bg-[#EA2C00]" />
                      <span className="text-xs text-white font-medium">B saved</span>
                      <button onClick={() => setVersionB(null)}
                        className="ml-0.5 text-white/40 hover:text-white transition-colors p-0.5"
                        data-testid="button-clear-version-b"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </motion.div>
                  ) : (
                    <motion.button
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => snapshotCurrent("B")}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#EA2C00]/20 text-white hover:bg-[#EA2C00]/40 transition-all"
                      data-testid="button-save-version-b"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Save as B</span>
                    </motion.button>
                  )
                )}
              </div>
            </div>
          </div>

          

          {/* Mobile: Annual Value on top, then 2x2 grid */}
          <div className="min-[820px]:hidden">
            <div className="mb-4">
              <p className="text-xs text-white/50 uppercase tracking-wide mb-1">Annual Value at Scale</p>
              <p className="text-3xl font-bold text-[#EA2C00]" data-testid="text-total-value">{fmt(summary.runRateValue)}</p>
              {totalFullScaleProviders > 0 && !settings.every(s => s.pricingModel === "perEncounter") && (
                <p className="text-[12px] text-white/50 mt-0.5" data-testid="text-per-provider-mobile">per provider at scale: {fmt(perProviderValue)}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[12px] text-white/50 uppercase tracking-wide mb-1">Value-to-Cost</p>
                <p className="text-xl font-bold text-[#E8350A]" data-testid="text-vtc">{hasInvestment ? `${summary.valueToCost.toFixed(1)}x` : "N/A"}</p>
                {hasInvestment && (
                  <p className="text-[12px] text-white/40 mt-0.5" data-testid="text-vtc-benchmark-mobile">
                    Abridge benchmark: 3–7x
                  </p>
                )}
              </div>
              <div>
                <p className="text-[12px] text-white/50 uppercase tracking-wide mb-1">Simple ROI</p>
                <p className="text-xl font-bold" data-testid="text-roi">{Math.round(summary.simpleROI * 100)}%</p>
                <p className="text-[12px] text-white/40 mt-0.5" data-testid="text-roi-benchmark-mobile">
                  Abridge benchmark: 200–600%
                </p>
              </div>
              <div>
                <p className="text-[12px] text-white/50 uppercase tracking-wide mb-1">Hours Returned (Annual)</p>
                <p className="text-xl font-bold" data-testid="text-hours">{fmtNum(summary.totalHours)}</p>
                {summary.totalHours > 0 && (
                  <>
                    <p className="text-[12px] text-white/50 mt-0.5" data-testid="text-fte-mobile">≈ {fteEquivalent.toFixed(1)} FTEs · {fmtNum(hoursPerProvider)} hrs/provider/yr</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Desktop: 4 cols */}
          <div className="hidden min-[820px]:grid grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-white/50 uppercase tracking-wide mb-1">Annual Value at Scale</p>
              <p className="text-3xl font-bold text-[#EA2C00]">{fmt(summary.runRateValue)}</p>
              {totalFullScaleProviders > 0 && !settings.every(s => s.pricingModel === "perEncounter") && (
                <p className="text-[12px] text-white/50 mt-1" data-testid="text-per-provider">per provider at scale: {fmt(perProviderValue)}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-white/50 uppercase tracking-wide mb-1">Value-to-Cost</p>
              <p className="text-2xl font-bold text-[#E8350A]">{hasInvestment ? `${summary.valueToCost.toFixed(1)}x` : "N/A"}</p>
              {hasInvestment && (
                <p className="text-[12px] text-white/40 mt-1" data-testid="text-vtc-benchmark">
                  Abridge benchmark: 3–7x
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-white/50 uppercase tracking-wide mb-1">Simple ROI</p>
              <p className="text-2xl font-bold">{Math.round(summary.simpleROI * 100)}%</p>
              <p className="text-[12px] text-white/40 mt-1" data-testid="text-roi-benchmark">
                Abridge benchmark: 200–600%
              </p>
            </div>
            <div>
              <p className="text-xs text-white/50 uppercase tracking-wide mb-1">Hours Returned (Annual)</p>
              <p className="text-2xl font-bold">{fmtNum(summary.totalHours)}</p>
              {summary.totalHours > 0 && (
                <p className="text-[12px] text-white/50 mt-1" data-testid="text-fte">≈ {fteEquivalent.toFixed(1)} FTEs · {fmtNum(hoursPerProvider)} hrs/provider/yr</p>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {activeTab === 'summary' && (<>
        <AnimatePresence>
        {versionA && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white border border-[#E8E2DA] rounded-2xl overflow-hidden mb-6 sm:mb-8 shadow-sm"
            data-testid="panel-version-comparison"
          >
            <div className="grid grid-cols-2 divide-x divide-[#E8E2DA]">
              {[
                { label: "A", scenario: versionA, color: "#1A1A1A" },
                { label: "B", scenario: versionB, color: "#EA2C00" },
              ].map(({ label, scenario, color }) => {
                const sc = scenario
                  ? calculateProformaSummary(
                      scenario.settings,
                      scenario.config,
                      buildMonthlyCashFlows(scenario.settings, scenario.config)
                    )
                  : null;
                return (
                  <div key={label} className="p-4 sm:p-6" data-testid={`version-card-${label.toLowerCase()}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                        style={{ backgroundColor: color }}
                      >
                        {label}
                      </div>
                      <span className="text-sm font-semibold text-[#1A1A1A]">Version {label}</span>
                      {!scenario && (
                        <span className="text-xs text-[#999999] italic">not saved yet</span>
                      )}
                    </div>
                    {sc ? (
                      <>
                        <p className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] tabular-nums" data-testid={`version-value-${label.toLowerCase()}`}>{fmt(sc.runRateValue)}</p>
                        <p className="text-xs text-[#999999] mt-0.5">annual value at scale</p>
                        {label === "B" && versionA && (
                          (() => {
                            const scA = calculateProformaSummary(
                              versionA.settings,
                              versionA.config,
                              buildMonthlyCashFlows(versionA.settings, versionA.config)
                            );
                            const delta = sc.runRateValue - scA.runRateValue;
                            return delta !== 0 ? (
                              <span className={`inline-flex items-center gap-1 mt-2 text-xs font-semibold px-2 py-0.5 rounded-full ${delta > 0 ? "bg-green-50 text-green-700" : "bg-[#F5F0EB] text-[#999999]"}`} data-testid="version-delta-badge">
                                {delta > 0 ? "↑" : "↓"} {fmt(Math.abs(delta))}
                              </span>
                            ) : null;
                          })()
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-[#CCCCCC]">—</p>
                    )}
                  </div>
                );
              })}
            </div>

            {versionA && versionB && (() => {
              const diffs = getScenarioDiffs(versionA, versionB);
              if (diffs.length === 0) return null;
              return (
                <div className="border-t border-[#E8E2DA] px-4 sm:px-6 py-4 bg-[#FAFAF8]" data-testid="panel-diffs">
                  <p className="text-[11px] font-semibold text-[#999999] uppercase tracking-widest mb-3">What's different</p>
                  <div className="space-y-3">
                    {(["scope", "drivers", "pricing"] as const).map(category => {
                      const items = diffs.filter(d => d.category === category);
                      if (items.length === 0) return null;
                      const catLabel = { scope: "Scope", drivers: "Value Drivers", pricing: "Pricing" }[category];
                      return (
                        <div key={category}>
                          <p className="text-[10px] font-semibold text-[#BBBBBB] uppercase tracking-wider mb-1.5">{catLabel}</p>
                          <div className="space-y-1.5">
                            {items.map((diff, i) => (
                              <motion.div
                                key={diff.label}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.04 }}
                                className="flex items-center gap-2 flex-wrap"
                              >
                                <span className="text-xs font-medium text-[#555555] min-w-[120px]">{diff.label}</span>
                                <span className="text-xs text-[#999999] bg-[#F0EDEA] px-2 py-0.5 rounded">{diff.valueA}</span>
                                <span className="text-[10px] text-[#CCCCCC]">→</span>
                                <span className="text-xs text-[#1A1A1A] font-medium bg-[#F5F0EB] border border-[#E8E2DA] px-2 py-0.5 rounded">{diff.valueB}</span>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {versionA && versionB && (() => {
              const cfA = buildMonthlyCashFlows(versionA.settings, versionA.config);
              const cfB = buildMonthlyCashFlows(versionB.settings, versionB.config);
              const scA = calculateProformaSummary(versionA.settings, versionA.config, cfA);
              const scB = calculateProformaSummary(versionB.settings, versionB.config, cfB);
              const rows = [
                { label: "Annual Value at Scale", a: fmt(scA.runRateValue), b: fmt(scB.runRateValue), delta: scB.runRateValue - scA.runRateValue, isMoney: true },
                { label: `${config.contractTermMonths / 12}-Year Value`, a: fmt(scA.termValue), b: fmt(scB.termValue), delta: scB.termValue - scA.termValue, isMoney: true },
                { label: "Total Investment", a: fmt(scA.termInvestment), b: fmt(scB.termInvestment), delta: scB.termInvestment - scA.termInvestment, isMoney: true, invertColor: true },
                { label: "Net Value", a: fmt(scA.termNet), b: fmt(scB.termNet), delta: scB.termNet - scA.termNet, isMoney: true, bold: true },
                { label: "Value-to-Cost", a: `${scA.valueToCost.toFixed(1)}x`, b: `${scB.valueToCost.toFixed(1)}x`, delta: scB.valueToCost - scA.valueToCost, isMoney: false },
                { label: "Hours Returned / Year", a: fmtNum(scA.totalHours), b: fmtNum(scB.totalHours), delta: scB.totalHours - scA.totalHours, isMoney: false },
              ];
              return (
                <div className="border-t border-[#E8E2DA] px-4 sm:px-6 py-4" data-testid="panel-outcomes">
                  <p className="text-[11px] font-semibold text-[#999999] uppercase tracking-widest mb-3">Outcomes</p>
                  <div className="space-y-0 divide-y divide-[#F0EDEA]">
                    {rows.map((row, i) => {
                      const deltaLabel = row.isMoney ? fmt(Math.abs(row.delta)) : Math.abs(row.delta).toFixed(1) + (row.label.includes("x") || row.label.includes("Cost") ? "x" : "");
                      const isPositive = row.invertColor ? row.delta < 0 : row.delta > 0;
                      const isNeutral = Math.abs(row.delta) < 0.01;
                      return (
                        <motion.div
                          key={row.label}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.1 + i * 0.04 }}
                          className={`flex items-center py-2.5 gap-4 ${row.bold ? "font-semibold" : ""}`}
                        >
                          <span className="text-xs text-[#666666] flex-1 min-w-[120px]">{row.label}</span>
                          <span className="text-xs text-[#999999] w-16 sm:w-20 text-right tabular-nums">{row.a}</span>
                          <span className="text-xs font-medium text-[#1A1A1A] w-16 sm:w-20 text-right tabular-nums">{row.b}</span>
                          {!isNeutral ? (
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full min-w-[56px] text-center tabular-nums ${
                              isPositive ? "bg-green-50 text-green-700" : "bg-[#F5F0EB] text-[#999999]"
                            }`}>
                              {row.delta > 0 ? "+" : "−"}{deltaLabel}
                            </span>
                          ) : (
                            <span className="min-w-[56px]" />
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {versionA && versionB && (() => {
              const flowsA = groupByQuarter(buildMonthlyCashFlows(versionA.settings, versionA.config));
              const flowsB = groupByQuarter(buildMonthlyCashFlows(versionB.settings, versionB.config));
              const chartDataA = flowsA.map(r => ({ label: r.label, value: r.cumulativeNet }));
              const chartDataB = flowsB.map(r => ({ label: r.label, value: r.cumulativeNet }));
              return (
                <div className="border-t border-[#E8E2DA] px-4 sm:px-6 py-4" data-testid="panel-trajectory">
                  <p className="text-[11px] font-semibold text-[#999999] uppercase tracking-widest mb-4">Value Trajectory</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <ComposedChart margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0EDEA" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#BBBBBB" }} allowDuplicatedCategory={false} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={(v: number) => fmt(v)} tick={{ fontSize: 10, fill: "#BBBBBB" }} width={60} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ fontSize: 12, borderColor: "#E8E2DA" }} />
                      <ReferenceLine y={0} stroke="#E8E2DA" strokeWidth={1} />
                      <Line data={chartDataA} type="monotone" dataKey="value" stroke="#1A1A1A" strokeWidth={2} dot={false} name="Version A" />
                      <Line data={chartDataB} type="monotone" dataKey="value" stroke="#EA2C00" strokeWidth={2} strokeDasharray="6 3" dot={false} name="Version B" />
                    </ComposedChart>
                  </ResponsiveContainer>
                  <div className="flex items-center gap-4 mt-2 justify-center">
                    <div className="flex items-center gap-1.5"><div className="w-6 h-0.5 bg-[#1A1A1A]" /><span className="text-[11px] text-[#999999]">Version A</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-6 h-0.5 bg-[#EA2C00]" style={{ backgroundImage: "repeating-linear-gradient(90deg,#EA2C00 0,#EA2C00 6px,transparent 6px,transparent 9px)" }} /><span className="text-[11px] text-[#999999]">Version B</span></div>
                  </div>
                </div>
              );
            })()}

            {versionA && !versionB && (
              <div className="border-t border-[#E8E2DA] px-6 py-4 bg-[#FAFAF8] text-center" data-testid="prompt-save-b">
                <p className="text-sm text-[#999999]">Now adjust your settings — pricing, drivers, care settings — then <span className="font-medium text-[#1A1A1A]">Save as B</span> to see the comparison.</p>
              </div>
            )}
          </motion.div>
        )}
        </AnimatePresence>

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
                    if (s.pricingModel === "perEncounter") {
                      const ye = s.yearlyEncounters ?? { year1: s.encounters, year2: s.encounters, year3: s.encounters };
                      const finalEnc = cYears >= 3 ? ye.year3 : cYears >= 2 ? ye.year2 : ye.year1;
                      if (cYears <= 1) return `${fmtNum(ye.year1)} encounters`;
                      return `Y1: ${fmtNum(ye.year1)} → Y${cYears}: ${fmtNum(finalEnc)} encounters`;
                    }
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
                  const allEnc = settings.every(s => s.pricingModel === "perEncounter");
                  if (allEnc) {
                    const y1Enc = settings.reduce((s, v) => s + (v.yearlyEncounters?.year1 || v.encounters), 0);
                    const yFinalEnc = settings.reduce((s, v) => s + (cYears >= 3 ? (v.yearlyEncounters?.year3 || v.encounters) : cYears >= 2 ? (v.yearlyEncounters?.year2 || v.encounters) : (v.yearlyEncounters?.year1 || v.encounters)), 0);
                    if (cYears <= 1) return `${fmtNum(y1Enc)} total encounters`;
                    return `${fmtNum(y1Enc)} → ${fmtNum(yFinalEnc)} total encounters`;
                  }
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
                ? "Cumulative value realized by driver type"
                : `Each line shows cumulative value by driver — the bold line is total. Onset delays and ramps visible in early months. Dashed line is cumulative investment.`}
          </p>
          <div className="bg-[#F9F6F2] rounded-xl p-3 sm:p-6" data-testid="chart-ramp-up">
            <ResponsiveContainer width="100%" height={isMobile ? 300 : 420}>
              <ComposedChart data={monthlyChartData} margin={isMobile ? { top: 20, right: 10, left: 0, bottom: 20 } : { top: 30, right: 60, left: 10, bottom: 10 }}>
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
                  tickFormatter={(val) => val.startsWith('_') ? '' : val}
                  interval={2}
                  axisLine={{ stroke: "#D5D0CB" }}
                  height={30}
                />
                <YAxis
                  tickFormatter={(v: number) => fmt(v)}
                  tick={{ fontSize: isMobile ? 10 : 12, fill: "#666" }}
                  width={isMobile ? 55 : 80}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip settings={settings} totalProvidersByPeriod={totalProvidersByPeriod} viewMode={config.viewMode} />} />

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

                <Line
                  type="monotone"
                  dataKey="cumulativeInvestment"
                  stroke={CHART_COLORS.investment}
                  strokeWidth={isMobile ? 1.5 : 2}
                  strokeDasharray="8 4"
                  dot={{ r: 3, fill: CHART_COLORS.investment, stroke: "#fff", strokeWidth: 1.5 }}
                  name="Investment"
                />

                {legendTotals.retention > 0 && (
                  <Line
                    type="monotone"
                    dataKey="cumRetentionValue"
                    stroke={CHART_COLORS.retention}
                    strokeWidth={isMobile ? 1.5 : 2}
                    dot={false}
                    name="Retention"
                  />
                )}
                {legendTotals.time > 0 && (
                  <Line
                    type="monotone"
                    dataKey="cumTimeValue"
                    stroke={CHART_COLORS.time}
                    strokeWidth={isMobile ? 1.5 : 2}
                    dot={false}
                    name="Capacity & Efficiency"
                  />
                )}
                {legendTotals.doc > 0 && (
                  <Line
                    type="monotone"
                    dataKey="cumDocValue"
                    stroke={CHART_COLORS.doc}
                    strokeWidth={isMobile ? 1.5 : 2}
                    dot={false}
                    name={docQualityLabel}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="cumulativeValue"
                  stroke="#1A1A1A"
                  strokeWidth={isMobile ? 2 : 3}
                  dot={false}
                  name="Total Value"
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
                      fill: "#1A1A1A",
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
              {legendTotals.doc > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="w-5 h-0.5 inline-block rounded-full" style={{ backgroundColor: CHART_COLORS.doc }} />
                  <span className="text-neutral-600">{docQualityLabel}</span>
                  <span className="text-neutral-400 font-medium">{fmt(legendTotals.doc)} {legendTotals.total > 0 ? `(${Math.round((legendTotals.doc / legendTotals.total) * 100)}%)` : ""}</span>
                </span>
              )}
              {legendTotals.time > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="w-5 h-0.5 inline-block rounded-full" style={{ backgroundColor: CHART_COLORS.time }} />
                  <span className="text-neutral-600">Capacity & Efficiency</span>
                  <span className="text-neutral-400 font-medium">{fmt(legendTotals.time)} {legendTotals.total > 0 ? `(${Math.round((legendTotals.time / legendTotals.total) * 100)}%)` : ""}</span>
                </span>
              )}
              {legendTotals.retention > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="w-5 h-0.5 inline-block rounded-full" style={{ backgroundColor: CHART_COLORS.retention }} />
                  <span className="text-neutral-600">Retention</span>
                  <span className="text-neutral-400 font-medium">{fmt(legendTotals.retention)} {legendTotals.total > 0 ? `(${Math.round((legendTotals.retention / legendTotals.total) * 100)}%)` : ""}</span>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-0.5 inline-block rounded-full bg-[#1A1A1A]" />
                <span className="text-neutral-600 font-medium">Total</span>
                {legendTotals.total > 0 && <span className="text-neutral-400 font-medium">{fmt(legendTotals.total)}</span>}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-0.5 rounded-full inline-block" style={{ borderTop: `2px dashed ${CHART_COLORS.investment}` }} />
                <span className="text-neutral-600">Investment</span>
                {legendTotals.inv > 0 && (
                  <span className="text-neutral-400 font-medium">{fmt(legendTotals.inv)}</span>
                )}
              </span>
            </div>

            {config.retentionPhasing.year2Pct > 0 && (
              <div className="flex items-center justify-center gap-4 mt-2 text-[12px] text-neutral-400">
                <span>Retention: {config.retentionPhasing.year1Pct}% Y1{Math.ceil(config.contractTermMonths / 12) >= 2 ? ` → ${config.retentionPhasing.year2Pct}% Y2` : ""}{Math.ceil(config.contractTermMonths / 12) >= 3 ? ` → ${config.retentionPhasing.year3Pct}% Y3${config.contractTermMonths > 36 ? "+" : ""}` : ""}</span>
              </div>
            )}
          </div>

          {summary.paybackMonth && (
            <p className="text-center text-sm text-neutral-600 mt-3" data-testid="text-payback-insight">
              At your planned rollout pace, you reach payback in <strong className="text-neutral-900">Month {summary.paybackMonth}</strong>.
            </p>
          )}
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
            <p className="text-[9px] sm:text-[12px] text-neutral-400 mt-0.5">(net value / investment)</p>
          </div>
          <div className="bg-[#F9F6F2] rounded-xl p-4 sm:p-5 text-center relative group" data-testid="panel-payback">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-[#EA2C00] mx-auto mb-1.5 sm:mb-2" />
            <p className="text-[9px] sm:text-[12px] text-neutral-500 uppercase tracking-wide mb-0.5 sm:mb-1">Payback</p>
            <p className="text-2xl sm:text-3xl font-bold text-neutral-900">{summary.paybackMonth ?? "—"}</p>
            <p className="text-[9px] sm:text-[12px] text-neutral-400 mt-0.5">{summary.paybackMonth ? "months" : ""}</p>
            {summary.paybackMonth && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-neutral-800 text-white text-[10px] rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 leading-relaxed" data-testid="tooltip-payback-context">
                Payback assumes value begins accruing from go-live. Actual time to value may vary based on training, workflow integration, and adoption speed.
              </div>
            )}
          </div>
          <div className="bg-[#F9F6F2] rounded-xl p-4 sm:p-5 text-center" data-testid="panel-3yr-net">
            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-[#E8350A] mx-auto mb-1.5 sm:mb-2" />
            <p className="text-[9px] sm:text-[12px] text-neutral-500 uppercase tracking-wide mb-0.5 sm:mb-1">{contractTermLabel(config.contractTermMonths)} Net</p>
            <p className={`text-2xl sm:text-3xl font-bold ${summary.termNet >= 0 ? "text-[#E8350A]" : "text-red-600"}`}>
              {fmt(summary.termNet)}
            </p>
          </div>
        </motion.div>
        </>)}

        {activeTab === 'assumptions' && (<>
        {/* VALUE DRIVERS */}
        <div className="mb-8" data-testid="panel-value-drivers">
          <h2 className="text-base font-semibold text-neutral-800 mb-1">Value Drivers</h2>
          <p className="text-sm text-neutral-500 mb-4">
            Annual value per driver. Pre-filled from your assessment — edit to explore scenarios.
          </p>
          <div className="space-y-4">
            {settings.map(s => (
              <div key={s.id} className="border border-neutral-200 rounded-lg p-4 bg-white">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-sm font-semibold text-neutral-800">{s.label}</span>
                  <span className="text-xs text-neutral-400">{s.providerCount} providers</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {s.drivers.map(driver => {
                    const perProvider = s.providerCount > 0
                      ? Math.round(driver.value / s.providerCount).toLocaleString()
                      : '—';
                    const perProviderMonth = s.providerCount > 0
                      ? Math.round(driver.value / s.providerCount / 12).toLocaleString()
                      : '—';

                    const contextHints: Record<string, string> = {
                      patientAccess: `≈ $${perProviderMonth}/provider/month · Benchmark: 1–3 additional patients/mo × ~$200/visit`,
                      edLwbs: `≈ $${perProviderMonth}/provider/month · LWBS patients recovered × ED visit margin`,
                      wrvu: `≈ $${perProvider}/provider/year · Benchmark: 0.05–0.15 wRVU/encounter × $33 CMS factor`,
                      denials: `≈ $${perProvider}/provider/year · Denial volume × reduction rate × avg denial value`,
                      hcc: `≈ $${perProvider}/provider/year · Additional HCC codes × ~$1,200 revenue/code`,
                      ipDrg: `≈ $${perProvider}/provider/year · DRG accuracy improvement × case volume`,
                      ipCdi: `≈ $${perProvider}/provider/year · CDI query reduction × $50/query`,
                      retention: `≈ $${perProvider}/provider/year · Phased over 3 years (35% → 75% → 100%)`,
                    };
                    const hint = contextHints[driver.id] || `≈ $${perProvider}/provider/year`;

                    return (
                      <DriverInput
                        key={driver.id}
                        driver={driver}
                        careSetting={s.careSetting}
                        hint={hint}
                        onChangeValue={(newVal) => {
                          const updatedDrivers = s.drivers.map(d =>
                            d.id === driver.id ? { ...d, value: newVal } : d
                          );
                          onUpdateSetting(s.id, { drivers: updatedDrivers });
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

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
              const defaultUtil = s.careSetting === "nursing" && config.nursingYearlyUtilization
                ? config.nursingYearlyUtilization
                : config.yearlyUtilization;
              const yu = s.yearlyUtilization ?? defaultUtil;
              const yPr = s.yearlyPricing || {
                year1: isFlat ? flatFee : isEnc ? (s.costPerEncounter || 0) : s.costPerUnit,
                year2: isFlat ? flatFee : isEnc ? (s.costPerEncounter || 0) : s.costPerUnit,
                year3: isFlat ? flatFee : isEnc ? (s.costPerEncounter || 0) : s.costPerUnit,
              };
              const y1Months = 13 - s.goLiveMonth;
              const y1Cost = isFlat ? yPr.year1 * (y1Months / 12) : isEnc ? yPr.year1 * ye.year1 * (y1Months / 12) : yPr.year1 * yp.year1 * y1Months;
              const y2Cost = isFlat ? yPr.year2 : isEnc ? yPr.year2 * ye.year2 : yPr.year2 * yp.year2 * 12;
              const y3Cost = isFlat ? yPr.year3 : isEnc ? yPr.year3 * ye.year3 : yPr.year3 * yp.year3 * 12;
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
                          <p className="text-xs text-neutral-500">{isEnc
                            ? (showY2 ? `${fmtNum(ye.year1)} → ${fmtNum(showY3 ? ye.year3 : ye.year2)} encounters` : `${fmtNum(ye.year1)} encounters`)
                            : (showY2 ? `${fmtNum(yp.year1)} → ${fmtNum(showY3 ? yp.year3 : yp.year2)} ${unitLabel}` : `${fmtNum(yp.year1)} ${unitLabel}`)
                          }</p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-[12px] font-medium text-neutral-400 uppercase tracking-[1.5px] mb-2">Rollout Plan</p>
                        {isEnc ? (
                          <>
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
                          <div className={`grid gap-3 mt-2 ${showY3 ? 'grid-cols-3' : showY2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            <div>
                              <label className="block text-[12px] text-neutral-500 mb-1">Y1 util %</label>
                              <div className="relative">
                                <input
                                  type="number"
                                  min={1}
                                  max={100}
                                  value={yu.year1}
                                  onChange={(e) => {
                                    const v = Math.max(1, Math.min(100, Number(e.target.value) || 1));
                                    onUpdateSetting(s.id, { yearlyUtilization: { ...yu, year1: v } });
                                  }}
                                  className="w-full text-right text-sm h-8 bg-white border border-neutral-300 rounded-lg px-2 pr-6"
                                  data-testid={`input-y1-util-${s.careSetting}`}
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] text-neutral-400">%</span>
                              </div>
                            </div>
                            {showY2 && (
                              <div>
                                <label className="block text-[12px] text-neutral-500 mb-1">Y2 util %</label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    min={1}
                                    max={100}
                                    value={yu.year2}
                                    onChange={(e) => {
                                      const v = Math.max(1, Math.min(100, Number(e.target.value) || 1));
                                      onUpdateSetting(s.id, { yearlyUtilization: { ...yu, year2: v } });
                                    }}
                                    className="w-full text-right text-sm h-8 bg-white border border-neutral-300 rounded-lg px-2 pr-6"
                                    data-testid={`input-y2-util-${s.careSetting}`}
                                  />
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] text-neutral-400">%</span>
                                </div>
                              </div>
                            )}
                            {showY3 && (
                              <div>
                                <label className="block text-[12px] text-neutral-500 mb-1">Y3 util %</label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    min={1}
                                    max={100}
                                    value={yu.year3}
                                    onChange={(e) => {
                                      const v = Math.max(1, Math.min(100, Number(e.target.value) || 1));
                                      onUpdateSetting(s.id, { yearlyUtilization: { ...yu, year3: v } });
                                    }}
                                    className="w-full text-right text-sm h-8 bg-white border border-neutral-300 rounded-lg px-2 pr-6"
                                    data-testid={`input-y3-util-${s.careSetting}`}
                                  />
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] text-neutral-400">%</span>
                                </div>
                              </div>
                            )}
                          </div>
                          <p className="text-[10px] text-neutral-400 mt-1">% of encounters where Abridge is used</p>
                          </>
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
                              onClick={() => {
                                const defaultPrice = pm === "perUnit" ? s.costPerUnit
                                  : pm === "perEncounter" ? (s.costPerEncounter || 0)
                                  : (s.annualLicenseFee || 0);
                                onUpdateSetting(s.id, {
                                  pricingModel: pm,
                                  yearlyPricing: { year1: defaultPrice, year2: defaultPrice, year3: defaultPrice },
                                });
                              }}
                              className={`px-2.5 py-1 rounded-full text-[12px] font-medium transition-colors ${(pm === "perUnit" && !s.pricingModel) || s.pricingModel === pm ? "bg-[#1A1A1A] text-white" : "text-neutral-500 hover:text-neutral-900 bg-neutral-100"}`}
                              data-testid={`toggle-${pm}-${s.careSetting}`}
                            >
                              {pm === "perUnit" ? "Per Unit/Mo" : pm === "annualFlat" ? "Annual License" : "Per Encounter"}
                            </button>
                          ))}
                        </div>
                        {(() => {
                          const pm = s.pricingModel || "perUnit";
                          const priceLabel = pm === "annualFlat" ? "Annual Fee"
                            : pm === "perEncounter" ? "$/Encounter"
                            : `$/${SETTING_UNIT_LABELS[s.careSetting]?.replace(/s$/, '') || "Unit"}/Mo`;
                          const defPrice = pm === "annualFlat" ? (s.annualLicenseFee || 0)
                            : pm === "perEncounter" ? (s.costPerEncounter || 0)
                            : s.costPerUnit;
                          const yp2 = s.yearlyPricing || { year1: defPrice, year2: defPrice, year3: defPrice };
                          const updateYP = (yearKey: "year1" | "year2" | "year3", v: number) => {
                            const val = Math.max(v, 0);
                            const updated = { ...yp2, [yearKey]: val };
                            const lu: Partial<typeof s> = { yearlyPricing: updated };
                            if (pm === "annualFlat") lu.annualLicenseFee = updated.year1;
                            else if (pm === "perEncounter") lu.costPerEncounter = updated.year1;
                            else lu.costPerUnit = updated.year1;
                            onUpdateSetting(s.id, lu);
                          };
                          return (
                            <div className="grid grid-cols-3 gap-3 mb-3">
                              {(["year1", "year2", "year3"] as const).map((yk, i) => (
                                <div key={yk}>
                                  <label className="block text-[12px] text-neutral-500 mb-1">Y{i + 1} {priceLabel}</label>
                                  <FormattedNumberInput
                                    value={yp2[yk]}
                                    onChange={(v) => updateYP(yk, v)}
                                    prefix="$"
                                    className="w-full text-right text-sm h-8 bg-white border border-neutral-300 rounded-lg px-2"
                                    data-testid={`input-price-y${i + 1}-view-${s.careSetting}`}
                                  />
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                        <div className="grid grid-cols-3 gap-3">
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
                        {config.granularity === "quarterly" && s.quarterlyPricing ? (() => {
                          const qPr = s.quarterlyPricing;
                          const qProv = s.quarterlyProviders;
                          const qKeys: string[] = ["q1","q2","q3","q4","q5","q6","q7","q8","q9","q10","q11","q12"];
                          const yearGroups = [qKeys.slice(0,4), qKeys.slice(4,8), qKeys.slice(8,12)];
                          return (
                            <>
                              <p className="text-[12px] font-medium text-neutral-400 uppercase tracking-[1.5px] mb-1.5">Quarterly Investment</p>
                              {yearGroups.map((grp, yi) => {
                                if (yi === 1 && !showY2) return null;
                                if (yi === 2 && !showY3) return null;
                                return (
                                  <div key={yi} className="mb-1.5">
                                    <p className="text-[10px] text-neutral-400 mb-0.5">Year {yi + 1}</p>
                                    <div className="grid grid-cols-4 gap-1.5">
                                      {grp.map((qk, qi) => {
                                        const price = (qPr as any)[qk] || 0;
                                        const prov = qProv ? (qProv as any)[qk] || yp[yi === 0 ? 'year1' : yi === 1 ? 'year2' : 'year3'] : yp[yi === 0 ? 'year1' : yi === 1 ? 'year2' : 'year3'];
                                        const qCost = isFlat ? price / 4 : isEnc ? price * prov * 3 : price * prov * 3;
                                        return (
                                          <div key={qk}>
                                            <p className="text-[10px] text-neutral-500">Q{yi * 4 + qi + 1}</p>
                                            <p className="text-[11px] font-semibold text-neutral-800">{fmtFull(qCost)}</p>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </>
                          );
                        })() : (
                        <>
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
                        </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Retention calculation */}
          <div className="mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-neutral-200">
            <p className="text-sm font-bold text-neutral-700 mb-1">Retention Value Model</p>
            <p className="text-xs text-neutral-500 mb-1">Estimate avoided turnover costs from reduced documentation burden</p>
            <p className="text-xs text-neutral-400 mb-3 sm:mb-4">Retention value = full-scale providers × retention improvement rate × replacement cost per provider, phased over years.</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
              {settings.map(s => {
                const rate = s.retentionRate ?? 0.5;
                const cost = s.replacementCost ?? 400000;
                const fullScale = s.fullScaleProviders || s.providerCount;
                const annualVal = fullScale * (rate / 100) * cost;
                const hasExploreRet = s.drivers.some(d => d.id === "retention" && d.value > 0);
                return (
                  <div key={s.id} className="bg-white rounded-lg border border-neutral-200 p-3" data-testid={`retention-config-${s.careSetting}`}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="text-xs font-medium text-neutral-700 truncate">{s.label}</span>
                    </div>
                    {hasExploreRet ? (
                      <p className="text-[11px] text-neutral-500">Using Explore-configured retention value ({fmt(s.drivers.find(d => d.id === "retention")?.value || 0)}/yr)</p>
                    ) : (
                      <>
                        <div className="mb-2">
                          <label className="block text-[11px] text-neutral-500 mb-0.5">Retention improvement %</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="range"
                              min={0}
                              max={3}
                              step={0.1}
                              value={rate}
                              onChange={(e) => onUpdateSetting(s.id, { retentionRate: parseFloat(e.target.value) })}
                              className="flex-1 accent-[#D4930A]"
                              data-testid={`slider-ret-rate-${s.careSetting}`}
                            />
                            <span className="text-[11px] font-bold text-neutral-800 w-10 text-right">{rate.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="mb-2">
                          <label className="block text-[11px] text-neutral-500 mb-0.5">Replacement cost</label>
                          <FormattedNumberInput
                            value={cost}
                            onChange={(v) => onUpdateSetting(s.id, { replacementCost: Math.max(v, 0) })}
                            prefix="$"
                            className="w-full text-right text-[11px] h-7 bg-white border border-neutral-300 rounded px-1.5"
                            data-testid={`input-ret-cost-${s.careSetting}`}
                          />
                        </div>
                        <p className="text-[11px] font-medium text-[#D4930A]">= {fmt(annualVal)}/yr at full scale</p>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="text-xs font-bold text-neutral-600 mb-2">Retention Benefit Phasing</p>
            <p className="text-xs text-neutral-400 mb-3 sm:mb-4">This reflects the organizational behavior change timeline — separate from the {ONSET_DELAY_MONTHS.delayed}-month clinical onset delay already built into capacity & efficiency cash flows.</p>
            <div className={`grid gap-3 sm:gap-4 ${Math.ceil(config.contractTermMonths / 12) >= 3 ? 'grid-cols-3' : Math.ceil(config.contractTermMonths / 12) >= 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {(["year1Pct", "year2Pct", "year3Pct"] as const).slice(0, Math.min(Math.max(Math.ceil(config.contractTermMonths / 12), 1), 3)).map((key, idx) => (
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
        </>)}

        {activeTab === 'detail' && (<>
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
                      <td className="py-2 pl-4 text-xs" style={{ color: CHART_COLORS.doc }}>
                        {isNursingOnly ? "Quality (delayed)" : "Doc Quality (immediate)"}
                      </td>
                      {yearlyData.map(y => (
                        <td key={y.label} className="text-right py-2 px-4 text-xs text-neutral-500">{fmt(y.docValue)}</td>
                      ))}
                      <td className="text-right py-2 px-4 text-xs text-neutral-500">
                        {fmt(yearlyData.reduce((s, y) => s + y.docValue, 0))}
                      </td>
                    </tr>
                    <tr className="border-b border-neutral-100">
                      <td className="py-2 pl-4 text-xs" style={{ color: CHART_COLORS.time }}>Capacity & Efficiency ({ONSET_DELAY_MONTHS.delayed}mo delay)</td>
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
                  <>
                    <tr className="border-b border-neutral-100">
                      <td className="py-2 pl-4 text-neutral-500 text-xs">{settings.every(s => s.pricingModel === "perEncounter") ? "Contracted Encounters" : "Licensed Providers"}</td>
                      {yearlyData.map(y => {
                        const allEnc = settings.every(s => s.pricingModel === "perEncounter");
                        const totalVal = allEnc
                          ? settings.reduce((sum, s) => sum + (y.bySettings[s.id]?.encounters || 0), 0)
                          : settings.reduce((sum, s) => sum + (y.bySettings[s.id]?.licensedProviders || 0), 0);
                        return (
                          <td key={y.label} className="text-right py-2 px-4 text-xs text-neutral-500">{fmtNum(totalVal)}</td>
                        );
                      })}
                      <td className="text-right py-2 px-4 text-xs text-neutral-500">
                        {(() => {
                          const finalMonth = cashFlows[cashFlows.length - 1];
                          const allEnc = settings.every(s => s.pricingModel === "perEncounter");
                          return finalMonth ? fmtNum(settings.reduce((sum, s) => sum + (allEnc ? (finalMonth.bySettings[s.id]?.encounters || 0) : (finalMonth.bySettings[s.id]?.licensedProviders || 0)), 0)) : "—";
                        })()}
                      </td>
                    </tr>
                    <tr className="border-b border-neutral-100">
                      <td className="py-2 pl-4 text-neutral-500 text-xs">{settings.every(s => s.pricingModel === "perEncounter") ? "Utilized Encounters" : settings.some(s => s.pricingModel === "perEncounter") ? "Active Volume" : "Actively Documenting"}</td>
                      {yearlyData.map(y => {
                        const totalActive = settings.reduce((sum, s) => sum + (y.bySettings[s.id]?.providers || 0), 0);
                        return (
                          <td key={y.label} className="text-right py-2 px-4 text-xs text-neutral-500">{fmtNum(totalActive)}</td>
                        );
                      })}
                      <td className="text-right py-2 px-4 text-xs text-neutral-500">
                        {(() => {
                          const finalMonth = cashFlows[cashFlows.length - 1];
                          return finalMonth ? fmtNum(settings.reduce((sum, s) => sum + (finalMonth.bySettings[s.id]?.providers || 0), 0)) : "—";
                        })()}
                      </td>
                    </tr>
                  </>
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
                    <td key={y.label} className={`text-right py-2.5 sm:py-3 px-1.5 sm:px-4 font-bold ${y.netValue >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {y.netValue >= 0 ? fmt(y.netValue) : `(${fmt(Math.abs(y.netValue))})`}
                    </td>
                  ))}
                  <td className={`text-right py-2.5 sm:py-3 px-1.5 sm:px-4 font-bold ${isMobile ? "text-base" : "text-lg"} ${summary.termNet >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {summary.termNet >= 0 ? fmt(summary.termNet) : `(${fmt(Math.abs(summary.termNet))})`}
                  </td>
                </tr>
              </tbody>
            </table>
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

        {/* COST OF WAITING */}
        <motion.div
          className="mb-8 sm:mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.29 }}
          data-testid="panel-cost-of-waiting"
        >
          <h2 className="text-base sm:text-lg font-bold text-neutral-900 mb-1">Cost of Waiting</h2>
          <p className="text-xs sm:text-sm text-neutral-500 mb-4">What the data suggests about delayed implementation</p>

          <div className="bg-[#F9F6F2] rounded-xl p-4 sm:p-6">
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-bold text-neutral-900">
                  {fmtNum(Math.round(settings.reduce((s, v) => s + v.totalHoursSaved, 0) / 12))}
                </p>
                <p className="text-[10px] sm:text-xs text-neutral-500 mt-1">hours/month on manual documentation</p>
              </div>
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-bold text-neutral-900">
                  {fmt(Math.round(summary.runRateValue / 12))}
                </p>
                <p className="text-[10px] sm:text-xs text-neutral-500 mt-1">estimated monthly value deferred</p>
              </div>
            </div>
            <p className="text-[11px] sm:text-xs text-neutral-500 leading-relaxed">
              Each month of delayed implementation defers this estimated value while documentation costs continue.
            </p>
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
              <span>{isMobile ? "Methodology" : "How we calculated this — onset timing, value methodology & retention phasing"}</span>
            </span>
            {showMethodology ? <ChevronUp className="w-4 h-4 text-neutral-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-neutral-400 flex-shrink-0" />}
          </button>
          {showMethodology && (
            <div className="mt-2 p-4 sm:p-6 bg-white border border-neutral-200 rounded-xl text-xs sm:text-sm text-neutral-600 space-y-3">
              <p><strong className="text-neutral-900">Implementation Ramp:</strong> A {config.implementationRampMonths}-month gradual implementation ramp is applied as providers are onboarded. During this period, value scales gradually (e.g. ~33%/67%/100% for a 3-month ramp) while full subscription costs are incurred. This accounts for training, EHR integration, and workflow adjustment.</p>
              <p><strong className="text-neutral-900">Utilization Ramp:</strong> Utilization increases over the contract period: Year 1 target {config.yearlyUtilization.year1}%, Year 2 target {config.yearlyUtilization.year2}%, Year 3 target {config.yearlyUtilization.year3}%.{config.nursingYearlyUtilization && settings.some(s => s.careSetting === "nursing") ? ` Nursing uses separate targets: ${config.nursingYearlyUtilization.year1}%/${config.nursingYearlyUtilization.year2}%/${config.nursingYearlyUtilization.year3}%.` : ""} These targets reflect realistic organizational adoption curves.</p>
              <p><strong className="text-neutral-900">Driver Onset Timing:</strong> Different value drivers materialize at different speeds. <strong style={{ color: '#1A1A1A' }}>Documentation quality</strong> improvements (wRVU, HCC, denials, DRG) have a {ONSET_DELAY_MONTHS.immediate}-month billing cycle lag before value appears, then ramp over 3 months.{settings.some(s => s.careSetting === "nursing") ? " For nursing care quality drivers (HAPI, falls, bundle compliance), value onset begins at month 5 — clinical outcomes require a full quarter of consistent real-time documentation before measurable improvement occurs in HAPI and fall rates." : ""} <strong className="text-[#EA2C00]">Capacity & efficiency</strong> gains (patient access, throughput, cost reduction, OT) onset at month {ONSET_DELAY_MONTHS.delayed} as organizations operationalize freed-up capacity, then ramp over 3 months. <strong style={{ color: '#B45309' }}>Retention/wellbeing</strong> benefits phase in over years per your configured phasing ({config.retentionPhasing.year1Pct}% Y1 / {config.retentionPhasing.year2Pct}% Y2 / {config.retentionPhasing.year3Pct}% Y3{config.nursingRetentionPhasing && settings.some(s => s.careSetting === "nursing") && (config.nursingRetentionPhasing.year1Pct !== config.retentionPhasing.year1Pct || config.nursingRetentionPhasing.year2Pct !== config.retentionPhasing.year2Pct) ? `; Nursing: ${config.nursingRetentionPhasing.year1Pct}% Y1 / ${config.nursingRetentionPhasing.year2Pct}% Y2 / ${config.nursingRetentionPhasing.year3Pct}% Y3` : ""}).</p>
              <p><strong className="text-neutral-900">Value-to-Cost:</strong> Total contract value divided by total contract cost (implementation fees + subscription). A {summary.valueToCost.toFixed(1)}x ratio means you receive ${summary.valueToCost.toFixed(2)} in value for every $1 invested.</p>
              <p><strong className="text-neutral-900">Simple ROI:</strong> Total contract net value divided by total contract cost. {Math.round(summary.simpleROI * 100)}% means for every $1 of Abridge investment, you generate ${summary.simpleROI.toFixed(2)} in net value above the cost.</p>
              <p><strong className="text-neutral-900">Payback Period:</strong> The month in which cumulative net value turns positive, accounting for the implementation ramp and subscription costs from day one.</p>
              <p><strong className="text-neutral-900">Provider Expansion:</strong> Providers scale linearly from pilot count to full-scale count over the contract term. This models a realistic organizational rollout trajectory.</p>
              <p><strong className="text-neutral-900">Retention Phasing:</strong> Clinician/nurse retention benefits are conservatively phased — {config.retentionPhasing.year1Pct}% in Year 1{Math.ceil(config.contractTermMonths / 12) >= 2 ? `, ${config.retentionPhasing.year2Pct}% in Year 2` : ""}{Math.ceil(config.contractTermMonths / 12) >= 3 ? `, ${config.retentionPhasing.year3Pct}% in Year 3${config.contractTermMonths > 36 ? "+" : ""}` : ""}. Retention benefits ramp gradually within each year — reaching the configured phasing percentage by year-end.</p>
              <p><strong className="text-neutral-900">Sensitivity:</strong> Two-sided linear analysis scaling total value realization by 70% (conservative) and 130% (optimistic). Investment is held constant. Derived metrics (VTC, ROI, payback) are recalculated from the scaled values. This brackets the range of likely financial outcomes.</p>
            </div>
          )}
        </motion.div>
        </>)}

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


        <p className="text-[12px] sm:text-xs text-neutral-400 leading-relaxed mt-3 sm:mt-4 mb-6 sm:mb-8 text-center max-w-2xl mx-auto">
          Projections are modeled estimates based on user-provided inputs and published benchmarks. Retention benefits are conservatively phased. Driver onset timing reflects typical healthcare implementation timelines. This does not constitute a guarantee of financial outcomes.
        </p>
      </div>

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

function CustomTooltip({ active, payload, label, settings, totalProvidersByPeriod, viewMode }: any) {
  if (!active || !payload) return null;

  const docItem = payload.find((p: any) => p.dataKey === "cumDocValue");
  const timeItem = payload.find((p: any) => p.dataKey === "cumTimeValue");
  const retentionItem = payload.find((p: any) => p.dataKey === "cumRetentionValue");
  const investmentItem = payload.find((p: any) => p.dataKey === "cumulativeInvestment");

  const total = (docItem?.value || 0) + (timeItem?.value || 0) + (retentionItem?.value || 0);
  const monthNum = payload[0]?.payload?.period || 1;
  const periodIdx = viewMode === "yearly"
    ? Math.ceil(monthNum / 12) - 1
    : Math.ceil(monthNum / 3) - 1;
  const providerCount = totalProvidersByPeriod?.[periodIdx] || 0;
  const displayMonth = `Month ${monthNum}`;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-neutral-200 p-3 sm:p-4 text-xs sm:text-sm min-w-[200px] sm:min-w-[240px]">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <p className="font-bold text-neutral-900">{payload[0]?.payload?.displayLabel || displayMonth}</p>
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
            <span className="text-neutral-600">{settings && settings.length > 0 && settings.every((s: any) => s.careSetting === "nursing") ? "Quality" : "Doc Quality"}</span>
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
        <span className="font-bold text-neutral-900">Cumulative Value</span>
        <span className="font-bold text-[#EA2C00]">{fmt(total)}</span>
      </div>
      {investmentItem && (
        <div className="flex justify-between mt-1">
          <span className="text-neutral-500">Total Invested</span>
          <span className="text-neutral-700">({fmt(investmentItem.value)})</span>
        </div>
      )}
    </div>
  );
}
