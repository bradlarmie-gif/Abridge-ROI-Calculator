/**
 * Attain — "Download PDF" export.
 *
 * A 6-page (per single priority) @react-pdf/renderer Document reproducing
 * the locked mockup `Value-Attainment/mockup/value-attainment-patient-access.html`
 * (Cover → Your Starting Point → Closing the Gap → The Value Chain → The
 * Hardest Link → The Cadence), populated entirely from the partner's real
 * plan — the same `combined`/`attainment` figures `StepAttainment.tsx`
 * already renders on screen, never a separately invented number.
 *
 * Multi-priority plans repeat the per-priority sections (Starting Point,
 * Value Chain, Hardest Link, Cadence) once per selected goal, in pick
 * order — mirroring `StepAttainment.tsx`'s `PriorityDeepDive` — while
 * "Closing the Gap" stays a single, combined page, since `attainment.pct`
 * is already the plan's combined figure. A single-priority plan is exactly
 * 6 physical pages; an N-priority plan is `4N + 2`.
 *
 * `buildAttainPdfData` is the pure, testable data-model builder (no JSX):
 * see `attainPdfReconciliation.test.ts` for the guardrail that its headline
 * `combinedMargin` — and every per-priority `margin` that sums back to it —
 * always equals `computeMultiGoalContributions`'s own totals, never a
 * second, hand-rolled figure.
 *
 * Follows `pdf_layout_guidelines.md`: page padding 54 / paddingBottom 72,
 * `fixed` 3-slot footer (org-name-only center, no document-title suffix),
 * `wrap={false}` on every atomic card/row/table-row, `minPresenceAhead` on
 * every section H2.
 */
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Path,
  Line,
  Circle,
  Font,
  pdf,
} from "@react-pdf/renderer";
import { savePdfBlob } from "@/lib/pdf-save";
import AbridgeFont from "@/assets/fonts/abridge.otf";
import ManropeRegular from "@/assets/fonts/manrope-regular.ttf";
import ManropeBold from "@/assets/fonts/manrope-bold.ttf";
import { brand } from "@/lib/pdf-theme";
import { GOAL_CATALOG, getContent } from "./attainGoals";
import {
  leversFor,
  type Lever,
  type LeverValues,
  type LeverContribution,
  type MultiGoalContributionsResult,
  type RealizationByGoal,
} from "./attainLevers";
import type { AttainState, AttainSetting, GoalId, GoalDef, SettingGoalContent } from "./attainTypes";
import type { GoalTargetResult, AttainmentResult } from "./attainCalc";

Font.register({ family: "Abridge", src: AbridgeFont, fontWeight: 400 });
// Body copy uses Manrope (the same TTF every other Abridge PDF in this repo
// registers, see outpatient-pdf-generator.tsx) rather than the core-14
// "Helvetica" font — Helvetica's WinAnsi glyph set has no arrow (→) glyph,
// which the mockup's flow-chip and chain-arrow copy depends on throughout.
Font.register({
  family: "Manrope",
  fonts: [
    { src: ManropeRegular, fontWeight: 400 },
    { src: ManropeBold, fontWeight: 700 },
  ],
});
Font.registerHyphenationCallback((word) => [word]);

// ────────────────────────────────────────────────────────────────────────
// Palette — the theme's shared `brand`, plus the Attain-specific cream/tan
// surfaces it exposes (see pdf-theme.tsx's "Value Attainment plan palette"
// block). No green/amber/RAG anywhere in this file.
// ────────────────────────────────────────────────────────────────────────

const C = {
  coral: brand.abridgeRed,
  ink: brand.black,
  body: brand.bodyText,
  muted: brand.muted,
  faint: brand.faint,
  cream: brand.cream,
  cream2: brand.cream2,
  tan: brand.tan,
  hairline: brand.hairline,
  white: "#FFFFFF",
  riskBg: "#FFF6F3",
};

// Illustrative ceiling for "what usually happens" — mirrors
// `AttainmentCurve.tsx`'s `USUAL_CEILING_PCT` (duplicated here rather than
// imported, so this lib module has no dependency on a live UI component;
// keep the two in sync if that constant ever changes).
const USUAL_CEILING_PCT = 39;

const UNIT_LABEL: Record<AttainSetting, string> = {
  outpatient: "providers",
  ed: "providers",
  inpatient: "hospitalists",
  nursing: "staffed beds",
};

const SETTING_LABEL: Record<AttainSetting, string> = {
  outpatient: "Outpatient",
  ed: "Emergency Department",
  inpatient: "Inpatient",
  nursing: "Nursing",
};

// ────────────────────────────────────────────────────────────────────────
// Formatting — same compact-dollar convention every Attain screen uses
// (StepAttainment.tsx / StepCommit.tsx's own local `formatCompact`).
// ────────────────────────────────────────────────────────────────────────

export function formatCompact(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  // A 4+ digit number in front of "M" ($1150.6M) reads as a typo, not a
  // premium figure — add the billions step so an extreme combined plan
  // (many priorities, a huge baseline) still prints a normal-looking
  // number. Same `formatCompact` convention as StepAttainment.tsx /
  // StepCommit.tsx's own local copies (see this file's header comment);
  // those have the identical 4-digit-before-M gap at $1B+ and would
  // benefit from the same fix, tracked separately since they are outside
  // this file.
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(abs % 1_000_000_000 === 0 ? 0 : 2)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${Math.round(abs)}`;
}

function slugify(text: string): string {
  const slug = text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "plan";
}

// ────────────────────────────────────────────────────────────────────────
// Input types — deliberately structural (not imported from StepCommit.tsx,
// a page-level component this lib module should not depend on). The real
// `Commitment`/`GoalOwner` shapes AttainFlow/StepAttainment carry already
// satisfy these structurally.
// ────────────────────────────────────────────────────────────────────────

export interface AttainPdfCommitmentSignal {
  label: string;
  baseline: string;
}

export interface AttainPdfCommitment {
  owner: string;
  due: string;
  /** The decision's ONE required signal (Commit redesign) — the PDF only
   * ever prints this one per decision, the same simplification it already
   * made when Commit still carried a `signals` list (it only ever read
   * `signals[0]`). Optional signals a partner adds on top are Commit/
   * Progress-only detail, not printed in the plan document. */
  requiredSignal?: AttainPdfCommitmentSignal;
}

export interface AttainPdfGoalOwner {
  name: string;
  title: string;
}

export interface AttainPdfInput {
  state: AttainState;
  setting: AttainSetting;
  goals: GoalId[];
  /** Only `label` is read (e.g. "3,800 net-new visits/year") — the dollar
   * figure always comes from `combined`, never from this. */
  target: GoalTargetResult;
  attainment: AttainmentResult;
  valuesByGoal: Partial<Record<GoalId, LeverValues>>;
  combined: MultiGoalContributionsResult;
  commitments: Record<string, AttainPdfCommitment>;
  goalOwnerByPriority: Partial<Record<GoalId, AttainPdfGoalOwner>>;
  /** ONE plan-wide review cadence (Commit redesign), e.g. "monthly" —
   * structural string, not `SignalCadence` (this module deliberately does
   * not import from StepCommit.tsx, see the header above). Defaults to
   * "monthly" when omitted, matching `DEFAULT_PLAN_CADENCE`. */
  planCadence?: string;
  freedTimeSplit: number;
  /** Per-priority realization/attribution rate (0-100, default 100 when a
   * goal is missing). Every dollar figure this PDF prints already reflects
   * it (`combined` is already scaled, see attainLevers.ts's
   * `applyRealization`) - this is only read to decide whether a priority's
   * Starting Point page names the rate in a footnote (see `isFreedTimeGoal`'s
   * sibling `realizationPct` below). */
  realizationByGoal: RealizationByGoal;
  orgName: string;
}

export interface AttainPdfDecision {
  lever: Lever;
  contribution: LeverContribution | undefined;
  owner: string;
  due: string;
  signalLabel: string;
  signalBaseline: string;
}

export interface AttainPdfPriority {
  goal: GoalId;
  goalDef: GoalDef;
  content: SettingGoalContent | undefined;
  margin: number;
  count: number;
  decisions: AttainPdfDecision[];
  availableDecisionCount: number;
  goalOwnerName: string;
  goalOwnerTitle: string;
  isFreedTimeGoal: boolean;
  barAcc: number;
  /** Service lines the partner actually selected for this goal (may be empty),
   * read off the goal's "lines" lever - never a hardcoded specialty. */
  selectedLines: string[];
  /** This priority's own realization/attribution rate (0-100, default 100).
   * `margin`/`count` above already have it baked in (they come straight off
   * `combined.byGoal[goal]`, already scaled) - this is only carried so the
   * Starting Point page can name it in a footnote when it's below 100. */
  realizationPct: number;
}

export interface AttainPdfCurve {
  pct: number;
  onPacePct: number;
  monthsElapsed: number;
  totalMonths: number;
  goalLabel: string;
  usualLabel: string;
  remainingMonths: number;
  remainingMargin: number;
}

export interface AttainPdfData {
  orgName: string;
  preparedDate: string;
  preparedDateISO: string;
  setting: AttainSetting;
  unitLabel: string;
  unitCount: number;
  goalDefs: GoalDef[];
  planTitle: string;
  scopeSubtitle: string;
  coverThesisLines: string[];
  combinedMargin: number;
  combinedMarginLabel: string;
  combinedCount: number;
  decisionCount: number;
  freedTimeSplit: number;
  /** ONE plan-wide review cadence, resolved to a real value ("monthly" when
   * the input omits it) — see `AttainPdfInput.planCadence`'s doc. */
  planCadence: string;
  curve: AttainPdfCurve;
  priorities: AttainPdfPriority[];
}

// ────────────────────────────────────────────────────────────────────────
// Data model builder — pure, no JSX. This is the ONE place the PDF derives
// figures from the plan; every page component below only ever reads off
// the `AttainPdfData` this returns.
// ────────────────────────────────────────────────────────────────────────

function isLeverMoved(value: number | string[] | undefined, realityStart: number | string[]): boolean {
  if (Array.isArray(realityStart)) return Array.isArray(value) && value.length > 0;
  return typeof value === "number" && value !== realityStart;
}

function committedDecisionsFor(
  goal: GoalId,
  setting: AttainSetting,
  values: LeverValues,
  perLever: LeverContribution[] | undefined,
  commitments: Record<string, AttainPdfCommitment>,
): AttainPdfDecision[] {
  return leversFor(goal, setting)
    .filter((l) => isLeverMoved(values[l.id], l.realityStart))
    .map((l) => {
      const commitment = commitments[`${goal}:${l.id}`];
      const primarySignal = commitment?.requiredSignal;
      return {
        lever: l,
        contribution: perLever?.find((p) => p.id === l.id),
        owner: commitment?.owner?.trim() || l.ownerRole,
        due: commitment?.due ?? l.defaultDue,
        signalLabel: primarySignal?.label?.trim() || l.signal,
        signalBaseline: primarySignal?.baseline?.trim() || "",
      };
    })
    .sort((a, b) => (b.contribution?.marginalMargin ?? 0) - (a.contribution?.marginalMargin ?? 0));
}

export function buildAttainPdfData(input: AttainPdfInput): AttainPdfData {
  const { state, setting, goals, target, attainment, valuesByGoal, combined, commitments, goalOwnerByPriority, freedTimeSplit, orgName } = input;
  // Defaults to `{}` (100% realization for every goal) rather than trusting
  // every caller to pass it - matches this file's own "never crash on a
  // missing/legacy field" discipline (see the module header's ceiling note).
  const realizationByGoal = input.realizationByGoal ?? {};
  const planCadence = input.planCadence ?? "monthly";

  // Every dollar figure below traces back to `combined` — the exact same
  // `computeMultiGoalContributions` result AttainFlow.tsx computes and
  // StepAttainment.tsx renders on screen. `target.label` is the only field
  // read off `target` (the unit label, e.g. "3,800 net-new visits/year");
  // its dollar figure is never used.
  const combinedMargin = combined.combinedMargin;
  const combinedCount = combined.combinedCount;

  const goalDefs = goals.map((g) => GOAL_CATALOG[g]);
  const planTitle = goalDefs.length === 1 ? goalDefs[0].label : goalDefs.map((g) => g.label).join(" + ");
  const unitLabel = UNIT_LABEL[setting] ?? "units";
  const singleContent = goalDefs.length === 1 ? getContent(setting, goals[0]) : undefined;

  // Scope subtitle is DERIVED from the partner's real plan (selected lines +
  // the unit count from Baseline), never the old hardcoded
  // "Cardiology & Orthopedics · 40 providers" that contradicted the actual
  // scope. Blank inputs collapse to the care setting alone.
  const singleSelectedLines: string[] =
    goalDefs.length === 1
      ? (() => {
          const ll = leversFor(goals[0], setting).find((l) => l.control === "lines");
          const v = ll ? (valuesByGoal[goals[0]] ?? {})[ll.id] : undefined;
          return Array.isArray(v) ? v : [];
        })()
      : [];
  const unitCountForScope = state.scope.unitCount || 0;
  const scopeSubtitle =
    goalDefs.length === 1
      ? [
          singleSelectedLines.length > 0 ? singleSelectedLines.join(", ") : null,
          unitCountForScope > 0 ? `${unitCountForScope.toLocaleString()} ${unitLabel}` : null,
          SETTING_LABEL[setting],
        ]
          .filter(Boolean)
          .join(" · ")
      : `${goalDefs.length} priorities · ${unitCountForScope.toLocaleString()} ${unitLabel} · ${SETTING_LABEL[setting]}`;
  const coverThesisLines = singleContent
    ? [singleContent.thesis1, singleContent.thesis2]
    : [`One plan, built from every decision moved across ${goalDefs.map((g) => g.label).join(", ")}.`];

  const hasFreedTimeConflict = (setting === "outpatient" || setting === "ed") && goals.includes("access") && goals.includes("retention");

  const priorities: AttainPdfPriority[] = goals.map((goal) => {
    const goalDef = GOAL_CATALOG[goal];
    const content = getContent(setting, goal);
    const values = valuesByGoal[goal] ?? {};
    const result = combined.byGoal[goal];
    const decisions = committedDecisionsFor(goal, setting, values, result?.perLever, commitments);
    const owner = goalOwnerByPriority[goal];
    const isFreedTimeGoal = hasFreedTimeConflict && (goal === "access" || goal === "retention");
    const liveBarAcc = goal === "access" ? freedTimeSplit : 100 - freedTimeSplit;
    const barAcc = isFreedTimeGoal ? liveBarAcc : content?.barAcc ?? 50;
    return {
      goal,
      goalDef,
      content,
      margin: result?.totalMargin ?? 0,
      count: result?.totalCount ?? 0,
      decisions,
      availableDecisionCount: leversFor(goal, setting).length,
      goalOwnerName: owner?.name?.trim() ?? "",
      goalOwnerTitle: owner?.title?.trim() ?? "",
      isFreedTimeGoal,
      barAcc,
      selectedLines: (() => {
        const linesLever = leversFor(goal, setting).find((l) => l.control === "lines");
        const v = linesLever ? values[linesLever.id] : undefined;
        return Array.isArray(v) ? v : [];
      })(),
      realizationPct: realizationByGoal[goal] ?? 100,
    };
  });

  const decisionCount = priorities.reduce((sum, p) => sum + p.decisions.length, 0);

  const usualMargin = combinedMargin * (USUAL_CEILING_PCT / 100);
  const remainingMonths = Math.max(0, state.totalMonths - state.monthsElapsed);
  const remainingMargin = Math.max(0, combinedMargin - attainment.marginToDate);

  const now = new Date();
  const preparedDate = now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const preparedDateISO = now.toISOString().slice(0, 10);

  return {
    orgName: orgName?.trim() || "Your organization",
    preparedDate,
    preparedDateISO,
    setting,
    unitLabel,
    unitCount: state.scope.unitCount || 0,
    goalDefs,
    planTitle,
    scopeSubtitle,
    coverThesisLines,
    combinedMargin,
    combinedMarginLabel: formatCompact(combinedMargin),
    combinedCount,
    decisionCount,
    freedTimeSplit,
    planCadence,
    curve: {
      pct: attainment.pct,
      onPacePct: attainment.onPacePct,
      monthsElapsed: state.monthsElapsed,
      totalMonths: state.totalMonths,
      goalLabel: `${formatCompact(combinedMargin)} · ${target.label || `${combinedCount.toLocaleString()} units of value`}`,
      usualLabel: `~${formatCompact(usualMargin)}`,
      remainingMonths,
      remainingMargin,
    },
    priorities,
  };
}

export function buildAttainPdfFilename(data: AttainPdfData): string {
  const isDefaultOrg = !data.orgName || data.orgName.trim().toLowerCase() === "your organization";
  const partner = isDefaultOrg ? data.setting : data.orgName;
  return `abridge-attainment-${slugify(partner)}-${data.preparedDateISO}.pdf`;
}

// ────────────────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────────────────

const CW = 504; // content width = 612 (LETTER) - 54 * 2

const s = StyleSheet.create({
  page: {
    paddingTop: 54,
    paddingLeft: 54,
    paddingRight: 54,
    paddingBottom: 72,
    fontFamily: "Manrope",
    fontSize: 9.5,
    color: C.body,
    backgroundColor: C.white,
  },

  // Interior chrome
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.hairline,
    marginBottom: 13,
  },
  topWordmark: { fontFamily: "Abridge", fontSize: 13, color: C.coral, letterSpacing: 0.5 },
  topLabel: { fontSize: 8, fontWeight: 700, color: C.muted, letterSpacing: 2, textTransform: "uppercase" },

  footer: {
    position: "absolute",
    bottom: 28,
    left: 54,
    right: 54,
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: C.hairline,
    paddingTop: 8,
  },
  footerLeft: { width: 90, flexShrink: 0, fontSize: 7.5, fontWeight: 700, color: C.coral, letterSpacing: 0.5 },
  footerCenter: { flex: 1, textAlign: "center", paddingHorizontal: 8, fontSize: 7.5, color: C.faint },
  footerRight: { width: 90, flexShrink: 0, textAlign: "right", fontSize: 7.5, fontWeight: 700, color: C.muted },

  // Typography
  eyebrowCoral: { fontSize: 8.5, fontWeight: 700, color: C.coral, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 3 },
  h2: { fontFamily: "Abridge", fontSize: 24, color: C.ink, marginBottom: 10, lineHeight: 1.1 },
  lead: { fontSize: 10.5, lineHeight: 1.5, color: C.body, marginBottom: 10, maxWidth: CW },
  body: { fontSize: 9.5, lineHeight: 1.45, color: C.body, marginBottom: 6, maxWidth: CW },
  bodySmall: { fontSize: 9, lineHeight: 1.4, color: C.body, marginBottom: 5, maxWidth: CW },
  subEyebrow: { fontSize: 8, fontWeight: 700, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 },
  subEyebrowCoral: { fontSize: 8, fontWeight: 700, color: C.coral, letterSpacing: 1.8, textTransform: "uppercase", marginBottom: 5, marginTop: 3 },
  footnote: { fontSize: 8.5, color: C.muted, marginTop: 4 },
  footnoteMuted: { fontSize: 8, color: C.muted, marginTop: 6, lineHeight: 1.4 },
  closer: { fontSize: 9.5, lineHeight: 1.55, color: C.body, marginTop: 4 },

  // Domain pill
  pillRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  pill: { fontSize: 7.5, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: C.white, paddingVertical: 3, paddingHorizontal: 9, borderRadius: 10 },
  pillSub: { fontSize: 9, color: C.muted },

  // Flow chips
  flowRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginBottom: 6, gap: 5 },
  flowItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  flowChip: { fontSize: 8, paddingVertical: 5, paddingHorizontal: 9, borderRadius: 4, borderWidth: 1, borderColor: C.tan, backgroundColor: C.cream2, color: C.body },
  flowArrow: { fontSize: 9, color: C.faint },

  // World cards / starting-point row
  worldRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  worldCard: { flex: 1, backgroundColor: C.cream, borderRadius: 5, padding: 10 },
  worldK: { fontSize: 7.5, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase" },
  worldN: { fontFamily: "Abridge", fontSize: 18, color: C.ink, marginTop: 5, marginBottom: 2 },
  worldF: { fontSize: 7.5, color: C.muted },
  worldTag: { fontSize: 6, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 },

  // Callouts
  calloutBox: { backgroundColor: C.cream, borderLeftWidth: 2.5, borderLeftColor: C.coral, borderRadius: 4, padding: 9, marginBottom: 8 },
  calloutLabel: { fontSize: 8, fontWeight: 700, color: C.coral, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 },
  calloutText: { fontSize: 9, lineHeight: 1.5, color: C.body },
  calloutTextInk: { fontSize: 9, lineHeight: 1.5, color: C.ink },

  // Hero band (dark)
  goodHead: { fontSize: 12.5, fontWeight: 700, color: C.ink, marginBottom: 8 },
  heroBand: { backgroundColor: C.ink, borderRadius: 6, flexDirection: "row", paddingVertical: 14, marginBottom: 6 },
  // Solid pre-blended gray, NOT `rgba(255,255,255,0.14)` over `C.ink` — this
  // react-pdf/pdfkit version's `_normalizeColor` only bit-shifts a hex
  // string as 24-bit RGB (see @react-pdf/pdfkit's color mixin); a
  // fractional-alpha color that `@react-pdf/stylesheet` transforms into an
  // 8-digit RGBA hex ("#FFFFFF24") gets its alpha byte silently folded into
  // the blue channel by that bit-shift, rendering as a bright, very-much-
  // not-brand green line (confirmed by pixel-sampling the rendered PDF —
  // this was shipping on every hero band before this fix). Text `color`
  // with the same rgba syntax is unaffected (a different, opacity-aware
  // draw path), but `border*Color` is not — never use a fractional-alpha
  // color on a border in this file. #3A3A3A is white at 14% opacity
  // pre-blended over `C.ink` (#1A1A1A), computed once, not live.
  heroCell: { flex: 1, paddingHorizontal: 10, borderRightWidth: 1, borderRightColor: "#3A3A3A" },
  heroCellLast: { borderRightWidth: 0 },
  heroN: { fontFamily: "Abridge", fontSize: 21, color: C.white },
  heroK: { fontSize: 7, fontWeight: 700, color: "rgba(255,255,255,0.55)", letterSpacing: 1, textTransform: "uppercase", marginTop: 6 },

  // Table (decisions). Row/section spacing here is deliberately tight
  // (every value below trimmed by 1-4pt from an earlier draft) — a
  // priority with 6-7 committed decisions (the realistic max for
  // access/revenue) plus the trailing "fragile middle" callout otherwise
  // just misses fitting on one page, stranding the callout alone on an
  // orphan page 2 with the footer at the bottom and nothing else — a real
  // defect this exact trim closes for the common case. `tableTotal` and
  // `calloutBox` are additionally grouped into one `wrap={false}` unit on
  // the page itself (see `ValueChainPage`) so that on a genuinely long
  // table (many decisions), if a page break still happens, the total and
  // the callout land TOGETHER, never the callout alone.
  hr: { borderTopWidth: 1, borderTopColor: C.tan, marginVertical: 6 },
  tableHead: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.tan, paddingBottom: 5, marginBottom: 1 },
  th: { fontSize: 7.5, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase" },
  tableRow: { flexDirection: "row", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: "#F0ECE5" },
  tableRowAlt: { backgroundColor: C.cream2 },
  tRowName: { fontSize: 9.5, fontWeight: 700, color: C.ink },
  tRowSignal: { fontSize: 8, color: C.muted, marginTop: 2 },
  tRowOwner: { fontSize: 9, color: C.body },
  tRowDue: { fontSize: 8, color: C.faint, marginTop: 1 },
  tRowWorth: { fontSize: 9.5, fontWeight: 700, color: C.coral, textAlign: "right" },
  tRowPct: { fontSize: 7.5, color: C.muted, textAlign: "right", marginTop: 1 },
  tableTotal: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 7, marginTop: 1, borderTopWidth: 1, borderTopColor: C.tan },
  tTotalLabel: { fontSize: 9.5, fontWeight: 700, color: C.ink },
  tTotalValue: { fontFamily: "Abridge", fontSize: 15, color: C.coral },

  // Mechanism cards
  mechCard: { backgroundColor: C.cream2, borderWidth: 1, borderColor: C.tan, borderRadius: 5, padding: 11, marginBottom: 8 },
  mechHead: { fontSize: 9.5, fontWeight: 700, color: C.ink, marginBottom: 3 },
  mechNum: { fontFamily: "Abridge", fontSize: 10, color: C.coral, marginRight: 6 },
  mechBody: { fontSize: 9, lineHeight: 1.5, color: C.body },

  // Split cards
  splitRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  splitCard: { flex: 1, borderWidth: 1, borderColor: C.tan, backgroundColor: C.cream2, borderRadius: 5, padding: 11 },
  splitCardAccess: { borderColor: "#F3C9BE", backgroundColor: C.riskBg },
  splitK: { fontSize: 8, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase" },
  splitT: { fontSize: 8.5, lineHeight: 1.45, color: C.body, marginTop: 5 },

  // Split bar
  barTrack: { flexDirection: "row", height: 22, borderRadius: 4, overflow: "hidden", marginTop: 4, marginBottom: 6 },
  barAccFill: { backgroundColor: C.coral },
  barRelFill: { backgroundColor: "#E4DCD0" },
  barLabels: { flexDirection: "row", justifyContent: "space-between" },
  barLabel: { fontSize: 8.5, color: C.muted },
  barLabelBold: { fontWeight: 700, color: C.ink },

  // Numbered lists
  numberedRow: { flexDirection: "row", gap: 9, marginBottom: 4, alignItems: "flex-start" },
  numberedN: { fontFamily: "Abridge", fontSize: 12, color: C.coral, width: 20 },
  numberedT: { fontSize: 9.5, lineHeight: 1.5, color: C.body, flex: 1 },

  // Owner cards
  ownersRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 6 },
  ownerCard: { minWidth: 130, flexGrow: 1, borderWidth: 1, borderColor: C.tan, backgroundColor: C.cream2, borderRadius: 5, padding: 7 },
  ownerK: { fontSize: 7, fontWeight: 700, color: C.muted, letterSpacing: 0.8, textTransform: "uppercase" },
  ownerV: { fontSize: 9.5, fontWeight: 700, color: C.ink, marginTop: 3 },
  ownerR: { fontSize: 7.5, color: C.muted, marginTop: 1 },

  // Stat cards
  statsRow: { flexDirection: "row", gap: 8, marginTop: 10, marginBottom: 14 },
  statCard: { flex: 1, borderWidth: 1, borderColor: C.tan, backgroundColor: C.cream2, borderRadius: 5, padding: 11 },
  statK: { fontSize: 7.5, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase" },
  statN: { fontFamily: "Abridge", fontSize: 17, color: C.ink, marginTop: 6, marginBottom: 2 },
  statF: { fontSize: 7.5, color: C.muted },

  teachBox: { marginTop: 4 },

  // Cover
  // `fontFamily: "Manrope"` here (not inherited from `s.page`, since this
  // is a separate style object, not an extension of it) — without it, the
  // cover's eyebrow/subtitle/thesis/meta/disclosure text silently falls
  // back to react-pdf's core Helvetica, the one off-brand font mismatch in
  // an otherwise all-Manrope document (confirmed by inspecting the
  // rendered PDF's embedded font list — only page 1, the cover, ever uses
  // Helvetica). `coverWordmark`/`coverTitle` still override to "Abridge".
  coverPage: { padding: 0, backgroundColor: C.white, position: "relative", fontFamily: "Manrope" },
  coverWordmark: { position: "absolute", top: 52, left: 52, fontFamily: "Abridge", fontSize: 17, color: C.coral, letterSpacing: 1 },
  coverWatermark: { position: "absolute", right: -70, bottom: -140, fontFamily: "Abridge", fontSize: 460, color: "#F3F3F3" },
  coverBlock: { position: "absolute", top: 236, left: 52, right: 52 },
  coverEyebrow: { fontSize: 9.5, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: C.muted },
  coverTitle: { fontFamily: "Abridge", fontSize: 46, color: C.ink, marginTop: 10, lineHeight: 1.05 },
  coverRule: { width: 84, height: 3.5, backgroundColor: C.coral, marginTop: 16, marginBottom: 16 },
  coverSubtitle: { fontSize: 12.5, color: C.muted, letterSpacing: 0.2 },
  coverThesis: { fontSize: 11.5, lineHeight: 1.5, color: C.muted, marginTop: 4, maxWidth: 380 },
  coverMeta: { marginTop: 26 },
  coverMetaGroup: { marginBottom: 12 },
  coverMetaLabel: { fontSize: 8, fontWeight: 700, letterSpacing: 2, color: C.faint, textTransform: "uppercase" },
  coverMetaValue: { fontSize: 12.5, fontWeight: 700, color: C.ink, marginTop: 3 },
  coverMetaValueMuted: { fontSize: 12.5, color: C.body, marginTop: 3 },
  coverFoot: { position: "absolute", left: 52, right: 52, bottom: 40, borderTopWidth: 1, borderTopColor: C.hairline, paddingTop: 10 },
  coverDisc: { fontSize: 8, color: C.faint, lineHeight: 1.5, maxWidth: 400 },
});

const FLOW_STYLE = StyleSheet.create({
  start: { backgroundColor: C.coral, color: C.white, borderColor: C.coral, fontWeight: 700 },
  mid: { backgroundColor: C.cream2, color: C.body, borderColor: C.tan },
  risk: { backgroundColor: C.riskBg, color: C.coral, borderColor: C.coral, fontWeight: 700 },
  end: { backgroundColor: C.white, color: C.coral, borderColor: C.coral, borderWidth: 1.5, fontWeight: 700 },
});

// ────────────────────────────────────────────────────────────────────────
// Chrome — cover, interior header/footer (3-slot, org-name-only center,
// dynamic page numbering that excludes the unnumbered cover page).
// ────────────────────────────────────────────────────────────────────────

// react-pdf v4's <Text> has no `numberOfLines` prop (verified against this
// version's typings), so a long org name in the footer's center slot would
// otherwise wrap to 2 lines — breaking the 3-slot single-line footer
// contract (pdf_layout_guidelines.md section 1a) and, at font-size 7.5 in a
// ~300pt-wide flex:1 slot, risking a real collision with the fixed-width
// left/right slots on a third line. Truncate deterministically instead of
// hoping every partner's real organization name stays short.
const FOOTER_ORG_NAME_MAX = 60;
function truncateOrgName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length <= FOOTER_ORG_NAME_MAX) return trimmed;
  return `${trimmed.slice(0, FOOTER_ORG_NAME_MAX - 1).trimEnd()}…`;
}

function InteriorHeader() {
  return (
    <View style={s.top} fixed>
      <Text style={s.topWordmark}>ABRIDGE</Text>
      <Text style={s.topLabel}>Value Attainment Plan</Text>
    </View>
  );
}

function InteriorFooter({ orgName }: { orgName: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerLeft}>ABRIDGE</Text>
      {/* No `numberOfLines` prop exists on react-pdf v4's <Text> — a long
          org name is truncated with an ellipsis (`truncateOrgName`) rather
          than left to wrap, which is what actually happens with an
          unconstrained `flex: 1` center slot on a real long organization
          name (confirmed by rendering one — see the matrix stress test). */}
      <Text style={s.footerCenter}>{truncateOrgName(orgName)}</Text>
      <Text style={s.footerRight} render={({ pageNumber, totalPages }) => `Page ${pageNumber - 1} of ${totalPages - 1}`} />
    </View>
  );
}

function CoverPage({ data }: { data: AttainPdfData }) {
  return (
    <Page size="LETTER" style={s.coverPage}>
      <Text style={s.coverWordmark}>ABRIDGE</Text>
      <Text style={s.coverWatermark}>A</Text>
      <View style={s.coverBlock}>
        <Text style={s.coverEyebrow}>Value Attainment Plan</Text>
        <Text style={s.coverTitle}>{data.planTitle}</Text>
        <View style={s.coverRule} />
        <Text style={s.coverSubtitle}>{data.scopeSubtitle}</Text>
        {data.coverThesisLines.map((line, i) => (
          <Text key={i} style={s.coverThesis}>{line}</Text>
        ))}
        <View style={s.coverMeta}>
          <View style={s.coverMetaGroup} wrap={false}>
            <Text style={s.coverMetaLabel}>Prepared for</Text>
            <Text style={s.coverMetaValue}>{data.orgName}</Text>
          </View>
          <View style={s.coverMetaGroup} wrap={false}>
            <Text style={s.coverMetaLabel}>Prepared by</Text>
            <Text style={s.coverMetaValueMuted}>{`Abridge Partner Success · ${data.preparedDate}`}</Text>
          </View>
        </View>
      </View>
      <View style={s.coverFoot}>
        <Text style={s.coverDisc}>
          A value attainment plan is a shared commitment, co-authored at kickoff and steered monthly. Figures are
          illustrative and valued at contribution margin.
        </Text>
      </View>
    </Page>
  );
}

// ────────────────────────────────────────────────────────────────────────
// The attainment curve, reproduced as a react-pdf Svg (Path/Line/Circle),
// with text labels layered on top as absolutely-positioned <Text> nodes —
// the same convention `AppRationalizationPDFExport.tsx` /
// `ForecastPDFExport.tsx` already use for chart labels in this codebase
// (react-pdf's <Svg> does not render its own <Text> children reliably).
// Geometry mirrors `AttainmentCurve.tsx`'s smoothed 3-point plan line, the
// dashed "what usually happens" line, and the shaded gap between them.
// ────────────────────────────────────────────────────────────────────────

const CURVE_W = 480;
const CURVE_H = 190;
const CX0 = 6;
const CX1 = 474;
const CY_BASE = 158;
const CY_TOP = 20;

function cxAt(frac: number): number {
  return CX0 + Math.max(0, Math.min(1, frac)) * (CX1 - CX0);
}
function cyAt(pct: number): number {
  return CY_BASE - (Math.max(0, Math.min(100, pct)) / 100) * (CY_BASE - CY_TOP);
}
function smoothSeg(a: { x: number; y: number }, b: { x: number; y: number }): string {
  const midX = a.x + (b.x - a.x) / 2;
  return `C${midX},${a.y} ${midX},${b.y} ${b.x},${b.y}`;
}
function buildCurvePath(points: { x: number; y: number }[]): string {
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) d += ` ${smoothSeg(points[i - 1], points[i])}`;
  return d;
}

function PdfAttainmentCurve({
  pct,
  onPacePct,
  monthsElapsed,
  totalMonths,
  goalLabel,
  usualLabel,
}: {
  pct: number;
  onPacePct: number;
  monthsElapsed: number;
  totalMonths: number;
  goalLabel: string;
  usualLabel: string;
}) {
  const todayFrac = totalMonths > 0 ? monthsElapsed / totalMonths : 0;
  const xToday = Math.max(CX0 + 4, cxAt(todayFrac));
  const yTodayCoral = cyAt(pct);
  const yGoalCoral = cyAt(100);
  const coralPoints = [{ x: CX0, y: CY_BASE }, { x: xToday, y: yTodayCoral }, { x: CX1, y: yGoalCoral }];

  const usualTodayPct = USUAL_CEILING_PCT * Math.max(0, Math.min(1, todayFrac));
  const yUsualToday = cyAt(usualTodayPct);
  const yUsualFinal = cyAt(USUAL_CEILING_PCT);
  const grayPoints = [{ x: CX0, y: CY_BASE }, { x: xToday, y: yUsualToday }, { x: CX1, y: yUsualFinal }];
  const reversedGray = [...grayPoints].reverse();
  let backPath = "";
  for (let i = 1; i < reversedGray.length; i++) backPath += ` ${smoothSeg(reversedGray[i - 1], reversedGray[i])}`;
  const gapPath = `${buildCurvePath(coralPoints)} L${reversedGray[0].x},${reversedGray[0].y}${backPath} Z`;

  const yOnPaceToday = cyAt(onPacePct);
  const todayLabelX = Math.max(120, Math.min(xToday - 6, CX1 - 40));
  // Behind-pace plans (onPacePct > pct, the common case) put the hollow
  // "on-pace" marker ABOVE the coral "today" dot on the same vertical line.
  // The label's default position (14pt above the coral dot) only clears a
  // marker that is comfortably higher still — when on-pace is close to
  // today's actual pct, the label's own box and the on-pace circle (r 3.25)
  // land on top of each other. Push the label further up whenever the
  // on-pace marker is close enough to risk that, rather than assuming it is
  // always safely out of the way.
  const todayLabelY = onPacePct > pct ? Math.min(yTodayCoral - 14, yOnPaceToday - 17) : yTodayCoral - 14;
  // A plan that is fully on-pace AND fully time-elapsed (today == goal, on
  // both axes) puts the "Today" dot directly under the "Goal" label's own
  // box — their default label positions (Today to the upper-left of its
  // dot, Goal right-aligned ending at the goal's x) then overlap and render
  // as one smashed line. Detect that specific box collision and drop
  // "Today" BELOW its dot instead, centered under it, rather than
  // presuming today is always comfortably left of the goal.
  const goalLabelX = CX1 - 200;
  const goalLabelY = Math.max(0, yGoalCoral - 18);
  const todayNearGoal = todayLabelX + 90 > goalLabelX && todayLabelY < goalLabelY + 16 && todayLabelY + 16 > goalLabelY;

  return (
    <View style={{ position: "relative", marginBottom: 4 }} data-testid="pdf-attainment-curve">
      <Svg width={CURVE_W} height={CURVE_H} viewBox={`0 0 ${CURVE_W} ${CURVE_H}`}>
        <Path d={gapPath} fill={C.coral} opacity={0.06} />
        <Line x1={CX0} y1={CY_BASE} x2={CX1} y2={CY_BASE} stroke={C.tan} strokeWidth={1.25} />
        <Line x1={xToday} y1={CY_BASE} x2={xToday} y2={yTodayCoral} stroke={C.tan} strokeWidth={1} />
        <Path d={buildCurvePath(grayPoints)} fill="none" stroke={C.faint} strokeWidth={1.75} strokeDasharray="6 4" />
        <Path d={buildCurvePath(coralPoints)} fill="none" stroke={C.coral} strokeWidth={2.25} />
        <Circle cx={CX0} cy={CY_BASE} r={3} fill={C.ink} />
        <Circle cx={xToday} cy={yOnPaceToday} r={3.25} fill={C.white} stroke={C.muted} strokeWidth={1.25} />
        <Circle cx={xToday} cy={yTodayCoral} r={5.25} fill={C.coral} />
        <Circle cx={CX1} cy={yGoalCoral} r={6} fill={C.coral} />
        <Circle cx={CX1} cy={yUsualFinal} r={4} fill={C.white} stroke={C.faint} strokeWidth={1.5} />
      </Svg>

      <Text
        style={
          todayNearGoal
            ? { position: "absolute", left: Math.max(CX0, xToday - 45), top: yTodayCoral + 10, width: 90, textAlign: "center", fontSize: 8.5, fontWeight: 700, color: C.ink }
            : { position: "absolute", left: todayLabelX, top: todayLabelY, width: 90, textAlign: "right", fontSize: 8.5, fontWeight: 700, color: C.ink }
        }
      >
        {`Today · ${Math.round(pct)}%`}
      </Text>
      <Text style={{ position: "absolute", left: CX1 - 200, top: Math.max(0, yGoalCoral - 18), width: 200, textAlign: "right", fontSize: 8.5, fontWeight: 700, color: C.coral }}>
        {`Goal · ${goalLabel}`}
      </Text>
      <Text style={{ position: "absolute", left: CX1 - 220, top: yUsualFinal + 8, width: 220, textAlign: "right", fontSize: 7.5, color: C.muted }}>
        {`What usually happens · ${usualLabel}`}
      </Text>
      {/* Anchored low and early (near the deal-signed baseline) rather than
          at the geometric midpoint of the coral line — the wedge is widest
          there, so the label sits safely inside the shaded gap without
          risking a collision with a steep early rise in the coral line. */}
      <Text style={{ position: "absolute", left: CX0 + (xToday - CX0) * 0.2, top: CY_BASE - 32, fontSize: 7.5, fontWeight: 700, letterSpacing: 0.5, color: C.faint }}>
        the gap
      </Text>

      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
        <Text style={{ fontSize: 7.5, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>Deal signed</Text>
        <Text style={{ fontSize: 7.5, fontWeight: 700, color: C.coral, textTransform: "uppercase", letterSpacing: 1 }}>{`Month ${Math.round(monthsElapsed)} · Today`}</Text>
        <Text style={{ fontSize: 7.5, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>{`Month ${Math.round(totalMonths)} · Goal`}</Text>
      </View>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Small shared presentational helpers
// ────────────────────────────────────────────────────────────────────────

function StatCard({ k, n, f, coral }: { k: string; n: string; f: string; coral?: boolean }) {
  return (
    <View style={s.statCard}>
      <Text style={s.statK}>{k}</Text>
      <Text style={[s.statN, coral ? { color: C.coral } : {}]}>{n}</Text>
      <Text style={s.statF}>{f}</Text>
    </View>
  );
}

function NumberedItem({ n, text }: { n: string; text: string }) {
  return (
    <View style={s.numberedRow} wrap={false}>
      <Text style={s.numberedN}>{n}</Text>
      <Text style={s.numberedT}>{text}</Text>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Page 2 · Your Starting Point (one per priority)
// ────────────────────────────────────────────────────────────────────────

function StartingPointPage({ data, priority }: { data: AttainPdfData; priority: AttainPdfPriority }) {
  const c = priority.content;
  const multi = data.priorities.length > 1;

  return (
    <Page size="LETTER" style={s.page}>
      <InteriorHeader />
      {multi && (
        <View style={s.pillRow} wrap={false}>
          <Text style={[s.pill, { backgroundColor: priority.goalDef.pillBg }]}>{priority.goalDef.pill}</Text>
          <Text style={s.pillSub}>{priority.goalDef.domainSub}</Text>
        </View>
      )}
      <Text style={s.eyebrowCoral}>Where You Are Today</Text>
      <Text style={s.h2} minPresenceAhead={60}>Your Starting Point</Text>

      {c ? (
        <>
          <Text style={s.lead}>{c.p1Lead}</Text>

          <View style={s.worldRow} wrap={false}>
            {/* Derived scope card: the partner's real number, matching the
                "Built from N in scope" footnote. No benchmark tag. */}
            <View style={s.worldCard}>
              <Text style={s.worldK}>In scope</Text>
              <Text style={s.worldN}>{data.unitCount > 0 ? data.unitCount.toLocaleString() : "Not set yet"}</Text>
              <Text style={s.worldF}>
                {data.unitCount > 0
                  ? priority.selectedLines.length > 0
                    ? `${data.unitLabel} · ${priority.selectedLines.join(", ")}`
                    : data.unitLabel
                  : "Set on the Baseline step"}
              </Text>
            </View>
            {/* Industry benchmarks, each tagged so a benchmark is never read
                as the partner's own measured number. */}
            {c.worldCards.map((card, i) => (
              <View key={i} style={s.worldCard}>
                {card.benchmark && <Text style={s.worldTag}>Benchmark</Text>}
                <Text style={s.worldK}>{card.k}</Text>
                <Text style={[s.worldN, card.coral ? { color: C.coral } : {}]}>{card.n}</Text>
                <Text style={s.worldF}>{card.f}</Text>
              </View>
            ))}
          </View>

          <View style={s.calloutBox} wrap={false}>
            <Text style={s.calloutLabel}>The opportunity, in one line</Text>
            <Text style={s.calloutText}>{c.opportunity}</Text>
          </View>

          <View wrap={false}>
            <Text style={s.subEyebrow}>{c.trappedLabel}</Text>
            <View style={s.flowRow}>
              {c.trappedSteps.map((step, i) => (
                <View key={i} style={s.flowItem}>
                  <Text style={s.flowChip}>{step}</Text>
                  {i < c.trappedSteps.length - 1 && <Text style={s.flowArrow}>{"→"}</Text>}
                </View>
              ))}
            </View>
            <Text style={s.body}>{c.trappedCap}</Text>
          </View>

          <View wrap={false}>
            <Text style={s.goodHead}>{c.goodHead}</Text>
            <View style={s.heroBand}>
              {c.goodCells.map((cell, i) => (
                <View key={i} style={[s.heroCell, i === c.goodCells.length - 1 ? s.heroCellLast : {}]}>
                  <Text style={[s.heroN, cell.coral ? { color: C.coral } : {}]}>{cell.n}</Text>
                  <Text style={s.heroK}>{cell.k}</Text>
                </View>
              ))}
            </View>
          </View>
        </>
      ) : (
        <View style={s.calloutBox} wrap={false}>
          <Text style={s.calloutText}>
            {`Built from ${data.unitCount.toLocaleString()} ${data.unitLabel} in scope. This priority's own contribution margin, ${formatCompact(priority.margin)}, is built from ${priority.decisions.length} committed decision${priority.decisions.length === 1 ? "" : "s"}.`}
          </Text>
        </View>
      )}

      {(priority.goalOwnerName || priority.goalOwnerTitle) && (
        <Text style={s.footnote}>
          {`Outcome owner: ${[priority.goalOwnerName, priority.goalOwnerTitle].filter(Boolean).join(" · ")}`}
        </Text>
      )}
      {priority.realizationPct < 100 && (
        <Text style={s.footnote} data-testid={`pdf-realization-note-${priority.goal}`}>
          {`Attributed at ${Math.round(priority.realizationPct)}% realization to this plan - the share of this outcome credited here, when other efforts also move this number.`}
        </Text>
      )}

      <InteriorFooter orgName={data.orgName} />
    </Page>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Page 3 · Closing the Gap (combined, one page)
// ────────────────────────────────────────────────────────────────────────

function ClosingGapPage({ data }: { data: AttainPdfData }) {
  const cv = data.curve;
  const combinedNote = data.priorities.length > 1 ? ", combined across every priority in this plan" : "";
  return (
    <Page size="LETTER" style={s.page}>
      <InteriorHeader />
      <Text style={s.eyebrowCoral}>The Trajectory</Text>
      <Text style={s.h2} minPresenceAhead={60}>Closing the Gap</Text>
      <Text style={s.lead}>
        {`Most deployments drift. Time gets freed, but the fragile middle links never get steered, and realized value settles well below what the model promised. That is the dashed line below${combinedNote}. Your plan is the line above it. The distance between them is whether the middle of the chain gets steered, month by month, to a named owner.`}
      </Text>

      <PdfAttainmentCurve
        pct={cv.pct}
        onPacePct={cv.onPacePct}
        monthsElapsed={cv.monthsElapsed}
        totalMonths={cv.totalMonths}
        goalLabel={cv.goalLabel}
        usualLabel={cv.usualLabel}
      />

      <View style={s.statsRow} wrap={false}>
        <StatCard k="Attainment today" n={`${cv.pct}%`} f="Of your built plan" coral />
        <StatCard k="On-pace target" n={`${cv.onPacePct}%`} f="Where the plan expected this month" />
        <StatCard k="Runway to goal" n={`${cv.remainingMonths} mo`} f={`~${formatCompact(cv.remainingMargin)} margin remaining`} />
      </View>

      <View style={s.teachBox} wrap={false}>
        <Text style={s.subEyebrowCoral}>What bends the line</Text>
        <Text style={s.bodySmall}>
          The dashed path is not Abridge underdelivering. Adoption and time saved hit target on nearly every
          deployment. The line drifts only when the fragile middle links never get steered, month by month, to a
          named owner. The following pages give every link exactly that: an owner and a date.
        </Text>
      </View>

      <InteriorFooter orgName={data.orgName} />
    </Page>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Page 4 · The Value Chain (one per priority) — the decisions → owner →
// when → worth table, styled like the mockup's 7-link table but built from
// the partner's REAL committed decisions rather than generic role hints.
// ────────────────────────────────────────────────────────────────────────

function ValueChainPage({ data, priority }: { data: AttainPdfData; priority: AttainPdfPriority }) {
  const g = priority.goalDef;
  const c = priority.content;
  const arrow = g.chainArrow === "↑" ? "↗" : "↘";

  return (
    <Page size="LETTER" style={s.page}>
      <InteriorHeader />
      <View style={s.pillRow} wrap={false}>
        <Text style={[s.pill, { backgroundColor: g.pillBg }]}>{g.pill}</Text>
        <Text style={s.pillSub}>{g.domainSub}</Text>
      </View>
      <Text style={s.eyebrowCoral}>The Value Chain</Text>
      <Text style={s.h2} minPresenceAhead={60}>
        {g.chainTitle} <Text style={{ color: C.coral }}>{arrow}</Text>
      </Text>
      <Text style={s.body}>
        {`${g.label} is the end of a chain of links that must all fire. Abridge reliably delivers the first two, and the last two are the readout. Value leaks in the fragile middle, and every link there is owned by you. This is the map the decisions below are steering.`}
      </Text>

      <Text style={s.subEyebrow}>How value moves through the chain</Text>
      <View style={s.flowRow} wrap={false}>
        {g.flow.map((f, i) => (
          <View key={i} style={s.flowItem}>
            <Text style={[s.flowChip, FLOW_STYLE[f.kind]]}>{f.label}</Text>
            {i < g.flow.length - 1 && <Text style={s.flowArrow}>{"→"}</Text>}
          </View>
        ))}
      </View>

      <View style={s.hr} />

      <Text style={s.subEyebrow}>The decisions committed to this priority · owner, when, and worth</Text>
      {priority.decisions.length === 0 ? (
        <View style={s.calloutBox} wrap={false}>
          <Text style={s.calloutText}>No decisions are committed yet for this priority.</Text>
        </View>
      ) : (
        <>
          <View style={s.tableHead} wrap={false}>
            <Text style={[s.th, { flex: 2.4 }]}>Decision</Text>
            <Text style={[s.th, { flex: 1.3 }]}>Owner · Due</Text>
            <Text style={[s.th, { flex: 1, textAlign: "right" }]}>Worth</Text>
          </View>
          {priority.decisions.map((d, i) => (
            <View key={d.lever.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]} wrap={false}>
              <View style={{ flex: 2.4, paddingRight: 6 }}>
                <Text style={s.tRowName}>{d.lever.label}</Text>
                <Text style={s.tRowSignal}>{d.signalLabel}{d.signalBaseline ? ` · ${d.signalBaseline}` : ""}</Text>
              </View>
              <View style={{ flex: 1.3 }}>
                <Text style={s.tRowOwner}>{d.owner}</Text>
                <Text style={s.tRowDue}>{d.due}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.tRowWorth}>{formatCompact(d.contribution?.marginalMargin ?? 0)}</Text>
                <Text style={s.tRowPct}>{Math.round((d.contribution?.pctOfTotal ?? 0) * 100)}% of priority</Text>
              </View>
            </View>
          ))}
        </>
      )}

      {/* Total + the fragile-middle callout move together as ONE atomic
          unit (pdf_layout_guidelines.md rule 3's "closing sequence"
          pattern) — on a long decisions table, if this tail does not fit
          on the current page, both land on the next page TOGETHER rather
          than stranding the callout alone below an otherwise-finished
          table (the orphan this exact grouping exists to prevent). */}
      <View wrap={false}>
        {priority.decisions.length > 0 && (
          <View style={s.tableTotal}>
            <Text style={s.tTotalLabel}>Total, contribution margin, this priority</Text>
            <Text style={s.tTotalValue}>{formatCompact(priority.margin)}</Text>
          </View>
        )}
        <View style={s.calloutBox}>
          <Text style={s.calloutLabel}>The fragile middle</Text>
          <Text style={s.calloutText}>
            {c?.fragile ?? "Value leaks in the fragile middle links between what Abridge delivers and the outcome. Every link there is owned by your operations, not the software."}
          </Text>
          <Text style={s.footnoteMuted}>
            {`${priority.decisions.length} of ${priority.availableDecisionCount} available decisions committed to this priority today.`}
          </Text>
        </View>
      </View>

      <InteriorFooter orgName={data.orgName} />
    </Page>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Page 5 · The Hardest Link (one per priority) — the 3 mechanisms + the
// relief-vs-access conversion condition + the live freed-time split bar.
// ────────────────────────────────────────────────────────────────────────

function HardestLinkPage({ data, priority }: { data: AttainPdfData; priority: AttainPdfPriority }) {
  const g = priority.goalDef;
  const c = priority.content;
  const hardestArrow = c?.hardestArrow ?? g.chainArrow;
  const arrow = hardestArrow === "↑" ? "↗" : "↘";

  return (
    <Page size="LETTER" style={s.page}>
      <InteriorHeader />
      <Text style={s.eyebrowCoral}>The Hardest Link</Text>
      <Text style={s.h2} minPresenceAhead={60}>
        {c?.hardestTitle ?? "Where Value Leaks"} <Text style={{ color: C.coral }}>{arrow}</Text>
      </Text>
      <Text style={s.body}>
        {c?.hardestLead ?? `The fragile middle of ${g.label}'s chain is where value leaks if nobody owns it. The mechanisms below are how it holds.`}
      </Text>

      <View style={{ marginTop: 4, marginBottom: 12 }}>
        {g.mechanisms.map((m, i) => (
          <View key={i} style={s.mechCard} wrap={false}>
            <Text style={s.mechHead}>
              <Text style={s.mechNum}>{String(i + 1).padStart(2, "0")}  </Text>
              {m.heading}
            </Text>
            <Text style={s.mechBody}>{m.body}</Text>
          </View>
        ))}
      </View>

      {c && (
        <>
          <Text style={s.subEyebrowCoral}>{c.splitLabel}</Text>
          <View style={s.splitRow} wrap={false}>
            <View style={s.splitCard}>
              <Text style={s.splitK}>{c.splitLeft[0]}</Text>
              <Text style={s.splitT}>{c.splitLeft[1]}</Text>
            </View>
            <View style={[s.splitCard, s.splitCardAccess]}>
              <Text style={[s.splitK, { color: C.coral }]}>{c.splitRight[0]}</Text>
              <Text style={s.splitT}>{c.splitRight[1]}</Text>
            </View>
          </View>
          <Text style={s.body}>{c.splitCloser}</Text>

          <View wrap={false}>
            <Text style={s.subEyebrowCoral}>
              {priority.isFreedTimeGoal ? "Where the freed hour is going, per your split" : c.barHead}
            </Text>
            <View style={s.barTrack}>
              <View style={[s.barAccFill, { width: `${priority.barAcc}%` }]} />
              <View style={[s.barRelFill, { width: `${100 - priority.barAcc}%` }]} />
            </View>
            <View style={s.barLabels}>
              <Text style={s.barLabel}><Text style={s.barLabelBold}>{priority.barAcc}%</Text> {c.barAccLbl}</Text>
              <Text style={s.barLabel}><Text style={s.barLabelBold}>{100 - priority.barAcc}%</Text> {c.barRelLbl}</Text>
            </View>
            {priority.isFreedTimeGoal && (
              <Text style={s.footnoteMuted}>
                {`This reflects the live freed-time split from Build the case, ${data.freedTimeSplit}% to access.`}
              </Text>
            )}
          </View>
        </>
      )}

      <InteriorFooter orgName={data.orgName} />
    </Page>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Page 6 · The Cadence (one per priority) — goal-owner, the committed
// decisions' owners, the monthly check, and the renewal reframe.
// ────────────────────────────────────────────────────────────────────────

function CadencePage({ data, priority }: { data: AttainPdfData; priority: AttainPdfPriority }) {
  const g = priority.goalDef;
  const c = priority.content;

  return (
    <Page size="LETTER" style={s.page}>
      <InteriorHeader />
      <Text style={s.eyebrowCoral}>How This Gets Steered</Text>
      <Text style={s.h2} minPresenceAhead={60}>{`The Cadence, ${g.label}`}</Text>
      <Text style={s.footnote}>{`Reviewed ${data.planCadence}, plan-wide.`}</Text>
      <Text style={s.body}>
        {c?.bendsLead ?? "A plan only closes the gap if someone steers it between the big reviews, and none of it depends on Abridge having authority we do not have."}
      </Text>

      {c && c.bends.length > 0 && (
        <View style={{ marginBottom: 4 }}>
          {c.bends.map((b, i) => (
            <NumberedItem key={i} n={String(i + 1).padStart(2, "0")} text={b} />
          ))}
        </View>
      )}
      {c?.bendsCloser && <Text style={s.body}>{c.bendsCloser}</Text>}

      {c && c.monthly.length > 0 && (
        <View wrap={false}>
          <Text style={s.subEyebrowCoral}>{`The ${data.planCadence} check`}</Text>
          <Text style={s.bodySmall}>
            {`Same questions every ${data.planCadence} review. This is what keeps a bleeding decision from becoming a lost quarter.`}
          </Text>
          {c.monthly.map((q, i) => (
            <NumberedItem key={i} n={String(i + 1).padStart(2, "0")} text={q} />
          ))}
        </View>
      )}

      <Text style={s.subEyebrowCoral}>Who owns what</Text>
      <View style={s.ownersRow}>
        {(priority.goalOwnerName || priority.goalOwnerTitle) && (
          <View style={s.ownerCard} wrap={false}>
            <Text style={s.ownerK}>Goal-owner</Text>
            <Text style={s.ownerV}>{priority.goalOwnerName || "Not named yet"}</Text>
            <Text style={s.ownerR}>{priority.goalOwnerTitle || "Owns the outcome"}</Text>
          </View>
        )}
        {priority.decisions.map((d) => (
          <View key={d.lever.id} style={s.ownerCard} wrap={false}>
            <Text style={s.ownerK}>{d.lever.label}</Text>
            <Text style={s.ownerV}>{d.owner}</Text>
            <Text style={s.ownerR}>{d.due}</Text>
          </View>
        ))}
      </View>

      <View style={s.calloutBox} wrap={false}>
        <Text style={s.calloutLabel}>At renewal</Text>
        <Text style={s.calloutTextInk}>
          {c?.renewal ?? `The conversation moves from "was it worth the price" to what ${g.label.toLowerCase()} actually attained.`}
        </Text>
      </View>

      <InteriorFooter orgName={data.orgName} />
    </Page>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Document assembly
// ────────────────────────────────────────────────────────────────────────

export function AttainPDFDocument({ data }: { data: AttainPdfData }) {
  return (
    <Document title={`Abridge Value Attainment Plan · ${data.planTitle}`}>
      <CoverPage data={data} />
      {data.priorities.map((p) => (
        <StartingPointPage key={`sp-${p.goal}`} data={data} priority={p} />
      ))}
      <ClosingGapPage data={data} />
      {data.priorities.map((p) => (
        <ValueChainPage key={`vc-${p.goal}`} data={data} priority={p} />
      ))}
      {data.priorities.map((p) => (
        <HardestLinkPage key={`hl-${p.goal}`} data={data} priority={p} />
      ))}
      {data.priorities.map((p) => (
        <CadencePage key={`cd-${p.goal}`} data={data} priority={p} />
      ))}
    </Document>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Entry point — build + save, matching every other PDF export's pattern
// (`pdf(...).toBlob()` + `savePdfBlob`, see outpatient-pdf-generator.tsx).
// ────────────────────────────────────────────────────────────────────────

export async function generateAttainPdf(input: AttainPdfInput): Promise<void> {
  const data = buildAttainPdfData(input);
  const doc = <AttainPDFDocument data={data} />;
  const blob = await pdf(doc).toBlob();
  const filename = buildAttainPdfFilename(data);
  await savePdfBlob(blob, filename, `Abridge Value Attainment Plan · ${data.planTitle}`);
}
