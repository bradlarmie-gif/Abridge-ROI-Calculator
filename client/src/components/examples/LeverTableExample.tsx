import { useState } from "react";
import { LeverTable } from "../LeverTable";
import { type Lever, type LeverId, leverDescriptions } from "@/lib/roi-types";

export default function LeverTableExample() {
  const [levers, setLevers] = useState<Lever[]>([
    { id: "patientAccess", label: "Patient Access", value: 256000, enabled: true, description: leverDescriptions.patientAccess },
    { id: "overtime", label: "Overtime & Locum Savings", value: 185600, enabled: true, description: leverDescriptions.overtime },
    { id: "workforce", label: "Workforce Retention", value: 200000, enabled: true, description: leverDescriptions.workforce },
    { id: "riskAdjustment", label: "Risk Adjustment / HCC", value: 283500, enabled: true, description: leverDescriptions.riskAdjustment },
    { id: "wrvu", label: "wRVU & Level-of-Service", value: 250110, enabled: true, description: leverDescriptions.wrvu },
    { id: "denials", label: "Denial Reduction", value: 157500, enabled: false, description: leverDescriptions.denials },
  ]);

  const handleToggle = (id: LeverId) => {
    setLevers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, enabled: !l.enabled } : l))
    );
  };

  return <LeverTable levers={levers} onToggle={handleToggle} />;
}
