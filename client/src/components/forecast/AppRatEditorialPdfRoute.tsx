import { useEffect } from "react";
import { AppRatEditorialPdfDocument, SAMPLE_APPRAT_PDF_DATA, APP_RAT_PDF_STORAGE_KEY, type AppRatPdfData } from "./AppRatEditorialPdf";

/**
 * Print route for the editorial App Rationalization PDF (?appratpdf=1). Reads the
 * snapshot the flow's Export button stashed in localStorage and renders the
 * HTML-print document; with &print=1 it auto-opens the Save-as-PDF dialog once
 * fonts are ready. Falls back to sample data so the route is always renderable.
 */
export default function AppRatEditorialPdfRoute() {
  let data: AppRatPdfData = SAMPLE_APPRAT_PDF_DATA;
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(APP_RAT_PDF_STORAGE_KEY) : null;
    if (raw) data = JSON.parse(raw) as AppRatPdfData;
  } catch {
    // fall back to sample
  }

  const autoPrint =
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("print") === "1";

  useEffect(() => {
    if (!autoPrint) return;
    const fire = () => {
      try {
        window.print();
      } catch {
        // ignore
      }
    };
    const fonts = (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts;
    const t = setTimeout(() => {
      if (fonts?.ready) fonts.ready.then(fire, fire);
      else fire();
    }, 500);
    return () => clearTimeout(t);
  }, [autoPrint]);

  return (
    <div style={{ background: "#e9e5df", minHeight: "100vh", padding: "0" }}>
      <AppRatEditorialPdfDocument data={data} />
    </div>
  );
}
