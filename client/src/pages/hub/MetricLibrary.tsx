import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import { ATTAIN_MATRIX } from "@/pages/attain/preview/attainCells";
import { SOURCES, type MetricDef, type AttainCell } from "@/pages/attain/preview/attainContent";

/**
 * Metric Library — a reference surface: every metric we track to prove value,
 * what it measures, HOW it's calculated, and where to find it (the Epic / system
 * source). Built from the real Attain content (ATTAIN_MATRIX) so the library and
 * the plan can never drift. Reachable at ?metriclibrary=1 while it's built out;
 * the Planning · Metrics card stays "coming soon" until it's wired in.
 */

const SETTINGS = ["Outpatient", "ED", "Inpatient", "Nursing"] as const;
const SETTING_LABEL: Record<string, string> = { Outpatient: "Outpatient", ED: "Emergency", Inpatient: "Inpatient", Nursing: "Nursing" };

// One-line "where to find it" for each source in the taxonomy.
const SOURCE_WHERE: Record<string, string> = {
  "Epic Signal": "Epic Signal, the provider-efficiency dashboard",
  "Epic Cadence": "Cadence scheduling reports",
  "Reporting Workbench": "a Reporting Workbench report",
  "Billing / claims": "your billing and claims system",
  "Provider survey": "a provider pulse survey",
  "Nurse survey": "a nurse pulse survey",
  "HRIS": "your HR system (turnover)",
  "Finance": "Finance and the GL",
  "Data warehouse (SQL)": "your data warehouse (SQL)",
  "Abridge platform": "the Abridge platform",
};

// How each metric is calculated, keyed by display name. Defensible, source-true
// definitions; metrics without an entry fall back to "what it measures" + where,
// so every row expands to something real (never a fabricated formula). Extend as
// coverage grows beyond the outpatient exemplar + the shared Epic signals.
const METRIC_CALC: Record<string, string> = {
  "Time in note": "The median minutes a clinician spends in the note per encounter: total time in notes divided by appointments, from Epic Signal, averaged across the provider group for the period.",
  "Work outside of work": "After-hours time in the EHR per scheduled day, Epic's \"time outside scheduled hours\" (pajama time), averaged per provider per day.",
  "Same-day note closure": "Notes closed on the same calendar day as the visit divided by total notes, from Epic Signal.",
  "Referral backlog": "The count of referred patients still sitting in the work queue waiting to be scheduled, from a Reporting Workbench report on the referral queue.",
  "Third-next-available": "The days until the third-next-available new-patient slot (the third avoids one-off openings), the standard access measure, from Cadence.",
  "New-patient wait": "Average days from referral to the first scheduled appointment, from Cadence.",
  "No-show rate": "Scheduled visits where the patient didn't arrive divided by total scheduled visits, from Reporting Workbench.",
  "Recovered visits": "No-show or open slots refilled from the waitlist over the period, counted from Reporting Workbench.",
  "Active panel size": "Patients attributed to the panel (empanelment) at period end, from Reporting Workbench.",
  "Net-new visits": "New-patient visits added from freed capacity versus your baseline period, from Reporting Workbench.",
  "Note completeness": "Share of encounters where the note captures what was actually done to the level coding needs, sampled from the Abridge platform.",
  "Diagnosis specificity": "Share of diagnoses documented to the specificity the code set requires (e.g., laterality, acuity), from the Abridge platform.",
  "Documentation adoption": "Eligible notes created through Abridge divided by total eligible notes, from the Abridge platform.",
  "E/M below supported level": "Share of visits billed at an E/M level below what the documentation supports, from billing/claims compared against the documented complexity.",
  "Level-of-service mix": "The average evaluation-and-management level billed across the book (the distribution of 99212 to 99215), from billing/claims.",
  "HCC recapture rate": "Of the HCC conditions a patient carried that remain clinically active, the share recaptured (re-documented and coded) this year: recaptured divided by eligible, from claims.",
  "Condition capture completeness": "Share of conditions addressed at the visit that make it onto the coded claim, from claims.",
  "Medical-necessity denial rate": "Claims denied for medical necessity divided by total claims, from billing/claims.",
  "Denials recovered": "Denied revenue later recovered or prevented over the period, from billing/claims.",
  "Burnout pulse": "Share of clinicians reporting burnout on a short, repeated pulse survey (same items each round so the trend is comparable).",
  "Likelihood to stay": "Share of clinicians who say they intend to stay, from the same pulse survey.",
  "Voluntary turnover rate": "Clinicians who voluntarily left in the period divided by average headcount, annualized, from HRIS.",
  "Departures avoided": "Departures you'd expect to prevent versus your baseline turnover, from HRIS.",
};

const LBL = "text-[10px] font-extrabold tracking-[0.06em] uppercase text-[#8C8C8C]";

function SourcePill({ source }: { source: string }) {
  return (
    <span className="text-[11px] font-semibold text-[#565250] bg-[#F2ECE3] rounded-full px-2.5 py-1 whitespace-nowrap">
      {source}
    </span>
  );
}

function MetricRow({ m }: { m: MetricDef }) {
  const [open, setOpen] = useState(false);
  const calc = METRIC_CALC[m.name];
  const where = SOURCE_WHERE[m.source];
  return (
    <div className="border-b border-[#EFEAE2] last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-start justify-between gap-5 py-3.5 text-left group"
      >
        <div className="min-w-0">
          <div className="text-[14.5px] font-semibold text-[#1A1A1A] flex items-center gap-2">
            {m.name}
            {m.unit && <span className="text-[12px] font-normal text-[#9A9086]">{m.unit}</span>}
          </div>
          <div className="text-[13px] text-[#6B6B6B] leading-[1.5] mt-0.5">{m.measure}</div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <SourcePill source={m.source} />
          <ChevronDown className={`w-4 h-4 text-[#B4A896] transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>
      {open && (
        <div className="pb-4 pl-0 pr-8">
          <div className="rounded-xl bg-[#FAF7F2] border border-[#EFE9E0] px-4 py-3.5 space-y-3">
            {calc && (
              <div>
                <p className={`${LBL} mb-1`}>How it's calculated</p>
                <p className="text-[13px] text-[#3A3A3A] leading-[1.55]">{calc}</p>
              </div>
            )}
            <div>
              <p className={`${LBL} mb-1`}>Where to find it</p>
              <p className="text-[13px] text-[#3A3A3A] leading-[1.55]">{m.source}{where ? ` — ${where}` : ""}.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryBlock({ cell }: { cell: AttainCell }) {
  const label = cell.categoryLabel ?? cell.category;
  const outcomeGroups = cell.plan.outcomeGroups.filter((g) => g.metrics.length > 0);
  const card = "rounded-2xl border border-[#E8E2DA] bg-[#FDFBF8] shadow-[0_1px_2px_rgba(40,30,20,0.03)] px-6 py-4";
  return (
    <section className="mb-12">
      <div className="flex items-center gap-2.5 mb-4">
        <h2 className="font-abridge text-[22px] text-[#1A1A1A]">{label}</h2>
        {cell.proofOnly && (
          <span className="text-[10px] font-extrabold tracking-[0.06em] uppercase text-[#8A8072] bg-[#F2ECE3] rounded-full px-2.5 py-1">Tracked as proof</span>
        )}
      </div>

      {cell.plan.abridgeSignals.length > 0 && (
        <div className={`${card} mb-5`}>
          <p className={`${LBL} mb-1`}>What Abridge can enable · the signals</p>
          <div>{cell.plan.abridgeSignals.map((m) => <MetricRow key={m.id} m={m} />)}</div>
        </div>
      )}

      {outcomeGroups.length > 0 && (
        <div className={card}>
          <p className={`${LBL} mb-3`}>The outcomes it opens up</p>
          <div className="space-y-5">
            {outcomeGroups.map((g) => (
              <div key={g.outcome}>
                <p className="text-[12.5px] font-semibold text-[#EA2C00] mb-1">{g.outcome}</p>
                <div>{g.metrics.map((m) => <MetricRow key={m.id} m={m} />)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default function MetricLibrary({ onBack }: { onBack?: () => void }) {
  const [setting, setSetting] = useState<(typeof SETTINGS)[number]>("Outpatient");
  const cells = ATTAIN_MATRIX.filter((c) => c.setting === setting);
  // Only show sources actually used somewhere, so the legend stays honest.
  const usedSources = new Set<string>();
  for (const c of ATTAIN_MATRIX) {
    for (const m of c.plan.abridgeSignals) usedSources.add(m.source);
    for (const g of c.plan.outcomeGroups) for (const m of g.metrics) usedSources.add(m.source);
  }
  const legend = SOURCES.filter((s) => usedSources.has(s));

  return (
    <div className="min-h-screen bg-[#FFFFFF]">
      <UnifiedHeader pathType="forecast" pathLabel="Metric Library" onBack={onBack} />
      <div className="max-w-[880px] mx-auto px-5 sm:px-8 pt-[88px] md:pt-[96px] pb-16">
        <div className="text-[11px] font-extrabold tracking-[1.3px] uppercase text-[#565250]">Reference</div>
        <h1 className="font-abridge text-[30px] sm:text-[38px] text-[#1A1A1A] leading-tight mt-2">Metric Library</h1>
        <p className="text-[15.5px] text-[#565250] leading-relaxed max-w-[620px] mt-3">
          Every metric we track to prove value: what it measures, how it's calculated, and where to find it. Open any
          metric for its definition. The signals Abridge can move come straight from Epic; the outcomes they open up are
          pulled from the systems you already run.
        </p>

        {/* Where to find it — the source legend */}
        <div className="rounded-2xl border border-[#E8E2DA] bg-[#FAF7F2] px-6 py-5 mt-8">
          <p className={`${LBL} mb-3`}>Where to find it</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5">
            {legend.map((s) => (
              <div key={s} className="grid grid-cols-[150px_1fr] items-start gap-2.5">
                <span className="flex"><SourcePill source={s} /></span>
                <span className="text-[13px] text-[#6B6B6B] leading-[1.45] pt-0.5">{SOURCE_WHERE[s] ?? ""}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Setting filter */}
        <div className="flex items-center gap-2 flex-wrap mt-10 mb-8">
          {SETTINGS.map((s) => {
            const active = setting === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSetting(s)}
                className={`text-[13px] font-bold rounded-full px-4 py-2 transition-colors ${active ? "bg-[#2E2822] text-white" : "bg-[#F2ECE3] text-[#565250] hover:text-[#1A1A1A] hover:bg-[#ECE4D8]"}`}
              >
                {SETTING_LABEL[s]}
              </button>
            );
          })}
        </div>

        {cells.length ? cells.map((c) => <CategoryBlock key={c.category} cell={c} />) : (
          <p className="text-[14px] text-[#8C8C8C]">No metrics for this setting yet.</p>
        )}
      </div>
    </div>
  );
}
