import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Download, Check, Building2, Stethoscope, Heart, Users, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BASELINE_FIELDS, DRIVER_FIELDS, getRequestFieldPlan, type DataRequestSetting } from "@/lib/dataRequestFields";
import { generateDataRequestExcel } from "@/lib/dataRequestExcel";
import abridgeLogo from "@assets/abridge-logo-wordmark-red_1769020684647.png";

interface Props {
  onBack: () => void;
}

const SETTINGS: { id: DataRequestSetting; label: string; description: string; icon: LucideIcon }[] = [
  { id: 'ed',         label: 'Emergency Department', description: 'ED physicians and APPs',                        icon: Building2   },
  { id: 'outpatient', label: 'Outpatient',            description: 'Clinic and ambulatory providers',               icon: Stethoscope },
  { id: 'inpatient',  label: 'Inpatient',             description: 'Hospitalists and attending physicians',         icon: Heart       },
  { id: 'nursing',    label: 'Nursing',               description: 'Registered nurses and nursing leadership',     icon: Users       },
];

const SETTING_DRIVER_IDS: Record<DataRequestSetting, string[]> = {
  outpatient: ['patientAccess', 'wrvu', 'hccCapture', 'denialPrevention', 'providerWellbeing', 'physicianLocumAgency', 'scribeCostReduction'],
  ed:         ['lwbsRecovery', 'admissionCapture', 'edEmLevel', 'denialPrevention', 'providerWellbeing', 'physicianLocumAgency', 'scribeCostReduction'],
  inpatient:  ['drgAccuracy', 'obsDefense', 'ipDischargePlanning', 'ipProviderWellbeing', 'physicianLocumAgency'],
  nursing:    ['nursingRetention', 'nursingAgency', 'nursingOvertime', 'nursingHapi', 'nursingFalls', 'nursingCauti', 'nursingClabsi', 'nursingSepsis'],
};

const QUADRANTS = ['Capacity', 'Workforce', 'Revenue', 'Quality'] as const;

export default function DataRequestBuilder({ onBack }: Props) {
  const [step, setStep]                     = useState<1 | 2>(1);
  const [setting, setSetting]               = useState<DataRequestSetting | null>(null);
  const [selectedIds, setSelectedIds]       = useState<string[]>([]);
  const [downloaded, setDownloaded]         = useState(false);

  function handleSelectSetting(s: DataRequestSetting) {
    setSetting(s);
    setSelectedIds([]);
    setDownloaded(false);
    setStep(2);
  }

  function toggleDriver(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  }

  function handleDownload() {
    if (!setting) return;
    generateDataRequestExcel(setting, selectedIds);
    setDownloaded(true);
  }

  const availableDrivers = setting
    ? SETTING_DRIVER_IDS[setting].map(id => DRIVER_FIELDS.find(g => g.driverId === id)).filter(Boolean) as typeof DRIVER_FIELDS
    : [];

  const baselineFields      = setting ? BASELINE_FIELDS[setting] : [];
  const selectedGroups      = availableDrivers.filter(d => selectedIds.includes(d.driverId));
  const totalDriverFields   = selectedGroups.reduce((n, g) => n + g.fields.length, 0);
  const fieldPlan           = setting
    ? getRequestFieldPlan(setting, selectedIds)
    : { requiredCount: 0, optionalCount: 0, required: [], optionalBaseline: [], driverGroups: [] };
  const settingLabel        = SETTINGS.find(s => s.id === setting)?.label ?? '';

  return (
    <div className="min-h-screen bg-[#FAFAF8]">

      {/* ── Header ── */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-sm border-b border-[#EDEBE6]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button
            onClick={step === 2 ? () => setStep(1) : onBack}
            className="flex items-center gap-1.5 text-[#888888] text-sm hover:text-[#1A1A1A] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {step === 2 ? 'Change setting' : 'Back'}
          </button>
          <img src={abridgeLogo} alt="Abridge" className="h-5" />
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-[#888888] text-sm hover:text-[#1A1A1A] transition-colors"
            data-testid="btn-exit-data-request"
          >
            Exit <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="pt-14">
        <AnimatePresence mode="wait">

          {/* ── Step 1: Setting Selection ── */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.22 }}
              className="max-w-[680px] mx-auto px-4 sm:px-6 py-16"
            >
              <div className="text-center mb-12">
                <p className="text-[10px] font-bold uppercase tracking-[3px] text-[#EA2C00] mb-4">
                  Data Request Builder
                </p>
                <h1 className="text-[32px] font-bold tracking-tight text-[#1A1A1A] leading-tight mb-3">
                  Who are you modeling for?
                </h1>
                <p className="text-[15px] text-[#888888] leading-relaxed max-w-md mx-auto">
                  Select a care setting. You'll choose which value drivers to include — we'll generate a clean Excel with only the data you actually need.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {SETTINGS.map((s, i) => {
                  const Icon = s.icon;
                  const driverCount = SETTING_DRIVER_IDS[s.id].length;
                  return (
                    <motion.button
                      key={s.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      onClick={() => handleSelectSetting(s.id)}
                      className="group text-left bg-white border border-[#E5E5E5] rounded-2xl p-6 hover:border-[#1A1A1A] hover:shadow-md transition-all duration-200"
                    >
                      <div className="w-11 h-11 rounded-xl bg-[#FEF2EE] flex items-center justify-center mb-5 group-hover:bg-[#EA2C00]/10 transition-colors">
                        <Icon className="w-5 h-5 text-[#EA2C00]" />
                      </div>
                      <p className="font-bold text-[#1A1A1A] text-base mb-1">{s.label}</p>
                      <p className="text-sm text-[#888888] mb-4">{s.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#AAAAAA]">
                          {driverCount} drivers available
                        </span>
                        <ArrowRight className="w-4 h-4 text-[#CCCCCC] group-hover:text-[#1A1A1A] group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ── Step 2: Driver Selection + Right Panel ── */}
          {step === 2 && setting && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.22 }}
              className="max-w-[1200px] mx-auto px-4 sm:px-6 py-10"
            >
              <div className="flex flex-col lg:flex-row gap-10 items-start">

                {/* Left: Driver Selection */}
                <div className="flex-1 min-w-0">
                  <div className="mb-8">
                    <p className="text-[10px] font-bold uppercase tracking-[2.5px] text-[#888888] mb-3">
                      {settingLabel}
                    </p>
                    <h1 className="text-[28px] font-bold tracking-tight text-[#1A1A1A] mb-2">
                      Which areas are you modeling?
                    </h1>
                    <p className="text-[14px] text-[#888888]">
                      Select the value drivers relevant to this prospect. Only drivers with quantifiable dollar impact are shown.
                    </p>
                  </div>

                  <div className="space-y-8">
                    {QUADRANTS.map(q => {
                      const qDrivers = availableDrivers.filter(d => d.quadrant === q);
                      if (qDrivers.length === 0) return null;
                      return (
                        <motion.div
                          key={q}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.05 }}
                        >
                          <p className="text-[10px] font-bold uppercase tracking-[2.5px] text-[#AAAAAA] mb-3">{q}</p>
                          <div className="space-y-2">
                            {qDrivers.map(driver => {
                              const selected = selectedIds.includes(driver.driverId);
                              return (
                                <button
                                  key={driver.driverId}
                                  onClick={() => toggleDriver(driver.driverId)}
                                  className={`w-full text-left flex items-start gap-4 rounded-xl px-5 py-4 border transition-all duration-150 ${
                                    selected
                                      ? 'border-[#1A1A1A] bg-white shadow-sm'
                                      : 'border-[#E8E4DF] bg-white hover:border-[#CCCCCC]'
                                  }`}
                                >
                                  <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-colors ${
                                    selected ? 'bg-[#1A1A1A] border-[#1A1A1A]' : 'border-[#CCCCCC]'
                                  }`}>
                                    {selected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-semibold leading-snug ${selected ? 'text-[#1A1A1A]' : 'text-[#333333]'}`}>
                                      {driver.driverLabel}
                                    </p>
                                    <p className="text-xs text-[#888888] mt-0.5 leading-snug">
                                      {driver.fields.map(f => f.label).join(' · ')}
                                    </p>
                                  </div>
                                  <span className={`shrink-0 text-[9px] font-bold uppercase tracking-[1px] rounded-full px-2.5 py-1 mt-0.5 ${
                                    selected ? 'bg-[#1A1A1A] text-white' : 'bg-[#F5F0EB] text-[#888888]'
                                  }`}>
                                    {driver.fields.length} {driver.fields.length === 1 ? 'field' : 'fields'}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Live Preview Panel */}
                <motion.div
                  className="w-full lg:w-[320px] shrink-0 lg:sticky lg:top-24"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <div className="bg-[#1A1A1A] rounded-2xl p-6">
                    <p className="text-[10px] font-bold uppercase tracking-[2px] text-white/50 mb-1">Your Data Request</p>
                    <div className="inline-flex items-center gap-1.5 bg-white/10 rounded-full px-2.5 py-1 mb-5">
                      <span className="text-[11px] font-medium text-white/80">{settingLabel}</span>
                    </div>

                    {/* Baseline — always included */}
                    <div className="mb-4">
                      <p className="text-[9px] font-bold uppercase tracking-[1.5px] text-white/30 mb-2">Baseline — always included</p>
                      <ul className="space-y-1">
                        {baselineFields.map(f => (
                          <li key={f.id} className="flex items-center gap-2">
                            <span className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
                            <span className="text-[12px] text-white/60">{f.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Selected drivers */}
                    <AnimatePresence>
                      {selectedGroups.map(group => (
                        <motion.div
                          key={group.driverId}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.18 }}
                          className="mb-4 overflow-hidden"
                        >
                          <p className="text-[9px] font-bold uppercase tracking-[1.5px] text-white/30 mb-2">{group.driverLabel}</p>
                          <ul className="space-y-1">
                            {group.fields.map(f => (
                              <li key={f.id} className="flex items-center gap-2">
                                <span className="w-1 h-1 rounded-full bg-[#EA2C00]/60 shrink-0" />
                                <span className="text-[12px] text-white/70">{f.label}</span>
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {selectedIds.length === 0 && (
                      <p className="text-[12px] text-white/30 italic mb-4">Select drivers to see what will be included.</p>
                    )}

                    <div className="border-t border-white/10 pt-4 mt-2 mb-5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-white/40">The ask</span>
                        <span className="text-[13px] font-bold text-white">
                          <span className="text-[#EA2C00]">{fieldPlan.requiredCount} required</span>
                          <span className="text-white/40"> · {fieldPlan.optionalCount} optional</span>
                        </span>
                      </div>
                      <p className="text-[10px] text-white/30 mt-1">
                        Only the required numbers must be filled. Optional fields use an industry benchmark if left blank.
                      </p>
                    </div>

                    {downloaded ? (
                      <div className="bg-white/10 rounded-xl p-4 mb-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Check className="w-4 h-4 text-white" />
                          <p className="text-[13px] font-semibold text-white">Downloaded</p>
                        </div>
                        <p className="text-[11px] text-white/50 mb-3">Share with your prospect to collect their numbers.</p>
                        <button
                          onClick={() => { setSetting(null); setSelectedIds([]); setDownloaded(false); setStep(1); }}
                          className="text-[11px] text-[#EA2C00] hover:text-[#EA2C00]/80 font-medium transition-colors"
                        >
                          Start over →
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleDownload}
                        disabled={selectedIds.length === 0}
                        className="w-full flex items-center justify-center gap-2 bg-white text-[#1A1A1A] rounded-xl py-3 text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/90 transition-all"
                      >
                        <Download className="w-4 h-4" />
                        Download Excel
                      </button>
                    )}
                  </div>
                </motion.div>

              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
