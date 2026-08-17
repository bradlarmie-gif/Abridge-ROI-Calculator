import { ArrowRight } from "lucide-react";
import { METHODOLOGY_DATA, type MethodQuadrant, type MethodologyData } from "./methodologyData";
import { MethodologyHeader, type MethodologyNavKey } from "./MethodologyHeader";
import { METHODOLOGY_SETTINGS } from "@/lib/methodologyContent";

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
  // Count only dollar-carrying drivers — a dollar domain can hold a tracked
  // ("watch") driver too (e.g. inpatient Workforce's Administrative Efficiency,
  // counted once in Revenue). Counting drivers.length would report it under the
  // "$ Carries a dollar" legend and overstate the dollar-driver count.
  const dollarDrivers = dom.drivers.filter((d) => d.mode === "dollar").length;
  return dom.chip.kind === "dollar" ? { kind: "dollar", n: dollarDrivers } : { kind: "proof" };
}

export default function MethodologyContinuum({ onBack, onHome, onNavigate }: Props) {
  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#5E534A] antialiased">
      <MethodologyHeader active="continuum" activeLabel="Across settings" onBack={onBack} onHome={onHome} onNavigate={onNavigate} />

      <div className="max-w-[1120px] mx-auto px-5 sm:px-8 lg:px-14">
        {/* hero */}
        <div className="pt-12 sm:pt-16 pb-8 sm:pb-10">
          <div className="text-[11.5px] font-extrabold tracking-[0.15em] uppercase text-[#443A32]">Across the continuum</div>
          <h1 className="font-abridge text-[34px] sm:text-[44px] lg:text-[52px] leading-[1.06] text-[#1A1A1A] mt-4 max-w-[860px]">The same record. Four economics.</h1>
          <p className="mt-5 text-[15px] sm:text-[17px] leading-[1.55] text-[#5E534A] max-w-[640px]">
            A complete record does the same thing everywhere: it reflects the care actually delivered. But it lands on different money, because each setting's work, payment, and constraint are different.
          </p>
        </div>

        {/* comparison table: same record, four economics */}
        <div className="overflow-x-auto -mx-5 px-5 sm:mx-0 sm:px-0 mb-16">
          <table className="w-full min-w-[720px] border-collapse text-[13.5px]">
            <thead>
              <tr>
                <th className="text-left text-[10px] font-extrabold tracking-[0.1em] uppercase text-[#B4A896] pb-3 pr-3 border-b-2 border-[#1A1A1A] align-bottom w-[168px]">Setting</th>
                <th className="text-left text-[10px] font-extrabold tracking-[0.1em] uppercase text-[#B4A896] pb-3 pr-3 border-b-2 border-[#1A1A1A] align-bottom">The lever</th>
                <th className="text-left text-[10px] font-extrabold tracking-[0.1em] uppercase text-[#B4A896] pb-3 pr-3 border-b-2 border-[#1A1A1A] align-bottom">The signal you see first</th>
                <th className="text-left text-[10px] font-extrabold tracking-[0.1em] uppercase text-[#B4A896] pb-3 border-b-2 border-[#1A1A1A] align-bottom">The outcome it opens</th>
              </tr>
            </thead>
            <tbody>
              {METHODOLOGY_SETTINGS.map((s) => (
                <tr key={s.id} className="border-b border-[#E8E2DA]">
                  <td className="py-4 pr-3 align-top">
                    <div className="font-abridge text-[19px] text-[#1A1A1A]">{s.label}</div>
                    <span className="inline-block mt-1.5 text-[9.5px] font-extrabold tracking-[0.06em] uppercase text-[#EA2C00] bg-[#FBEAE4] rounded-[5px] px-[7px] py-[2px]">{s.unit}</span>
                  </td>
                  <td className="py-4 pr-3 align-top leading-[1.45] text-[#5E534A]">{s.dominantLever}</td>
                  <td className="py-4 pr-3 align-top leading-[1.45] text-[#5E534A]">{s.comparisonSignals}</td>
                  <td className="py-4 align-top leading-[1.45] text-[#5E534A]">{s.comparisonOutcomes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* counted once: the matrix */}
        <div className="border-t border-[#E8E2DA] pt-10">
          <div className="text-[11px] font-extrabold tracking-[0.13em] uppercase text-[#443A32]">Counted once</div>
          <p className="mt-2 mb-6 text-[13.5px] leading-[1.5] text-[#8C8073] max-w-[620px]">
            The four domains are constant. What moves is which one is tracked, not counted, never billed. The model never counts a dollar twice, so each one appears once, in the setting and domain where it is earned.
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
            <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-full border border-[#DCD3C6] flex items-center justify-center"><span className="w-[5px] h-[5px] rounded-full bg-[#B4A896]" /></span> Tracked, not counted</span>
          </div>

          {/* the read */}
          <div className="mt-10">
            <div className="text-[11px] font-extrabold tracking-[0.13em] uppercase text-[#443A32]">The read</div>
            <p className="mt-4 text-[15px] sm:text-[16px] leading-[1.65] text-[#5E534A] max-w-[720px]">
              Notice where the color moves. In most settings Quality is tracked, not counted, the place you watch rather than bill. In nursing it inverts: the harm-prevention dollar lives in Quality, and Revenue becomes the one tracked, not counted. Inpatient carries two tracked, not counted layers, Capacity and Quality, because the dollar it frees shows up in Revenue. The model never counts a dollar twice. Each one appears once, in the setting and the domain where it is earned.
            </p>
          </div>
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
