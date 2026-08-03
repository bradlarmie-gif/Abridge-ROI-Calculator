import { useEffect } from "react";
import MethodologyEditorialPdfDocument from "./MethodologyEditorialPdf";

/**
 * Print route for the editorial Methodology PDF (?methodpdf=1). Renders the
 * HTML-print document; with &print=1 it auto-opens the browser's Save-as-PDF
 * dialog once fonts are ready. With &setting=<careSetting> it scrolls the
 * matching chapter into view (via id="chapter-<careSetting>" anchors).
 */
export default function MethodologyEditorialPdfRoute() {
  const autoPrint =
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("print") === "1";

  useEffect(() => {
    // Handle setting anchor scroll
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const setting = params.get("setting");
    if (setting) {
      const anchor = document.getElementById(`chapter-${setting}`);
      if (anchor) {
        anchor.scrollIntoView({ behavior: "auto" });
      }
    }
  }, []);

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
      <MethodologyEditorialPdfDocument />
    </div>
  );
}
