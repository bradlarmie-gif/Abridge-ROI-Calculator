import { useState, useMemo } from "react";
import { Download, ArrowRight, Check } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { staggerContainer, staggerItem } from "@/components/PageTransition";
import { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";
import type { NursingPriority, NursingBaselineInputs } from "./nursingTypes";
import { PRIORITY_CONFIGS } from "./nursingTypes";
import { getRecommendedFocus, deriveShiftsPerYear } from "./nursingCalculations";
import { generateNursingPdf } from "./nursingPdf";

interface NextStepScreenProps {
  baseline: NursingBaselineInputs;
  selectedPriorities: NursingPriority[];
  onBack: () => void;
}

export default function NursingNextStepScreen({ baseline, selectedPriorities, onBack }: NextStepScreenProps) {
  const [showExportModal, setShowExportModal] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [facilitator, setFacilitator] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const recommendedFocus = useMemo(() => getRecommendedFocus(selectedPriorities), [selectedPriorities]);
  const shiftsPerYear = deriveShiftsPerYear(baseline);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await generateNursingPdf(baseline, selectedPriorities, orgName || "Your Organization", facilitator);
    } catch (e) {
      console.error("PDF export failed:", e);
    } finally {
      setIsExporting(false);
      setShowExportModal(false);
    }
  };

  return (
    <div className={STEP_FOOTER_SPACER_CLASS}>
      <motion.div
        className="flex flex-col lg:flex-row gap-10"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <motion.div className="flex-1 max-w-[700px]" variants={staggerItem}>
          <p className="text-[11px] font-semibold uppercase tracking-[2px] text-[#EA2C00] mb-2">
            Next Step
          </p>
          <h1
            className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight"
            data-testid="text-nursing-nextstep-headline"
          >
            Ready to Build the Case?
          </h1>
          <p className="text-base text-[#888888] mb-3 max-w-xl leading-relaxed">
            You've identified what your nursing program is trying to solve and where ambient documentation fits.
            The next step is modeling the numbers — focused on the pathway(s) that matter most for your organization.
          </p>

          {recommendedFocus.length > 0 && (
            <div className="mb-8">
              <p className="text-xs font-semibold text-[#888888] uppercase tracking-[1.5px] mb-2">
                Your recommended ROI focus:
              </p>
              {recommendedFocus.map((f, i) => (
                <p key={i} className="text-sm text-[#1A1A1A] mb-1">
                  {f.startsWith('Supporting') ? f : `→ ${f}`}
                </p>
              ))}
            </div>
          )}

          <motion.div variants={staggerItem}>
            <div className="bg-[#F5F0EB] rounded-xl p-8">
              <p className="text-sm text-[#666666] leading-relaxed mb-6">
                We offer a focused working session where we model these specific pathways together with your organization's data.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  className="bg-[#EA2C00] hover:bg-[#D12600] text-white rounded-full px-6 font-medium gap-2 flex-1"
                  size="lg"
                  onClick={() => window.open("mailto:partnerships@abridge.com?subject=Nursing Assessment — Working Session Request", "_blank")}
                  data-testid="button-request-session"
                >
                  Build My ROI Model
                  <ArrowRight className="w-4 h-4" />
                </Button>

                <Button
                  variant="outline"
                  className="border-[#1A1A1A] text-[#1A1A1A] rounded-full px-6 font-medium gap-2 flex-1"
                  size="lg"
                  onClick={() => setShowExportModal(true)}
                  data-testid="button-export-assessment"
                >
                  <Download className="w-4 h-4" />
                  Export My Assessment
                </Button>
              </div>
            </div>
          </motion.div>

          <motion.div variants={staggerItem} className="mt-6">
            <div className="text-center">
              <button
                onClick={onBack}
                className="text-sm text-[#888] hover:text-[#1A1A1A] transition-colors"
                data-testid="button-nursing-back-nextstep"
              >
                Back to Strategic Alignment
              </button>
            </div>
          </motion.div>
        </motion.div>

        <motion.aside
          className="w-full lg:w-[300px] lg:sticky lg:top-24 self-start"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <div className="bg-[#1A1A1A] text-white rounded-xl p-6">
            <p className="text-[9px] font-semibold uppercase tracking-[2px] text-[#EA2C00] mb-4">
              Your Priorities
            </p>
            <div className="h-px bg-white/10 mb-4" />

            <div className="space-y-2 mb-4">
              {PRIORITY_CONFIGS.map(config => {
                const isSelected = selectedPriorities.includes(config.id);
                return (
                  <div key={config.id} className="flex items-center gap-2">
                    <div className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-[#EA2C00]' : 'border border-white/20'}`}>
                      {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <p className={`text-sm ${isSelected ? 'text-white/80' : 'text-white/30'}`}>
                      {config.title}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="h-px bg-white/10 my-4" />
            <p className="text-[9px] font-semibold uppercase tracking-[2px] text-white/40 mb-3">
              Your Baseline
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-white/40">Staffed beds</span>
                <span className="text-white font-medium">{baseline.staffedBeds.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Nurse FTEs</span>
                <span className="text-white font-medium">{baseline.nurseFTEs.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Occupancy</span>
                <span className="text-white font-medium">{baseline.bedOccupancy}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Shifts / year</span>
                <span className="text-white font-medium">{shiftsPerYear.toLocaleString()}</span>
              </div>
            </div>

            {recommendedFocus.length > 0 && (
              <>
                <div className="h-px bg-white/10 my-4" />
                <p className="text-[9px] font-semibold uppercase tracking-[2px] text-white/40 mb-3">
                  Recommended Focus
                </p>
                <div className="space-y-1.5">
                  {recommendedFocus.map((f, i) => (
                    <p key={i} className={`text-xs ${f.startsWith('Supporting') ? 'text-white/40' : 'text-white/70'}`}>
                      {f.startsWith('Supporting') ? f : `→ ${f}`}
                    </p>
                  ))}
                </div>
              </>
            )}
          </div>
        </motion.aside>
      </motion.div>

      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl"
          >
            <h3 className="text-lg font-bold text-[#1A1A1A] mb-1">Export Assessment</h3>
            <p className="text-sm text-[#888888] mb-6">Add details to personalize the PDF.</p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-black mb-1.5">Organization name</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Regional Health System"
                  className="w-full border border-[#D1D5DB] rounded-lg px-4 py-2.5 text-sm focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00]/20 outline-none"
                  data-testid="input-export-org"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1.5">Facilitator name (optional)</label>
                <input
                  type="text"
                  value={facilitator}
                  onChange={(e) => setFacilitator(e.target.value)}
                  placeholder="e.g. Jane Smith"
                  className="w-full border border-[#D1D5DB] rounded-lg px-4 py-2.5 text-sm focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00]/20 outline-none"
                  data-testid="input-export-facilitator"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 rounded-full"
                onClick={() => setShowExportModal(false)}
                data-testid="button-export-cancel"
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-[#EA2C00] hover:bg-[#D12600] text-white rounded-full gap-2"
                onClick={handleExport}
                disabled={isExporting}
                data-testid="button-export-confirm"
              >
                {isExporting ? "Generating..." : "Download PDF"}
                {!isExporting && <Download className="w-4 h-4" />}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
