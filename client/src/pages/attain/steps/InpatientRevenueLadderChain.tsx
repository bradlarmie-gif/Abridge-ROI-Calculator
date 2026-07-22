import { motion } from "framer-motion";
import { HelpCircle, ArrowDown } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NumberField } from "@/components/NumberField";
import { realizedValue, formulaWithRealization, type LeverValues, type AttainBaseline } from "@/lib/attain/attainLevers";
import {
  computeIpDrgChain,
  computeIpCdiChain,
  computeIpObsChain,
  ipDrgCountFormula,
  ipDrgPayoffFormula,
  ipCdiCountFormula,
  ipCdiPayoffFormula,
  ipObsCountFormula,
  ipObsPayoffFormula,
  selectedIpRevenuePaths,
  deriveIpRevenueLadder,
  IP_REVENUE_PATH_LABELS,
  IP_REVENUE_PATH_IDS,
  IP_REVENUE_PATH_WHO_ACTS,
  DEFAULT_IP_DRG_AT_RISK_RATE,
  DEFAULT_IP_DRG_WEIGHT_INCREASE,
  DEFAULT_IP_DRG_BASE_PAYMENT,
  DEFAULT_IP_CDI_QUERY_RATE,
  DEFAULT_IP_CDI_COST_PER_QUERY,
  MAX_IP_CDI_COST_PER_QUERY,
  DEFAULT_IP_OBS_DENIAL_RATE,
  DEFAULT_IP_OBS_REVENUE_DELTA,
  type IpRevenuePathId,
} from "@/lib/attain/attainInpatientRevenue";
import { fmtInt, fmtMoneyCompact, fmtRevenueCount, RevenuePathGate } from "./accessLadder";

function asLines(raw: number | string[] | undefined): string[] {
  return Array.isArray(raw) ? raw : [];
}
function asNum(raw: number | string[] | undefined): number {
  return typeof raw === "number" ? raw : 0;
}

interface InpatientRevenueLadderChainProps {
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

/** A plain, non-alarming honesty note, coral-bordered like every other
 * teaching callout here (no green/amber). */
function Note({ children, testid }: { children: React.ReactNode; testid: string }) {
  return (
    <p
      className="text-[12px] text-[#3A3A3A] bg-[#F8F5F1] border-l-[3px] border-[#EA2C00] rounded-r-md px-3 py-2 mt-3 leading-relaxed"
      data-testid={testid}
    >
      {children}
    </p>
  );
}

/** The quiet per-path prize line, the first and only place that path's dollar
 * appears. The running total lives in the side panel. */
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
        <p className="text-[13.5px] text-[#8C8C8C]" data-testid={`${testid}-empty`}>Commit to a share of the leak above and the prize appears here and in your plan on the right.</p>
      )}
      <MathBox formula={formula} testid={`${testid}-formula`} />
    </div>
  );
}

/**
 * Build the case, INPATIENT REVENUE, rebuilt as the converging multi-path
 * ladder Planning reads back on the hook (see accessLadder.tsx's
 * `RevenuePathGate` and attainInpatientRevenue.ts's `deriveIpRevenueLadder`,
 * the one source of the order, the shared first domino, each path's diagnosis
 * gate, and the numbers). Inpatient revenue has the SAME converging shape as
 * outpatient/ED revenue: one lever (complete, specific documentation at the
 * point of care) feeding several parallel payoffs that converge into one
 * captured-revenue prize. What differs are the MECHANISMS: DRG-weight capture,
 * CDI query efficiency (labor, not reimbursement), and observation-status
 * defense.
 *
 * The partner picks which revenue they are chasing, then each chosen path runs
 * the same four-beat conversation: GROUND the reality, DIAGNOSE the
 * documentation-caused leak Abridge can actually move (the load-bearing rung),
 * name WHO ACTS, and the number falls out. A dollar never appears before that
 * path's own gate is real, and the chosen paths simply sum, because a captured
 * DRG weight, CDI staff time saved, and a defended inpatient status are never
 * the same dollar.
 */
export default function InpatientRevenueLadderChain({ baseline, values, onChangeValue, realizationPct }: InpatientRevenueLadderChainProps) {
  const chosen = selectedIpRevenuePaths(values);
  const rawPaths = asLines(values.ipRevenuePaths);
  const ladder = deriveIpRevenueLadder(baseline, values, realizationPct);
  const converged = ladder.convergedPrize;

  const togglePath = (id: IpRevenuePathId) => {
    const label = IP_REVENUE_PATH_LABELS[id];
    const next = rawPaths.includes(label) ? rawPaths.filter((l) => l !== label) : [...rawPaths, label];
    onChangeValue("ipRevenuePaths", next);
  };

  return (
    <div data-testid="section-attain-ip-revenue-ladder">
      {/* THE FIRST DOMINO, shared by every path where they converge: the one
          Abridge lever. Same anchor treatment access/retention open on. */}
      <LadderRung
        anchor
        eyebrow="The first domino"
        title="Complete, specific documentation at the point of care"
        help="This is the one thing Abridge moves, and it is where every inpatient revenue path below converges. When the note carries the full severity of the admission, coding can assign the DRG the case earned, the CDI team has fewer gaps to chase, and utilization review can defend the right status. Nothing below happens without it, and everything below is built on top of it."
        testid="card-ip-revenue-domino"
      />

      <Connector />

      <LadderRung
        eyebrow="Choose your paths"
        title="What inpatient revenue are you trying to capture?"
        help="Pick one or more. Each is a genuinely different claim: a captured DRG weight, CDI staff time no longer spent, and a defended inpatient status are never the same dollar, so they add rather than compete. Only the paths you pick open their own questions below."
        testid="card-ip-revenue-path-chooser"
      >
        <div className="flex flex-wrap gap-2">
          {IP_REVENUE_PATH_IDS.map((id) => {
            const active = chosen.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => togglePath(id)}
                className={`px-3 py-2 rounded-md text-sm border transition-all ${
                  active ? "border-[#EA2C00] bg-[#FFF6F3] text-[#EA2C00] font-medium" : "border-[#E5E5E5] bg-white text-[#3A3A3A] hover:border-[#D8CFC4]"
                }`}
                data-testid={`chip-ip-revenue-path-${id}`}
              >
                {IP_REVENUE_PATH_LABELS[id]}
              </button>
            );
          })}
        </div>
        {chosen.length === 0 && (
          <p className="text-[14px] text-[#B4B4B4] italic mt-4" data-testid="text-ip-revenue-no-path">
            Pick at least one path above to start building the case.
          </p>
        )}
      </LadderRung>

      {chosen.includes("drg") && (
        <>
          <Connector />
          <DrgPath baseline={baseline} values={values} onChangeValue={onChangeValue} realizationPct={realizationPct} />
        </>
      )}

      {chosen.includes("cdi") && (
        <>
          <Connector />
          <CdiPath baseline={baseline} values={values} onChangeValue={onChangeValue} realizationPct={realizationPct} drgAlsoSelected={chosen.includes("drg")} />
        </>
      )}

      {chosen.includes("obs") && (
        <>
          <Connector />
          <ObsPath baseline={baseline} values={values} onChangeValue={onChangeValue} realizationPct={realizationPct} drgAlsoSelected={chosen.includes("drg")} />
        </>
      )}

      {chosen.length > 1 && (
        <>
          <Connector />
          <div className="rounded-xl bg-[#1A1A1A] p-6" data-testid="card-ip-revenue-converged">
            <p className="text-[10px] font-bold uppercase tracking-[2px] text-white/40 mb-1">Where the paths converge</p>
            {converged > 0 ? (
              <p className="font-abridge text-3xl md:text-4xl text-[#EA2C00] font-bold" data-testid="text-ip-revenue-converged-value">
                {fmtMoneyCompact(converged)} <span className="text-sm font-normal text-white/50">captured / yr</span>
              </p>
            ) : (
              <p className="text-sm text-white/60" data-testid="text-ip-revenue-converged-empty">Finish a path above and the converged prize appears here.</p>
            )}
            <p className="text-[11px] text-white/50 mt-2 leading-relaxed">
              {chosen.length} paths: DRG reimbursement, CDI labor, and status margin are three distinct dollars, summed once and never double-counted.
              {realizationPct < 100 ? ` Attributed at ${Math.round(realizationPct)}% to this plan.` : ""}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// PATH — Case Mix / DRG Accuracy (CC/MCC capture)
// ────────────────────────────────────────────────────────────────────────

function DrgPath({
  baseline,
  values,
  onChangeValue,
  realizationPct,
}: {
  baseline: AttainBaseline;
  values: LeverValues;
  onChangeValue: (leverId: string, value: number | string[]) => void;
  realizationPct: number;
}) {
  const chain = computeIpDrgChain(baseline, values);
  const realized = Math.round(realizedValue(chain.value, realizationPct));
  const prizeFormula = realized > 0 ? formulaWithRealization(ipDrgPayoffFormula(chain), realizationPct, realized) : ipDrgPayoffFormula(chain);

  return (
    <div data-testid="section-ip-revenue-path-drg">
      <p className="text-[13px] font-bold uppercase tracking-[1.5px] text-[#EA2C00] mb-3 mt-2">{IP_REVENUE_PATH_LABELS.drg}</p>

      {/* BEAT 1 — ground the reality */}
      <LadderRung
        eyebrow="Ground it"
        title="Your admissions, and how many are at risk of a lower DRG weight"
        help="Your admissions come from your starting point. A comorbidity or complication that is being managed but under-specified in the note risks grouping the admission at a lower DRG weight than it earned. That at-risk rate scopes the pool this path is measured against, before any dollar."
        testid="card-ip-revenue-drg-ground"
      >
        <div className="max-w-[240px] mb-4">
          <FieldLabel tip="Share of eligible admissions with documentation gaps large enough to risk a lower-weight DRG today. Your own number, not a benchmark you never checked.">
            At-risk DRG rate, today
          </FieldLabel>
          <div className="relative">
            <NumberField
              value={asNum(values.ipDrgAtRiskRate) > 0 ? asNum(values.ipDrgAtRiskRate) : DEFAULT_IP_DRG_AT_RISK_RATE}
              onValueChange={(v) => onChangeValue("ipDrgAtRiskRate", v)}
              min={0}
              max={60}
              decimal={false}
              className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white px-3 pr-9 text-sm"
              data-testid="input-ip-revenue-drg-at-risk-rate"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-sm pointer-events-none">%</span>
          </div>
        </div>
        <CountOutput label="Eligible admissions in scope" value={fmtInt(chain.eligibleEncounters)} unit="admissions / yr" testid="text-ip-revenue-drg-ground-output" />
      </LadderRung>

      <Connector />

      {/* BEAT 2 — diagnose the leak (the gate) + BEAT 3 who acts */}
      <LadderRung
        eyebrow="The gate · diagnose the leak"
        title="How many at-risk admissions have a CC or MCC that is present but not documented specifically enough"
        help="Of your admissions, how many carry a comorbidity or complication that is clinically present but not documented specifically enough to capture the right DRG weight? That documentation-caused share is the ceiling Abridge can move. It is never admissions without the condition. Then commit to the share of that at-risk pool you will actually capture."
        testid="card-ip-revenue-drg-gate"
      >
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#8C8C8C] flex items-center gap-1.5">
              Share of the at-risk pool you commit to capture
              <InfoTip
                text="A share of the at-risk admissions above, shown as a plain percentage, the same unit as the other two paths. It is not a percentage-point move on your hospital-wide CC/MCC capture rate. This is the gate: zero here captures nothing, no matter how large the pool."
                testid="tooltip-ip-revenue-drg-capture"
              />
            </span>
            <span className="text-sm font-semibold text-[#1A1A1A]" data-testid="text-ip-revenue-drg-capture-value">
              {fmtInt(asNum(values.ipDrgCapture))}%
            </span>
          </div>
          <Slider
            value={[asNum(values.ipDrgCapture)]}
            onValueChange={(v) => onChangeValue("ipDrgCapture", v[0])}
            min={0}
            max={100}
            step={5}
            accent="coral"
            className="w-full"
            data-testid="slider-ip-revenue-drg-capture"
          />
        </div>

        <RevenuePathGate
          showHeader={false}
          ceilingLabel="At-risk admissions, the documentation leak"
          ceilingCount={chain.atRisk}
          ceilingUnit="admissions / yr"
          capturedLabel="Cases captured at the DRG weight they earned"
          capturedCount={chain.capturedCases}
          capturedUnit="cases / yr"
          whoActs={IP_REVENUE_PATH_WHO_ACTS.drg}
          bothSet={chain.atRisk > 0 && chain.capturePct > 0}
          emptyHint={
            chain.atRisk <= 0
              ? "Set your at-risk DRG rate above to size the pool, then commit to a share of it."
              : "Commit to a share of the at-risk pool to see how many cases get captured. The weight only lands if the query closes before discharge, which is why CDI and coding own it."
          }
        />
        <MathBox formula={ipDrgCountFormula(chain)} testid="text-ip-revenue-drg-gate-formula" />
      </LadderRung>

      <Connector />

      {/* BEAT 4 — the number */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div>
          <FieldLabel tip="The average DRG weight difference a captured comorbidity or complication actually adds.">Average DRG weight increase</FieldLabel>
          <NumberField
            value={asNum(values.ipDrgWeightIncrease) > 0 ? asNum(values.ipDrgWeightIncrease) : DEFAULT_IP_DRG_WEIGHT_INCREASE}
            onValueChange={(v) => onChangeValue("ipDrgWeightIncrease", v)}
            min={0}
            max={1}
            decimal={true}
            className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white px-3 text-sm"
            data-testid="input-ip-revenue-drg-weight-increase"
          />
        </div>
        <div>
          <FieldLabel tip="Base payment per case the weight lift is multiplied against, your own contracted rate.">Base DRG payment per case</FieldLabel>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-sm pointer-events-none">$</span>
            <NumberField
              value={asNum(values.ipDrgBasePayment) > 0 ? asNum(values.ipDrgBasePayment) : DEFAULT_IP_DRG_BASE_PAYMENT}
              onValueChange={(v) => onChangeValue("ipDrgBasePayment", v)}
              min={0}
              decimal={false}
              className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white pl-7 pr-3 text-sm"
              data-testid="input-ip-revenue-drg-base-payment"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-xs pointer-events-none">/case</span>
          </div>
        </div>
      </div>
      <PrizeLine
        value={realized}
        caption={`${fmtRevenueCount(chain.capturedCases)} captured cases x ${chain.weightIncrease} avg weight x ~$${fmtInt(chain.basePayment)}/case`}
        formula={prizeFormula}
        testid="text-ip-revenue-drg-prize"
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// PATH — CDI Query Efficiency (labor savings, NOT reimbursement)
// ────────────────────────────────────────────────────────────────────────

function CdiPath({
  baseline,
  values,
  onChangeValue,
  realizationPct,
  drgAlsoSelected,
}: {
  baseline: AttainBaseline;
  values: LeverValues;
  onChangeValue: (leverId: string, value: number | string[]) => void;
  realizationPct: number;
  drgAlsoSelected: boolean;
}) {
  const chain = computeIpCdiChain(baseline, values);
  const realized = Math.round(realizedValue(chain.value, realizationPct));
  const prizeFormula = realized > 0 ? formulaWithRealization(ipCdiPayoffFormula(chain), realizationPct, realized) : ipCdiPayoffFormula(chain);

  return (
    <div data-testid="section-ip-revenue-path-cdi">
      <p className="text-[13px] font-bold uppercase tracking-[1.5px] text-[#EA2C00] mb-3 mt-2">{IP_REVENUE_PATH_LABELS.cdi}</p>

      {/* BEAT 1 — ground the reality */}
      <LadderRung
        eyebrow="Ground it"
        title="Your CDI query volume, and what a query costs to work"
        help="This path is labor, not reimbursement. It is the CDI staff time you save because complete up-front documentation means fewer queries are needed at all. Set today's query rate against your admissions, and the administrative cost of working one query. That sizes the pool this path is measured against, before any dollar."
        testid="card-ip-revenue-cdi-ground"
      >
        <div className="max-w-[240px] mb-4">
          <FieldLabel tip="Share of eligible admissions that generate a physician query today. Your own number, not a benchmark you never checked.">
            CDI query rate, today
          </FieldLabel>
          <div className="relative">
            <NumberField
              value={asNum(values.ipCdiQueryRate) > 0 ? asNum(values.ipCdiQueryRate) : DEFAULT_IP_CDI_QUERY_RATE}
              onValueChange={(v) => onChangeValue("ipCdiQueryRate", v)}
              min={0}
              max={60}
              decimal={false}
              className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white px-3 pr-9 text-sm"
              data-testid="input-ip-revenue-cdi-query-rate"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-sm pointer-events-none">%</span>
          </div>
        </div>
        <CountOutput label="CDI queries generated today" value={fmtInt(chain.queries)} unit="queries / yr" testid="text-ip-revenue-cdi-ground-output" />
        <Note testid="note-ip-revenue-cdi-labor">
          This path counts CDI staff time only. The reimbursement a captured DRG earns lives in the Case Mix / DRG Accuracy path and is not re-counted here.
        </Note>
      </LadderRung>

      <Connector />

      {/* BEAT 2 — diagnose the leak (the gate) + BEAT 3 who acts */}
      <LadderRung
        eyebrow="The gate · diagnose the leak"
        title="How many of your queries exist only because the note lacked specificity"
        help="Of your CDI queries, how many exist only because the initial note lacked specificity Abridge would capture up front? Those are the queries you would no longer have to work. A query that still gets generated still costs CDI the time to chase and answer it, so this is about queries never needed, not queries closed faster. Then commit to the share of today's volume you will actually remove."
        testid="card-ip-revenue-cdi-gate"
      >
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#8C8C8C] flex items-center gap-1.5">
              Share of today's queries you commit to remove
              <InfoTip
                text="The share of today's CDI query volume this plan avoids entirely, because the note is complete enough up front that CDI never has to generate the query. This is the gate: zero here avoids nothing."
                testid="tooltip-ip-revenue-cdi-reduction"
              />
            </span>
            <span className="text-sm font-semibold text-[#1A1A1A]" data-testid="text-ip-revenue-cdi-reduction-value">
              {fmtInt(asNum(values.ipCdiReduction))}%
            </span>
          </div>
          <Slider
            value={[asNum(values.ipCdiReduction)]}
            onValueChange={(v) => onChangeValue("ipCdiReduction", v[0])}
            min={0}
            max={100}
            step={5}
            accent="coral"
            className="w-full"
            data-testid="slider-ip-revenue-cdi-reduction"
          />
        </div>

        <RevenuePathGate
          showHeader={false}
          ceilingLabel="CDI queries generated today"
          ceilingCount={chain.queries}
          ceilingUnit="queries / yr"
          capturedLabel="Queries no longer needed, CDI staff time saved"
          capturedCount={chain.avoided}
          capturedUnit="queries / yr"
          whoActs={IP_REVENUE_PATH_WHO_ACTS.cdi}
          bothSet={chain.queries > 0 && chain.reductionPct > 0}
          emptyHint={
            chain.queries <= 0
              ? "Set your CDI query rate above to size the pool, then commit to a share of it you will remove."
              : "Commit to a share of today's query volume to see how many queries are no longer needed."
          }
        />
        <MathBox formula={ipCdiCountFormula(chain)} testid="text-ip-revenue-cdi-gate-formula" />
      </LadderRung>

      <Connector />

      {/* BEAT 4 — the number */}
      <div className="max-w-[240px] mb-4">
        <FieldLabel tip={`The CDI-staff/admin time an avoided query no longer costs, your own number. Capped at $${fmtInt(MAX_IP_CDI_COST_PER_QUERY)}/query on purpose, so it can never restate the DRG reimbursement, which is already booked in the DRG path.`}>
          Admin cost avoided per query
        </FieldLabel>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-sm pointer-events-none">$</span>
          <NumberField
            value={asNum(values.ipCdiCostPerQuery) > 0 ? asNum(values.ipCdiCostPerQuery) : DEFAULT_IP_CDI_COST_PER_QUERY}
            onValueChange={(v) => onChangeValue("ipCdiCostPerQuery", v)}
            min={0}
            max={MAX_IP_CDI_COST_PER_QUERY}
            decimal={false}
            className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white pl-7 pr-3 text-sm"
            data-testid="input-ip-revenue-cdi-cost-per-query"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-xs pointer-events-none">/query</span>
        </div>
        <p className="text-[11px] text-[#8C8C8C] mt-1">
          Defaults to ${fmtInt(DEFAULT_IP_CDI_COST_PER_QUERY)}/query, capped at ${fmtInt(MAX_IP_CDI_COST_PER_QUERY)}/query, admin cost only.
        </p>
      </div>
      {drgAlsoSelected && (
        <Note testid="note-ip-revenue-cdi-drg-doublecount">
          DRG and CDI are both selected. This price stays administrative cost only, the CDI specialist time a query takes to work, never the DRG reimbursement itself. That dollar is already counted once in the Case Mix / DRG Accuracy path above, so the two never double-count.
        </Note>
      )}
      <div className="mt-4">
        <PrizeLine
          value={realized}
          caption={`${fmtRevenueCount(chain.avoided)} queries no longer worked x ~$${fmtInt(chain.costPerQuery)}/query admin cost`}
          formula={prizeFormula}
          testid="text-ip-revenue-cdi-prize"
        />
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// PATH — Observation / IP Status Defense
// ────────────────────────────────────────────────────────────────────────

function ObsPath({
  baseline,
  values,
  onChangeValue,
  realizationPct,
  drgAlsoSelected,
}: {
  baseline: AttainBaseline;
  values: LeverValues;
  onChangeValue: (leverId: string, value: number | string[]) => void;
  realizationPct: number;
  drgAlsoSelected: boolean;
}) {
  const chain = computeIpObsChain(baseline, values);
  const realized = Math.round(realizedValue(chain.value, realizationPct));
  const prizeFormula = realized > 0 ? formulaWithRealization(ipObsPayoffFormula(chain), realizationPct, realized) : ipObsPayoffFormula(chain);

  return (
    <div data-testid="section-ip-revenue-path-obs">
      <p className="text-[13px] font-bold uppercase tracking-[1.5px] text-[#EA2C00] mb-3 mt-2">{IP_REVENUE_PATH_LABELS.obs}</p>

      {/* BEAT 1 — ground the reality */}
      <LadderRung
        eyebrow="Ground it"
        title="Your observation stays, and the margin an inpatient status is worth"
        help="Set today's rate of observation stays or status downgrades against your admissions, and the margin difference between an inpatient stay and an observation stay. A downgrade is a genuinely separate claim from a DRG-weight gap: the whole admission moves status, not just the weight within it. That sizes the pool this path is measured against, before any dollar."
        testid="card-ip-revenue-obs-ground"
      >
        {drgAlsoSelected && (
          <Note testid="note-ip-revenue-drg-obs-shared-pool">
            DRG and Observation Defense both draw on your admissions pool. A single admission can sit in both, but they are different claims, a DRG-weight change and a status change, never the same claim, so summing them is honest, not a double-count.
          </Note>
        )}
        <div className="max-w-[240px] mb-4 mt-4">
          <FieldLabel tip="Share of eligible admissions that land in observation or get downgraded from inpatient status today. Your own number, not a benchmark you never checked.">
            Observation / downgrade rate, today
          </FieldLabel>
          <div className="relative">
            <NumberField
              value={asNum(values.ipObsDenialRate) > 0 ? asNum(values.ipObsDenialRate) : DEFAULT_IP_OBS_DENIAL_RATE}
              onValueChange={(v) => onChangeValue("ipObsDenialRate", v)}
              min={0}
              max={30}
              decimal={false}
              className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white px-3 pr-9 text-sm"
              data-testid="input-ip-revenue-obs-denial-rate"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-sm pointer-events-none">%</span>
          </div>
        </div>
        <CountOutput label="Observation stays or downgrades a year" value={fmtInt(chain.downgrades)} unit="stays / yr" testid="text-ip-revenue-obs-ground-output" />
      </LadderRung>

      <Connector />

      {/* BEAT 2 — diagnose the leak (the gate) + BEAT 3 who acts */}
      <LadderRung
        eyebrow="The gate · diagnose the leak"
        title="How many stays are observation because the note did not establish inpatient medical necessity"
        help="Of your observation stays or downgrades, how many are because the note did not establish inpatient medical necessity, versus genuinely observation-appropriate? Only the documentation-caused share is Abridge's to defend. That share is the ceiling, and it is what you commit to defend."
        testid="card-ip-revenue-obs-gate"
      >
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#8C8C8C] flex items-center gap-1.5">
              Share the note can defend as inpatient
              <InfoTip
                text="The documentation-caused share of your observation stays: the ones the note could defend as inpatient by establishing medical necessity, not the stays that are genuinely observation-appropriate. This is the gate: zero here defends nothing."
                testid="tooltip-ip-revenue-obs-preventable"
              />
            </span>
            <span className="text-sm font-semibold text-[#1A1A1A]" data-testid="text-ip-revenue-obs-preventable-value">
              {fmtInt(asNum(values.ipObsPreventable))}%
            </span>
          </div>
          <Slider
            value={[asNum(values.ipObsPreventable)]}
            onValueChange={(v) => onChangeValue("ipObsPreventable", v[0])}
            min={0}
            max={100}
            step={5}
            accent="coral"
            className="w-full"
            data-testid="slider-ip-revenue-obs-preventable"
          />
        </div>

        <RevenuePathGate
          showHeader={false}
          ceilingLabel="Observation stays a year"
          ceilingCount={chain.downgrades}
          ceilingUnit="stays / yr"
          capturedLabel="Inpatient stays defended"
          capturedCount={chain.preventable}
          capturedUnit="stays / yr"
          whoActs={IP_REVENUE_PATH_WHO_ACTS.obs}
          bothSet={chain.downgrades > 0 && chain.preventablePct > 0}
          emptyHint={
            chain.downgrades <= 0
              ? "Set your observation rate above to size the pool, then commit to the documentation-caused share you can defend."
              : "Commit to the share the note can defend to see how many inpatient stays get held."
          }
        />
        <MathBox formula={ipObsCountFormula(chain)} testid="text-ip-revenue-obs-gate-formula" />
      </LadderRung>

      <Connector />

      {/* BEAT 4 — the number */}
      <div className="max-w-[240px] mb-5">
        <FieldLabel tip="The margin an inpatient status successfully defended is worth over an observation stay, your own contracted rate.">
          Margin difference per defended stay
        </FieldLabel>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-sm pointer-events-none">$</span>
          <NumberField
            value={asNum(values.ipObsRevenueDelta) > 0 ? asNum(values.ipObsRevenueDelta) : DEFAULT_IP_OBS_REVENUE_DELTA}
            onValueChange={(v) => onChangeValue("ipObsRevenueDelta", v)}
            min={0}
            decimal={false}
            className="h-11 w-full rounded-md border border-[#E5E5E5] bg-white pl-7 pr-3 text-sm"
            data-testid="input-ip-revenue-obs-revenue-delta"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-xs pointer-events-none">/stay</span>
        </div>
        <p className="text-[11px] text-[#8C8C8C] mt-1">Defaults to ${fmtInt(DEFAULT_IP_OBS_REVENUE_DELTA)}/stay until you set your own.</p>
      </div>
      <PrizeLine
        value={realized}
        caption={`${fmtRevenueCount(chain.preventable)} defended stays x ~$${fmtInt(chain.revenueDelta)}/stay margin`}
        formula={prizeFormula}
        testid="text-ip-revenue-obs-prize"
      />
    </div>
  );
}
