import { METHODOLOGY_SETTINGS } from "@/lib/methodologyContent";
import { MethodologyHeader, type MethodologyNavKey } from "./MethodologyHeader";
import { CaseProvenance } from "./CaseProvenance";
import { DOMAIN_COLORS } from "@/lib/domainColors";

interface Props {
  onBack: () => void;
  onHome: () => void;
  onNavigate?: (key: MethodologyNavKey) => void;
}

const RECORD_LINES_LEFT = [84, 54, 72, 40, 50, 30, 44, 20];
const RECORD_LINES_RIGHT = [100, 95, 98, 90, 99, 93, 96, 92];

const VALUES: { label: string; dot: string; desc: string }[] = [
  // Domain dots come from the one palette, not a second hardcoded copy that
  // inverted Revenue and Capacity against every other surface.
  { label: "Revenue", dot: DOMAIN_COLORS.Revenue, desc: "Acuity and services already delivered, captured instead of lost to thin notes." },
  { label: "Capacity", dot: DOMAIN_COLORS.Capacity, desc: "Clinician hours returned from after-hours charting to patient care." },
  { label: "Workforce", dot: DOMAIN_COLORS.Workforce, desc: "The documentation burden that drives burnout, lifted." },
  { label: "Quality", dot: DOMAIN_COLORS.Quality, desc: "Care gaps and safety signals surfaced in the record, tracked, not counted." },
];

/**
 * "The Methodology" overview: the founding thesis that every setting chapter
 * builds on. A note written from memory holds a fraction of the visit; a
 * complete record closes that gap, and that single signal is what every
 * setting's chapter and dollar case trace back to.
 */
export default function MethodologyOverview({ onBack, onHome, onNavigate }: Props) {
  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#5E534A] antialiased">
      <MethodologyHeader active="overview" activeLabel="The Methodology" onBack={onBack} onHome={onHome} onNavigate={onNavigate} />

      <div className="max-w-[1120px] mx-auto px-5 sm:px-8 lg:px-14">
        {/* hero */}
        <div className="pt-12 sm:pt-16 pb-8 sm:pb-10">
          <div className="text-[11.5px] font-extrabold tracking-[0.15em] uppercase text-[#EA2C00]">The record</div>
          <h1 className="font-abridge text-[34px] sm:text-[44px] lg:text-[52px] leading-[1.06] text-[#1A1A1A] mt-4 max-w-[860px]">
            The note is written from <span className="text-[#EA2C00]">memory</span>.
          </h1>
          <p className="mt-5 text-[15px] sm:text-[17px] leading-[1.55] text-[#5E534A] max-w-[640px]">
            It gets written after the visit, in whatever time is left, so it holds a fraction of what happened: the level of care given, the conditions addressed, the reason behind a decision. That work is real. It just never reaches the record. Ambient documentation captures the visit as it happens, so the note reflects the care actually delivered.
          </p>
          <CaseProvenance>
            Everything downstream inherits whatever the record holds: the coding case, the quality signal, the denial
            defense. None of them can be better than what was captured in the room.
          </CaseProvenance>
        </div>

        {/* the two-card record graphic */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-0">
          <div className="border border-[#E8E2DA] rounded-[18px] bg-[#FDFBF8] px-6 sm:px-7 py-6 sm:py-7">
            <div className="text-[11px] font-extrabold tracking-[0.12em] uppercase text-[#8C8073] mb-1">What there was time to type</div>
            <div className="text-[12.5px] text-[#8C8073] mb-5">Written afterward, from memory</div>
            {RECORD_LINES_LEFT.map((w, i) => (
              <div
                key={i}
                className={`h-[10px] rounded-[5px] mb-3.5 ${[1, 4, 6].includes(i) ? "bg-[#CFC6B9]" : "bg-[#E7DFD5]"}`}
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
          <div className="flex items-center justify-center px-2 sm:px-4 text-[#B4A896] text-[22px]">&rarr;</div>
          <div className="border border-[#F1C9BC] rounded-[18px] bg-[#FFF9F6] px-6 sm:px-7 py-6 sm:py-7">
            <div className="text-[11px] font-extrabold tracking-[0.12em] uppercase text-[#EA2C00] mb-1">What actually happened</div>
            <div className="text-[12.5px] text-[#8C8073] mb-5">Captured during the visit</div>
            {RECORD_LINES_RIGHT.map((w, i) => (
              <div
                key={i}
                className={`h-[10px] rounded-[5px] mb-3.5 ${i % 2 === 0 ? "bg-[#EA2C00]" : "bg-[#F2B7A6]"}`}
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
        </div>
        <p className="text-[13px] text-[#8C8073] mt-4 text-center">
          The same visit, recorded two ways. <b className="text-[#1A1A1A] font-bold">Everything in this methodology comes from closing that gap.</b>
        </p>

        {/* what a complete record makes possible */}
        <div className="mt-16 sm:mt-[66px]">
          <div className="text-[11.5px] font-extrabold tracking-[0.14em] uppercase text-[#443A32]">What a complete record makes possible</div>
          <p className="mt-2 text-[14px] leading-[1.5] text-[#8C8073] max-w-[640px]">
            One complete record feeds four kinds of value at once. These four are the part we can put a defensible number on.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-[22px]">
            {VALUES.map((v) => (
              <div key={v.label} className="border border-[#E8E2DA] rounded-[16px] bg-[#FDFBF8] p-5">
                <div className="font-abridge text-[17px] text-[#1A1A1A] flex items-center">
                  <span className="w-[9px] h-[9px] rounded-full mr-2" style={{ background: v.dot }} />
                  {v.label}
                </div>
                <div className="text-[12.5px] leading-[1.5] text-[#8C8073] mt-2">{v.desc}</div>
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-3.5">
            <span className="text-[12.5px] italic text-[#B4A896]">the floor, not the ceiling</span>
          </div>
        </div>

        {/* the signal that leads every setting */}
        <div className="mt-16 sm:mt-[66px] mb-16 sm:mb-24">
          <div className="text-[11.5px] font-extrabold tracking-[0.14em] uppercase text-[#443A32]">The signal that leads every setting</div>
          <div className="mt-6 border border-[#E8E2DA] rounded-[18px] bg-[#FDFBF8] px-6 sm:px-[30px] py-7 flex flex-wrap items-center gap-x-[30px] gap-y-4">
            <div className="font-abridge text-[24px] sm:text-[26px] leading-[1.15] text-[#1A1A1A] max-w-[320px]">
              Note completeness moves <span className="text-[#EA2C00]">first</span>.
            </div>
            <div className="text-[14px] leading-[1.55] text-[#5E534A] max-w-[420px]">
              A complete record is the leading signal in every care setting. It shows up in weeks, before any dollar does. What changes setting to setting is the economics it lands on, which is where the four chapters go next.
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5 mt-6">
            {METHODOLOGY_SETTINGS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onNavigate?.(s.id)}
                className="border border-[#E8E2DA] bg-[#FDFBF8] rounded-[12px] px-4 py-[11px] text-[13.5px] text-[#1A1A1A] flex items-center gap-2 hover:border-[#EA2C00] transition-colors"
              >
                {s.label} <span className="text-[#B4A896]">&rarr;</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
