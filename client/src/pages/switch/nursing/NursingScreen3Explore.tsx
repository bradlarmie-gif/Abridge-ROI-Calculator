import { useMemo } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { Checkbox } from "@/components/ui/checkbox";
import StepFooter, { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";
import { staggerContainer, staggerItem } from "@/components/PageTransition";
import type { NursingPriority, NursingBaselineInputs, AllPriorityInputs } from "./nursingTypes";
import {
  PRIORITY_CONFIGS,
  RETENTION_INTERVENTIONS,
  STAFFING_COST_PRESSURES,
  STAFFING_COST_INTERVENTIONS,
  WELLBEING_PRESSURES,
  WELLBEING_SURVEY_FINDINGS,
  DOC_QUALITY_CONCERNS,
  FUTURE_INITIATIVES,
} from "./nursingTypes";
import {
  deriveShiftsPerYear,
  computeRetentionImpact,
  computeStaffingImpact,
  computeBedsideImpact,
  getOTNarrative,
  fmtDollar,
  RESEARCH_NOTE,
} from "./nursingCalculations";

interface Screen3Props {
  baseline: NursingBaselineInputs;
  selectedPriorities: NursingPriority[];
  inputs: AllPriorityInputs;
  setInputs: React.Dispatch<React.SetStateAction<AllPriorityInputs>>;
  onNext: () => void;
  onBack: () => void;
}

function CheckboxGroup({
  items,
  checked,
  onChange,
  testPrefix,
}: {
  items: string[];
  checked: number[];
  onChange: (next: number[]) => void;
  testPrefix: string;
}) {
  const toggle = (idx: number) => {
    onChange(checked.includes(idx) ? checked.filter(i => i !== idx) : [...checked, idx]);
  };
  return (
    <div className="space-y-2">
      {items.map((item, idx) => {
        const isChecked = checked.includes(idx);
        return (
          <label
            key={idx}
            className={`flex items-start gap-3 cursor-pointer group rounded-lg border px-3.5 py-3 transition-all active:scale-[0.99] ${
              isChecked
                ? 'border-[#EA2C00] bg-[#FFF5F2]'
                : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
            }`}
            data-testid={`${testPrefix}-${idx}`}
          >
            <Checkbox
              checked={isChecked}
              onCheckedChange={() => toggle(idx)}
              className="mt-0.5"
            />
            <span className={`text-sm leading-relaxed ${isChecked ? 'text-[#1A1A1A]' : 'text-[#333333]'}`}>{item}</span>
          </label>
        );
      })}
    </div>
  );
}

function RadioGroup({
  options,
  value,
  onChange,
  testPrefix,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  testPrefix: string;
}) {
  return (
    <div className="space-y-2">
      {options.map(opt => {
        const isSelected = value === opt.value;
        return (
          <label
            key={opt.value}
            className={`flex items-center gap-3 cursor-pointer rounded-lg border px-3.5 py-3 transition-all active:scale-[0.99] ${
              isSelected
                ? 'border-[#EA2C00] bg-[#EA2C00]/5'
                : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
            }`}
            data-testid={`${testPrefix}-${opt.value}`}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'border-[#EA2C00]' : 'border-[#CCCCCC]'}`}>
              {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#EA2C00]" />}
            </div>
            <span className={`text-sm leading-relaxed ${isSelected ? 'text-black font-medium' : 'text-[#333333]'}`}>{opt.label}</span>
          </label>
        );
      })}
    </div>
  );
}

function SectionLabel({ text }: { text: string }) {
  return <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#888888] mb-3">{text}</p>;
}

function BenchmarkPill({ text }: { text: string }) {
  return <p className="text-[11px] text-[#999999] mt-1.5">{text}</p>;
}

export default function NursingScreen3Explore({
  baseline,
  selectedPriorities,
  inputs,
  setInputs,
  onNext,
  onBack,
}: Screen3Props) {
  const shiftsPerYear = deriveShiftsPerYear(baseline);

  const retentionImpact = useMemo(() => computeRetentionImpact(inputs.retention, baseline), [inputs.retention, baseline]);
  const staffingImpact = useMemo(() => computeStaffingImpact(inputs.staffingCosts, baseline), [inputs.staffingCosts, baseline]);
  const otNarrative = useMemo(() => getOTNarrative(inputs.staffingCosts, baseline), [inputs.staffingCosts, baseline]);
  const bedsideImpact = useMemo(() => computeBedsideImpact(inputs.bedsidePresence, baseline), [inputs.bedsidePresence, baseline]);

  return (
    <div className={STEP_FOOTER_SPACER_CLASS}>
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="flex flex-col lg:flex-row gap-10"
      >
        <motion.div className="flex-1 max-w-[700px]" variants={staggerItem}>
          <p className="text-[11px] font-semibold uppercase tracking-[2px] text-[#EA2C00] mb-2">
            Your Priorities
          </p>
          <h1
            className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight"
            data-testid="text-explore-headline"
          >
            Help us understand what each of these looks like at your organization
          </h1>
          <p className="text-base text-[#888888] mb-8 max-w-xl leading-relaxed">
            The more context you share, the more specific the assessment will be. Everything here is optional.
          </p>

          <div className="space-y-8">
            {selectedPriorities.includes('retention') && (
              <motion.div variants={staggerItem} className="bg-[#F5F0EB] rounded-xl p-6 md:p-8" data-testid="section-retention">
                <h3 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-wide mb-5">Nurse Retention</h3>
                <SectionLabel text="What does this look like at your organization?" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Annual RN turnover rate</label>
                    <div className="flex items-center gap-1">
                      <FormattedNumberInput
                        value={inputs.retention.turnoverRate}
                        onChange={v => setInputs(prev => ({ ...prev, retention: { ...prev.retention, turnoverRate: v } }))}
                        placeholder="e.g. 18"
                        data-testid="input-turnover-rate"
                      />
                      <span className="text-sm text-[#888]">%</span>
                    </div>
                    <BenchmarkPill text="National average: 18-22% (NSI Nursing Solutions, 2024)" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Average cost to replace an RN</label>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-[#888]">$</span>
                      <FormattedNumberInput
                        value={inputs.retention.replacementCost}
                        onChange={v => setInputs(prev => ({ ...prev, retention: { ...prev.retention, replacementCost: v } }))}
                        placeholder="e.g. 52000"
                        data-testid="input-replacement-cost"
                      />
                    </div>
                    <BenchmarkPill text="Industry range: $40K-$65K per RN (NSI Nursing Solutions)" />
                  </div>
                </div>
                <label className="block text-sm font-medium text-black mb-2 mt-4">What is your organization doing to address retention?</label>
                <CheckboxGroup
                  items={RETENTION_INTERVENTIONS}
                  checked={inputs.retention.interventions}
                  onChange={v => setInputs(prev => ({ ...prev, retention: { ...prev.retention, interventions: v } }))}
                  testPrefix="check-retention-intervention"
                />
              </motion.div>
            )}

            {selectedPriorities.includes('staffingCosts') && (
              <motion.div variants={staggerItem} className="bg-[#F5F0EB] rounded-xl p-6 md:p-8" data-testid="section-staffingCosts">
                <h3 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-wide mb-5">Staffing Costs</h3>
                <SectionLabel text="Where is cost pressure coming from?" />
                <CheckboxGroup
                  items={STAFFING_COST_PRESSURES}
                  checked={inputs.staffingCosts.costPressures}
                  onChange={v => setInputs(prev => ({ ...prev, staffingCosts: { ...prev.staffingCosts, costPressures: v } }))}
                  testPrefix="check-cost-pressure"
                />

                {inputs.staffingCosts.costPressures.includes(0) && (
                  <>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-black mb-1">Estimated average minutes per nurse per shift staying late for documentation</label>
                      <div className="flex items-center gap-1 max-w-[200px]">
                        <FormattedNumberInput
                          value={inputs.staffingCosts.otMinPerShift}
                          onChange={v => setInputs(prev => ({ ...prev, staffingCosts: { ...prev.staffingCosts, otMinPerShift: v } }))}
                          placeholder="e.g. 20"
                          data-testid="input-ot-minutes"
                        />
                        <span className="text-sm text-[#888]">min</span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-black mb-2">How often does end-of-shift documentation drive overtime?</label>
                      <RadioGroup
                        options={[
                          { value: 'occasionally', label: 'Occasionally — a few times per week per unit' },
                          { value: 'frequently', label: 'Frequently — most shifts on most units' },
                          { value: 'almost_always', label: 'Almost always — it\'s the norm' },
                        ]}
                        value={inputs.staffingCosts.otFrequency}
                        onChange={v => setInputs(prev => ({ ...prev, staffingCosts: { ...prev.staffingCosts, otFrequency: v as any } }))}
                        testPrefix="radio-ot-frequency"
                      />
                    </div>
                  </>
                )}

                {inputs.staffingCosts.costPressures.includes(2) && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-black mb-1">Current monthly agency / travel nurse spend</label>
                    <div className="flex items-center gap-1 max-w-[250px]">
                      <span className="text-sm text-[#888]">$</span>
                      <FormattedNumberInput
                        value={inputs.staffingCosts.agencyMonthlySpend}
                        onChange={v => setInputs(prev => ({ ...prev, staffingCosts: { ...prev.staffingCosts, agencyMonthlySpend: v } }))}
                        placeholder="e.g. 45000"
                        data-testid="input-agency-spend"
                      />
                      <span className="text-sm text-[#888]">/month</span>
                    </div>
                  </div>
                )}

                <label className="block text-sm font-medium text-black mb-2 mt-5">What is your organization doing to manage staffing costs?</label>
                <CheckboxGroup
                  items={STAFFING_COST_INTERVENTIONS}
                  checked={inputs.staffingCosts.costInterventions}
                  onChange={v => setInputs(prev => ({ ...prev, staffingCosts: { ...prev.staffingCosts, costInterventions: v } }))}
                  testPrefix="check-cost-intervention"
                />
              </motion.div>
            )}

            {selectedPriorities.includes('wellbeing') && (
              <motion.div variants={staggerItem} className="bg-[#F5F0EB] rounded-xl p-6 md:p-8" data-testid="section-wellbeing">
                <h3 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-wide mb-5">Nurse Wellbeing</h3>
                <SectionLabel text="Where is wellbeing pressure showing up?" />
                <CheckboxGroup
                  items={WELLBEING_PRESSURES}
                  checked={inputs.wellbeing.pressures}
                  onChange={v => setInputs(prev => ({ ...prev, wellbeing: { ...prev.wellbeing, pressures: v } }))}
                  testPrefix="check-wellbeing-pressure"
                />

                <label className="block text-sm font-medium text-black mb-2 mt-5">Have you conducted a nursing documentation burden or satisfaction survey?</label>
                <RadioGroup
                  options={[
                    { value: 'not_yet', label: 'Not yet' },
                    { value: 'informal', label: 'Informally — pulse checks or anecdotal feedback' },
                    { value: 'structured', label: 'Yes — structured survey with results' },
                  ]}
                  value={inputs.wellbeing.surveyStatus}
                  onChange={v => setInputs(prev => ({ ...prev, wellbeing: { ...prev.wellbeing, surveyStatus: v as any } }))}
                  testPrefix="radio-survey"
                />

                {inputs.wellbeing.surveyStatus === 'structured' && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-black mb-2">What did it show?</label>
                    <CheckboxGroup
                      items={WELLBEING_SURVEY_FINDINGS}
                      checked={inputs.wellbeing.surveyFindings}
                      onChange={v => setInputs(prev => ({ ...prev, wellbeing: { ...prev.wellbeing, surveyFindings: v } }))}
                      testPrefix="check-survey-finding"
                    />
                  </div>
                )}
              </motion.div>
            )}

            {selectedPriorities.includes('bedsidePresence') && (
              <motion.div variants={staggerItem} className="bg-[#F5F0EB] rounded-xl p-6 md:p-8" data-testid="section-bedsidePresence">
                <h3 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-wide mb-5">Bedside Presence</h3>
                <SectionLabel text="What does this look like at your organization?" />

                <label className="block text-sm font-medium text-black mb-2">Is increasing time at the bedside a stated organizational priority?</label>
                <RadioGroup
                  options={[
                    { value: 'conversation', label: 'It comes up in conversation but isn\'t formalized' },
                    { value: 'leadership_priority', label: 'It\'s a nursing leadership priority' },
                    { value: 'org_quality_goal', label: 'It\'s part of organizational quality or experience goals' },
                  ]}
                  value={inputs.bedsidePresence.bedsidePriority}
                  onChange={v => setInputs(prev => ({ ...prev, bedsidePresence: { ...prev.bedsidePresence, bedsidePriority: v as any } }))}
                  testPrefix="radio-bedside-priority"
                />

                <label className="block text-sm font-medium text-black mb-2 mt-5">Are you currently measuring bedside time or direct care hours?</label>
                <RadioGroup
                  options={[
                    { value: 'no', label: 'No' },
                    { value: 'informal', label: 'Informally — observation or estimation' },
                    { value: 'yes', label: 'Yes — tracked through technology or time studies' },
                  ]}
                  value={inputs.bedsidePresence.measuringBedside}
                  onChange={v => setInputs(prev => ({ ...prev, bedsidePresence: { ...prev.bedsidePresence, measuringBedside: v as any } }))}
                  testPrefix="radio-measuring-bedside"
                />

                <div className="mt-4">
                  <label className="block text-sm font-medium text-black mb-1">Estimated hours per shift nurses spend on documentation (all types)</label>
                  <div className="flex items-center gap-1 max-w-[200px]">
                    <FormattedNumberInput
                      value={inputs.bedsidePresence.docHoursPerShift}
                      onChange={v => setInputs(prev => ({ ...prev, bedsidePresence: { ...prev.bedsidePresence, docHoursPerShift: v } }))}
                      placeholder="e.g. 2.5"
                      data-testid="input-doc-hours"
                    />
                    <span className="text-sm text-[#888]">hrs</span>
                  </div>
                  <BenchmarkPill text="Most organizations report 2-3 hours per shift." />
                </div>
              </motion.div>
            )}

            {selectedPriorities.includes('docQuality') && (
              <motion.div variants={staggerItem} className="bg-[#F5F0EB] rounded-xl p-6 md:p-8" data-testid="section-docQuality">
                <h3 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-wide mb-5">Documentation Quality</h3>
                <SectionLabel text="Where have you identified quality concerns?" />
                <CheckboxGroup
                  items={DOC_QUALITY_CONCERNS}
                  checked={inputs.docQuality.concerns}
                  onChange={v => setInputs(prev => ({ ...prev, docQuality: { ...prev.docQuality, concerns: v } }))}
                  testPrefix="check-quality-concern"
                />

                <label className="block text-sm font-medium text-black mb-2 mt-5">Are you currently measuring documentation quality?</label>
                <RadioGroup
                  options={[
                    { value: 'no', label: 'No — we know there are gaps but haven\'t measured' },
                    { value: 'informal', label: 'Informally — spot checks and anecdotal feedback' },
                    { value: 'yes', label: 'Yes — tracked through audits, dashboards, or reviews' },
                  ]}
                  value={inputs.docQuality.measuringQuality}
                  onChange={v => setInputs(prev => ({ ...prev, docQuality: { ...prev.docQuality, measuringQuality: v as any } }))}
                  testPrefix="radio-measuring-quality"
                />
              </motion.div>
            )}

            {selectedPriorities.includes('futureReadiness') && (
              <motion.div variants={staggerItem} className="bg-[#F5F0EB] rounded-xl p-6 md:p-8" data-testid="section-futureReadiness">
                <h3 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-wide mb-5">Future Readiness</h3>
                <SectionLabel text="What are you working toward?" />
                <CheckboxGroup
                  items={FUTURE_INITIATIVES}
                  checked={inputs.futureReadiness.initiatives}
                  onChange={v => setInputs(prev => ({ ...prev, futureReadiness: { ...prev.futureReadiness, initiatives: v } }))}
                  testPrefix="check-future-initiative"
                />

                <label className="block text-sm font-medium text-black mb-2 mt-5">How would you describe your nursing program's technology maturity?</label>
                <RadioGroup
                  options={[
                    { value: 'early', label: 'Early — still primarily paper or basic EHR workflows' },
                    { value: 'developing', label: 'Developing — using EHR effectively, exploring innovation' },
                    { value: 'advanced', label: 'Advanced — actively piloting new technology and AI' },
                    { value: 'leading', label: 'Leading — technology is embedded in nursing strategy' },
                  ]}
                  value={inputs.futureReadiness.techMaturity}
                  onChange={v => setInputs(prev => ({ ...prev, futureReadiness: { ...prev.futureReadiness, techMaturity: v as any } }))}
                  testPrefix="radio-tech-maturity"
                />
              </motion.div>
            )}
          </div>

          <div className="mt-8">
            <StepFooter
              onBack={onBack}
              onNext={onNext}
              nextLabel="See Your Strategic Picture"
              nextTestId="button-nursing-next-3"
              backTestId="button-nursing-back-3"
            />
          </div>
        </motion.div>

        <motion.aside
          className="w-full lg:w-[300px] lg:sticky lg:top-24 self-start"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <div className="bg-[#1A1A1A] text-white rounded-xl p-6">
            <p className="text-[9px] font-semibold uppercase tracking-[2px] text-[#EA2C00] mb-4">
              Estimated Impact
            </p>
            <div className="h-px bg-white/10 mb-4" />

            <div className="space-y-4">
              {selectedPriorities.includes('retention') && (
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-[1.5px] mb-1">Nurse Retention</p>
                  {retentionImpact.totalCost > 0 ? (
                    <div>
                      <p className="text-sm font-bold text-white" data-testid="text-retention-cost">{fmtDollar(retentionImpact.totalCost)} in annual turnover cost at your organization</p>
                      <p className="text-[11px] text-white/50 mt-1">{retentionImpact.departures} nurses replaced per year at {fmtDollar(inputs.retention.replacementCost)} each</p>
                      {inputs.retention.interventions.length > 0 && (
                        <p className="text-[11px] text-white/40 mt-0.5">{inputs.retention.interventions.length} intervention(s) active</p>
                      )}
                      <p className="text-[10px] text-white/30 font-mono mt-2">departures = {baseline.nurseFTEs} x {inputs.retention.turnoverRate}%</p>
                      <p className="text-[10px] text-white/30 font-mono">totalCost = {retentionImpact.departures} x {fmtDollar(inputs.retention.replacementCost)}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-white/40 italic">Enter turnover rate and cost to see impact</p>
                  )}
                </div>
              )}

              {selectedPriorities.includes('staffingCosts') && (
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-[1.5px] mb-1">Staffing Costs</p>
                  {(otNarrative || staffingImpact.annualAgency > 0) ? (
                    <div>
                      {otNarrative && (
                        <p className="text-xs text-white/70 leading-relaxed" data-testid="text-ot-narrative">{otNarrative}</p>
                      )}
                      {staffingImpact.annualAgency > 0 && (
                        <p className="text-sm font-bold text-white mt-1" data-testid="text-agency-spend">{fmtDollar(staffingImpact.annualAgency)} in annual agency spend</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-white/40 italic">Select cost pressures and enter details</p>
                  )}
                </div>
              )}

              {selectedPriorities.includes('wellbeing') && (
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-[1.5px] mb-1">Nurse Wellbeing</p>
                  {inputs.wellbeing.pressures.length > 0 ? (
                    <div>
                      <p className="text-xs text-white/70">{inputs.wellbeing.pressures.length} area(s) where wellbeing pressure is visible</p>
                      {inputs.wellbeing.surveyStatus === 'structured' && inputs.wellbeing.surveyFindings.length > 0 && (
                        <p className="text-xs text-white/50 mt-1">Survey findings: {inputs.wellbeing.surveyFindings.length} finding(s)</p>
                      )}
                      {inputs.wellbeing.surveyStatus === '' && (
                        <p className="text-[11px] text-white/30 mt-1">A structured survey would establish a baseline for understanding the scope.</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-white/40 italic">Select where pressure is showing up</p>
                  )}
                </div>
              )}

              {selectedPriorities.includes('bedsidePresence') && (
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-[1.5px] mb-1">Bedside Presence</p>
                  {bedsideImpact.annualDocHours > 0 ? (
                    <div>
                      <p className="text-sm font-bold text-white" data-testid="text-annual-doc-hours">{bedsideImpact.annualDocHours.toLocaleString()} hours annually on documentation</p>
                      <p className="text-[10px] text-white/30 font-mono mt-2">annualDocHours = {inputs.bedsidePresence.docHoursPerShift} x {baseline.nurseFTEs} x 260</p>
                      <p className="text-[11px] text-white/40 mt-1">Time redirected to the bedside is time redirected to patients.</p>
                    </div>
                  ) : (
                    <p className="text-xs text-white/40 italic">Enter documentation hours per shift</p>
                  )}
                </div>
              )}

              {selectedPriorities.includes('docQuality') && (
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-[1.5px] mb-1">Documentation Quality</p>
                  {inputs.docQuality.concerns.length > 0 ? (
                    <div>
                      <p className="text-xs text-white/70">{inputs.docQuality.concerns.length} quality concern(s) identified</p>
                      {inputs.docQuality.measuringQuality === 'yes' && <p className="text-xs text-white/50 mt-0.5">Actively tracking quality metrics</p>}
                      {inputs.docQuality.measuringQuality === 'informal' && <p className="text-xs text-white/50 mt-0.5">Informal monitoring in place</p>}
                      {inputs.docQuality.measuringQuality === 'no' && <p className="text-xs text-white/50 mt-0.5">Gaps identified but not yet formally measured</p>}
                    </div>
                  ) : (
                    <p className="text-xs text-white/40 italic">Select quality concerns</p>
                  )}
                </div>
              )}

              {selectedPriorities.includes('futureReadiness') && (
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-[1.5px] mb-1">Future Readiness</p>
                  {inputs.futureReadiness.initiatives.length > 0 ? (
                    <div>
                      <p className="text-xs text-white/70">{inputs.futureReadiness.initiatives.length} strategic initiative(s)</p>
                      {inputs.futureReadiness.techMaturity && (
                        <p className="text-xs text-white/50 mt-0.5">Technology maturity: {inputs.futureReadiness.techMaturity}</p>
                      )}
                      <p className="text-[11px] text-white/30 mt-1">Structured, complete documentation is the foundation for every initiative you identified.</p>
                    </div>
                  ) : (
                    <p className="text-xs text-white/40 italic">Select strategic initiatives</p>
                  )}
                </div>
              )}
            </div>

            <div className="h-px bg-white/10 my-4" />
            <p className="text-[10px] text-white/30 italic">Estimates based on your inputs. Individual results vary.</p>
            <p className="text-[9px] text-white/20 mt-2">{RESEARCH_NOTE}</p>
          </div>
        </motion.aside>
      </motion.div>
    </div>
  );
}
