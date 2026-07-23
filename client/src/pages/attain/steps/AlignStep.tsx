import { motion } from "framer-motion";
import { AnimatedValue } from "@/components/explore/AnimatedValue";
import ChooseQuestion from "./ChooseQuestion";
import {
  asStringArray,
  type AlignConfig,
  type AlignContext,
  type AlignQuestion,
} from "@/lib/attain/alignFramework";
import type { AttainBaseline, LeverValues } from "@/lib/attain/attainLevers";
import type { AttainSetting } from "@/lib/attain/attainTypes";

function fmtMoneyCompact(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${Math.round(abs)}`;
}

interface AlignStepProps {
  config: AlignConfig;
  setting: AttainSetting;
  baseline: AttainBaseline;
  values: LeverValues;
  onChangeValue: (leverId: string, value: number | string[]) => void;
  realizationPct: number;
  crossGoalShareMultiplier: number;
}

/**
 * AlignStep — the shared, config-driven Align surface. Renders a per-driver set
 * of <=5 "choose" questions as premium cards (ChooseQuestion), inherits the
 * facts from Starting Point, and shows a derived-number PROOF that the choices
 * fall into. Every selection is written back into the per-goal `LeverValues`
 * bag TWICE: the raw selection (so the cards re-highlight on reload) and the
 * engine levers the config maps it to (so the number, the side panel, the
 * Plan, and the PDF all read the same figure with no new plumbing).
 *
 * Workforce is the first config; the framework is reusable by every driver.
 */
export default function AlignStep({
  config,
  setting,
  baseline,
  values,
  onChangeValue,
  realizationPct,
  crossGoalShareMultiplier,
}: AlignStepProps) {
  const ctx: AlignContext = { baseline, setting, realizationPct, crossGoalShareMultiplier };

  // Writes a patch of NEXT values (selection + recomputed engine levers) one
  // key at a time. handleChangeLeverValue merges functionally, so sequential
  // writes compose correctly. We compute the engine levers off `nextValues`
  // (the local, post-change bag) rather than the async state, so the derived
  // number can never lag a click.
  const applyPatch = (patch: LeverValues) => {
    const nextValues: LeverValues = { ...values, ...patch };
    const engine = config.toLeverValues(nextValues, ctx);
    const merged: LeverValues = { ...patch, ...engine };
    for (const [key, value] of Object.entries(merged)) {
      onChangeValue(key, value as number | string[]);
    }
  };

  const handleToggleOption = (storeKey: string, mode: "single" | "multi", optionId: string) => {
    const current = asStringArray(values[storeKey]);
    let next: string[];
    if (mode === "single") {
      next = current[0] === optionId ? [] : [optionId];
    } else {
      next = current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId];
    }
    applyPatch({ [storeKey]: next });
  };

  const handleChangeSharpener = (sharpenerStoreKey: string, value: number) => {
    applyPatch({ [sharpenerStoreKey]: value });
  };

  const proof = config.deriveProof(values, ctx);
  // Financial drivers render the hero as a compact dollar; the safety-first
  // Quality driver overrides this with a plain count so its hero is harm events
  // prevented, never a dollar.
  const fmtHead = proof.headlineFormatter ?? fmtMoneyCompact;

  // "Question N of M" is numbered by CONCEPTUAL DIMENSION, not rendered
  // position, so the per-path questions that repeat a dimension (every path's
  // "who" is dimension 2) read consistently. Falls back to position + total
  // question count, so Workforce / Access are numbered exactly as before.
  const displayTotal = config.dimensionTotal ?? config.questions.length;
  const displayIndexOf = (question: AlignQuestion, position: number) =>
    (question.dimension ?? position + 1) - 1;

  // A single (non-stacking) question, rendered as one card.
  const renderFlat = (question: AlignQuestion, position: number) => (
    <ChooseQuestion
      key={question.id}
      question={question}
      index={displayIndexOf(question, position)}
      total={displayTotal}
      values={values}
      ctx={ctx}
      onToggleOption={handleToggleOption}
      onChangeSharpener={handleChangeSharpener}
    />
  );

  // MULTI-SELECT STACKING: questions with `stacksOnQuestionId` are grouped into
  // one clean SECTION PER CHOSEN PATH (a header + that path's who/gate/where),
  // not a flat wall of repeated questions. Workforce / Access have no stacking
  // questions, so this whole branch is skipped and the flat map below runs
  // exactly as before.
  const stackedQuestions = config.questions.filter((q) => q.stacksOnQuestionId);
  const hasStacking = stackedQuestions.length > 0;
  const firstStackedPos = config.questions.findIndex((q) => q.stacksOnQuestionId);
  let lastStackedPos = -1;
  config.questions.forEach((q, i) => {
    if (q.stacksOnQuestionId) lastStackedPos = i;
  });
  const leadQuestions = hasStacking ? config.questions.slice(0, firstStackedPos) : config.questions;
  const tailQuestions = hasStacking ? config.questions.slice(lastStackedPos + 1).filter((q) => !q.stacksOnQuestionId) : [];

  // The parent selector every stacked question hangs off (the path chooser).
  const parentId = stackedQuestions[0]?.stacksOnQuestionId;
  const parent = parentId ? config.questions.find((q) => q.id === parentId) : undefined;
  const chosenPathIds = parent ? asStringArray(values[parent.storeKey]) : [];
  // Render chosen paths in the parent's own option order (stable, premium).
  const orderedChosenPaths = parent
    ? parent.options.map((o) => o.id).filter((id) => chosenPathIds.includes(id))
    : [];

  return (
    <div data-testid="section-attain-align">
      <p className="text-[15px] text-[#3A3A3A] leading-relaxed max-w-[620px] mb-8" data-testid="text-align-intro">
        {config.intro}
      </p>

      {leadQuestions.map((question) =>
        renderFlat(question, config.questions.indexOf(question)),
      )}

      {/* One clean section per chosen path: header + that path's stacked
          questions. Reads as distinct premium sections, never a wall. */}
      {orderedChosenPaths.map((pathId, pathIndex) => {
        const pathOption = parent?.options.find((o) => o.id === pathId);
        const questionsForPath = stackedQuestions.filter(
          (q) => !q.appliesToChoices || q.appliesToChoices.includes(pathId),
        );
        if (!pathOption || questionsForPath.length === 0) return null;
        return (
          <motion.div
            key={`path-section-${pathId}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-[#E7E0D6] bg-[#FBFAF7] p-6 md:p-7 mb-6"
            data-testid={`align-path-section-${pathId}`}
          >
            <div className="mb-6">
              <p className="text-[11px] font-bold uppercase tracking-[2.5px] text-[#EA2C00] mb-1.5">
                Path {pathIndex + 1} of {orderedChosenPaths.length}
              </p>
              <h3 className="font-abridge text-2xl md:text-[26px] text-[#1A1A1A] leading-tight">
                {pathOption.label}
              </h3>
              <p className="text-[13.5px] text-[#8C8C8C] leading-relaxed mt-1.5 max-w-[560px]">
                {pathOption.helper}
              </p>
            </div>
            {questionsForPath.map((question) => (
              <ChooseQuestion
                key={`${question.id}__${pathId}`}
                question={question}
                index={displayIndexOf(question, config.questions.indexOf(question))}
                total={displayTotal}
                values={values}
                ctx={ctx}
                storeKeyOverride={`${question.storeKey}__${pathId}`}
                instanceKey={pathId}
                onToggleOption={handleToggleOption}
                onChangeSharpener={handleChangeSharpener}
              />
            ))}
          </motion.div>
        );
      })}

      {tailQuestions.map((question) =>
        renderFlat(question, config.questions.indexOf(question)),
      )}

      {/* THE PROOF — the number that falls out of the choices + inherited
          facts. Coral count-up, benchmark-labeled figures, the live math. */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border-2 border-[#1A1A1A] bg-[#1A1A1A] overflow-hidden mt-2"
        data-testid="panel-align-proof"
      >
        <div className="px-6 pt-6 pb-5">
          <p className="text-[11px] font-bold uppercase tracking-[2.5px] text-white/50 mb-2">The proof</p>
          {proof.ready ? (
            <>
              <p className="text-sm text-white/60 mb-1">{proof.headlineLabel}</p>
              <AnimatedValue
                value={proof.headlineValue}
                format={fmtHead}
                className="font-abridge text-5xl md:text-6xl text-[#EA2C00] block leading-none"
                data-testid="text-align-proof-value"
              />
              <p className="text-[13px] text-white/50 mt-2 max-w-[480px]" data-testid="text-align-proof-sub">
                {proof.headlineSub}
              </p>
            </>
          ) : (
            <>
              <p className="font-abridge text-4xl text-white/25 block leading-none">{fmtHead(0)}</p>
              <p className="text-[13px] text-white/45 mt-3 max-w-[480px]" data-testid="text-align-proof-empty">
                {proof.emptyHint}
              </p>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3">
          {proof.figures.map((figure) => (
            <div key={figure.label} data-testid={`align-proof-figure-${figure.label.toLowerCase().replace(/\s+/g, "-")}`}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] uppercase tracking-wide text-white/40">{figure.label}</span>
                {figure.tag && (
                  <span
                    className={`text-[8.5px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                      figure.tag === "benchmark" ? "bg-white/10 text-white/55" : "bg-white/10 text-white/55"
                    }`}
                  >
                    {figure.tag === "benchmark" ? "Benchmark" : "From your start"}
                  </span>
                )}
              </div>
              <p className="text-[15px] font-semibold text-white">{figure.value}</p>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-white/10 bg-white/[0.03]">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#EA2C00] mb-1">The math</p>
          <p className="text-[12.5px] text-white/70 leading-relaxed" data-testid="text-align-proof-math">
            {proof.math}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
