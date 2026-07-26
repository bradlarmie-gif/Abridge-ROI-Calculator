import { Check, Stethoscope, Zap, Building2, HeartPulse } from "lucide-react";
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

const SETTINGS: {
  id: ExploreCareSetting;
  name: string;
  sub: string;
  desc: string;
  Icon: typeof Stethoscope;
}[] = [
  { id: "outpatient", name: "Outpatient", sub: "Primary care & specialty", desc: "wRVU capture, patient access, documentation quality, and provider wellbeing.", Icon: Stethoscope },
  { id: "ed", name: "Emergency", sub: "Emergency department", desc: "Throughput, LWBS reduction, E&M accuracy, and downstream capture.", Icon: Zap },
  { id: "inpatient", name: "Inpatient", sub: "Hospital medicine", desc: "DRG accuracy, CC/MCC capture, CDI efficiency, and denial prevention.", Icon: Building2 },
  { id: "nursing", name: "Nursing", sub: "Inpatient nursing", desc: "Overtime reduction, retention, care quality, and bedside time.", Icon: HeartPulse },
];

const SETTING_LABEL: Record<ExploreCareSetting, string> = {
  outpatient: "Outpatient",
  ed: "Emergency",
  inpatient: "Inpatient",
  nursing: "Nursing",
};

export default function EdCareSetting({ selectedSetting, onSelectSetting, onNext, onBack, disabledSettings = [], onDataRequest }: Props) {
  return (
    <EditorialShell>
      <EditorialHeader stepName="Care Setting" stepIndex={1} onDataRequest={onDataRequest} onBack={onBack} />
      <div className="max-w-[1000px] mx-auto px-10 pt-[52px] pb-[60px]">
        <div className="text-[11px] font-extrabold tracking-[1.3px] uppercase text-[#5E534A]">Explore · Step 1 of 9</div>
        <h1 className="font-abridge text-[40px] leading-[1.06] text-[#1A1A1A] mt-[10px] max-w-[640px]">
          Which care setting should we model first?
        </h1>
        <p className="text-[16.5px] text-[#5E534A] mt-[14px] max-w-[600px] leading-[1.5]">
          Pick one to start. Every number in your model is built from that setting's real volume and economics, never a benchmark.
        </p>

        <div className="grid grid-cols-2 gap-4 mt-9">
          {SETTINGS.map(({ id, name, sub, desc, Icon }) => {
            const selected = selectedSetting === id;
            const disabled = disabledSettings.includes(id);
            return (
              <button
                key={id}
                type="button"
                disabled={disabled}
                onClick={() => onSelectSetting(id)}
                data-testid={`ed-setting-${id}`}
                className={`relative text-left bg-[#FDFBF8] border rounded-[20px] p-6 transition-all ${
                  selected ? "border-[#EA2C00] shadow-[0_0_0_1px_#EA2C00]" : "border-[#DED5C8] hover:border-[#1A1A1A]"
                } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <div
                  className={`absolute top-[22px] right-[22px] w-6 h-6 rounded-full border flex items-center justify-center ${
                    selected ? "bg-[#EA2C00] border-[#EA2C00]" : "border-[#DED5C8]"
                  }`}
                >
                  <Check className={`w-[14px] h-[14px] text-white ${selected ? "opacity-100" : "opacity-0"}`} strokeWidth={3} />
                </div>
                <div className={`w-[46px] h-[46px] rounded-[13px] flex items-center justify-center ${selected ? "bg-[#FFEDE7] text-[#EA2C00]" : "bg-[#F5F0EB] text-[#6B5E4F]"}`}>
                  <Icon className="w-[23px] h-[23px]" strokeWidth={1.8} />
                </div>
                <div className="font-abridge text-[23px] text-[#1A1A1A] mt-4">{name}</div>
                <div className="text-[12px] font-extrabold tracking-[0.06em] uppercase text-[#786C5E] mt-1">{sub}</div>
                <div className="text-[14px] text-[#5E534A] mt-3 leading-[1.5]">{desc}</div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-between items-center mt-[34px]">
          <div className="text-[13px] text-[#5E534A]">
            {selectedSetting ? (
              <>Modeling <b className="text-[#1A1A1A]">{SETTING_LABEL[selectedSetting]}</b> · you can add more settings later</>
            ) : (
              <>Pick a setting to begin</>
            )}
          </div>
          <button
            type="button"
            disabled={!selectedSetting}
            onClick={onNext}
            data-testid="ed-careSetting-continue"
            className="bg-[#EA2C00] text-white text-[15px] font-bold px-7 py-[14px] rounded-[12px] shadow-[0_2px_6px_rgba(234,44,0,0.15)] flex items-center gap-2 disabled:opacity-40"
          >
            Continue →
          </button>
        </div>
      </div>
    </EditorialShell>
  );
}
