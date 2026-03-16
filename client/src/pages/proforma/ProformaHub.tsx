import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Edit, ArrowRight, Building2, Stethoscope, HeartPulse, BedDouble, ChevronLeft, Layers, ChevronDown, ChevronUp, ExternalLink, TrendingUp, Clock, DollarSign, BarChart3, X, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import type { ProformaSettingSnapshot, ProformaConfig, ProformaScenario, QuarterlyProviders, QuarterlyPricing, QuarterlyUtilization } from "./proformaTypes";
import { SETTING_COLORS, SETTING_LABELS, SETTING_UNIT_LABELS } from "./proformaTypes";
import { buildMonthlyCashFlows, calculateProformaSummary, computeYearlyEncounters, annualToQuarterlyProviders, annualToQuarterlyPricing, quarterlyToAnnualProviders, quarterlyToAnnualPricing, annualToQuarterlyUtilization, quarterlyToAnnualUtilization } from "@/lib/proformaCalculations";

interface ProformaHubProps {
  settings: ProformaSettingSnapshot[];
  scenarios?: ProformaScenario[];
  config: ProformaConfig;
  onConfigChange: (config: ProformaConfig) => void;
  onAddSetting: (careSetting?: string) => void;
  onEditSetting: (id: string) => void;
  onRemoveSetting: (id: string) => void;
  onUpdateSetting: (id: string, updates: Partial<ProformaSettingSnapshot>) => void;
  onViewProforma: () => void;
  onBack: () => void;
}

const SETTING_ICONS: Record<string, typeof Building2> = {
  outpatient: Building2,
  ed: HeartPulse,
  inpatient: BedDouble,
  nursing: Stethoscope,
};

function contractTermLabel(months: number): string {
  return `${months / 12}-Year`;
}

const ALL_SETTINGS = ["outpatient", "ed", "inpatient", "nursing"];

function fmt(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000).toLocaleString()}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

function fmtNum(n: number) {
  return n.toLocaleString();
}

function RolloutTimeline({ settings, contractMonths }: { settings: ProformaSettingSnapshot[]; contractMonths: number }) {
  if (settings.length === 0) return null;
  const totalMonths = contractMonths;
  return (
    <div className="mb-6" data-testid="rollout-timeline">
      <p className="text-[12px] font-medium text-[#9C8E7E] uppercase tracking-[1.5px] mb-3">Deployment Timeline</p>
      <div className="relative bg-[#F5F0EB] rounded-lg overflow-hidden" style={{ height: `${settings.length * 36 + 24}px` }}>
        <div className="absolute inset-0 flex">
          {Array.from({ length: Math.ceil(totalMonths / 12) }, (_, i) => (
            <div key={i} className="flex-1 border-r border-[#DDD6CC]/60 relative">
              <span className="absolute top-1 left-1.5 text-[9px] text-[#A39888] font-medium">Y{i + 1}</span>
            </div>
          ))}
        </div>
        {settings.map((s, idx) => {
          const startPct = ((s.goLiveMonth - 1) / totalMonths) * 100;
          const rampMonths = Math.min(12, totalMonths - s.goLiveMonth + 1);
          const rampPct = (rampMonths / totalMonths) * 100;
          const fullPct = ((totalMonths - s.goLiveMonth + 1) / totalMonths) * 100;
          return (
            <div key={s.id} className="absolute left-0 right-0" style={{ top: `${idx * 36 + 20}px`, height: "28px" }}>
              <div
                className="absolute rounded-md"
                style={{ left: `${startPct}%`, width: `${fullPct}%`, height: "100%", backgroundColor: s.color, opacity: 0.3 }}
              />
              <div
                className="absolute rounded-l-md flex items-center px-2 gap-1.5"
                style={{ left: `${startPct}%`, width: `${Math.min(rampPct, fullPct)}%`, height: "100%", backgroundColor: s.color }}
              >
                <span className="text-[12px] font-bold text-white truncate">{s.label}</span>
                <span className="text-[9px] text-white/70 whitespace-nowrap">M{s.goLiveMonth}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ValueCompositionBar({ setting }: { setting: ProformaSettingSnapshot }) {
  const total = setting.annualValue;
  if (total <= 0) return null;
  const capacityValue = Math.max(0, total - setting.docValue - setting.retentionValue);
  const docPct = (setting.docValue / total) * 100;
  const timePct = (capacityValue / total) * 100;
  const retPct = (setting.retentionValue / total) * 100;
  return (
    <div className="mt-3" data-testid={`value-bar-${setting.careSetting}`}>
      <div className="flex rounded-full overflow-hidden h-2">
        {docPct > 0 && <div className="bg-[#1A1A1A]" style={{ width: `${docPct}%` }} title={`Doc Quality: ${Math.round(docPct)}%`} />}
        {timePct > 0 && <div className="bg-[#EA2C00]" style={{ width: `${timePct}%` }} title={`Capacity & Efficiency: ${Math.round(timePct)}%`} />}
        {retPct > 0 && <div className="bg-[#7A1F04]" style={{ width: `${retPct}%` }} title={`Retention: ${Math.round(retPct)}%`} />}
      </div>
      <div className="flex gap-3 mt-1">
        {docPct > 0 && <span className="text-[9px] text-[#A39888]"><span className="inline-block w-1.5 h-1.5 rounded-full bg-[#1A1A1A] mr-1" />Doc {Math.round(docPct)}%</span>}
        {timePct > 0 && <span className="text-[9px] text-[#A39888]"><span className="inline-block w-1.5 h-1.5 rounded-full bg-[#EA2C00] mr-1" />Capacity {Math.round(timePct)}%</span>}
        {retPct > 0 && <span className="text-[9px] text-[#A39888]"><span className="inline-block w-1.5 h-1.5 rounded-full bg-[#7A1F04] mr-1" />Ret {Math.round(retPct)}%</span>}
      </div>
    </div>
  );
}

export default function ProformaHub({
  settings,
  scenarios = [],
  config,
  onConfigChange,
  onAddSetting,
  onEditSetting,
  onRemoveSetting,
  onUpdateSetting,
  onViewProforma,
  onBack,
}: ProformaHubProps) {
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [comparePricingId, setComparePricingId] = useState<string | null>(null);
  const [altPrice, setAltPrice] = useState<number>(0);
  const addedSettings = settings.map(s => s.careSetting);
  const hasNursing = settings.some(s => s.careSetting === "nursing");
  const availableSettings = ALL_SETTINGS.filter(s => !addedSettings.includes(s));

  const summary = useMemo(() => {
    if (settings.length === 0) return null;
    const cashFlows = buildMonthlyCashFlows(settings, config);
    return calculateProformaSummary(settings, config, cashFlows);
  }, [settings, config]);

  const totalHours = settings.reduce((s, v) => s + v.totalHoursSaved, 0);
  const totalProviders = settings.reduce((s, v) => s + v.providerCount, 0);

  return (
    <div className="min-h-screen bg-[#FAFAF7]">
      <UnifiedHeader pathType="explore" currentStep={1} totalSteps={2} stepName="Deal Structure" onHome={onBack} />
      <UnifiedHeaderSpacer />

      <div className="bg-[#1A1A1A] text-white py-14 px-4">
        <div className="max-w-[900px] mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-5">
            <Layers className="w-4 h-4" />
            <span className="text-xs font-medium tracking-wide">ORGANIZATION PROFORMA</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Design Your Deal Structure</h1>
          <p className="text-lg text-white/60 max-w-xl mx-auto">
            Layer care settings, sequence the rollout, and model the financial case for your organization.
          </p>
        </div>
      </div>

      <div className="max-w-[900px] mx-auto px-4 sm:px-6 -mt-8">
        {settings.length > 0 && summary && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#F9F6F2] rounded-xl border border-[#E8E2DA] shadow-sm p-5 mb-6"
            data-testid="proforma-summary-bar"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-4">
              <div>
                <p className="text-xs text-[#8C7E6E] mb-1">Annual Value at Scale</p>
                <p className="text-xl font-bold text-[#EA2C00]" data-testid="hub-annual-value">{fmt(summary.runRateValue)}</p>
              </div>
              <div>
                <p className="text-xs text-[#8C7E6E] mb-1">{contractTermLabel(config.contractTermMonths)} Total</p>
                <p className="text-xl font-bold text-neutral-900" data-testid="hub-3yr-value">{fmt(summary.termValue)}</p>
              </div>
              <div>
                <p className="text-xs text-[#8C7E6E] mb-1">Total Investment</p>
                <p className="text-xl font-bold text-neutral-900" data-testid="hub-investment">{fmt(summary.termInvestment)}</p>
              </div>
              <div>
                <p className="text-xs text-[#8C7E6E] mb-1">Net {contractTermLabel(config.contractTermMonths)} Value</p>
                <p className={`text-xl font-bold ${summary.termNet >= 0 ? "text-[#E8350A]" : "text-[#9CA3AF]"}`} data-testid="hub-net-value">{fmt(summary.termNet)}</p>
              </div>
            </div>
            <div className="border-t border-[#E8E2DA] pt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="flex flex-col items-center">
                <TrendingUp className="w-3.5 h-3.5 text-[#E8350A] mb-1" />
                <p className="text-sm font-bold text-[#E8350A]" data-testid="hub-vtc">{summary.valueToCost > 0 ? `${summary.valueToCost.toFixed(1)}x` : "N/A"}</p>
                <p className="text-[12px] text-[#A39888]">Value-to-Cost</p>
              </div>
              <div className="flex flex-col items-center">
                <Clock className="w-3.5 h-3.5 text-[#A39888] mb-1" />
                <p className="text-sm font-bold text-neutral-900" data-testid="hub-payback">{summary.paybackMonth ? `${summary.paybackMonth} mo` : "—"}</p>
                <p className="text-[12px] text-[#A39888]">Payback</p>
              </div>
              <div className="flex flex-col items-center">
                <BarChart3 className="w-3.5 h-3.5 text-[#A39888] mb-1" />
                <p className="text-sm font-bold text-neutral-900" data-testid="hub-roi">{Math.round(summary.simpleROI * 100)}%</p>
                <p className="text-[12px] text-[#A39888]">Simple ROI</p>
              </div>
              <div className="flex flex-col items-center">
                <DollarSign className="w-3.5 h-3.5 text-[#A39888] mb-1" />
                <p className="text-sm font-bold text-neutral-900" data-testid="hub-hours">{fmtNum(totalHours)}</p>
                <p className="text-[12px] text-[#A39888]">Hours/Year</p>
              </div>
            </div>
          </motion.div>
        )}

        {settings.length > 0 && (
          <RolloutTimeline settings={settings} contractMonths={config.contractTermMonths} />
        )}

        <div className="space-y-4 mb-8">
          <AnimatePresence mode="popLayout">
            {settings.map((setting, idx) => {
              const Icon = SETTING_ICONS[setting.careSetting] || Building2;
              const color = SETTING_COLORS[setting.careSetting];
              const isEditing = editingId === setting.id;
              const unitLabel = SETTING_UNIT_LABELS[setting.careSetting];
              const yp = setting.yearlyProviders;
              const isEncPricing = setting.pricingModel === "perEncounter";
              const ye = isEncPricing
                ? (setting.yearlyEncounters ?? computeYearlyEncounters(setting, config))
                : { year1: 0, year2: 0, year3: 0 };
              const defaultUtil = setting.careSetting === "nursing" && config.nursingYearlyUtilization
                ? config.nursingYearlyUtilization
                : config.yearlyUtilization;
              const yu = setting.yearlyUtilization ?? defaultUtil;
              const contractYears = Math.ceil(config.contractTermMonths / 12);
              const yearColsClass = contractYears >= 3 ? "grid-cols-3" : contractYears === 2 ? "grid-cols-2" : "grid-cols-1";
              return (
                <motion.div
                  key={setting.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white rounded-xl overflow-hidden border border-[#E8E2DA] shadow-sm"
                  data-testid={`proforma-setting-card-${setting.careSetting}`}
                >
                  <div className="flex">
                    <div className="w-1 flex-shrink-0" style={{ backgroundColor: color }} />
                    <div className="flex-1 p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}12` }}>
                            <Icon className="w-5 h-5" style={{ color }} />
                          </div>
                          <div>
                            <h3 className="font-bold text-neutral-900">{setting.label}</h3>
                            <p className="text-sm text-[#8C7E6E]">
                              {isEncPricing
                                ? `${fmtNum(ye.year1)} → ${fmtNum(contractYears >= 2 ? ye.year2 : ye.year1)} encounters · ${yu.year1}% → ${contractYears >= 2 ? yu.year2 : yu.year1}% util`
                                : `${fmtNum(setting.providerCount)} → ${fmtNum(setting.fullScaleProviders)} ${unitLabel} · ${setting.utilizationPercent}% util`
                              }
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingId(isEditing ? null : setting.id)}
                            className={`p-2 rounded-lg transition-colors ${isEditing ? 'bg-[#EA2C00]/10 text-[#EA2C00]' : 'hover:bg-[#F5F0EB] text-[#A39888] hover:text-[#6B5E4F]'}`}
                            data-testid={`button-edit-${setting.careSetting}`}
                          >
                            {isEditing ? <ChevronUp className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                          </button>
                          {confirmRemove === setting.id ? (
                            <div className="flex items-center gap-1 ml-1">
                              <button
                                onClick={() => { onRemoveSetting(setting.id); setConfirmRemove(null); }}
                                className="px-2 py-1 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
                                data-testid={`button-confirm-remove-${setting.careSetting}`}
                              >
                                Remove
                              </button>
                              <button
                                onClick={() => setConfirmRemove(null)}
                                className="px-2 py-1 text-xs text-[#8C7E6E] hover:text-[#6B5E4F]"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmRemove(setting.id)}
                              className="p-2 rounded-lg hover:bg-red-50 text-[#A39888] hover:text-red-500 transition-colors"
                              data-testid={`button-remove-${setting.careSetting}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-3">
                        <div>
                          <p className="text-xs text-[#8C7E6E] mb-1">Annual Value</p>
                          <p className="text-lg font-bold" style={{ color }}>{fmt(setting.annualValue)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[#8C7E6E] mb-1">Hours Returned</p>
                          <p className="text-lg font-bold text-neutral-900">{fmtNum(setting.totalHoursSaved)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[#8C7E6E] mb-1">Go-Live Month</p>
                          <select
                            value={setting.goLiveMonth}
                            onChange={(e) => onUpdateSetting(setting.id, { goLiveMonth: parseInt(e.target.value) })}
                            className="h-8 w-full rounded-lg border border-[#DDD6CC] bg-white px-2 text-sm font-medium text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/30"
                            data-testid={`select-golive-${setting.careSetting}`}
                          >
                            {Array.from({ length: config.contractTermMonths }, (_, i) => (
                              <option key={i + 1} value={i + 1}>Month {i + 1}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <ValueCompositionBar setting={setting} />

                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {setting.drivers.slice(0, 4).map(d => (
                          <span key={d.id} className="text-[12px] bg-[#F5F0EB] px-2 py-0.5 rounded-full text-[#6B5E4F] border border-[#E8E2DA]">
                            {d.name}: {fmt(d.value)}
                          </span>
                        ))}
                        {setting.drivers.length > 4 && (
                          <span className="text-[12px] text-[#A39888] px-1.5 py-0.5">+{setting.drivers.length - 4} more</span>
                        )}
                      </div>

                      <AnimatePresence>
                        {isEditing && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-4 pt-4 border-t border-[#F0EAE2] space-y-4">
                              {isEncPricing && (
                                <div>
                                  <p className="text-[12px] font-medium text-[#9C8E7E] uppercase tracking-[1.5px] mb-2">Contracted Encounters by Year</p>
                                  <div className={`grid ${yearColsClass} gap-2 sm:gap-3 mb-2`}>
                                    <div>
                                      <label className="block text-[12px] text-[#8C7E6E] mb-1">Y1 Encounters</label>
                                      <FormattedNumberInput
                                        value={ye.year1}
                                        onChange={(v) => {
                                          const val = Math.max(v, 1);
                                          const newYe = { ...ye, year1: val };
                                          onUpdateSetting(setting.id, { yearlyEncounters: newYe, encounters: val });
                                        }}
                                        className="w-full text-right text-sm h-8 bg-white border border-neutral-200 rounded-lg px-2"
                                        data-testid={`input-y1-enc-${setting.careSetting}`}
                                      />
                                    </div>
                                    {contractYears >= 2 && (
                                    <div>
                                      <label className="block text-[12px] text-[#8C7E6E] mb-1">Y2 Encounters</label>
                                      <FormattedNumberInput
                                        value={ye.year2}
                                        onChange={(v) => {
                                          const val = Math.max(v, 1);
                                          onUpdateSetting(setting.id, { yearlyEncounters: { ...ye, year2: val } });
                                        }}
                                        className="w-full text-right text-sm h-8 bg-white border border-neutral-200 rounded-lg px-2"
                                        data-testid={`input-y2-enc-${setting.careSetting}`}
                                      />
                                    </div>
                                    )}
                                    {contractYears >= 3 && (
                                    <div>
                                      <label className="block text-[12px] text-[#8C7E6E] mb-1">Y3 Encounters</label>
                                      <FormattedNumberInput
                                        value={ye.year3}
                                        onChange={(v) => {
                                          const val = Math.max(v, 1);
                                          onUpdateSetting(setting.id, { yearlyEncounters: { ...ye, year3: val } });
                                        }}
                                        className="w-full text-right text-sm h-8 bg-white border border-neutral-200 rounded-lg px-2"
                                        data-testid={`input-y3-enc-${setting.careSetting}`}
                                      />
                                    </div>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-[#A39888]">Editable — initially calculated from {unitLabel.toLowerCase()} × encounters/{unitLabel.replace(/s$/, '').toLowerCase()}</p>
                                  <div className="mt-3">
                                    <p className="text-[12px] font-medium text-[#9C8E7E] uppercase tracking-[1.5px] mb-2">Utilization by Year</p>
                                    <div className={`grid ${yearColsClass} gap-2 sm:gap-3 mb-1`}>
                                      <div>
                                        <label className="block text-[12px] text-[#8C7E6E] mb-1">Y1 Util %</label>
                                        <div className="relative">
                                          <input
                                            type="number"
                                            min={1}
                                            max={100}
                                            value={yu.year1}
                                            onChange={(e) => {
                                              const v = Math.max(1, Math.min(100, Number(e.target.value) || 1));
                                              onUpdateSetting(setting.id, { yearlyUtilization: { ...yu, year1: v }, utilizationPercent: v });
                                            }}
                                            className="w-full text-right text-sm h-8 bg-white border border-neutral-200 rounded-lg px-2 pr-6 text-[#6B5E4F] font-medium"
                                            data-testid={`input-y1-util-${setting.careSetting}`}
                                          />
                                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] text-[#A39888]">%</span>
                                        </div>
                                      </div>
                                      {contractYears >= 2 && (
                                      <div>
                                        <label className="block text-[12px] text-[#8C7E6E] mb-1">Y2 Util %</label>
                                        <div className="relative">
                                          <input
                                            type="number"
                                            min={1}
                                            max={100}
                                            value={yu.year2}
                                            onChange={(e) => {
                                              const v = Math.max(1, Math.min(100, Number(e.target.value) || 1));
                                              onUpdateSetting(setting.id, { yearlyUtilization: { ...yu, year2: v } });
                                            }}
                                            className="w-full text-right text-sm h-8 bg-white border border-neutral-200 rounded-lg px-2 pr-6 text-[#6B5E4F] font-medium"
                                            data-testid={`input-y2-util-${setting.careSetting}`}
                                          />
                                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] text-[#A39888]">%</span>
                                        </div>
                                      </div>
                                      )}
                                      {contractYears >= 3 && (
                                      <div>
                                        <label className="block text-[12px] text-[#8C7E6E] mb-1">Y3 Util %</label>
                                        <div className="relative">
                                          <input
                                            type="number"
                                            min={1}
                                            max={100}
                                            value={yu.year3}
                                            onChange={(e) => {
                                              const v = Math.max(1, Math.min(100, Number(e.target.value) || 1));
                                              onUpdateSetting(setting.id, { yearlyUtilization: { ...yu, year3: v } });
                                            }}
                                            className="w-full text-right text-sm h-8 bg-white border border-neutral-200 rounded-lg px-2 pr-6 text-[#6B5E4F] font-medium"
                                            data-testid={`input-y3-util-${setting.careSetting}`}
                                          />
                                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] text-[#A39888]">%</span>
                                        </div>
                                      </div>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-[#A39888]">% of encounters where Abridge is used</p>
                                  </div>
                                </div>
                              )}
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-[12px] font-medium text-[#9C8E7E] uppercase tracking-[1.5px]">{unitLabel} by {config.granularity === "quarterly" ? "Quarter" : "Year"}</p>
                                  <div className="flex items-center bg-[#F5F0EB] rounded-lg p-0.5" data-testid={`toggle-granularity-${setting.careSetting}`}>
                                    <button
                                      onClick={() => {
                                        if (config.granularity === "quarterly") {
                                          const qp = setting.quarterlyProviders;
                                          if (qp) {
                                            const annual = quarterlyToAnnualProviders(qp);
                                            onUpdateSetting(setting.id, { yearlyProviders: annual, providerCount: annual.year1, fullScaleProviders: annual.year3, quarterlyProviders: undefined });
                                          }
                                        }
                                        onConfigChange({ ...config, granularity: "annual" });
                                      }}
                                      className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition-colors ${config.granularity !== "quarterly" ? "bg-white text-neutral-900 shadow-sm" : "text-[#8C7E6E]"}`}
                                    >
                                      Annual
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (config.granularity !== "quarterly") {
                                          const annual = yp || { year1: setting.providerCount, year2: setting.fullScaleProviders, year3: setting.fullScaleProviders };
                                          if (!setting.quarterlyProviders) {
                                            onUpdateSetting(setting.id, { quarterlyProviders: annualToQuarterlyProviders(annual) });
                                          }
                                          const yprice = setting.yearlyPricing || { year1: setting.costPerUnit, year2: setting.costPerUnit, year3: setting.costPerUnit };
                                          if (!setting.quarterlyPricing) {
                                            onUpdateSetting(setting.id, { quarterlyPricing: annualToQuarterlyPricing(yprice) });
                                          }
                                          const settingYearlyUtil = setting.yearlyUtilization
                                            ?? (setting.careSetting === "nursing" && config.nursingYearlyUtilization
                                              ? config.nursingYearlyUtilization
                                              : config.yearlyUtilization);
                                          if (!setting.quarterlyUtilization) {
                                            onUpdateSetting(setting.id, { quarterlyUtilization: annualToQuarterlyUtilization(settingYearlyUtil) });
                                          }
                                        }
                                        onConfigChange({ ...config, granularity: "quarterly" });
                                      }}
                                      className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition-colors ${config.granularity === "quarterly" ? "bg-white text-neutral-900 shadow-sm" : "text-[#8C7E6E]"}`}
                                    >
                                      Quarterly
                                    </button>
                                  </div>
                                </div>
                                {config.granularity === "quarterly" ? (() => {
                                  const qp = setting.quarterlyProviders || annualToQuarterlyProviders(yp || { year1: setting.providerCount, year2: setting.fullScaleProviders, year3: setting.fullScaleProviders });
                                  const settingYearlyUtil = setting.yearlyUtilization
                                    ?? (setting.careSetting === "nursing" && config.nursingYearlyUtilization
                                      ? config.nursingYearlyUtilization
                                      : config.yearlyUtilization);
                                  const qUtil = setting.quarterlyUtilization || annualToQuarterlyUtilization(settingYearlyUtil);
                                  const pricingModel = setting.pricingModel || "perUnit";
                                  const defaultPrice = pricingModel === "annualFlat" ? (setting.annualLicenseFee || 0)
                                    : pricingModel === "perEncounter" ? (setting.costPerEncounter || 0)
                                    : setting.costPerUnit;
                                  const yPricingQ = setting.yearlyPricing || { year1: defaultPrice, year2: defaultPrice, year3: defaultPrice };
                                  const qPricing = setting.quarterlyPricing || annualToQuarterlyPricing(yPricingQ);
                                  const allQKeysAll: (keyof QuarterlyProviders)[] = ["q1","q2","q3","q4","q5","q6","q7","q8","q9","q10","q11","q12"];
                                  const allQKeys = allQKeysAll.slice(0, Math.min(contractYears, 3) * 4);
                                  const startYear = new Date().getFullYear();
                                  const qLabels = allQKeys.map((_, i) => {
                                    const yearOffset = Math.floor(i / 4);
                                    const qNum = (i % 4) + 1;
                                    return `Q${qNum}'${String(startYear + yearOffset).slice(-2)}`;
                                  });
                                  return (
                                    <div className="overflow-x-auto -mx-2 px-2">
                                      <table className="w-full text-[11px] border-collapse min-w-[700px]" data-testid={`quarterly-table-${setting.careSetting}`}>
                                        <thead>
                                          <tr>
                                            <th className="text-left text-[10px] text-[#8C7E6E] font-medium py-1 pr-2 w-[72px] sticky left-0 bg-[#F9F6F2] z-10"></th>
                                            {qLabels.map((label, i) => (
                                              <th key={i} className="text-center text-[10px] text-[#8C7E6E] font-medium py-1 px-0.5">{label}</th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          <tr>
                                            <td className="text-[10px] text-[#8C7E6E] font-medium py-1 pr-2 sticky left-0 bg-[#F9F6F2] z-10">{unitLabel}</td>
                                            {allQKeys.map((qk, i) => (
                                              <td key={qk} className="py-0.5 px-0.5">
                                                <FormattedNumberInput
                                                  value={qp[qk]}
                                                  onChange={(v) => {
                                                    const val = Math.max(v, 1);
                                                    const updated = { ...qp, [qk]: val };
                                                    const annual = quarterlyToAnnualProviders(updated);
                                                    onUpdateSetting(setting.id, {
                                                      quarterlyProviders: updated,
                                                      yearlyProviders: annual,
                                                      providerCount: annual.year1,
                                                      fullScaleProviders: annual.year3,
                                                    });
                                                  }}
                                                  className="w-full text-right text-[11px] h-7 bg-white border border-neutral-200 rounded px-1"
                                                  data-testid={`input-${qk}-prov-${setting.careSetting}`}
                                                />
                                              </td>
                                            ))}
                                          </tr>
                                          <tr>
                                            <td className="text-[10px] text-[#8C7E6E] font-medium py-1 pr-2 sticky left-0 bg-[#F9F6F2] z-10">Util %</td>
                                            {allQKeys.map((qk) => (
                                              <td key={`util-${qk}`} className="py-0.5 px-0.5">
                                                <div className="relative">
                                                  <FormattedNumberInput
                                                    value={qUtil[qk as keyof QuarterlyUtilization]}
                                                    onChange={(v) => {
                                                      const val = Math.min(Math.max(Math.round(v), 1), 100);
                                                      const updated = { ...qUtil, [qk]: val };
                                                      const annualUtil = quarterlyToAnnualUtilization(updated);
                                                      onUpdateSetting(setting.id, {
                                                        quarterlyUtilization: updated,
                                                        utilizationPercent: annualUtil.year1,
                                                      });
                                                    }}
                                                    className="w-full text-right text-[11px] h-7 bg-[#F9F7F4] border border-neutral-200 rounded px-1 pr-3.5 text-[#8C7E6E]"
                                                    data-testid={`input-${qk}-util-${setting.careSetting}`}
                                                  />
                                                  <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-[#A39888] pointer-events-none">%</span>
                                                </div>
                                              </td>
                                            ))}
                                          </tr>
                                          <tr>
                                            <td className="text-[10px] text-[#8C7E6E] font-medium py-1 pr-2 sticky left-0 bg-[#F9F6F2] z-10">$/Mo</td>
                                            {allQKeys.map((qk) => (
                                              <td key={`price-${qk}`} className="py-0.5 px-0.5">
                                                <FormattedNumberInput
                                                  value={qPricing[qk as keyof QuarterlyPricing]}
                                                  onChange={(v) => {
                                                    const val = Math.max(v, 0);
                                                    const updated = { ...qPricing, [qk]: val } as QuarterlyPricing;
                                                    const annualP = quarterlyToAnnualPricing(updated);
                                                    const legacyUpdate: Partial<typeof setting> = { quarterlyPricing: updated, yearlyPricing: annualP };
                                                    if (pricingModel === "annualFlat") legacyUpdate.annualLicenseFee = annualP.year1;
                                                    else if (pricingModel === "perEncounter") legacyUpdate.costPerEncounter = annualP.year1;
                                                    else legacyUpdate.costPerUnit = annualP.year1;
                                                    onUpdateSetting(setting.id, legacyUpdate);
                                                  }}
                                                  prefix="$"
                                                  className="w-full text-right text-[11px] h-7 bg-white border border-neutral-200 rounded px-1"
                                                  data-testid={`input-price-${qk}-${setting.careSetting}`}
                                                />
                                              </td>
                                            ))}
                                          </tr>
                                          <tr>
                                            <td className="text-[10px] text-[#A39888] font-medium py-1 pr-2 sticky left-0 bg-[#F9F6F2] z-10">Qtr Cost</td>
                                            {allQKeys.map((qk) => {
                                              const provCount = qp[qk];
                                              const price = qPricing[qk as keyof QuarterlyPricing];
                                              const util = qUtil[qk as keyof QuarterlyUtilization];
                                              const encountersPerProv = setting.encounters && setting.providerCount
                                                ? setting.encounters / setting.providerCount : 3000;
                                              const quarterBill = pricingModel === "perUnit" ? provCount * price * 3
                                                : pricingModel === "annualFlat" ? price / 4
                                                : price * provCount * encountersPerProv / 4;
                                              return (
                                                <td key={`cost-${qk}`} className="py-0.5 px-0.5">
                                                  <div className="w-full text-right text-[10px] h-7 bg-[#F5F0EB] border border-neutral-200 rounded px-1 flex items-center justify-end text-[#8C7E6E] font-medium" data-testid={`display-cost-${qk}-${setting.careSetting}`}>
                                                    {fmt(quarterBill)}
                                                  </div>
                                                </td>
                                              );
                                            })}
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  );
                                })() : (
                                <div className={`grid ${yearColsClass} gap-2 sm:gap-3`}>
                                    <div>
                                      <label className="block text-[12px] text-[#8C7E6E] mb-1">Year 1</label>
                                      <FormattedNumberInput
                                        value={yp?.year1 ?? setting.providerCount}
                                        onChange={(v) => {
                                          const val = Math.max(v, 1);
                                          const updates: Partial<typeof setting> = {
                                            yearlyProviders: {
                                              year1: val,
                                              year2: yp?.year2 ?? setting.fullScaleProviders,
                                              year3: yp?.year3 ?? setting.fullScaleProviders,
                                            },
                                            providerCount: val,
                                            quarterlyProviders: undefined,
                                          };
                                          if (isEncPricing) {
                                            const encPerProv = setting.providerCount > 0 ? setting.encounters / setting.providerCount : 0;
                                            const newEnc = Math.round(val * encPerProv);
                                            updates.yearlyEncounters = { year1: newEnc, year2: ye.year2, year3: ye.year3 };
                                            updates.encounters = newEnc;
                                          }
                                          onUpdateSetting(setting.id, updates);
                                        }}
                                        className="w-full text-right text-sm h-8 bg-white border border-neutral-200 rounded-lg px-2"
                                        data-testid={`input-y1-${setting.careSetting}`}
                                      />
                                    </div>
                                    {contractYears >= 2 && (
                                    <div>
                                      <label className="block text-[12px] text-[#8C7E6E] mb-1">Year 2</label>
                                      <FormattedNumberInput
                                        value={yp?.year2 ?? setting.fullScaleProviders}
                                        onChange={(v) => {
                                          const val = Math.max(v, 1);
                                          const updates: Partial<typeof setting> = {
                                            yearlyProviders: {
                                              year1: yp?.year1 ?? setting.providerCount,
                                              year2: val,
                                              year3: yp?.year3 ?? setting.fullScaleProviders,
                                            },
                                            quarterlyProviders: undefined,
                                          };
                                          if (isEncPricing) {
                                            const encPerProv = setting.providerCount > 0 ? setting.encounters / setting.providerCount : 0;
                                            updates.yearlyEncounters = { ...ye, year2: Math.round(val * encPerProv) };
                                          }
                                          onUpdateSetting(setting.id, updates);
                                        }}
                                        className="w-full text-right text-sm h-8 bg-white border border-neutral-200 rounded-lg px-2"
                                        data-testid={`input-y2-${setting.careSetting}`}
                                      />
                                    </div>
                                    )}
                                    {contractYears >= 3 && (
                                    <div>
                                      <label className="block text-[12px] text-[#8C7E6E] mb-1">Year 3</label>
                                      <FormattedNumberInput
                                        value={yp?.year3 ?? setting.fullScaleProviders}
                                        onChange={(v) => {
                                          const val = Math.max(v, 1);
                                          const updates: Partial<typeof setting> = {
                                            yearlyProviders: {
                                              year1: yp?.year1 ?? setting.providerCount,
                                              year2: yp?.year2 ?? setting.fullScaleProviders,
                                              year3: val,
                                            },
                                            fullScaleProviders: val,
                                            quarterlyProviders: undefined,
                                          };
                                          if (isEncPricing) {
                                            const encPerProv = setting.providerCount > 0 ? setting.encounters / setting.providerCount : 0;
                                            updates.yearlyEncounters = { ...ye, year3: Math.round(val * encPerProv) };
                                          }
                                          onUpdateSetting(setting.id, updates);
                                        }}
                                        className="w-full text-right text-sm h-8 bg-white border border-neutral-200 rounded-lg px-2"
                                        data-testid={`input-y3-${setting.careSetting}`}
                                      />
                                    </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className={`grid ${config.granularity === "quarterly" ? "grid-cols-1" : "grid-cols-2"} gap-3`}>
                                {config.granularity !== "quarterly" && !isEncPricing && (
                                <div>
                                  <label className="block text-[12px] text-[#8C7E6E] mb-1">Utilization %</label>
                                  <FormattedNumberInput
                                    value={setting.utilizationPercent}
                                    onChange={(v) => onUpdateSetting(setting.id, { utilizationPercent: Math.min(Math.max(v, 1), 100) })}
                                    className="w-full text-right text-sm h-8 bg-white border border-neutral-200 rounded-lg px-2"
                                    data-testid={`input-util-${setting.careSetting}`}
                                  />
                                </div>
                                )}
                                <div>
                                  <label className="block text-[12px] text-[#8C7E6E] mb-1">Implementation Fee</label>
                                  <FormattedNumberInput
                                    value={setting.implementationFee}
                                    onChange={(v) => onUpdateSetting(setting.id, { implementationFee: Math.max(v, 0) })}
                                    prefix="$"
                                    className="w-full text-right text-sm h-8 bg-white border border-neutral-200 rounded-lg px-2"
                                    data-testid={`input-impl-${setting.careSetting}`}
                                  />
                                </div>
                              </div>

                              {(() => {
                                const pricingModel = setting.pricingModel || "perUnit";
                                const priceLabel = pricingModel === "annualFlat" ? "Annual Fee"
                                  : pricingModel === "perEncounter" ? "$ / Encounter"
                                  : `$ / ${unitLabel.replace(/s$/, '')} / Mo`;
                                const defaultPrice = pricingModel === "annualFlat" ? (setting.annualLicenseFee || 0)
                                  : pricingModel === "perEncounter" ? (setting.costPerEncounter || 0)
                                  : setting.costPerUnit;
                                const yPricing = setting.yearlyPricing || { year1: defaultPrice, year2: defaultPrice, year3: defaultPrice };

                                const updateYearPrice = (yearKey: "year1" | "year2" | "year3", v: number) => {
                                  const val = Math.max(v, 0);
                                  const updated = { ...yPricing, [yearKey]: val };
                                  const legacyUpdate: Partial<typeof setting> = { yearlyPricing: updated, quarterlyPricing: undefined };
                                  if (pricingModel === "annualFlat") legacyUpdate.annualLicenseFee = updated.year1;
                                  else if (pricingModel === "perEncounter") legacyUpdate.costPerEncounter = updated.year1;
                                  else legacyUpdate.costPerUnit = updated.year1;
                                  onUpdateSetting(setting.id, legacyUpdate);
                                };

                                if (config.granularity === "quarterly") {
                                  return null;
                                }

                                return (
                                  <div>
                                    <p className="text-[12px] font-medium text-[#9C8E7E] uppercase tracking-[1.5px] mb-2">{priceLabel} by Year</p>
                                    <div className={`grid ${yearColsClass} gap-2 sm:gap-3`}>
                                      {(["year1", "year2", "year3"] as const).slice(0, Math.min(contractYears, 3)).map((yk, i) => (
                                        <div key={yk}>
                                          <label className="block text-[12px] text-[#8C7E6E] mb-1">Y{i + 1} ({2026 + i})</label>
                                          <FormattedNumberInput
                                            value={yPricing[yk]}
                                            onChange={(v) => updateYearPrice(yk, v)}
                                            prefix="$"
                                            className="w-full text-right text-sm h-8 bg-white border border-neutral-200 rounded-lg px-2"
                                            data-testid={`input-price-y${i + 1}-${setting.careSetting}`}
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })()}

                              {comparePricingId !== setting.id && (
                                <button
                                  onClick={() => {
                                    setComparePricingId(setting.id);
                                    const currentModel = setting.pricingModel || "perUnit";
                                    if (currentModel === "perUnit") {
                                      const encPerProv = setting.providerCount > 0 ? setting.encounters / setting.providerCount : 0;
                                      setAltPrice(encPerProv > 0 ? Math.round((setting.costPerUnit * 12) / (encPerProv * (setting.utilizationPercent / 100)) * 100) / 100 : 5);
                                    } else if (currentModel === "perEncounter") {
                                      setAltPrice(Math.round(((setting.costPerEncounter || 0) * (setting.encounters * (setting.utilizationPercent / 100))) / (setting.providerCount || 1) / 12));
                                    } else {
                                      setAltPrice(setting.costPerUnit || 200);
                                    }
                                  }}
                                  className="inline-flex items-center gap-1.5 text-xs text-[#6B5E4F] hover:text-[#4A3F35] font-medium transition-colors py-1"
                                  data-testid={`button-compare-pricing-${setting.careSetting}`}
                                >
                                  <ArrowLeftRight className="w-3 h-3" />
                                  Compare Pricing Models
                                </button>
                              )}

                              <AnimatePresence>
                                {comparePricingId === setting.id && (() => {
                                  const currentModel = setting.pricingModel || "perUnit";
                                  const altModel = currentModel === "perUnit" ? "perEncounter" : currentModel === "perEncounter" ? "perUnit" : "perUnit";
                                  const altModelLabel = altModel === "perUnit" ? `Per ${unitLabel.replace(/s$/, '')} / Month` : "Per Encounter";
                                  const currentModelLabel = currentModel === "perUnit" ? `Per ${unitLabel.replace(/s$/, '')} / Month` : currentModel === "perEncounter" ? "Per Encounter" : "Annual Flat";

                                  const yearlyEnc = computeYearlyEncounters(setting, config);
                                  const yp = setting.yearlyProviders;
                                  const y1Prov = yp?.year1 ?? setting.providerCount;
                                  const y2Prov = yp?.year2 ?? setting.fullScaleProviders;
                                  const y3Prov = yp?.year3 ?? setting.fullScaleProviders;

                                  const computeYearlyInvestmentWithPrices = (model: string, prices: { year1: number; year2: number; year3: number }) => {
                                    if (model === "perUnit") {
                                      return {
                                        year1: y1Prov * prices.year1 * 12,
                                        year2: y2Prov * prices.year2 * 12,
                                        year3: y3Prov * prices.year3 * 12,
                                      };
                                    } else if (model === "perEncounter") {
                                      return {
                                        year1: yearlyEnc.year1 * prices.year1,
                                        year2: yearlyEnc.year2 * prices.year2,
                                        year3: yearlyEnc.year3 * prices.year3,
                                      };
                                    } else {
                                      return { year1: prices.year1, year2: prices.year2, year3: prices.year3 };
                                    }
                                  };

                                  const currentDefaultPrice = currentModel === "perUnit" ? setting.costPerUnit
                                    : currentModel === "perEncounter" ? (setting.costPerEncounter || 0)
                                    : (setting.annualLicenseFee || 0);
                                  const currentYearlyPrices = setting.yearlyPricing || { year1: currentDefaultPrice, year2: currentDefaultPrice, year3: currentDefaultPrice };
                                  const currentInv = computeYearlyInvestmentWithPrices(currentModel, currentYearlyPrices);
                                  const altInv = computeYearlyInvestmentWithPrices(altModel, { year1: altPrice, year2: altPrice, year3: altPrice });
                                  const invYears = [currentInv.year1, currentInv.year2, currentInv.year3].slice(0, Math.min(contractYears, 3));
                                  const altInvYears = [altInv.year1, altInv.year2, altInv.year3].slice(0, Math.min(contractYears, 3));
                                  const currentTotal = invYears.reduce((s, v) => s + v, 0);
                                  const altTotal = altInvYears.reduce((s, v) => s + v, 0);
                                  const annualValue = setting.annualValue;
                                  const termYears = Math.min(contractYears, 3);
                                  const totalValueNY = annualValue * termYears;
                                  const currentROI = currentTotal > 0 ? ((totalValueNY - currentTotal) / currentTotal * 100) : 0;
                                  const altROI = altTotal > 0 ? ((totalValueNY - altTotal) / altTotal * 100) : 0;
                                  const currentNet = totalValueNY - currentTotal;
                                  const altNet = totalValueNY - altTotal;

                                  const fmt = (v: number) => {
                                    if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
                                    if (Math.abs(v) >= 1_000) return `$${Math.round(v / 1_000)}K`;
                                    return `$${Math.round(v)}`;
                                  };

                                  return (
                                    <motion.div
                                      key="compare-panel"
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: "auto" }}
                                      exit={{ opacity: 0, height: 0 }}
                                      className="overflow-hidden"
                                    >
                                      <div className="bg-[#FBF9F7] border border-[#E8E0D8] rounded-lg p-3 space-y-3">
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs font-semibold text-[#2C2420] tracking-wide uppercase">Compare Pricing Models</span>
                                          <button
                                            onClick={() => setComparePricingId(null)}
                                            className="text-[#8C7E6E] hover:text-[#6B5E4F]"
                                            data-testid={`button-close-compare-${setting.careSetting}`}
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                        <p className="text-[11px] text-[#8C7E6E]">Your value projections stay the same — only the investment structure changes.</p>

                                        <div className="grid grid-cols-2 gap-2">
                                          <div className="bg-white border border-[#E8E0D8] rounded-lg p-2.5 space-y-2">
                                            <div className="flex items-center gap-1.5">
                                              <div className="w-1.5 h-1.5 rounded-full bg-[#EA2C00]" />
                                              <span className="text-[11px] font-semibold text-[#2C2420]">Current: {currentModelLabel}</span>
                                            </div>
                                            <div className="text-[11px] text-[#8C7E6E] font-medium">
                                              {(() => {
                                                const yp = currentYearlyPrices;
                                                const prices = [yp.year1, yp.year2, yp.year3].slice(0, Math.min(contractYears, 3));
                                                const varied = prices.some(p => p !== prices[0]);
                                                const suffix = currentModel === "perUnit" ? "/mo" : currentModel === "perEncounter" ? "/enc" : "/yr";
                                                if (varied) return prices.map(p => `$${p}`).join(" → ") + suffix;
                                                return `$${prices[0]}${suffix}`;
                                              })()}
                                            </div>
                                            <div className="space-y-1 text-[11px]">
                                              <div className="flex justify-between"><span className="text-[#8C7E6E]">Y1 Investment</span><span className="font-medium text-[#2C2420]">{fmt(currentInv.year1)}</span></div>
                                              {contractYears >= 2 && <div className="flex justify-between"><span className="text-[#8C7E6E]">Y2 Investment</span><span className="font-medium text-[#2C2420]">{fmt(currentInv.year2)}</span></div>}
                                              {contractYears >= 3 && <div className="flex justify-between"><span className="text-[#8C7E6E]">Y3 Investment</span><span className="font-medium text-[#2C2420]">{fmt(currentInv.year3)}</span></div>}
                                              <div className="border-t border-[#E8E0D8] pt-1 mt-1">
                                                <div className="flex justify-between"><span className="text-[#8C7E6E]">{termYears}-Year Total</span><span className="font-semibold text-[#2C2420]">{fmt(currentTotal)}</span></div>
                                                <div className="flex justify-between"><span className="text-[#8C7E6E]">Net Value</span><span className="font-semibold text-[#2C2420]">{fmt(currentNet)}</span></div>
                                                <div className="flex justify-between"><span className="text-[#8C7E6E]">ROI</span><span className="font-semibold text-[#2C2420]">{currentROI.toFixed(0)}%</span></div>
                                              </div>
                                            </div>
                                          </div>

                                          <div className="bg-white border border-[#E8E0D8] rounded-lg p-2.5 space-y-2">
                                            <div className="flex items-center gap-1.5">
                                              <div className="w-1.5 h-1.5 rounded-full bg-[#6B5E4F]" />
                                              <span className="text-[11px] font-semibold text-[#2C2420]">Alternative: {altModelLabel}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                              <span className="text-[11px] text-[#8C7E6E]">$</span>
                                              <FormattedNumberInput
                                                value={altPrice}
                                                onChange={(v) => setAltPrice(Math.max(v, 0))}
                                                className="w-20 text-right text-[11px] h-6 bg-white border border-neutral-200 rounded px-1"
                                                data-testid={`input-alt-price-${setting.careSetting}`}
                                              />
                                              <span className="text-[11px] text-[#8C7E6E]">{altModel === "perUnit" ? "/mo" : "/enc"}</span>
                                            </div>
                                            <div className="space-y-1 text-[11px]">
                                              <div className="flex justify-between"><span className="text-[#8C7E6E]">Y1 Investment</span><span className="font-medium text-[#2C2420]">{fmt(altInv.year1)}</span></div>
                                              {contractYears >= 2 && <div className="flex justify-between"><span className="text-[#8C7E6E]">Y2 Investment</span><span className="font-medium text-[#2C2420]">{fmt(altInv.year2)}</span></div>}
                                              {contractYears >= 3 && <div className="flex justify-between"><span className="text-[#8C7E6E]">Y3 Investment</span><span className="font-medium text-[#2C2420]">{fmt(altInv.year3)}</span></div>}
                                              <div className="border-t border-[#E8E0D8] pt-1 mt-1">
                                                <div className="flex justify-between"><span className="text-[#8C7E6E]">{termYears}-Year Total</span><span className="font-semibold text-[#2C2420]">{fmt(altTotal)}</span></div>
                                                <div className="flex justify-between"><span className="text-[#8C7E6E]">Net Value</span><span className="font-semibold text-[#2C2420]">{fmt(altNet)}</span></div>
                                                <div className="flex justify-between"><span className="text-[#8C7E6E]">ROI</span><span className="font-semibold text-[#2C2420]">{altROI.toFixed(0)}%</span></div>
                                              </div>
                                            </div>
                                            <button
                                              onClick={() => {
                                                const uniformPricing = { year1: altPrice, year2: altPrice, year3: altPrice };
                                                if (altModel === "perUnit") {
                                                  onUpdateSetting(setting.id, { pricingModel: "perUnit", costPerUnit: altPrice, yearlyPricing: uniformPricing });
                                                } else {
                                                  onUpdateSetting(setting.id, { pricingModel: "perEncounter", costPerEncounter: altPrice, yearlyPricing: uniformPricing });
                                                }
                                                setComparePricingId(null);
                                              }}
                                              className="w-full text-center text-[11px] font-semibold text-white bg-[#EA2C00] hover:bg-[#D42800] rounded py-1.5 transition-colors"
                                              data-testid={`button-use-alt-${setting.careSetting}`}
                                            >
                                              Use {altModelLabel.split(' /')[0]}
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </motion.div>
                                  );
                                })()}
                              </AnimatePresence>

                              <div className="flex items-center justify-between pt-1">
                                <button
                                  onClick={() => onEditSetting(setting.id)}
                                  className="inline-flex items-center gap-1.5 text-xs text-[#EA2C00] hover:text-[#D42800] font-medium transition-colors"
                                  data-testid={`button-full-edit-${setting.careSetting}`}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  Full Edit (change drivers)
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="text-xs text-[#8C7E6E] hover:text-[#6B5E4F] font-medium transition-colors"
                                  data-testid={`button-done-edit-${setting.careSetting}`}
                                >
                                  Done
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {settings.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[#F5F0EB] flex items-center justify-center">
              <Layers className="w-8 h-8 text-[#A39888]" />
            </div>
            <h3 className="text-xl font-bold text-neutral-900 mb-2">Start Building Your Proforma</h3>
            <p className="text-[#8C7E6E] mb-8 max-w-md mx-auto">
              Complete the Explore flow for a care setting, then add it here to build a multi-setting financial model.
            </p>
          </motion.div>
        )}

        {availableSettings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <p className="text-sm font-medium text-[#8C7E6E] mb-3">Add a care setting</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {availableSettings.map(s => {
                const Icon = SETTING_ICONS[s] || Building2;
                return (
                  <button
                    key={s}
                    onClick={() => onAddSetting(s)}
                    className="group flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-[#DDD6CC] hover:border-[#EA2C00] hover:bg-[#EA2C00]/5 transition-all"
                    data-testid={`button-add-${s}`}
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#F5F0EB] group-hover:bg-[#EA2C00]/10 transition-colors">
                      <Icon className="w-5 h-5 text-[#A39888] group-hover:text-[#EA2C00] transition-colors" />
                    </div>
                    <span className="text-sm font-medium text-[#6B5E4F] group-hover:text-[#EA2C00] transition-colors">
                      {SETTING_LABELS[s]}
                    </span>
                    <Plus className="w-4 h-4 text-[#A39888] group-hover:text-[#EA2C00] transition-colors" />
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {settings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-8 bg-white rounded-xl border border-[#E8E2DA] shadow-sm p-5"
            data-testid="deal-config-panel"
          >
            <p className="text-[12px] font-medium text-[#9C8E7E] uppercase tracking-[1.5px] mb-4">Deal Configuration</p>
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-neutral-700">Implementation Ramp</label>
                  <span className="text-sm font-bold text-neutral-900" data-testid="text-impl-ramp-value">{config.implementationRampMonths} months</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={12}
                  step={1}
                  value={config.implementationRampMonths}
                  onChange={(e) => onConfigChange({ ...config, implementationRampMonths: parseInt(e.target.value) })}
                  className="w-full h-1.5 bg-[#E8E2DA] rounded-full appearance-none cursor-pointer accent-[#EA2C00]"
                  data-testid="input-impl-ramp"
                />
                <p className="text-[11px] text-[#A39888] mt-1.5">Period before value begins accruing. Covers training, EHR integration, and workflow adjustment.</p>
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-700 block mb-2">
                  Utilization Targets{hasNursing ? " (Clinical)" : ""}
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(["year1", "year2", "year3"] as const).map((key, idx) => (
                    <div key={key}>
                      <label className="block text-[11px] text-[#A39888] mb-1">Year {idx + 1}</label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="range"
                          min={20}
                          max={95}
                          step={5}
                          value={config.yearlyUtilization[key]}
                          onChange={(e) => onConfigChange({
                            ...config,
                            yearlyUtilization: { ...config.yearlyUtilization, [key]: parseInt(e.target.value) }
                          })}
                          className="flex-1 h-1.5 bg-[#E8E2DA] rounded-full appearance-none cursor-pointer accent-[#EA2C00]"
                          data-testid={`input-util-${key}`}
                        />
                        <span className="text-xs font-bold text-neutral-900 w-8 text-right">{config.yearlyUtilization[key]}%</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-[#A39888] mt-1.5">Target adoption rate by contract year. Affects "Actively Documenting" count and value realization.</p>
              </div>
              {hasNursing && config.nursingYearlyUtilization && (
                <div className="mt-3">
                  <label className="text-sm font-medium text-neutral-700 block mb-2">Utilization Targets (Nursing)</label>
                  <div className="grid grid-cols-3 gap-3">
                    {(["year1", "year2", "year3"] as const).map((key, idx) => (
                      <div key={key}>
                        <label className="block text-[11px] text-[#A39888] mb-1">Year {idx + 1}</label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="range"
                            min={20}
                            max={85}
                            step={5}
                            value={config.nursingYearlyUtilization[key]}
                            onChange={(e) => onConfigChange({
                              ...config,
                              nursingYearlyUtilization: { ...config.nursingYearlyUtilization!, [key]: parseInt(e.target.value) }
                            })}
                            className="flex-1 h-1.5 bg-[#E8E2DA] rounded-full appearance-none cursor-pointer accent-[#B45309]"
                            data-testid={`input-nursing-util-${key}`}
                          />
                          <span className="text-xs font-bold text-neutral-900 w-8 text-right">{config.nursingYearlyUtilization[key]}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-[#A39888] mt-1.5">Nursing-specific adoption targets (lower than clinical due to workflow differences).</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        <div className="flex items-center justify-between py-8 border-t border-[#E8E2DA]">
          <Button
            variant="outline"
            onClick={onBack}
            className="gap-2"
            data-testid="button-back-journey"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>

          <Button
            onClick={onViewProforma}
            disabled={settings.length === 0}
            className="gap-2 bg-[#EA2C00] hover:bg-[#D42800] text-white px-8 h-12 text-base font-semibold disabled:opacity-40"
            data-testid="button-view-proforma"
          >
            Build Financial Case {scenarios.length > 0 && <span className="bg-white/20 text-[12px] px-1.5 py-0.5 rounded-full">{scenarios.length} scenario{scenarios.length !== 1 ? "s" : ""}</span>} <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
