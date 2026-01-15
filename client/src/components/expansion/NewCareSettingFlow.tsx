import { useState } from "react";
import type { BaselineData } from "./expansion-types";
import type { CombinedDeploymentModel } from "./newCareSettingCalculations";
import { CareSettingExplorer } from "./CareSettingExplorer";
import { CombinedPreview } from "./CombinedPreview";

interface NewCareSettingFlowProps {
  baseline: BaselineData;
  onBack: () => void;
  onSave: (scenario: {
    name: string;
    type: string;
    model: CombinedDeploymentModel;
  }) => void;
}

export function NewCareSettingFlow({ baseline, onBack, onSave }: NewCareSettingFlowProps) {
  const [selectedSetting, setSelectedSetting] = useState<"ed" | "nursing" | "inpatient" | null>(null);

  if (!selectedSetting) {
    return (
      <CareSettingExplorer
        baseline={baseline}
        onSelect={setSelectedSetting}
        onBack={onBack}
      />
    );
  }

  return (
    <CombinedPreview
      baseline={baseline}
      settingType={selectedSetting}
      onBack={() => setSelectedSetting(null)}
      onSave={onSave}
    />
  );
}

export default NewCareSettingFlow;
