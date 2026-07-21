import { motion } from "framer-motion";
import { HelpCircle } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NumberField } from "@/components/NumberField";
import { lineOptions, type LeverValues } from "@/lib/attain/attainLevers";
import type { AttainBaseline } from "@/lib/attain/attainLevers";
import {
  computeQualityChain,
  selectedEventTypes,
  QUALITY_EVENT_IDS,
  QUALITY_EVENT_LABELS,
  QUALITY_REALTIME_BASELINE_PCT,
  QUALITY_PREVENTION_CEILING_PCT,
  RESPONSE_LEVEL_LABELS,
  type QualityEventId,
} from "@/lib/attain/attainQuality";
import type { AttainSetting } from "@/lib/attain/attainTypes";

function asLines(raw: number | string[] | undefined): string[] {
  return Array.isArray(raw) ? raw : [];
}
function asNum(raw: number | string[] | undefined): number {
  return typeof raw === "number" ? raw : 0;
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
      className="rounded-xl border border-[#E7E0D6] bg-white p-6 mb-5"
      data-testid={testid}
    >
      <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#EA2C00] mb-1.5">{step}</p>
      <h3 className="text-base font-bold text-[#1A1A1A] mb-1.5 font-abridge">{title}</h3>
      <p className="text-xs text-[#8C8C8C] leading-relaxed mb-4 max-w-[560px]">{help}</p>
      {children}
    </motion.div>
  );
}

function CountOutput({ label, value, unit, testid }: { label: string; value: string; unit: string; testid: string }) {
  return (
    <div className="bg-[#F8F5F1] rounded-lg px-4 py-3 flex items-baseline justify-between gap-3" data-testid={testid}>
      <span className="text-xs text-[#8C8C8C]">{label}</span>
      <span className="text-lg font-bold text-[#1A1A1A] font-abridge">
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
    <label className="text-xs font-medium text-[#3A3A3A] mb-1.5 flex items-center gap-1.5">
      {children}
      {tip && testid && <InfoTip text={tip} testid={testid} />}
    </label>
  );
}

function MathBox({ formula, testid }: { formula: string; testid: string }) {
  return (
    <div className="mt-3 bg-[#F8F5F1] border-l-[3px] border-[#EA2C00] rounded-r-md p-3">
      <p className="text-[9px] font-bold uppercase tracking-wide text-[#EA2C00] mb-1">The math</p>
      <p className="text-[11px] text-[#3A3A3A] leading-relaxed" data-testid={testid}>
        {formula}
      </p>
    </div>
  );
}

function LevelToggle({
  labels,
  level,
  onChange,
  testidPrefix,
}: {
  labels: string[];
  level: number;
  onChange: (level: number) => void;
  testidPrefix: string;
}) {
  return (
    <div className="flex rounded-md border border-[#E5E5E5] overflow-hidden w-fit">
      {labels.map((label, i) => (
        <button
          key={label}
          type="button"
          onClick={() => onChange(i)}
          className={`px-4 h-10 text-xs font-medium transition-colors ${
            level === i ? "bg-[#1A1A1A] text-white" : "bg-white text-[#8C8C8C] hover:bg-[#F5F0EB]"
          }`}
          data-testid={`${testidPrefix}-${i}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/**
 * Build the case, QUALITY & SAFETY (nursing) - a bespoke ordered decision
 * chain, matching Access's/Revenue's/Workforce's chain bar rather than the
 * generic flat lever renderer. Quality is about PREVENTED HARM EVENTS: the
 * value is prevented events x cost per event, one term per targeted event
 * type (HAPI, CLABSI, Falls, Sepsis), summed. D1-D4 below show patient-days,
 * pp of the prevention ceiling, or a realization %, never a dollar; THE
 * PAYOFF at the bottom is the one place a dollar first appears, derived from
 * all four decisions above and broken out per event type, never invented.
 */
export default function QualityDecisionChain({ setting, baseline, values, onChangeValue }: QualityDecisionChainProps) {
  const presetLines = lineOptions("quality", setting);
  const selectedLines = asLines(values.qualityLines);
  const totalBeds = Math.max(0, Math.round(baseline.staffedBeds ?? 0));
  const requestedBeds = asNum(values.qualityBeds);
  const chosenEventLabels = asLines(values.qualityEventTypes);
  const chosenEventIds = selectedEventTypes(values);

  const chain = computeQualityChain(baseline, values);
  const { scope, realTime, response, bundle, payoff, formulas } = chain;

  const toggleLine = (line: string) => {
    const next = selectedLines.includes(line) ? selectedLines.filter((l) => l !== line) : [...selectedLines, line];
    onChangeValue("qualityLines", next);
  };

  const toggleEventType = (id: QualityEventId) => {
    const label = QUALITY_EVENT_LABELS[id];
    const next = chosenEventLabels.includes(label) ? chosenEventLabels.filter((l) => l !== label) : [...chosenEventLabels, label];
    onChangeValue("qualityEventTypes", next);
  };

  const sepsisSelected = chosenEventIds.includes("sepsis");
  const bundleEventsSelected = chosenEventIds.some((id) => id !== "sepsis");

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
          <p className="text-[10px] text-[#8C8C8C] mt-1">
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
            <p className="text-xs text-[#B4B4B4] italic mt-3" data-testid="text-quality-no-event-type">
              Pick at least one event type above to start building the case.
            </p>
          )}
        </div>

        <CountOutput label="Patient-days in scope" value={fmtInt(scope.patientDays)} unit="patient-days/yr" testid="text-quality-d1-output" />
        <MathBox formula={formulas.scope} testid="text-quality-d1-formula" />
      </DecisionCard>

      <DecisionCard
        step="D2"
        title="Close real-time gaps during the shift"
        help="The core lever. A missed bundle step closed while there is still time to act prevents an event before it happens. This is the share of gaps closed in real time, above your reality today, and it drives HAPI/CLABSI/Falls's prevention rate."
        testid="card-quality-d2"
      >
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#8C8C8C] flex items-center gap-1.5">
              Share of bundle gaps closed in real time, during the shift
              <InfoTip
                text={`Reality today: ${QUALITY_REALTIME_BASELINE_PCT}%. Only the movement above that baseline is a new decision, and it is what this plan is credited for.`}
                testid="tooltip-quality-realtime"
              />
            </span>
            <span className="text-sm font-semibold text-[#1A1A1A]" data-testid="text-quality-realtime-value">
              {fmtPct(realTime.requestedPct)}%
            </span>
          </div>
          <Slider
            value={[realTime.requestedPct]}
            onValueChange={(v) => onChangeValue("qualityRealTime", v[0])}
            min={0}
            max={100}
            step={5}
            accent="coral"
            className="w-full"
            data-testid="slider-quality-realtime"
          />
          <p className="text-[10px] text-[#8C8C8C] mt-1">Reality today: {QUALITY_REALTIME_BASELINE_PCT}%.</p>
        </div>

        <CountOutput
          label="Prevention building, HAPI/CLABSI/Falls"
          value={fmtPct(realTime.impactPp)}
          unit={`pp of the ${QUALITY_PREVENTION_CEILING_PCT}pp ceiling`}
          testid="text-quality-d2-output"
        />
        <MathBox formula={formulas.realTime} testid="text-quality-d2-formula" />
      </DecisionCard>

      <DecisionCard
        step="D3"
        title="Tie deterioration signals to a response"
        help="Especially Sepsis and other early-warning signals: a deterioration flag with no named responder is just a note. This sets how reliably a signal turns into an actual bedside intervention, and it raises Sepsis's own prevention effect specifically."
        testid="card-quality-d3"
      >
        <LevelToggle
          labels={RESPONSE_LEVEL_LABELS}
          level={response.level}
          onChange={(level) => onChangeValue("qualityResponse", level)}
          testidPrefix="button-quality-response"
        />

        <div className="mt-4">
          {sepsisSelected ? (
            <>
              <CountOutput label="Sepsis realization" value={fmtPct(response.realizationPct)} unit="% of the addressable gap" testid="text-quality-d3-output" />
              <MathBox formula={formulas.response} testid="text-quality-d3-formula" />
            </>
          ) : (
            <p className="text-xs text-[#B4B4B4] italic" data-testid="text-quality-d3-not-applicable">
              Add Sepsis to the event types on D1 to put this decision to work.
            </p>
          )}
        </div>
      </DecisionCard>

      <DecisionCard
        step="D4"
        title="Lift bundle compliance"
        help="An audited compliance target, above today's rate. Bundle compliance is a separate mechanism from real-time closure (D2): a step can be closed live and still miss the bundle checklist, so this adds to D2's contribution rather than replacing it."
        testid="card-quality-d4"
      >
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#8C8C8C]">Audited bundle compliance target</span>
            <span className="text-sm font-semibold text-[#1A1A1A]" data-testid="text-quality-bundle-value">
              {fmtPct(bundle.compliancePct)}%
            </span>
          </div>
          <Slider
            value={[bundle.compliancePct]}
            onValueChange={(v) => onChangeValue("qualityBundle", v[0])}
            min={0}
            max={100}
            step={5}
            accent="coral"
            className="w-full"
            data-testid="slider-quality-bundle"
          />
        </div>

        {bundleEventsSelected ? (
          <>
            <CountOutput
              label="Composite prevention rate, HAPI/CLABSI/Falls"
              value={fmtPct(bundle.compositePreventionPct)}
              unit={`% of the ${QUALITY_PREVENTION_CEILING_PCT}pp ceiling`}
              testid="text-quality-d4-output"
            />
            <MathBox formula={formulas.bundle} testid="text-quality-d4-formula" />
          </>
        ) : (
          <p className="text-xs text-[#B4B4B4] italic" data-testid="text-quality-d4-not-applicable">
            Add HAPI, CLABSI, or Falls to the event types on D1 to put this decision to work.
          </p>
        )}
      </DecisionCard>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl bg-[#1A1A1A] p-6"
        data-testid="card-quality-payoff"
      >
        <p className="text-[10px] font-bold uppercase tracking-[2px] text-white/50 mb-1.5">The payoff</p>
        <h3 className="text-base font-bold text-white mb-1.5 font-abridge">Prevented events x cost per event</h3>
        <p className="text-xs text-white/50 leading-relaxed mb-4 max-w-[560px]">
          Every targeted event type's own prevented-events count, priced at its own cost per event, summed. This is
          the first dollar figure in this chain, derived from the four decisions above, never invented.
        </p>
        <p className="font-abridge text-4xl text-[#EA2C00]" data-testid="text-quality-payoff-value">
          {fmtMoneyCompact(payoff.totalValue)}
        </p>
        <p className="text-xs text-white/60 mt-2" data-testid="text-quality-payoff-caption">
          {fmtInt(payoff.totalPrevented)} events prevented/yr across {payoff.events.length} targeted event type
          {payoff.events.length === 1 ? "" : "s"}.
        </p>

        {payoff.events.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {payoff.events.map((e) => (
              <div key={e.id} data-testid={`text-quality-payoff-event-${e.id}`}>
                <p className="text-[10px] text-white/50 mb-1 leading-snug">{e.label}</p>
                <p className="text-lg font-bold font-abridge text-[#EA2C00]">{fmtMoneyCompact(e.value)}</p>
                <p className="text-[10px] text-white/50 mt-0.5">{fmtInt(e.prevented)} prevented/yr</p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 bg-white/5 border-l-[3px] border-[#EA2C00] rounded-r-md p-3">
          <p className="text-[9px] font-bold uppercase tracking-wide text-[#EA2C00] mb-1">The math</p>
          <p className="text-[11px] text-white/70 leading-relaxed" data-testid="text-quality-payoff-formula">
            {formulas.payoff}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
