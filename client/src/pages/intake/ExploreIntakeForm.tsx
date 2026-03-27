import { useState, useRef, useCallback } from "react";
import { Check, ClipboardCheck, Stethoscope, Zap, ClipboardList, HeartPulse } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  type ExploreIntakeResponse,
  type IntakeFormPreseed,
  generateIntakeResponseUrl,
} from "@/lib/intakeUrlState";
import type { ExploreCareSetting } from "@/pages/explore/ExploreFlow";
import abridgeLogo from "@assets/abridge-logo-wordmark-red_1769020684647.png";

interface ExploreIntakeFormProps {
  preseed?: IntakeFormPreseed;
}

const SETTINGS: { id: ExploreCareSetting; label: string; description: string }[] = [
  { id: "outpatient", label: "Outpatient Clinic", description: "Ambulatory / clinic-based care" },
  { id: "ed", label: "Emergency Department", description: "ED / urgent care" },
  { id: "inpatient", label: "Inpatient / Hospital Medicine", description: "Hospitalists, unit-based care" },
  { id: "nursing", label: "Nursing / Care Teams", description: "Bedside nursing documentation" },
];

const SETTING_ICONS: Record<ExploreCareSetting, typeof Stethoscope> = {
  outpatient: Stethoscope,
  ed: Zap,
  inpatient: ClipboardList,
  nursing: HeartPulse,
};

const SETTING_ORDER: ExploreCareSetting[] = ["outpatient", "ed", "inpatient", "nursing"];

function formatWithCommas(n: number): string {
  return n.toLocaleString('en-US');
}

function parseFormatted(s: string): number | null {
  const cleaned = s.replace(/,/g, '').replace(/[^\d.\-]/g, '');
  if (!cleaned || cleaned === '-' || cleaned === '.') return null;
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

function NumberField({
  label, hint, value, onChange, placeholder = "0", suffix, step,
}: {
  label: string; hint?: string; value: number | null; onChange: (v: number | null) => void;
  placeholder?: string; suffix?: string; step?: string;
}) {
  const isDecimal = step != null && parseFloat(step) < 1;
  const [display, setDisplay] = useState(() =>
    value != null ? (isDecimal ? String(value) : formatWithCommas(value)) : ''
  );
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const cursor = e.target.selectionStart || 0;

    if (isDecimal) {
      setDisplay(raw);
      onChange(raw === '' ? null : (isNaN(Number(raw)) ? value : Number(raw)));
      return;
    }

    const digitsOnly = raw.replace(/[^\d.]/g, '');
    const parts = digitsOnly.split('.');
    const intPart = parts[0] || '';
    const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    const rawDigitsBefore = raw.slice(0, cursor).replace(/[^\d.]/g, '').length;
    let newCursor = 0;
    let dCount = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (formatted[i] !== ',') dCount++;
      if (dCount === rawDigitsBefore) { newCursor = i + 1; break; }
    }
    if (dCount < rawDigitsBefore) newCursor = formatted.length;

    setDisplay(formatted);
    requestAnimationFrame(() => {
      if (inputRef.current && document.activeElement === inputRef.current) {
        inputRef.current.setSelectionRange(newCursor, newCursor);
      }
    });
    onChange(parseFormatted(formatted));
  }, [onChange, value, isDecimal]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    if (value != null && !isDecimal) {
      setDisplay(formatWithCommas(value));
    } else if (value != null && isDecimal) {
      setDisplay(String(value));
    } else {
      setDisplay('');
    }
  }, [value, isDecimal]);

  const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    setFocused(true);
    setTimeout(() => e.target.select(), 0);
  }, []);

  if (!focused && value != null) {
    const shown = isDecimal ? String(value) : formatWithCommas(value);
    if (display !== shown) setDisplay(shown);
  }

  return (
    <div>
      <label className="block text-xs font-medium text-[#888888] mb-1 uppercase tracking-wide">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={display}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="w-full bg-[#F5F0EB] border-0 rounded-lg px-3 h-11 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/30 transition-colors"
          data-testid={`input-intake-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
          autoComplete="off"
        />
        {suffix && <span className="text-sm text-[#999999] whitespace-nowrap font-medium">{suffix}</span>}
      </div>
      {hint && <p className="text-[11px] text-[#AAAAAA] mt-1 leading-snug">{hint}</p>}
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="border-t border-[#F0EBE5] pt-4 mt-4">
      <p className="text-xs text-[#AAAAAA] uppercase tracking-widest mb-3">{label}</p>
    </div>
  );
}

export default function ExploreIntakeForm({ preseed }: ExploreIntakeFormProps) {
  const [selectedSettings, setSelectedSettings] = useState<ExploreCareSetting[]>(
    preseed?.preSelectedSettings ?? []
  );

  const [opProviders, setOpProviders] = useState<number | null>(null);
  const [opEncounters, setOpEncounters] = useState<number | null>(null);
  const [opRevenuePerVisit, setOpRevenuePerVisit] = useState<number | null>(null);
  const [opCurrentWrvu, setOpCurrentWrvu] = useState<number | null>(null);
  const [opConversionFactor, setOpConversionFactor] = useState<number | null>(null);
  const [opDenialRate, setOpDenialRate] = useState<number | null>(null);
  const [opAvgClaimValue, setOpAvgClaimValue] = useState<number | null>(null);
  const [opPanelSize, setOpPanelSize] = useState<number | null>(null);
  const [opMaEnrollmentRate, setOpMaEnrollmentRate] = useState<number | null>(null);
  const [opAnnualPaymentPerRaf, setOpAnnualPaymentPerRaf] = useState<number | null>(null);
  const [opTurnoverRate, setOpTurnoverRate] = useState<number | null>(null);
  const [opReplacementCost, setOpReplacementCost] = useState<number | null>(null);

  const [edProviders, setEdProviders] = useState<number | null>(null);
  const [edVisits, setEdVisits] = useState<number | null>(null);
  const [edLwbsRate, setEdLwbsRate] = useState<number | null>(null);
  const [edRevenuePerVisit, setEdRevenuePerVisit] = useState<number | null>(null);
  const [edAdmissionRate, setEdAdmissionRate] = useState<number | null>(null);
  const [edAdmissionRevenue, setEdAdmissionRevenue] = useState<number | null>(null);
  const [edTurnoverRate, setEdTurnoverRate] = useState<number | null>(null);
  const [edReplacementCost, setEdReplacementCost] = useState<number | null>(null);

  const [ipProviders, setIpProviders] = useState<number | null>(null);
  const [ipAdmissions, setIpAdmissions] = useState<number | null>(null);
  const [ipDenialRate, setIpDenialRate] = useState<number | null>(null);
  const [ipAvgClaimValue, setIpAvgClaimValue] = useState<number | null>(null);
  const [ipTurnoverRate, setIpTurnoverRate] = useState<number | null>(null);
  const [ipReplacementCost, setIpReplacementCost] = useState<number | null>(null);

  const [nursingFTEs, setNursingFTEs] = useState<number | null>(null);
  const [nursingStaffedBeds, setNursingStaffedBeds] = useState<number | null>(null);
  const [nursingOccupancyRate, setNursingOccupancyRate] = useState<number | null>(null);
  const [nursingOtHoursPerWeek, setNursingOtHoursPerWeek] = useState<number | null>(null);
  const [nursingOtHourlyRate, setNursingOtHourlyRate] = useState<number | null>(null);
  const [nursingTurnoverRate, setNursingTurnoverRate] = useState<number | null>(null);
  const [nursingReplacementCost, setNursingReplacementCost] = useState<number | null>(null);
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
      opProviders, opAnnualEncounters: opEncounters, opRevenuePerVisit, opCurrentWrvu,
      opConversionFactor, opDenialRate, opAvgClaimValue, opPanelSize,
      opMaEnrollmentRate, opAnnualPaymentPerRaf, opTurnoverRate, opReplacementCost,
      edProviders, edAnnualVisits: edVisits, edLwbsRate, edRevenuePerVisit,
      edAdmissionRate, edAdmissionRevenue, edTurnoverRate, edReplacementCost,
      ipProviders, ipAnnualAdmissions: ipAdmissions, ipDenialRate, ipAvgClaimValue,
      ipTurnoverRate, ipReplacementCost,
      nursingFTEs, nursingStaffedBeds, nursingOccupancyRate, nursingOtHoursPerWeek,
      nursingOtHourlyRate, nursingTurnoverRate, nursingReplacementCost,
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
    (selectedSettings.includes("outpatient") && opProviders != null && opProviders > 0) ||
    (selectedSettings.includes("ed") && edProviders != null && edProviders > 0) ||
    (selectedSettings.includes("inpatient") && ipProviders != null && ipProviders > 0) ||
    (selectedSettings.includes("nursing") && nursingFTEs != null && nursingFTEs > 0);

  const hasMinimum = selectedSettings.length > 0 && hasProviders;
  const orderedSelected = SETTING_ORDER.filter((s) => selectedSettings.includes(s));

  return (
    <div className="min-h-screen bg-white flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-2xl mb-10 text-center">
        <div className="flex items-center justify-center mb-6">
          <img src={abridgeLogo} alt="Abridge" className="h-6" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2" data-testid="text-intake-title">Help us prepare for our call</h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          Share a few details about your organization before we connect. Takes about 2 minutes.
        </p>
      </div>

      <div className="w-full max-w-2xl space-y-4">
        <div>
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

                    <SectionDivider label="Time & Revenue" />
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField label="Revenue per visit" value={opRevenuePerVisit}
                        onChange={setOpRevenuePerVisit} placeholder="e.g. 250" suffix="$" />
                      <NumberField label="Avg wRVU per encounter" value={opCurrentWrvu}
                        onChange={setOpCurrentWrvu} placeholder="e.g. 1.8" step="0.1" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField label="$/wRVU conversion rate" value={opConversionFactor}
                        onChange={setOpConversionFactor} placeholder="e.g. 33" />
                      <NumberField label="Annual provider turnover" value={opTurnoverRate}
                        onChange={setOpTurnoverRate} placeholder="e.g. 6" suffix="%" />
                    </div>
                    <NumberField label="Cost to replace one provider" value={opReplacementCost}
                      onChange={setOpReplacementCost} placeholder="e.g. 350,000" suffix="$"
                      hint="recruiting + training + lost revenue — typically $250k–$500k" />

                    <SectionDivider label="Documentation Quality" />
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField label="Claim denial rate" value={opDenialRate}
                        onChange={setOpDenialRate} placeholder="e.g. 8" suffix="%" />
                      <NumberField label="Avg denied claim value" value={opAvgClaimValue}
                        onChange={setOpAvgClaimValue} placeholder="e.g. 200" suffix="$" />
                    </div>

                    <SectionDivider label="HCC / RAF — if you have Medicare Advantage patients" />
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField label="Panel size" value={opPanelSize}
                        onChange={setOpPanelSize} placeholder="e.g. 1,500" />
                      <NumberField label="% panel on Medicare Advantage" value={opMaEnrollmentRate}
                        onChange={setOpMaEnrollmentRate} placeholder="e.g. 35" suffix="%" />
                    </div>
                    <NumberField label="Annual payment per RAF point" value={opAnnualPaymentPerRaf}
                      onChange={setOpAnnualPaymentPerRaf} placeholder="e.g. 10,000" suffix="$"
                      hint="from your MA contract — typically $8k–$12k per RAF point/year" />
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

                    <SectionDivider label="Throughput & Revenue" />
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField label="Current LWBS rate" value={edLwbsRate}
                        onChange={setEdLwbsRate} placeholder="e.g. 2.5" suffix="%" />
                      <NumberField label="Revenue per ED visit" value={edRevenuePerVisit}
                        onChange={setEdRevenuePerVisit} placeholder="e.g. 800" suffix="$" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField label="% LWBS patients admitted" value={edAdmissionRate}
                        onChange={setEdAdmissionRate} placeholder="e.g. 15" suffix="%"
                        hint="of recovered patients who end up admitted" />
                      <NumberField label="Revenue per admission" value={edAdmissionRevenue}
                        onChange={setEdAdmissionRevenue} placeholder="e.g. 12,000" suffix="$" />
                    </div>

                    <SectionDivider label="Workforce" />
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField label="Annual provider turnover" value={edTurnoverRate}
                        onChange={setEdTurnoverRate} placeholder="e.g. 6" suffix="%" />
                      <NumberField label="Cost to replace one provider" value={edReplacementCost}
                        onChange={setEdReplacementCost} placeholder="e.g. 350,000" suffix="$" />
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

                    <SectionDivider label="Documentation Quality" />
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField label="Obs/IP status denial rate" value={ipDenialRate}
                        onChange={setIpDenialRate} placeholder="e.g. 5" suffix="%" />
                      <NumberField label="Avg claim value at risk" value={ipAvgClaimValue}
                        onChange={setIpAvgClaimValue} placeholder="e.g. 10,000" suffix="$"
                        hint="avg $ of claims where Obs vs IP status is disputed" />
                    </div>

                    <SectionDivider label="Workforce" />
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField label="Annual hospitalist turnover" value={ipTurnoverRate}
                        onChange={setIpTurnoverRate} placeholder="e.g. 8" suffix="%" />
                      <NumberField label="Cost to replace one hospitalist" value={ipReplacementCost}
                        onChange={setIpReplacementCost} placeholder="e.g. 300,000" suffix="$" />
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
                      <NumberField label="OT hourly rate" value={nursingOtHourlyRate}
                        onChange={setNursingOtHourlyRate} placeholder="e.g. 75" suffix="$/hr" />
                      <NumberField label="Annual nurse turnover" value={nursingTurnoverRate}
                        onChange={setNursingTurnoverRate} placeholder="e.g. 18" suffix="%" />
                    </div>
                    <NumberField label="Cost to replace one nurse" value={nursingReplacementCost}
                      onChange={setNursingReplacementCost} placeholder="e.g. 56,000" suffix="$"
                      hint="recruiting + training + agency fill — typically $40k–$75k" />

                    <SectionDivider label="Quality metrics · optional, if you track these" />
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField label="HAPI rate / 1k pt days" value={hapiRate}
                        onChange={setHapiRate} placeholder="e.g. 1.5" step="0.1" />
                      <NumberField label="Falls rate / 1k pt days" value={fallRate}
                        onChange={setFallRate} placeholder="e.g. 2.0" step="0.1" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField label="CAUTI rate / 1k" value={cautiRate}
                        onChange={setCautiRate} placeholder="e.g. 1.8" step="0.1" />
                      <NumberField label="CLABSI rate / 1k" value={clabsiRate}
                        onChange={setClabsiRate} placeholder="e.g. 0.8" step="0.1" />
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
              className={`w-full inline-flex items-center justify-center gap-2 h-14 rounded-xl font-semibold text-base transition-all ${
                hasMinimum
                  ? copied
                    ? "bg-green-500 text-white"
                    : "bg-[#EA2C00] hover:bg-[#c92500] text-white"
                  : "bg-[#E0E0E0] text-[#AAAAAA] cursor-not-allowed"
              }`}
              data-testid="button-copy-intake"
            >
              {copied
                ? <><ClipboardCheck className="w-4 h-4" /> Copied — paste this link and send it back</>
                : "Copy my answers"
              }
            </button>
            {!hasMinimum && (
              <p className="text-xs text-[#BBBBBB] mt-3 text-center">Enter at least one provider or FTE count to continue.</p>
            )}
          </motion.div>
        )}

        <p className="text-center text-xs text-[#BBBBBB] pb-8 mt-3">
          No account required. Your answers are encoded in the link — nothing is stored on any server.
        </p>
      </div>
    </div>
  );
}
