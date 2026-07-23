import { motion } from "framer-motion";
import { NumberField } from "@/components/NumberField";
import {
  asStringArray,
  resolveOptions,
  sharpenerNumber,
  type AlignContext,
  type AlignOption,
  type AlignQuestion,
} from "@/lib/attain/alignFramework";
import type { LeverValues } from "@/lib/attain/attainLevers";
import { EditorialOptionList, EditorialOptionRow } from "./EditorialOption";

/**
 * ChooseQuestion: one Align "choose your meaning" question, rendered as a
 * Style A editorial list (never a default radio list, never a grid of boxes).
 * Single- or multi-select per the config: full-width rows on thin hairline
 * dividers, a selected row marked with a coral #EA2C00 left-accent bar, a coral
 * title, and a coral check on the right. An optional number sharpener reveals
 * under a chosen row. Refined and quiet, the premium editorial aesthetic, one
 * clear question flowing down the page.
 */
export default function ChooseQuestion({
  question,
  index,
  total,
  values,
  ctx,
  storeKeyOverride,
  instanceKey,
  onToggleOption,
  onChangeSharpener,
}: {
  question: AlignQuestion;
  index: number;
  total: number;
  values: LeverValues;
  ctx: AlignContext;
  /** For the stacking scaffold: the concrete store key for THIS instance of a
   * repeated question. Defaults to the question's own storeKey. */
  storeKeyOverride?: string;
  /** For the stacking scaffold: the chosen path/event id this instance belongs
   * to. Suffixes the test ids so a question repeated across paths (e.g. the
   * shared "where") never collides. Undefined for a single, non-stacked
   * question, so Workforce / Access test ids are unchanged. */
  instanceKey?: string;
  onToggleOption: (storeKey: string, mode: "single" | "multi", optionId: string) => void;
  onChangeSharpener: (sharpenerStoreKey: string, value: number) => void;
}) {
  const storeKey = storeKeyOverride ?? question.storeKey;
  const testidBase = instanceKey ? `${question.id}-${instanceKey}` : question.id;
  const selected = asStringArray(values[storeKey]);
  const isSelected = (id: string) => selected.includes(id);
  // Dynamic when the question defines it (e.g. revenue paths reshaping to the
  // payer/contract book), else the static options.
  const options = resolveOptions(question, values, ctx);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.25) }}
      className="mb-9"
      data-testid={`align-question-${testidBase}`}
    >
      <div className="flex items-baseline gap-2.5 mb-2">
        <span className="text-[11px] font-bold uppercase tracking-[2px] text-[#EA2C00]">
          Question {index + 1} of {total}
        </span>
        {question.mode === "multi" && (
          <span className="text-[11px] text-[#B4B4B4]">select any that apply</span>
        )}
      </div>
      <h3 className="text-[20px] md:text-[22px] font-bold text-[#1A1A1A] leading-snug mb-1.5">
        {question.prompt}
      </h3>
      {question.helper && (
        <p className="text-[14px] text-[#8C8C8C] leading-relaxed mb-4 max-w-[600px]">{question.helper}</p>
      )}

      {/* Style A editorial list: full-width rows on thin hairline dividers, no
          per-option boxes. Identical for single-select (Q1-Q3) and multi-select
          (Q4/Q5): each selected row is marked independently with a coral
          left-bar, coral title, and a coral check on the right. */}
      <EditorialOptionList>
        {options.map((option) => (
          <EditorialOptionRow
            key={option.id}
            title={option.label}
            description={option.dynamicHelper ? option.dynamicHelper(ctx) : option.helper}
            selected={isSelected(option.id)}
            onClick={() => onToggleOption(storeKey, question.mode, option.id)}
            testId={`align-option-${testidBase}-${option.id}`}
          />
        ))}
      </EditorialOptionList>

      {/* Optional number sharpener — reveals only under a chosen option that
          carries one. Blank shows the benchmark note, never a fake number. */}
      {options.map((option) =>
        option.sharpener && isSelected(option.id) ? (
          <Sharpener
            key={`${option.id}-sharpener`}
            questionId={testidBase}
            option={option}
            values={values}
            onChange={onChangeSharpener}
          />
        ) : null,
      )}
    </motion.div>
  );
}

function Sharpener({
  questionId,
  option,
  values,
  onChange,
}: {
  questionId: string;
  option: AlignOption;
  values: LeverValues;
  onChange: (storeKey: string, value: number) => void;
}) {
  const sharpener = option.sharpener!;
  const current = sharpenerNumber(values, sharpener.storeKey);
  const blank = current <= 0;
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="mt-3 rounded-xl border border-[#E7E0D6] bg-[#F4F0EA] p-4"
      data-testid={`align-sharpener-${questionId}-${option.id}`}
    >
      <label className="text-[13px] font-medium text-[#3A3A3A] block mb-2">{sharpener.label}</label>
      <div className="flex items-center gap-3">
        <div className="relative w-[180px]">
          {sharpener.prefix && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-sm pointer-events-none">
              {sharpener.prefix}
            </span>
          )}
          <NumberField
            value={current}
            onValueChange={(v) => onChange(sharpener.storeKey, v)}
            min={0}
            max={sharpener.max}
            decimal={sharpener.decimal ?? false}
            placeholder={sharpener.placeholder}
            className={`attain-input h-11 w-full text-sm ${
              sharpener.prefix ? "pl-7" : "px-3"
            } ${sharpener.unit ? "pr-14" : "pr-3"}`}
            data-testid={`align-sharpener-input-${questionId}-${option.id}`}
          />
          {sharpener.unit && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] text-xs pointer-events-none">
              {sharpener.unit}
            </span>
          )}
        </div>
        {blank && (
          <p className="text-[12px] text-[#8C8C8C] leading-snug max-w-[340px]">{sharpener.benchmarkNote}</p>
        )}
      </div>
    </motion.div>
  );
}
