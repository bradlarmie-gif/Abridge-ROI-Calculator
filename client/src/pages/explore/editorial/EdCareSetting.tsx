import { useState } from "react";
import { Stethoscope, Zap, Building2, HeartPulse, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { EditorialHeader, EditorialShell } from "./EditorialHeader";
import { PROOF_LAYER } from "./EdInvestment";
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

type Quadrant = "Capacity" | "Workforce" | "Revenue" | "Quality";
type Cell = { q: Quadrant; head: string; sub: string; signal: string };
type Setting = {
  id: ExploreCareSetting;
  name: string;
  sub: string;
  blurb: string;
  Icon: typeof Stethoscope;
  cells: Cell[];
};

// Each setting previews the SAME four value areas the rest of the flow is
// organized around (Capacity · Workforce · Revenue · Quality), so step 1
// foreshadows the whole journey. Copy is domain-accurate per setting, and each
// area names the signal we watch to prove it.
const SETTINGS: Setting[] = [
  {
    id: "outpatient",
    name: "Outpatient",
    sub: "Primary care & specialty",
    blurb: "Primary care & specialty. We build the value across four areas, each from your own volume and rates.",
    Icon: Stethoscope,
    cells: [
      { q: "Capacity", head: "Patient access", sub: "Visits freed as documentation load drops", signal: "Time in note ↓" },
      { q: "Workforce", head: "Provider wellbeing", sub: "Retention and locum / agency avoidance", signal: "Burnout ↓" },
      { q: "Revenue", head: "wRVU & HCC capture", sub: "Coding accuracy and recapture lift", signal: "Coding accuracy ↑" },
      { q: "Quality", head: "Documentation quality", sub: "Signals that protect the revenue above", signal: "Note completeness ↑" },
    ],
  },
  {
    id: "ed",
    name: "Emergency",
    sub: "Emergency department",
    blurb: "Emergency department. We build the value across four areas, each from your own volume and rates.",
    Icon: Zap,
    cells: [
      { q: "Capacity", head: "Throughput", sub: "LWBS recovery and downstream admission capture", signal: "LWBS rate ↓" },
      { q: "Workforce", head: "Physician wellbeing", sub: "Retention and less locum / agency reliance", signal: "Burnout ↓" },
      { q: "Revenue", head: "E&M accuracy", sub: "The right level captured on every visit", signal: "E/M level ↑" },
      { q: "Quality", head: "Core-measure & sepsis docs", sub: "Signals that protect the revenue above", signal: "Measure compliance ↑" },
    ],
  },
  {
    id: "inpatient",
    name: "Inpatient",
    sub: "Hospital medicine",
    blurb: "Hospital medicine. We build the value across four areas, each from your own volume and rates.",
    Icon: Building2,
    cells: [
      { q: "Capacity", head: "Length-of-stay signals", sub: "Documentation supporting timely discharge", signal: "Discharge-by-noon ↑" },
      { q: "Workforce", head: "Hospitalist wellbeing", sub: "Retention and coverage cost avoidance", signal: "Coverage cost ↓" },
      { q: "Revenue", head: "DRG accuracy & CDI", sub: "CMI lift, CC/MCC capture, fewer denials", signal: "Case-mix index ↑" },
      { q: "Quality", head: "HCAHPS & readmissions", sub: "Signals that protect the revenue above", signal: "Readmissions ↓" },
    ],
  },
  {
    id: "nursing",
    name: "Nursing",
    sub: "Inpatient nursing",
    blurb: "Inpatient nursing. We build the value across four areas, each from your own volume and rates.",
    Icon: HeartPulse,
    cells: [
      { q: "Capacity", head: "Bedside time", sub: "Charting time returned to patient care", signal: "Time at bedside ↑" },
      { q: "Workforce", head: "Retention & overtime", sub: "Turnover, agency, and overtime reduction", signal: "Overtime hours ↓" },
      { q: "Revenue", head: "Revenue integrity", sub: "Capture signals we track, not a dollar claim", signal: "Capture completeness ↑" },
      { q: "Quality", head: "Harm reduction", sub: "HAPI, falls, CAUTI, CLABSI, and sepsis", signal: "Harm events ↓" },
    ],
  },
];

const SETTING_LABEL: Record<ExploreCareSetting, string> = {
  outpatient: "Outpatient",
  ed: "Emergency",
  inpatient: "Inpatient",
  nursing: "Nursing",
};

// Quadrant accent colors — the real four-domains palette (matches the proforma /
// PDF). The proof domain is deliberately NOT colored; it takes the muted proof
// treatment so the customer sees which area is the non-financial layer on sight.
const QUAD_COLOR: Record<Quadrant, string> = {
  Capacity: "#F0704E",
  Workforce: "#C4674C",
  Revenue: "#EA2C00",
  Quality: "#8A8072",
};
const QUAD_DOT: Record<Quadrant, string> = {
  Capacity: "#F0704E",
  Workforce: "#F4A48C",
  Revenue: "#EA2C00",
  Quality: "#AFA491",
};

const EASE = [0.22, 1, 0.36, 1] as const;

export default function EdCareSetting({ selectedSetting, onSelectSetting, onNext, onBack, onHome, disabledSettings = [], onDataRequest }: Props) {
  const [hovered, setHovered] = useState<ExploreCareSetting | null>(null);
  // v2 (color-coded four domains + Tracked marking + tailored read) is now the
  // default; ?caresettingv2=0 falls back to the old flat panel for comparison.
  const v2 = typeof window === "undefined" || new URLSearchParams(window.location.search).get("caresettingv2") !== "0";

  // Preview follows the pointer, then the selection. Before either exists we
  // show a neutral placeholder rather than defaulting to a real setting, so the
  // panel never implies a pre-selection (Outpatient) the user hasn't made.
  const previewId: ExploreCareSetting | null = hovered ?? selectedSetting ?? null;
  const preview = previewId ? SETTINGS.find((s) => s.id === previewId)! : null;

  return (
    <EditorialShell>
      <EditorialHeader stepName="Care Setting" stepIndex={1} onDataRequest={onDataRequest} onBack={onBack} onHome={onHome} />
      <div className="max-w-[1120px] mx-auto px-10 pt-[52px] pb-[60px]">
        <div className="text-[11px] font-extrabold tracking-[1.3px] uppercase text-[#565250]">Explore · Step 1 of 9</div>
        <h1 className="font-abridge text-[27px] sm:text-[34px] lg:text-[40px] leading-[1.08] text-[#1A1A1A] mt-[10px] max-w-[680px]">
          Which care setting<br className="hidden sm:inline" />{" "}
          should we model first?
        </h1>
        <p className="text-[16.5px] text-[#565250] mt-[14px] max-w-[620px] leading-[1.5]">
          Pick one to start. The panel shows what you'll build for that setting, all from its real volume and economics, never a benchmark.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-7 mt-9 items-stretch">
          {/* Selector list */}
          <div className="flex flex-col gap-[10px]" onMouseLeave={() => setHovered(null)}>
            {SETTINGS.map(({ id, name, sub, Icon }) => {
              const selected = selectedSetting === id;
              const disabled = disabledSettings.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelectSetting(id)}
                  onMouseEnter={() => !disabled && setHovered(id)}
                  data-testid={`ed-setting-${id}`}
                  className={`group relative text-left flex items-center gap-[14px] border rounded-[14px] px-4 py-[15px] transition-all duration-200 ${
                    selected
                      ? "border-[#EA2C00] bg-[#FEF6F3] shadow-[0_0_0_1px_#EA2C00]"
                      : "border-[#E7E3DD] bg-[#FDFBF8] hover:border-[#C9BCA9] hover:bg-[#FBF7F1]"
                  } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  {selected && <span className="absolute left-0 top-[14px] bottom-[14px] w-[3px] rounded-r-[3px] bg-[#EA2C00]" />}
                  <div className={`w-[44px] h-[44px] rounded-[12px] flex items-center justify-center transition-colors duration-200 ${selected ? "bg-[#FFEDE7] text-[#EA2C00]" : "bg-[#F2EFEA] text-[#6B5E4F]"}`}>
                    <Icon className="w-[22px] h-[22px]" strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0">
                    <div className={`font-abridge text-[20px] leading-tight ${selected ? "text-[#EA2C00]" : "text-[#1A1A1A]"}`}>{name}</div>
                    <div className="text-[11px] font-extrabold tracking-[0.06em] uppercase text-[#7C766F] mt-[2px]">{sub}</div>
                  </div>
                  <ArrowRight
                    className={`ml-auto w-[18px] h-[18px] transition-all duration-200 ${
                      selected ? "text-[#EA2C00] translate-x-0" : "text-[#B0ABA4] -translate-x-1 group-hover:translate-x-0 group-hover:text-[#8C7E6E]"
                    }`}
                    strokeWidth={1.8}
                  />
                </button>
              );
            })}
          </div>

          {/* Live preview */}
          <div className="bg-[#FDFBF8] border border-[#E7E3DD] rounded-[20px] p-[30px_32px] min-h-[360px] overflow-hidden">
            <AnimatePresence mode="wait">
              {preview ? (
                <motion.div
                  key={preview.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.3, ease: EASE }}
                >
                  <div className="text-[11px] font-extrabold tracking-[0.09em] uppercase text-[#7C766F]">
                    What you'll model · {preview.name}
                  </div>
                  <div className="font-abridge text-[32px] text-[#1A1A1A] mt-[6px] mb-1">{preview.name}</div>
                  <p className="text-[15px] text-[#565250] leading-[1.55] max-w-[520px] mt-[10px] mb-6">{preview.blurb}</p>

                  {v2 ? (
                    <>
                      {/* Color-coded four areas, proof layer marked per setting, each
                          card naming the signal we watch — cards stagger in. */}
                      <motion.div
                        className="grid grid-cols-2 gap-3"
                        initial="hidden"
                        animate="show"
                        variants={{ show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } }}
                      >
                        {preview.cells.map((c) => {
                          const proofNote = (PROOF_LAYER[preview.id] ?? {})[c.q];
                          const isProof = !!proofNote;
                          return (
                            <motion.div
                              key={c.q}
                              variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.34, ease: EASE } } }}
                              className={`relative rounded-[14px] px-4 py-[15px] ${isProof ? "border border-dashed border-[#E0D8CD] bg-[#FBF8F3]" : "border border-[#E7E3DD] bg-white"}`}
                            >
                              {isProof && (
                                <span className="absolute top-[14px] right-[14px] text-[8.5px] font-extrabold tracking-[0.05em] uppercase text-[#8A8480] bg-[#F2ECE3] rounded-full px-[8px] py-[3px]">
                                  Tracked
                                </span>
                              )}
                              <div className="flex items-center gap-[7px]">
                                <span className="w-[9px] h-[9px] rounded-[3px] flex-shrink-0" style={{ background: isProof ? "#C4BCB0" : QUAD_DOT[c.q] }} />
                                <span className="text-[10px] font-extrabold tracking-[0.08em] uppercase" style={{ color: isProof ? "#8A8072" : QUAD_COLOR[c.q] }}>{c.q}</span>
                              </div>
                              <div className="text-[14px] font-semibold text-[#2E2822] mt-[9px]">{c.head}</div>
                              <div className="text-[12px] text-[#7C766F] mt-[3px] leading-[1.4]">{c.sub}</div>
                            </motion.div>
                          );
                        })}
                      </motion.div>
                    </>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {preview.cells.map((c) => (
                        <div key={c.q} className="border border-[#E7E3DD] rounded-[14px] px-4 py-[15px] bg-white">
                          <div className="text-[10.5px] font-extrabold tracking-[0.08em] uppercase text-[#EA2C00]">{c.q}</div>
                          <div className="text-[14px] font-semibold text-[#2E2822] mt-[5px]">{c.head}</div>
                          <div className="text-[12px] text-[#7C766F] mt-[2px] leading-[1.4]">{c.sub}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.3, ease: EASE }}
                >
                  <div className="text-[11px] font-extrabold tracking-[0.09em] uppercase text-[#7C766F]">
                    What you'll model
                  </div>
                  <div className="font-abridge text-[32px] text-[#1A1A1A] mt-[6px] mb-1">{v2 ? "The four areas we model" : "Choose a setting"}</div>
                  <p className="text-[15px] text-[#565250] leading-[1.55] max-w-[520px] mt-[10px] mb-6">
                    {v2
                      ? "Every setting is modeled across the same four areas, each from its own volume and economics. Hover or pick one on the left to see it."
                      : "Hover or pick a setting on the left to preview what we'll build for it. Every setting models the same four areas, each from its own volume and economics."}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {(["Capacity", "Workforce", "Revenue", "Quality"] as const).map((q) => (
                      <div key={q} className="border border-dashed border-[#E0D8CD] rounded-[14px] px-4 py-[15px] bg-transparent">
                        <div className="flex items-center gap-[7px]">
                          <span className="w-[9px] h-[9px] rounded-[3px] flex-shrink-0" style={{ background: v2 ? QUAD_DOT[q] : "#D8CFC2", opacity: v2 ? 0.5 : 1 }} />
                          <div className="text-[10.5px] font-extrabold tracking-[0.08em] uppercase text-[#B0ABA4]">{q}</div>
                        </div>
                        <div className="text-[12.5px] text-[#B0ABA4] mt-[6px] leading-[1.4]">{v2 ? "Previewed once you pick a setting" : "Shown once you pick a setting"}</div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex justify-between items-center mt-[34px]">
          <div className="text-[13px] text-[#565250]">
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
