/**
 * The money model for one provider working out their own return.
 *
 * Pulled out of the screen so it can be tested on its own, and because the
 * question it answers is not really "how much" but "whose". The arithmetic is
 * the same for every reader: minutes off a note become hours, a coding lift
 * lands on the visits they already do, and reclaimed time makes room for
 * visits that were not happening. What changes is where those dollars go.
 *
 * That is the whole reason `payModel` exists. A doctor paid on productivity
 * gets paid for better coding and for an extra patient. A doctor on a flat
 * salary gets neither: both are revenue for whoever employs them, and what the
 * doctor gets is the time. The screen used to say this about the coding lift
 * and stay quiet about the extra visits, which meant a salaried reader watched
 * a total climb that would never reach them. Same fate, same gate.
 */

export type PayModel = "productivity" | "salary";

/** A working year, allowing for leave. */
export const SOLO_WEEKS = 46;

/**
 * The haircut on a coding lift: take a fifth off, keep the rest.
 *
 * Framed as a reduction, not as a share. "The note is credited with 75% of it"
 * reads as though three quarters were being claimed on the note's behalf. What
 * is actually happening is smaller and easier to argue with: the lift they
 * entered is reduced by 20% to allow for the other things that move the same
 * number (coding education, CDI review, and fuller notes that still do not get
 * paid the way they should).
 */
export const SOLO_HAIRCUT = 0.2;

export interface SoloInputs {
  /** null until they have said how they are paid; no dollars are attributed before then. */
  payModel: PayModel | null;
  perWeek: number;
  noteNow: number;
  noteWith: number;
  wrvuNow: number;
  wrvuWith: number;
  perWrvu: number;
  visitMins: number;
  extraPerWeek: number;
  /** What comes out of their own pocket, a year. */
  cost: number;
}

export interface SoloModel {
  visitsYear: number;
  savedPerNote: number;
  hoursBack: number;
  maxExtraPerWeek: number;
  extra: number;
  extraYear: number;
  hoursSpent: number;
  hoursKept: number;
  lift: number;
  codingGain: number;
  extraGain: number;
  /** Coding plus extra visits, before deciding whose it is. */
  grossValue: number;
  /** The share that reaches the provider. Zero on a flat salary. */
  toYou: number;
  /** The share that reaches whoever employs them. Zero when they are paid on productivity. */
  toPractice: number;
  /** In the provider's own pocket: what reaches them, less what they pay. */
  net: number;
  /** Only meaningful when the value and the cost are both theirs. */
  multiple: number;
  hasTime: boolean;
  hasMoney: boolean;
}

export function soloModel(i: SoloInputs): SoloModel {
  const visitsYear = i.perWeek * SOLO_WEEKS;
  const savedPerNote = Math.max(0, i.noteNow - i.noteWith);
  const hoursBack = (savedPerNote * visitsYear) / 60;

  // the reclaimed time is the budget, and it is the only budget
  const maxExtraPerWeek = i.visitMins > 0 ? Math.floor(((hoursBack / SOLO_WEEKS) * 60) / i.visitMins) : 0;
  const extra = Math.max(0, Math.min(i.extraPerWeek, maxExtraPerWeek));
  const extraYear = extra * SOLO_WEEKS;
  const hoursSpent = (extraYear * i.visitMins) / 60;
  const hoursKept = Math.max(0, hoursBack - hoursSpent);

  // fuller notes on the visits already happening
  const lift = Math.max(0, i.wrvuWith - i.wrvuNow);
  const codingGain = visitsYear * lift * i.perWrvu * (1 - SOLO_HAIRCUT);
  // and the visits the reclaimed time makes room for, at their own rate. No
  // haircut here: an extra visit is a whole visit that either happened or did
  // not, so there is no other factor to take a fifth off for.
  const extraGain = extraYear * (i.wrvuWith > 0 ? i.wrvuWith : i.wrvuNow) * i.perWrvu;

  const grossValue = codingGain + extraGain;
  const toYou = i.payModel === "productivity" ? grossValue : 0;
  const toPractice = i.payModel === "salary" ? grossValue : 0;
  const net = toYou - i.cost;
  const multiple = i.payModel === "productivity" && i.cost > 0 ? toYou / i.cost : 0;

  return {
    visitsYear, savedPerNote, hoursBack,
    maxExtraPerWeek, extra, extraYear, hoursSpent, hoursKept,
    lift, codingGain, extraGain,
    grossValue, toYou, toPractice, net, multiple,
    hasTime: hoursBack > 0,
    hasMoney: i.payModel !== null && grossValue > 0,
  };
}
