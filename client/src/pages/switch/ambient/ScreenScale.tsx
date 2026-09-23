import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAssessment, assessmentActions } from "@/lib/assessment";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { selectWhenSettled } from "@/lib/selectOnFocus";

interface ScreenScaleProps {
  onNext: () => void;
  onBack: () => void;
}

export default function ScreenScale({ onNext, onBack }: ScreenScaleProps) {
  const { state, dispatch } = useAssessment();
  const { inputs } = state;
  const [q2Visible, setQ2Visible] = useState(false);
  const [q3Visible, setQ3Visible] = useState(false);
  const [utilSet, setUtilSet] = useState(inputs.utilization > 0);
  const [editingEncounters, setEditingEncounters] = useState(false);
  const [encountersOverridden, setEncountersOverridden] = useState(false);
  const [editEncountersRaw, setEditEncountersRaw] = useState('');
  const encountersInputRef = useRef<HTMLInputElement>(null);

  const provisioned = inputs.providersProvisioned || 0;
  const providers = inputs.providers || 0; // actively using
  const utilization = inputs.utilization || 0;
  const annualEncounters = inputs.annualEncounters || 0;

  // Auto-derive annualEncounters from provisioned × 3,000 (unless user overrode it)
  useEffect(() => {
    if (provisioned > 0 && !encountersOverridden) {
      dispatch(assessmentActions.updateInput('annualEncounters', provisioned * 3000));
      dispatch(assessmentActions.updateInput('encountersEstimated', true));
    }
  }, [provisioned, encountersOverridden]);

  // Focus the inline input when editing starts
  useEffect(() => {
    if (editingEncounters) {
      const staged = annualEncounters > 0 ? annualEncounters.toLocaleString() : '';
      setEditEncountersRaw(staged);
      selectWhenSettled(encountersInputRef.current, staged);
    }
  }, [editingEncounters]);

  const commitEncountersEdit = () => {
    const parsed = parseInt(editEncountersRaw.replace(/,/g, ''), 10);
    if (!isNaN(parsed) && parsed > 0) {
      dispatch(assessmentActions.updateInput('annualEncounters', parsed));
      dispatch(assessmentActions.updateInput('encountersEstimated', false));
      setEncountersOverridden(true);
    }
    setEditingEncounters(false);
  };

  const resetEncountersToEstimate = () => {
    dispatch(assessmentActions.updateInput('annualEncounters', provisioned * 3000));
    dispatch(assessmentActions.updateInput('encountersEstimated', true));
    setEncountersOverridden(false);
    setEditingEncounters(false);
  };

  // Progressive reveal
  useEffect(() => {
    if (provisioned > 0 && !q2Visible) {
      const t = setTimeout(() => setQ2Visible(true), 250);
      return () => clearTimeout(t);
    }
  }, [provisioned, q2Visible]);

  useEffect(() => {
    if (providers > 0 && !q3Visible) {
      const t = setTimeout(() => setQ3Visible(true), 250);
      return () => clearTimeout(t);
    }
  }, [providers, q3Visible]);

  const estimatedEncounters = useMemo(() => provisioned * 3000, [provisioned]);
  const activationRate = useMemo(() =>
    provisioned > 0 ? Math.round((providers / provisioned) * 100) : 0,
  [providers, provisioned]);
  const dormantProviders = useMemo(() => Math.max(0, provisioned - providers), [provisioned, providers]);
  const documentedEncounters = useMemo(
    () => Math.round(annualEncounters * (utilization / 100)),
    [annualEncounters, utilization]
  );

  const overProvisionedGuardrail = provisioned > 0 && providers > provisioned;

  const handleUtilChange = (val: number) => {
    dispatch(assessmentActions.updateInput('utilization', Math.min(100, Math.max(0, val))));
    if (!utilSet) setUtilSet(true);
  };

  const utilInsight = useMemo(() => {
    if (!utilSet || utilization === 0) return null;
    if (utilization < 30) return "Early-stage coverage — the assessment reflects where the rollout is today.";
    if (utilization < 60) return "Meaningful coverage underway across the active provider base.";
    if (utilization < 80) return "Strong utilization — most encounters with active providers are being captured.";
    return "High utilization — the active provider base is fully engaged.";
  }, [utilSet, utilization]);

  const canProceed = provisioned > 0 && providers > 0 && utilSet && utilization > 0;

  return (
  <>
    <div className={`flex flex-col pt-8 sm:pt-14 max-w-[720px] ${canProceed ? 'pb-28 sm:pb-32' : 'pb-12 sm:pb-16'}`}>

      <motion.p
        className="text-[10px] font-semibold text-[#EA2C00] uppercase tracking-[4px] mb-5 sm:mb-10"
        style={{ fontFamily: "'Manrope', sans-serif" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        Your Deployment Scale
      </motion.p>

      <motion.h1
        className="font-abridge uppercase text-[#1A1A1A] leading-[1.04] mb-6 sm:mb-10"
        style={{ fontSize: 'clamp(1.9rem, 5vw, 4.2rem)', maxWidth: '620px' }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        Tell us about<br />your deployment.
      </motion.h1>

      <motion.div
        className="bg-[#EA2C00] h-[2px] mb-8"
        initial={{ width: 0 }}
        animate={{ width: 44 }}
        transition={{ delay: 0.6, duration: 0.5, ease: 'easeOut' }}
      />

      <motion.div
        className="flex flex-col gap-6 sm:gap-10 max-w-lg"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.75, duration: 0.5 }}
      >

        {/* Q1: Provisioned providers */}
        <div>
          <p
            className="text-base font-semibold text-[#1A1A1A] mb-1 leading-snug"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            How many providers are provisioned on ambient?
          </p>
          <p
            className="text-sm text-[#777777] mb-4"
            style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}
          >
            Count everyone with a license — active or not.
          </p>
          <FormattedNumberInput
            value={provisioned}
            onChange={(v) => dispatch(assessmentActions.updateInput('providersProvisioned', v || 0))}
            placeholder="e.g. 200"
            className="w-full h-12 bg-white border-[#C8C0B5] rounded-xl text-base focus:border-[#1A1A1A]"
          />
          {provisioned > 0 && (
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-[#777777]" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
                ~
              </span>
              {editingEncounters ? (
                <input
                  ref={encountersInputRef}
                  type="text"
                  value={editEncountersRaw}
                  onChange={e => setEditEncountersRaw(e.target.value)}
                  onBlur={commitEncountersEdit}
                  onKeyDown={e => { if (e.key === 'Enter') commitEncountersEdit(); if (e.key === 'Escape') setEditingEncounters(false); }}
                  className="text-xs text-[#1A1A1A] font-medium bg-transparent outline-none border-b border-[#EA2C00]"
                  style={{ fontFamily: "'Manrope', sans-serif", width: '90px' }}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingEncounters(true)}
                  className="text-xs font-medium text-[#777777] hover:text-[#EA2C00] underline decoration-dotted underline-offset-2 cursor-pointer bg-transparent border-none p-0"
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                  {annualEncounters.toLocaleString()}
                </button>
              )}
              <span className="text-xs text-[#777777]" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
                encounters in scope
                {encountersOverridden
                  ? <> · <button type="button" onClick={resetEncountersToEstimate} className="underline decoration-dotted underline-offset-2 hover:text-[#EA2C00] cursor-pointer bg-transparent border-none p-0 text-xs" style={{ fontFamily: "'Manrope', sans-serif" }}>reset to estimate</button></>
                  : <> — {provisioned.toLocaleString()} × 3,000</>
                }
              </span>
            </div>
          )}
        </div>

        {/* Q2: Active providers */}
        <AnimatePresence>
          {(q2Visible || providers > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <p
                className="text-base font-semibold text-[#1A1A1A] mb-1 leading-snug"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                How many are actively using it today?
              </p>
              <p
                className="text-sm text-[#777777] mb-4"
                style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}
              >
                Providers who documented at least one encounter in the last 30 days.
              </p>
              <FormattedNumberInput
                value={providers}
                onChange={(v) => dispatch(assessmentActions.updateInput('providers', v || 0))}
                placeholder="e.g. 50"
                className="w-full h-12 bg-white border-[#C8C0B5] rounded-xl text-base focus:border-[#1A1A1A]"
              />
              {overProvisionedGuardrail && (
                <p className="mt-2 text-sm text-[#777777] italic" style={{ fontFamily: "'Manrope', sans-serif" }}>
                  More active than provisioned — want to double-check?
                </p>
              )}
              {providers > 0 && provisioned > 0 && !overProvisionedGuardrail && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-2 text-sm text-[#777777]"
                  style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}
                >
                  {activationRate}% activation rate
                  {dormantProviders > 0 && ` — ${dormantProviders.toLocaleString()} provisioned but not yet active`}
                </motion.p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Q3: Utilization % */}
        <AnimatePresence>
          {(q3Visible || utilSet) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <p
                className="text-base font-semibold text-[#1A1A1A] mb-1 leading-snug"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                What percentage of their encounters are documented with ambient?
              </p>
              <p
                className="text-sm text-[#777777] mb-4"
                style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}
              >
                Of encounters with active providers — your best estimate is fine.
              </p>
              <div className="flex items-center gap-3">
                <FormattedNumberInput
                  value={utilSet ? utilization : 0}
                  onChange={handleUtilChange}
                  placeholder=""
                  className="w-full h-12 bg-white border-[#C8C0B5] rounded-xl text-base focus:border-[#1A1A1A]"
                />
                <span
                  className="text-[#777777] text-base flex-shrink-0"
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                  %
                </span>
              </div>

              <AnimatePresence>
                {utilInsight && (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-3 text-sm italic text-[#777777] leading-relaxed"
                    style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}
                  >
                    {utilInsight}
                  </motion.p>
                )}
              </AnimatePresence>

              {utilSet && utilization === 0 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-2 text-sm text-[#777777] italic"
                  style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}
                >
                  Enter the percentage to continue — even an estimate is fine.
                </motion.p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>

    {/* Sticky completion bar */}
    <AnimatePresence>
      {canProceed && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-[#1A1A1A] border-t border-white/10"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          <div className="max-w-[860px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <p className="text-white font-bold leading-tight" style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)', fontFamily: "'Manrope', sans-serif" }}>
                {documentedEncounters.toLocaleString()} documented encounters generating data.
              </p>
              <p className="text-xs text-white/40" style={{ fontFamily: "'Manrope', sans-serif" }}>
                {providers.toLocaleString()} of {provisioned.toLocaleString()} provisioned active · {activationRate}% activation · {utilization}% documented
              </p>
            </div>
            <button
              type="button"
              onClick={onNext}
              className="flex-shrink-0 inline-flex items-center gap-2 bg-[#EA2C00] text-white rounded-full hover:bg-white hover:text-[#1A1A1A] transition-colors duration-300 border-none cursor-pointer"
              style={{
                fontFamily: "'Manrope', sans-serif",
                fontWeight: 600,
                fontSize: '0.875rem',
                letterSpacing: '0.3px',
                padding: '0.75rem 1.75rem',
              }}
            >
              Continue →
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </>
  );
}
