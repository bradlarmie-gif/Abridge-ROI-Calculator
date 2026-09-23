/**
 * Select-all-on-focus, without eating the first character you type.
 *
 * Numeric fields select their contents on focus so you can type straight over
 * the old figure. The select has to be deferred a tick, because the browser's
 * own focus handling collapses the selection to a caret after the handler runs.
 *
 * That defer is a race. On a click-then-type — which is how people actually use
 * a form — the keystroke can land before the timer does. The select then grabs
 * the character they just typed and the next keystroke replaces it: "2400"
 * became "400", "42" became "2". Focus never moved and no error was thrown, so
 * it read as a formatting bug rather than lost input. The visible symptom was
 * missing thousand separators: a four-digit entry silently became three digits,
 * and three digits are not grouped.
 *
 * The guard: remember the value at focus, and only select if the field still
 * holds it when the timer fires. If the user has already started typing, their
 * input is the intent and we leave it alone.
 */
export function selectAllOnFocus(el: HTMLInputElement | null | undefined): void {
  if (!el) return;
  const atFocus = el.value;
  setTimeout(() => {
    if (el.value === atFocus && document.activeElement === el) el.select();
  }, 0);
}

/**
 * Select the contents of an input that is about to be populated by a React
 * state update, without eating input if the user types first.
 *
 * Inline "click the figure to edit it" affordances set the draft in state and
 * then select it a tick later, once React has rendered. {@link selectAllOnFocus}
 * cannot guard those: it compares against the value at call time, which is the
 * OLD value, so it would never fire. Here the caller passes the value it just
 * staged, and we select only if that is genuinely what landed in the box.
 */
export function selectWhenSettled(
  el: HTMLInputElement | null | undefined,
  expected: string,
  delayMs = 30,
): void {
  setTimeout(() => {
    if (el && el.value === expected) el.select();
  }, delayMs);
}
