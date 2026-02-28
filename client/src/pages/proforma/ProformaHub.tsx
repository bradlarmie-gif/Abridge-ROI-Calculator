import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Edit, ArrowRight, Building2, Stethoscope, HeartPulse, BedDouble, ChevronLeft, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import type { ProformaSettingSnapshot } from "./proformaTypes";
import { SETTING_COLORS, SETTING_LABELS, SETTING_UNIT_LABELS } from "./proformaTypes";

interface ProformaHubProps {
  settings: ProformaSettingSnapshot[];
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

function formatCurrency(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000).toLocaleString()}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

function formatNumber(n: number) {
  return n.toLocaleString();
}

export default function ProformaHub({
  settings,
  onAddSetting,
  onEditSetting,
  onRemoveSetting,
  onUpdateSetting,
  onViewProforma,
  onBack,
}: ProformaHubProps) {
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const addedSettings = settings.map(s => s.careSetting);
  const availableSettings = ALL_SETTINGS.filter(s => !addedSettings.includes(s));

  const totalValue = settings.reduce((s, v) => s + v.annualValue, 0);
  const totalProviders = settings.reduce((s, v) => s + v.providerCount, 0);
  const totalHours = settings.reduce((s, v) => s + v.totalHoursSaved, 0);

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader onHome={onBack} />
      <UnifiedHeaderSpacer />

      <div className="bg-[#1A1A1A] text-white py-16 px-4">
        <div className="max-w-[900px] mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-6">
            <Layers className="w-4 h-4" />
            <span className="text-xs font-medium tracking-wide">ORGANIZATION PROFORMA</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Build Your System-Wide Business Case</h1>
          <p className="text-lg text-white/60 max-w-xl mx-auto">
            Layer care settings to see the combined financial impact across your organization.
          </p>
        </div>
      </div>

      <div className="max-w-[900px] mx-auto px-4 sm:px-6 -mt-8">
        {settings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5 mb-8 grid grid-cols-3 gap-4 text-center"
            data-testid="proforma-summary-bar"
          >
            <div>
              <p className="text-2xl font-bold text-[#EA2C00]">{formatCurrency(totalValue)}</p>
              <p className="text-xs text-neutral-500 mt-1">Combined Annual Value</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">{formatNumber(totalProviders)}</p>
              <p className="text-xs text-neutral-500 mt-1">Total Providers/Beds</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">{formatNumber(totalHours)}</p>
              <p className="text-xs text-neutral-500 mt-1">Hours Returned/Year</p>
            </div>
          </motion.div>
        )}

        <div className="space-y-4 mb-8">
          <AnimatePresence mode="popLayout">
            {settings.map((setting, idx) => {
              const Icon = SETTING_ICONS[setting.careSetting] || Building2;
              const color = SETTING_COLORS[setting.careSetting];
              return (
                <motion.div
                  key={setting.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-[#F9F6F2] rounded-xl overflow-hidden"
                  data-testid={`proforma-setting-card-${setting.careSetting}`}
                >
                  <div className="flex">
                    <div className="w-1.5 flex-shrink-0" style={{ backgroundColor: color }} />
                    <div className="flex-1 p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
                            <Icon className="w-5 h-5" style={{ color }} />
                          </div>
                          <div>
                            <h3 className="font-bold text-neutral-900">{setting.label}</h3>
                            <p className="text-sm text-neutral-500">
                              {formatNumber(setting.providerCount)} → {formatNumber(setting.fullScaleProviders)} {SETTING_UNIT_LABELS[setting.careSetting]} · {setting.utilizationPercent}% utilization
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onEditSetting(setting.id)}
                            className="p-2 rounded-lg hover:bg-neutral-200/60 text-neutral-500 hover:text-neutral-700 transition-colors"
                            data-testid={`button-edit-${setting.careSetting}`}
                          >
                            <Edit className="w-4 h-4" />
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

                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-neutral-500 mb-1">Annual Value</p>
                          <p className="text-lg font-bold" style={{ color }}>{formatCurrency(setting.annualValue)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-neutral-500 mb-1">Hours Returned</p>
                          <p className="text-lg font-bold text-neutral-900">{formatNumber(setting.totalHoursSaved)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-neutral-500 mb-1">Go-Live Month</p>
                          <select
                            value={setting.goLiveMonth}
                            onChange={(e) => onUpdateSetting(setting.id, { goLiveMonth: parseInt(e.target.value) })}
                            className="h-8 w-full rounded-lg border border-neutral-300 bg-white px-2 text-sm font-medium text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/30"
                            data-testid={`select-golive-${setting.careSetting}`}
                          >
                            {Array.from({ length: 36 }, (_, i) => (
                              <option key={i + 1} value={i + 1}>Month {i + 1}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {setting.drivers.slice(0, 4).map(d => (
                          <span key={d.id} className="text-xs bg-white px-2.5 py-1 rounded-full text-neutral-600 border border-neutral-200">
                            {d.name}: {formatCurrency(d.value)}
                          </span>
                        ))}
                        {setting.drivers.length > 4 && (
                          <span className="text-xs text-neutral-400 px-2 py-1">+{setting.drivers.length - 4} more</span>
                        )}
                      </div>
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
                const color = SETTING_COLORS[s];
                return (
                  <button
                    key={s}
                    onClick={() => onAddSetting(s)}
                    className="group flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-neutral-300 hover:border-[#EA2C00] hover:bg-[#EA2C00]/5 transition-all"
                    data-testid={`button-add-${s}`}
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-neutral-100 group-hover:bg-[#EA2C00]/10 transition-colors">
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
            View Proforma <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
