import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Font, pdf } from "@react-pdf/renderer";
import { createElement } from "react";

// A tree-walking smoke test never actually rasterizes the document, so a
// NaN/Infinity reaching an Svg coordinate (the attainment curve draws Path /
// Line / Circle from live numbers) passes there but throws the moment
// @react-pdf lays the page out for real. This test does the REAL render —
// pdf(...).toBlob() — with the fonts loaded from disk, across a single-goal
// and a multi-goal plan, so a silent throw in generateAttainPdf's export path
// is caught here rather than swallowed by StepAttainment's try/catch at runtime.
//
// The Attain cover (attain-pdf.tsx's CoverPage) is text-only — an "ABRIDGE"
// wordmark, no @assets/*.png image — so unlike the App Rationalization render
// test this needs NO cover mock; only the real fonts have to be loaded.

import {
  AttainPDFDocument,
  buildAttainPdfData,
  type AttainPdfInput,
} from "@/lib/attain/attain-pdf";
import {
  defaultBaseline,
  defaultLeverValues,
  computeMultiGoalContributions,
  type LeverValues,
} from "@/lib/attain/attainLevers";
import { DEFAULT_ATTAIN_STATE } from "@/lib/attain/attainTypes";
import type { AttainSetting, GoalId } from "@/lib/attain/attainTypes";

const FONT_DIR = resolve(__dirname, "..", "assets", "fonts");
// Register by absolute path: in node @react-pdf falls through to fontkit.open(),
// which reads and parses the file directly. (Data-URI registration did not embed
// under vitest — the source's .data stayed null and layout threw on unitsPerEm.)
const fontPath = (file: string): string => {
  const p = resolve(FONT_DIR, file);
  readFileSync(p); // assert the file exists so a bad path fails loudly here
  return p;
};

beforeAll(async () => {
  // attain-pdf.tsx registered Abridge/Manrope with the vitest "stub://asset" src
  // at import time; @react-pdf's font store PUSHES sources and resolves the FIRST
  // exact-weight match, so a second register() can't win. Clear the store, then
  // re-register the built-in Helvetica (any text without an explicit family falls
  // back to it) plus the real faces from disk so toBlob() can lay out and embed.
  Font.clear();
  Font.register({
    family: "Helvetica",
    fonts: [
      { src: "Helvetica", fontWeight: 400 },
      { src: "Helvetica-Bold", fontWeight: 700 },
    ],
  });
  Font.register({ family: "Abridge", src: fontPath("abridge.otf"), fontWeight: 400 });
  Font.register({
    family: "Manrope",
    fonts: [
      { src: fontPath("manrope-regular.ttf"), fontWeight: 400 },
      { src: fontPath("manrope-bold.ttf"), fontWeight: 700 },
    ],
  });
  // Populate each source's font data up front (a source's .data stays null until
  // load() is awaited; layout reads unitsPerEm off it and would throw on null).
  await Font.load({ fontFamily: "Helvetica", fontWeight: 400 });
  await Font.load({ fontFamily: "Helvetica", fontWeight: 700 });
  await Font.load({ fontFamily: "Abridge", fontWeight: 400 });
  await Font.load({ fontFamily: "Manrope", fontWeight: 400 });
  await Font.load({ fontFamily: "Manrope", fontWeight: 700 });
});

// Build a valid AttainPdfInput off the live v1 engine (the same
// computeMultiGoalContributions AttainFlow feeds StepAttainment / generateAttainPdf),
// so every dollar/count reaching the PDF is a real finite engine figure.
function makeInput(setting: AttainSetting, goals: GoalId[]): AttainPdfInput {
  const baseline = defaultBaseline(setting);
  const valuesByGoal: Partial<Record<GoalId, LeverValues>> = Object.fromEntries(
    goals.map((g) => [g, defaultLeverValues(g, setting)]),
  );
  const freedTimeSplit = 50;
  const realizationByGoal = {};
  const combined = computeMultiGoalContributions(
    goals,
    setting,
    baseline,
    valuesByGoal,
    freedTimeSplit,
    realizationByGoal,
  );
  const unitCount = baseline.providers ?? baseline.staffedBeds ?? 40;
  return {
    state: {
      ...DEFAULT_ATTAIN_STATE,
      setting,
      scope: { unitCount, serviceLines: [] },
      monthsElapsed: 3,
      totalMonths: 9,
    },
    setting,
    goals,
    target: {
      margin: combined.combinedMargin,
      count: combined.combinedCount,
      label: `${combined.combinedCount.toLocaleString()} units of value`,
    },
    attainment: { pct: 34, onPacePct: 40, marginToDate: combined.combinedMargin * 0.25 },
    valuesByGoal,
    combined,
    commitments: {},
    goalOwnerByPriority: {},
    planCadence: "monthly",
    freedTimeSplit,
    realizationByGoal,
    orgName: "Test Health System",
  };
}

async function renderBlob(input: AttainPdfInput) {
  const doc = createElement(AttainPDFDocument, { data: buildAttainPdfData(input) });
  return pdf(doc).toBlob();
}

describe("Attain PDF (real render)", () => {
  it("(a) a single-goal plan (Outpatient · access)", async () => {
    const blob = await renderBlob(makeInput("outpatient", ["access"]));
    expect(blob.size).toBeGreaterThan(0);
  });

  it("(b) a multi-goal plan (Outpatient · access + retention + revenue)", async () => {
    const blob = await renderBlob(makeInput("outpatient", ["access", "retention", "revenue"]));
    expect(blob.size).toBeGreaterThan(0);
  });

  it("(c) a nursing quality-only plan (soft-dollar / partial realization path)", async () => {
    const blob = await renderBlob(makeInput("nursing", ["quality"]));
    expect(blob.size).toBeGreaterThan(0);
  });
});
