// client/src/components/forecast/ConsolidationFlow.tsx
// The consolidation "movement": each tool's displaced spend flows rightward and
// lands on a single clean Abridge spine (the platform). Light warm surface,
// coral-only (the "stays" lives in the magnitude bars below), airy thin ribbons
// that gather gently (never pinch to a point), hover-isolate.
import { useMemo, useState } from "react";
import { itemDisplayName, itemRetired, categoryLabel, type AppRatItem } from "@/lib/appRationalizationCalc";

const W = 1000;
const TOP_PAD = 84;
const ROW_H = 76;
const RIBBON_START_X = 330;
const EDGE_X = 792;      // left edge of the Abridge spine
const SPINE_W = 12;
const LABEL_X = EDGE_X + SPINE_W + 16;
const MAX_THICK = 30;    // airy: even the biggest flow stays thin

export default function ConsolidationFlow({ items }: { items: AppRatItem[] }) {
  const [hoverId, setHoverId] = useState<string | null>(null);

  const L = useMemo(() => {
    const tools = items
      .filter((i) => (i.annualSpend || 0) > 0)
      .map((i, idx) => ({
        id: i.id,
        name: itemDisplayName(i),
        category: categoryLabel(i.category),
        coveragePct: i.coveragePct,
        displaced: itemRetired(i),
        idx,
      }));
    const n = tools.length;
    const rowCenterY = (idx: number) => TOP_PAD + idx * ROW_H;
    const height = Math.max(220, rowCenterY(Math.max(0, n - 1)) + 60);

    const spineTop = rowCenterY(0) - 24;
    const spineBottom = rowCenterY(Math.max(0, n - 1)) + 24;
    const spineCenterY = (spineTop + spineBottom) / 2;

    const withR = tools.filter((t) => t.displaced > 0);
    const maxDisp = withR.reduce((m, t) => Math.max(m, t.displaced), 0) || 1;
    const ribbons = withR.map((t) => {
      const rowY = rowCenterY(t.idx);
      // gather 30% toward the spine center so it reads as flow, but ends stay
      // distinct (no arrowhead pinch)
      const endY = rowY + (spineCenterY - rowY) * 0.3;
      return { id: t.id, rowY, endY, thickness: Math.max(4, (t.displaced / maxDisp) * MAX_THICK) };
    });

    return { tools, ribbons, height, rowCenterY, spineTop, spineBottom, spineCenterY };
  }, [items]);

  if (L.tools.length === 0) {
    return (
      <div
        className="rounded-[20px] p-10 text-center text-sm text-[#8C7E6E]"
        style={{ background: "linear-gradient(160deg,#FDFBF8,#F6F1EA)", border: "1px solid #E8E2DA" }}
      >
        Add applications with annual spend to see the consolidation.
      </div>
    );
  }

  return (
    <div
      className="rounded-[20px] p-6 md:p-7"
      style={{ background: "linear-gradient(160deg,#FDFBF8,#F6F1EA)", border: "1px solid #E8E2DA" }}
    >
      <div className="px-1 pb-1 text-[11px] font-bold uppercase tracking-[2px] text-[#B4A99B]">
        Your tools · what Abridge takes on
      </div>
      <svg viewBox={`0 0 ${W} ${L.height}`} width="100%" style={{ fontFamily: "Manrope, sans-serif" }} data-testid="consolidation-svg">
        {L.ribbons.map((r, i) => {
          const dim = hoverId !== null && hoverId !== r.id;
          const c1 = RIBBON_START_X + 200;
          const c2 = EDGE_X - 130;
          return (
            <path
              key={r.id}
              className="crf-ribbon"
              style={{ animationDelay: `${0.1 + i * 0.09}s` }}
              d={`M${RIBBON_START_X},${r.rowY} C${c1},${r.rowY} ${c2},${r.endY} ${EDGE_X},${r.endY}`}
              fill="none"
              stroke="#EA2C00"
              strokeOpacity={dim ? 0.16 : 0.88}
              strokeWidth={r.thickness}
              strokeLinecap="butt"
              onMouseEnter={() => setHoverId(r.id)}
              onMouseLeave={() => setHoverId(null)}
            />
          );
        })}

        {/* Abridge spine: the single platform everything lands on */}
        <rect x={EDGE_X} y={L.spineTop} width={SPINE_W} height={L.spineBottom - L.spineTop} rx={6} fill="#EA2C00" />
        <text x={LABEL_X} y={L.spineCenterY + 9} fill="#EA2C00" fontSize={26} letterSpacing={1} style={{ fontFamily: "Abridge, Manrope, sans-serif" }}>ABRIDGE</text>

        {L.tools.map((t) => {
          const dim = hoverId !== null && hoverId !== t.id;
          return (
            <g
              key={t.id}
              opacity={dim ? 0.32 : 1}
              onMouseEnter={() => setHoverId(t.id)}
              onMouseLeave={() => setHoverId(null)}
            >
              <rect x={0} y={L.rowCenterY(t.idx) - 28} width={EDGE_X} height={56} fill="transparent" />
              <text x={34} y={L.rowCenterY(t.idx) - 4} fill="#1A1A1A" fontSize={16} fontWeight={700}>{t.name}</text>
              <text x={34} y={L.rowCenterY(t.idx) + 14} fill="#8C8377" fontSize={11}>{t.category}</text>
              <text x={300} y={L.rowCenterY(t.idx) + 2} textAnchor="end" fill="#EA2C00" fontSize={19} fontWeight={800} style={{ fontVariantNumeric: "tabular-nums" }}>{t.coveragePct}%</text>
            </g>
          );
        })}
      </svg>
      <style>{`
        @media (prefers-reduced-motion: no-preference){
          .crf-ribbon { stroke-dasharray: 1600; stroke-dashoffset: 1600; animation: crfDraw .85s cubic-bezier(.4,.7,.3,1) forwards; }
        }
        @keyframes crfDraw { to { stroke-dashoffset: 0 } }
      `}</style>
    </div>
  );
}
