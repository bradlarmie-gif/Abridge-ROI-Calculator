// client/src/components/forecast/ArMoatView.tsx
// "Why only Abridge" (the moat). The stack of documentation tools each does one
// step of the note; Abridge already covers those steps, so they fold in. The
// documentation chain shows who covers what: Abridge spans the conversation to
// the draft note (the source), flanked by dashed "expanding" regions
// (pre-charting on the left; coding/quality on the right).
//
// Data-driven, lightly: the fold-in tool bars are the customer's ACTUAL capture
// tools (spend > 0 in a capture-layer category), each labeled with its display
// name and clickable. Clicking one opens a "coming soon" compare drawer for that
// tool. With no capture tools we fall back to one neutral "Your capture tools"
// bar so the diagram never reads as broken.
//
// Copy here is legal-approved; the verbatim strings must not drift.
import { useState } from "react";
import { itemDisplayName, type AppRatItem, type AppRatCategoryId } from "@/lib/appRationalizationCalc";

const CORAL = "#EA2C00";

// The capture layer: tools that take one step between the conversation and the
// draft note. These are the tools that fold onto Abridge. Coding / pre-charting
// / reference tools are deliberately excluded — they are not plotted as fold-in
// bars (some are coming-soon; some Abridge doesn't replace).
const CAPTURE_CATEGORIES: readonly AppRatCategoryId[] = ["ambientDoc", "dictation", "scribe", "transcription"];

export interface MoatTool {
  id: string;
  name: string;
}

/** The customer's actual capture-layer tools (spend > 0), in order. Empty when
 *  none, which the view renders as a single neutral fallback bar. */
export function buildMoatTools(items: AppRatItem[]): MoatTool[] {
  return items
    .filter((i) => (i.annualSpend || 0) > 0 && CAPTURE_CATEGORIES.includes(i.category))
    .map((i) => ({ id: i.id, name: itemDisplayName(i) }));
}

export default function ArMoatView({ items }: { items: AppRatItem[] }) {
  const tools = buildMoatTools(items);
  const hasTools = tools.length > 0;
  const [openTool, setOpenTool] = useState<string | null>(null);

  // Rows: one 38px row per tool bar (min 1 for the fallback), a 20px gap row,
  // the 60px Abridge/ab-soon bar row, then the 48px stage-label row.
  const toolRows = Math.max(1, tools.length);
  const barRow = toolRows + 2; // after the tool rows + the 20px gap row
  const labelRow = toolRows + 3;

  const openName = openTool ? tools.find((t) => t.id === openTool)?.name ?? null : null;

  return (
    <div
      className="rounded-[20px] p-6 md:p-8"
      style={{ background: "linear-gradient(160deg,#FDFBF8,#F6F1EA)", border: "1px solid #E8E2DA" }}
      data-testid="ar-moat"
    >
      {/* Eyebrow */}
      <div className="text-[11px] font-bold tracking-[0.12em] uppercase text-[#8C7E6E]">
        Forecast · App Rationalization · Why only Abridge
      </div>

      {/* Hero: black headline + claim-safe subhead (verbatim) */}
      <h2 className="font-abridge text-[32px] md:text-[40px] leading-[1.05] text-[#1A1A1A] mt-4">
        The stack folds into Abridge.
      </h2>
      <p className="text-[15px] md:text-[16.5px] text-[#8C7E6E] mt-4 max-w-[680px] leading-[1.5]">
        Each of these tools does one step of the note, and Abridge already covers those steps, so they
        fold in. A single-step tool has nothing for the rest to fold onto.
      </p>

      {/* Chain title */}
      <div className="flex justify-between items-baseline mt-12 mb-1.5">
        <span className="text-[12px] font-extrabold tracking-[0.08em] uppercase text-[#443A32]">
          The documentation chain, who covers what
        </span>
        <span className="text-[12px] text-[#8C7E6E]">click any tool to compare it with Abridge</span>
      </div>

      {/* The documentation chain: 6 columns */}
      <div
        className="relative grid"
        style={{
          gridTemplateColumns: "repeat(6, 1fr)",
          gridTemplateRows: `repeat(${toolRows}, 38px) 20px 60px 48px`,
          columnGap: 0,
          rowGap: 8,
          marginTop: 16,
        }}
        data-testid="ar-moat-chain"
      >
        {/* vertical gridlines at each sixth (behind the bars) */}
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="absolute top-0 z-0"
            style={{ left: `${(i * 100) / 6}%`, bottom: 48, width: 1, background: "#EFE8DF" }}
          />
        ))}

        {/* Fold-in tool bars (Capture / Draft region, columns 3-5) */}
        {hasTools
          ? tools.map((t, i) => {
              const active = openTool === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setOpenTool(active ? null : t.id)}
                  className="relative z-[2] flex items-center rounded-[9px] px-[15px] text-left text-[13.5px] font-bold text-[#5E534A] transition-colors"
                  style={{
                    gridRow: i + 1,
                    gridColumn: "3 / 5",
                    background: active ? "#E7DCCC" : "#EFE7DC",
                    border: `1px solid ${active ? "#D2C4B0" : "#E1D7C9"}`,
                    cursor: "pointer",
                  }}
                  data-testid={`ar-moat-tool-${t.id}`}
                >
                  {t.name}
                  <span
                    className="absolute right-[13px] text-[11px] font-extrabold tracking-[0.02em]"
                    style={{ color: CORAL }}
                  >
                    ↓ folds in
                  </span>
                </button>
              );
            })
          : (
            // Fallback: a single tasteful neutral bar so the diagram never looks empty
            <div
              className="relative z-[2] flex items-center rounded-[9px] px-[15px] text-[13.5px] font-bold text-[#5E534A]"
              style={{
                gridRow: 1,
                gridColumn: "3 / 5",
                background: "#EFE7DC",
                border: "1px solid #E1D7C9",
              }}
              data-testid="ar-moat-fallback"
            >
              Your capture tools
              <span
                className="absolute right-[13px] text-[11px] font-extrabold tracking-[0.02em]"
                style={{ color: CORAL }}
              >
                ↓ folds in
              </span>
            </div>
          )}

        {/* The coverage bar row: dashed pre-charting · coral Abridge · dashed coding/quality */}
        <div
          className="relative z-[2] flex items-center justify-center rounded-l-[10px] px-[14px] text-center text-[12px] font-extrabold"
          style={{
            gridRow: barRow,
            gridColumn: "1 / 2",
            color: "#B02200",
            border: "1.5px dashed #F0B7A6",
            borderRight: "none",
            background:
              "repeating-linear-gradient(135deg,rgba(234,44,0,.16) 0 9px,rgba(234,44,0,.07) 9px 18px)",
          }}
        >
          Pre-charting
          <span className="ml-[7px] text-[9.5px] font-extrabold tracking-[0.06em] uppercase opacity-85">
            expanding
          </span>
        </div>
        <div
          className="ab-live font-abridge relative z-[2] flex items-center px-5 text-[15px] font-extrabold text-white"
          style={{ gridRow: barRow, gridColumn: "2 / 5", background: CORAL }}
          data-testid="ar-moat-abridge-bar"
        >
          Abridge, from the conversation to the draft note
        </div>
        <div
          className="relative z-[2] flex items-center rounded-r-[10px] px-[14px] text-[12px] font-extrabold"
          style={{
            gridRow: barRow,
            gridColumn: "5 / 7",
            color: "#B02200",
            border: "1.5px dashed #F0B7A6",
            borderLeft: "none",
            background:
              "repeating-linear-gradient(135deg,rgba(234,44,0,.16) 0 9px,rgba(234,44,0,.07) 9px 18px)",
          }}
        >
          Coding · Quality
          <span className="ml-[7px] text-[9.5px] font-extrabold tracking-[0.06em] uppercase opacity-85">
            expanding
          </span>
        </div>

        {/* Stage labels */}
        <div
          className="relative z-[2] flex flex-col pt-3 text-[12px] font-extrabold tracking-[0.02em] text-[#B4A99B]"
          style={{ gridRow: labelRow, gridColumn: "1 / 2" }}
        >
          Pre-charting
          <span className="mt-1 text-[10.5px] font-semibold tracking-normal normal-case text-[#8C7E6E]">
            prep, from EMR data everyone has
          </span>
        </div>
        <div
          className="relative z-[2] flex flex-col pt-3 text-[12px] font-extrabold tracking-[0.02em] text-[#443A32]"
          style={{ gridRow: labelRow, gridColumn: "2 / 3" }}
        >
          The conversation
          <span
            className="mt-1.5 w-fit rounded-full px-2 py-[3px] text-[10px] font-extrabold tracking-[0.05em] uppercase"
            style={{ color: CORAL, background: "#FFEDE7" }}
          >
            the source
          </span>
        </div>
        <div
          className="relative z-[2] flex flex-col pt-3 text-[12px] font-extrabold tracking-[0.02em] text-[#443A32]"
          style={{ gridRow: labelRow, gridColumn: "3 / 4" }}
        >
          Capture
        </div>
        <div
          className="relative z-[2] flex flex-col pt-3 text-[12px] font-extrabold tracking-[0.02em] text-[#443A32]"
          style={{ gridRow: labelRow, gridColumn: "4 / 5" }}
        >
          Draft note
        </div>
        <div
          className="relative z-[2] flex flex-col pt-3 text-[12px] font-extrabold tracking-[0.02em] text-[#B4A99B]"
          style={{ gridRow: labelRow, gridColumn: "5 / 6" }}
        >
          Coding
        </div>
        <div
          className="relative z-[2] flex flex-col pt-3 text-[12px] font-extrabold tracking-[0.02em] text-[#B4A99B]"
          style={{ gridRow: labelRow, gridColumn: "6 / 7" }}
        >
          Quality
        </div>
      </div>

      {/* Compare drawer (coming soon) */}
      {openName && (
        <div
          className="mt-[26px] rounded-[16px] border border-[#E8E2DA] bg-white p-[22px_24px]"
          data-testid="ar-moat-compare"
        >
          <div className="flex items-center gap-3 text-[16px] font-extrabold text-[#1A1A1A]">
            <span data-testid="ar-moat-compare-name">{openName}</span>
            <span className="font-bold text-[#8C7E6E]">vs Abridge</span>
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-extrabold tracking-[0.05em] uppercase"
              style={{ color: CORAL, background: "#FFEDE7" }}
            >
              side-by-side coming soon
            </span>
            <button
              type="button"
              onClick={() => setOpenTool(null)}
              className="ml-auto text-[20px] font-normal text-[#8C7E6E]"
              aria-label="Close comparison"
              data-testid="ar-moat-compare-close"
            >
              ×
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3.5">
            <div className="rounded-[12px] border border-[#E8E2DA] p-[16px_18px]">
              <div className="text-[11px] font-extrabold tracking-[0.06em] uppercase text-[#443A32]">
                {openName}
              </div>
              <div className="mt-3 h-[11px] w-[80%] rounded-[6px] bg-[#EEE7DD]" />
              <div className="mt-3 h-[11px] w-[60%] rounded-[6px] bg-[#EEE7DD]" />
              <div className="mt-3 h-[11px] w-[70%] rounded-[6px] bg-[#EEE7DD]" />
            </div>
            <div className="rounded-[12px] border border-[#F5C8BB] bg-[#FFF7F4] p-[16px_18px]">
              <div className="text-[11px] font-extrabold tracking-[0.06em] uppercase" style={{ color: CORAL }}>
                Abridge
              </div>
              <div className="mt-3 h-[11px] w-[90%] rounded-[6px] bg-[#F7D9CF]" />
              <div className="mt-3 h-[11px] w-[80%] rounded-[6px] bg-[#F7D9CF]" />
              <div className="mt-3 h-[11px] w-[70%] rounded-[6px] bg-[#F7D9CF]" />
            </div>
          </div>

          <div className="mt-3.5 text-center text-[12.5px] text-[#8C7E6E]">
            A step-by-step of what {openName} does and where Abridge already covers it. Coming soon.
          </div>
        </div>
      )}

      {/* The moat */}
      <div className="mt-[52px] border-t-2 border-[#1A1A1A] pt-[22px]" data-testid="ar-moat-block">
        <div className="text-[11px] font-extrabold tracking-[0.1em] uppercase text-[#443A32]">The moat</div>
        <div className="font-abridge mt-3 max-w-[940px] text-[24px] md:text-[26px] leading-[1.2] text-[#1A1A1A]">
          Price is a move any vendor can match in a year. Working from the conversation itself is not.{" "}
          <span className="font-normal" style={{ color: CORAL }}>
            That is why the stack folds onto Abridge, and not onto a tool that does one step.
          </span>
        </div>
      </div>
    </div>
  );
}
