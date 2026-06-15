import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronDown, ChevronUp, Download, Settings, TrendingUp, Clock, DollarSign, Building2, HeartPulse, BedDouble, Stethoscope, Info, Loader2, Users, BarChart3, Shield, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from "recharts";
import type { ProformaSettingSnapshot, ProformaConfig, ProformaScenario } from "./proformaTypes";
import type { ExploreState } from "../explore/ExploreFlow";
import { SETTING_LABELS, SETTING_UNIT_LABELS, ONSET_DELAY_MONTHS } from "./proformaTypes";
import { buildMonthlyCashFlows, groupByQuarter, groupByYear, calculateProformaSummary, getYearlySummary, getContractStartDate } from "@/lib/proformaCalculations";
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
  embedded?: boolean;
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
  const allNursing = settings.length > 0 && settings.every(s => s.careSetting === "nursing");
  return allNursing ? "Per Bed" : "Per Provider";
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
    const unitWord = s.careSetting === "nursing" ? "Per Bed" : "Per Provider";
    return varied ? `${unitWord} @ ${fmt(yp!.year1)}→${fmt(yp!.year3)}/mo` : `${unitWord} @ ${fmt(p)}/mo`;
  });
  const unique = Array.from(new Set(parts));
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


const CHART_COLORS = {
  capacity: "#EA2C00",
  workforce: "#7A1F04",
  revenue: "#1E3A5F",
  quality: "#888888",
  displacement: "#2D6F6B",
  investment: "#6B7280",
};

export default function ProformaView({
  settings,
  config,
  onConfigChange,
  onUpdateSetting,
  onBack,
  onHome,
  embedded = false,
}: ProformaViewProps) {
  const isMobile = useIsMobile();
  const setConfig = (updater: ProformaConfig | ((prev: ProformaConfig) => ProformaConfig)) => {
    if (typeof updater === "function") {
      onConfigChange(updater(config));
    } else {
      onConfigChange(updater);
    }
  };
  // When any setting is in quarterly mode, default the projection to Quarters so
  // the per-quarter ramp is visible without hunting for the toggle. One-time
  // nudge on the false→true edge — the user can still flip back to Years.
  const hasQuarterlyInput = settings.some(
    (s) => s.quarterlyProviders || s.quarterlyUtilization || s.quarterlyPricing,
  );
  const prevHasQuarterly = useRef(false);
  useEffect(() => {
    if (hasQuarterlyInput && !prevHasQuarterly.current && config.viewMode !== "quarterly") {
      setConfig((c) => ({ ...c, viewMode: "quarterly" }));
    }
    prevHasQuarterly.current = hasQuarterlyInput;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasQuarterlyInput]);

  const [showMethodology, setShowMethodology] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [versionA, setVersionA] = useState<ProformaScenario | null>(null);
  const [versionB, setVersionB] = useState<ProformaScenario | null>(null);
  const [sensitivityRange, setSensitivityRange] = useState(30);
  const [showSensitivitySettings, setShowSensitivitySettings] = useState(false);
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

      // scaledCumNet_m = cumulativeNet_m + (factor - 1) * cumValue_m
      // Investment and impl-fee timing stay exactly as in the base case.
      // For banked encounter deals, use economicCumulativeNet so payback
      // reflects encounter cost in the year consumed, not the billing lag.
      const usesEconomicPayback = settings.some(s => s.bankedEncounters && (s.pricingModel === "platform" || s.pricingModel === "perEncounter"));
      let scaledPayback: number | null = null;
      let scaledWentNegative = false;
      let cumValue = 0;
      for (const row of cashFlows) {
        cumValue += row.totalValue;
        const baseCumNet = usesEconomicPayback ? (row.economicCumulativeNet ?? row.cumulativeNet) : row.cumulativeNet;
        const scaledCumNet = baseCumNet + (factor - 1) * cumValue;
        if (scaledCumNet < 0) scaledWentNegative = true;
        if (scaledWentNegative && scaledCumNet >= 0 && scaledPayback === null) {
          scaledPayback = row.period;
        }
      }

      const scaledAtScale = summary.runRateInvestment > 0 ? (summary.totalSystemValue * factor) / summary.runRateInvestment : 0;

      return {
        annualValue: scaledAnnual,
        valueToCost: scaledVTC,
        paybackMonth: scaledPayback,
        termNet: scaledNet,
        simpleROI: scaledROI,
        atScaleReturn: scaledAtScale,
      };
    };

    return {
      conservative: buildScaled((100 - sensitivityRange) / 100),
      base: {
        annualValue: summary.runRateValue,
        valueToCost: summary.valueToCost,
        paybackMonth: summary.paybackMonth,
        termNet: summary.termNet,
        simpleROI: summary.simpleROI,
        atScaleReturn: summary.atScaleReturn,
      },
      optimistic: buildScaled((100 + sensitivityRange) / 100),
    };
  }, [settings, config, summary, cashFlows, sensitivityRange]);


  const totalProvidersByPeriod = useMemo(() => {
    return displayData.map(row => {
      let total = 0;
      settings.forEach(s => {
        total += row.bySettings[s.id]?.licensedProviders || 0;
      });
      return total;
    });
  }, [displayData, settings]);

  const legendTotals = useMemo(() => {
    const capacity     = cashFlows.reduce((s, r) => s + r.capacityValue, 0);
    const workforce    = cashFlows.reduce((s, r) => s + r.workforceValue, 0);
    const revenue      = cashFlows.reduce((s, r) => s + r.revenueValue, 0);
    const quality      = cashFlows.reduce((s, r) => s + r.qualityValue, 0);
    const displacement = cashFlows.reduce((s, r) => s + r.displacementValue, 0);
    const inv = cashFlows.reduce((s, r) => s + r.investment, 0);
    const total = capacity + workforce + revenue + quality + displacement;
    return { capacity, workforce, revenue, quality, displacement, inv, total };
  }, [cashFlows]);

  const lastChartPoint = useMemo(() => {
    if (displayData.length === 0) return null;
    const last = displayData[displayData.length - 1];
    return {
      label: last.label,
      totalValue: last.totalValue,
      investment: last.investment,
    };
  }, [displayData]);

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

  return (
    <div className={embedded ? "bg-white" : "min-h-screen bg-white"}>
      {!embedded && (
        <>
          <UnifiedHeader
            pathType="explore"
            currentStep={2}
            totalSteps={2}
            stepName="Financial Proforma"
            onHome={onHome}
            showBack={false}
          />
          <UnifiedHeaderSpacer />
        </>
      )}

      {/* HERO */}
      {!embedded && <div className="bg-[#1A1A1A] text-white py-8 sm:py-12 px-4">
        <div className="max-w-[1000px] mx-auto">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            {!embedded && (
              <button onClick={onBack} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm" data-testid="button-back-hub">
                <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Back to Hub</span><span className="sm:hidden">Back</span>
              </button>
            )}
            <div className="flex items-center gap-2">
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
                <p className="text-[12px] text-white/50 uppercase tracking-wide mb-1">Return at Scale</p>
                <p className="text-xl font-bold" data-testid="text-roi">{hasInvestment ? `${summary.atScaleReturn.toFixed(1)}x` : "N/A"}</p>
                {hasInvestment && (
                  <p className="text-[12px] text-white/40 mt-0.5" data-testid="text-roi-benchmark-mobile">
                    3-yr net: {Math.round(summary.simpleROI * 100)}%
                  </p>
                )}
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
              <p className="text-xs text-white/50 uppercase tracking-wide mb-1">Return at Scale</p>
              <p className="text-2xl font-bold">{hasInvestment ? `${summary.atScaleReturn.toFixed(1)}x` : "N/A"}</p>
              {hasInvestment && (
                <p className="text-[12px] text-white/40 mt-1" data-testid="text-roi-benchmark">
                  3-yr net: {Math.round(summary.simpleROI * 100)}%
                </p>
              )}
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
      </div>}

      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-6 sm:py-8">

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

        {/* SENSITIVITY ANALYSIS */}
        <motion.div
          className="mb-10 sm:mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          data-testid="panel-sensitivity"
        >
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-neutral-400" />
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">Sensitivity Analysis</span>
            <button
              onClick={() => setShowSensitivitySettings(v => !v)}
              className={`ml-auto p-1 rounded transition-colors ${showSensitivitySettings ? "text-[#EA2C00] bg-[#EA2C00]/8" : "text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100"}`}
              title="Adjust sensitivity range"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>

          <AnimatePresence>
            {showSensitivitySettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden mb-4"
              >
                <div className="flex items-center gap-2 bg-[#F9F6F2] rounded-xl px-4 py-3">
                  <span className="text-xs text-neutral-500 whitespace-nowrap">Realization range</span>
                  <div className="flex items-center gap-1.5">
                    {[15, 20, 25, 30, 40, 50].map(pct => (
                      <button
                        key={pct}
                        onClick={() => setSensitivityRange(pct)}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${sensitivityRange === pct ? "bg-[#EA2C00] text-white" : "bg-white border border-neutral-200 text-neutral-600 hover:border-neutral-400"}`}
                      >
                        ±{pct}%
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-4">
            {([
              { key: "conservative" as const, label: "Conservative", sublabel: `${100 - sensitivityRange}% Realization`, dark: false },
              { key: "base" as const, label: "Base Case", sublabel: "Your Assumptions", dark: true },
              { key: "optimistic" as const, label: "Optimistic", sublabel: `${100 + sensitivityRange}% Realization`, dark: false },
            ] as const).map((scenario) => {
              const data = sensitivityAnalysis[scenario.key];
              return (
                <div
                  key={scenario.key}
                  className={`rounded-2xl p-4 sm:p-6 ${scenario.dark ? "bg-[#1A1A1A]" : "bg-[#F9F6F2]"}`}
                  data-testid={`sensitivity-${scenario.key}`}
                >
                  <p className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${scenario.dark ? "text-white/60" : "text-neutral-400"}`}>
                    {scenario.label}
                  </p>
                  <p className={`text-[10px] mb-4 ${scenario.dark ? "text-white/30" : "text-neutral-400"}`}>
                    {scenario.sublabel}
                  </p>
                  <p className={`text-2xl sm:text-3xl font-bold tracking-tight mb-0.5 ${scenario.dark ? "text-[#EA2C00]" : "text-neutral-900"}`} data-testid={`sensitivity-value-${scenario.key}`}>
                    {fmt(data.annualValue)}
                  </p>
                  <p className={`text-[10px] mb-5 ${scenario.dark ? "text-white/30" : "text-neutral-400"}`}>annual value</p>

                  <div className={`h-px mb-4 ${scenario.dark ? "bg-white/10" : "bg-neutral-200"}`} />

                  <div className="space-y-2.5">
                    <div className="flex justify-between items-baseline gap-2">
                      <span className={`text-[11px] ${scenario.dark ? "text-white/40" : "text-neutral-500"}`}>Return at Scale</span>
                      <span className={`text-sm font-bold tabular-nums ${scenario.dark ? "text-white" : "text-neutral-900"}`} data-testid={`sensitivity-atscale-${scenario.key}`}>
                        {hasInvestment ? `${data.atScaleReturn.toFixed(1)}x` : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline gap-2">
                      <span className={`text-[11px] ${scenario.dark ? "text-white/40" : "text-neutral-500"}`}>Value-to-Cost</span>
                      <span className={`text-sm font-bold tabular-nums ${scenario.dark ? "text-white" : "text-neutral-900"}`} data-testid={`sensitivity-vtc-${scenario.key}`}>
                        {hasInvestment ? `${data.valueToCost.toFixed(1)}x` : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline gap-2">
                      <span className={`text-[11px] ${scenario.dark ? "text-white/40" : "text-neutral-500"}`}>Payback</span>
                      <span className={`text-sm font-bold tabular-nums ${scenario.dark ? "text-white" : "text-neutral-900"}`} data-testid={`sensitivity-payback-${scenario.key}`}>
                        {data.paybackMonth ? `${data.paybackMonth} mo` : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline gap-2">
                      <span className={`text-[11px] ${scenario.dark ? "text-white/40" : "text-neutral-500"}`}>Net Value</span>
                      <span className={`text-sm font-bold tabular-nums ${scenario.dark ? "text-white" : "text-neutral-900"}`} data-testid={`sensitivity-net-${scenario.key}`}>
                        {fmt(data.termNet)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Range bar */}
          {(() => {
            const consVal = sensitivityAnalysis.conservative.annualValue;
            const baseVal = sensitivityAnalysis.base.annualValue;
            const optVal = sensitivityAnalysis.optimistic.annualValue;
            const minVal = Math.min(consVal, baseVal, optVal);
            const maxVal = Math.max(consVal, baseVal, optVal);
            const range = maxVal - minVal || 1;
            const pos = (v: number) => Math.max(2, Math.min(98, ((v - minVal) / range) * 100));
            return (
              <div className="bg-[#F9F6F2] rounded-xl px-5 py-4">
                <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest mb-2">Realization Factors</p>
                <p className="text-[11px] text-neutral-500 mb-4 leading-relaxed">
                  The range reflects organizational context — not Abridge's clinical accuracy. These factors shift where a deployment lands within the {fmt(consVal)}–{fmt(optVal)} band.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 flex-shrink-0" />
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Toward Conservative</p>
                    </div>
                    <ul className="space-y-2">
                      {["Competing change initiatives", "Active EHR migration", "Limited exec sponsorship", "High specialty complexity"].map(f => (
                        <li key={f} className="flex items-start gap-1.5">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-neutral-300 flex-shrink-0" />
                          <span className="text-[11px] text-neutral-500 leading-snug">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#EA2C00] flex-shrink-0" />
                      <p className="text-[10px] font-bold text-[#EA2C00]/60 uppercase tracking-wider">Toward Optimistic</p>
                    </div>
                    <ul className="space-y-2">
                      {["Dedicated physician champion", "Stable tech environment", "Strong exec sponsorship", "Focused specialty rollout"].map(f => (
                        <li key={f} className="flex items-start gap-1.5">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-[#EA2C00]/40 flex-shrink-0" />
                          <span className="text-[11px] text-neutral-500 leading-snug">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })()}
        </motion.div>

        {/* CHART */}
        <motion.div
          className="mb-8 sm:mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-neutral-400" />
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">Value Growth Trajectory</span>
            </div>
            <div className="flex items-center gap-1 bg-[#F5F0EB] rounded-full p-0.5">
              <button
                onClick={() => setConfig(c => ({ ...c, viewMode: "quarterly" }))}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${config.viewMode === "quarterly" ? "bg-white text-neutral-900 shadow-sm" : "text-[#8C7E6E] hover:text-neutral-900"}`}
                data-testid="toggle-quarterly"
              >
                Quarters
              </button>
              <button
                onClick={() => setConfig(c => ({ ...c, viewMode: "yearly" }))}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${config.viewMode === "yearly" ? "bg-white text-neutral-900 shadow-sm" : "text-[#8C7E6E] hover:text-neutral-900"}`}
                data-testid="toggle-yearly"
              >
                Years
              </button>
            </div>
          </div>
          <div className="bg-[#F9F6F2] rounded-xl p-3 sm:p-6" data-testid="chart-ramp-up">
            <ResponsiveContainer width="100%" height={isMobile ? 280 : 380}>
              <ComposedChart data={displayData} margin={isMobile ? { top: 10, right: 10, left: 0, bottom: 20 } : { top: 20, right: 20, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E0DB" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: isMobile ? 10 : 11, fill: "#888" }}
                  axisLine={{ stroke: "#D5D0CB" }}
                  tickLine={false}
                  height={28}
                />
                <YAxis
                  tickFormatter={(v: number) => fmt(v)}
                  tick={{ fontSize: isMobile ? 10 : 11, fill: "#888" }}
                  width={isMobile ? 55 : 72}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip settings={settings} totalProvidersByPeriod={totalProvidersByPeriod} viewMode={config.viewMode} />} />

                {config.viewMode === "quarterly" && !isMobile && goLiveLabels.length > 1 && goLiveLabels.map((gl, idx) => (
                  <ReferenceLine
                    key={`golive-${gl.label}`}
                    x={gl.label}
                    stroke={gl.color}
                    strokeDasharray="3 4"
                    strokeOpacity={0.22}
                    strokeWidth={1}
                    label={{
                      value: `${gl.name} Go-Live`,
                      position: "insideTopLeft",
                      fontSize: 8,
                      fill: gl.color,
                      fillOpacity: 0.5,
                      dy: 8 + idx * 16,
                    }}
                  />
                ))}

                {paybackLabel && config.viewMode === "quarterly" && (
                  <ReferenceLine
                    x={paybackLabel}
                    stroke="#D4930A"
                    strokeDasharray="6 3"
                    strokeOpacity={0.85}
                    strokeWidth={2}
                    label={isMobile ? undefined : {
                      value: "Payback",
                      position: "insideTopRight",
                      fontSize: 11,
                      fill: "#D4930A",
                      fontWeight: 700,
                      dy: 8,
                    }}
                  />
                )}

                {legendTotals.capacity > 0 && (
                  <Bar dataKey="capacityValue" stackId="value" fill={CHART_COLORS.capacity} name="Capacity" maxBarSize={config.viewMode === "yearly" ? 56 : 28} radius={[0, 0, 0, 0]} />
                )}
                {legendTotals.workforce > 0 && (
                  <Bar dataKey="workforceValue" stackId="value" fill={CHART_COLORS.workforce} name="Workforce" maxBarSize={config.viewMode === "yearly" ? 56 : 28} />
                )}
                {legendTotals.revenue > 0 && (
                  <Bar dataKey="revenueValue" stackId="value" fill={CHART_COLORS.revenue} name="Revenue" maxBarSize={config.viewMode === "yearly" ? 56 : 28} />
                )}
                {legendTotals.quality > 0 && (
                  <Bar dataKey="qualityValue" stackId="value" fill={CHART_COLORS.quality} name="Quality" maxBarSize={config.viewMode === "yearly" ? 56 : 28} />
                )}
                {legendTotals.displacement > 0 && (
                  <Bar dataKey="displacementValue" stackId="value" fill={CHART_COLORS.displacement} name="Cost Displacement" maxBarSize={config.viewMode === "yearly" ? 56 : 28} radius={[2, 2, 0, 0]} />
                )}
                {hasInvestment && (
                  <Line
                    type="monotone"
                    dataKey="investment"
                    stroke={CHART_COLORS.investment}
                    strokeWidth={isMobile ? 1.5 : 2}
                    strokeDasharray="6 3"
                    dot={false}
                    name="Investment"
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>

            <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-center gap-x-4 gap-y-2 sm:gap-6 mt-4 text-xs">
              {legendTotals.capacity > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 inline-block rounded-sm flex-shrink-0" style={{ backgroundColor: CHART_COLORS.capacity }} />
                  <span className="text-neutral-600">Capacity</span>
                  <span className="text-neutral-400 font-medium">{fmt(legendTotals.capacity)}{legendTotals.total > 0 ? ` (${Math.round((legendTotals.capacity / legendTotals.total) * 100)}%)` : ""}</span>
                </span>
              )}
              {legendTotals.workforce > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 inline-block rounded-sm flex-shrink-0" style={{ backgroundColor: CHART_COLORS.workforce }} />
                  <span className="text-neutral-600">Workforce</span>
                  <span className="text-neutral-400 font-medium">{fmt(legendTotals.workforce)}{legendTotals.total > 0 ? ` (${Math.round((legendTotals.workforce / legendTotals.total) * 100)}%)` : ""}</span>
                </span>
              )}
              {legendTotals.revenue > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 inline-block rounded-sm flex-shrink-0" style={{ backgroundColor: CHART_COLORS.revenue }} />
                  <span className="text-neutral-600">Revenue</span>
                  <span className="text-neutral-400 font-medium">{fmt(legendTotals.revenue)}{legendTotals.total > 0 ? ` (${Math.round((legendTotals.revenue / legendTotals.total) * 100)}%)` : ""}</span>
                </span>
              )}
              {legendTotals.quality > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 inline-block rounded-sm flex-shrink-0" style={{ backgroundColor: CHART_COLORS.quality }} />
                  <span className="text-neutral-600">Quality</span>
                  <span className="text-neutral-400 font-medium">{fmt(legendTotals.quality)}{legendTotals.total > 0 ? ` (${Math.round((legendTotals.quality / legendTotals.total) * 100)}%)` : ""}</span>
                </span>
              )}
              {legendTotals.displacement > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 inline-block rounded-sm flex-shrink-0" style={{ backgroundColor: CHART_COLORS.displacement }} />
                  <span className="text-neutral-600">Cost Displacement</span>
                  <span className="text-neutral-400 font-medium">{fmt(legendTotals.displacement)}{legendTotals.total > 0 ? ` (${Math.round((legendTotals.displacement / legendTotals.total) * 100)}%)` : ""}</span>
                </span>
              )}
              {hasInvestment && legendTotals.inv > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="w-5 h-0 inline-block" style={{ borderTop: `2px dashed ${CHART_COLORS.investment}` }} />
                  <span className="text-neutral-600">Investment</span>
                  <span className="text-neutral-400 font-medium">{fmt(legendTotals.inv)}</span>
                </span>
              )}
            </div>
          </div>

          {summary.paybackMonth && (
            <p className="text-center text-sm text-neutral-600 mt-3" data-testid="text-payback-insight">
              At your planned rollout pace, you reach payback in <strong className="text-neutral-900">Month {summary.paybackMonth}</strong>.
            </p>
          )}
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
                    {[
                      { label: "Capacity",  color: CHART_COLORS.capacity,  vals: yearlyData.map(y => y.capacityValue),  total: yearlyData.reduce((s, y) => s + y.capacityValue, 0)  },
                      { label: "Workforce", color: CHART_COLORS.workforce, vals: yearlyData.map(y => y.workforceValue), total: yearlyData.reduce((s, y) => s + y.workforceValue, 0) },
                      { label: "Revenue",   color: CHART_COLORS.revenue,   vals: yearlyData.map(y => y.revenueValue),   total: yearlyData.reduce((s, y) => s + y.revenueValue, 0)   },
                      { label: "Quality",   color: CHART_COLORS.quality,   vals: yearlyData.map(y => y.qualityValue),   total: yearlyData.reduce((s, y) => s + y.qualityValue, 0)   },
                    ].map(({ label, color, vals, total }) => (
                      <tr key={label} className="border-b border-neutral-100">
                        <td className="py-2 pl-4 text-xs" style={{ color }}>{label}</td>
                        {vals.map((v, i) => (
                          <td key={i} className="text-right py-2 px-4 text-xs text-neutral-500">{v === 0 ? "—" : fmt(v)}</td>
                        ))}
                        <td className="text-right py-2 px-4 text-xs text-neutral-500">{total === 0 ? "—" : fmt(total)}</td>
                      </tr>
                    ))}
                    {yearlyData.some(y => (y as any).displacementValue > 0) && (
                      <tr className="border-b border-neutral-100">
                        <td className="py-2 pl-4 text-xs" style={{ color: CHART_COLORS.displacement }}>Cost Displacement</td>
                        {yearlyData.map(y => (
                          <td key={y.label} className="text-right py-2 px-4 text-xs text-neutral-500">{fmt((y as any).displacementValue || 0)}</td>
                        ))}
                        <td className="text-right py-2 px-4 text-xs text-neutral-500">
                          {fmt(yearlyData.reduce((s, y) => s + ((y as any).displacementValue || 0), 0))}
                        </td>
                      </tr>
                    )}
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
              <p><strong className="text-neutral-900">Driver Onset Timing:</strong> Value materializes at different speeds across the four domains. <strong style={{ color: '#1E3A5F' }}>Revenue</strong> drivers (wRVU capture, denial prevention, DRG accuracy, CDI) have a {ONSET_DELAY_MONTHS.immediate}-month billing cycle lag before value appears, then ramp over 3 months. HCC Recapture has a {ONSET_DELAY_MONTHS.longTerm}-month lag — documentation improves in Year 1, but capitation adjustments flow through the annual RAF reconciliation cycle and appear in Year 2. <strong style={{ color: '#EA2C00' }}>Capacity</strong> gains (patient access, throughput, LWBS recovery, bedside time freed) onset at month {ONSET_DELAY_MONTHS.delayed} as organizations operationalize available capacity, then ramp over 3 months. <strong style={{ color: '#888888' }}>Quality</strong> improvements (care gap closure, HEDIS/Stars performance, core measures, {settings.some(s => s.careSetting === "nursing") ? "HAPI, falls, CAUTI, CLABSI, sepsis" : "ED core measures, documentation deficiency"}) also onset at month {ONSET_DELAY_MONTHS.delayed} — clinical outcomes require a full quarter of consistent documentation before measurable improvement occurs. <strong style={{ color: '#7A1F04' }}>Workforce</strong> gains (provider wellbeing, locum/agency reduction, nursing retention) phase in over years per your configured phasing ({config.retentionPhasing.year1Pct}% Y1 / {config.retentionPhasing.year2Pct}% Y2 / {config.retentionPhasing.year3Pct}% Y3{config.nursingRetentionPhasing && settings.some(s => s.careSetting === "nursing") && (config.nursingRetentionPhasing.year1Pct !== config.retentionPhasing.year1Pct || config.nursingRetentionPhasing.year2Pct !== config.retentionPhasing.year2Pct) ? `; Nursing: ${config.nursingRetentionPhasing.year1Pct}% Y1 / ${config.nursingRetentionPhasing.year2Pct}% Y2 / ${config.nursingRetentionPhasing.year3Pct}% Y3` : ""}).</p>
              <p><strong className="text-neutral-900">Value-to-Cost:</strong> Total value over the <em>entire contract</em> divided by total contract cost (one-time implementation fees + all subscription). This is the blended, whole-deal figure — it deliberately includes the early ramp months, when value is still climbing, and the upfront setup cost. A {summary.valueToCost.toFixed(1)}x ratio means you receive ${summary.valueToCost.toFixed(2)} of value for every $1 invested across the full term.</p>
              <p><strong className="text-neutral-900">Return at Scale:</strong> The fully-ramped <em>annual</em> value divided by the steady-state <em>annual</em> subscription — no implementation fees, no ramp drag. This is the run-rate once every provider is onboarded and adoption has matured: the relationship at cruising altitude. It is always higher than Value-to-Cost because it strips out the one-time setup cost and the slower early months. Read Value-to-Cost as the conservative whole-contract return, and Return at Scale as where it settles once mature.</p>
              <p><strong className="text-neutral-900">Simple ROI:</strong> Total contract net value divided by total contract cost. {Math.round(summary.simpleROI * 100)}% means for every $1 of Abridge investment, you generate ${summary.simpleROI.toFixed(2)} in net value above the cost.</p>
              <p><strong className="text-neutral-900">Payback Period:</strong> The month in which cumulative net value turns positive — i.e. when accumulated value has recouped the upfront implementation fee plus the subscription paid from day one. Because the implementation fee lands on day one while value builds gradually through the adoption ramp, payback is sensitive right around break-even: in the conservative (70%) case, reduced monthly value only narrowly clears monthly cost during the early ramp, so it takes noticeably longer to recoup the upfront fee. That asymmetry is expected — a downside pushes payback out more than an equal upside pulls it in.</p>
              <p><strong className="text-neutral-900">Provider Expansion:</strong> Providers scale linearly from pilot count to full-scale count over the contract term. This models a realistic organizational rollout trajectory.</p>
              <p><strong className="text-neutral-900">Workforce Phasing:</strong> Workforce gains (provider wellbeing, locum/agency reduction, retention) are conservatively phased — {config.retentionPhasing.year1Pct}% in Year 1{Math.ceil(config.contractTermMonths / 12) >= 2 ? `, ${config.retentionPhasing.year2Pct}% in Year 2` : ""}{Math.ceil(config.contractTermMonths / 12) >= 3 ? `, ${config.retentionPhasing.year3Pct}% in Year 3${config.contractTermMonths > 36 ? "+" : ""}` : ""}. These benefits ramp gradually within each year — reaching the configured phasing percentage by year-end.</p>
              <p><strong className="text-neutral-900">Sensitivity:</strong> Two-sided linear analysis scaling total value realization by 70% (conservative) and 130% (optimistic). Investment is held constant. Derived metrics (VTC, ROI, payback) are recalculated from the scaled values. This brackets the range of likely financial outcomes.</p>
            </div>
          )}
        </motion.div>
        {/* FOOTER ACTIONS */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 py-6 border-t border-neutral-200">
          {!embedded && (
            <Button
              variant="outline"
              onClick={onBack}
              className="gap-2 order-2 sm:order-1"
              data-testid="button-edit-settings"
            >
              <Settings className="w-4 h-4" /> Edit Settings
            </Button>
          )}
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

  const capacityItem    = payload.find((p: any) => p.dataKey === "capacityValue");
  const workforceItem   = payload.find((p: any) => p.dataKey === "workforceValue");
  const revenueItem     = payload.find((p: any) => p.dataKey === "revenueValue");
  const qualityItem     = payload.find((p: any) => p.dataKey === "qualityValue");
  const displacementItem = payload.find((p: any) => p.dataKey === "displacementValue");
  const investmentItem  = payload.find((p: any) => p.dataKey === "investment");

  const total = (capacityItem?.value || 0) + (workforceItem?.value || 0) + (revenueItem?.value || 0) + (qualityItem?.value || 0) + (displacementItem?.value || 0);
  const periodIdx = (payload[0]?.payload?.period || 1) - 1;
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

      {(capacityItem?.value || 0) > 0 && (
        <div className="flex justify-between gap-3 mb-1">
          <span className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm" style={{ backgroundColor: CHART_COLORS.capacity }} />
            <span className="text-neutral-600">Capacity</span>
          </span>
          <span className="font-medium text-neutral-900">{fmt(capacityItem.value)}</span>
        </div>
      )}
      {(workforceItem?.value || 0) > 0 && (
        <div className="flex justify-between gap-3 mb-1">
          <span className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm" style={{ backgroundColor: CHART_COLORS.workforce }} />
            <span className="text-neutral-600">Workforce</span>
          </span>
          <span className="font-medium text-neutral-900">{fmt(workforceItem.value)}</span>
        </div>
      )}
      {(revenueItem?.value || 0) > 0 && (
        <div className="flex justify-between gap-3 mb-1">
          <span className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm" style={{ backgroundColor: CHART_COLORS.revenue }} />
            <span className="text-neutral-600">Revenue</span>
          </span>
          <span className="font-medium text-neutral-900">{fmt(revenueItem.value)}</span>
        </div>
      )}
      {(qualityItem?.value || 0) > 0 && (
        <div className="flex justify-between gap-3 mb-1">
          <span className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm" style={{ backgroundColor: CHART_COLORS.quality }} />
            <span className="text-neutral-600">Quality</span>
          </span>
          <span className="font-medium text-neutral-900">{fmt(qualityItem.value)}</span>
        </div>
      )}
      {(displacementItem?.value || 0) > 0 && (
        <div className="flex justify-between gap-3 mb-1">
          <span className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm" style={{ backgroundColor: CHART_COLORS.displacement }} />
            <span className="text-neutral-600">Cost Displacement</span>
          </span>
          <span className="font-medium text-neutral-900">{fmt(displacementItem.value)}</span>
        </div>
      )}

      <div className="border-t border-neutral-200 mt-2 pt-2 flex justify-between">
        <span className="font-bold text-neutral-900">Period Value</span>
        <span className="font-bold text-[#EA2C00]">{fmt(total)}</span>
      </div>
      {investmentItem && (investmentItem.value || 0) > 0 && (
        <div className="flex justify-between mt-1">
          <span className="text-neutral-500">Investment</span>
          <span className="text-neutral-700">({fmt(investmentItem.value)})</span>
        </div>
      )}
    </div>
  );
}
