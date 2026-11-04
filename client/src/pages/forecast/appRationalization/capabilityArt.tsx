import type { ReactNode } from "react";
import {
  AmbientArt, DictationArt, ScribeArt, TranscriptionArt, PreChartArt, InEncounterArt, PreBillArt, CdsArt, EvidenceArt,
} from "@/pages/hub/hubArt";
import type { AppRatCategoryId } from "@/lib/appRationalizationCalc";

// One drawing per capability, the same line-art tiles as the hub. Shared by the
// browse tiles and the add-tool popup header so the popup opens on the drawing
// that was just clicked.
export const CAPABILITY_ART: Partial<Record<AppRatCategoryId, ReactNode>> = {
  ambientDoc: <AmbientArt />,
  dictation: <DictationArt />,
  scribe: <ScribeArt />,
  transcription: <TranscriptionArt />,
  preChartRisk: <PreChartArt />,
  inEncounterCdi: <InEncounterArt />,
  postChartCoding: <PreBillArt />,
  cds: <CdsArt />,
  clinicalEvidence: <EvidenceArt />,
};
