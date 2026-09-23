/**
 * The one safe way to hand a document to a print route.
 *
 * Every editorial PDF works the same way: stash a snapshot in localStorage, then
 * open `?<x>pdf=1&print=1` in a new tab, where a route reads the key back and
 * renders it. Each print route also falls back to SAMPLE data when the key is
 * missing, which is right for typing the URL directly to preview a layout.
 *
 * Combined, those two behaviours had a bad failure mode. Every export site wrote
 * the stash inside `try { … } catch { /* ignore *\/ }` and then opened the tab
 * regardless. So when the write failed — Safari private mode, ITP eviction, a
 * quota error — the export silently produced a beautifully rendered PDF of the
 * SAMPLE data: a fictional health system, with fabricated numbers, handed to a
 * customer by a seller who got no error and had no reason to look twice.
 *
 * Failing loudly is strictly better than shipping the wrong numbers, so this
 * helper writes, READS THE VALUE BACK to confirm it actually persisted (a write
 * that throws is not the only way to lose data; some browsers accept the call and
 * drop the value), and only opens the tab once the handoff is real.
 */
export class PdfHandoffError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdfHandoffError";
  }
}

export const PDF_HANDOFF_MESSAGE =
  "We could not prepare the download in this browser. Private browsing can block it. Try a normal window, or a different browser.";

/**
 * Stash `data` under `key`, verify it survived, then open `route` in a new tab.
 * Throws {@link PdfHandoffError} instead of opening a sample-data PDF.
 *
 * @param route query string including the leading "?", e.g. `?explorepdf=1&print=1`
 */
export function stashAndOpenPdf(key: string, data: unknown, route: string): void {
  let payload: string;
  try {
    payload = JSON.stringify(data);
  } catch {
    throw new PdfHandoffError("The document could not be prepared.");
  }

  try {
    localStorage.setItem(key, payload);
  } catch {
    throw new PdfHandoffError(PDF_HANDOFF_MESSAGE);
  }

  // Read back. A silent drop leaves the route on sample data, which is the whole
  // failure this helper exists to prevent, so absence is treated as failure.
  if (localStorage.getItem(key) !== payload) {
    throw new PdfHandoffError(PDF_HANDOFF_MESSAGE);
  }

  // NOTE: no pop-up-blocked check here, deliberately. `window.open` with
  // "noopener" returns null on SUCCESS as well as on failure, because the new
  // window is not allowed to reference this one. An earlier version treated null
  // as blocked and so threw a pop-up warning on every successful export. There is
  // no reliable way to detect blocking while keeping noopener, and noopener is
  // worth more than the detection.
  window.open(`${window.location.pathname}${route}`, "_blank", "noopener");
}
