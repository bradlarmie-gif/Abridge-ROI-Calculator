import { useEffect } from "react";
import { StrategyEditorialPdfDocument, sampleStrategyData, type StrategyPdfData } from "./StrategyEditorialPdf";
import { loadSnapshot } from "@/pages/attain/attainStorage";
import type { AttainSetting, GoalId } from "@/lib/attain/attainTypes";

const VALID_SETTINGS: readonly AttainSetting[] = ["outpatient", "ed", "inpatient", "nursing"];

function today(): string {
  return new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

/**
 * Print route for the editorial Value Attainment Strategy write-up (?strategypdf=1).
 * Reads the discovery snapshot (partner, setting, goals, answers) from localStorage;
 * with &print=1 auto-opens Save-as-PDF once fonts are ready. `?strategypdf=<setting>`
 * renders a full sample for that care setting so every setting is verifiable without
 * a live session.
 */
export default function StrategyEditorialPdfRoute() {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const settingParam = params.get("strategypdf");
  const forced = settingParam && (VALID_SETTINGS as readonly string[]).includes(settingParam) ? (settingParam as AttainSetting) : null;

  let data: StrategyPdfData;
  const snap = !forced ? loadSnapshot() : null;
  if (snap && snap.setting && (VALID_SETTINGS as readonly string[]).includes(snap.setting) && snap.discovery && Object.keys(snap.discovery).length) {
    const setting = snap.setting as AttainSetting;
    data = { orgName: snap.partner || "Your organization", date: today(), setting, order: (snap.goals ?? []) as GoalId[], answers: snap.discovery };
  } else {
    const setting = forced ?? "nursing";
    data = { ...sampleStrategyData(setting, snap?.partner || "Sample Health"), date: today() };
  }

  const autoPrint = params.get("print") === "1";
  useEffect(() => {
    if (!autoPrint) return;
    const fire = () => { try { window.print(); } catch { /* ignore */ } };
    const fonts = (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts;
    const t = setTimeout(() => { if (fonts?.ready) fonts.ready.then(fire, fire); else fire(); }, 500);
    return () => clearTimeout(t);
  }, [autoPrint]);

  return (
    <div style={{ background: "#e9e5df", minHeight: "100vh", padding: "0" }}>
      <StrategyEditorialPdfDocument data={data} />
    </div>
  );
}
