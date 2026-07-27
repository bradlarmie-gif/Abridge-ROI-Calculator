import { useState } from "react";
import type { ProformaSettingSnapshot, ProformaConfig } from "../proformaTypes";
import ProformaWorkbench, { SAMPLE_PROFORMA_SETTINGS, SAMPLE_PROFORMA_CONFIG } from "./ProformaWorkbench";

/**
 * THROWAWAY preview host for the editorial "Build the deal" workbench.
 * Reachable at ?proformapreview=1. Holds a cloned copy of the sample deal in
 * local state and wires every edit back through the real proforma engine so the
 * scoreboard, ramp charts, and driver bars all recompute live.
 */
function clone<T>(v: T): T {
  return typeof structuredClone === "function"
    ? structuredClone(v)
    : JSON.parse(JSON.stringify(v));
}

export default function ProformaPreview() {
  const [settings, setSettings] = useState<ProformaSettingSnapshot[]>(() => clone(SAMPLE_PROFORMA_SETTINGS));
  const [config, setConfig] = useState<ProformaConfig>(() => clone(SAMPLE_PROFORMA_CONFIG));

  const onUpdateSetting = (id: string, updates: Partial<ProformaSettingSnapshot>) =>
    setSettings((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));

  const onUpdateConfig = (updates: Partial<ProformaConfig>) =>
    setConfig((prev) => ({ ...prev, ...updates }));

  const onRemoveSetting = (id: string) =>
    setSettings((prev) => prev.filter((s) => s.id !== id));

  return (
    <ProformaWorkbench
      settings={settings}
      config={config}
      onUpdateSetting={onUpdateSetting}
      onUpdateConfig={onUpdateConfig}
      onRemoveSetting={onRemoveSetting}
    />
  );
}
