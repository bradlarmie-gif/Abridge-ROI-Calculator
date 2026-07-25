import { describe, it, expect, beforeAll, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Font, pdf } from "@react-pdf/renderer";
import { createElement } from "react";

// The smoke test only walks the React tree; it never actually rasterizes the
// document, so a NaN/Infinity reaching an Svg coordinate (or an image the tree
// walk skips) passes there but throws the moment @react-pdf renders for real.
// This test does the real render — pdf(...).toBlob() — with the fonts loaded
// from disk, across the datasets that shook out the export-does-nothing bug.

// The cover page pulls in @assets/*.png, which the vitest alias resolves to a
// "stub://asset" string that @react-pdf can't fetch during a real render. That
// is unrelated to the chart bug we're chasing, so mock the cover to a bare Page.
// Use an async factory + dynamic import so the mocked Page/Text come from the
// SAME @react-pdf/renderer module instance (and font store) the renderer uses;
// a require() here pulls a second copy whose fonts never load (unitsPerEm null).
vi.mock("@/components/pdf/PDFCoverPage", async () => {
  const { Page, Text } = await import("@react-pdf/renderer");
  return { PDFCoverPage: () => createElement(Page, { size: "LETTER" }, createElement(Text, null, "Cover")) };
});

import { buildAppRationalizationPDFDocument } from "@/components/forecast/AppRationalizationPDFExport";
import { makeItem, type AppRatItem, type AppRatCategoryId } from "@/lib/appRationalizationCalc";

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
  // The module registered Abridge/Manrope with the vitest "stub://asset" src at
  // import time; @react-pdf's font store PUSHES sources and resolves the FIRST
  // exact-weight match, so a second register() can't win. Clear the store, then
  // re-register the built-in Helvetica (the mocked cover falls back to it) plus
  // the real faces from disk so toBlob() can lay out and embed text.
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
  // Helvetica included: the store normally pre-loads it in its constructor, but
  // clear() wiped that, and any text without an explicit family falls back to it.
  await Font.load({ fontFamily: "Helvetica", fontWeight: 400 });
  await Font.load({ fontFamily: "Helvetica", fontWeight: 700 });
  await Font.load({ fontFamily: "Abridge", fontWeight: 400 });
  await Font.load({ fontFamily: "Manrope", fontWeight: 400 });
  await Font.load({ fontFamily: "Manrope", fontWeight: 700 });
});

const tool = (
  id: string, cat: AppRatCategoryId, spend: number, pct: number,
  contractMonths: number, sunsetMonths: number, vendor: string,
): AppRatItem => ({ ...makeItem(id, cat), annualSpend: spend, coveragePct: pct, contractMonths, sunsetMonths, vendorName: vendor });

async function renderBlob(items: AppRatItem[], org: string, price: number, term: number) {
  const doc = buildAppRationalizationPDFDocument(items, org, price, term);
  return pdf(doc).toBlob();
}

describe("App Rationalization PDF (real render)", () => {
  it("(a) realistic 3-tool stack, partial coverage, mixed renewals", async () => {
    const items = [
      tool("a", "ambientDoc", 90_000, 90, 6, 6, "Nuance DAX"),
      tool("b", "scribe", 487_500, 75, 24, 12, "Human Scribe"),
      tool("c", "transcription", 440_000, 60, 18, 18, "IMex"),
    ];
    const blob = await renderBlob(items, "Deaconess Health System", 0, 3);
    expect(blob.size).toBeGreaterThan(0);
  });

  it("(b) a single tool", async () => {
    const blob = await renderBlob([tool("a", "dictation", 200_000, 80, 12, 6, "Dragon")], "Acme", 0, 3);
    expect(blob.size).toBeGreaterThan(0);
  });

  it("(c) a stays-only tool (coveragePct 0)", async () => {
    const blob = await renderBlob([tool("a", "cds", 60_000, 0, 12, 12, "UpToDate")], "Acme", 0, 3);
    expect(blob.size).toBeGreaterThan(0);
  });

  it("(d) empty items", async () => {
    const blob = await renderBlob([], "Acme", 0, 3);
    expect(blob.size).toBeGreaterThan(0);
  });

  it("(e) all-at-renewal (no early exit)", async () => {
    const items = [
      tool("a", "ambientDoc", 90_000, 90, 12, 12, "Nuance DAX"),
      tool("b", "scribe", 487_500, 75, 24, 24, "Human Scribe"),
      tool("c", "transcription", 440_000, 60, 18, 18, "IMex"),
    ];
    const blob = await renderBlob(items, "Deaconess Health System", 0, 3);
    expect(blob.size).toBeGreaterThan(0);
  });

  it("(f) a net-cost price still renders", async () => {
    const items = [tool("a", "ambientDoc", 90_000, 90, 12, 6, "Nuance DAX")];
    const blob = await renderBlob(items, "Acme", 600_000, 3);
    expect(blob.size).toBeGreaterThan(0);
  });
});
