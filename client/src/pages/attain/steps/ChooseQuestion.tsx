import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { NumberField } from "@/components/NumberField";
import {
  asStringArray,
  sharpenerNumber,
  type AlignContext,
  type AlignOption,
  type AlignQuestion,
} from "@/lib/attain/alignFramework";
import type { LeverValues } from "@/lib/attain/attainLevers";

/**
 * ChooseQuestion — one Align "choose your meaning" question, rendered as a set
 * of crafted selectable CARDS (never a default radio list). Single- or
 * multi-select per the config. An optional number sharpener reveals under a
 * chosen card. Coral #EA2C00 for selected, near-black #1A1A1A text, neutral
 * grays, cream on the reveal — the premium PDF aesthetic, one clear question
 * flowing down the page.
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

      {/* UNIFORM grid: always three equal columns on sm+, so a 2-option
          question's cards are the exact same width as a 3-option question's
          (never stretched wide). `items-stretch` + `h-full` on the card give
          equal heights across every option in a row, every question, every
          driver. Four or five options wrap into further rows at the same
          column width. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-stretch">
        {question.options.map((option) => (
          <OptionCard
            key={option.id}
            option={option}
            questionId={testidBase}
            selected={isSelected(option.id)}
            ctx={ctx}
            onClick={() => onToggleOption(storeKey, question.mode, option.id)}
          />
        ))}
      </div>

      {/* Optional number sharpener — reveals only under a chosen option that
          carries one. Blank shows the benchmark note, never a fake number. */}
      {question.options.map((option) =>
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

function OptionCard({
  option,
  questionId,
  selected,
  ctx,
  onClick,
}: {
  option: AlignOption;
  questionId: string;
  selected: boolean;
  ctx: AlignContext;
  onClick: () => void;
}) {
  const helper = option.dynamicHelper ? option.dynamicHelper(ctx) : option.helper;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`group h-full text-left rounded-[11px] p-4 transition-all duration-200 ${
        selected
          ? "border-[1.5px] border-[#EA2C00] bg-[#FEF6F3]"
          : "border border-[#E7E0D6] bg-white hover:border-[#D2C8B9] hover:bg-[#FBFAF7]"
      }`}
      data-testid={`align-option-${questionId}-${option.id}`}
      data-selected={selected}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-[15px] leading-snug ${selected ? "font-semibold text-[#EA2C00]" : "font-medium text-[#1A1A1A]"}`}>
            {option.label}
          </p>
          <p className="text-[13px] text-[#8C8C8C] leading-snug mt-1">{helper}</p>
        </div>
        <span
          className={`mt-px flex-shrink-0 w-[18px] h-[18px] rounded-full flex items-center justify-center transition-all ${
            selected ? "bg-[#EA2C00]" : "border border-transparent group-hover:border-[#D8CFC4]"
          }`}
          aria-hidden
        >
          {selected && <Check className="w-[11px] h-[11px] text-white" strokeWidth={2.75} />}
        </span>
      </div>
    </button>
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
