import abridgeLogo from "@assets/abridge-logo-wordmark-red_1769020684647.png";
import abridgeSymbol from "@assets/abridge-logo-symbol_1774906992195.png";
import AttainPdfPage1, { fmtDollars as fmt$, type PdfData, type PdfMode } from "./AttainPdfPage1";
import { buildFromSnapshot, type PlanCat } from "./attainPdfData";
import { loadSnapshot } from "../attainStorage";

/**
 * THROWAWAY proof (?attainpdf=1). The full Attain PDF: Cover → Page 1 (the case) →
 * Plan pages → Proof pages, one consistent editorial family (cream / coral / abridge).
 * Each page is a fixed Letter box (816×1056) with break-after:page; category blocks
 * flow across pages and never split (2 per page). Sample data; wires to live state later.
 */

const CORAL = "#EA2C00";
const LBL = "text-[10.5px] font-bold uppercase tracking-[2.5px] text-[#8C8C8C]";

type Signal = { name: string; today: string; target: string; unit: string; source: string };

const PARTNER = "Deaconess Health System";
const SETTING = "Outpatient";
const DATE = "July 2026";

// Page-1 case data (all three categories; Revenue off)
const CASE: PdfData = {
  partner: PARTNER, setting: SETTING, date: DATE, preparedWith: "Dana Ruiz · Ambulatory Access Director",
  total: 729_000,
  categories: [
    { name: "Patient Access", value: 549_000, realized: 210_000, note: "Filling freed-time headroom at $220 a visit", opens: ["Take on a new contract or payer", "Keep a service line whole"], entered: true },
    { name: "Provider Retention", value: 180_000, realized: 38_000, note: "Preventing the burnout-driven share of turnover", opens: ["Protect a fragile service line", "Wind down agency spend"], entered: true },
    { name: "Revenue Capture", value: 0, note: "", opens: [], entered: false },
  ],
  chain: [
    { value: "140,000", label: "visits a year" },
    { value: "2 min", label: "saved per note" },
    { value: "25%", label: "of headroom filled" },
    { value: "$220", label: "margin a visit" },
  ],
  review: {
    label: "Review 4 · Jul 2026",
    attainmentPct: 34,
    realized: 248_000,
    climb: [{ label: "Kickoff", pct: 0 }, { label: "Oct", pct: 10 }, { label: "Jan", pct: 21 }, { label: "Apr", pct: 29 }, { label: "Now", pct: 34 }],
    read: "On pace on Patient Access. Provider Retention is behind its signals: the day is lighter, but the turnover hasn't followed yet.",
  },
};

const MODE: PdfMode = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("attainpdf") === "review" ? "review" : "kickoff";

// Plan + Proof detail for the entered categories
const PLAN: PlanCat[] = [
  {
    name: "Patient Access",
    owner: { name: "Dana Ruiz", role: "Ambulatory Access Director" },
    cadence: "Quarterly",
    signals: [
      { name: "Time in note", today: "9.5", target: "5.5", unit: "min", source: "Epic Signal" },
      { name: "Work outside of work", today: "48", target: "25", unit: "min/day", source: "Epic Signal" },
      { name: "Same-day note closure", today: "62", target: "88", unit: "%", source: "Epic Signal" },
    ],
    outcomes: [
      { name: "Referral backlog", today: "1,900", target: "600", unit: "patients", source: "Scheduling worklist" },
      { name: "Third-next-available", today: "14", target: "7", unit: "days", source: "Scheduling system" },
      { name: "New-patient wait", today: "31", target: "18", unit: "days", source: "Scheduling system" },
    ],
    chain: ["Lighter notes", "Freed clinician time", "Visit headroom", "25% of it filled, at $220 margin"],
    assumptions: [
      { label: "Minutes saved per note", value: "2 min" },
      { label: "Minutes per visit", value: "30 min" },
      { label: "Headroom filled", value: "25%" },
      { label: "Margin per visit", value: "$220" },
    ],
    honesty: "Counted once, at margin, never charges. Minutes saved is measured on Progress, not assumed forever, and the fill rate is capped so we never claim all the headroom.",
    opens: [
      { title: "Take on a new contract or payer", desc: "Access headroom you can commit to in a deal you can't take today." },
      { title: "Keep a service line whole", desc: "Stop referrals leaking out to competitors for lack of a slot." },
      { title: "Meet an access standard", desc: "A board or system promise on wait times you have to hit." },
    ],
  },
  {
    name: "Provider Retention",
    owner: { name: "Dr. Alan Mercer", role: "Chief Medical Officer" },
    cadence: "Quarterly",
    signals: [
      { name: "Time in note", today: "9.5", target: "5.5", unit: "min", source: "Epic Signal" },
      { name: "Work outside of work", today: "48", target: "25", unit: "min/day", source: "Epic Signal" },
      { name: "After-hours charting", today: "71", target: "40", unit: "%", source: "Epic Signal" },
    ],
    outcomes: [
      { name: "Annual turnover", today: "6.0", target: "5.0", unit: "%", source: "HRIS" },
      { name: "Agency & locum spend", today: "1.4", target: "0.9", unit: "$M/yr", source: "Finance" },
    ],
    chain: ["Lighter day", "Less burnout-driven turnover", "Fewer departures, at $400K to replace", "Less agency spend to cover gaps"],
    assumptions: [
      { label: "Annual turnover", value: "6%" },
      { label: "Burnout-driven share", value: "40%" },
      { label: "Expected to prevent", value: "30%" },
      { label: "Cost to replace one", value: "$400K" },
    ],
    honesty: "Turnover has many causes. We only count the burnout-driven share a lighter day can move, and only the fraction of that you expect to prevent.",
    opens: [
      { title: "Protect a fragile service line", desc: "One or two departures away from a real coverage problem." },
      { title: "Wind down agency and locum spend", desc: "Stop paying premium rates to cover gaps." },
      { title: "Keep institutional knowledge", desc: "The people who know how your place actually runs." },
    ],
  },
];

function PdfPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="pdf-page mx-auto bg-[#FDFCFA] text-[#1A1A1A]" style={{ width: 816, height: 1056, breakAfter: "page" }}>
      <div className="flex flex-col h-full px-[62px] pt-[46px] pb-[40px]">{children}</div>
    </div>
  );
}

function Mast({ section, partner, setting, date }: { section: string; partner: string; setting: string; date: string }) {
  return (
    <>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-[16px]">
          <img src={abridgeLogo} alt="Abridge" className="h-[18px] w-auto" />
          <span className="h-[18px] w-px bg-[#D8CFC0]" />
          <span className={LBL}>{section}</span>
        </div>
        <div className="text-right">
          <p className="font-abridge text-[14px] text-[#1A1A1A] leading-tight">{partner}</p>
          <p className="text-[10.5px] text-[#8C8C8C] mt-[2px]">{setting} · {date}</p>
        </div>
      </div>
      <div className="h-px bg-[#EFEAE1] mt-[16px] mb-[24px]" />
    </>
  );
}

function Foot({ page, partner }: { page: number; partner: string }) {
  return (
    <div className="flex items-center justify-between mt-[16px]">
      <p className="text-[10px] text-[#B4A896]">Value Attainment Plan · {partner}</p>
      <p className="text-[10px] uppercase tracking-[1.5px] text-[#B4A896]">Abridge · Page {page}</p>
    </div>
  );
}

function MetricRow({ s, accent }: { s: Signal; accent?: boolean }) {
  return (
    <div className="py-[9px] border-b border-[#EFEAE1] last:border-b-0">
      <div className="flex items-baseline justify-between gap-[10px]">
        <span className="text-[13px] text-[#1A1A1A] leading-snug min-w-0">{s.name}</span>
        {/* fixed column grid so today / target / unit align straight down every row */}
        <span className="grid items-baseline gap-x-[5px] shrink-0 text-[12px]" style={{ gridTemplateColumns: "2.2rem 0.6rem 2.2rem 3.4rem" }}>
          <span className="text-right tabular-nums text-[#8C8C8C]">{s.today}</span>
          <span className="text-center text-[#C4BCB0]">&rarr;</span>
          <span className="text-right tabular-nums font-medium" style={{ color: accent ? CORAL : "#1A1A1A" }}>{s.target}</span>
          <span className="text-left text-[#8C8C8C] whitespace-nowrap">{s.unit}</span>
        </span>
      </div>
      <p className="text-[9px] uppercase tracking-[1px] text-[#B4A896] mt-[3px]">{s.source}</p>
    </div>
  );
}

// ---- Report cover (universal, matched to Explore/Proforma) ----
function ReportCover({ data }: { data: PdfData }) {
  const subtitle = `${data.categories.length} value categories · ${data.setting}`;
  return (
    <div style={{ width: 816, height: 1056, background: "#FFFFFF", breakAfter: "page", position: "relative", overflow: "hidden" }}>
      <img src={abridgeLogo} alt="Abridge" style={{ position: "absolute", top: 60, left: 64, width: 120 }} />
      <img src={abridgeSymbol} alt="" style={{ position: "absolute", bottom: 92, right: 10, width: 340, opacity: 0.06 }} />
      <div style={{ position: "absolute", inset: 0, padding: "0 64px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ fontSize: 11, color: "#666666", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 16 }}>
          Value Attainment Plan
        </div>
        <h1 className="font-abridge" style={{ fontSize: 48, lineHeight: 1.12, color: "#1A1A1A", letterSpacing: "-0.5px", margin: "0 0 20px", maxWidth: 620 }}>
          {data.partner}
        </h1>
        <div style={{ width: 80, height: 3, background: "#EA2C00", marginBottom: 24 }} />
        <div style={{ fontSize: 17, color: "#666666", marginBottom: 44 }}>{subtitle}</div>
        <div style={{ fontSize: 10, color: "#999999", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 6 }}>
          Prepared by
        </div>
        <div style={{ fontSize: 14, color: "#666666" }}>Abridge · {data.date}</div>
      </div>
      <div style={{ position: "absolute", bottom: 44, left: 64, right: 64, borderTop: "1px solid #E0E0E0", paddingTop: 12 }}>
        <div style={{ fontSize: 10.5, color: "#999999", lineHeight: 1.5 }}>
          This plan is for planning purposes. Every figure is built from partner-provided inputs, and results depend on
          adoption and how teams act on what the documentation surfaces.
        </div>
      </div>
    </div>
  );
}

// ---- Cover (the pitch) ----
function Cover({ data }: { data: PdfData }) {
  const entered = data.categories.filter((c) => c.entered).length;
  return (
    <PdfPage>
      <div className="flex flex-col h-full">
        <img src={abridgeLogo} alt="Abridge" className="h-[22px] w-auto self-start" />

        <div className="mt-[72px]">
          <p className="text-[11px] font-bold uppercase tracking-[3px]" style={{ color: CORAL }}>Value Attainment Plan</p>
          <h1 className="font-abridge text-[#1A1A1A] leading-[1.02] mt-[16px]" style={{ fontSize: 56 }}>
            What we agreed to,<br />and how we'll prove it.
          </h1>
          <p className="text-[15px] text-[#3A3A3A] mt-[18px] max-w-[560px] leading-relaxed">
            A living plan for {data.partner}. Every number is built from your own operation, and every review measures it against the promise.
          </p>
        </div>

        {/* value teaser band */}
        <div className="mt-[40px] flex items-end gap-[40px]">
          <div>
            <p className={LBL}>The value in play</p>
            <p className="font-abridge leading-[0.9] mt-[6px]" style={{ fontSize: 64, color: CORAL }}>{fmt$(data.total)}<span className="text-[20px] text-[#8C8C8C] font-normal"> / year</span></p>
          </div>
          <p className="text-[13px] text-[#3A3A3A] leading-relaxed pb-[10px] max-w-[280px]">Across {entered} of {data.categories.length} categories, reviewed quarterly against what you actually realize.</p>
        </div>

        {/* inside this plan — orients the reader + fills the middle */}
        <div className="mt-[44px]">
          <p className={LBL}>Inside this plan</p>
          <div className="mt-[14px] max-w-[600px]">
            {[["The case", "What it's worth, built entirely from your own numbers"], ["The plan", "Who owns each category, and the signals and outcomes we measure"], ["The proof", "The chain from documentation to dollar, and every assumption behind it"]].map(([t, d]) => (
              <div key={t} className="flex items-baseline gap-[18px] border-b border-[#EFEAE1] py-[11px]">
                <span className="font-abridge text-[15px] text-[#1A1A1A] w-[96px] shrink-0">{t}</span>
                <span className="text-[12.5px] text-[#8C8C8C]">{d}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-auto">
          <div className="h-px bg-[#EFEAE1] mb-[18px]" />
          <div className="flex items-end justify-between">
            <div className="flex gap-[44px]">
              <div><p className={LBL}>Organization</p><p className="font-abridge text-[15px] mt-[4px]">{data.partner}</p></div>
              <div><p className={LBL}>Care setting</p><p className="font-abridge text-[15px] mt-[4px]">{data.setting}</p></div>
              {data.preparedWith && <div><p className={LBL}>Prepared with</p><p className="font-abridge text-[15px] mt-[4px]">{data.preparedWith.split(" · ")[0]}</p></div>}
            </div>
            <p className="text-[11px] text-[#8C8C8C]">{data.date}</p>
          </div>
          <p className="text-[10px] text-[#B4A896] mt-[14px]">Powered by Abridge · abridge.com · Built from partner-provided inputs; results depend on adoption and how teams act on what the documentation surfaces.</p>
        </div>
      </div>
    </PdfPage>
  );
}

// ---- Category spread: one full page = plan + proof for a single category ----
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-[2px] text-[#B4A896] mb-[14px]">{children}</p>;
}

function CategoryPage({ c, page, idx, total, data }: { c: PlanCat; page: number; idx: number; total: number; data: PdfData }) {
  return (
    <PdfPage>
      <Mast section={`The Plan · ${idx} of ${total} categories`} partner={data.partner} setting={data.setting} date={data.date} />
      <div className="flex-1 flex flex-col">
        {/* header */}
        <div className="flex items-baseline justify-between mb-[6px]">
          <h2 className="font-abridge text-[36px] text-[#1A1A1A] leading-none">{c.name}</h2>
          <p className="text-[13px] text-[#8C8C8C]"><span className="font-abridge text-[16px] text-[#1A1A1A]">{c.owner.name}</span> · {c.owner.role}</p>
        </div>
        <div className="h-[2px] bg-[#1A1A1A]" />

        {/* what we measure */}
        <div className="mt-[30px] grid grid-cols-2 gap-[46px]">
          <div>
            <SectionLabel>What Abridge can enable</SectionLabel>
            <div>{c.signals.map((s) => <MetricRow key={s.name} s={s} accent />)}</div>
          </div>
          <div>
            <SectionLabel>The outcomes they open</SectionLabel>
            <div>{c.outcomes.map((s) => <MetricRow key={s.name} s={s} />)}</div>
          </div>
        </div>
        <p className="text-[12px] text-[#8C8C8C] mt-[16px]">Reviewed <span className="text-[#1A1A1A] font-medium">{c.cadence.toLowerCase()}</span> against the baselines above. The signals move first; the outcomes follow.</p>

        <div className="h-px bg-[#EFEAE1] my-[38px]" />

        {/* why it holds */}
        <div className="grid grid-cols-[1.15fr_1fr] gap-[46px]">
          <div>
            <SectionLabel>How the number holds: the chain</SectionLabel>
            <div className="flex flex-col gap-[14px]">
              {c.chain.map((step, i) => (
                <div key={i} className="flex items-baseline gap-[14px]">
                  <span className="font-abridge text-[15px] w-[18px] shrink-0" style={{ color: CORAL }}>{i + 1}</span>
                  <span className="text-[14px] text-[#1A1A1A] leading-snug">{step}</span>
                </div>
              ))}
            </div>
            <p className="text-[12px] text-[#8C8C8C] leading-relaxed mt-[22px] max-w-[440px]">{c.honesty}</p>
          </div>
          <div>
            <SectionLabel>The assumptions</SectionLabel>
            <div className="space-y-[12px]">
              {c.assumptions.map((a) => (
                <div key={a.label} className="flex items-baseline justify-between border-b border-[#EFEAE1] pb-[9px]">
                  <span className="text-[12.5px] text-[#3A3A3A]">{a.label}</span>
                  <span className="font-abridge text-[16px] text-[#1A1A1A]">{a.value}</span>
                </div>
              ))}
            </div>
            <p className="text-[10.5px] text-[#B4A896] mt-[12px] italic">Seeded conservatively. Editable, and shown in full.</p>
          </div>
        </div>

        <div className="mt-auto" />

        {/* what this opens — the strategic payoffs past the dollar */}
        <div className="rounded-[14px] p-[24px]" style={{ backgroundColor: "#1A1A1A" }}>
          <p className="text-[10px] font-bold uppercase tracking-[2.5px] text-white/45 mb-[14px]">What this opens, beyond the number</p>
          <div className="grid grid-cols-3 gap-[26px]">
            {c.opens.map((o) => (
              <div key={o.title}>
                <p className="font-abridge text-[14px] text-white mb-[6px] leading-snug">{o.title}</p>
                <p className="text-[11.5px] text-white/55 leading-snug">{o.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Foot page={page} partner={data.partner} />
    </PdfPage>
  );
}

export default function AttainPdf() {
  // use the partner's saved plan when there is one; otherwise the built-in sample
  const snap = loadSnapshot();
  const live = snap ? buildFromSnapshot(snap) : null;
  const caseData: PdfData = live?.data ?? CASE;
  const planCats: PlanCat[] = live?.categories ?? PLAN;
  // A live plan with logged reviews carries a `review`; render the live scoreboard, not the frozen
  // "0% realized" kickoff page. With no live plan, honor the ?attainpdf=review query on the sample.
  const mode: PdfMode = caseData.review ? "review" : MODE;
  let page = 1; // page 1 = the case
  return (
    <div className="bg-white">
      <style>{`.pdf-page:last-child { break-after: auto; }`}</style>
      <ReportCover data={caseData} />
      <Cover data={caseData} />
      <AttainPdfPage1 data={caseData} mode={mode} />
      {planCats.map((c, i) => <CategoryPage key={c.name} c={c} idx={i + 1} total={planCats.length} page={(page += 1)} data={caseData} />)}
    </div>
  );
}
