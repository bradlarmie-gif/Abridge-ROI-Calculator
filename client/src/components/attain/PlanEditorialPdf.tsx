import { type ReactNode } from "react";
import abridgeLogoRed from "@assets/abridge-logo-wordmark-red_1769187440253.png";
import abridgeSymbol from "@assets/abridge-logo-symbol_1774906992195.png";
import { buildOutcomePlan, type OutcomePlan, type PlanOwner, type PlanStep } from "@/lib/attain/planBuild";
import { SETTING_GOAL_MATRIX, goalDisplayLabel } from "@/lib/attain/attainGoals";
import type { AttainSetting } from "@/lib/attain/attainTypes";

// ─────────────────────────────────────────────────────────────────────────────
// Editorial "Value Attainment Plan" print-to-PDF document — the fifth member of
// the same family as Explore / Proforma / App Rationalization / ROI Calculator:
// a white report cover, then one chapter per outcome (the owner-grouped plan),
// then a dark closing page mirroring the on-screen "commitment" close.
//
// v1 renders the BASE plan straight from `buildOutcomePlan` (the same join the
// live Planning build-walk reads) — no partner overlay yet, so baselines and
// targets are blank placeholders exactly as they are before a partner fills
// them in on screen. Overlay wiring (typed targets/owners/dates) is a fast
// follow; this keeps the PDF and the live experience reading from one source.
//
// A 7-link chain can produce 5-6 distinct owners per outcome, so partner
// owners pack two-to-a-row in a grid (mirroring Proforma's DealCard grid) —
// dense enough that every goal in the current catalog reads as one composed
// page. Rows are still packed by an estimated-height budget, exactly like
// Proforma's per-setting driver pages, so nothing may exceed the 816x1056
// sheet; a future goal with more owners spills cleanly onto a
// running-header page marked "(continued)".
// ─────────────────────────────────────────────────────────────────────────────

export const PLAN_PDF_STORAGE_KEY = "abridge:plan-pdf-data";

export interface PlanPdfData {
  orgName: string;
  date: string;
  setting: AttainSetting;
  /** The fully-resolved, personalized plan (owner names + baselines + targets
   * applied). When present the PDF renders these verbatim; absent, it falls back
   * to the base structure for the setting (the sample). */
  plans?: OutcomePlan[];
  cadence?: "monthly" | "quarterly";
  execOwner?: string;
}

const C = {
  page: "#FFFFFF",
  card: "#FDFBF8",
  hair: "#E8E2DA",
  soft: "#F1EBE3",
  coral: "#EA2C00",
  ink: "#1A1A1A",
  label: "#2E2822",
  muted: "#5E534A",
  faint: "#786C5E",
  off: "#AFA491",
  fragile: "#B78A5A",
} as const;

const SETTING_LABEL: Record<AttainSetting, string> = {
  outpatient: "Outpatient",
  ed: "Emergency Department",
  inpatient: "Inpatient",
  nursing: "Nursing",
};

const LAYER_LABEL: Record<PlanStep["layer"], string> = {
  leading: "Abridge proves",
  operational: "The team runs",
  outcome: "The outcome",
};

const sEyebrow = { fontSize: 11, fontWeight: 800 as const, letterSpacing: ".14em", textTransform: "uppercase" as const, color: C.coral };
const sRule = { height: 1, background: C.hair, width: "100%" };

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

// ───────────────────────── Shell ─────────────────────────

function Page({ children, pgnum, dark }: { children: ReactNode; pgnum?: string; dark?: boolean }): JSX.Element {
  return (
    <div style={{ width: 816, height: 1056, background: dark ? C.ink : C.page, position: "relative", overflow: "hidden", breakAfter: "page" }}>
      <div style={{ position: "absolute", inset: 0, padding: "44px 60px 32px", display: "flex", flexDirection: "column" }}>
        {children}
      </div>
      {pgnum && (
        <div
          style={{
            position: "absolute",
            bottom: 16,
            left: 0,
            right: 0,
            textAlign: "center",
            fontSize: 9,
            letterSpacing: ".1em",
            textTransform: "uppercase",
            color: dark ? "rgba(255,255,255,0.35)" : C.off,
          }}
        >
          {pgnum}
        </div>
      )}
    </div>
  );
}

function RunningHeader({ org, dark }: { org: string; dark?: boolean }): JSX.Element {
  const ruleColor = dark ? "rgba(255,255,255,0.14)" : C.hair;
  const textColor = dark ? "rgba(255,255,255,0.5)" : C.faint;
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
          <span className="font-abridge" style={{ fontSize: 20, color: C.coral }}>ABRIDGE</span>
          <span style={{ width: 1, height: 19, background: ruleColor }} />
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", color: textColor }}>
            Value Attainment Plan
          </span>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="font-abridge" style={{ fontSize: 17, color: dark ? "#FFFFFF" : C.ink }}>{org}</div>
        </div>
      </div>
      <div style={{ ...sRule, background: ruleColor, marginTop: 14 }} />
    </>
  );
}

function Footer({ note, dark }: { note: string; dark?: boolean }): JSX.Element {
  const ruleColor = dark ? "rgba(255,255,255,0.14)" : C.hair;
  const noteColor = dark ? "rgba(255,255,255,0.4)" : C.faint;
  return (
    <div style={{ marginTop: "auto" }}>
      <div style={{ height: 1, background: ruleColor, marginBottom: 9 }} />
      <div style={{ fontSize: 10, color: noteColor, lineHeight: 1.4, maxWidth: 620 }}>{note}</div>
    </div>
  );
}

function SectionEyebrow({ num, title }: { num: string; title: string }): JSX.Element {
  return (
    <div style={{ ...sEyebrow, marginTop: 22 }}>
      <span style={{ color: C.off }}>{num}</span> · {title}
    </div>
  );
}

// ───────────────────────── Page 1 · Report cover ─────────────────────────

function ReportCover({ data, outcomeCount }: { data: PlanPdfData; outcomeCount: number }): JSX.Element {
  return (
    <div style={{ width: 816, height: 1056, background: "#FFFFFF", position: "relative", overflow: "hidden", breakAfter: "page" }}>
      <img src={abridgeLogoRed} alt="Abridge" style={{ position: "absolute", top: 60, left: 64, width: 120 }} />
      <img src={abridgeSymbol} alt="" style={{ position: "absolute", bottom: 92, right: 10, width: 340, opacity: 0.06 }} />
      <div style={{ position: "absolute", inset: 0, padding: "0 64px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ fontSize: 11, color: "#666666", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 16 }}>
          The Plan
        </div>
        <h1 className="font-abridge" style={{ fontSize: 48, lineHeight: 1.12, color: "#1A1A1A", letterSpacing: "-0.5px", margin: "0 0 20px", maxWidth: 620 }}>
          {data.orgName}
        </h1>
        <div style={{ width: 80, height: 3, background: C.coral, marginBottom: 24 }} />
        <div style={{ fontSize: 17, color: "#666666", marginBottom: 44 }}>
          {outcomeCount} {outcomeCount === 1 ? "outcome" : "outcomes"}, owned and measured
        </div>
        <div style={{ fontSize: 10, color: "#999999", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 6 }}>
          Prepared by
        </div>
        <div style={{ fontSize: 14, color: "#666666" }}>Abridge · {data.date}</div>
      </div>
      <div style={{ position: "absolute", bottom: 44, left: 64, right: 64, borderTop: "1px solid #E0E0E0", paddingTop: 12 }}>
        <div style={{ fontSize: 10.5, color: "#999999", lineHeight: 1.5 }}>
          Every owner, signal, and target here is set with your team and tracked against your own numbers, not a benchmark.
          Baselines and dates are added as the plan is built out together.
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── Outcome pages · owner-grouped plan ─────────────────────────

function SourceChip({ source }: { source: string }): JSX.Element {
  return (
    <span
      style={{
        display: "inline-flex",
        border: `1px solid ${C.hair}`,
        borderRadius: 99,
        padding: "2px 8px",
        fontSize: 8.5,
        fontWeight: 800,
        letterSpacing: ".06em",
        textTransform: "uppercase",
        color: C.faint,
        whiteSpace: "nowrap",
      }}
    >
      {source}
    </span>
  );
}

function StepRow({ step, last }: { step: PlanStep; last: boolean }): JSX.Element {
  const isOutcome = step.layer === "outcome";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 14,
        padding: "9px 0",
        borderBottom: last ? "none" : `1px solid ${C.soft}`,
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", rowGap: 2, columnGap: 7, marginBottom: 2 }}>
          <span
            style={{
              fontSize: 8.5,
              fontWeight: 800,
              letterSpacing: ".08em",
              textTransform: "uppercase",
              color: isOutcome ? C.coral : step.layer === "leading" ? C.faint : C.off,
            }}
          >
            {LAYER_LABEL[step.layer]}
          </span>
          {step.fragile && (
            <span style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: C.fragile }}>
              Make-or-break
            </span>
          )}
        </div>
        <div style={{ fontSize: 12.5, lineHeight: 1.32, color: isOutcome ? C.coral : C.label, fontWeight: isOutcome ? 700 : 500 }}>
          {step.name}
        </div>
        <div style={{ fontSize: 10.5, color: C.faint, marginTop: 2, lineHeight: 1.35 }}>Watch: {step.signal}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0 }}>
        <SourceChip source={step.source} />
        {/* Only render the baseline -> target rail when there is something in it.
            It used to print "— → target" whenever both were unset, which is every
            metric on a plan that has not had its numbers filled in yet: 21 rows
            of the literal word "target" across three pages of a document headed
            THE COMMITMENT. A blank reads as "to be set"; the word "target" reads
            as unfinished software. The page footnote already says baselines and
            dates get added as the plan is built out. */}
        {(step.baseline || step.target) && (
          <div style={{ fontSize: 10.5, color: C.off, whiteSpace: "nowrap" }}>
            {step.baseline || "—"} <span style={{ color: "#C9BDAD" }}>&rarr;</span>{" "}
            {step.target ? <span style={{ color: C.coral, fontWeight: 700 }}>{step.target}</span> : "target"}
          </div>
        )}
      </div>
    </div>
  );
}

function OwnerCard({ owner }: { owner: PlanOwner }): JSX.Element {
  const hasFragile = owner.steps.some((s) => s.fragile);
  const title = owner.person || owner.role;
  const label = owner.isAbridge ? "Abridge + your champion" : hasFragile ? "Make-or-break owner" : "Owner";
  // For an Abridge-owned outcome the role IS "Abridge + your champion", so the
  // eyebrow and the title rendered the same words twice, 20px apart, as the
  // first thing on three consecutive pages. Drop the eyebrow when it is just
  // repeating the title.
  const showLabel = label.trim().toLowerCase() !== title.trim().toLowerCase();
  return (
    <div style={{ border: `1px solid ${C.hair}`, borderRadius: 14, background: C.card, padding: "14px 18px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 12,
          borderBottom: `1px solid ${C.hair}`,
          paddingBottom: 9,
          marginBottom: 9,
        }}
      >
        <div style={{ minWidth: 0 }}>
          {showLabel && (
            <div
              style={{
                fontSize: 9.5,
                fontWeight: 800,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                color: hasFragile && !owner.isAbridge ? C.fragile : C.faint,
                marginBottom: 3,
              }}
            >
              {label}
            </div>
          )}
          <div className="font-abridge" style={{ fontSize: 16, color: C.ink, lineHeight: 1.2 }}>{title}</div>
        </div>
        <span style={{ fontSize: 10.5, color: C.off, whiteSpace: "nowrap" }}>
          {owner.steps.length} {owner.steps.length === 1 ? "metric" : "metrics"}
        </span>
      </div>
      {owner.steps.map((s, i) => (
        <StepRow key={s.n} step={s} last={i === owner.steps.length - 1} />
      ))}
    </div>
  );
}

// ── Layout + height-budget pagination ──────────────────────────────────────
// The Abridge enabling owner (always the chain's first link, so always
// `owners[0]`) runs full width; the remaining partner owners pack two to a
// row in a grid, mirroring Proforma's DealCard grid — the same density move
// that lets a 5-6 owner outcome read as one composed page instead of a full
// page followed by one orphaned card on a "(continued)" sheet. Pagination
// still packs by an estimated-height budget as a safety net for any future
// goal whose chain produces more owners than one page can hold.

interface OutcomeAtom {
  h: number;
  node: ReactNode;
}

const USABLE_H = 1056 - 44 - 32; // Page's top/bottom padding
const FIRST_BUDGET = USABLE_H - 168; // RunningHeader + SectionEyebrow + chainTitle + meta line + gap
const CONT_BUDGET = USABLE_H - 114; // RunningHeader + "{chainTitle} (continued)" mini header + gap
const ATOM_GAP = 14;

function estOwnerH(owner: PlanOwner): number {
  const overhead = 86; // card padding + header row + border
  const stepH = 66; // layer label + name + signal line, or source chip + baseline->target
  return overhead + owner.steps.length * stepH;
}

/** Group the partner owners two-per-row (the Abridge owner is rendered
 * separately, full width) and build the atoms an outcome page packs. */
function buildOutcomeAtoms(plan: OutcomePlan): OutcomeAtom[] {
  const abridgeOwner = plan.owners.find((o) => o.isAbridge);
  const partnerOwners = plan.owners.filter((o) => !o.isAbridge);
  const atoms: OutcomeAtom[] = [];
  if (abridgeOwner) {
    atoms.push({ h: estOwnerH(abridgeOwner), node: <OwnerCard owner={abridgeOwner} /> });
  }
  for (let i = 0; i < partnerOwners.length; i += 2) {
    const a = partnerOwners[i];
    const b = partnerOwners[i + 1];
    atoms.push({
      h: b ? Math.max(estOwnerH(a), estOwnerH(b)) : estOwnerH(a),
      node: (
        <div style={{ display: "grid", gridTemplateColumns: b ? "1fr 1fr" : "1fr", gap: 14 }}>
          <OwnerCard owner={a} />
          {b && <OwnerCard owner={b} />}
        </div>
      ),
    });
  }
  return atoms;
}

/** Pack an outcome's atoms (the Abridge card + each 2-up owner row) into as
 * few 816x1056 pages as the height budget allows, breaking to a
 * "(continued)" page when full. A plain greedy forward pack fills early
 * pages to the brim and can strand one atom alone on a trailing page — a big
 * dead gap above the footer. So after the greedy pass, a backward-balancing
 * pass pulls atoms from the previous page onto a sparse trailing page (never
 * past its own budget, never emptying the page it pulls from), so a 2-page
 * split reads as two pages of roughly even weight instead of "full page,
 * then one orphaned row." In practice, every goal in the current catalog
 * fits on a single page once owners are paired up; this is the safety net
 * for any future goal whose chain produces more owners than one page holds. */
function packAtomsIntoPages(atoms: OutcomeAtom[]): OutcomeAtom[][] {
  const pages: OutcomeAtom[][] = [[]];
  let used = 0;
  let budget = FIRST_BUDGET;
  for (const atom of atoms) {
    const cur = pages[pages.length - 1];
    const addH = atom.h + (cur.length > 0 ? ATOM_GAP : 0);
    if (used + addH > budget && cur.length > 0) {
      pages.push([atom]);
      used = atom.h;
      budget = CONT_BUDGET;
    } else {
      cur.push(atom);
      used += addH;
    }
  }

  const pageUsed = (page: OutcomeAtom[]) => page.reduce((a, at) => a + at.h, 0) + Math.max(0, page.length - 1) * ATOM_GAP;
  for (let iter = 0; iter < atoms.length; iter++) {
    if (pages.length < 2) break;
    const last = pages[pages.length - 1];
    const prev = pages[pages.length - 2];
    const lastUsed = pageUsed(last);
    if (lastUsed >= CONT_BUDGET * 0.55 || prev.length <= 1) break;
    const moving = prev[prev.length - 1];
    const projected = lastUsed + moving.h + (last.length > 0 ? ATOM_GAP : 0);
    if (projected > CONT_BUDGET) break; // would overflow the trailing page
    prev.pop();
    last.unshift(moving);
  }
  return pages;
}

// ───────────────────────── Closing · the commitment ─────────────────────────

function ClosingPage({ data, plans, pgnum }: { data: PlanPdfData; plans: OutcomePlan[]; pgnum: string }): JSX.Element {
  const totalSignals = plans.reduce((a, p) => a + p.owners.reduce((b, o) => b + o.steps.length, 0), 0);
  const totalOwners = plans.reduce((a, p) => a + p.owners.filter((o) => !o.isAbridge).length, 0);
  return (
    <Page dark pgnum={pgnum}>
      <RunningHeader org={data.orgName} dark />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".16em", textTransform: "uppercase", color: "#F7A488" }}>
          The commitment
        </div>
        <h2 className="font-abridge" style={{ fontSize: 36, lineHeight: 1.16, color: "#FFFFFF", marginTop: 14, maxWidth: 640 }}>
          {plans.length} {plans.length === 1 ? "outcome" : "outcomes"}, owned and measured. Not left to hope.
        </h2>
        <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "rgba(255,255,255,0.7)", maxWidth: 600, marginTop: 20 }}>
          <b style={{ color: "#FFFFFF" }}>{totalOwners}</b> owner {totalOwners === 1 ? "role carries" : "roles carry"} this
          plan across {plans.length} {plans.length === 1 ? "outcome" : "outcomes"}, {totalSignals} signals tell us early whether each one is on track,
          and the leading signals Abridge proves move first.
        </p>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 14, maxWidth: 600 }}>
          This is the deal after the deal: the promise, made real and tracked against your own numbers.
        </p>
      </div>
      {/* No wordmark here. <Page> already emits the running footer, so this block
          put ABRIDGE twice inside a 20px band at the foot of the closing page.
          Keep the prepared-for line, which the running footer does not carry. */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.14)", paddingTop: 16 }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Prepared with your team · {data.orgName} · {data.date}</span>
      </div>
    </Page>
  );
}

// ───────────────────────── Document ─────────────────────────

export function PlanEditorialPdfDocument({ data }: { data: PlanPdfData }): JSX.Element {
  const goals = SETTING_GOAL_MATRIX[data.setting];
  const plans = data.plans && data.plans.length ? data.plans : goals.map((g) => buildOutcomePlan(data.setting, g));
  const atomPagesPerPlan = plans.map((plan) => packAtomsIntoPages(buildOutcomeAtoms(plan)));
  const totalOutcomePages = atomPagesPerPlan.reduce((a, pages) => a + pages.length, 0);
  const total = 1 /* cover */ + totalOutcomePages + 1 /* closing */;
  const pg = (n: number) => `Abridge · Value Attainment Plan · ${n} of ${total}`;
  let p = 2; // page 1 is the cover, which carries no visible page number

  const personalized = !!(data.plans && data.plans.length);
  const disclaimerNote = personalized
    ? `This plan is set with ${data.orgName}'s own team${data.execOwner ? `, with ${data.execOwner} accountable` : ""}, reviewed ${data.cadence ?? "quarterly"} against your own numbers. Blank baselines and dates are the ones still to be agreed, never fabricated.`
    : `Owners and targets are set with ${SETTING_LABEL[data.setting]}'s own team; baselines and by-when dates are added as the plan is built out and never fabricated ahead of that conversation.`;

  const pageEls: ReactNode[] = [];
  plans.forEach((plan, pi) => {
    const chapterNum = pad2(pi + 1);
    const pages = atomPagesPerPlan[pi];
    pages.forEach((atomsOnPage, qi) => {
      pageEls.push(
        <Page key={`${plan.goal}-${qi}`} pgnum={pg(p++)}>
          <RunningHeader org={data.orgName} />
          {qi === 0 ? (
            <>
              <SectionEyebrow num={chapterNum} title={`The outcome · ${plan.displayCategory ?? goalDisplayLabel(plan.setting, plan.goal)}`} />
              <h2 className="font-abridge" style={{ fontSize: 27, lineHeight: 1.16, color: C.ink, margin: "8px 0 0", maxWidth: 640 }}>
                {plan.chainTitle}
              </h2>
              <div style={{ fontSize: 11.5, color: C.faint, marginTop: 8 }}>
                {plan.owners.length} {plan.owners.length === 1 ? "owner" : "owners"} ·{" "}
                {plan.owners.reduce((a, o) => a + o.steps.length, 0)} signals tracked
              </div>
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 22 }}>
              <span className="font-abridge" style={{ fontSize: 19, color: C.ink }}>{plan.chainTitle}</span>
              <span style={{ fontSize: 11.5, color: C.off }}>(continued)</span>
            </div>
          )}
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
            {atomsOnPage.map((a, i) => (
              <div key={i}>{a.node}</div>
            ))}
          </div>
          <div style={{ flexGrow: 1 }} />
          <Footer note={disclaimerNote} />
        </Page>,
      );
    });
  });

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", color: C.ink }}>
      <ReportCover data={data} outcomeCount={plans.length} />
      {pageEls}
      <ClosingPage data={data} plans={plans} pgnum={pg(p)} />
      <style>{`@page { size: Letter; margin: 0; } @media print { body { margin: 0; } }`}</style>
    </div>
  );
}

// ───────────────────────── Sample data ─────────────────────────

export const SAMPLE_PLAN_PDF_DATA: PlanPdfData = {
  orgName: "Summit Medical Group",
  date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
  setting: "nursing",
};
