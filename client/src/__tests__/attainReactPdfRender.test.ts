import { describe, it, expect, beforeAll, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Font, pdf } from "@react-pdf/renderer";
import { createElement } from "react";

// A tree-walking smoke test never rasterizes the document, so a NaN reaching a
// coordinate (or an image the walk skips) passes there but throws the moment
// @react-pdf lays the page out for real. This does the REAL render —
// pdf(...).toBlob() — with fonts loaded from disk, across single-goal, multi-goal
// and the nursing-quality (no-econ-fields / seeded-assumptions) paths, so a silent
// throw in generateAttainPdf's export path is caught here, not swallowed at runtime.

// The Attain cover is the shared PDFCoverPage, which pulls in @assets/*.png; the
// vitest alias resolves those to a "stub://asset" string @react-pdf can't fetch
// during a real render. Mock the cover to a bare Page (unrelated to any layout we
// need to exercise). Use an async factory + dynamic import so the mocked Page/Text
// come from the SAME @react-pdf/renderer module instance the renderer uses.
vi.mock("@/components/pdf/PDFCoverPage", async () => {
  const { Page, Text } = await import("@react-pdf/renderer");
  return { PDFCoverPage: () => createElement(Page, { size: "LETTER" }, createElement(Text, null, "Cover")) };
});

import { buildAttainPdfDocument } from "@/pages/attain/pdf/attainReactPdf";
import { buildFromSnapshot } from "@/pages/attain/pdf/attainPdfData";
import type { AttainSnapshot } from "@/pages/attain/attainStorage";

const FONT_DIR = resolve(__dirname, "..", "assets", "fonts");
const fontPath = (file: string): string => {
  const p = resolve(FONT_DIR, file);
  readFileSync(p); // assert the file exists so a bad path fails loudly here
  return p;
};

beforeAll(async () => {
  // attainReactPdf.tsx registered Abridge/Manrope with the vitest "stub://asset"
  // src at import time; @react-pdf's font store PUSHES sources and resolves the
  // FIRST exact-weight match, so a second register() can't win. Clear the store,
  // re-register Helvetica (the mocked cover falls back to it) + the real faces
  // from disk, then preload so toBlob() can lay out and embed text.
  Font.clear();
  Font.register({ family: "Helvetica", fonts: [{ src: "Helvetica", fontWeight: 400 }, { src: "Helvetica-Bold", fontWeight: 700 }] });
  Font.register({ family: "Abridge", src: fontPath("abridge.otf"), fontWeight: 400 });
  Font.register({ family: "Manrope", fonts: [{ src: fontPath("manrope-regular.ttf"), fontWeight: 400 }, { src: fontPath("manrope-bold.ttf"), fontWeight: 700 }] });
  await Font.load({ fontFamily: "Helvetica", fontWeight: 400 });
  await Font.load({ fontFamily: "Helvetica", fontWeight: 700 });
  await Font.load({ fontFamily: "Abridge", fontWeight: 400 });
  await Font.load({ fontFamily: "Manrope", fontWeight: 400 });
  await Font.load({ fontFamily: "Manrope", fontWeight: 700 });
});

function makeSnapshot(setting: string, goals: string[], inputsByCat: Record<string, AttainSnapshot["inputsByCat"][string]>, baseline: Record<string, number>): AttainSnapshot {
  return {
    partner: "Deaconess Health System", phase: "experience", setting, goals, baseline,
    pickedByCat: {}, playsByCat: {}, answersByCat: {}, inputsByCat,
    metricsByCat: {}, readingsByCat: {}, peopleByCat: {}, customsByCat: {}, cadenceByCat: {},
    alignDone: [], planDone: [], chapter: "strategy", catIdx: 0, reviewLog: [], savedAt: 0,
  };
}

async function renderBlob(snap: AttainSnapshot) {
  const built = buildFromSnapshot(snap);
  expect(built).not.toBeNull();
  const doc = buildAttainPdfDocument(built!.data, built!.categories);
  return pdf(doc).toBlob();
}

describe("Attain live PDF (real render)", () => {
  it("(a) a single-category plan (Outpatient · Patient Access)", async () => {
    const blob = await renderBlob(makeSnapshot(
      "outpatient",
      ["access"],
      { "Patient Access": { scope: "40", econ: { perVisit: "200", minSaved: "2", visitMin: "30" }, stance: 25, custom: "" } },
      { providers: 40, annualEncounters: 140_000, utilizationPct: 70, adoptionPct: 70 },
    ));
    expect(blob.size).toBeGreaterThan(0);
  });

  it("(b) a multi-category plan (Outpatient · Access + Retention)", async () => {
    const blob = await renderBlob(makeSnapshot(
      "outpatient",
      ["access", "retention"],
      {
        "Patient Access": { scope: "40", econ: { perVisit: "200", minSaved: "2", visitMin: "30" }, stance: 25, custom: "" },
        "Provider Retention": { scope: "40", econ: { replacementCost: "400000", turnover: "6", burnout: "40" }, stance: 30, custom: "" },
      },
      { providers: 40, annualEncounters: 140_000, utilizationPct: 70, adoptionPct: 70 },
    ));
    expect(blob.size).toBeGreaterThan(0);
  });

  it("(c) a nursing quality-only plan (no econ fields, seeded assumptions)", async () => {
    const blob = await renderBlob(makeSnapshot(
      "nursing",
      ["quality"],
      { "Quality & Safety": { scope: "180", econ: { fallsRate: "3.4", hapiRate: "2.1", clabsiRate: "1.0", sepsisRate: "2.0" }, stance: 20, custom: "" } },
      { staffedBeds: 180, nursingFtes: 260, utilizationPct: 70 },
    ));
    expect(blob.size).toBeGreaterThan(0);
  });
});
