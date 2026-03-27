import { useState } from "react";
import { Check, ClipboardCheck, Building2, Zap, BedDouble, HeartPulse } from "lucide-react";
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

const SETTINGS: { id: ExploreCareSetting; label: string; icon: typeof Building2 }[] = [
  { id: "outpatient", label: "Outpatient Clinic", icon: Building2 },
  { id: "ed", label: "Emergency Dept", icon: Zap },
  { id: "inpatient", label: "Inpatient", icon: BedDouble },
  { id: "nursing", label: "Nursing", icon: HeartPulse },
];

interface PerCardState {
  providers: number | null;
  encounters: number | null;
}

function NumberField({
  label, hint, value, onChange, placeholder = "0", suffix, min = 0, step,
}: {
  label: string; hint?: string; value: number | null; onChange: (v: number | null) => void;
  placeholder?: string; suffix?: string; min?: number; step?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
        {label}
        {hint && <span className="ml-1.5 normal-case tracking-normal font-normal text-gray-400">{hint}</span>}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="number" min={min} step={step} value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          placeholder={placeholder}
          className="w-full bg-white border border-gray-200 rounded-lg px-3 h-11 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/30 focus:border-[#EA2C00] transition-colors"
          data-testid={`input-intake-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
        />
        {suffix && <span className="text-sm text-gray-400 whitespace-nowrap font-medium">{suffix}</span>}
      </div>
    </div>
  );
}

const SETTING_ORDER: ExploreCareSetting[] = ["outpatient", "ed", "inpatient", "nursing"];

export default function ExploreIntakeForm({ preseed }: ExploreIntakeFormProps) {
  const [selectedSettings, setSelectedSettings] = useState<ExploreCareSetting[]>(
    preseed?.preSelectedSettings ?? []
  );

  const [opCard, setOpCard] = useState<PerCardState>({ providers: null, encounters: null });
  const [edCard, setEdCard] = useState<PerCardState>({ providers: null, encounters: null });
  const [ipCard, setIpCard] = useState<PerCardState>({ providers: null, encounters: null });
  const [nursingCard, setNursingCard] = useState<PerCardState & { nurseFtes: number | null }>({ providers: null, encounters: null, nurseFtes: null });

  const [opCurrentWrvu, setOpCurrentWrvu] = useState<number | null>(null);
  const [opConversionFactor, setOpConversionFactor] = useState<number | null>(null);
  const [opTurnoverRate, setOpTurnoverRate] = useState<number | null>(null);

  const [edLwbsRate, setEdLwbsRate] = useState<number | null>(null);
  const [edTurnoverRate, setEdTurnoverRate] = useState<number | null>(null);

  const [ipTurnoverRate, setIpTurnoverRate] = useState<number | null>(null);

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
    const primarySetting = SETTING_ORDER.find((s) => selectedSettings.includes(s));
    let providers: number | null = null;
    let annualEncounters: number | null = null;
    if (primarySetting === "outpatient") { providers = opCard.providers; annualEncounters = opCard.encounters; }
    else if (primarySetting === "ed") { providers = edCard.providers; annualEncounters = edCard.encounters; }
    else if (primarySetting === "inpatient") { providers = ipCard.providers; annualEncounters = ipCard.encounters; }
    else if (primarySetting === "nursing") { providers = nursingCard.providers; annualEncounters = nursingCard.encounters; }

    return {
      settings: selectedSettings,
      providers,
      annualEncounters,
      opCurrentWrvu, opConversionFactor, opTurnoverRate,
      edLwbsRate, edTurnoverRate,
      ipTurnoverRate,
      nursingStaffedBeds, nursingOccupancyRate, nursingOtHoursPerWeek, nursingTurnoverRate,
      hapiRatePer1000: hapiRate, fallRatePer1000: fallRate,
      cautiRatePer1000: cautiRate, clabsiRatePer1000: clabsiRate,
    };
  }

  function handleCopy() {
    const response = buildResponse();
    navigator.clipboard.writeText(generateIntakeResponseUrl(response)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  }

  const hasProviders =
    (selectedSettings.includes("outpatient") && opCard.providers !== null) ||
    (selectedSettings.includes("ed") && edCard.providers !== null) ||
    (selectedSettings.includes("inpatient") && ipCard.providers !== null) ||
    (selectedSettings.includes("nursing") && nursingCard.providers !== null);

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
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Which areas are you exploring Abridge for?
          </h2>
          <div className="flex flex-wrap gap-2">
            {SETTINGS.map((s) => {
              const selected = selectedSettings.includes(s.id);
              const Icon = s.icon;
              return (
                <button key={s.id} onClick={() => toggleSetting(s.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 text-sm font-medium transition-all ${
                    selected
                      ? "border-[#EA2C00] bg-[#EA2C00]/5 text-[#EA2C00]"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                  data-testid={`button-setting-${s.id}`}
                >
                  <Icon className="w-4 h-4" />
                  {s.label}
                  {selected && <Check className="w-3.5 h-3.5" />}
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="popLayout">
          {orderedSelected.map((settingId) => {
            const meta = SETTINGS.find((s) => s.id === settingId)!;
            const Icon = meta.icon;

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
                      <NumberField label="Physicians / APPs" value={opCard.providers}
                        onChange={(v) => setOpCard((p) => ({ ...p, providers: v }))} placeholder="e.g. 120" />
                      <NumberField label="Annual encounters" value={opCard.encounters}
                        onChange={(v) => setOpCard((p) => ({ ...p, encounters: v }))} placeholder="e.g. 90,000" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField label="Avg wRVU per encounter" value={opCurrentWrvu}
                        onChange={setOpCurrentWrvu} placeholder="e.g. 1.8" step="0.1" />
                      <NumberField label="$/wRVU conversion rate" hint="from your payer contract" value={opConversionFactor}
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
                      <NumberField label="ED Physicians / APPs" value={edCard.providers}
                        onChange={(v) => setEdCard((p) => ({ ...p, providers: v }))} placeholder="e.g. 45" />
                      <NumberField label="Annual ED visits" value={edCard.encounters}
                        onChange={(v) => setEdCard((p) => ({ ...p, encounters: v }))} placeholder="e.g. 60,000" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField label="Current LWBS rate" value={edLwbsRate}
                        onChange={setEdLwbsRate} placeholder="e.g. 3" suffix="%" />
                      <NumberField label="Annual provider turnover" value={edTurnoverRate}
                        onChange={setEdTurnoverRate} placeholder="e.g. 6" suffix="%" />
                    </div>
                  </div>
                )}

                {settingId === "inpatient" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField label="Hospitalists / APPs" value={ipCard.providers}
                        onChange={(v) => setIpCard((p) => ({ ...p, providers: v }))} placeholder="e.g. 30" />
                      <NumberField label="Annual encounters" value={ipCard.encounters}
                        onChange={(v) => setIpCard((p) => ({ ...p, encounters: v }))} placeholder="e.g. 25,000" />
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
                      <NumberField label="Nurse FTEs" value={nursingCard.nurseFtes}
                        onChange={(v) => setNursingCard((p) => ({ ...p, nurseFtes: v, providers: v }))} placeholder="e.g. 400" />
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
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Quality metrics</h4>
                        <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded font-medium">optional</span>
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                        <NumberField label="HAPI /1k" value={hapiRate}
                          onChange={setHapiRate} placeholder="1.5" step="0.1" />
                        <NumberField label="Falls /1k" value={fallRate}
                          onChange={setFallRate} placeholder="2.0" step="0.1" />
                        <NumberField label="CAUTI /1k" value={cautiRate}
                          onChange={setCautiRate} placeholder="1.8" step="0.1" />
                        <NumberField label="CLABSI /1k" value={clabsiRate}
                          onChange={setClabsiRate} placeholder="0.8" step="0.1" />
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
              className={`w-full inline-flex items-center justify-center gap-2 h-[52px] rounded-xl text-sm font-semibold transition-all ${
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
              <p className="text-xs text-gray-400 mt-2 text-center">Enter at least one provider count to continue.</p>
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
