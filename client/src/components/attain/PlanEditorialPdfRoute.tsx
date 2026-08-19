import { useEffect } from "react";
import { PlanEditorialPdfDocument, SAMPLE_PLAN_PDF_DATA, PLAN_PDF_STORAGE_KEY, type PlanPdfData } from "./PlanEditorialPdf";
import type { AttainSetting } from "@/lib/attain/attainTypes";

const VALID_SETTINGS: readonly AttainSetting[] = ["outpatient", "ed", "inpatient", "nursing"];

/**
 * Print route for the editorial Value Attainment Plan PDF (?planpdf=1). Reads
 * the plan snapshot stashed in localStorage (org name, date, setting) and
 * renders the HTML-print document; with &print=1 it auto-opens Save-as-PDF
 * once fonts are ready. Falls back to sample data so the route always renders.
 *
 * `?planpdf=<setting>` (e.g. `?planpdf=nursing`) overrides the setting on top
 * of whatever is stashed or sampled — a verification hook that exercises every
 * care setting's owner-grouped plan without needing a live build-walk session.
 */
export default function PlanEditorialPdfRoute() {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();

  let data: PlanPdfData = SAMPLE_PLAN_PDF_DATA;
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(PLAN_PDF_STORAGE_KEY) : null;
    if (raw) data = JSON.parse(raw) as PlanPdfData;
  } catch {
    // fall back to sample
  }

  const settingParam = params.get("planpdf");
  if (settingParam && (VALID_SETTINGS as readonly string[]).includes(settingParam)) {
    data = { ...data, setting: settingParam as AttainSetting };
  }

  const autoPrint = params.get("print") === "1";
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
      <PlanEditorialPdfDocument data={data} />
    </div>
  );
}
