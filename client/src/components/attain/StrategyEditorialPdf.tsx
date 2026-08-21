import { type ReactNode } from "react";
import abridgeLogoRed from "@assets/abridge-logo-wordmark-red_1769187440253.png";
import abridgeSymbol from "@assets/abridge-logo-symbol_1774906992195.png";
import {
  DISCOVERY,
  getScript,
  resolveResult,
  briefFoundation,
  groundingQuestions,
  type DiscoveryAnswers,
  type FoundationRead,
} from "@/lib/attain/discovery";
import { goalDisplayLabel } from "@/lib/attain/attainGoals";
import type { AttainSetting, GoalId } from "@/lib/attain/attainTypes";

// ─────────────────────────────────────────────────────────────────────────────
// Editorial "Value Attainment Strategy — What we heard" print-to-PDF document.
// Same family/shell as the Explore / Plan / Proforma editorial PDFs: a white
// report cover (page 0), then up to two "what we heard" pages for the care
// setting — the plain-terms write-up of the discovery conversation (the read,
// the grounding, the priority stack, and each goal's current/target foundation).
// No numbers, on purpose: this mirrors the on-screen discovery brief.
// ─────────────────────────────────────────────────────────────────────────────

export const STRATEGY_PDF_STORAGE_KEY = "abridge:strategy-pdf-data";

export interface StrategyPdfData {
  orgName: string;
  date: string;
  setting: AttainSetting;
  order: GoalId[];       // goals in ranked priority order
  answers: DiscoveryAnswers;
}

const C = {
  page: "#FFFFFF",
  hair: "#E8E2DA",
  soft: "#EFE9E1",
  coral: "#EA2C00",
  ink: "#1A1A1A",
  label: "#4A4238",
  muted: "#5A5248",
  faint: "#8C8073",
  off: "#B4A896",
  warm: "#B78A5A",
  signal: "#8A6D3B",
} as const;

const SETTING_LABEL: Record<AttainSetting, string> = {
  outpatient: "Outpatient",
  ed: "Emergency Department",
  inpatient: "Inpatient",
  nursing: "Nursing",
};

// A plausible full discovery generated straight from the scripts, so the route
// always renders real content for verification without a live session, and the
// reconciliation test can exercise every setting. Rank every goal, pick the first
// two options on each multi step and the first on each single step + grounding.
export function sampleStrategyData(setting: AttainSetting, orgName = "Sample Health"): StrategyPdfData {
  const goals = Object.keys(DISCOVERY[setting] ?? {}) as GoalId[];
  const answers: DiscoveryAnswers = {};
  for (const q of groundingQuestions(setting)) {
    if (q.multi) q.options.slice(0, 2).forEach((o) => { answers[`_ground:${q.id}:${o.id}`] = "1"; });
    else if (q.options[0]) answers[`_ground:${q.id}`] = q.options[0].id;
  }
  answers["_rank"] = goals.join(",");
  answers["_triage"] = goals[0] ?? "";
  for (const goal of goals) {
    const script = getScript(setting, goal);
    if (!script) continue;
    for (const [qid, q] of Object.entries(script.questions)) {
      if (q.multi) q.options.slice(0, 2).forEach((o) => { answers[`${goal}:${qid}:${o.id}`] = "1"; });
      else if (q.options[0]) answers[`${goal}:${qid}`] = q.options[0].id;
    }
  }
  return { orgName, date: "August 21, 2026", setting, order: goals, answers };
}

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const listPhrase = (xs: string[]): string =>
  xs.length <= 1 ? (xs[0] ?? "") : xs.length === 2 ? `${xs[0]} and ${xs[1]}` : `${xs.slice(0, -1).join(", ")}, and ${xs[xs.length - 1]}`;

// ── derive the write-up content from the discovery answers ───────────────────

function rankedOrder(setting: AttainSetting, order: GoalId[], answers: DiscoveryAnswers): GoalId[] {
  const raw = answers["_rank"];
  const authored = order.filter((g) => !!getScript(setting, g));
  if (raw) {
    const rank = (raw.split(",").filter(Boolean) as GoalId[]).filter((g) => authored.includes(g));
    return [...rank, ...authored.filter((g) => !rank.includes(g))];
  }
  return authored;
}

function groundingItems(setting: AttainSetting, answers: DiscoveryAnswers): string[] {
  const out: string[] = [];
  for (const q of groundingQuestions(setting)) {
    if (q.multi) {
      for (const o of q.options) if (answers[`_ground:${q.id}:${o.id}`] === "1") out.push(cap(o.capture));
    } else {
      const opt = q.options.find((o) => o.id === answers[`_ground:${q.id}`]);
      if (opt) out.push(cap(opt.capture));
    }
  }
  return out;
}

// The one-line read: which priority carries the dollars vs. what's proof/honest.
function verdictLine(setting: AttainSetting, order: GoalId[], answers: DiscoveryAnswers): string {
  const results = order.map((g) => ({ g, res: resolveResult(setting, g, answers), script: getScript(setting, g)! }));
  const counted = results.filter((r) => r.res?.lever).map((r) => goalDisplayLabel(setting, r.g));
  const proofs = results.filter((r) => !r.res?.lever && (r.res?.proofDriverId || r.res?.proof || r.script.proofLine) && !r.res?.honest).map((r) => goalDisplayLabel(setting, r.g));
  const honests = results.filter((r) => r.res?.honest && !r.res?.lever && !r.res?.proofDriverId && !r.res?.proof).map((r) => goalDisplayLabel(setting, r.g));
  const bits: string[] = [];
  if (counted.length) bits.push(`${listPhrase(counted)} ${counted.length > 1 ? "carry" : "carries"} the near-term dollars`);
  if (proofs.length) bits.push(`${listPhrase(proofs)} ${proofs.length > 1 ? "are" : "is"} proof, tracked not counted`);
  if (honests.length) bits.push(`${listPhrase(honests)} ${honests.length > 1 ? "are" : "is"} honestly not documentation's to fix`);
  return bits.length ? cap(bits.join("; ")) + "." : "";
}

// ── shell ────────────────────────────────────────────────────────────────────

function Page({ children, pgnum }: { children: ReactNode; pgnum?: string }): JSX.Element {
  return (
    <div style={{ width: 816, height: 1056, background: C.page, position: "relative", overflow: "hidden", breakAfter: "page" }}>
      <div style={{ position: "absolute", inset: 0, padding: "44px 60px 32px", display: "flex", flexDirection: "column" }}>{children}</div>
      {pgnum && (
        <div style={{ position: "absolute", bottom: 16, left: 0, right: 0, textAlign: "center", fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: C.off }}>
          {pgnum}
        </div>
      )}
    </div>
  );
}

function RunningHeader({ org }: { org: string }): JSX.Element {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
          <span className="font-abridge" style={{ fontSize: 20, color: C.coral }}>ABRIDGE</span>
          <span style={{ width: 1, height: 19, background: C.hair }} />
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", color: C.faint }}>Value Attainment Strategy</span>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="font-abridge" style={{ fontSize: 17, color: C.ink }}>{org}</div>
        </div>
      </div>
      <div style={{ height: 1, background: C.hair, width: "100%", margin: "14px 0 0" }} />
    </>
  );
}

function ReportCover({ data, goalCount }: { data: StrategyPdfData; goalCount: number }): JSX.Element {
  return (
    <div style={{ width: 816, height: 1056, background: "#FFFFFF", position: "relative", overflow: "hidden", breakAfter: "page" }}>
      <img src={abridgeLogoRed} alt="Abridge" style={{ position: "absolute", top: 60, left: 64, width: 120 }} />
      <img src={abridgeSymbol} alt="" style={{ position: "absolute", bottom: 92, right: 10, width: 340, opacity: 0.06 }} />
      <div style={{ position: "absolute", inset: 0, padding: "0 64px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ fontSize: 11, color: "#666666", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 16 }}>Value Attainment Strategy</div>
        <h1 className="font-abridge" style={{ fontSize: 48, lineHeight: 1.12, color: "#1A1A1A", letterSpacing: "-0.5px", margin: "0 0 20px", maxWidth: 620 }}>{data.orgName}</h1>
        <div style={{ width: 80, height: 3, background: C.coral, marginBottom: 24 }} />
        <div style={{ fontSize: 17, color: "#666666", marginBottom: 44 }}>
          What we heard · {SETTING_LABEL[data.setting]} · {goalCount} {goalCount === 1 ? "priority" : "priorities"}
        </div>
        <div style={{ fontSize: 10, color: "#999999", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 6 }}>Prepared by</div>
        <div style={{ fontSize: 14, color: "#666666" }}>Abridge · {data.date}</div>
      </div>
      <div style={{ position: "absolute", bottom: 44, left: 64, right: 64, borderTop: "1px solid #E0E0E0", paddingTop: 12 }}>
        <div style={{ fontSize: 10.5, color: "#999999", lineHeight: 1.5 }}>
          No numbers yet, on purpose. This is your current picture and your target in plain terms, exactly as we heard it. Next we size the gap and build the ROI on your own figures.
        </div>
      </div>
    </div>
  );
}

// ── content pieces ───────────────────────────────────────────────────────────

function Eyebrow({ children, color = C.coral }: { children: ReactNode; color?: string }): JSX.Element {
  return <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", color }}>{children}</div>;
}

function ValueLines({ value, signal }: { value: string | string[]; signal?: boolean }): JSX.Element {
  const items = (Array.isArray(value) ? value : [value]).map(cap);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {items.map((v, i) => (
        <div key={i} style={{ fontSize: 13, lineHeight: 1.3, fontWeight: signal ? 600 : 500, color: signal ? C.signal : C.ink }}>{v}</div>
      ))}
    </div>
  );
}

function Column({ heading, headingColor, rows, signalLabel }: { heading: string; headingColor: string; rows: FoundationRead["current"]; signalLabel?: string }): JSX.Element {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", color: headingColor, marginBottom: 12 }}>{heading}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {rows.map((it) => (
          <div key={it.label}>
            <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: C.off, marginBottom: 3 }}>{it.label}</div>
            <ValueLines value={it.value} signal={it.label === signalLabel} />
          </div>
        ))}
      </div>
    </div>
  );
}

type GoalClass = "counted" | "proof" | "honest";
const CLASS_TAG: Record<GoalClass, { label: string; color: string }> = {
  counted: { label: "Counted, near-term dollars", color: C.coral },
  proof: { label: "Tracked as proof, not counted", color: C.warm },
  honest: { label: "Not documentation's to fix", color: C.faint },
};

function GoalFoundation({ setting, goal, rank, total, foundation, cls }: { setting: AttainSetting; goal: GoalId; rank: number; total: number; foundation: FoundationRead; cls: GoalClass }): JSX.Element {
  const current = total > 1 ? [...foundation.current, { label: "Priority this year", value: `#${rank} of ${total}` }] : foundation.current;
  const tag = CLASS_TAG[cls];
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 13 }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", color: C.faint }}>
          {SETTING_LABEL[setting]} · {goalDisplayLabel(setting, goal)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <span style={{ width: 6, height: 6, borderRadius: 99, background: tag.color }} />
          <span style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: tag.color }}>{tag.label}</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 26 }}>
        <Column heading="Where you are" headingColor={C.label} rows={current} />
        <div style={{ width: 1, background: C.hair, alignSelf: "stretch" }} />
        <Column heading="Where you want to go" headingColor={C.warm} rows={foundation.desired} signalLabel={foundation.signalLabel} />
      </div>
    </div>
  );
}

// ── document ─────────────────────────────────────────────────────────────────

export function StrategyEditorialPdfDocument({ data }: { data: StrategyPdfData }): JSX.Element {
  const order = rankedOrder(data.setting, data.order, data.answers);
  const grounding = groundingItems(data.setting, data.answers);
  const verdict = verdictLine(data.setting, order, data.answers);
  const classOf = (goal: GoalId): GoalClass => {
    const r = resolveResult(data.setting, goal, data.answers);
    const script = getScript(data.setting, goal);
    if (r?.lever) return "counted";
    if (r?.proofDriverId || r?.proof || script?.proofLine) return "proof";
    if (r?.honest) return "honest";
    return "proof";
  };
  const foundations = order
    .map((goal, i) => ({ goal, rank: i + 1, cls: classOf(goal), foundation: briefFoundation(data.setting, goal, SETTING_LABEL[data.setting], data.answers) }))
    .filter((x): x is { goal: GoalId; rank: number; cls: GoalClass; foundation: FoundationRead } => !!x.foundation);
  const total = foundations.length;

  // Page 1 leads with the read + up to two priorities; page 2 carries the rest.
  const pageOneGoals = foundations.slice(0, 2);
  const pageTwoGoals = foundations.slice(2);
  const contentPages = 1 + (pageTwoGoals.length ? 1 : 0);
  const totalPages = 1 /* cover */ + contentPages;
  const pg = (n: number) => `Abridge · Value Attainment Strategy · ${n} of ${totalPages}`;

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", color: C.ink }}>
      <ReportCover data={data} goalCount={total} />

      <Page pgnum={pg(2)}>
        <RunningHeader org={data.orgName} />
        <div style={{ marginTop: 22 }}>
          <Eyebrow>What we heard</Eyebrow>
          <h2 className="font-abridge" style={{ fontSize: 30, lineHeight: 1.1, color: C.ink, margin: "8px 0 0", maxWidth: 640 }}>
            {data.orgName.trim() ? `Where ${data.orgName.trim()} stands today, and where you want to go.` : "Where you are today, and where you want to go."}
          </h2>
          {verdict && (
            <p style={{ fontSize: 14.5, color: C.ink, lineHeight: 1.45, margin: "14px 0 0", maxWidth: 660, fontWeight: 500 }}>{verdict}</p>
          )}
        </div>

        <div style={{ display: "flex", gap: 40, margin: "22px 0 4px", paddingBottom: 18, borderBottom: `1px solid ${C.hair}` }}>
          {grounding.length > 0 && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: C.off, marginBottom: 8 }}>Grounding</div>
              {grounding.map((g, i) => (
                <div key={i} style={{ fontSize: 12, color: C.muted, lineHeight: 1.35, marginBottom: 3 }}>{g}</div>
              ))}
            </div>
          )}
          {order.length > 1 && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: C.off, marginBottom: 8 }}>Your priorities, in order</div>
              {order.map((g, i) => (
                <div key={g} style={{ fontSize: 12, color: C.ink, lineHeight: 1.4, marginBottom: 3, fontWeight: 500 }}>
                  <span style={{ color: C.faint, marginRight: 6 }}>{i + 1}.</span>{goalDisplayLabel(data.setting, g)}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 22 }}>
          {pageOneGoals.map((x) => (
            <GoalFoundation key={x.goal} setting={data.setting} goal={x.goal} rank={x.rank} total={total} foundation={x.foundation} cls={x.cls} />
          ))}
        </div>
        <div style={{ flexGrow: 1 }} />
      </Page>

      {pageTwoGoals.length > 0 && (
        <Page pgnum={pg(3)}>
          <RunningHeader org={data.orgName} />
          <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 22 }}>
            {pageTwoGoals.map((x) => (
              <GoalFoundation key={x.goal} setting={data.setting} goal={x.goal} rank={x.rank} total={total} foundation={x.foundation} cls={x.cls} />
            ))}
          </div>
          <div style={{ flexGrow: 1 }} />
        </Page>
      )}
    </div>
  );
}
