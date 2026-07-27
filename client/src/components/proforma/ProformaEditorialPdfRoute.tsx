import { useEffect } from "react";
import {
  ProformaEditorialPdfDocument,
  SAMPLE_PROFORMA_PDF_DATA,
  PROFORMA_PDF_STORAGE_KEY,
  type ProformaPdfData,
} from "./ProformaEditorialPdf";
import { buildProformaPdfData } from "./ProformaPDFExport";
import { SAMPLE_PROFORMA_SETTINGS, SAMPLE_PROFORMA_CONFIG } from "@/pages/proforma/editorial/ProformaWorkbench";
import type { ProformaSettingSnapshot, ProformaDriver, ExploreQuadrant, DriverOnset } from "@/pages/proforma/proformaTypes";

/**
 * Print route for the editorial proforma PDF (?proformapdf=1). Reads the deal
 * snapshot the "Download the proforma" button stashed in localStorage and
 * renders the HTML-print document; with &print=1 it auto-opens Save-as-PDF once
 * fonts are ready. Falls back to sample data so the route is always renderable.
 *
 * `?sample=3` / `?sample=4` render engine-built variants over 3 / 4 sample care
 * settings — a verification hook that exercises the per-setting page loop and
 * the no-bleed pagination (nothing may exceed 1056px).
 */
function clone<T>(v: T): T {
  return typeof structuredClone === "function" ? structuredClone(v) : JSON.parse(JSON.stringify(v));
}

type Spec = { id: string; name: string; value: number; quadrant: ExploreQuadrant; onset: DriverOnset; category: "time" | "documentation" };

function synthSetting(
  template: ProformaSettingSnapshot,
  id: string,
  label: string,
  careSetting: ProformaSettingSnapshot["careSetting"],
  specs: Spec[],
): ProformaSettingSnapshot {
  const drivers: ProformaDriver[] = specs.map((s) => ({ id: s.id, name: s.name, value: s.value, quadrant: s.quadrant, onset: s.onset, category: s.category }));
  const q = (name: ExploreQuadrant) => drivers.filter((d) => d.quadrant === name).reduce((a, d) => a + d.value, 0);
  const annualValue = drivers.reduce((a, d) => a + d.value, 0);
  return {
    ...clone(template),
    id,
    label,
    careSetting,
    drivers,
    annualValue,
    capacityValue: q("Capacity"),
    workforceValue: q("Workforce"),
    revenueValue: q("Revenue"),
    qualityValue: q("Quality"),
    timeValue: q("Capacity"),
    docValue: q("Revenue"),
    retentionValue: q("Workforce"),
  };
}

function sampleVariant(n: number): ProformaPdfData {
  const base = clone(SAMPLE_PROFORMA_SETTINGS) as ProformaSettingSnapshot[];
  const settings = [...base];
  const template = base[0];
  if (n >= 3) {
    settings.push(
      synthSetting(template, "inpatient-1", "Inpatient", "inpatient", [
        { id: "ipDrg", name: "DRG / case-mix accuracy", value: 380000, quadrant: "Revenue", onset: "delayed", category: "documentation" },
        { id: "ipObsDefense", name: "Observation status defense", value: 190000, quadrant: "Revenue", onset: "delayed", category: "documentation" },
        { id: "patientAccess", name: "Throughput, freed clinician time", value: 120000, quadrant: "Capacity", onset: "immediate", category: "time" },
        { id: "providerWellbeing", name: "Provider wellbeing", value: 70000, quadrant: "Workforce", onset: "phased", category: "time" },
      ]),
    );
  }
  if (n >= 4) {
    // Driver-heavy nursing setting to force multi-page pagination (no bleed).
    settings.push(
      synthSetting(template, "nursing-1", "Nursing", "nursing", [
        { id: "nursingOt", name: "Overtime reduction", value: 210000, quadrant: "Capacity", onset: "immediate", category: "time" },
        { id: "patientAccess", name: "Bedside time returned", value: 160000, quadrant: "Capacity", onset: "immediate", category: "time" },
        { id: "retention", name: "Nurse retention", value: 240000, quadrant: "Workforce", onset: "phased", category: "time" },
        { id: "locum", name: "Agency & travel avoidance", value: 130000, quadrant: "Workforce", onset: "phased", category: "time" },
        { id: "nursingHapi", name: "HAPI prevention", value: 90000, quadrant: "Revenue", onset: "delayed", category: "documentation" },
        { id: "nursingFalls", name: "Fall prevention", value: 80000, quadrant: "Revenue", onset: "delayed", category: "documentation" },
        { id: "nursingSepsis", name: "Sepsis recognition", value: 110000, quadrant: "Revenue", onset: "delayed", category: "documentation" },
      ]),
    );
  }
  return buildProformaPdfData(settings, clone(SAMPLE_PROFORMA_CONFIG), "Deaconess Health System", "July 2026");
}

export default function ProformaEditorialPdfRoute() {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const sampleN = Number(params.get("sample") || "0");

  let data: ProformaPdfData = SAMPLE_PROFORMA_PDF_DATA;
  if (sampleN === 3 || sampleN === 4) {
    data = sampleVariant(sampleN);
  } else {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(PROFORMA_PDF_STORAGE_KEY) : null;
      if (raw) data = JSON.parse(raw) as ProformaPdfData;
    } catch {
      // fall back to sample
    }
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

  return <ProformaEditorialPdfDocument data={data} />;
}
