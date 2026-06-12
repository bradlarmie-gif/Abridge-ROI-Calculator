import { useState } from "react";
import { Download, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { staggerContainer, staggerItem } from "@/components/PageTransition";
import { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";
import type { NursingPriority, NursingBaselineInputs, AllPriorityInputs } from "./nursingTypes";
import { generateNursingPdf } from "./nursingPdf";

interface NextStepScreenProps {
  baseline: NursingBaselineInputs;
  selectedPriorities: NursingPriority[];
  inputs: AllPriorityInputs;
  onBack: () => void;
}

export default function NursingNextStepScreen({ baseline, selectedPriorities, inputs, onBack }: NextStepScreenProps) {
  const [showExportModal, setShowExportModal] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [facilitator, setFacilitator] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const [exportError, setExportError] = useState<string | false>(false);

  const handleExport = async () => {
    setIsExporting(true);
    setExportError(false);
    try {
      await generateNursingPdf(baseline, selectedPriorities, inputs, orgName || "Your Organization", facilitator);
      setShowExportModal(false);
    } catch (e: any) {
      const msg = e?.message || String(e);
      console.error("PDF export failed:", msg, e);
      const isChunkError = msg.includes("dynamically imported module") || msg.includes("Failed to fetch") || msg.includes("Loading chunk");
      setExportError(
        isChunkError
          ? "A newer version of the app is available. Please refresh the page (Ctrl+Shift+R) and try again."
          : msg || "Unable to generate PDF. Please try again."
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={STEP_FOOTER_SPACER_CLASS}>
      <motion.div
        className="max-w-[700px] mx-auto"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <motion.div className="text-center mb-10" variants={staggerItem}>
          <p className="text-xs font-semibold uppercase tracking-[2px] text-[#EA2C00] mb-2">
            What Comes Next
          </p>
          <h1
            className="text-2xl md:text-3xl font-bold text-black mb-3 font-abridge uppercase tracking-tight"
            data-testid="text-nursing-nextstep-headline"
          >
            Your Assessment Is Complete
          </h1>
        </motion.div>

        <motion.div variants={staggerItem} className="mb-8">
          <div className="bg-[#F5F0EB] rounded-xl p-8">
            <p className="text-sm text-[#333333] leading-relaxed mb-6">
              You now have a clearer picture of where your nursing program is under pressure and how documentation burden connects to your priorities.
            </p>
            <p className="text-sm text-[#666666] leading-relaxed mb-6">
              Whether you're evaluating technology, building a business case internally, or just trying to understand the landscape — this assessment is yours to use however it's most helpful.
            </p>

            <Button
              variant="outline"
              className="border-[#1A1A1A] text-[#1A1A1A] rounded-full px-6 font-medium gap-2 w-full sm:w-auto"
              size="lg"
              onClick={() => setShowExportModal(true)}
              data-testid="button-export-assessment"
            >
              <Download className="w-4 h-4" />
              Export My Assessment
            </Button>
          </div>
        </motion.div>

        <motion.div variants={staggerItem} className="mb-8">
          <div className="bg-[#F5F0EB] rounded-xl p-8">
            <p className="text-sm text-[#666666] leading-relaxed mb-6">
              If this raised questions or surfaced areas you'd like to explore further, we're always happy to continue the conversation.
            </p>

            <Button
              className="bg-[#EA2C00] hover:bg-[#D12600] text-white rounded-full px-6 font-medium gap-2 w-full sm:w-auto"
              size="lg"
              onClick={() => window.open("mailto:partnerships@abridge.com?subject=Nursing Assessment — Conversation Request", "_blank")}
              data-testid="button-schedule-conversation"
            >
              Continue the Conversation
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>

        <motion.div variants={staggerItem}>
          <div className="text-center">
            <button
              onClick={onBack}
              className="text-sm text-[#888] hover:text-[#1A1A1A] transition-colors"
              data-testid="button-nursing-back-nextstep"
            >
              Back to Recommended Focus
            </button>
          </div>
        </motion.div>
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

            {exportError && (
              <p className="text-sm text-red-600 mb-3" data-testid="text-export-error">{exportError}</p>
            )}

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
