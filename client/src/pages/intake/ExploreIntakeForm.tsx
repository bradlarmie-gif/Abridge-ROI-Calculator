import { useState } from "react";
import { Check, Copy, ClipboardCheck } from "lucide-react";
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

function NumberField({
  label, hint, value, onChange, placeholder = "0", suffix, min = 0, step,
}: {
  label: string; hint?: string; value: number | null; onChange: (v: number | null) => void;
  placeholder?: string; suffix?: string; min?: number; step?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {hint && <span className="ml-2 text-xs text-gray-400 font-normal">{hint}</span>}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="number" min={min} step={step} value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          placeholder={placeholder}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/30 focus:border-[#EA2C00]"
          data-testid={`input-intake-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
        />
        {suffix && <span className="text-sm text-gray-500 whitespace-nowrap">{suffix}</span>}
      </div>
    </div>
  );
}

export default function ExploreIntakeForm({ preseed }: ExploreIntakeFormProps) {
  const [form, setForm] = useState<ExploreIntakeResponse>({
    settings: preseed?.preSelectedSettings ?? [],
    providers: null, annualEncounters: null,
    opCurrentWrvu: null, opConversionFactor: null, opTurnoverRate: null,
    edLwbsRate: null, edTurnoverRate: null,
    ipTurnoverRate: null,
    nursingStaffedBeds: null, nursingOccupancyRate: null,
    nursingOtHoursPerWeek: null, nursingTurnoverRate: null,
    hapiRatePer1000: null, fallRatePer1000: null,
    cautiRatePer1000: null, clabsiRatePer1000: null,
  });
  const [copied, setCopied] = useState(false);

  const selectedSettings = form.settings;
  const isOutpatient = selectedSettings.includes("outpatient");
  const isED = selectedSettings.includes("ed");
  const isInpatient = selectedSettings.includes("inpatient");
  const isNursing = selectedSettings.includes("nursing");

  function toggleSetting(id: ExploreCareSetting) {
    setForm((prev) => ({
      ...prev,
      settings: prev.settings.includes(id)
        ? prev.settings.filter((s) => s !== id)
        : [...prev.settings, id],
    }));
  }

  function handleCopy() {
    navigator.clipboard.writeText(generateIntakeResponseUrl(form)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  const hasMinimum = form.settings.length > 0 && (form.providers !== null || form.annualEncounters !== null);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-xl mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-8 h-8 bg-[#EA2C00] rounded-md flex items-center justify-center">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <span className="text-lg font-semibold text-gray-900 tracking-tight">Abridge</span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2" data-testid="text-intake-title">Help us prepare for our call</h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          Share a few details about your organization before we connect. This takes about 2 minutes.
        </p>
      </div>

      <div className="w-full max-w-xl space-y-6">
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
            Which areas are you exploring Abridge for?
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {SETTINGS.map((s) => {
              const selected = form.settings.includes(s.id);
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

        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Your practice size</h2>
          <div className="grid grid-cols-2 gap-4">
            <NumberField label="Physicians / APPs" hint="estimate is fine" value={form.providers}
              onChange={(v) => setForm((p) => ({ ...p, providers: v }))} placeholder="e.g. 120" />
            <NumberField label="Patient encounters / year" hint="estimate" value={form.annualEncounters}
              onChange={(v) => setForm((p) => ({ ...p, annualEncounters: v }))} placeholder="e.g. 90,000" />
          </div>
        </div>

        {isOutpatient && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Outpatient benchmarks</h2>
            <div className="grid grid-cols-2 gap-4">
              <NumberField label="Average wRVU per encounter" value={form.opCurrentWrvu ?? null}
                onChange={(v) => setForm((p) => ({ ...p, opCurrentWrvu: v }))} placeholder="e.g. 1.8" step="0.1" />
              <NumberField label="$/wRVU conversion rate" hint="from your payer contract" value={form.opConversionFactor ?? null}
                onChange={(v) => setForm((p) => ({ ...p, opConversionFactor: v }))} placeholder="e.g. 33" />
              <NumberField label="Annual provider turnover" value={form.opTurnoverRate ?? null}
                onChange={(v) => setForm((p) => ({ ...p, opTurnoverRate: v }))} placeholder="e.g. 6" suffix="%" />
            </div>
          </div>
        )}

        {isED && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Emergency department</h2>
            <div className="grid grid-cols-2 gap-4">
              <NumberField label="Current LWBS rate" value={form.edLwbsRate ?? null}
                onChange={(v) => setForm((p) => ({ ...p, edLwbsRate: v }))} placeholder="e.g. 3" suffix="%" />
              <NumberField label="Annual provider turnover" value={form.edTurnoverRate ?? null}
                onChange={(v) => setForm((p) => ({ ...p, edTurnoverRate: v }))} placeholder="e.g. 6" suffix="%" />
            </div>
          </div>
        )}

        {isInpatient && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Inpatient / Hospital Medicine</h2>
            <div className="grid grid-cols-2 gap-4">
              <NumberField label="Annual hospitalist turnover" value={form.ipTurnoverRate ?? null}
                onChange={(v) => setForm((p) => ({ ...p, ipTurnoverRate: v }))} placeholder="e.g. 8" suffix="%" />
            </div>
          </div>
        )}

        {isNursing && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Nursing operations</h2>
            <div className="grid grid-cols-2 gap-4">
              <NumberField label="Staffed beds" value={form.nursingStaffedBeds ?? null}
                onChange={(v) => setForm((p) => ({ ...p, nursingStaffedBeds: v }))} placeholder="e.g. 200" />
              <NumberField label="Occupancy rate" value={form.nursingOccupancyRate ?? null}
                onChange={(v) => setForm((p) => ({ ...p, nursingOccupancyRate: v }))} placeholder="e.g. 75" suffix="%" />
              <NumberField label="Overtime hours per nurse per week" value={form.nursingOtHoursPerWeek ?? null}
                onChange={(v) => setForm((p) => ({ ...p, nursingOtHoursPerWeek: v }))} placeholder="e.g. 4" />
              <NumberField label="Annual nurse turnover rate" value={form.nursingTurnoverRate ?? null}
                onChange={(v) => setForm((p) => ({ ...p, nursingTurnoverRate: v }))} placeholder="e.g. 18" suffix="%" />
            </div>
          </div>
        )}

        {isNursing && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-1">
              Quality metrics <span className="ml-2 text-xs text-gray-400 font-normal normal-case">optional — if you track these</span>
            </h2>
            <p className="text-xs text-gray-500 mb-4">If you track any of these, enter your current rates.</p>
            <div className="grid grid-cols-2 gap-4">
              <NumberField label="HAPI rate" hint="per 1,000 patient days" value={form.hapiRatePer1000 ?? null}
                onChange={(v) => setForm((p) => ({ ...p, hapiRatePer1000: v }))} placeholder="e.g. 1.5" step="0.1" />
              <NumberField label="Patient fall rate" hint="per 1,000 patient days" value={form.fallRatePer1000 ?? null}
                onChange={(v) => setForm((p) => ({ ...p, fallRatePer1000: v }))} placeholder="e.g. 2.0" step="0.1" />
              <NumberField label="CAUTI rate" hint="per 1,000 catheter days" value={form.cautiRatePer1000 ?? null}
                onChange={(v) => setForm((p) => ({ ...p, cautiRatePer1000: v }))} placeholder="e.g. 1.8" step="0.1" />
              <NumberField label="CLABSI rate" hint="per 1,000 CL days" value={form.clabsiRatePer1000 ?? null}
                onChange={(v) => setForm((p) => ({ ...p, clabsiRatePer1000: v }))} placeholder="e.g. 0.8" step="0.1" />
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm text-center">
          <button onClick={handleCopy} disabled={!hasMinimum}
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all ${
              hasMinimum ? copied ? "bg-green-500 text-white" : "bg-[#EA2C00] hover:bg-[#c92500] text-white"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
            data-testid="button-copy-intake"
          >
            {copied ? <><ClipboardCheck className="w-4 h-4" /> Copied to clipboard!</>
              : <><Copy className="w-4 h-4" /> Copy my answers</>}
          </button>
          {!hasMinimum && <p className="text-xs text-gray-400 mt-2">Select at least one care setting and enter a provider or encounter count to continue.</p>}
          {hasMinimum && !copied && <p className="text-xs text-gray-500 mt-2">Paste this link and send it back to your Abridge contact.</p>}
          {copied && <p className="text-xs text-green-600 mt-2">Send this link to your Abridge contact — they'll use it to prep for your call.</p>}
        </div>

        <p className="text-center text-xs text-gray-400 pb-8">
          No account required. Your answers are encoded in the link — nothing is stored on any server.
        </p>
      </div>
    </div>
  );
}
