import { useState, useRef, useCallback } from "react";
import { Check, Stethoscope, Zap, ClipboardList, HeartPulse, Trash2, Lock, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  type ExploreIntakeResponse,
  type IntakeFormPreseed,
} from "@/lib/intakeUrlState";
import { downloadIntakeReceiptPDF } from "@/components/intake/IntakeReceiptPDF";
import type { ExploreCareSetting } from "@/pages/explore/ExploreFlow";
import abridgeLogo from "@assets/abridge-logo-wordmark-red_1769020684647.png";

interface ExploreIntakeFormProps {
  preseed?: IntakeFormPreseed;
  storageFingerprint?: string;
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
      <label className="block text-[11px] font-medium text-[#777777] mb-1.5 uppercase tracking-wider">
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
      {hint && <p className="text-[11px] text-[#BBBBBB] mt-1 leading-snug italic">{hint}</p>}
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="border-t border-[#EDE8E2] pt-4 mt-5">
      <p className="text-[10px] font-semibold text-[#EA2C00] uppercase tracking-widest mb-3">{label}</p>
    </div>
  );
}

interface IntakeFormState {
  selectedSettings: ExploreCareSetting[];
  opProviders: number | null; opEncounters: number | null; opRevenuePerVisit: number | null;
  opCurrentWrvu: number | null; opConversionFactor: number | null; opDenialRate: number | null;
  opAvgClaimValue: number | null; opPanelSize: number | null; opMaEnrollmentRate: number | null;
  opAnnualPaymentPerRaf: number | null; opTurnoverRate: number | null; opReplacementCost: number | null;
  edProviders: number | null; edVisits: number | null; edLwbsRate: number | null;
  edRevenuePerVisit: number | null; edAdmissionRate: number | null; edAdmissionRevenue: number | null;
  edTurnoverRate: number | null; edReplacementCost: number | null;
  ipProviders: number | null; ipAdmissions: number | null; ipDenialRate: number | null;
  ipAvgClaimValue: number | null; ipTurnoverRate: number | null; ipReplacementCost: number | null;
  ipDrgAtRiskRate: number | null; ipDrgWeightIncrease: number | null; ipDrgBasePayment: number | null;
  ipCdiQueryRate: number | null; ipCdiCostPerQuery: number | null;
  ipConcurrentReviewRate: number | null; ipConcurrentDenialRate: number | null;
  ipConcurrentAvgDays: number | null; ipConcurrentDailyRate: number | null;
  nursingFTEs: number | null; nursingStaffedBeds: number | null; nursingOccupancyRate: number | null;
  nursingOtHoursPerWeek: number | null; nursingOtHourlyRate: number | null; nursingTurnoverRate: number | null;
  nursingReplacementCost: number | null; hapiRate: number | null; fallRate: number | null;
  cautiRate: number | null; clabsiRate: number | null;
}

function getEmptyState(preseed?: IntakeFormPreseed): IntakeFormState {
  return {
    selectedSettings: preseed?.preSelectedSettings ?? [],
    opProviders: null, opEncounters: null, opRevenuePerVisit: null,
    opCurrentWrvu: null, opConversionFactor: null, opDenialRate: null,
    opAvgClaimValue: null, opPanelSize: null, opMaEnrollmentRate: null,
    opAnnualPaymentPerRaf: null, opTurnoverRate: null, opReplacementCost: null,
    edProviders: null, edVisits: null, edLwbsRate: null,
    edRevenuePerVisit: null, edAdmissionRate: null, edAdmissionRevenue: null,
    edTurnoverRate: null, edReplacementCost: null,
    ipProviders: null, ipAdmissions: null, ipDenialRate: null,
    ipAvgClaimValue: null, ipTurnoverRate: null, ipReplacementCost: null,
    ipDrgAtRiskRate: null, ipDrgWeightIncrease: null, ipDrgBasePayment: null,
    ipCdiQueryRate: null, ipCdiCostPerQuery: null,
    ipConcurrentReviewRate: null, ipConcurrentDenialRate: null,
    ipConcurrentAvgDays: null, ipConcurrentDailyRate: null,
    nursingFTEs: null, nursingStaffedBeds: null, nursingOccupancyRate: null,
    nursingOtHoursPerWeek: null, nursingOtHourlyRate: null, nursingTurnoverRate: null,
    nursingReplacementCost: null, hapiRate: null, fallRate: null,
    cautiRate: null, clabsiRate: null,
  };
}


export default function ExploreIntakeForm({ preseed, storageFingerprint }: ExploreIntakeFormProps) {
  const [formState, setFormState] = useState<IntakeFormState>(() => getEmptyState(preseed));
  const [pdfLoading, setPdfLoading] = useState(false);

  const lockedSettings = preseed?.preSelectedSettings ?? [];
  const hasLocking = lockedSettings.length > 0;

  function update<K extends keyof IntakeFormState>(key: K, val: IntakeFormState[K]) {
    setFormState(prev => ({ ...prev, [key]: val }));
  }

  function toggleSetting(id: ExploreCareSetting) {
    if (hasLocking) return;
    setFormState(prev => ({
      ...prev,
      selectedSettings: prev.selectedSettings.includes(id)
        ? prev.selectedSettings.filter(s => s !== id)
        : [...prev.selectedSettings, id],
    }));
  }

  function handleClearAll() {
    const empty = getEmptyState(preseed);
    setFormState(empty);
  }

  function buildResponse(): ExploreIntakeResponse {
    const s = formState;
    return {
      settings: s.selectedSettings,
      opProviders: s.opProviders, opAnnualEncounters: s.opEncounters, opRevenuePerVisit: s.opRevenuePerVisit,
      opCurrentWrvu: s.opCurrentWrvu, opConversionFactor: s.opConversionFactor, opDenialRate: s.opDenialRate,
      opAvgClaimValue: s.opAvgClaimValue, opPanelSize: s.opPanelSize,
      opMaEnrollmentRate: s.opMaEnrollmentRate, opAnnualPaymentPerRaf: s.opAnnualPaymentPerRaf,
      opTurnoverRate: s.opTurnoverRate, opReplacementCost: s.opReplacementCost,
      edProviders: s.edProviders, edAnnualVisits: s.edVisits, edLwbsRate: s.edLwbsRate,
      edRevenuePerVisit: s.edRevenuePerVisit, edAdmissionRate: s.edAdmissionRate,
      edAdmissionRevenue: s.edAdmissionRevenue, edTurnoverRate: s.edTurnoverRate, edReplacementCost: s.edReplacementCost,
      ipProviders: s.ipProviders, ipAnnualAdmissions: s.ipAdmissions, ipDenialRate: s.ipDenialRate,
      ipAvgClaimValue: s.ipAvgClaimValue, ipTurnoverRate: s.ipTurnoverRate, ipReplacementCost: s.ipReplacementCost,
      ipDrgAtRiskRate: s.ipDrgAtRiskRate, ipDrgWeightIncrease: s.ipDrgWeightIncrease, ipDrgBasePayment: s.ipDrgBasePayment,
      ipCdiQueryRate: s.ipCdiQueryRate, ipCdiCostPerQuery: s.ipCdiCostPerQuery,
      ipConcurrentReviewRate: s.ipConcurrentReviewRate, ipConcurrentDenialRate: s.ipConcurrentDenialRate,
      ipConcurrentAvgDays: s.ipConcurrentAvgDays, ipConcurrentDailyRate: s.ipConcurrentDailyRate,
      nursingFTEs: s.nursingFTEs, nursingStaffedBeds: s.nursingStaffedBeds,
      nursingOccupancyRate: s.nursingOccupancyRate, nursingOtHoursPerWeek: s.nursingOtHoursPerWeek,
      nursingOtHourlyRate: s.nursingOtHourlyRate, nursingTurnoverRate: s.nursingTurnoverRate,
      nursingReplacementCost: s.nursingReplacementCost,
      hapiRatePer1000: s.hapiRate, fallRatePer1000: s.fallRate,
      cautiRatePer1000: s.cautiRate, clabsiRatePer1000: s.clabsiRate,
    };
  }

  async function handleDownloadPDF() {
    setPdfLoading(true);
    try {
      await downloadIntakeReceiptPDF(buildResponse());
    } finally {
      setPdfLoading(false);
    }
  }

  const { selectedSettings } = formState;

  const hasProviders =
    (selectedSettings.includes("outpatient") && formState.opProviders != null && formState.opProviders > 0) ||
    (selectedSettings.includes("ed") && formState.edProviders != null && formState.edProviders > 0) ||
    (selectedSettings.includes("inpatient") && formState.ipProviders != null && formState.ipProviders > 0) ||
    (selectedSettings.includes("nursing") && formState.nursingFTEs != null && formState.nursingFTEs > 0);

  const hasMinimum = selectedSettings.length > 0 && hasProviders;
  const orderedSelected = SETTING_ORDER.filter((s) => selectedSettings.includes(s));

  const hasAnyData = Object.entries(formState).some(([k, v]) => k !== 'selectedSettings' && v != null);

  return (
    <div className="min-h-screen bg-[#F5F0EB] flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-2xl mb-10 text-center">
        <div className="flex items-center justify-center mb-8">
          <img src={abridgeLogo} alt="Abridge" className="h-7" />
        </div>
        {(preseed?.repName || preseed?.orgName) && (
          <p className="text-sm text-[#666666] mb-4" data-testid="text-intake-context">
            {preseed.repName ? `${preseed.repName} at Abridge` : 'Your Abridge team'} sent this form
            {preseed.orgName ? ` for ${preseed.orgName}` : ''}.
          </p>
        )}
        <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-3">Pre-Call Intake</p>
        <h1 className="text-3xl font-bold text-black mb-3 uppercase tracking-tight" data-testid="text-intake-title">Help us prepare for our call</h1>
        <p className="text-[#666666] text-base leading-relaxed max-w-md mx-auto mb-5">
          Share what you know about your organization before we connect. You don't need every number — fill in what you have.
        </p>

        <div className="bg-white border border-[#E0D9D0] rounded-xl px-5 py-4 max-w-md mx-auto space-y-3 text-left">
          <div className="flex items-start gap-3 min-h-[48px]">
            <span className="text-[#EA2C00] font-bold text-base leading-none mt-0.5 shrink-0">1</span>
            <div>
              <p className="text-sm font-semibold text-[#1A1A1A] leading-snug">Select your care settings</p>
              <p className="text-xs text-[#888888] mt-0.5">Only pick the ones Abridge is deployed — or being considered — in your org.</p>
            </div>
          </div>
          <div className="h-px bg-[#F0EBE3]" />
          <div className="flex items-start gap-3 min-h-[48px]">
            <span className="text-[#EA2C00] font-bold text-base leading-none mt-0.5 shrink-0">2</span>
            <div>
              <p className="text-sm font-semibold text-[#1A1A1A] leading-snug">Fill in what you know</p>
              <p className="text-xs text-[#888888] mt-0.5">Estimates are fine. Skip anything you're unsure about — blank is better than a guess.</p>
            </div>
          </div>
          <div className="h-px bg-[#F0EBE3]" />
          <div className="flex items-start gap-3 min-h-[48px]">
            <span className="text-[#EA2C00] font-bold text-base leading-none mt-0.5 shrink-0">3</span>
            <div>
              <p className="text-sm font-semibold text-[#1A1A1A] leading-snug">Download before the call</p>
              <p className="text-xs text-[#888888] mt-0.5">Your answers stay in this browser tab. Download the PDF and share it with your Abridge team so we can prepare.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-2xl space-y-4">
        <div>
          <div className="grid grid-cols-2 gap-3">
            {SETTINGS.map((setting) => {
              const selected = selectedSettings.includes(setting.id);
              const isLocked = hasLocking && lockedSettings.includes(setting.id);
              const isGreyed = hasLocking && !lockedSettings.includes(setting.id);
              return (
                <button key={setting.id} onClick={() => toggleSetting(setting.id)}
                  disabled={hasLocking}
                  className={`relative text-left p-3 rounded-lg border-2 transition-all ${
                    isGreyed ? "border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed" :
                    selected ? "border-[#EA2C00] bg-white shadow-[0_2px_8px_rgba(234,44,0,0.08)]" : "border-[#E5E0DB] bg-[#F5F0EB] hover:border-[#EA2C00] hover:shadow-sm"
                  }`}
                  data-testid={`button-setting-${setting.id}`}
                >
                  {isLocked && (
                    <div className="absolute top-2 right-2 w-4 h-4 bg-[#EA2C00] rounded-full flex items-center justify-center">
                      <Lock className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                  {!hasLocking && selected && (
                    <div className="absolute top-2 right-2 w-4 h-4 bg-[#EA2C00] rounded-full flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                  <div className={`text-sm font-semibold pr-5 ${isGreyed ? "text-gray-400" : "text-[#1A1A1A]"}`}>{setting.label}</div>
                  <div className={`text-xs mt-0.5 ${isGreyed ? "text-gray-300" : "text-[#888888]"}`}>{setting.description}</div>
                </button>
              );
            })}
          </div>
          {hasLocking && (
            <p className="text-xs text-[#AAAAAA] mt-3 text-center italic">
              Your Abridge contact has scoped this conversation to the areas above.
            </p>
          )}
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
                className="bg-white rounded-xl border border-[#E8E3DD] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
              >
                <div className="flex items-center gap-2 mb-5">
                  <Icon className="w-4.5 h-4.5 text-[#EA2C00]" />
                  <h3 className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-widest">{meta.label}</h3>
                </div>

                {settingId === "outpatient" && (
                  <div className="space-y-4">
                    <SectionDivider label="Deployment" />
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField label="Physicians / APPs" value={formState.opProviders}
                        onChange={v => update('opProviders', v)} placeholder="e.g. 50" />
                      <NumberField label="Annual encounters" value={formState.opEncounters}
                        onChange={v => update('opEncounters', v)} placeholder="e.g. 90,000" />
                    </div>

                    <SectionDivider label="Time & Revenue" />
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField label="Revenue per visit" value={formState.opRevenuePerVisit}
                        onChange={v => update('opRevenuePerVisit', v)} placeholder="e.g. 250" suffix="$" />
                      <NumberField label="Avg wRVU per encounter" value={formState.opCurrentWrvu}
                        onChange={v => update('opCurrentWrvu', v)} placeholder="e.g. 1.8" step="0.1" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField label="$/wRVU conversion rate" value={formState.opConversionFactor}
                        onChange={v => update('opConversionFactor', v)} placeholder="e.g. 33" />
                      <NumberField label="Annual provider turnover" value={formState.opTurnoverRate}
                        onChange={v => update('opTurnoverRate', v)} placeholder="e.g. 6" suffix="%" />
                    </div>
                    <NumberField label="Cost to replace one provider" value={formState.opReplacementCost}
                      onChange={v => update('opReplacementCost', v)} placeholder="e.g. 350,000" suffix="$"
                      hint="recruiting + training + lost revenue — typically $250k–$500k" />

                    <SectionDivider label="Documentation Quality" />
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField label="Claim denial rate" value={formState.opDenialRate}
                        onChange={v => update('opDenialRate', v)} placeholder="e.g. 8" suffix="%" />
                      <NumberField label="Avg denied claim value" value={formState.opAvgClaimValue}
                        onChange={v => update('opAvgClaimValue', v)} placeholder="e.g. 200" suffix="$" />
                    </div>

                    <SectionDivider label="HCC / RAF — if you have Medicare Advantage patients" />
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField label="Panel size" value={formState.opPanelSize}
                        onChange={v => update('opPanelSize', v)} placeholder="e.g. 1,500" />
                      <NumberField label="% panel on Medicare Advantage" value={formState.opMaEnrollmentRate}
                        onChange={v => update('opMaEnrollmentRate', v)} placeholder="e.g. 35" suffix="%" />
                    </div>
                    <NumberField label="Annual payment per RAF point" value={formState.opAnnualPaymentPerRaf}
                      onChange={v => update('opAnnualPaymentPerRaf', v)} placeholder="e.g. 10,000" suffix="$"
                      hint="from your MA contract — typically $8k–$12k per RAF point/year" />
                  </div>
                )}

                {settingId === "ed" && (
                  <div className="space-y-4">
                    <SectionDivider label="Deployment" />
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField label="ED physicians / APPs" value={formState.edProviders}
                        onChange={v => update('edProviders', v)} placeholder="e.g. 20" />
                      <NumberField label="Annual ED visits" value={formState.edVisits}
                        onChange={v => update('edVisits', v)} placeholder="e.g. 35,000" />
                    </div>

                    <SectionDivider label="Throughput & Revenue" />
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField label="Current LWBS rate" value={formState.edLwbsRate}
                        onChange={v => update('edLwbsRate', v)} placeholder="e.g. 2.5" suffix="%" />
                      <NumberField label="Revenue per ED visit" value={formState.edRevenuePerVisit}
                        onChange={v => update('edRevenuePerVisit', v)} placeholder="e.g. 800" suffix="$" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField label="% LWBS patients admitted" value={formState.edAdmissionRate}
                        onChange={v => update('edAdmissionRate', v)} placeholder="e.g. 15" suffix="%"
                        hint="of recovered patients who end up admitted" />
                      <NumberField label="Revenue per admission" value={formState.edAdmissionRevenue}
                        onChange={v => update('edAdmissionRevenue', v)} placeholder="e.g. 12,000" suffix="$" />
                    </div>

                    <SectionDivider label="Workforce" />
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField label="Annual provider turnover" value={formState.edTurnoverRate}
                        onChange={v => update('edTurnoverRate', v)} placeholder="e.g. 6" suffix="%" />
                      <NumberField label="Cost to replace one provider" value={formState.edReplacementCost}
                        onChange={v => update('edReplacementCost', v)} placeholder="e.g. 350,000" suffix="$" />
                    </div>
                  </div>
                )}

                {settingId === "inpatient" && (
                  <div className="space-y-4">
                    <SectionDivider label="Deployment" />
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField label="Hospitalists" value={formState.ipProviders}
                        onChange={v => update('ipProviders', v)} placeholder="e.g. 15" />
                      <NumberField label="Annual admissions" value={formState.ipAdmissions}
                        onChange={v => update('ipAdmissions', v)} placeholder="e.g. 5,000" />
                    </div>

                    <SectionDivider label="Obs/IP Status Defense" />
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField label="Obs/IP status denial rate" value={formState.ipDenialRate}
                        onChange={v => update('ipDenialRate', v)} placeholder="e.g. 5" suffix="%" />
                      <NumberField label="Avg claim value at risk" value={formState.ipAvgClaimValue}
                        onChange={v => update('ipAvgClaimValue', v)} placeholder="e.g. 10,000" suffix="$"
                        hint="avg $ of claims where Obs vs IP status is disputed" />
                    </div>

                    <SectionDivider label="DRG Accuracy / CC-MCC Capture" />
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField label="DRG at-risk rate" value={formState.ipDrgAtRiskRate}
                        onChange={v => update('ipDrgAtRiskRate', v)} placeholder="e.g. 18" suffix="%"
                        hint="% of admissions with documentation gaps" />
                      <NumberField label="DRG weight increase" value={formState.ipDrgWeightIncrease}
                        onChange={v => update('ipDrgWeightIncrease', v)} placeholder="e.g. 0.4" step="0.1"
                        hint="avg weight lift when CC/MCC is captured" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField label="Base DRG payment" value={formState.ipDrgBasePayment}
                        onChange={v => update('ipDrgBasePayment', v)} placeholder="e.g. 6,000" suffix="$"
                        hint="hospital-specific base rate" />
                    </div>

                    <SectionDivider label="CDI Query Reduction" />
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField label="CDI query rate" value={formState.ipCdiQueryRate}
                        onChange={v => update('ipCdiQueryRate', v)} placeholder="e.g. 30" suffix="%"
                        hint="% of admissions generating CDI queries" />
                      <NumberField label="Cost per CDI query" value={formState.ipCdiCostPerQuery}
                        onChange={v => update('ipCdiCostPerQuery', v)} placeholder="e.g. 50" suffix="$" />
                    </div>

                    <SectionDivider label="Concurrent Review / Continued Stay" />
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField label="Concurrent review rate" value={formState.ipConcurrentReviewRate}
                        onChange={v => update('ipConcurrentReviewRate', v)} placeholder="e.g. 45" suffix="%"
                        hint="% of cases reviewed by payer" />
                      <NumberField label="Concurrent denial rate" value={formState.ipConcurrentDenialRate}
                        onChange={v => update('ipConcurrentDenialRate', v)} placeholder="e.g. 8" suffix="%"
                        hint="% of reviews resulting in doc-sensitive denials" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField label="Avg continued-stay days" value={formState.ipConcurrentAvgDays}
                        onChange={v => update('ipConcurrentAvgDays', v)} placeholder="e.g. 1.5" step="0.1"
                        hint="average days protected per defended stay" />
                      <NumberField label="Daily rate" value={formState.ipConcurrentDailyRate}
                        onChange={v => update('ipConcurrentDailyRate', v)} placeholder="e.g. 2,800" suffix="$"
                        hint="hospital daily revenue rate" />
                    </div>

                    <SectionDivider label="Workforce" />
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField label="Annual hospitalist turnover" value={formState.ipTurnoverRate}
                        onChange={v => update('ipTurnoverRate', v)} placeholder="e.g. 8" suffix="%" />
                      <NumberField label="Cost to replace one hospitalist" value={formState.ipReplacementCost}
                        onChange={v => update('ipReplacementCost', v)} placeholder="e.g. 300,000" suffix="$" />
                    </div>
                  </div>
                )}

                {settingId === "nursing" && (
                  <div className="space-y-4">
                    <SectionDivider label="Deployment" />
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField label="Nurse FTEs" value={formState.nursingFTEs}
                        onChange={v => update('nursingFTEs', v)} placeholder="e.g. 300" />
                      <NumberField label="Staffed beds" value={formState.nursingStaffedBeds}
                        onChange={v => update('nursingStaffedBeds', v)} placeholder="e.g. 200" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField label="Occupancy rate" value={formState.nursingOccupancyRate}
                        onChange={v => update('nursingOccupancyRate', v)} placeholder="e.g. 75" suffix="%" />
                      <NumberField label="OT hours / nurse / week" value={formState.nursingOtHoursPerWeek}
                        onChange={v => update('nursingOtHoursPerWeek', v)} placeholder="e.g. 4" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField label="OT hourly rate" value={formState.nursingOtHourlyRate}
                        onChange={v => update('nursingOtHourlyRate', v)} placeholder="e.g. 75" suffix="$/hr" />
                      <NumberField label="Annual nurse turnover" value={formState.nursingTurnoverRate}
                        onChange={v => update('nursingTurnoverRate', v)} placeholder="e.g. 18" suffix="%" />
                    </div>
                    <NumberField label="Cost to replace one nurse" value={formState.nursingReplacementCost}
                      onChange={v => update('nursingReplacementCost', v)} placeholder="e.g. 56,000" suffix="$"
                      hint="recruiting + training + agency fill — typically $40k–$75k" />

                    <SectionDivider label="Quality metrics · optional, if you track these" />
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField label="HAPI rate / 1k pt days" value={formState.hapiRate}
                        onChange={v => update('hapiRate', v)} placeholder="e.g. 1.5" step="0.1" />
                      <NumberField label="Falls rate / 1k pt days" value={formState.fallRate}
                        onChange={v => update('fallRate', v)} placeholder="e.g. 2.0" step="0.1" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField label="CAUTI rate / 1k" value={formState.cautiRate}
                        onChange={v => update('cautiRate', v)} placeholder="e.g. 1.8" step="0.1" />
                      <NumberField label="CLABSI rate / 1k" value={formState.clabsiRate}
                        onChange={v => update('clabsiRate', v)} placeholder="e.g. 0.8" step="0.1" />
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
            <button onClick={handleDownloadPDF} disabled={!hasMinimum || pdfLoading}
              className={`w-full inline-flex items-center justify-center gap-2 h-14 rounded-xl font-semibold text-sm transition-all ${
                hasMinimum ? "bg-[#1A1A1A] hover:bg-[#333333] text-white" : "bg-[#F0EBE5] text-[#C4BDB6] cursor-not-allowed"
              }`}
              data-testid="button-download-pdf-intake"
            >
              <Download className="w-4 h-4" />
              {pdfLoading ? "Generating…" : "Download PDF"}
            </button>
            <p className="text-xs text-[#BBBBBB] text-center mt-2">Share this with your Abridge team before the call</p>
            {!hasMinimum && (
              <p className="text-xs text-[#BBBBBB] mt-3 text-center">Enter at least one provider or FTE count to continue.</p>
            )}
          </motion.div>
        )}

        {hasAnyData && (
          <div className="text-center pt-1">
            <button onClick={handleClearAll}
              className="inline-flex items-center gap-1.5 text-xs text-[#BBBBBB] hover:text-red-400 transition-colors"
              data-testid="button-clear-intake"
            >
              <Trash2 className="w-3 h-3" /> Clear my answers
            </button>
          </div>
        )}

        <p className="text-center text-[11px] text-[#CCCCCC] pb-8 mt-4 max-w-sm mx-auto leading-relaxed">
          No account required. Your answers are saved in this browser tab only — nothing is stored on any server. Download the PDF before closing.
        </p>
      </div>
    </div>
  );
}
