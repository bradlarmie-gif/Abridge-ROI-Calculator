import { useState } from "react";
import { Download, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { staggerContainer, staggerItem } from "@/components/PageTransition";
import { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";
import type { NursingInputs } from "./nursingTypes";
import { generateNursingPdf } from "./nursingPdf";

interface Screen5Props {
  inputs: NursingInputs;
  onBack: () => void;
}

export default function NursingScreen5NextStep({ inputs, onBack }: Screen5Props) {
  const [showExportModal, setShowExportModal] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [facilitator, setFacilitator] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await generateNursingPdf(inputs, orgName || "Your Organization", facilitator);
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
        className="max-w-[700px] mx-auto"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <motion.div className="text-center mb-10" variants={staggerItem}>
          <h1
            className="text-2xl md:text-3xl font-bold text-black mb-3 font-abridge uppercase tracking-tight"
            data-testid="text-nursing-nextstep-headline"
          >
            Ready to Go Deeper?
          </h1>
          <p className="text-base text-[#888888] max-w-xl mx-auto leading-relaxed">
            You've identified where documentation burden is creating the most cost and risk in your nursing program. 
            The next step is exploring what those pathways look like with real numbers — specific to your organization.
          </p>
        </motion.div>

        <motion.div variants={staggerItem} className="mb-8">
          <div className="bg-[#F5F0EB] rounded-xl p-8">
            <p className="text-sm text-[#666666] leading-relaxed mb-6">
              We offer a deeper working session where we model your highest-relevance pathways together. 
              It's strategic planning, not a product demonstration.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                className="bg-[#EA2C00] hover:bg-[#D12600] text-white rounded-full px-6 font-medium gap-2 flex-1"
                size="lg"
                onClick={() => window.open("mailto:partnerships@abridge.com?subject=Nursing Assessment — Working Session Request", "_blank")}
                data-testid="button-request-session"
              >
                Request a Working Session
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

        <motion.div variants={staggerItem}>
          <div className="text-center">
            <button
              onClick={onBack}
              className="text-sm text-[#888] hover:text-[#1A1A1A] transition-colors"
              data-testid="button-nursing-back-5"
            >
              Back to Summary
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
