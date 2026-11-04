import type { ReactNode } from "react";
import { EditorialHeader, EditorialShell } from "./EditorialHeader";
import type { ExploreCareSetting } from "../ExploreFlow";
import { HubTile, HubTileGrid } from "@/pages/hub/hubKit";
import { EmergencyArt, InpatientArt, NursingArt, OutpatientArt } from "@/pages/hub/hubArt";

interface Props {
  selectedSetting: ExploreCareSetting | null;
  onSelectSetting: (setting: ExploreCareSetting) => void;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
  disabledSettings?: ExploreCareSetting[];
  onDataRequest?: () => void;
}

// Step 1: the four settings as the same tan drawn tiles the hub uses, so the
// first screen of the Value Model reads as part of the app you just came from.
// Peers, not a sequence, so no 01-04 numbering. Click a tile to advance.
const SETTINGS: { id: ExploreCareSetting; name: string; blurb: string; art: ReactNode }[] = [
  { id: "outpatient", name: "Outpatient", blurb: "Primary care and specialty. Panel access, coding capture, and provider retention.", art: <OutpatientArt /> },
  { id: "ed", name: "Emergency", blurb: "The emergency department. Throughput, coding accuracy, and staff wellbeing.", art: <EmergencyArt /> },
  { id: "inpatient", name: "Inpatient", blurb: "Hospital medicine. DRG accuracy, capacity signals, and hospitalist retention.", art: <InpatientArt /> },
  { id: "nursing", name: "Nursing", blurb: "Inpatient nursing. Bedside time, nurse retention, and harm reduction.", art: <NursingArt /> },
];

export default function EdCareSetting({ selectedSetting, onSelectSetting, onNext, onBack, onHome, disabledSettings = [], onDataRequest }: Props) {
  return (
    <EditorialShell>
      <EditorialHeader stepName="Care setting" stepIndex={1} onDataRequest={onDataRequest} onBack={onBack} onHome={onHome} />
      <div className="max-w-[1200px] mx-auto px-6 sm:px-8 pt-[52px] pb-[80px]">
        <div className="text-[11px] font-extrabold tracking-[1.3px] uppercase text-[#565250]">Value Model · Step 1 of 9</div>
        <h1 className="font-abridge text-[30px] sm:text-[40px] leading-[1.08] text-[#1A1A1A] mt-[10px]">
          Which care setting<br className="hidden sm:inline" /> should we model first?
        </h1>
        <p className="text-[16.5px] text-[#565250] mt-[14px] max-w-[560px] leading-[1.55]">
          Pick one to start. Each is modeled across four areas (capacity, workforce, revenue, quality), from your own numbers, never a benchmark.
        </p>

        <div className="mt-11">
          <HubTileGrid>
            {SETTINGS.map(({ id, name, blurb, art }, i) => {
              const disabled = disabledSettings.includes(id);
              return (
                <HubTile
                  key={id}
                  title={name}
                  description={blurb}
                  art={art}
                  cta="Model this setting"
                  badge="In your proforma"
                  comingSoon={disabled}
                  selected={selectedSetting === id}
                  testId={`ed-setting-${id}`}
                  delay={0.1 + i * 0.07}
                  onClick={() => {
                    onSelectSetting(id);
                    onNext();
                  }}
                />
              );
            })}
          </HubTileGrid>
        </div>
      </div>
    </EditorialShell>
  );
}
