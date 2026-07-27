import { useEffect } from "react";
import { ExploreEditorialPdfDocument, SAMPLE_EXPLORE_PDF_DATA } from "./ExploreEditorialPdf";
import { EXPLORE_PDF_STORAGE_KEY, type ExplorePDFData } from "./ExplorePDFExport";

/**
 * Print route for the editorial Explore PDF (?explorepdf=1). Reads the model
 * snapshot the "Download the model" button stashed in localStorage and renders
 * the HTML-print document; with &print=1 it auto-opens the browser's
 * Save-as-PDF dialog once fonts are ready. Falls back to sample data so the
 * route is always renderable (used for visual verification too).
 */
export default function ExploreEditorialPdfRoute() {
  let data: ExplorePDFData = SAMPLE_EXPLORE_PDF_DATA;
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(EXPLORE_PDF_STORAGE_KEY) : null;
    if (raw) data = JSON.parse(raw) as ExplorePDFData;
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
      <ExploreEditorialPdfDocument data={data} />
    </div>
  );
}
