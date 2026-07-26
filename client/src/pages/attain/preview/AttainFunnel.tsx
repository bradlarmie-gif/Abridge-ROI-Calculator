import { Check } from "lucide-react";
import type { AttainSetting, GoalId } from "@/lib/attain/attainTypes";
import type { AttainBaseline } from "@/lib/attain/attainLevers";

/**
 * THROWAWAY. Editorial funnel steps for the new Attain experience: setting →
 * categories → starting point. Styled to match the experience (hairline cards,
 * tan hover, coral only on selection) so the whole flow is one system.
 */

const LBL = "text-[10px] font-bold uppercase tracking-[2px] text-[#EA2C00]";
const H2 = "font-abridge text-[30px] md:text-4xl text-[#1A1A1A] leading-tight";
const HELP = "text-[15px] text-[#3A3A3A] leading-relaxed max-w-[620px]";

const SETTINGS: { id: AttainSetting; label: string; sub: string; desc: string }[] = [
  { id: "outpatient", label: "Outpatient", sub: "Primary care & specialty", desc: "Panel access, wRVU capture, and provider retention across clinics." },
  { id: "ed", label: "Emergency", sub: "Emergency department", desc: "Throughput, LWBS recovery, coding accuracy, and provider retention." },
  { id: "inpatient", label: "Inpatient", sub: "Hospital medicine", desc: "DRG accuracy, CDI turnaround, and hospitalist retention." },
  { id: "nursing", label: "Nursing", sub: "Inpatient nursing", desc: "Bundle compliance, preventable harm, and nurse retention." },
];

const SETTING_GOALS: Record<AttainSetting, GoalId[]> = {
  outpatient: ["access", "retention", "revenue"],
  ed: ["access", "retention", "revenue"],
  inpatient: ["revenue", "retention"],
  nursing: ["quality", "retention", "capacity"],
};
const GOAL_INFO: Record<GoalId, { label: string; desc: string }> = {
  access: { label: "Patient Access", desc: "Open room to see more patients from the time freed up." },
  retention: { label: "Provider Retention", desc: "Keep the people you have, with a lighter day." },
  revenue: { label: "Revenue Capture", desc: "Bill accurately for care you already delivered." },
  quality: { label: "Quality & Safety", desc: "Fewer harm events from time back at the bedside." },
  capacity: { label: "Nursing Capacity", desc: "Cut the documentation-driven overtime." },
};

const cardCls = (sel: boolean) =>
  `text-left rounded-2xl border p-5 transition-colors ${sel ? "border-[#EA2C00] bg-[#FBE7E1]/50" : "border-[#E8E2DA] hover:bg-[#F2EDE5] hover:border-[#E7E0D6]"}`;

export function SettingStep({ selected, onSelect }: { selected: AttainSetting | null; onSelect: (s: AttainSetting) => void }) {
  return (
    <div>
      <p className={`${LBL} mb-2`}>Step 1 · Where does this plan live?</p>
      <h2 className={`${H2} mb-3`}>Pick the care setting</h2>
      <p className={`${HELP} mb-8`}>Every plan is scoped to one care setting, because the goals, the value chain, and the benchmarks all change with it. You can build a separate plan for another setting later.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {SETTINGS.map((s) => {
          const sel = selected === s.id;
          return (
            <button key={s.id} type="button" onClick={() => onSelect(s.id)} className={cardCls(sel)}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={`font-abridge text-[21px] leading-none ${sel ? "text-[#EA2C00]" : "text-[#1A1A1A]"}`}>{s.label}</p>
                  <p className="text-[12px] text-[#8C8C8C] mt-1.5">{s.sub}</p>
                </div>
                {sel && <Check className="w-4 h-4 text-[#EA2C00] flex-shrink-0 mt-1" strokeWidth={2.5} />}
              </div>
              <p className="text-[13px] text-[#6B6B6B] mt-3 leading-snug">{s.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CategoryStep({ setting, selected, onToggle }: { setting: AttainSetting; selected: GoalId[]; onToggle: (g: GoalId) => void }) {
  const goals = SETTING_GOALS[setting];
  return (
    <div>
      <p className={`${LBL} mb-2`}>Step 2 · What are you after?</p>
      <h2 className={`${H2} mb-3`}>Pick your value categories</h2>
      <p className={`${HELP} mb-8`}>A health system rarely wants just one thing. Pick every category that matters this year, one or more. Each becomes its own thread through the plan.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {goals.map((g) => {
          const info = GOAL_INFO[g];
          const sel = selected.includes(g);
          return (
            <button key={g} type="button" onClick={() => onToggle(g)} className={cardCls(sel)}>
              <div className="flex items-start justify-between gap-3">
                <p className={`font-abridge text-[20px] leading-none ${sel ? "text-[#EA2C00]" : "text-[#1A1A1A]"}`}>{info.label}</p>
                <span className={`grid place-items-center w-[18px] h-[18px] rounded-[5px] border-[1.5px] flex-shrink-0 ${sel ? "bg-[#EA2C00] border-[#EA2C00]" : "border-[#CFC6B8] bg-white"}`}>
                  {sel && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </span>
              </div>
              <p className="text-[13px] text-[#6B6B6B] mt-3 leading-snug">{info.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const NUMFIELD =
  "w-32 bg-transparent border-0 border-b-2 border-[#E0D9CE] rounded-none px-0 pb-1 font-abridge text-2xl text-[#1A1A1A] outline-none transition-colors focus:border-[#EA2C00] placeholder:font-sans placeholder:text-[15px] placeholder:text-[#C4BCB0]";

export function ScopeStep({ setting, baseline, onChange }: { setting: AttainSetting; baseline: AttainBaseline; onChange: (patch: Partial<AttainBaseline>) => void }) {
  const isNursing = setting === "nursing";
  const fields: { key: keyof AttainBaseline; label: string; unit: string; ph: string }[] = isNursing
    ? [
        { key: "staffedBeds", label: "Staffed beds", unit: "beds", ph: "e.g., 180" },
        { key: "nursingFtes", label: "Nurses", unit: "FTEs", ph: "e.g., 260" },
        { key: "dailyCensus", label: "Average daily census", unit: "patients", ph: "e.g., 150" },
        { key: "adoptionPct", label: "On Abridge", unit: "%", ph: "e.g., 70" },
      ]
    : [
        { key: "providers", label: "Providers in scope", unit: "providers", ph: "e.g., 40" },
        { key: "annualEncounters", label: "Annual visits", unit: "visits / yr", ph: "e.g., 132,000" },
        { key: "utilizationPct", label: "On Abridge", unit: "%", ph: "e.g., 70" },
      ];
  const num = (s: string) => { const n = parseFloat((s || "").replace(/[^0-9.]/g, "")); return Number.isFinite(n) ? n : undefined; };
  return (
    <div>
      <p className={`${LBL} mb-2`}>Step 3 · Your starting point</p>
      <h2 className={`${H2} mb-3`}>The numbers we'll size it from</h2>
      <p className={`${HELP} mb-10`}>A few real figures from your world. Everything downstream, the value in play and the attainment, is built from these, not from a benchmark.</p>
      <div className="space-y-8 max-w-[520px]">
        {fields.map((f) => (
          <div key={f.key} className="flex items-baseline justify-between gap-4 border-b border-[#E8E2DA] pb-2">
            <label className="text-[15px] text-[#1A1A1A]">{f.label}</label>
            <div className="flex items-baseline gap-2">
              <input
                value={baseline[f.key] ?? ""}
                onChange={(e) => onChange({ [f.key]: num(e.target.value) } as Partial<AttainBaseline>)}
                placeholder={f.ph}
                className={NUMFIELD}
              />
              <span className="text-[13px] text-[#8C8C8C] w-20">{f.unit}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
