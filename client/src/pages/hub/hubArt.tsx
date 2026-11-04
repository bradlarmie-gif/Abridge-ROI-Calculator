/**
 * Line-art vignettes for The Case tiles. Each one draws the mechanism its story
 * explains (the conversation becoming the note, a flagged line in the record),
 * not a logo or an icon, so the tile shows what is inside before you open it.
 *
 * All ink is warm tan at rest. The one "active" mark in each drawing turns coral
 * and moves only on hover, so coral keeps meaning "this is live, you can act".
 * Parent tiles carry the `group` class that these hover styles key off.
 */

const INK = "stroke-[#B39F87]";
const SOFT = "fill-[#FBF8F4] stroke-[#CDBDA8]";
// group-aria-pressed: a chosen tile (multi-select, aria-pressed) keeps its live
// mark coral, not just while hovered.
const LIVE = "transition-all duration-500 ease-out stroke-[#B39F87] group-hover:stroke-[#EA2C00] group-aria-pressed:stroke-[#EA2C00]";
const LIVE_FILL = "transition-all duration-500 ease-out fill-[#D9CCBB] group-hover:fill-[#EA2C00] group-aria-pressed:fill-[#EA2C00]";

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="18 12 164 96" className="w-full h-full" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

/** A voice waveform on the left flowing into the lines of a note on the right. */
export function AmbientArt() {
  const bars = [10, 22, 34, 18, 40, 26, 14, 30, 20, 8];
  return (
    <Frame>
      {bars.map((h, i) => (
        <line
          key={i}
          x1={30 + i * 7}
          x2={30 + i * 7}
          y1={60 - h / 2}
          y2={60 + h / 2}
          className={`${LIVE} origin-center group-hover:[transform:scaleY(1.18)]`}
          style={{ transformBox: "fill-box", transitionDelay: `${i * 35}ms` }}
        />
      ))}
      <path d="M104 60 h10" className={INK} strokeDasharray="2 3" />
      <rect x="120" y="28" width="56" height="64" rx="6" className={SOFT} />
      {[40, 50, 60, 70].map((y, i) => (
        <line key={y} x1="130" x2={i === 3 ? 152 : 166} y1={y} y2={y} className={INK} />
      ))}
      <line x1="130" x2="146" y1="80" y2="80" className={LIVE} />
    </Frame>
  );
}

/** A record with one line flagged in the margin and marked addressed. */
export function CareSignalsArt() {
  return (
    <Frame>
      <rect x="54" y="18" width="92" height="84" rx="7" className={SOFT} />
      {[34, 46, 70, 82].map((y) => (
        <line key={y} x1="70" x2="130" y1={y} y2={y} className={INK} />
      ))}
      <rect x="64" y="52" width="72" height="12" rx="3" className="transition-all duration-500 fill-[#F1E9DE] group-hover:fill-[#FDE7DF]" />
      <line x1="70" x2="116" y1="58" y2="58" className={LIVE} />
      <path d="M42 50 v16 M42 50 h10 l-3 4 3 4 h-10" className={LIVE} />
      <circle cx="154" cy="58" r="8" className={`${LIVE} transition-transform group-hover:scale-110 origin-center`} style={{ transformBox: "fill-box" }} />
      <path d="M150.5 58 l2.5 2.5 l4.5 -5" className={LIVE} />
    </Frame>
  );
}

/** A question resolved against a short stack of cited evidence cards. */
export function CdsArt() {
  return (
    <Frame>
      <rect x="28" y="40" width="56" height="30" rx="8" className={SOFT} />
      <path d="M40 70 l-4 9 l10 -9" className={SOFT} />
      <line x1="38" x2="74" y1="51" y2="51" className={INK} />
      <line x1="38" x2="62" y1="59" y2="59" className={INK} />
      {[0, 1, 2].map((i) => (
        <g key={i} className="transition-transform duration-500 ease-out" style={{ transform: `translate(${i * 6}px, ${i * 12}px)` }}>
          <rect x="104" y="24" width="64" height="40" rx="6" className={SOFT} />
          <line x1="114" x2="150" y1="38" y2="38" className={INK} />
          <line x1="114" x2="140" y1="47" y2="47" className={INK} />
        </g>
      ))}
      <text x="154" y="83" className="transition-all duration-500 fill-[#B39F87] group-hover:fill-[#EA2C00]" fontSize="9" fontFamily="ui-monospace, monospace">[1]</text>
      <path d="M88 55 h10" className={LIVE} strokeDasharray="2 3" />
    </Frame>
  );
}

/** A microphone with the voice moving out from it. */
export function DictationArt() {
  return (
    <Frame>
      <rect x="88" y="26" width="24" height="44" rx="12" className={SOFT} />
      <path d="M80 58 a20 20 0 0 0 40 0" className={INK} />
      <line x1="100" x2="100" y1="78" y2="92" className={INK} />
      <line x1="90" x2="110" y1="92" y2="92" className={INK} />
      <path d="M130 40 a24 24 0 0 1 0 32" className={LIVE} />
      <path d="M140 32 a36 36 0 0 1 0 48" className={LIVE} style={{ transitionDelay: "80ms" }} />
      <path d="M70 40 a24 24 0 0 0 0 32" className={LIVE} />
      <path d="M60 32 a36 36 0 0 0 0 48" className={LIVE} style={{ transitionDelay: "80ms" }} />
    </Frame>
  );
}

/** The coded claim held against the documented stay, matched before it goes. */
export function PreBillArt() {
  return (
    <Frame>
      <rect x="34" y="22" width="52" height="76" rx="6" className={SOFT} />
      {[36, 46, 56, 66, 76].map((y, i) => (
        <line key={y} x1="44" x2={i % 2 ? 66 : 76} y1={y} y2={y} className={INK} />
      ))}
      <rect x="114" y="22" width="52" height="76" rx="6" className={SOFT} />
      <text x="124" y="40" className="fill-[#B39F87]" fontSize="8" fontFamily="ui-monospace, monospace">DRG</text>
      {[52, 62, 72].map((y) => (
        <line key={y} x1="124" x2="154" y1={y} y2={y} className={INK} />
      ))}
      <path d="M92 52 h16 M104 48 l4 4 -4 4" className={LIVE} />
      <path d="M108 68 h-16 M96 64 l-4 4 4 4" className={LIVE} />
      <circle cx="100" cy="98" r="7" className={LIVE_FILL} stroke="none" />
      <path d="M97 98 l2 2 l4 -4.5" stroke="#FFFFFF" />
    </Frame>
  );
}

/* ── Home: the three doors ─────────────────────────────────────────────── */

/** Three story pages fanned like a hand of cards; the front one fans out on hover. */
export function CaseArt() {
  return (
    <Frame>
      <g className="transition-transform duration-500 ease-out origin-[100px_96px] -rotate-[9deg] group-hover:-rotate-[14deg]" style={{ transformBox: "view-box" }}>
        <rect x="76" y="26" width="48" height="64" rx="6" className={SOFT} />
      </g>
      <g className="transition-transform duration-500 ease-out origin-[100px_96px] rotate-[9deg] group-hover:rotate-[14deg]" style={{ transformBox: "view-box" }}>
        <rect x="76" y="26" width="48" height="64" rx="6" className={SOFT} />
      </g>
      <rect x="76" y="24" width="48" height="66" rx="6" className={SOFT} />
      <text x="84" y="46" className="transition-all duration-500 fill-[#B39F87] group-hover:fill-[#EA2C00]" fontSize="26" fontFamily="Georgia, 'Times New Roman', serif">&ldquo;</text>
      {[52, 60, 68, 76].map((y, i) => (
        <line key={y} x1="85" x2={i === 3 ? 103 : 115} y1={y} y2={y} className={INK} />
      ))}
    </Frame>
  );
}

/** Bars rising along a baseline with a trend line riding their tops. */
export function NumbersArt() {
  const bars = [18, 26, 34, 44, 56];
  return (
    <Frame>
      <line x1="46" x2="154" y1="92" y2="92" className={INK} />
      {bars.map((h, i) => (
        <rect
          key={i}
          x={54 + i * 20}
          y={92 - h}
          width="12"
          height={h}
          rx="2.5"
          className={`transition-all duration-500 ease-out origin-bottom group-hover:[transform:scaleY(1.12)] ${
            i === bars.length - 1 ? "fill-[#E4D8C8] stroke-[#CDBDA8] group-hover:fill-[#EA2C00] group-hover:stroke-[#EA2C00]" : SOFT
          }`}
          style={{ transformBox: "fill-box", transitionDelay: `${i * 45}ms` }}
        />
      ))}
      <path d="M60 66 L80 58 L100 50 L120 40 L140 28" className={LIVE} strokeDasharray="3 3" />
      <circle cx="140" cy="28" r="3" className={LIVE_FILL} stroke="none" />
    </Frame>
  );
}

/** A roadmap: milestones on a line, an owner under each, progress filling in. */
export function PlanArt() {
  const stops = [52, 100, 148];
  return (
    <Frame>
      <line x1="40" x2="160" y1="52" y2="52" className="stroke-[#DCCFBE]" />
      <line x1="52" x2="100" y1="52" y2="52" className="transition-all duration-700 ease-out stroke-[#B39F87] group-hover:stroke-[#EA2C00] [stroke-dasharray:96] [stroke-dashoffset:48] group-hover:[stroke-dashoffset:0]" />
      {stops.map((x, i) => (
        <g key={x}>
          <circle cx={x} cy="52" r="7" className={i === 0 ? LIVE_FILL : i === 1 ? `${SOFT} transition-all duration-500 group-hover:fill-[#EA2C00] group-hover:stroke-[#EA2C00]` : SOFT} stroke={i === 0 ? "none" : undefined} style={{ transitionDelay: `${i * 120}ms` }} />
          {i < 2 && <path d={`M${x - 3} 52 l2 2 l4 -4.5`} stroke="#FFFFFF" className="opacity-100" />}
          <circle cx={x} cy="78" r="5" className={SOFT} />
          <path d={`M${x - 8} 94 a8 7 0 0 1 16 0`} className={INK} />
        </g>
      ))}
    </Frame>
  );
}

/* ── The Numbers ───────────────────────────────────────────────────────── */

/** A dial: the fast read. The needle swings toward the reading on hover. */
export function SizeRoiArt() {
  return (
    <Frame>
      <path d="M58 88 a42 42 0 0 1 84 0" className="stroke-[#DCCFBE]" strokeWidth={6} />
      <path d="M58 88 a42 42 0 0 1 64 -36" className="transition-all duration-500 stroke-[#CDBDA8] group-hover:stroke-[#EA2C00]" strokeWidth={6} />
      {[-70, -35, 0, 35, 70].map((a) => (
        <line key={a} x1="100" y1="52" x2="100" y2="56" className={INK} transform={`rotate(${a} 100 88)`} />
      ))}
      <g className="transition-transform duration-700 ease-out origin-[100px_88px] -rotate-[40deg] group-hover:rotate-[28deg]" style={{ transformBox: "view-box" }}>
        <line x1="100" y1="88" x2="100" y2="58" className={LIVE} strokeWidth={2} />
      </g>
      <circle cx="100" cy="88" r="4.5" className={LIVE_FILL} stroke="none" />
    </Frame>
  );
}

/** A waterfall: each driver adds its step, landing on the total. */
export function ModelValueArt() {
  const steps = [
    { y: 70, h: 20 },
    { y: 56, h: 14 },
    { y: 46, h: 10 },
    { y: 36, h: 10 },
  ];
  return (
    <Frame>
      <line x1="40" x2="160" y1="92" y2="92" className={INK} />
      {steps.map((s, i) => (
        <g key={i}>
          <rect x={48 + i * 22} y={s.y} width="14" height={s.h} rx="2.5" className={SOFT} />
          <line x1={62 + i * 22} x2={70 + i * 22} y1={s.y} y2={s.y} className="stroke-[#D6C8B6]" strokeDasharray="2 2" />
        </g>
      ))}
      <rect x="140" y="36" width="14" height="56" rx="2.5" className="transition-all duration-500 fill-[#E4D8C8] stroke-[#CDBDA8] group-hover:fill-[#EA2C00] group-hover:stroke-[#EA2C00]" />
      <line x1="48" x2="62" y1="90" y2="90" className="stroke-transparent" />
    </Frame>
  );
}

/** Three years along the bottom and the case curving up across them. */
export function BuildDealArt() {
  return (
    <Frame>
      <line x1="40" x2="160" y1="88" y2="88" className={INK} />
      {[60, 100, 140].map((x, i) => (
        <g key={x}>
          <line x1={x} x2={x} y1="88" y2="92" className={INK} />
          <text x={x} y="102" textAnchor="middle" className="fill-[#B39F87]" fontSize="7.5" fontFamily="ui-monospace, monospace">{`Y${i + 1}`}</text>
        </g>
      ))}
      <path d="M44 84 C 70 82, 84 70, 100 58 S 132 34, 156 28 L156 88 L44 88 Z" className="transition-all duration-500 fill-[#EFE5D8] group-hover:fill-[#FBE3DA]" stroke="none" />
      <path d="M44 84 C 70 82, 84 70, 100 58 S 132 34, 156 28" className={LIVE} strokeWidth={1.8} />
      {[[60, 77], [100, 58], [140, 33]].map(([x, y]) => (
        <circle key={x} cx={x} cy={y} r="3.2" className={`${SOFT} transition-all duration-500 group-hover:stroke-[#EA2C00]`} />
      ))}
    </Frame>
  );
}

/** Six separate tools on the left folding into one on the right. */
export function OffsetCostArt() {
  const cells = [0, 1, 2, 3, 4, 5];
  return (
    <Frame>
      {cells.map((i) => (
        <rect
          key={i}
          x={40 + (i % 3) * 18}
          y={38 + Math.floor(i / 3) * 18}
          width="13"
          height="13"
          rx="3"
          className={`${SOFT} transition-all duration-500 ease-out group-hover:opacity-40 group-hover:translate-x-1`}
          style={{ transitionDelay: `${i * 40}ms` }}
        />
      ))}
      <path d="M100 56 h18 M113 51 l5 5 -5 5" className={LIVE} />
      <rect x="128" y="36" width="36" height="36" rx="9" className={`${SOFT} transition-all duration-500 group-hover:stroke-[#EA2C00] group-hover:fill-[#FDF1EC]`} />
      <path d="M138 54 l5 5 l9 -10" className={LIVE} />
    </Frame>
  );
}

/* ── The Plan ──────────────────────────────────────────────────────────── */

/** A plan as rows: an owner, the play, and a check that lands on hover. */
export function BuildPlanArt() {
  return (
    <Frame>
      <rect x="44" y="22" width="112" height="76" rx="8" className={SOFT} />
      {[38, 60, 82].map((y, i) => (
        <g key={y}>
          <circle cx="58" cy={y} r="5.5" className={SOFT} />
          <line x1="70" x2={i === 1 ? 112 : 124} y1={y - 2} y2={y - 2} className={INK} />
          <line x1="70" x2="96" y1={y + 4} y2={y + 4} className="stroke-[#D6C8B6]" />
          <circle
            cx="142"
            cy={y}
            r="6"
            className="transition-all duration-500 fill-[#FBF8F4] stroke-[#CDBDA8] group-hover:fill-[#EA2C00] group-hover:stroke-[#EA2C00]"
            style={{ transitionDelay: `${i * 120}ms` }}
          />
          <path d={`M139 ${y} l2 2 l4 -4.5`} stroke="#FFFFFF" />
        </g>
      ))}
    </Frame>
  );
}

/** A signal line climbing to a dashed target. */
export function MetricsArt() {
  return (
    <Frame>
      <rect x="44" y="24" width="112" height="72" rx="8" className={SOFT} />
      <line x1="54" x2="146" y1="44" y2="44" className="stroke-[#CDBDA8]" strokeDasharray="3 3" />
      <path d="M54 82 L72 76 L88 78 L104 64 L120 58 L136 48 L146 45" className={LIVE} strokeWidth={1.8} />
      <circle cx="146" cy="45" r="3" className={LIVE_FILL} stroke="none" />
    </Frame>
  );
}

/* ── Care settings (Value Model step 1) ────────────────────────────────── */

/** A clinic day: a schedule of visit slots, one more opening on hover. */
export function OutpatientArt() {
  const slots = [
    [0, 0], [1, 0], [2, 0],
    [0, 1], [2, 1],
    [0, 2], [1, 2], [2, 2],
  ];
  return (
    <Frame>
      <rect x="56" y="22" width="88" height="76" rx="8" className={SOFT} />
      <line x1="56" x2="144" y1="36" y2="36" className="stroke-[#D6C8B6]" />
      <circle cx="68" cy="29" r="2" className="fill-[#CDBDA8]" stroke="none" />
      <circle cx="76" cy="29" r="2" className="fill-[#CDBDA8]" stroke="none" />
      {slots.map(([c, r]) => (
        <rect key={`${c}${r}`} x={66 + c * 24} y={44 + r * 17} width="18" height="11" rx="2.5" className="fill-[#EFE5D8] stroke-[#D6C8B6]" />
      ))}
      <rect
        x={66 + 24}
        y={44 + 17}
        width="18"
        height="11"
        rx="2.5"
        className="transition-all duration-500 ease-out fill-[#FBF8F4] stroke-[#B39F87] group-hover:fill-[#EA2C00] group-hover:stroke-[#EA2C00]"
        strokeDasharray="2.5 2"
      />
    </Frame>
  );
}

/** Throughput: patients moving along a track past a clock. */
export function EmergencyArt() {
  return (
    <Frame>
      <circle cx="68" cy="56" r="20" className={SOFT} />
      <line x1="68" x2="68" y1="56" y2="44" className={INK} />
      <g className="transition-transform duration-700 ease-out origin-[68px_56px] group-hover:rotate-[120deg]" style={{ transformBox: "view-box" }}>
        <line x1="68" x2="78" y1="56" y2="56" className={LIVE} strokeWidth={1.8} />
      </g>
      <circle cx="68" cy="56" r="2" className="fill-[#B39F87]" stroke="none" />
      <path d="M96 56 h60 M150 50 l6 6 -6 6" className={LIVE} />
      {[104, 120, 136].map((x, i) => (
        <circle
          key={x}
          cx={x}
          cy="56"
          r="4"
          className="transition-all duration-500 ease-out fill-[#FBF8F4] stroke-[#B39F87] group-hover:translate-x-2 group-hover:stroke-[#EA2C00]"
          style={{ transitionDelay: `${i * 60}ms` }}
        />
      ))}
    </Frame>
  );
}

/** The hospital: a building whose windows light up as beds turn over. */
export function InpatientArt() {
  const windows: [number, number][] = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) windows.push([c, r]);
  return (
    <Frame>
      <rect x="58" y="30" width="84" height="66" rx="5" className={SOFT} />
      <rect x="86" y="18" width="28" height="14" rx="3" className={SOFT} />
      <path d="M100 21 v8 M96 25 h8" className={LIVE} strokeWidth={1.8} />
      {windows.map(([c, r], i) => (
        <rect
          key={i}
          x={66 + c * 18}
          y={38 + r * 15}
          width="12"
          height="9"
          rx="1.5"
          className={`transition-all duration-500 ease-out stroke-[#D6C8B6] fill-[#EFE5D8] ${
            [1, 6, 8, 11].includes(i) ? "group-hover:fill-[#EA2C00] group-hover:stroke-[#EA2C00]" : ""
          }`}
          style={{ transitionDelay: `${i * 30}ms` }}
        />
      ))}
      <rect x="92" y="82" width="16" height="14" rx="2" className="fill-[#EFE5D8] stroke-[#CDBDA8]" />
      <line x1="44" x2="156" y1="96" y2="96" className={INK} />
    </Frame>
  );
}

/** At the bedside: an IV line and the monitor trace beside it. */
export function NursingArt() {
  return (
    <Frame>
      <line x1="62" x2="62" y1="18" y2="98" className={INK} />
      <line x1="54" x2="70" y1="98" y2="98" className={INK} />
      <path d="M62 22 h12" className={INK} />
      <rect x="66" y="26" width="18" height="26" rx="5" className={SOFT} />
      <line x1="75" x2="75" y1="52" y2="60" className={INK} />
      <circle
        cx="75"
        cy="64"
        r="2.2"
        className="transition-all duration-700 ease-in fill-[#CDBDA8] group-hover:fill-[#EA2C00] group-hover:translate-y-3 group-hover:opacity-0"
        stroke="none"
      />
      <rect x="96" y="34" width="64" height="44" rx="7" className={SOFT} />
      <path
        d="M102 58 h12 l4 -10 l6 20 l5 -14 l3 4 h22"
        className="transition-all duration-700 ease-out stroke-[#B39F87] group-hover:stroke-[#EA2C00] [stroke-dasharray:90] [stroke-dashoffset:0] group-hover:[animation:pulse-trace_1.2s_ease-out]"
        strokeWidth={1.8}
      />
      <line x1="104" x2="124" y1="70" y2="70" className="stroke-[#D6C8B6]" />
    </Frame>
  );
}

/* ── Build the Deal: "The read" ─────────────────────────────────────────── */

/**
 * Value climbing past cost, with the crossing (payback) marked. Not a hover
 * piece: `active` turns the value line and the payback dot coral once a real
 * deal is on the page, so the drawing wakes up when the read has something to say.
 */
export function DealReadArt({ active = false }: { active?: boolean }) {
  const live = active ? "stroke-[#EA2C00]" : "stroke-[#B39F87]";
  return (
    <Frame>
      <line x1="40" x2="160" y1="94" y2="94" className={INK} />
      <line x1="40" x2="40" y1="24" y2="94" className="stroke-[#D6C8B6]" />
      <path d="M40 66 H160" className="stroke-[#CDBDA8]" strokeDasharray="3 3" />
      <path d="M40 90 C 70 88, 86 76, 100 66 S 136 36, 160 28" className={`transition-colors duration-700 ${live}`} strokeWidth={2} />
      <path d="M40 90 C 70 88, 86 76, 100 66 L100 94 L40 94 Z" className="fill-[#EFE5D8]" stroke="none" />
      <circle cx="100" cy="66" r="4.5" className={`transition-colors duration-700 ${active ? "fill-[#EA2C00]" : "fill-[#CDBDA8]"}`} stroke="none" />
      <line x1="100" x2="100" y1="70" y2="94" className="stroke-[#D6C8B6]" strokeDasharray="2 2" />
    </Frame>
  );
}

/* ── Present: "How we prove it, together" ──────────────────────────────── */

/** The EHR record with a live signal line running out of it. */
export function SignalsArt() {
  return (
    <Frame>
      <rect x="40" y="26" width="56" height="68" rx="7" className={SOFT} />
      {[40, 50, 60, 70, 80].map((y, i) => (
        <line key={y} x1="50" x2={i % 2 ? 76 : 86} y1={y} y2={y} className={INK} />
      ))}
      <path
        d="M96 60 h14 l5 -12 l7 24 l6 -16 l4 4 h28"
        className="transition-all duration-700 ease-out stroke-[#B39F87] group-hover:stroke-[#EA2C00] [stroke-dasharray:110] group-hover:[animation:signal-trace_1.1s_ease-out]"
        strokeWidth={1.8}
      />
      <circle cx="160" cy="60" r="3.2" className={LIVE_FILL} stroke="none" />
    </Frame>
  );
}

/** A clean baseline, then the lift: the after bar rises on hover. */
export function BeforeAfterArt() {
  return (
    <Frame>
      <line x1="46" x2="154" y1="92" y2="92" className={INK} />
      <rect x="66" y="62" width="24" height="30" rx="3" className={SOFT} />
      <rect
        x="110"
        y="40"
        width="24"
        height="52"
        rx="3"
        className="transition-all duration-500 ease-out origin-bottom fill-[#E4D8C8] stroke-[#CDBDA8] group-hover:fill-[#EA2C00] group-hover:stroke-[#EA2C00] group-hover:[transform:scaleY(1.1)]"
        style={{ transformBox: "fill-box" }}
      />
      <line x1="60" x2="140" y1="62" y2="62" className="stroke-[#CDBDA8]" strokeDasharray="3 3" />
      <text x="78" y="104" textAnchor="middle" className="fill-[#B39F87]" fontSize="7.5" fontFamily="ui-monospace, monospace">BEFORE</text>
      <text x="122" y="104" textAnchor="middle" className="fill-[#B39F87]" fontSize="7.5" fontFamily="ui-monospace, monospace">AFTER</text>
    </Frame>
  );
}

/** Four quarters, checking off one by one on hover. */
export function QuarterlyArt() {
  return (
    <Frame>
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={40 + i * 31} y="38" width="25" height="38" rx="5" className={SOFT} />
          <text x={52.5 + i * 31} y="50" textAnchor="middle" className="fill-[#B39F87]" fontSize="7.5" fontFamily="ui-monospace, monospace">{`Q${i + 1}`}</text>
          <circle
            cx={52.5 + i * 31}
            cy="64"
            r="5.5"
            className="transition-all duration-500 fill-[#FBF8F4] stroke-[#CDBDA8] group-hover:fill-[#EA2C00] group-hover:stroke-[#EA2C00]"
            style={{ transitionDelay: `${i * 110}ms` }}
          />
          <path d={`M${49.8 + i * 31} 64 l2 2 l3.8 -4.2`} stroke="#FFFFFF" />
        </g>
      ))}
      <line x1="40" x2="159" y1="88" y2="88" className="stroke-[#D6C8B6]" />
    </Frame>
  );
}

/* ── The Plan, step 1: the two halves of the walk ──────────────────────── */

/** Map how it happens: an outcome at the top, held up by the conditions under it. */
export function MapOutcomeArt() {
  return (
    <Frame>
      <rect x="78" y="22" width="44" height="18" rx="9" className={LIVE_FILL} stroke="none" />
      {[52, 100, 148].map((x, i) => (
        <g key={x}>
          <path d={`M100 40 C 100 52, ${x} 54, ${x} 66`} className="stroke-[#CDBDA8]" strokeDasharray="3 3" />
          <rect
            x={x - 20}
            y="66"
            width="40"
            height="22"
            rx="6"
            className="transition-all duration-500 fill-[#FBF8F4] stroke-[#B39F87] group-hover:stroke-[#EA2C00]"
            style={{ transitionDelay: `${i * 110}ms` }}
          />
          <line x1={x - 11} x2={x + 11} y1="77" y2="77" className="stroke-[#D6C8B6]" />
        </g>
      ))}
    </Frame>
  );
}

/* ── The Plan, step 3: one drawing per goal ────────────────────────────── */

/** Patient Access: a day's schedule with new visit slots opening up. */
export function AccessGoalArt() {
  const cells = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const open = [3, 7];
  return (
    <Frame>
      <rect x="48" y="24" width="104" height="72" rx="8" className={SOFT} />
      <line x1="48" x2="152" y1="38" y2="38" className="stroke-[#D6C8B6]" />
      {cells.map((i) => {
        const x = 58 + (i % 5) * 18;
        const y = 46 + Math.floor(i / 5) * 22;
        return open.includes(i) ? (
          <rect key={i} x={x} y={y} width="13" height="14" rx="3" className={LIVE_FILL} stroke="none" />
        ) : (
          <rect key={i} x={x} y={y} width="13" height="14" rx="3" className="fill-[#EFE5D8] stroke-[#D6C8B6]" />
        );
      })}
    </Frame>
  );
}

/** Provider Retention: a clock where the day ends on time, and the door home. */
export function RetentionGoalArt() {
  return (
    <Frame>
      <circle cx="82" cy="60" r="28" className={SOFT} />
      {[0, 90, 180, 270].map((a) => (
        <line key={a} x1="82" y1="35" x2="82" y2="39" className={INK} transform={`rotate(${a} 82 60)`} />
      ))}
      <line x1="82" y1="60" x2="82" y2="44" className={INK} strokeWidth={2} />
      <line x1="82" y1="60" x2="96" y2="60" className={LIVE} strokeWidth={2} />
      <circle cx="82" cy="60" r="2.5" className="fill-[#B39F87]" stroke="none" />
      <rect x="124" y="32" width="30" height="58" rx="3" className={SOFT} />
      <circle cx="147" cy="62" r="2" className="fill-[#B39F87]" stroke="none" />
      <path d="M116 90 h46" className={INK} />
    </Frame>
  );
}

/** Revenue Capture: the documented note and the claim lining up, row for row. */
export function RevenueGoalArt() {
  return (
    <Frame>
      <rect x="40" y="26" width="50" height="68" rx="6" className={SOFT} />
      <rect x="110" y="26" width="50" height="68" rx="6" className={SOFT} />
      {[42, 56, 70].map((y) => (
        <g key={y}>
          <line x1="50" x2="80" y1={y} y2={y} className={INK} />
          <line x1="120" x2="150" y1={y} y2={y} className={INK} />
          <line x1="90" x2="110" y1={y} y2={y} className={LIVE} strokeDasharray="2 3" />
        </g>
      ))}
      <line x1="50" x2="70" y1="82" y2="82" className="stroke-[#D6C8B6]" />
      <line x1="120" x2="140" y1="82" y2="82" className="stroke-[#D6C8B6]" />
    </Frame>
  );
}

/** Quality & Safety: a shield with a check. */
export function QualityGoalArt() {
  return (
    <Frame>
      <path d="M100 24 l30 11 v22 c0 20 -14 32 -30 38 c-16 -6 -30 -18 -30 -38 v-22 z" className={SOFT} />
      <path d="M100 34 l20 7 v15 c0 13 -9 21 -20 25 c-11 -4 -20 -12 -20 -25 v-15 z" className="stroke-[#D6C8B6]" />
      <path d="M89 58 l8 8 l15 -16" className={LIVE} strokeWidth={2.4} />
    </Frame>
  );
}

/** Nursing Capacity: a row of beds, with time freed at one of them. */
export function CapacityGoalArt() {
  return (
    <Frame>
      {[44, 84, 124].map((x, i) => (
        <g key={x}>
          <rect x={x} y="60" width="32" height="14" rx="3" className={SOFT} />
          <rect x={x + 2} y="54" width="10" height="7" rx="2.5" className="fill-[#EFE5D8] stroke-[#D6C8B6]" />
          <line x1={x} x2={x} y1="52" y2="82" className={INK} />
          <line x1={x + 32} x2={x + 32} y1="64" y2="82" className={INK} />
          {i === 1 && (
            <g>
              <circle cx={x + 16} cy="36" r="10" className={`${LIVE} fill-[#FBF8F4]`} />
              <path d={`M${x + 16} 30 v6 h5`} className={LIVE} />
            </g>
          )}
        </g>
      ))}
      <line x1="38" x2="162" y1="88" y2="88" className="stroke-[#D6C8B6]" />
    </Frame>
  );
}

/** Patient Experience: a nurse and a patient talking, a speech bubble between. */
export function ExperienceGoalArt() {
  return (
    <Frame>
      <circle cx="62" cy="48" r="10" className={SOFT} />
      <path d="M44 90 c0 -14 8 -22 18 -22 s18 8 18 22" className={SOFT} />
      <circle cx="138" cy="52" r="10" className={SOFT} />
      <path d="M120 90 c0 -12 8 -20 18 -20 s18 8 18 20" className={SOFT} />
      <path d="M84 26 h32 a6 6 0 0 1 6 6 v12 a6 6 0 0 1 -6 6 h-18 l-8 7 v-7 h-6 a6 6 0 0 1 -6 -6 v-12 a6 6 0 0 1 6 -6 z" className={`${LIVE} fill-[#FBF8F4]`} />
      <line x1="92" x2="110" y1="35" y2="35" className="stroke-[#D6C8B6]" />
      <line x1="92" x2="104" y1="42" y2="42" className="stroke-[#D6C8B6]" />
    </Frame>
  );
}

/* ── Value Model, step 3: time given back ──────────────────────────────── */

/** A clock with the returned time as a coral wedge; `active` once minutes are in. */
export function TimeBackArt({ active = false, share = 0.25 }: { active?: boolean; share?: number }) {
  const a = Math.max(0.05, Math.min(0.95, share)) * Math.PI * 2;
  const r = 34, cx = 100, cy = 60;
  const x = cx + r * Math.sin(a), y = cy - r * Math.cos(a);
  const large = a > Math.PI ? 1 : 0;
  return (
    <Frame>
      <circle cx={cx} cy={cy} r="40" className={SOFT} />
      <path d={`M${cx} ${cy} L${cx} ${cy - r} A${r} ${r} 0 ${large} 1 ${x} ${y} Z`} className={`transition-colors duration-700 ${active ? "fill-[#FBD5C6]" : "fill-[#EFE5D8]"}`} stroke="none" />
      {[0, 90, 180, 270].map((d) => (
        <line key={d} x1={cx} y1={cy - 37} x2={cx} y2={cy - 33} className={INK} transform={`rotate(${d} ${cx} ${cy})`} />
      ))}
      <line x1={cx} y1={cy} x2={cx} y2={cy - 24} className={INK} strokeWidth={2} />
      <line x1={cx} y1={cy} x2={x} y2={y} className={`transition-colors duration-700 ${active ? "stroke-[#EA2C00]" : "stroke-[#B39F87]"}`} strokeWidth={2} />
      <circle cx={cx} cy={cy} r="2.5" className="fill-[#B39F87]" stroke="none" />
    </Frame>
  );
}
