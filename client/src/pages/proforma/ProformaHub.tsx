import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Edit, ArrowRight, Building2, Stethoscope, HeartPulse, BedDouble, ChevronLeft, Layers, ChevronDown, ChevronUp, ExternalLink, TrendingUp, Clock, DollarSign, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import type { ProformaSettingSnapshot, ProformaConfig, ProformaScenario } from "./proformaTypes";
import { SETTING_COLORS, SETTING_LABELS, SETTING_UNIT_LABELS, DEFAULT_PROFORMA_CONFIG } from "./proformaTypes";
import { buildMonthlyCashFlows, calculateProformaSummary } from "@/lib/proformaCalculations";

interface ProformaHubProps {
  settings: ProformaSettingSnapshot[];
  scenarios?: ProformaScenario[];
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
      <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-[1.5px] mb-3">Deployment Timeline</p>
      <div className="relative bg-neutral-100 rounded-lg overflow-hidden" style={{ height: `${settings.length * 36 + 24}px` }}>
        <div className="absolute inset-0 flex">
          {Array.from({ length: Math.ceil(totalMonths / 12) }, (_, i) => (
            <div key={i} className="flex-1 border-r border-neutral-200/60 relative">
              <span className="absolute top-1 left-1.5 text-[9px] text-neutral-400 font-medium">Y{i + 1}</span>
            </div>
          ))}
        </div>
        {settings.map((s, idx) => {
          const startPct = ((s.goLiveMonth - 1) / totalMonths) * 100;
          const endMonth = Math.min(totalMonths, s.goLiveMonth + 11);
          const widthPct = ((endMonth - s.goLiveMonth + 1) / totalMonths) * 100;
          const fullPct = ((totalMonths - s.goLiveMonth + 1) / totalMonths) * 100;
          return (
            <div key={s.id} className="absolute left-0 right-0" style={{ top: `${idx * 36 + 20}px`, height: "28px" }}>
              <div
                className="absolute rounded-md opacity-10"
                style={{ left: `${startPct}%`, width: `${fullPct}%`, height: "100%", backgroundColor: s.color }}
              />
              <div
                className="absolute rounded-md flex items-center px-2 gap-1.5"
                style={{ left: `${startPct}%`, width: `${Math.min(widthPct, fullPct)}%`, height: "100%", backgroundColor: s.color }}
              >
                <span className="text-[10px] font-bold text-white truncate">{s.label}</span>
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
  const total = setting.docValue + setting.timeValue + setting.retentionValue;
  if (total <= 0) return null;
  const docPct = (setting.docValue / total) * 100;
  const timePct = (setting.timeValue / total) * 100;
  const retPct = (setting.retentionValue / total) * 100;
  return (
    <div className="mt-3" data-testid={`value-bar-${setting.careSetting}`}>
      <div className="flex rounded-full overflow-hidden h-2">
        {docPct > 0 && <div className="bg-[#2563EB]" style={{ width: `${docPct}%` }} title={`Doc Quality: ${Math.round(docPct)}%`} />}
        {timePct > 0 && <div className="bg-[#EA2C00]" style={{ width: `${timePct}%` }} title={`Time Savings: ${Math.round(timePct)}%`} />}
        {retPct > 0 && <div className="bg-[#059669]" style={{ width: `${retPct}%` }} title={`Retention: ${Math.round(retPct)}%`} />}
      </div>
      <div className="flex gap-3 mt-1">
        {docPct > 0 && <span className="text-[9px] text-neutral-400"><span className="inline-block w-1.5 h-1.5 rounded-full bg-[#2563EB] mr-1" />Doc {Math.round(docPct)}%</span>}
        {timePct > 0 && <span className="text-[9px] text-neutral-400"><span className="inline-block w-1.5 h-1.5 rounded-full bg-[#EA2C00] mr-1" />Time {Math.round(timePct)}%</span>}
        {retPct > 0 && <span className="text-[9px] text-neutral-400"><span className="inline-block w-1.5 h-1.5 rounded-full bg-[#059669] mr-1" />Ret {Math.round(retPct)}%</span>}
      </div>
    </div>
  );
}

export default function ProformaHub({
  settings,
  scenarios = [],
  onAddSetting,
  onEditSetting,
  onRemoveSetting,
  onUpdateSetting,
  onViewProforma,
  onBack,
}: ProformaHubProps) {
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const addedSettings = settings.map(s => s.careSetting);
  const availableSettings = ALL_SETTINGS.filter(s => !addedSettings.includes(s));

  const config: ProformaConfig = DEFAULT_PROFORMA_CONFIG;

  const summary = useMemo(() => {
    if (settings.length === 0) return null;
    const cashFlows = buildMonthlyCashFlows(settings, config);
    return calculateProformaSummary(settings, config, cashFlows);
  }, [settings, config]);

  const totalHours = settings.reduce((s, v) => s + v.totalHoursSaved, 0);
  const totalProviders = settings.reduce((s, v) => s + v.providerCount, 0);

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader onHome={onBack} />
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
            className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5 mb-6"
            data-testid="proforma-summary-bar"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-4">
              <div>
                <p className="text-xs text-neutral-500 mb-1">Annual Value at Scale</p>
                <p className="text-xl font-bold text-[#EA2C00]" data-testid="hub-annual-value">{fmt(summary.runRateValue)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-1">3-Year Total</p>
                <p className="text-xl font-bold text-neutral-900" data-testid="hub-3yr-value">{fmt(summary.threeYearValue)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-1">Total Investment</p>
                <p className="text-xl font-bold text-neutral-900" data-testid="hub-investment">{fmt(summary.threeYearInvestment)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-1">Net 3-Year Value</p>
                <p className={`text-xl font-bold ${summary.threeYearNet >= 0 ? "text-emerald-600" : "text-red-600"}`} data-testid="hub-net-value">{fmt(summary.threeYearNet)}</p>
              </div>
            </div>
            <div className="border-t border-neutral-100 pt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="flex flex-col items-center">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500 mb-1" />
                <p className="text-sm font-bold text-emerald-600" data-testid="hub-vtc">{summary.valueToCost > 0 ? `${summary.valueToCost.toFixed(1)}x` : "N/A"}</p>
                <p className="text-[10px] text-neutral-400">Value-to-Cost</p>
              </div>
              <div className="flex flex-col items-center">
                <Clock className="w-3.5 h-3.5 text-neutral-500 mb-1" />
                <p className="text-sm font-bold text-neutral-900" data-testid="hub-payback">{summary.paybackMonth ? `${summary.paybackMonth} mo` : "—"}</p>
                <p className="text-[10px] text-neutral-400">Payback</p>
              </div>
              <div className="flex flex-col items-center">
                <BarChart3 className="w-3.5 h-3.5 text-neutral-500 mb-1" />
                <p className="text-sm font-bold text-neutral-900" data-testid="hub-roi">{Math.round(summary.simpleROI * 100)}%</p>
                <p className="text-[10px] text-neutral-400">Simple ROI</p>
              </div>
              <div className="flex flex-col items-center">
                <DollarSign className="w-3.5 h-3.5 text-neutral-500 mb-1" />
                <p className="text-sm font-bold text-neutral-900" data-testid="hub-hours">{fmtNum(totalHours)}</p>
                <p className="text-[10px] text-neutral-400">Hours/Year</p>
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
              return (
                <motion.div
                  key={setting.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white rounded-xl overflow-hidden border border-neutral-200 shadow-sm"
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
                            <p className="text-sm text-neutral-500">
                              {fmtNum(setting.providerCount)} → {fmtNum(setting.fullScaleProviders)} {unitLabel} · {setting.utilizationPercent}% util
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingId(isEditing ? null : setting.id)}
                            className={`p-2 rounded-lg transition-colors ${isEditing ? 'bg-[#EA2C00]/10 text-[#EA2C00]' : 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-700'}`}
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
                                className="px-2 py-1 text-xs text-neutral-500 hover:text-neutral-700"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmRemove(setting.id)}
                              className="p-2 rounded-lg hover:bg-red-50 text-neutral-400 hover:text-red-500 transition-colors"
                              data-testid={`button-remove-${setting.careSetting}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-neutral-500 mb-1">Annual Value</p>
                          <p className="text-lg font-bold" style={{ color }}>{fmt(setting.annualValue)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-neutral-500 mb-1">Hours Returned</p>
                          <p className="text-lg font-bold text-neutral-900">{fmtNum(setting.totalHoursSaved)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-neutral-500 mb-1">Go-Live Month</p>
                          <select
                            value={setting.goLiveMonth}
                            onChange={(e) => onUpdateSetting(setting.id, { goLiveMonth: parseInt(e.target.value) })}
                            className="h-8 w-full rounded-lg border border-neutral-200 bg-white px-2 text-sm font-medium text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/30"
                            data-testid={`select-golive-${setting.careSetting}`}
                          >
                            {Array.from({ length: 36 }, (_, i) => (
                              <option key={i + 1} value={i + 1}>Month {i + 1}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <ValueCompositionBar setting={setting} />

                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {setting.drivers.slice(0, 4).map(d => (
                          <span key={d.id} className="text-[10px] bg-neutral-50 px-2 py-0.5 rounded-full text-neutral-600 border border-neutral-100">
                            {d.name}: {fmt(d.value)}
                          </span>
                        ))}
                        {setting.drivers.length > 4 && (
                          <span className="text-[10px] text-neutral-400 px-1.5 py-0.5">+{setting.drivers.length - 4} more</span>
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
                            <div className="mt-4 pt-4 border-t border-neutral-100 space-y-4">
                              <div>
                                <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-[1.5px] mb-2">{unitLabel} by Year</p>
                                <div className="grid grid-cols-3 gap-3">
                                  <div>
                                    <label className="block text-[10px] text-neutral-500 mb-1">Year 1</label>
                                    <FormattedNumberInput
                                      value={yp?.year1 ?? setting.providerCount}
                                      onChange={(v) => {
                                        const val = Math.max(v, 1);
                                        onUpdateSetting(setting.id, {
                                          yearlyProviders: {
                                            year1: val,
                                            year2: yp?.year2 ?? setting.fullScaleProviders,
                                            year3: yp?.year3 ?? setting.fullScaleProviders,
                                          },
                                          providerCount: val,
                                        });
                                      }}
                                      className="w-full text-right text-sm h-8 bg-white border border-neutral-200 rounded-lg px-2"
                                      data-testid={`input-y1-${setting.careSetting}`}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] text-neutral-500 mb-1">Year 2</label>
                                    <FormattedNumberInput
                                      value={yp?.year2 ?? setting.fullScaleProviders}
                                      onChange={(v) => {
                                        const val = Math.max(v, 1);
                                        onUpdateSetting(setting.id, {
                                          yearlyProviders: {
                                            year1: yp?.year1 ?? setting.providerCount,
                                            year2: val,
                                            year3: yp?.year3 ?? setting.fullScaleProviders,
                                          },
                                        });
                                      }}
                                      className="w-full text-right text-sm h-8 bg-white border border-neutral-200 rounded-lg px-2"
                                      data-testid={`input-y2-${setting.careSetting}`}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] text-neutral-500 mb-1">Year 3</label>
                                    <FormattedNumberInput
                                      value={yp?.year3 ?? setting.fullScaleProviders}
                                      onChange={(v) => {
                                        const val = Math.max(v, 1);
                                        onUpdateSetting(setting.id, {
                                          yearlyProviders: {
                                            year1: yp?.year1 ?? setting.providerCount,
                                            year2: yp?.year2 ?? setting.fullScaleProviders,
                                            year3: val,
                                          },
                                          fullScaleProviders: val,
                                        });
                                      }}
                                      className="w-full text-right text-sm h-8 bg-white border border-neutral-200 rounded-lg px-2"
                                      data-testid={`input-y3-${setting.careSetting}`}
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-[10px] text-neutral-500 mb-1">Utilization %</label>
                                  <FormattedNumberInput
                                    value={setting.utilizationPercent}
                                    onChange={(v) => onUpdateSetting(setting.id, { utilizationPercent: Math.min(Math.max(v, 1), 100) })}
                                    className="w-full text-right text-sm h-8 bg-white border border-neutral-200 rounded-lg px-2"
                                    data-testid={`input-util-${setting.careSetting}`}
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-neutral-500 mb-1">$ / {unitLabel.replace(/s$/, '')} / Month</label>
                                  <FormattedNumberInput
                                    value={setting.costPerUnit}
                                    onChange={(v) => onUpdateSetting(setting.id, { costPerUnit: Math.max(v, 0) })}
                                    prefix="$"
                                    className="w-full text-right text-sm h-8 bg-white border border-neutral-200 rounded-lg px-2"
                                    data-testid={`input-cost-${setting.careSetting}`}
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-neutral-500 mb-1">Implementation Fee</label>
                                  <FormattedNumberInput
                                    value={setting.implementationFee}
                                    onChange={(v) => onUpdateSetting(setting.id, { implementationFee: Math.max(v, 0) })}
                                    prefix="$"
                                    className="w-full text-right text-sm h-8 bg-white border border-neutral-200 rounded-lg px-2"
                                    data-testid={`input-impl-${setting.careSetting}`}
                                  />
                                </div>
                              </div>

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
                                  className="text-xs text-neutral-500 hover:text-neutral-700 font-medium transition-colors"
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
              <Layers className="w-8 h-8 text-neutral-400" />
            </div>
            <h3 className="text-xl font-bold text-neutral-900 mb-2">Start Building Your Proforma</h3>
            <p className="text-neutral-500 mb-8 max-w-md mx-auto">
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
            <p className="text-sm font-medium text-neutral-500 mb-3">Add a care setting</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {availableSettings.map(s => {
                const Icon = SETTING_ICONS[s] || Building2;
                return (
                  <button
                    key={s}
                    onClick={() => onAddSetting(s)}
                    className="group flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-neutral-200 hover:border-[#EA2C00] hover:bg-[#EA2C00]/5 transition-all"
                    data-testid={`button-add-${s}`}
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-neutral-50 group-hover:bg-[#EA2C00]/10 transition-colors">
                      <Icon className="w-5 h-5 text-neutral-400 group-hover:text-[#EA2C00] transition-colors" />
                    </div>
                    <span className="text-sm font-medium text-neutral-600 group-hover:text-[#EA2C00] transition-colors">
                      {SETTING_LABELS[s]}
                    </span>
                    <Plus className="w-4 h-4 text-neutral-400 group-hover:text-[#EA2C00] transition-colors" />
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        <div className="flex items-center justify-between py-8 border-t border-neutral-200">
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
            Build Financial Case {scenarios.length > 0 && <span className="bg-white/20 text-[10px] px-1.5 py-0.5 rounded-full">{scenarios.length} scenario{scenarios.length !== 1 ? "s" : ""}</span>} <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
