import type { ValueArc } from "@/lib/exploreDrivers";

interface Props {
  arc: ValueArc;
}

const STAGE_CONFIG = [
  { key: "signal" as const, label: "Signal", dotColor: "#CCCCCC", textColor: "#999999" },
  { key: "trend"  as const, label: "Trend",  dotColor: "#888888", textColor: "#666666" },
  { key: "proof"  as const, label: "Proof",  dotColor: "#EA2C00", textColor: "#EA2C00" },
];

export default function ValueArcDisplay({ arc }: Props) {
  const stages = STAGE_CONFIG.filter(s => arc[s.key]);

  if (stages.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-[#EDEBE8]">
      <p className="text-[10px] font-semibold text-[#BBBBBB] uppercase tracking-widest mb-4">
        When you'll see it move
      </p>

      {/* Timeline track */}
      <div className="relative">
        {/* Connecting line behind dots */}
        {stages.length > 1 && (
          <div
            className="absolute top-[7px] h-px bg-[#E0D8CF]"
            style={{ left: `${100 / (stages.length * 2)}%`, right: `${100 / (stages.length * 2)}%` }}
          />
        )}

        <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${stages.length}, 1fr)` }}>
          {stages.map(s => {
            const data = arc[s.key]!;
            return (
              <div key={s.key} className="flex flex-col items-center relative">
                {/* Dot */}
                <div
                  className="w-3.5 h-3.5 rounded-full border-2 border-white relative z-10 mb-2"
                  style={{ backgroundColor: s.dotColor, boxShadow: "0 0 0 1px " + s.dotColor }}
                />
                {/* Stage name */}
                <p
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: s.textColor }}
                >
                  {s.label}
                </p>
                {/* Timing */}
                <p className="text-[10px] text-[#AAAAAA] mt-0.5">{data.timing}</p>
                {/* Metric */}
                <p className="text-xs text-[#444444] mt-1.5 text-center leading-snug font-medium">
                  {data.metric}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
