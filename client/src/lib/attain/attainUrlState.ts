import LZString from "lz-string";
import type { AttainState, AttainSetting, GoalId } from "./attainTypes";
import type { AttainBaseline, LeverValues, RealizationByGoal } from "./attainLevers";
import type { Commitment, CommitmentSignal, GoalOwner, SignalCadence } from "@/pages/attain/steps/StepCommit";
import type { ProgressEntry } from "./attainProgress";
import type { AttainPlanning } from "./attainPlanning";

/**
 * Save-and-return for the Attain flow.
 *
 * This is a SHAREABLE-LINK + LOCAL-DRAFT layer only. It encodes the full
 * client-side plan (every field a partner built across Setting -> Vision ->
 * Scope -> Build the case -> Commit -> Attainment) into one compressed,
 * URL-safe string, the same lz-string pattern `intakeUrlState.ts` and
 * `dataRequestUrlState.ts` already use for Explore/Measure deep links. A
 * copied link (or a localStorage draft written under the same shape, see
 * `ATTAIN_DRAFT_STORAGE_KEY`) is what makes a plan resumable on this device
 * or any device that opens the link.
 *
 * True multi-user, cross-session persistence (a partner's plan tied to a
 * real account, editable from any device, never expiring, with real access
 * control) needs a backend + accounts layer. That is a future task; this
 * file is deliberately just the client-side encode/decode + local-draft
 * half of "save and return", matching the ceiling every other Attain data
 * module (attainLevers.ts's AttainBaseline, attainProgress.ts's
 * ProgressEntry) already sits under.
 */

/** Bump this whenever `AttainSaveState`'s shape changes in a way an older
 * encoded link cannot safely decode into (a renamed/removed required field).
 * `decodeAttain` refuses anything with a different version rather than
 * guessing at a migration, so a stale link degrades to "start fresh" instead
 * of rehydrating a corrupt plan.
 *
 * Bumped 1 -> 2 when `realizationByGoal` (the per-priority realization/
 * attribution rate) was added as a new required field - an older link never
 * carried it, so it cannot be safely decoded into the current shape; per
 * this file's own policy, that link degrades to "start fresh" rather than
 * guessing a default.
 *
 * Bumped 2 -> 3 for the Commit redesign: each `Commitment` now carries one
 * required signal + a list of optional signals (was one flat `signals`
 * list, each with its own cadence) and this save state gained the new
 * plan-wide `planCadence` field. An older link's `commitments` shape and
 * missing `planCadence` cannot be safely decoded into the current shape,
 * so it degrades to "start fresh" too. */
export const ATTAIN_SAVE_VERSION = 3;

/** The full local state AttainFlow.tsx holds for one in-progress or
 * completed plan — everything needed to redraw every step (including the
 * Attainment hub's Strategy and Progress tabs) exactly as the partner left
 * it. Deliberately flat and additive to the existing locked engine types
 * (`AttainState`, `AttainBaseline`, `LeverValues`) rather than changing any
 * of them. */
export interface AttainSaveState {
  version: number;
  /** ISO timestamp of when this was saved — shown on the resume prompt so a
   * returning partner can tell how stale a draft is. */
  savedAt: string;
  state: AttainState;
  goals: GoalId[];
  valuesByGoal: Partial<Record<GoalId, LeverValues>>;
  commitments: Record<string, Commitment>;
  goalOwnerByPriority: Partial<Record<GoalId, GoalOwner>>;
  /** Every committed signal's dated log (key = `${goal}:${leverId}:${signalId}`)
   * — persisted so a returned plan shows its real history, not just its
   * current numbers. */
  progressEntries: Record<string, ProgressEntry[]>;
  baseline: AttainBaseline;
  freedTimeSplit: number;
  /** Per-priority realization/attribution rate (0-100, default 100) - see
   * attainLevers.ts's `applyRealization`. Keyed by `GoalId`, same convention
   * as `valuesByGoal`/`goalOwnerByPriority` above. */
  realizationByGoal: RealizationByGoal;
  /** ONE plan-wide review cadence (Commit redesign) - replaces what used to
   * be a cadence chosen per signal. Every committed signal's "next check
   * due" (Progress tab, PDF) derives off this single value. */
  planCadence: SignalCadence;
  /** The rebuilt "Planning" step's editable layer for the outpatient Access
   * plan (per-phase owners/signal-targets and one optional partner risk).
   * OPTIONAL and additive: an older v3 link never carried it and still
   * decodes cleanly (see `isWellFormedSaveState`), so no version bump is
   * needed. `undefined` simply means "no phase overrides", which every
   * downstream resolver already treats as fall-back-to-derived. */
  planning?: AttainPlanning;
}

const VALID_SETTINGS: AttainSetting[] = ["outpatient", "ed", "inpatient", "nursing"];
const VALID_GOALS: GoalId[] = ["access", "retention", "revenue", "quality", "capacity"];
const VALID_CADENCES: SignalCadence[] = ["weekly", "biweekly", "monthly", "quarterly"];

function isValidCadence(v: unknown): v is SignalCadence {
  return typeof v === "string" && (VALID_CADENCES as string[]).includes(v);
}

function isValidSetting(v: unknown): v is AttainSetting {
  return typeof v === "string" && (VALID_SETTINGS as string[]).includes(v);
}

function isValidGoal(v: unknown): v is GoalId {
  return typeof v === "string" && (VALID_GOALS as string[]).includes(v);
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** One `CommitmentSignal` (required or optional) — every field StepAttainment
 * and AttainFlow read off a signal without a fallback (`sig.label.trim()`,
 * `sig.id`, `sig.baseline`, `sig.unit`), so a signal missing any of these
 * would crash the hub rather than just rendering blank. */
function isWellFormedCommitmentSignal(v: unknown): v is CommitmentSignal {
  return (
    isPlainObject(v) &&
    typeof v.id === "string" &&
    typeof v.label === "string" &&
    typeof v.baseline === "string" &&
    typeof v.unit === "string"
  );
}

/** One committed decision — its own required signal (always present, never
 * optional on `Commitment`'s type) plus a well-formed `optionalSignals`
 * array. A commitment missing `requiredSignal` or carrying a malformed one
 * is exactly the shape that used to reach StepAttainment/AttainFlow's
 * unguarded `commitment.requiredSignal` reads and crash the hub. */
function isWellFormedCommitment(v: unknown): v is Commitment {
  return (
    isPlainObject(v) &&
    typeof v.owner === "string" &&
    typeof v.due === "string" &&
    isWellFormedCommitmentSignal(v.requiredSignal) &&
    Array.isArray(v.optionalSignals) &&
    v.optionalSignals.every(isWellFormedCommitmentSignal)
  );
}

/** The Planning step's editable layer — every field optional, each a plain
 * string map or a single string, so a partial or absent blob is valid; only
 * an actively wrong-typed value fails. */
function isWellFormedPlanning(v: unknown): v is AttainPlanning {
  if (!isPlainObject(v)) return false;
  const stringRecordOk = (r: unknown): boolean =>
    r === undefined || (isPlainObject(r) && Object.values(r).every((x) => typeof x === "string"));
  if (!stringRecordOk(v.phaseOwners)) return false;
  if (!stringRecordOk(v.phaseSignalLabels)) return false;
  if (!stringRecordOk(v.phaseSignalTargets)) return false;
  if (v.partnerRisk !== undefined && typeof v.partnerRisk !== "string") return false;
  return true;
}

/** Structural validation only — this never throws, and never trusts a field
 * whose shape doesn't match what AttainFlow expects, even if the JSON
 * parsed cleanly (a hand-edited or truncated URL param is still valid
 * JSON). Anything that fails a check here means `decodeAttain` returns null
 * rather than handing AttainFlow a plan that could NaN or crash downstream. */
function isWellFormedSaveState(v: unknown): v is AttainSaveState {
  if (!isPlainObject(v)) return false;
  if (typeof v.version !== "number" || v.version !== ATTAIN_SAVE_VERSION) return false;
  if (typeof v.savedAt !== "string") return false;
  if (!isPlainObject(v.state)) return false;
  if (v.state.setting !== null && !isValidSetting(v.state.setting)) return false;
  if (v.state.goal !== null && !isValidGoal(v.state.goal)) return false;
  if (!isPlainObject(v.state.scope)) return false;
  if (typeof v.state.monthsElapsed !== "number") return false;
  if (typeof v.state.totalMonths !== "number") return false;
  if (typeof v.state.progressRatio !== "number") return false;
  if (!Array.isArray(v.goals) || !v.goals.every(isValidGoal)) return false;
  if (!isPlainObject(v.valuesByGoal)) return false;
  // Deep-validated (not just "is an object") — see `isWellFormedCommitment`'s
  // doc: the Commit redesign's required-signal/optional-signals shape is
  // exactly what a hand-edited or truncated v3 link corrupts most easily,
  // and every downstream read of it (StepAttainment, AttainFlow) trusts the
  // shape rather than guarding every field itself.
  if (!isPlainObject(v.commitments) || !Object.values(v.commitments).every(isWellFormedCommitment)) return false;
  if (!isPlainObject(v.goalOwnerByPriority)) return false;
  if (!isPlainObject(v.progressEntries)) return false;
  if (!isPlainObject(v.baseline)) return false;
  if (typeof v.freedTimeSplit !== "number") return false;
  if (!isPlainObject(v.realizationByGoal)) return false;
  if (!isValidCadence(v.planCadence)) return false;
  // `planning` is optional and additive — only shape-checked when present, so
  // an older v3 link (which never carried it) still decodes. A malformed
  // `planning` blob degrades to "start fresh", the same policy as every other
  // field, rather than being trusted blind.
  if (v.planning !== undefined && !isWellFormedPlanning(v.planning)) return false;
  return true;
}

/** Encodes a full plan into a compressed, URL-safe string — the payload
 * that goes after `?attain=` in a shareable link, and the value written to
 * the localStorage draft key below. */
export function encodeAttain(saveState: AttainSaveState): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(saveState));
}

/** Decodes a `?attain=` param (or a localStorage draft) back into a full
 * plan. Defensive at every step — malformed, truncated, non-JSON, or
 * shape-mismatched input, and a version mismatch from an older/newer link,
 * all resolve to `null` rather than throwing or handing back a corrupt
 * plan. Callers should treat `null` as "nothing to restore, start fresh". */
export function decodeAttain(encoded: string): AttainSaveState | null {
  if (!encoded) return null;
  try {
    const decompressed = LZString.decompressFromEncodedURIComponent(encoded);
    if (!decompressed) return null;
    const parsed = JSON.parse(decompressed);
    if (!isWellFormedSaveState(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Stable localStorage key for the one in-progress draft this browser is
 * mid-way through — deliberately singular (not a list) since a partner
 * building a plan has exactly one "in progress right now" plan to resume,
 * matching how `abridge_partner_session` etc. in App.tsx are single stable
 * keys, not a per-plan namespace. */
export const ATTAIN_DRAFT_STORAGE_KEY = "abridge_attain_draft";

/** Writes (or overwrites) the local draft. Called on every Save click so
 * the most recent Save is always what a fresh visit offers to resume.
 * Swallows storage errors (private browsing, quota) — a failed local save
 * should never block the copy-link half of Save. */
export function writeAttainDraft(saveState: AttainSaveState): void {
  try {
    localStorage.setItem(ATTAIN_DRAFT_STORAGE_KEY, encodeAttain(saveState));
  } catch {
    /* ignore — private browsing or storage quota; the shareable link still worked */
  }
}

/** Reads back the local draft, or null if there isn't one / it is corrupt.
 * Never throws. */
export function readAttainDraft(): AttainSaveState | null {
  try {
    const raw = localStorage.getItem(ATTAIN_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    return decodeAttain(raw);
  } catch {
    return null;
  }
}

/** Clears the local draft — used once a partner explicitly dismisses the
 * resume prompt for good, or (future) once a plan is considered "done". */
export function clearAttainDraft(): void {
  try {
    localStorage.removeItem(ATTAIN_DRAFT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
