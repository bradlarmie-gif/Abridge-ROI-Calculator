import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Download, Check, Building2, Stethoscope, Heart, Users, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BASELINE_FIELDS, getDriverFieldGroups, getMultiRequestFieldPlan, type DataRequestSetting } from "@/lib/dataRequestFields";
import { generateMultiDataRequestExcel } from "@/lib/dataRequestExcel";
import abridgeLogo from "@assets/abridge-logo-wordmark-red_1769020684647.png";

interface Props {
  onBack: () => void;
}

const SETTINGS: { id: DataRequestSetting; label: string; description: string; icon: LucideIcon }[] = [
  { id: 'ed',         label: 'Emergency Department', description: 'ED physicians and APPs',                    icon: Building2   },
  { id: 'outpatient', label: 'Outpatient',           description: 'Clinic and ambulatory providers',           icon: Stethoscope },
  { id: 'inpatient',  label: 'Inpatient',            description: 'Hospitalists and attending physicians',     icon: Heart       },
  { id: 'nursing',    label: 'Nursing',              description: 'Registered nurses and nursing leadership',  icon: Users       },
];

const SETTING_DRIVER_IDS: Record<DataRequestSetting, string[]> = {
  outpatient: ['patientAccess', 'wrvu', 'hccCapture', 'denialPrevention', 'providerWellbeing', 'physicianLocumAgency', 'scribeCostReduction'],
  ed:         ['lwbsRecovery', 'admissionCapture', 'edEmLevel', 'denialPrevention', 'providerWellbeing', 'physicianLocumAgency', 'scribeCostReduction'],
  inpatient:  ['drgAccuracy', 'obsDefense', 'ipDischargePlanning', 'ipProviderWellbeing', 'physicianLocumAgency'],
  nursing:    ['nursingRetention', 'nursingAgency', 'nursingOvertime', 'nursingHapi', 'nursingFalls', 'nursingCauti', 'nursingClabsi', 'nursingSepsis'],
};

const QUADRANTS = ['Capacity', 'Workforce', 'Revenue', 'Quality'] as const;

const EMPTY_SELECTION: Record<DataRequestSetting, string[]> = {
  outpatient: [], ed: [], inpatient: [], nursing: [],
};

export default function DataRequestBuilder({ onBack }: Props) {
  const [step, setStep]                       = useState<1 | 2>(1);
  const [settings, setSettings]               = useState<DataRequestSetting[]>([]);
  const [selectedBySetting, setSelectedBySetting] = useState<Record<DataRequestSetting, string[]>>(EMPTY_SELECTION);
  const [downloaded, setDownloaded]           = useState(false);

  // Canonical display order, filtered to what's selected.
  const orderedSettings = SETTINGS.filter(s => settings.includes(s.id)).map(s => s.id);

  function toggleSetting(id: DataRequestSetting) {
    setDownloaded(false);
    setSettings(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function toggleDriver(setting: DataRequestSetting, id: string) {
    setDownloaded(false);
    setSelectedBySetting(prev => {
      const cur = prev[setting];
      return { ...prev, [setting]: cur.includes(id) ? cur.filter(d => d !== id) : [...cur, id] };
    });
  }

  function handleContinue() {
    if (settings.length === 0) return;
    setStep(2);
  }

  function handleDownload() {
    if (orderedSettings.length === 0) return;
    generateMultiDataRequestExcel(orderedSettings, selectedBySetting);
    setDownloaded(true);
  }

  function startOver() {
    setSettings([]);
    setSelectedBySetting(EMPTY_SELECTION);
    setDownloaded(false);
    setStep(1);
  }

  // Deduped against the practice profile, so nothing is asked twice and the
  // card badges, right panel, and generated Excel all agree.
  const driversForSetting = (setting: DataRequestSetting) =>
    getDriverFieldGroups(setting, SETTING_DRIVER_IDS[setting]);

  const settingLabel = (id: DataRequestSetting) => SETTINGS.find(s => s.id === id)?.label ?? '';

  const totalSelectedDrivers = orderedSettings.reduce((n, s) => n + selectedBySetting[s].length, 0);
  const multiPlan = getMultiRequestFieldPlan(orderedSettings, selectedBySetting);

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
            {step === 2 ? 'Change settings' : 'Back'}
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

          {/* ── Step 1: Setting Selection (multi-select) ── */}
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
                  Pick every care setting in scope. You'll choose the value drivers for each, and we'll generate one clean Excel with a tab per setting.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {SETTINGS.map((s, i) => {
                  const Icon = s.icon;
                  const driverCount = SETTING_DRIVER_IDS[s.id].length;
                  const selected = settings.includes(s.id);
                  return (
                    <motion.button
                      key={s.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      onClick={() => toggleSetting(s.id)}
                      aria-pressed={selected}
                      data-testid={`ds-setting-${s.id}`}
                      className={`group text-left bg-white border rounded-2xl p-6 transition-all duration-200 ${
                        selected
                          ? 'border-[#1A1A1A] shadow-md'
                          : 'border-[#E5E5E5] hover:border-[#1A1A1A] hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-5">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
                          selected ? 'bg-[#EA2C00]/10' : 'bg-[#FEF2EE] group-hover:bg-[#EA2C00]/10'
                        }`}>
                          <Icon className="w-5 h-5 text-[#EA2C00]" />
                        </div>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                          selected ? 'bg-[#1A1A1A] border-[#1A1A1A]' : 'border-[#D5D5D5]'
                        }`}>
                          {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                        </div>
                      </div>
                      <p className="font-bold text-[#1A1A1A] text-base mb-1">{s.label}</p>
                      <p className="text-sm text-[#888888] mb-4">{s.description}</p>
                      <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#AAAAAA]">
                        {driverCount} drivers available
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              <div className="mt-10 flex flex-col items-center">
                <button
                  onClick={handleContinue}
                  disabled={settings.length === 0}
                  data-testid="ds-continue"
                  className="inline-flex items-center gap-2 bg-[#1A1A1A] text-white rounded-xl px-7 py-3 text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black transition-all"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
                <p className="text-[12px] text-[#888888] mt-3 h-4">
                  {settings.length > 0
                    ? `${settings.length} ${settings.length === 1 ? 'care setting' : 'care settings'} selected`
                    : ''}
                </p>
              </div>
            </motion.div>
          )}

          {/* ── Step 2: Driver Selection (grouped by setting) + Right Panel ── */}
          {step === 2 && orderedSettings.length > 0 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.22 }}
              className="max-w-[1200px] mx-auto px-4 sm:px-6 py-10"
            >
              <div className="flex flex-col lg:flex-row gap-10 items-start">

                {/* Left: Driver Selection, grouped by setting */}
                <div className="flex-1 min-w-0">
                  <div className="mb-8">
                    <p className="text-[10px] font-bold uppercase tracking-[2.5px] text-[#888888] mb-3">
                      {orderedSettings.length} {orderedSettings.length === 1 ? 'care setting' : 'care settings'}
                    </p>
                    <h1 className="text-[28px] font-bold tracking-tight text-[#1A1A1A] mb-2">
                      Which areas are you modeling?
                    </h1>
                    <p className="text-[14px] text-[#888888]">
                      Select the value drivers relevant to this prospect, per setting. Only drivers with quantifiable dollar impact are shown.
                    </p>
                  </div>

                  <div className="space-y-12">
                    {orderedSettings.map(setting => {
                      const settingDrivers = driversForSetting(setting);
                      return (
                        <div key={setting} data-testid={`ds-setting-section-${setting}`}>
                          <p className="text-[11px] font-bold uppercase tracking-[2.5px] text-[#1A1A1A] mb-5 pb-2 border-b border-[#EDEBE6]">
                            {settingLabel(setting)}
                          </p>
                          <div className="space-y-8">
                            {QUADRANTS.map(q => {
                              const qDrivers = settingDrivers.filter(d => d.quadrant === q);
                              if (qDrivers.length === 0) return null;
                              return (
                                <div key={q}>
                                  <p className="text-[10px] font-bold uppercase tracking-[2.5px] text-[#AAAAAA] mb-3">{q}</p>
                                  <div className="space-y-2">
                                    {qDrivers.map(driver => {
                                      const selected = selectedBySetting[setting].includes(driver.driverId);
                                      return (
                                        <button
                                          key={driver.driverId}
                                          onClick={() => toggleDriver(setting, driver.driverId)}
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
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Live Preview Panel (aggregated across settings) */}
                <motion.div
                  className="w-full lg:w-[320px] shrink-0 lg:sticky lg:top-24"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <div className="bg-[#1A1A1A] rounded-2xl p-6">
                    <p className="text-[10px] font-bold uppercase tracking-[2px] text-white/50 mb-3">Your Data Request</p>
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {orderedSettings.map(s => (
                        <span key={s} className="inline-flex items-center bg-white/10 rounded-full px-2.5 py-1 text-[11px] font-medium text-white/80">
                          {settingLabel(s)}
                        </span>
                      ))}
                    </div>

                    {orderedSettings.map(setting => {
                      const baseline = BASELINE_FIELDS[setting];
                      const groups = driversForSetting(setting).filter(d => selectedBySetting[setting].includes(d.driverId));
                      return (
                        <div key={setting} className="mb-5">
                          <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-white/50 mb-2">{settingLabel(setting)}</p>

                          <div className="mb-3">
                            <p className="text-[9px] font-bold uppercase tracking-[1.5px] text-white/25 mb-1.5">Baseline · always included</p>
                            <ul className="space-y-1">
                              {baseline.map(f => (
                                <li key={f.id} className="flex items-center gap-2">
                                  <span className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
                                  <span className="text-[12px] text-white/60">{f.label}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <AnimatePresence initial={false}>
                            {groups.map(group => (
                              <motion.div
                                key={group.driverId}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.18 }}
                                className="mb-3 overflow-hidden"
                              >
                                <p className="text-[9px] font-bold uppercase tracking-[1.5px] text-white/25 mb-1.5">{group.driverLabel}</p>
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
                        </div>
                      );
                    })}

                    {totalSelectedDrivers === 0 && (
                      <p className="text-[12px] text-white/30 italic mb-4">Select drivers to add them to the request.</p>
                    )}

                    <div className="border-t border-white/10 pt-4 mt-2 mb-5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-white/40">The ask</span>
                        <span className="text-[13px] font-bold text-white">
                          <span className="text-[#EA2C00]">{multiPlan.requiredCount} required</span>
                          <span className="text-white/40"> · {multiPlan.optionalCount} optional</span>
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
                        <p className="text-[11px] text-white/50 mb-3">Share this link to collect the numbers.</p>
                        <button
                          onClick={startOver}
                          className="text-[11px] text-[#EA2C00] hover:text-[#EA2C00]/80 font-medium transition-colors"
                        >
                          Start over →
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleDownload}
                        disabled={totalSelectedDrivers === 0}
                        data-testid="ds-download"
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
