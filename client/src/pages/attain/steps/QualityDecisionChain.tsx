import { motion } from "framer-motion";
import { HelpCircle, Check } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NumberField } from "@/components/NumberField";
import { lineOptions, realizedValue, formulaWithRealization, type LeverValues } from "@/lib/attain/attainLevers";
import type { AttainBaseline } from "@/lib/attain/attainLevers";
import {
  computeQualityChain,
  selectedEventTypes,
  QUALITY_EVENT_IDS,
  QUALITY_EVENT_LABELS,
  QUALITY_SIGNAL_PRIMARY,
  QUALITY_SIGNAL_SECONDARY,
  type QualityEventId,
  type QualityEventIntervention,
} from "@/lib/attain/attainQuality";
import type { AttainSetting } from "@/lib/attain/attainTypes";

function asLines(raw: number | string[] | undefined): string[] {
  return Array.isArray(raw) ? raw : [];
}
function asNum(raw: number | string[] | undefined): number {
  return typeof raw === "number" ? raw : 0;
}
function asBool(raw: number | string[] | undefined): boolean {
  return asNum(raw) === 1;
}
function fmtInt(n: number): string {
  return Math.round(n).toLocaleString();
}
function fmtPct(n: number): string {
  return (Math.round(n * 10) / 10).toString();
}
function fmtMoneyCompact(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${Math.round(abs)}`;
}

interface QualityDecisionChainProps {
  setting: AttainSetting;
  baseline: AttainBaseline;
  values: LeverValues;
  onChangeValue: (leverId: string, value: number | string[]) => void;
  /** This priority's realization/attribution rate, 0-100, default 100 - see
   * AccessDecisionChain.tsx's matching prop for the full explanation. */
  realizationPct: number;
}

/** A card shell shared by every D-step - same local convention
 * WorkforceDecisionChain.tsx / RevenueDecisionChain.tsx use, deliberately
 * not shared with the generic lever card (bypassed entirely for quality). */
function DecisionCard({
  step,
  title,
  help,
  testid,
  children,
}: {
  step: string;
  title: string;
  help: string;
  testid: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[#E7E0D6] bg-white p-7 mb-6"
      data-testid={testid}
    >
      <p className="text-[11px] font-bold uppercase tracking-[2px] text-[#EA2C00] mb-1.5">{step}</p>
      <h3 className="text-lg font-bold text-[#1A1A1A] mb-2 font-abridge">{title}</h3>
      <p className="text-[15px] text-[#8C8C8C] leading-relaxed mb-5 max-w-[620px]">{help}</p>
      {children}
    </motion.div>
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

function MathBox({ formula, testid }: { formula: string; testid: string }) {
  return (
    <div className="mt-3 bg-[#F8F5F1] border-l-[3px] border-[#EA2C00] rounded-r-md p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#EA2C00] mb-1">The math</p>
      <p className="text-[12.5px] text-[#3A3A3A] leading-relaxed" data-testid={testid}>
        {formula}
      </p>
    </div>
  );
}

/** One named, checkable clinical intervention - a real, binary commitment
 * a unit either has in place or does not (never a rate to dial). Checking
 * it adds that intervention's own fixed pp toward its event's own
 * prevention ceiling (see attainQuality.ts's module header). */
function InterventionRow({
  label,
  checked,
  onToggle,
  testid,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  testid: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-md border transition-all ${
        checked ? "border-[#EA2C00] bg-[#FFF6F3]" : "border-[#E5E5E5] bg-white hover:border-[#D8CFC4]"
      }`}
      data-testid={testid}
    >
      <span
        className={`flex-shrink-0 w-4 h-4 rounded-[3px] border flex items-center justify-center ${
          checked ? "bg-[#EA2C00] border-[#EA2C00]" : "border-[#C9C2B8] bg-white"
        }`}
      >
        {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </span>
      <span className={`text-[13.5px] leading-snug ${checked ? "text-[#EA2C00] font-medium" : "text-[#3A3A3A]"}`}>{label}</span>
    </button>
  );
}

/** D2's one sub-panel per SELECTED event type - the headline fix (C1): each
 * event type gets its OWN named, trackable interventions and its OWN
 * signal(s), never a generic slider shared across every event. */
function EventInterventionPanel({
  ei,
  values,
  onChangeValue,
}: {
  ei: QualityEventIntervention;
  values: LeverValues;
  onChangeValue: (leverId: string, value: number | string[]) => void;
}) {
  return (
    <div className="rounded-lg border border-[#E7E0D6] bg-[#FBF9F6] p-5 mb-4" data-testid={`panel-quality-interventions-${ei.id}`}>
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <h4 className="text-[13px] font-bold uppercase tracking-wide text-[#1A1A1A] font-abridge">{ei.label} interventions</h4>
        <span className="text-[11px] text-[#8C8C8C]" data-testid={`text-quality-signal-${ei.id}`}>
          Signal: {QUALITY_SIGNAL_PRIMARY[ei.id]}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
        {ei.interventions.map((iv) => (
          <InterventionRow
            key={iv.id}
            label={iv.label}
            checked={asBool(values[iv.id])}
            onToggle={() => onChangeValue(iv.id, asBool(values[iv.id]) ? 0 : 1)}
            testid={`checkbox-quality-${iv.id}`}
          />
        ))}
      </div>
      <CountOutput
        label={`${ei.label} prevention building`}
        value={fmtPct(ei.committedPct)}
        unit={`% of the ${ei.ceilingPct}pp ceiling`}
        testid={`text-quality-intervention-output-${ei.id}`}
      />
      <MathBox formula={ei.formula} testid={`text-quality-intervention-formula-${ei.id}`} />
      <p className="text-[11px] text-[#8C8C8C] mt-2">
        Secondary signal: {QUALITY_SIGNAL_SECONDARY[ei.id]}.
      </p>
    </div>
  );
}

/**
 * Build the case, QUALITY & SAFETY (nursing) - a bespoke ordered decision
 * chain, matching Access's/Revenue's/Workforce's chain bar rather than the
 * generic flat lever renderer. Quality is about PREVENTED HARM EVENTS: the
 * value is prevented events x cost per event, one term per targeted event
 * type (HAPI, CLABSI, CAUTI, Falls, Sepsis), summed. D1 shows patient-days
 * only, D2 shows every selected event type's own named interventions and
 * how much of that event's own prevention ceiling is committed to so far -
 * never a dollar. THE PAYOFF at the bottom is the one place a dollar first
 * appears, derived from every event's own committed interventions, never
 * invented.
 */
export default function QualityDecisionChain({ setting, baseline, values, onChangeValue, realizationPct }: QualityDecisionChainProps) {
  const presetLines = lineOptions("quality", setting);
  const selectedLines = asLines(values.qualityLines);
  const totalBeds = Math.max(0, Math.round(baseline.staffedBeds ?? 0));
  const requestedBeds = asNum(values.qualityBeds);
  const chosenEventLabels = asLines(values.qualityEventTypes);
  const chosenEventIds = selectedEventTypes(values);

  const chain = computeQualityChain(baseline, values);
  const { scope, eventInterventions, payoff, formulas } = chain;
  const realizedPayoffValue = realizedValue(payoff.totalValue, realizationPct);
  const payoffFormulaDisplay = payoff.totalValue > 0
    ? formulaWithRealization(formulas.payoff, realizationPct, realizedPayoffValue)
    : formulas.payoff;

  const toggleLine = (line: string) => {
    const next = selectedLines.includes(line) ? selectedLines.filter((l) => l !== line) : [...selectedLines, line];
    onChangeValue("qualityLines", next);
  };

  const toggleEventType = (id: QualityEventId) => {
    const label = QUALITY_EVENT_LABELS[id];
    const next = chosenEventLabels.includes(label) ? chosenEventLabels.filter((l) => l !== label) : [...chosenEventLabels, label];
    onChangeValue("qualityEventTypes", next);
  };

  return (
    <div data-testid="section-attain-quality-chain">
      <DecisionCard
        step="D1"
        title="Which units, how many beds, and which events you are targeting"
        help="Committing units, a real bed count, and the event type(s) this plan targets puts the plan on real patient-days. No dollar figure yet, there is no prevention rate decided."
        testid="card-quality-d1"
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
                  data-testid={`chip-quality-line-${line.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {line}
                </button>
              );
            })}
          </div>
        )}

        <div className="max-w-[240px] mb-5">
          <FieldLabel tip="How many staffed beds are covered by this plan, capped to your Starting-point baseline.">
            How many beds are in scope
          </FieldLabel>
          <NumberField
            value={requestedBeds}
            onValueChange={(v) => onChangeValue("qualityBeds", v)}
            min={0}
            max={totalBeds || undefined}
            decimal={false}
            className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white px-3 text-sm"
            placeholder={totalBeds > 0 ? `e.g., up to ${totalBeds}` : "e.g., 120"}
            data-testid="input-quality-beds"
          />
          <p className="text-[11px] text-[#8C8C8C] mt-1">
            Capped at your Starting-point count{totalBeds > 0 ? ` of ${totalBeds.toLocaleString()}` : ""}.
          </p>
        </div>

        <div className="mb-4">
          <FieldLabel tip="Pick one or more. Each event type is its own genuinely separate harm event, so they add rather than compete, and no dollar appears for a type until it is picked here.">
            Event types this plan targets
          </FieldLabel>
          <div className="flex flex-wrap gap-2">
            {QUALITY_EVENT_IDS.map((id) => {
              const active = chosenEventIds.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleEventType(id)}
                  className={`px-3 py-2 rounded-md text-sm border transition-all ${
                    active ? "border-[#EA2C00] bg-[#FFF6F3] text-[#EA2C00] font-medium" : "border-[#E5E5E5] bg-white text-[#3A3A3A] hover:border-[#D8CFC4]"
                  }`}
                  data-testid={`chip-quality-event-${id}`}
                >
                  {QUALITY_EVENT_LABELS[id]}
                </button>
              );
            })}
          </div>
          {chosenEventIds.length === 0 && (
            <p className="text-[14px] text-[#B4B4B4] italic mt-3" data-testid="text-quality-no-event-type">
              Pick at least one event type above to start building the case.
            </p>
          )}
        </div>

        <CountOutput label="Patient-days in scope" value={fmtInt(scope.patientDays)} unit="patient-days/yr" testid="text-quality-d1-output" />
        <MathBox formula={formulas.scope} testid="text-quality-d1-formula" />
      </DecisionCard>

      <DecisionCard
        step="D2"
        title="Commit to the interventions that actually prevent each event"
        help="Reducing a harm event is a bundle of specific, trackable clinical practices, not one generic slider. Each event type you picked above gets its own named interventions below, and each one you commit to adds toward that event's own prevention ceiling, never another event's. This is the program-level prevention a strong intervention program can defensibly reach; the Realization rate control above attributes the share of that outcome that belongs to this plan."
        testid="card-quality-d2"
      >
        {eventInterventions.length > 0 ? (
          eventInterventions.map((ei) => (
            <EventInterventionPanel key={ei.id} ei={ei} values={values} onChangeValue={onChangeValue} />
          ))
        ) : (
          <p className="text-[14px] text-[#B4B4B4] italic" data-testid="text-quality-d2-not-applicable">
            Pick at least one event type on D1 to see its own interventions here.
          </p>
        )}
      </DecisionCard>

      {/* This used to be a full-bleed dark hero card - the exact dollar the
          side panel's "Plan so far" already shows, stranded at the bottom
          of the page. It's now a quiet inline line, same card shell as
          D1-D2 above, so the panel stays the one place that total actually
          lives. */}
      <DecisionCard
        step="The payoff"
        title="Prevented events x cost per event"
        help="Every targeted event type's own prevented-events count, priced at its own cost per event, summed. Already counted in the running total in the panel to the right."
        testid="card-quality-payoff"
      >
        <p className="text-[15px] text-[#1A1A1A]" data-testid="text-quality-payoff-caption">
          <span className="font-abridge text-2xl text-[#EA2C00] font-bold" data-testid="text-quality-payoff-value">
            {fmtMoneyCompact(realizedPayoffValue)}
          </span>{" "}
          from {fmtInt(payoff.totalPrevented)} events prevented/yr across {payoff.events.length} targeted event type
          {payoff.events.length === 1 ? "" : "s"}.
        </p>

        {payoff.events.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {payoff.events.map((e) => (
              <div key={e.id} data-testid={`text-quality-payoff-event-${e.id}`}>
                <p className="text-[11px] text-[#8C8C8C] mb-1 leading-snug">{e.label}</p>
                <p className="text-lg font-bold font-abridge text-[#EA2C00]">{fmtMoneyCompact(realizedValue(e.value, realizationPct))}</p>
                <p className="text-[11px] text-[#8C8C8C] mt-0.5">{fmtInt(e.prevented)} prevented/yr</p>
              </div>
            ))}
          </div>
        )}

        <MathBox formula={payoffFormulaDisplay} testid="text-quality-payoff-formula" />
      </DecisionCard>
    </div>
  );
}
