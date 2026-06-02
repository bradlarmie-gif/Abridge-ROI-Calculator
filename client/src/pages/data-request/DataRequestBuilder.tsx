import { useState } from "react";
import { ArrowLeft, FileSpreadsheet, CheckSquare, Square, Download, Check } from "lucide-react";
import { BASELINE_FIELDS, DRIVER_FIELDS, type DataRequestSetting } from "@/lib/dataRequestFields";
import { generateDataRequestExcel } from "@/lib/dataRequestExcel";

interface Props {
  onBack: () => void;
}

const SETTINGS: { id: DataRequestSetting; label: string; description: string }[] = [
  { id: 'ed', label: 'Emergency Department', description: 'ED physicians and APPs' },
  { id: 'outpatient', label: 'Outpatient', description: 'Clinic and ambulatory providers' },
  { id: 'inpatient', label: 'Inpatient', description: 'Hospitalists and attending physicians' },
  { id: 'nursing', label: 'Nursing', description: 'Registered nurses and nursing leadership' },
];

const SETTING_DRIVER_IDS: Record<DataRequestSetting, string[]> = {
  outpatient: ['patientAccess', 'wrvu', 'hccCapture', 'denialPrevention', 'providerWellbeing', 'physicianLocumAgency', 'scribeCostReduction'],
  ed: ['lwbsRecovery', 'admissionCapture', 'edEmLevel', 'denialPrevention', 'providerWellbeing', 'physicianLocumAgency', 'scribeCostReduction'],
  inpatient: ['drgAccuracy', 'obsDefense', 'ipDischargePlanning', 'ipProviderWellbeing', 'physicianLocumAgency'],
  nursing: ['nursingRetention', 'nursingAgency', 'nursingOvertime', 'nursingHapi', 'nursingFalls', 'nursingCauti', 'nursingClabsi', 'nursingSepsis'],
};

export default function DataRequestBuilder({ onBack }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [setting, setSetting] = useState<DataRequestSetting | null>(null);
  const [selectedDriverIds, setSelectedDriverIds] = useState<string[]>([]);
  const [downloaded, setDownloaded] = useState(false);

  function handleSelectSetting(s: DataRequestSetting) {
    setSetting(s);
    setSelectedDriverIds([]);
    setDownloaded(false);
    setStep(2);
  }

  function toggleDriver(id: string) {
    setSelectedDriverIds(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id],
    );
  }

  function handleDownload() {
    if (!setting) return;
    generateDataRequestExcel(setting, selectedDriverIds);
    setDownloaded(true);
  }

  const availableDriverIds = setting ? SETTING_DRIVER_IDS[setting] : [];
  const availableDrivers = availableDriverIds.map(id =>
    DRIVER_FIELDS.find(g => g.driverId === id),
  ).filter(Boolean) as typeof DRIVER_FIELDS;

  const quadrants = ['Capacity', 'Workforce', 'Revenue', 'Quality'] as const;

  const baselineFields = setting ? BASELINE_FIELDS[setting] : [];
  const selectedDriverGroups = setting
    ? availableDrivers.filter(d => selectedDriverIds.includes(d.driverId))
    : [];
  const totalDriverFields = selectedDriverGroups.reduce((sum, g) => sum + g.fields.length, 0);
  const totalFields = baselineFields.length + totalDriverFields;

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <div className="max-w-3xl mx-auto px-4 py-8">

        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[#888888] text-sm mb-8 hover:text-[#1A1A1A] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {step === 1 && (
          <div>
            <div className="mb-8">
              <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#888888] mb-2">Data Request Builder</p>
              <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">Build a Data Request</h1>
              <p className="text-sm text-[#666666]">Select the care setting you're modeling for.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SETTINGS.map(s => (
                <button
                  key={s.id}
                  onClick={() => handleSelectSetting(s.id)}
                  className="text-left bg-white border border-[#E5E5E5] rounded-xl p-6 shadow-sm hover:border-[#1A1A1A] hover:shadow-md transition-all"
                >
                  <div className="w-10 h-10 rounded-full bg-[#F5F0EB] flex items-center justify-center mb-4">
                    <FileSpreadsheet className="w-5 h-5 text-[#EA2C00]" />
                  </div>
                  <p className="font-bold text-[#1A1A1A] mb-1">{s.label}</p>
                  <p className="text-sm text-[#888888]">{s.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && setting && (
          <div>
            <div className="mb-8">
              <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#888888] mb-2">
                Step 2 of 3 — {SETTINGS.find(s => s.id === setting)?.label}
              </p>
              <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">Which areas are you modeling?</h1>
              <p className="text-sm text-[#666666]">Select the value drivers relevant to this prospect. Only drivers with quantified financial impact are shown.</p>
            </div>

            <div className="space-y-8 mb-8">
              {quadrants.map(q => {
                const qDrivers = availableDrivers.filter(d => d.quadrant === q);
                if (qDrivers.length === 0) return null;
                return (
                  <div key={q}>
                    <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#888888] mb-3">{q}</p>
                    <div className="space-y-2">
                      {qDrivers.map(driver => {
                        const selected = selectedDriverIds.includes(driver.driverId);
                        return (
                          <button
                            key={driver.driverId}
                            onClick={() => toggleDriver(driver.driverId)}
                            className={`w-full text-left flex items-center gap-4 bg-white rounded-xl px-4 py-4 border transition-all ${
                              selected
                                ? 'border-[#1A1A1A] shadow-sm'
                                : 'border-[#E5E5E5] hover:border-[#CCCCCC]'
                            }`}
                          >
                            <div className="shrink-0 text-[#1A1A1A]">
                              {selected
                                ? <CheckSquare className="w-5 h-5" />
                                : <Square className="w-5 h-5 text-[#CCCCCC]" />
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-[#1A1A1A] text-sm">{driver.driverLabel}</p>
                            </div>
                            <span className="shrink-0 text-[10px] font-bold uppercase tracking-[1px] text-[#888888] bg-[#F5F0EB] rounded-full px-2 py-0.5">
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

            <div className="sticky bottom-0 bg-[#FAFAF8] pt-4 pb-2 border-t border-[#E5E5E5]">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-[#888888]">
                  <span className="font-semibold text-[#1A1A1A]">{selectedDriverIds.length}</span> drivers selected
                  {' · '}
                  <span className="font-semibold text-[#1A1A1A]">{totalFields}</span> data points
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="border border-[#E5E5E5] text-[#666666] rounded-full px-5 py-2.5 text-sm hover:border-[#CCCCCC] transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    disabled={selectedDriverIds.length === 0}
                    className="bg-[#1A1A1A] text-white rounded-full px-5 py-2.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#333333] transition-colors"
                  >
                    Preview &amp; Download
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && setting && (
          <div>
            <div className="mb-8">
              <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#888888] mb-2">
                Step 3 of 3
              </p>
              <h1 className="text-2xl font-bold text-[#1A1A1A] mb-1">Your Data Request</h1>
              <p className="text-sm text-[#888888]">{SETTINGS.find(s => s.id === setting)?.label}</p>
            </div>

            <div className="bg-white border border-[#E5E5E5] rounded-xl shadow-sm p-6 mb-6">
              <div className="mb-5">
                <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#888888] mb-3">
                  Baseline — Always included
                </p>
                <ul className="space-y-1">
                  {baselineFields.map(f => (
                    <li key={f.id} className="text-sm text-[#444444] flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-[#CCCCCC] shrink-0" />
                      {f.label}
                    </li>
                  ))}
                </ul>
              </div>

              {selectedDriverGroups.map(group => (
                <div key={group.driverId} className="mb-5">
                  <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#888888] mb-3">
                    {group.driverLabel}
                  </p>
                  <ul className="space-y-1">
                    {group.fields.map(f => (
                      <li key={f.id} className="text-sm text-[#444444] flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-[#CCCCCC] shrink-0" />
                        {f.label}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              <div className="border-t border-[#E5E5E5] pt-4 mt-2">
                <p className="text-xs text-[#888888]">
                  <span className="font-semibold text-[#1A1A1A]">{baselineFields.length}</span> baseline fields
                  {' · '}
                  <span className="font-semibold text-[#1A1A1A]">{totalDriverFields}</span> driver fields
                  {' · '}
                  <span className="font-semibold text-[#1A1A1A]">{totalFields}</span> total
                </p>
              </div>
            </div>

            {downloaded ? (
              <div className="bg-[#F5F0EB] rounded-xl p-5 mb-6 flex items-start gap-3">
                <Check className="w-5 h-5 text-[#1A1A1A] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-[#1A1A1A] mb-1">Data request downloaded.</p>
                  <p className="text-sm text-[#666666]">Share it with your prospect to collect their numbers.</p>
                  <button
                    onClick={() => {
                      setSetting(null);
                      setSelectedDriverIds([]);
                      setDownloaded(false);
                      setStep(1);
                    }}
                    className="text-sm text-[#EA2C00] font-medium mt-3 hover:underline"
                  >
                    Start over
                  </button>
                </div>
              </div>
            ) : null}

            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep(2)}
                className="border border-[#E5E5E5] text-[#666666] rounded-full px-5 py-2.5 text-sm hover:border-[#CCCCCC] transition-colors"
              >
                Edit Drivers
              </button>
              <button
                onClick={handleDownload}
                disabled={downloaded}
                className="flex items-center gap-2 bg-[#1A1A1A] text-white rounded-full px-5 py-2.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#333333] transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Excel
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
