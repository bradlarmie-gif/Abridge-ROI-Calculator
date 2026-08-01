import { useState, useMemo } from "react";
import type { ProformaSettingSnapshot, ProformaConfig } from "../proformaTypes";
import ProformaWorkbench, { SAMPLE_PROFORMA_SETTINGS, SAMPLE_PROFORMA_CONFIG } from "./ProformaWorkbench";
import ProformaCaseView from "./ProformaCaseView";
import ProformaPresentView from "./ProformaPresentView";
import { type Chapter, applyExclusions } from "./editorialShared";

/**
 * THROWAWAY preview host for the editorial proforma flow (?proformapreview=1).
 * Holds a cloned copy of the sample deal in local state and wires every edit
 * back through the real proforma engine, then routes across the three chapters
 * — Build the deal → The 3-year case → Present — so the scoreboard, charts, and
 * driver bars all recompute live from one shared source of truth.
 */
function clone<T>(v: T): T {
  return typeof structuredClone === "function"
    ? structuredClone(v)
    : JSON.parse(JSON.stringify(v));
}

const SAMPLE_ORG = "Northwind Health System"; // fictional sample org, never a real system

export default function ProformaPreview() {
  const [settings, setSettings] = useState<ProformaSettingSnapshot[]>(() => clone(SAMPLE_PROFORMA_SETTINGS));
  const [config, setConfig] = useState<ProformaConfig>(() => clone(SAMPLE_PROFORMA_CONFIG));
  const [chapter, setChapter] = useState<Chapter>("build");

  const onUpdateSetting = (id: string, updates: Partial<ProformaSettingSnapshot>) =>
    setSettings((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));

  const onUpdateConfig = (updates: Partial<ProformaConfig>) =>
    setConfig((prev) => ({ ...prev, ...updates }));

  const onRemoveSetting = (id: string) =>
    setSettings((prev) => prev.filter((s) => s.id !== id));

  const navigate = (c: Chapter) => {
    setChapter(c);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };

  // Resolve driver on/off once, so Case and Present count exactly what Build does.
  const resolved = useMemo(() => applyExclusions(settings), [settings]);

  if (chapter === "case") {
    return <ProformaCaseView settings={resolved} config={config} onNavigate={navigate} />;
  }
  if (chapter === "present") {
    return <ProformaPresentView settings={resolved} config={config} org={SAMPLE_ORG} onNavigate={navigate} />;
  }

  return (
    <ProformaWorkbench
      settings={settings}
      config={config}
      onUpdateSetting={onUpdateSetting}
      onUpdateConfig={onUpdateConfig}
      onRemoveSetting={onRemoveSetting}
      onNavigate={navigate}
    />
  );
}
