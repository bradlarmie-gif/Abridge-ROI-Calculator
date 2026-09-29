import { useMemo, useState } from "react";
import { useFlowHistory } from "@/lib/useFlowHistory";
import type { ProformaSettingSnapshot, ProformaConfig } from "../proformaTypes";
import ProformaWorkbench from "./ProformaWorkbench";
import ProformaCaseView from "./ProformaCaseView";
import ProformaPresentView from "./ProformaPresentView";
import { type Chapter, applyExclusions } from "./editorialShared";

/**
 * Live host for the editorial proforma flow. Unlike ProformaPreview (which
 * clones the sample deal), this is driven entirely by the app's real deal
 * state, so it is the screen a customer reaches from "take into full proforma"
 * at the end of Explore. It owns only the chapter routing — Build → Case →
 * Present — and passes every edit straight back up to App's proforma state.
 */
export interface ProformaEditorialHostProps {
  settings: ProformaSettingSnapshot[];
  config: ProformaConfig;
  onUpdateSetting: (id: string, updates: Partial<ProformaSettingSnapshot>) => void;
  onUpdateConfig: (updates: Partial<ProformaConfig>) => void;
  onRemoveSetting: (id: string) => void;
  onAddSetting: (careSetting?: string) => void;
  onBack: () => void;
  onHome?: () => void; // Abridge logo → top home hub
  org?: string;
}

export default function ProformaEditorialHost({
  settings,
  config,
  onUpdateSetting,
  onUpdateConfig,
  onRemoveSetting,
  onAddSetting,
  onBack,
  onHome,
  org = "Your organization",
}: ProformaEditorialHostProps) {
  const [chapter, setChapter] = useState<Chapter>("build");

  // The three chapters are real history entries, so the browser Back button
  // steps back through them rather than exiting the tool outright.
  const navigate = useFlowHistory("proforma", "build", (c) => setChapter(c as Chapter));

  // Resolve driver on/off once, so Case and Present count exactly what Build does.
  const resolved = useMemo(() => applyExclusions(settings), [settings]);

  if (chapter === "case") {
    return <ProformaCaseView settings={resolved} config={config} onNavigate={navigate} onHome={onHome} />;
  }
  if (chapter === "present") {
    return <ProformaPresentView settings={resolved} config={config} org={org} onNavigate={navigate} onHome={onHome} />;
  }

  return (
    <ProformaWorkbench
      settings={settings}
      config={config}
      onUpdateSetting={onUpdateSetting}
      onUpdateConfig={onUpdateConfig}
      onRemoveSetting={onRemoveSetting}
      onNavigate={navigate}
      onAddSetting={onAddSetting}
      onBack={onBack}
      onHome={onHome}
    />
  );
}
