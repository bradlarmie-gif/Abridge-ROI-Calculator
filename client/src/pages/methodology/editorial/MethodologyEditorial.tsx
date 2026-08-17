import { ArrowRight } from "lucide-react";
import {
  type MethodologyData,
  type MethodDomain,
  type MethodArcStage,
  METHODOLOGY_DATA,
} from "./methodologyData";
import { MethodologyHeader, type MethodologyNavKey } from "./MethodologyHeader";

interface Props {
  data: MethodologyData;
  onBack: () => void; // exit Learn (back arrow)
  onHome: () => void; // exit Learn entirely (wordmark)
  onNavigateToSetting?: (setting: string) => void;
  onBuildModel: () => void;
}

export default function MethodologyEditorial({ data, onBack, onHome, onNavigateToSetting, onBuildModel }: Props) {
  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#5E534A] antialiased">
      <MethodologyHeader
        active={data.key}
        activeLabel={data.settingLabel}
        onBack={onBack}
        onHome={onHome}
        onNavigate={(k: MethodologyNavKey) => onNavigateToSetting?.(k)}
      />

      <div className="max-w-[1120px] mx-auto px-5 sm:px-8 lg:px-14">
        {/* hero */}
        <div className="pt-12 sm:pt-16 pb-8 sm:pb-10">
          <div className="text-[11.5px] font-extrabold tracking-[0.15em] uppercase text-[#443A32]">{data.eyebrow}</div>
          <h1 className="font-abridge text-[34px] sm:text-[44px] lg:text-[52px] leading-[1.06] text-[#1A1A1A] mt-4 max-w-[840px]">{data.headline}</h1>
          <p className="mt-5 text-[15px] sm:text-[17px] leading-[1.55] text-[#5E534A] max-w-[600px]">{data.sub}</p>
        </div>

        {/* mechanism flow */}
        <div className="text-[11px] font-extrabold tracking-[0.13em] uppercase text-[#443A32]">{data.flowLabel}</div>
        <div className="relative mt-4 mb-14 pt-[7px]">
          {/* causal line: ends exactly at the last dot (md+ only) */}
          <div className="hidden md:block absolute left-[8px] right-[calc(25%-8px)] top-[14px] h-[2px] bg-gradient-to-r from-[#F4CBBE] to-[#EA2C00]" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-8 relative">
            {data.flow.map((f, i) => (
              <div key={i} className="pr-6 md:pr-8 relative">
                <div className="w-[15px] h-[15px] rounded-full bg-[#EA2C00] shadow-[0_0_0_5px_#FFFFFF] relative z-[1]" />
                <div className="mt-3 text-[10.5px] font-extrabold tracking-[0.1em] uppercase text-[#B02200]">{f.step}</div>
                <div className="mt-2 text-[15px] sm:text-[15.5px] font-bold text-[#443A32] leading-[1.4]">{f.text}</div>
              </div>
            ))}
          </div>
        </div>

        {/* domain cards */}
        {data.domains.map((d) => <DomainCard key={d.num} d={d} />)}

        {/* closing arc */}
        <div className="mt-14 pt-10 border-t border-[#E8E2DA]">
          <div className="mb-8">
            <div className="text-[11px] font-extrabold tracking-[0.13em] uppercase text-[#443A32]">{data.arcLabel}</div>
            <div className="font-abridge text-[26px] sm:text-[30px] text-[#1A1A1A] mt-3">{data.arcHeadline}</div>
          </div>
          <div className="relative">
            <div className="hidden sm:block absolute left-[15%] right-[15%] top-[8px] h-[2px] bg-gradient-to-r from-[#F4CBBE] to-[#EA2C00]" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 relative">
              {data.arc.map((s) => <ArcStage key={s.stage} s={s} />)}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 my-10 mb-24 bg-[#FBF8F3] border border-[#E8E2DA] rounded-[20px] px-7 py-6">
          <div>
            <div className="text-[11px] font-extrabold tracking-[0.12em] uppercase text-[#443A32]">See it on your numbers</div>
            <div className="mt-1.5 text-[15px] text-[#5E534A]">This is the mechanism. The model puts your figures against it.</div>
          </div>
          <button
            onClick={onBuildModel}
            className="flex-shrink-0 inline-flex items-center gap-2 bg-[#EA2C00] hover:bg-[#d12800] text-white font-extrabold text-[14px] px-6 py-3.5 rounded-[13px] transition-colors"
          >
            Build your model <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function DomainCard({ d }: { d: MethodDomain }) {
  return (
    <div className="border border-[#E8E2DA] rounded-[22px] bg-[#FDFBF8] p-6 sm:p-8 mb-[18px] grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-8 lg:gap-11">
      <div>
        <div className="flex items-baseline gap-3">
          <span className="font-abridge text-[17px] text-[#C7B49B] tracking-[0.02em]">{d.num}</span>
          <span className="font-abridge text-[26px] sm:text-[30px] text-[#1A1A1A] tracking-[0.01em]">{d.name}</span>
        </div>
        <p className="mt-3.5 text-[14px] leading-[1.55] text-[#5E534A]">{d.enable}</p>
        {d.chip.kind === "dollar" ? (
          <span className="inline-flex items-center mt-[18px] text-[10px] font-extrabold tracking-[0.09em] uppercase px-[11px] py-[6px] rounded-full bg-[#FBEAE4] text-[#B02200]">Carries a dollar</span>
        ) : (
          <span className="inline-flex items-center mt-[18px] text-[10px] font-extrabold tracking-[0.09em] uppercase px-[11px] py-[6px] rounded-full bg-[#F0EBE2] text-[#8C8073]">{d.chip.note}</span>
        )}
      </div>
      <div className="self-center">
        {d.drivers.map((dr, i) => (
          <div
            key={dr.name}
            className={`flex items-center justify-between gap-5 py-[15px] ${i < d.drivers.length - 1 ? "border-b border-[#EFE9E0]" : ""} ${i === 0 ? "pt-0.5" : ""} ${i === d.drivers.length - 1 ? "pb-0.5" : ""}`}
          >
            <div className="min-w-0">
              <div className="text-[15.5px] font-bold text-[#443A32]">{dr.name}</div>
              <div className="mt-1 text-[12.5px] leading-[1.45] text-[#8C8073]">{dr.sub}</div>
            </div>
            {dr.mode === "dollar" ? (
              <span className="flex-shrink-0 text-[12px] font-extrabold text-[#B02200] bg-[#FBEAE4] px-[11px] py-[6px] rounded-[8px] tracking-[0.02em]">$ / yr</span>
            ) : (
              <span className="flex-shrink-0 text-[10px] font-extrabold tracking-[0.1em] uppercase text-[#8C8073] border border-[#E8E2DA] rounded-full px-[10px] py-[5px]">Watch</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ArcStage({ s }: { s: MethodArcStage }) {
  return (
    <div className="text-center px-2">
      <div className="w-[16px] h-[16px] rounded-full bg-[#EA2C00] mx-auto shadow-[0_0_0_6px_#FFFFFF]" />
      <div className="mt-5 text-[11px] font-extrabold tracking-[0.09em] text-[#EA2C00]">{s.when}</div>
      <div className="font-abridge text-[26px] text-[#1A1A1A] mt-2">{s.stage}</div>
      <div className="mt-1.5 text-[14.5px] font-bold text-[#443A32]">{s.title}</div>
      <p className="mt-2.5 text-[13px] leading-[1.55] text-[#8C8073] max-w-[280px] mx-auto">{s.desc}</p>
    </div>
  );
}

/** Convenience wrappers so LearnPath can render by setting key. */
export function MethodologyEditorialFor(props: Omit<Props, "data"> & { setting: MethodologyData["key"] }) {
  const { setting, ...rest } = props;
  return <MethodologyEditorial data={METHODOLOGY_DATA[setting]} {...rest} />;
}
