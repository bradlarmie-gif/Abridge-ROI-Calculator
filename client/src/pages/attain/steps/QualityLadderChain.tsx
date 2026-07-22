import { motion } from "framer-motion";
import { HelpCircle, ArrowDown, Check } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NumberField } from "@/components/NumberField";
import { lineOptions, realizedValue, type LeverValues, type AttainBaseline } from "@/lib/attain/attainLevers";
import {
  computeQualityChain,
  deriveQualityLadder,
  selectedEventTypes,
  QUALITY_EVENT_IDS,
  QUALITY_EVENT_LABELS,
  QUALITY_RATE_UNIT,
  QUALITY_DEFAULT_RATE,
  QUALITY_DEFAULT_COST,
  qualityRateFor,
  qualityCostFor,
  qualityRateKey,
  qualityCostKey,
  QUALITY_SIGNAL_PRIMARY,
  QUALITY_SIGNAL_SECONDARY,
  type QualityEventId,
  type QualityEventIntervention,
  type QualityEventLadder,
} from "@/lib/attain/attainQuality";
import type { AttainSetting } from "@/lib/attain/attainTypes";
import { fmtInt, fmtMoneyCompact, fmtRevenueCount, QualityEventGate } from "./accessLadder";

function asLines(raw: number | string[] | undefined): string[] {
  return Array.isArray(raw) ? raw : [];
}
function asNum(raw: number | string[] | undefined): number {
  return typeof raw === "number" ? raw : 0;
}
function asBool(raw: number | string[] | undefined): boolean {
  return asNum(raw) === 1;
}
function fmtPct(n: number): string {
  return (Math.round(n * 10) / 10).toString();
}

interface QualityLadderChainProps {
  setting: AttainSetting;
  baseline: AttainBaseline;
  values: LeverValues;
  onChangeValue: (leverId: string, value: number | string[]) => void;
  realizationPct: number;
}

// ── Shared rung shells, matched to RevenueLadderChain's visual language ──

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

/** One named, checkable clinical intervention, a real binary commitment a
 * unit either has in place or does not. Checking it adds that intervention's
 * own fixed pp toward its event's own prevention ceiling. */
function InterventionRow({ label, checked, onToggle, testid }: { label: string; checked: boolean; onToggle: () => void; testid: string }) {
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

/** The quiet per-event prize line, the first and only place that event's
 * dollar appears. The running total lives in the side panel. */
function PrizeLine({ value, caption, formula, testid }: { value: number; caption: string; formula: string; testid: string }) {
  return (
    <div className="rounded-xl border border-[#E7E0D6] bg-[#F8F5F1] p-5" data-testid={testid}>
      <p className="text-[11px] font-bold uppercase tracking-[2px] text-[#EA2C00] mb-1.5">The prize</p>
      {value > 0 ? (
        <p className="text-[15px] text-[#1A1A1A]">
          <span className="font-abridge text-2xl text-[#EA2C00] font-bold" data-testid={`${testid}-value`}>{fmtMoneyCompact(value)}</span>{" "}
          / yr, from {caption}. Already counted in your plan on the right.
        </p>
      ) : (
        <p className="text-[13.5px] text-[#8C8C8C]" data-testid={`${testid}-empty`}>Commit the bundle above and the prize appears here and in your plan on the right.</p>
      )}
      <MathBox formula={formula} testid={`${testid}-formula`} />
    </div>
  );
}

/**
 * Build the case, QUALITY & SAFETY (nursing), rebuilt as the converging
 * multi-event ladder Planning reads back on the hook (see accessLadder.tsx's
 * `QualityEventGate` and attainQuality.ts's `deriveQualityLadder`, the one
 * source of the order, the shared first domino, each event's diagnosis gate,
 * and the numbers). Quality has the same SHAPE as revenue: one shared lever
 * (earlier, more complete risk documentation at the point of care) feeding
 * several parallel per-event payoffs that converge into one prevented-harm
 * prize.
 *
 * The partner picks which harm events they are working to prevent, then each
 * chosen event runs the same four-beat conversation: GROUND the reality (the
 * rate and cost), DIAGNOSE the honestly small preventable share (the
 * load-bearing rung, Abridge surfaces the risk, the unit prevents), name WHO
 * ACTS and the bundle they commit to, and the number falls out. A dollar
 * never appears before that event's own bundle is committed, and the chosen
 * events simply sum, because a prevented fall, a prevented HAPI, and a
 * prevented CLABSI are distinct harm pools, never the same dollar.
 */
export default function QualityLadderChain({ setting, baseline, values, onChangeValue, realizationPct }: QualityLadderChainProps) {
  const presetLines = lineOptions("quality", setting);
  const selectedLines = asLines(values.qualityLines);
  const totalBeds = Math.max(0, Math.round(baseline.staffedBeds ?? 0));
  const requestedBeds = asNum(values.qualityBeds);
  const chosenEventLabels = asLines(values.qualityEventTypes);
  const chosen = selectedEventTypes(values);

  const chain = computeQualityChain(baseline, values);
  const ladder = deriveQualityLadder(baseline, values, realizationPct);
  const converged = ladder.convergedPrize;
  const eiById = new Map(chain.eventInterventions.map((ei) => [ei.id, ei]));
  const leById = new Map(ladder.events.map((le) => [le.id, le]));

  const toggleLine = (line: string) => {
    const next = selectedLines.includes(line) ? selectedLines.filter((l) => l !== line) : [...selectedLines, line];
    onChangeValue("qualityLines", next);
  };
  const toggleEvent = (id: QualityEventId) => {
    const label = QUALITY_EVENT_LABELS[id];
    const next = chosenEventLabels.includes(label) ? chosenEventLabels.filter((l) => l !== label) : [...chosenEventLabels, label];
    onChangeValue("qualityEventTypes", next);
  };

  return (
    <div data-testid="section-attain-quality-ladder">
      {/* THE FIRST DOMINO, shared by every event where they converge: the one
          Abridge lever. Same anchor treatment the other ladders open on. */}
      <LadderRung
        anchor
        eyebrow="The first domino"
        title="Earlier, more complete risk documentation at the point of care"
        help="This is the one thing Abridge moves, and it is where every harm event below converges. When the risk signal is captured earlier and more completely, the unit can act on the bundle before the event happens. Abridge surfaces the risk; the unit prevents. Nothing below happens without it."
        testid="card-quality-domino"
      />

      <Connector />

      {/* GROUND the shared scope: the unit and its size, which set the
          patient-days every event's rate is measured against. */}
      <LadderRung
        eyebrow="Ground it"
        title="Your unit, and how big it is"
        help="Commit the units and a real bed count. That puts the plan on real patient-days, the volume every event's rate is measured against. No dollar yet, and no prevention decided."
        testid="card-quality-scope"
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
        <div className="max-w-[240px] mb-4">
          <FieldLabel tip="How many staffed beds are covered by this plan, capped to your Starting-point baseline.">
            Beds in scope
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
        <CountOutput label="Patient-days in scope" value={fmtInt(chain.scope.patientDays)} unit="patient-days / yr" testid="text-quality-scope-output" />
        <MathBox formula={chain.formulas.scope} testid="text-quality-scope-formula" />
      </LadderRung>

      <Connector />

      <LadderRung
        eyebrow="Choose your events"
        title="Which harm events are you working to prevent?"
        help="Pick one or more. Each is a genuinely distinct harm pool: a prevented fall, a prevented pressure injury, and a prevented line infection are never the same dollar, so they add rather than compete. Only the events you pick open their own questions below."
        testid="card-quality-event-chooser"
      >
        <div className="flex flex-wrap gap-2">
          {QUALITY_EVENT_IDS.map((id) => {
            const active = chosen.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleEvent(id)}
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
        {chosen.length === 0 && (
          <p className="text-[14px] text-[#B4B4B4] italic mt-4" data-testid="text-quality-no-event">
            Pick at least one harm event above to start building the case.
          </p>
        )}
      </LadderRung>

      {chosen.map((id) => {
        const ei = eiById.get(id);
        const le = leById.get(id);
        if (!ei || !le) return null;
        return (
          <div key={id}>
            <Connector />
            <EventPath ei={ei} le={le} values={values} onChangeValue={onChangeValue} realizationPct={realizationPct} />
          </div>
        );
      })}

      {chosen.length > 1 && (
        <>
          <Connector />
          <div className="rounded-xl bg-[#1A1A1A] p-6" data-testid="card-quality-converged">
            <p className="text-[10px] font-bold uppercase tracking-[2px] text-white/40 mb-1">Where the events converge</p>
            {converged > 0 ? (
              <p className="font-abridge text-3xl md:text-4xl text-[#EA2C00] font-bold" data-testid="text-quality-converged-value">
                {fmtMoneyCompact(converged)} <span className="text-sm font-normal text-white/50">cost of harm avoided / yr</span>
              </p>
            ) : (
              <p className="text-sm text-white/60" data-testid="text-quality-converged-empty">Commit a bundle above and the converged prize appears here.</p>
            )}
            <p className="text-[11px] text-white/50 mt-2 leading-relaxed">
              {chosen.length} events, each its own harm pool, summed once and never double-counted. The dollar is cost of harm avoided; part of the value is the safety itself, which does not price.
              {realizationPct < 100 ? ` Attributed at ${Math.round(realizationPct)}% to this plan.` : ""}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// One harm event's four-beat sub-ladder.
// ────────────────────────────────────────────────────────────────────────

function EventPath({
  ei,
  le,
  values,
  onChangeValue,
  realizationPct,
}: {
  ei: QualityEventIntervention;
  le: QualityEventLadder;
  values: LeverValues;
  onChangeValue: (leverId: string, value: number | string[]) => void;
  realizationPct: number;
}) {
  const id = ei.id;
  const rateUnit = QUALITY_RATE_UNIT[id];
  const costNoun = id === "sepsis" ? "case" : "event";
  const rate = qualityRateFor(id, values);
  const cost = qualityCostFor(id, values);
  const rawValue = le.value > 0 ? le.value / (realizationPct > 0 ? realizationPct / 100 : 1) : 0;

  return (
    <div data-testid={`section-quality-event-${id}`}>
      <p className="text-[13px] font-bold uppercase tracking-[1.5px] text-[#EA2C00] mb-3 mt-2">{le.label}</p>

      {/* BEAT 1 — ground the reality */}
      <LadderRung
        eyebrow="Ground it"
        title="Your event rate, and what one event costs"
        help={`Set your own ${le.label} rate per 1,000 ${rateUnit}, and the cost of one event. Both are your figures, not a benchmark. That sizes the events a year this plan is measured against, before any prevention.`}
        testid={`card-quality-${id}-ground`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <FieldLabel tip={`Your own ${le.label} rate, events per 1,000 ${rateUnit}.`}>Rate per 1,000 {rateUnit}</FieldLabel>
            <NumberField
              value={rate}
              onValueChange={(v) => onChangeValue(qualityRateKey(id), v)}
              min={0}
              decimal={true}
              className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white px-3 text-sm"
              placeholder={`e.g., ${QUALITY_DEFAULT_RATE[id]}`}
              data-testid={`input-quality-${id}-rate`}
            />
          </div>
          <div>
            <FieldLabel tip={`The fully loaded cost of one ${le.label} ${costNoun}, your own figure.`}>Cost per {costNoun}</FieldLabel>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-sm pointer-events-none">$</span>
              <NumberField
                value={cost}
                onValueChange={(v) => onChangeValue(qualityCostKey(id), v)}
                min={0}
                decimal={false}
                className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white pl-7 pr-3 text-sm"
                placeholder={`e.g., ${QUALITY_DEFAULT_COST[id].toLocaleString()}`}
                data-testid={`input-quality-${id}-cost`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-xs pointer-events-none">/{costNoun}</span>
            </div>
          </div>
        </div>
        <CountOutput label="Events a year at your rate" value={fmtRevenueCount(le.groundEvents)} unit="events / yr" testid={`text-quality-${id}-ground-output`} />
        <p className="text-[11px] text-[#8C8C8C] mt-2">{le.groundDetail}</p>
      </LadderRung>

      <Connector />

      {/* BEAT 2 + 3 — diagnose the honesty ceiling, then commit the bundle
          (who acts). The gate reads ceiling vs. what the committed bundle
          actually prevents. */}
      <LadderRung
        eyebrow="The gate · diagnose the leak, then commit the bundle"
        title="What share is really preventable, and the bundle that earns it"
        help="Most harm events occur despite best practice. Only a defensible share is preventable through earlier risk surfacing plus bundle compliance, and that share is the ceiling. Each intervention you commit to below adds toward this event's own ceiling, never another event's. These committed interventions are what earn the prevented events."
        testid={`card-quality-${id}-gate`}
      >
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <p className="text-[12px] font-bold uppercase tracking-wide text-[#1A1A1A] font-abridge">The {le.label} bundle</p>
          <span className="text-[11px] text-[#8C8C8C]" data-testid={`text-quality-signal-${id}`}>Signal: {QUALITY_SIGNAL_PRIMARY[id]}</span>
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
          label={`${le.label} prevention committed`}
          value={fmtPct(ei.committedPct)}
          unit={`% of the ${ei.ceilingPct}pp ceiling`}
          testid={`text-quality-${id}-committed-output`}
        />
        <div className="mt-3" />
        <QualityEventGate
          showHeader={false}
          ceilingLabel={le.ceilingLabel}
          ceilingCount={le.ceilingCount}
          ceilingUnit={le.ceilingUnit}
          capturedLabel={le.capturedLabel}
          capturedCount={le.capturedCount}
          whoActs={le.whoActs}
          capturedUnit={le.capturedUnit}
          bothSet={le.ceilingCount > 0 && le.capturedCount > 0}
          emptyHint={
            le.ceilingCount <= 0
              ? "Set your beds in scope and this event's rate above to size the preventable pool, then commit the bundle."
              : "Commit the bundle above to prevent a defensible share of the pool."
          }
        />
        <MathBox formula={ei.formula} testid={`text-quality-${id}-gate-formula`} />
        <p className="text-[11px] text-[#8C8C8C] mt-2">Secondary signal: {QUALITY_SIGNAL_SECONDARY[id]}.</p>
      </LadderRung>

      <Connector />

      {/* BEAT 4 — the number */}
      <PrizeLine
        value={le.value}
        caption={`${fmtRevenueCount(le.capturedCount)} ${le.label} prevented x $${fmtInt(cost)} / ${costNoun}`}
        formula={le.formula}
        testid={`text-quality-${id}-prize`}
      />
      {le.value > 0 && rawValue > le.value && (
        <p className="text-[11px] text-[#8C8C8C] mt-2" data-testid={`text-quality-${id}-attribution`}>
          Program-level prevention prices to ~{fmtMoneyCompact(Math.round(rawValue))} / yr; this plan is credited {Math.round(realizationPct)}% of that on the right.
        </p>
      )}
    </div>
  );
}
