import { motion } from "framer-motion";
import { HelpCircle, ArrowDown } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NumberField } from "@/components/NumberField";
import { lineOptions, realizedValue, formulaWithRealization, type LeverValues, type AttainBaseline } from "@/lib/attain/attainLevers";
import {
  computeCapacityChain,
  otHoursPerNurseWeekFor,
  otHourlyRateFor,
  DEFAULT_OT_HOURS_PER_NURSE_WEEK,
  DEFAULT_OT_HOURLY_RATE,
  NURSING_CAPACITY_WHO_ACTS,
  NURSING_CAPACITY_NO_DOUBLE_COUNT,
} from "@/lib/attain/attainCapacity";
import type { AttainSetting } from "@/lib/attain/attainTypes";
import { fmtInt, fmtMoneyCompact, deriveNursingCapacityLadder, NursingCapacityGate } from "./accessLadder";

function asLines(raw: number | string[] | undefined): string[] {
  return Array.isArray(raw) ? raw : [];
}
function asNum(raw: number | string[] | undefined): number {
  return typeof raw === "number" ? raw : 0;
}

interface CapacityLadderChainProps {
  setting: AttainSetting;
  baseline: AttainBaseline;
  values: LeverValues;
  onChangeValue: (leverId: string, value: number | string[]) => void;
  realizationPct: number;
}

// ── Rung shells, matched to the other ladders' visual language ──

function LadderRung({
  eyebrow,
  title,
  help,
  testid,
  anchor,
  children,
}: {
  eyebrow: string;
  title: string;
  help: string;
  testid: string;
  anchor?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-7 ${anchor ? "bg-[#FFF6F3] border-[#EA2C00]" : "bg-white border-[#E7E0D6]"}`}
      data-testid={testid}
    >
      <p className="text-[11px] font-bold uppercase tracking-[2px] text-[#EA2C00] mb-1.5">{eyebrow}</p>
      <h3 className="text-lg font-bold text-[#1A1A1A] mb-2 font-abridge">{title}</h3>
      <p className="text-[15px] text-[#8C8C8C] leading-relaxed mb-5 max-w-[620px]">{help}</p>
      {children}
    </motion.div>
  );
}

function Connector() {
  return (
    <div className="flex justify-center py-1.5">
      <ArrowDown className="w-4 h-4 text-[#B4B4B4]" />
    </div>
  );
}

function CountOutput({ label, value, unit, testid }: { label: string; value: string; unit: string; testid: string }) {
  return (
    <div className="bg-[#F8F5F1] rounded-lg px-4 py-3 flex items-baseline justify-between gap-3" data-testid={testid}>
      <span className="text-sm text-[#8C8C8C]">{label}</span>
      <span className="text-xl font-bold text-[#1A1A1A] font-abridge">
        {value} <span className="text-xs font-normal text-[#8C8C8C]">{unit}</span>
      </span>
    </div>
  );
}

function MathBox({ formula, testid }: { formula: string; testid: string }) {
  return (
    <div className="mt-3 bg-[#F8F5F1] border-l-[3px] border-[#EA2C00] rounded-r-md p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#EA2C00] mb-1">The math</p>
      <p className="text-[12.5px] text-[#3A3A3A] leading-relaxed" data-testid={testid}>{formula}</p>
    </div>
  );
}

function InfoTip({ text, testid }: { text: string; testid: string }) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <span className="text-[#B4B4B4] hover:text-[#8C8C8C] transition-colors cursor-help inline-flex" data-testid={testid}>
          <HelpCircle className="w-3.5 h-3.5" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[240px] text-xs leading-relaxed">
        <p>{text}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function FieldLabel({ children, tip, testid }: { children: React.ReactNode; tip?: string; testid?: string }) {
  return (
    <label className="text-sm font-medium text-[#3A3A3A] mb-2 flex items-center gap-1.5">
      {children}
      {tip && testid && <InfoTip text={tip} testid={testid} />}
    </label>
  );
}

/**
 * Build the case, CAPACITY (nursing) = OVERTIME. The assembled, editable
 * version of the SAME single gated ladder Planning shows read-only on the hook
 * (see accessLadder.tsx's `deriveNursingCapacityLadder` / `NursingCapacityGate`
 * and attainCapacity.ts's `computeCapacityChain`, the one source of the order,
 * the first domino, the gate, and the numbers).
 *
 * Top to bottom: the first domino (minutes saved per note, so nurses chart in
 * the moment instead of after the shift, no dollar), then the overtime run now
 * (the pool), THE GATE (the documentation-attributable share of that overtime,
 * the ceiling on what charting can move, versus overtime from short staffing
 * or census that Abridge cannot touch), the realized overtime hours avoided,
 * and the prize (hours avoided x loaded overtime rate). Every number
 * reconciles to Explore's own `nursingOvertime` driver. The running total
 * lives in the side panel as plain steps.
 */
export default function CapacityLadderChain({ setting, baseline, values, onChangeValue, realizationPct }: CapacityLadderChainProps) {
  const presetLines = lineOptions("capacity", setting);
  const selectedLines = asLines(values.capacityLines);
  const totalNurses = Math.max(0, Math.round(baseline.nursingFtes ?? 0));
  const requestedNurses = asNum(values.capacityNurses);
  const otHoursPerWeek = otHoursPerNurseWeekFor(values);
  const otRate = otHourlyRateFor(values);
  const docShare = asNum(values.capacityDocShare);
  const conversion = asNum(values.capacityConversion);

  const chain = computeCapacityChain(baseline, values);
  const realizedPrize = realizedValue(chain.prize, realizationPct);
  const ladder = deriveNursingCapacityLadder(chain, {
    realizedOtHoursAvoided: chain.realizedOtHoursAvoided,
    prize: realizedPrize,
  });
  const payoffFormula = chain.prize > 0 ? formulaWithRealization(chain.formulas.payoff, realizationPct, realizedPrize) : chain.formulas.payoff;

  const toggleLine = (line: string) => {
    const next = selectedLines.includes(line) ? selectedLines.filter((l) => l !== line) : [...selectedLines, line];
    onChangeValue("capacityLines", next);
  };

  return (
    <div data-testid="section-attain-capacity-ladder">
      {/* THE FIRST DOMINO. Minutes saved per note is the mechanism, framed as
          the one thing Abridge moves, and it carries no dollar. The overtime
          math starts one rung down. Same anchor treatment the other ladders
          open on. */}
      <LadderRung
        anchor
        eyebrow="The first domino"
        title="Minutes saved per note, so nurses chart in the moment"
        help="This is the one thing Abridge moves. Ambient documentation lets a nurse chart at the point of care instead of catching up after the shift. When the record is done in the moment, the shift can close on time, and the overtime that charting caused does not accrue. Nothing below happens without it."
        testid="card-capacity-domino"
      />

      <Connector />

      {/* GROUND IT. The overtime run now: units, nurses, overtime per nurse,
          and the loaded overtime rate. The pool the diagnosis is measured
          against. */}
      <LadderRung
        eyebrow="Ground it"
        title="The overtime you run now"
        help="Commit the units and a real nurse count, then your own current overtime per nurse and the loaded overtime rate. That puts the plan on real overtime hours, the pool the documentation-attributable share is measured against. No dollar yet, and no share decided."
        testid="card-capacity-ground"
      >
        {presetLines.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {presetLines.map((line) => {
              const active = selectedLines.includes(line);
              return (
                <button
                  key={line}
                  type="button"
                  onClick={() => toggleLine(line)}
                  className={`px-3 py-2 rounded-md text-sm border transition-all ${
                    active ? "border-[#EA2C00] bg-[#FFF6F3] text-[#EA2C00] font-medium" : "border-[#E5E5E5] bg-white text-[#3A3A3A] hover:border-[#D8CFC4]"
                  }`}
                  data-testid={`chip-capacity-line-${line.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {line}
                </button>
              );
            })}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <FieldLabel tip="How many nurses are covered by this plan, capped to your Starting-point baseline.">
              Nurses in scope
            </FieldLabel>
            <NumberField
              value={requestedNurses}
              onValueChange={(v) => onChangeValue("capacityNurses", v)}
              min={0}
              max={totalNurses || undefined}
              decimal={false}
              className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white px-3 text-sm"
              placeholder={totalNurses > 0 ? `e.g., up to ${totalNurses}` : "e.g., 300"}
              data-testid="input-capacity-nurses"
            />
            <p className="text-[11px] text-[#8C8C8C] mt-1">
              Capped at your Starting-point count{totalNurses > 0 ? ` of ${totalNurses.toLocaleString()}` : ""}.
            </p>
          </div>
          <div>
            <FieldLabel tip="Your own current overtime per nurse per week, mostly after-shift charting. Your figure, not a benchmark.">
              Overtime hrs / nurse / wk
            </FieldLabel>
            <NumberField
              value={otHoursPerWeek}
              onValueChange={(v) => onChangeValue("capacityOtHoursPerWeek", v)}
              min={0}
              decimal={true}
              className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white px-3 text-sm"
              placeholder={`e.g., ${DEFAULT_OT_HOURS_PER_NURSE_WEEK}`}
              data-testid="input-capacity-ot-hours"
            />
          </div>
          <div>
            <FieldLabel tip="The fully loaded overtime hourly rate, base pay plus the overtime premium. Your own figure.">
              Loaded overtime rate
            </FieldLabel>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-sm pointer-events-none">$</span>
              <NumberField
                value={otRate}
                onValueChange={(v) => onChangeValue("capacityOtRate", v)}
                min={0}
                decimal={false}
                className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white pl-7 pr-8 text-sm"
                placeholder={`e.g., ${DEFAULT_OT_HOURLY_RATE}`}
                data-testid="input-capacity-ot-rate"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-xs pointer-events-none">/hr</span>
            </div>
          </div>
        </div>
        <CountOutput label="Overtime run now" value={fmtInt(chain.totalOtHoursYr)} unit="overtime hrs / yr" testid="text-capacity-ground-output" />
        <MathBox formula={chain.formulas.ground} testid="text-capacity-ground-formula" />
      </LadderRung>

      <Connector />

      {/* THE GATE. Diagnose the documentation-attributable share (the ceiling),
          then commit the conservative share removed. The gate reads ceiling vs.
          what the plan actually takes out. Same gate framing Planning shows
          read-only. */}
      <LadderRung
        eyebrow="The gate · diagnose the leak, then commit the share you remove"
        title="Which overtime is charting's to fix, and how much you take out"
        help="Overtime from short staffing or a census surge is not Abridge's to fix. Only the share driven by charting after the shift, batching notes, and missed lunches is yours to cut, and that share is the ceiling. Then commit to the conservative share of it this plan actually removes once the freed minute lands on the shift."
        testid="card-capacity-gate"
      >
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#8C8C8C] flex items-center gap-1.5">
              Documentation-attributable share of overtime
              <InfoTip
                text="Of your overtime, the share driven by charting after the shift, versus short staffing or census. Only the documentation-driven share is recoverable, so it is the ceiling."
                testid="tooltip-capacity-doc-share"
              />
            </span>
            <span className="text-sm font-semibold text-[#1A1A1A]" data-testid="text-capacity-doc-share-value">{Math.round(docShare)}%</span>
          </div>
          <Slider
            value={[docShare]}
            onValueChange={(v) => onChangeValue("capacityDocShare", v[0])}
            min={0}
            max={100}
            step={5}
            accent="coral"
            className="w-full"
            data-testid="slider-capacity-doc-share"
          />
        </div>

        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#8C8C8C] flex items-center gap-1.5">
              Share of that overtime you remove
              <InfoTip
                text="The conservative share of the documentation-attributable overtime this plan actually removes, once the freed minute closes the shift on time instead of becoming a new task."
                testid="tooltip-capacity-conversion"
              />
            </span>
            <span className="text-sm font-semibold text-[#1A1A1A]" data-testid="text-capacity-conversion-value">{Math.round(conversion)}%</span>
          </div>
          <Slider
            value={[conversion]}
            onValueChange={(v) => onChangeValue("capacityConversion", v[0])}
            min={0}
            max={100}
            step={5}
            accent="coral"
            className="w-full"
            data-testid="slider-capacity-conversion"
          />
        </div>

        <NursingCapacityGate
          showHeader={false}
          totalOtHoursYr={chain.totalOtHoursYr}
          docAttributableSharePct={chain.docAttributableSharePct}
          docAttributableOtHoursYr={chain.docAttributableOtHoursYr}
          realizedOtHoursAvoided={chain.realizedOtHoursAvoided}
          whoActs={NURSING_CAPACITY_WHO_ACTS}
          bothSet={chain.docAttributableOtHoursYr > 0 && chain.realizedOtHoursAvoided > 0}
          emptyHint={
            chain.totalOtHoursYr <= 0
              ? "Set your nurses in scope and overtime per nurse above to size the pool, then diagnose the documentation-driven share."
              : "Diagnose the documentation-driven share above, then commit to the share you will remove."
          }
        />
        <MathBox formula={chain.formulas.gate} testid="text-capacity-gate-formula" />
      </LadderRung>

      <Connector />

      {/* THE PRIZE. The one place a dollar appears: overtime hours avoided x
          loaded overtime rate, derived from the rungs above. */}
      <LadderRung
        eyebrow="The prize"
        title="What it is worth"
        help="Overtime hours avoided times the loaded overtime rate, the first and only dollar in this ladder, derived from the rungs above. It is already counted in your plan, forming, on the right."
        testid="card-capacity-prize"
      >
        {chain.prize > 0 ? (
          <p className="text-[15px] text-[#1A1A1A]" data-testid="text-capacity-prize-caption">
            <span className="font-semibold text-[#EA2C00]" data-testid="text-capacity-prize-value">{fmtMoneyCompact(realizedPrize)}</span>
            {" / yr, from "}
            {fmtInt(ladder.realizedOtHoursAvoided)} overtime hrs avoided x ${fmtInt(otRate)}/hr.
            {" Tracked live in your plan on the right."}
          </p>
        ) : (
          <p className="text-[13.5px] text-[#8C8C8C]" data-testid="text-capacity-prize-empty">
            Finish the rungs above and the prize appears here and in your plan on the right.
          </p>
        )}
        <MathBox formula={payoffFormula} testid="text-capacity-prize-formula" />
        <p className="text-[11px] text-[#8C8C8C] mt-3 leading-relaxed" data-testid="text-capacity-no-double-count">
          {NURSING_CAPACITY_NO_DOUBLE_COUNT}
        </p>
      </LadderRung>
    </div>
  );
}
