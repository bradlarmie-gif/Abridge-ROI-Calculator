import { WaterfallChart } from "../WaterfallChart";
import { type Lever } from "@/lib/roi-types";

export default function WaterfallChartExample() {
  const levers: Lever[] = [
    { id: "patientAccess", label: "Patient Access", value: 256000, enabled: true, description: "" },
    { id: "overtime", label: "Overtime & Locum", value: 185600, enabled: true, description: "" },
    { id: "workforce", label: "Workforce Retention", value: 200000, enabled: true, description: "" },
    { id: "riskAdjustment", label: "Risk Adjustment", value: 283500, enabled: true, description: "" },
    { id: "wrvu", label: "wRVU & LOS", value: 250110, enabled: true, description: "" },
    { id: "denials", label: "Denial Reduction", value: 157500, enabled: true, description: "" },
  ];

  return (
    <WaterfallChart
      levers={levers}
      investmentCost={270000}
      netValue={1062710}
    />
  );
}
