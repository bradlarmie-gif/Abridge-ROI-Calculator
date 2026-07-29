import { ArrowRight } from "lucide-react";
import { METHODOLOGY_DATA, type MethodQuadrant, type MethodologyData } from "./methodologyData";
import { MethodologyHeader, type MethodologyNavKey } from "./MethodologyHeader";

interface Props {
  onBack: () => void;
  onHome: () => void;
  onNavigate?: (key: MethodologyNavKey) => void;
}

const DOMAINS: MethodQuadrant[] = ["Capacity", "Workforce", "Revenue", "Quality"];
const ORDER: MethodologyData["key"][] = ["outpatient", "ed", "inpatient", "nursing"];

type Cell = { kind: "dollar"; n: number } | { kind: "proof" };

function cellFor(setting: MethodologyData["key"], domain: MethodQuadrant): Cell {
  const dom = METHODOLOGY_DATA[setting].domains.find((d) => d.name === domain)!;
  return dom.chip.kind === "dollar" ? { kind: "dollar", n: dom.drivers.length } : { kind: "proof" };
}

export default function MethodologyContinuum({ onBack, onHome, onNavigate }: Props) {
  return (
    <div className="min-h-screen bg-[#FDFCFA] text-[#5E534A] antialiased">
      <MethodologyHeader active="continuum" activeLabel="Across settings" onBack={onBack} onHome={onHome} onNavigate={onNavigate} />

      <div className="max-w-[1120px] mx-auto px-5 sm:px-8 lg:px-14">
        {/* hero */}
        <div className="pt-12 sm:pt-16 pb-8 sm:pb-10">
          <div className="text-[11.5px] font-extrabold tracking-[0.15em] uppercase text-[#443A32]">Across the continuum</div>
          <h1 className="font-abridge text-[34px] sm:text-[44px] lg:text-[52px] leading-[1.06] text-[#1A1A1A] mt-4 max-w-[860px]">One conversation. Four domains. Every setting.</h1>
          <p className="mt-5 text-[15px] sm:text-[17px] leading-[1.55] text-[#5E534A] max-w-[640px]">
            Healthcare is a continuum. Each setting is a different point of capture, and every captured conversation feeds the same four domains of value at once. That is why the return compounds across a system rather than adding up setting by setting.
          </p>
        </div>

        {/* the matrix */}
        <div className="text-[11px] font-extrabold tracking-[0.13em] uppercase text-[#443A32]">Where the dollar lives, and where the proof lives</div>
        <p className="mt-2 mb-6 text-[13.5px] leading-[1.5] text-[#8C8073] max-w-[620px]">
          The four domains are constant. What moves is which one is the proof layer: tracked, never billed. Follow the color across the grid.
        </p>

        <div className="overflow-x-auto -mx-5 px-5 sm:mx-0 sm:px-0">
          <div className="min-w-[720px] border border-[#E8E2DA] rounded-[20px] overflow-hidden bg-[#FDFBF8]">
            {/* header row */}
            <div className="grid grid-cols-[168px_repeat(4,1fr)] border-b border-[#E8E2DA] bg-[#FBF8F3]">
              <div className="px-5 py-4 text-[10.5px] font-extrabold tracking-[0.1em] uppercase text-[#B4A896]">Setting</div>
              {DOMAINS.map((d) => (
                <div key={d} className="px-4 py-4 text-center text-[11px] font-extrabold tracking-[0.08em] uppercase text-[#443A32] border-l border-[#E8E2DA]">{d}</div>
              ))}
            </div>
            {/* setting rows */}
            {ORDER.map((s, ri) => {
              const data = METHODOLOGY_DATA[s];
              return (
                <div key={s} className={`grid grid-cols-[168px_repeat(4,1fr)] ${ri < ORDER.length - 1 ? "border-b border-[#E8E2DA]" : ""}`}>
                  <button
                    onClick={() => onNavigate?.(s)}
                    className="group flex items-center px-5 py-6 text-left"
                  >
                    <span className="font-abridge text-[21px] text-[#1A1A1A] group-hover:text-[#EA2C00] transition-colors">{data.settingLabel}</span>
                  </button>
                  {DOMAINS.map((dm) => {
                    const c = cellFor(s, dm);
                    return (
                      <div key={dm} className="border-l border-[#E8E2DA] px-3 py-5 flex flex-col items-center justify-center gap-1.5">
                        {c.kind === "dollar" ? (
                          <>
                            <span className="w-9 h-9 rounded-full bg-[#FBEAE4] text-[#B02200] font-extrabold text-[17px] flex items-center justify-center">$</span>
                            <span className="text-[10px] font-bold tracking-[0.04em] text-[#C08A78]">{c.n} driver{c.n > 1 ? "s" : ""}</span>
                          </>
                        ) : (
                          <>
                            <span className="w-9 h-9 rounded-full border border-[#DCD3C6] flex items-center justify-center">
                              <span className="w-[7px] h-[7px] rounded-full bg-[#B4A896]" />
                            </span>
                            <span className="text-[10px] font-bold tracking-[0.06em] uppercase text-[#A0937F]">Proof</span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* legend */}
        <div className="flex flex-wrap items-center gap-x-7 gap-y-2 mt-4 text-[12px] text-[#8C8073]">
          <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-[#FBEAE4] text-[#B02200] text-[10px] font-extrabold flex items-center justify-center">$</span> Carries a dollar</span>
          <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-full border border-[#DCD3C6] flex items-center justify-center"><span className="w-[5px] h-[5px] rounded-full bg-[#B4A896]" /></span> The proof layer, tracked not billed</span>
        </div>

        {/* the read */}
        <div className="mt-12 border-t border-[#E8E2DA] pt-10">
          <div className="text-[11px] font-extrabold tracking-[0.13em] uppercase text-[#443A32]">The read</div>
          <p className="mt-4 text-[15px] sm:text-[16px] leading-[1.65] text-[#5E534A] max-w-[720px]">
            Notice where the color moves. In most settings Quality is the proof layer, the place you watch rather than bill. In nursing it inverts: the harm-prevention dollar lives in Quality, and Revenue becomes the proof. Inpatient carries two proof layers, Capacity and Quality, because the dollar it frees shows up in Revenue. The model never counts a dollar twice. Each one appears once, in the setting and the domain where it is earned.
          </p>
        </div>

        {/* go deep */}
        <div className="my-12 mb-24">
          <div className="text-[11px] font-extrabold tracking-[0.12em] uppercase text-[#443A32] mb-4">Go deep on a setting</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {ORDER.map((s) => {
              const data = METHODOLOGY_DATA[s];
              return (
                <button
                  key={s}
                  onClick={() => onNavigate?.(s)}
                  className="group flex items-center justify-between border border-[#E8E2DA] rounded-[16px] bg-[#FDFBF8] px-5 py-4 hover:border-[#EA2C00] transition-colors"
                >
                  <span className="font-abridge text-[19px] text-[#1A1A1A]">{data.settingLabel}</span>
                  <ArrowRight className="w-4 h-4 text-[#B4A896] group-hover:text-[#EA2C00] transition-colors" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
