import { useState } from "react";
import { Check, ClipboardCheck, Building2, Zap, BedDouble, HeartPulse, Stethoscope, ClipboardList } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  type ExploreIntakeResponse,
  type IntakeFormPreseed,
  generateIntakeResponseUrl,
} from "@/lib/intakeUrlState";
import type { ExploreCareSetting } from "@/pages/explore/ExploreFlow";

interface ExploreIntakeFormProps {
  preseed?: IntakeFormPreseed;
}

const SETTINGS: { id: ExploreCareSetting; label: string; description: string }[] = [
  { id: "outpatient", label: "Outpatient Clinic", description: "Ambulatory / clinic-based care" },
  { id: "ed", label: "Emergency Department", description: "ED / urgent care" },
  { id: "inpatient", label: "Inpatient / Hospital Medicine", description: "Hospitalists, unit-based care" },
  { id: "nursing", label: "Nursing / Care Teams", description: "Bedside nursing documentation" },
];

const SETTING_ICONS: Record<ExploreCareSetting, typeof Building2> = {
  outpatient: Stethoscope,
  ed: Zap,
  inpatient: ClipboardList,
  nursing: HeartPulse,
};

const SETTING_ORDER: ExploreCareSetting[] = ["outpatient", "ed", "inpatient", "nursing"];

function NumberField({
  label, hint, value, onChange, placeholder = "0", suffix, min = 0, step,
}: {
  label: string; hint?: string; value: number | null; onChange: (v: number | null) => void;
  placeholder?: string; suffix?: string; min?: number; step?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#666666] mb-1 uppercase tracking-wide">
        {label}
        {hint && <span className="ml-1.5 normal-case tracking-normal font-normal text-[#999999]">{hint}</span>}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="number" min={min} step={step} value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          placeholder={placeholder}
          className="w-full bg-[#F5F0EB] border-0 rounded-lg px-3 h-11 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/30 transition-colors"
          data-testid={`input-intake-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
        />
        {suffix && <span className="text-sm text-[#999999] whitespace-nowrap font-medium">{suffix}</span>}
      </div>
    </div>
  );
}

export default function ExploreIntakeForm({ preseed }: ExploreIntakeFormProps) {
  const [selectedSettings, setSelectedSettings] = useState<ExploreCareSetting[]>(
    preseed?.preSelectedSettings ?? []
  );

  const [opProviders, setOpProviders] = useState<number | null>(null);
  const [opEncounters, setOpEncounters] = useState<number | null>(null);
  const [opCurrentWrvu, setOpCurrentWrvu] = useState<number | null>(null);
  const [opConversionFactor, setOpConversionFactor] = useState<number | null>(null);
  const [opTurnoverRate, setOpTurnoverRate] = useState<number | null>(null);

  const [edProviders, setEdProviders] = useState<number | null>(null);
  const [edVisits, setEdVisits] = useState<number | null>(null);
  const [edLwbsRate, setEdLwbsRate] = useState<number | null>(null);
  const [edTurnoverRate, setEdTurnoverRate] = useState<number | null>(null);

  const [ipProviders, setIpProviders] = useState<number | null>(null);
  const [ipAdmissions, setIpAdmissions] = useState<number | null>(null);
  const [ipTurnoverRate, setIpTurnoverRate] = useState<number | null>(null);

  const [nursingFTEs, setNursingFTEs] = useState<number | null>(null);
  const [nursingStaffedBeds, setNursingStaffedBeds] = useState<number | null>(null);
  const [nursingOccupancyRate, setNursingOccupancyRate] = useState<number | null>(null);
  const [nursingOtHoursPerWeek, setNursingOtHoursPerWeek] = useState<number | null>(null);
  const [nursingTurnoverRate, setNursingTurnoverRate] = useState<number | null>(null);
  const [hapiRate, setHapiRate] = useState<number | null>(null);
  const [fallRate, setFallRate] = useState<number | null>(null);
  const [cautiRate, setCautiRate] = useState<number | null>(null);
  const [clabsiRate, setClabsiRate] = useState<number | null>(null);

  const [copied, setCopied] = useState(false);

  function toggleSetting(id: ExploreCareSetting) {
    setSelectedSettings((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  function buildResponse(): ExploreIntakeResponse {
    return {
      settings: selectedSettings,
      opProviders, opAnnualEncounters: opEncounters, opCurrentWrvu, opConversionFactor, opTurnoverRate,
      edProviders, edAnnualVisits: edVisits, edLwbsRate, edTurnoverRate,
      ipProviders, ipAnnualAdmissions: ipAdmissions, ipTurnoverRate,
      nursingFTEs, nursingStaffedBeds, nursingOccupancyRate, nursingOtHoursPerWeek, nursingTurnoverRate,
      hapiRatePer1000: hapiRate, fallRatePer1000: fallRate,
      cautiRatePer1000: cautiRate, clabsiRatePer1000: clabsiRate,
    };
  }

  function handleCopy() {
    navigator.clipboard.writeText(generateIntakeResponseUrl(buildResponse())).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  }

  const hasProviders =
    (selectedSettings.includes("outpatient") && opProviders !== null) ||
    (selectedSettings.includes("ed") && edProviders !== null) ||
    (selectedSettings.includes("inpatient") && ipProviders !== null) ||
    (selectedSettings.includes("nursing") && nursingFTEs !== null);

  const hasMinimum = selectedSettings.length > 0 && hasProviders;
  const orderedSelected = SETTING_ORDER.filter((s) => selectedSettings.includes(s));

  return (
    <div className="min-h-screen bg-white flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-2xl mb-10 text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-8 h-8 bg-[#EA2C00] rounded-md flex items-center justify-center">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <span className="text-lg font-semibold text-gray-900 tracking-tight">Abridge</span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2" data-testid="text-intake-title">Help us prepare for our call</h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          Share a few details about your organization before we connect. Takes about 2 minutes.
        </p>
      </div>

      <div className="w-full max-w-2xl space-y-6">
        <div>
          <h2 className="text-xs font-semibold text-[#999999] uppercase tracking-wider mb-3">
            Which areas are you exploring Abridge for?
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {SETTINGS.map((s) => {
              const selected = selectedSettings.includes(s.id);
              return (
                <button key={s.id} onClick={() => toggleSetting(s.id)}
                  className={`relative text-left p-3 rounded-lg border-2 transition-all ${
                    selected ? "border-[#EA2C00] bg-[#EA2C00]/5" : "border-gray-200 hover:border-gray-300"
                  }`}
                  data-testid={`button-setting-${s.id}`}
                >
                  {selected && (
                    <div className="absolute top-2 right-2 w-4 h-4 bg-[#EA2C00] rounded-full flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                  <div className="text-sm font-medium text-gray-900 pr-5">{s.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="popLayout">
          {orderedSelected.map((settingId) => {
            const meta = SETTINGS.find((s) => s.id === settingId)!;
            const Icon = SETTING_ICONS[settingId];

            return (
              <motion.div
                key={settingId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-xl border border-[#E5E0DB] p-6 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-5">
                  <Icon className="w-4.5 h-4.5 text-[#EA2C00]" />
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">{meta.label}</h3>
                </div>

                {settingId === "outpatient" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField label="Physicians / APPs" value={opProviders}
                        onChange={setOpProviders} placeholder="e.g. 50" />
                      <NumberField label="Annual encounters" value={opEncounters}
                        onChange={setOpEncounters} placeholder="e.g. 90,000" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField label="Avg wRVU per encounter" value={opCurrentWrvu}
                        onChange={setOpCurrentWrvu} placeholder="e.g. 1.8" step="0.1" />
                      <NumberField label="$/wRVU conversion rate" value={opConversionFactor}
                        onChange={setOpConversionFactor} placeholder="e.g. 33" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField label="Annual provider turnover" value={opTurnoverRate}
                        onChange={setOpTurnoverRate} placeholder="e.g. 6" suffix="%" />
                    </div>
                  </div>
                )}

                {settingId === "ed" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField label="ED physicians / APPs" value={edProviders}
                        onChange={setEdProviders} placeholder="e.g. 20" />
                      <NumberField label="Annual ED visits" value={edVisits}
                        onChange={setEdVisits} placeholder="e.g. 35,000" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField label="Current LWBS rate" value={edLwbsRate}
                        onChange={setEdLwbsRate} placeholder="e.g. 2.5" suffix="%" />
                      <NumberField label="Annual provider turnover" value={edTurnoverRate}
                        onChange={setEdTurnoverRate} placeholder="e.g. 6" suffix="%" />
                    </div>
                  </div>
                )}

                {settingId === "inpatient" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField label="Hospitalists" value={ipProviders}
                        onChange={setIpProviders} placeholder="e.g. 15" />
                      <NumberField label="Annual admissions" value={ipAdmissions}
                        onChange={setIpAdmissions} placeholder="e.g. 5,000" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField label="Annual hospitalist turnover" value={ipTurnoverRate}
                        onChange={setIpTurnoverRate} placeholder="e.g. 8" suffix="%" />
                    </div>
                  </div>
                )}

                {settingId === "nursing" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField label="Nurse FTEs" value={nursingFTEs}
                        onChange={setNursingFTEs} placeholder="e.g. 300" />
                      <NumberField label="Staffed beds" value={nursingStaffedBeds}
                        onChange={setNursingStaffedBeds} placeholder="e.g. 200" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField label="Occupancy rate" value={nursingOccupancyRate}
                        onChange={setNursingOccupancyRate} placeholder="e.g. 75" suffix="%" />
                      <NumberField label="OT hours / nurse / week" value={nursingOtHoursPerWeek}
                        onChange={setNursingOtHoursPerWeek} placeholder="e.g. 4" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField label="Annual nurse turnover" value={nursingTurnoverRate}
                        onChange={setNursingTurnoverRate} placeholder="e.g. 18" suffix="%" />
                    </div>

                    <div className="pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2 mb-3">
                        <h4 className="text-xs font-semibold text-[#999999] uppercase tracking-wide">Quality metrics</h4>
                        <span className="text-[10px] text-[#999999]">·</span>
                        <span className="text-[10px] text-[#999999] italic">optional, if you track these</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <NumberField label="HAPI / 1k pt days" value={hapiRate}
                          onChange={setHapiRate} placeholder="e.g. 1.5" step="0.1" />
                        <NumberField label="Falls / 1k pt days" value={fallRate}
                          onChange={setFallRate} placeholder="e.g. 2.0" step="0.1" />
                        <NumberField label="CAUTI / 1k" value={cautiRate}
                          onChange={setCautiRate} placeholder="e.g. 1.8" step="0.1" />
                        <NumberField label="CLABSI / 1k" value={clabsiRate}
                          onChange={setClabsiRate} placeholder="e.g. 0.8" step="0.1" />
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {selectedSettings.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="pt-2"
          >
            <button onClick={handleCopy} disabled={!hasMinimum}
              className={`w-full inline-flex items-center justify-center gap-2 h-14 rounded-xl text-sm font-semibold transition-all ${
                hasMinimum
                  ? copied
                    ? "bg-green-500 text-white"
                    : "bg-[#EA2C00] hover:bg-[#c92500] text-white"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
              data-testid="button-copy-intake"
            >
              {copied
                ? <><ClipboardCheck className="w-4 h-4" /> Copied — paste this link and send it back</>
                : "Copy my answers"
              }
            </button>
            {!hasMinimum && (
              <p className="text-xs text-gray-400 mt-2 text-center">Enter at least one provider or FTE count to continue.</p>
            )}
            {hasMinimum && !copied && (
              <p className="text-xs text-gray-500 mt-2 text-center">Paste this link and send it back to your Abridge contact.</p>
            )}
          </motion.div>
        )}

        <p className="text-center text-xs text-gray-400 pb-8">
          No account required. Your answers are encoded in the link — nothing is stored on any server.
        </p>
      </div>
    </div>
  );
}
