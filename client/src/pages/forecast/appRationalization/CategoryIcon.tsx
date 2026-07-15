import { AudioLines, Mic, PenLine, BookOpen, ShieldAlert, Activity, Hash, FileText, Search, Plus } from "lucide-react";
import type { AppRatIconKey } from "@/lib/appRationalizationCalc";

const MAP: Record<AppRatIconKey, typeof AudioLines> = {
  ambientDoc: AudioLines,
  dictation: Mic,
  scribe: PenLine,
  cds: BookOpen,
  preChartRisk: ShieldAlert,
  inEncounterCdi: Activity,
  postChartCoding: Hash,
  transcription: FileText,
  clinicalEvidence: Search,
  custom: Plus,
};

export function CategoryIcon({ icon, className }: { icon: AppRatIconKey; className?: string }) {
  const Cmp = MAP[icon] ?? Plus;
  return <Cmp className={className ?? "w-5 h-5"} />;
}
