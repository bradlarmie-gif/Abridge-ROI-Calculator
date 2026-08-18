import { Stethoscope, Zap, Building2, HeartPulse, ArrowRight } from "lucide-react";
import { EditorialHeader, EditorialShell } from "./EditorialHeader";
import type { ExploreCareSetting } from "../ExploreFlow";

interface Props {
  selectedSetting: ExploreCareSetting | null;
  onSelectSetting: (setting: ExploreCareSetting) => void;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
  disabledSettings?: ExploreCareSetting[];
  onDataRequest?: () => void;
}

// Editorial-minimalist step 1: one hairline list, a subtle bare icon per row, a
// rich one-line blurb, click a row to advance. The "four areas" context lives as
// one quiet line in the subhead, not a busy right-hand panel.
const SETTINGS: { id: ExploreCareSetting; name: string; blurb: string; Icon: typeof Stethoscope }[] = [
  { id: "outpatient", name: "Outpatient", blurb: "Primary care and specialty. Panel access, coding capture, and provider retention.", Icon: Stethoscope },
  { id: "ed", name: "Emergency", blurb: "The emergency department. Throughput, coding accuracy, and staff wellbeing.", Icon: Zap },
  { id: "inpatient", name: "Inpatient", blurb: "Hospital medicine. DRG accuracy, capacity signals, and hospitalist retention.", Icon: Building2 },
  { id: "nursing", name: "Nursing", blurb: "Inpatient nursing. Bedside time, nurse retention, and harm reduction.", Icon: HeartPulse },
];

export default function EdCareSetting({ selectedSetting, onSelectSetting, onNext, onBack, onHome, disabledSettings = [], onDataRequest }: Props) {
  return (
    <EditorialShell>
      <EditorialHeader stepName="Care setting" stepIndex={1} onDataRequest={onDataRequest} onBack={onBack} onHome={onHome} />
      <div className="max-w-[720px] mx-auto px-6 sm:px-8 pt-[52px] pb-[80px]">
        <div className="text-[11px] font-extrabold tracking-[1.3px] uppercase text-[#565250]">Value Model · Step 1 of 9</div>
        <h1 className="font-abridge text-[30px] sm:text-[40px] leading-[1.08] text-[#1A1A1A] mt-[10px]">
          Which care setting<br className="hidden sm:inline" /> should we model first?
        </h1>
        <p className="text-[16.5px] text-[#565250] mt-[14px] max-w-[560px] leading-[1.55]">
          Pick one to start. Each is modeled across four areas (capacity, workforce, revenue, quality), from your own numbers, never a benchmark.
        </p>

        <div className="border-t border-[#E8E2DA] mt-11">
          {SETTINGS.map(({ id, name, blurb, Icon }) => {
            const disabled = disabledSettings.includes(id);
            const selected = selectedSetting === id;
            return (
              <button
                key={id}
                type="button"
                disabled={disabled}
                data-testid={`ed-setting-${id}`}
                onClick={() => {
                  if (disabled) return;
                  onSelectSetting(id);
                  onNext();
                }}
                className={`group w-full text-left flex items-center gap-5 py-6 border-b border-[#E8E2DA] transition-all ${
                  disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:pl-2"
                }`}
              >
                <Icon
                  className={`w-6 h-6 flex-shrink-0 transition-colors ${selected ? "text-[#EA2C00]" : "text-[#B0A99E] group-hover:text-[#EA2C00]"}`}
                  strokeWidth={1.6}
                />
                <div className="min-w-0 flex-1">
                  <div className={`font-abridge text-[24px] sm:text-[26px] leading-tight transition-colors ${selected ? "text-[#EA2C00]" : "text-[#1A1A1A] group-hover:text-[#EA2C00]"}`}>
                    {name}
                  </div>
                  <div className="text-[14px] text-[#8C8073] mt-1 leading-[1.5]">{blurb}</div>
                </div>
                {disabled ? (
                  <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#B0ABA4] flex-shrink-0">In your proforma</span>
                ) : (
                  <ArrowRight
                    className={`w-5 h-5 flex-shrink-0 transition-all ${selected ? "text-[#EA2C00]" : "text-[#C9BDAD] group-hover:text-[#EA2C00] group-hover:translate-x-1"}`}
                    strokeWidth={1.8}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </EditorialShell>
  );
}
