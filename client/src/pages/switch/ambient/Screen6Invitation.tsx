import { useState, useMemo } from "react";
import { ArrowRight, Download, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { DS } from "./designTokens";
import { Button } from "@/components/ui/button";
import { useAssessment } from "@/lib/assessment";
import { calculateAmbientScore, formatDollar, formatDollarFull } from "./ambientCalculator";
import {
  generateAmbientAssessmentPDF,
  opportunityText,
  type AmbientAssessmentPDFData,
} from "@/lib/ambient-assessment-pdf";
import {
  ACTIVATION_LABELS,
  scoreToActivationLevel,
  type Domain,
} from "./domainCalculations";

interface Screen6Props {
  onBack: () => void;
  onBackToJourney?: () => void;
}

const DOMAIN_NAMES: Record<string, string> = {
  capacity: 'Capacity Creation',
  revenue: 'Revenue Integrity',
  workforce: 'Workforce Stability',
  risk: 'Risk & Compliance',
};

const DOMAIN_OPS: Record<string, { meaning: string; action: string }> = {
  capacity: {
    meaning: 'Your utilization gap represents clinical supply that exists in your operations but never reaches your enterprise.',
    action: 'Closing it requires systematic adoption infrastructure \u2014 not training.',
  },
  revenue: {
    meaning: 'Your efficiency gap compounds across every documented encounter, affecting coding accuracy and reimbursement integrity.',
    action: 'Closing it requires deeper workflow integration at the documentation layer.',
  },
  workforce: {
    meaning: 'After-hours documentation burden is a direct input to turnover risk and premium labor cost.',
    action: 'Closing it requires reducing documentation time to below the burnout threshold.',
  },
  risk: {
    meaning: 'Your documentation defensibility posture creates structural exposure in audit, quality reporting, and automation readiness.',
    action: 'Closing it requires structured, defensible notes produced at scale.',
  },
};

export default function Screen6Invitation({ onBack, onBackToJourney }: Screen6Props) {
  const { state } = useAssessment();
  const { inputs } = state;

  const result = useMemo(() => calculateAmbientScore(
    inputs.providers, inputs.annualEncounters,
    inputs.utilization || 45, inputs.timeSavedPerEncounter || 2.0,
    inputs.dataMode,
  ), [inputs]);

  const [showForm, setShowForm] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: '', org: '', title: '', email: '' });
  const [isExporting, setIsExporting] = useState(false);

  const providers = inputs.providers || 0;
  const annualEncounters = inputs.annualEncounters || 0;
  const utilization = inputs.utilization || 45;
  const timeSavings = inputs.timeSavedPerEncounter || 2.0;

  const HAIRCUT = 0.60;

  const domainData = useMemo(() => {
    const domains: Array<Domain> = ['capacity', 'revenue', 'workforce', 'risk'];
    const scores: Record<string, number> = {
      capacity: inputs.capacityScore || 0,
      revenue: inputs.revenueScore || 0,
      workforce: inputs.workforceScore || 0,
      risk: inputs.riskScore || 0,
    };
    const gaps: Record<string, number> = {
      capacity: inputs.capacityGap || 0,
      revenue: inputs.revenueGap || 0,
      workforce: inputs.workforceGap || 0,
      risk: inputs.riskGap || 0,
    };

    const result: Record<string, { activationLevel: 1|2|3|4; activationLabel: string; score: number; gapValue: number; primaryOpportunity: string }> = {};
    for (const d of domains) {
      const level = scoreToActivationLevel(d, scores[d]);
      result[d] = {
        activationLevel: level,
        activationLabel: ACTIVATION_LABELS[d][level],
        score: scores[d],
        gapValue: Math.round(gaps[d] * HAIRCUT),
        primaryOpportunity: opportunityText[d]?.[level] || '',
      };
    }
    return result;
  }, [inputs]);

  const displayedTotal = useMemo(() => {
    const totalGap = (inputs.capacityGap || 0) + (inputs.revenueGap || 0) +
      (inputs.workforceGap || 0) + (inputs.riskGap || 0);
    return Math.round(totalGap * HAIRCUT);
  }, [inputs]);

  const displayedMonthly = Math.round(displayedTotal / 12);
  const displayedDaily = Math.round(displayedTotal / 365);

  const topDomainName = DOMAIN_NAMES[result.topDomain] || 'Capacity Creation';
  const topDomainOps = DOMAIN_OPS[result.topDomain];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const dt = displayedTotal;
      const pdfData: AmbientAssessmentPDFData = {
        organizationName: formData.org || "Your Organization",
        preparedBy: formData.name || undefined,
        assessmentDate: new Date().toLocaleDateString("en-US", {
          month: "long", day: "numeric", year: "numeric"
        }),
        providers,
        annualEncounters,
        utilization,
        timeSavings,
        documentationScore: result.score,
        totalAnnualGap: dt,
        monthlyGap: displayedMonthly,
        dailyGap: displayedDaily,
        actNow3yr: Math.round(dt * 3.45),
        wait6mo3yr: Math.round(dt * (3.45 - 0.42)),
        wait12mo3yr: Math.round(dt * (3.45 - 0.95)),
        permanentlyLost6mo: Math.round(dt * 0.42),
        permanentlyLost12mo: Math.round(dt * 0.95),
        domains: {
          capacity: domainData.capacity as any,
          revenue: domainData.revenue as any,
          workforce: domainData.workforce as any,
          risk: domainData.risk as any,
        },
      };
      await generateAmbientAssessmentPDF(pdfData);
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="font-[Manrope,sans-serif] pt-[72px] pb-20">
      <div className="max-w-lg mx-auto px-4">

        <button
          onClick={onBack}
          className="text-sm text-[#888] hover:text-[#1A1A1A] transition-colors mb-8"
          data-testid="button-back"
        >
          Back
        </button>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <p className="font-abridge text-[11px] font-semibold uppercase tracking-[2px] text-[#9B9B9B] mb-6" data-testid="text-screen6-label">
            Your Assessment
          </p>

          <div className="bg-[#F5F0EB] border border-[#E8E0D8] rounded-xl p-6 mb-10" data-testid="card-verdict-numbers">
            <div className="flex items-start justify-between gap-8 flex-wrap">
              <div>
                <p className="text-[13px] text-[#9B9B9B] font-[Manrope,sans-serif] mb-1">Your Score</p>
                <p className="text-[36px] font-bold text-[#1A1A1A] font-[Manrope,sans-serif]">
                  {result.score} <span className="text-[20px] text-[#9B9B9B] font-normal">/ 100</span>
                </p>
              </div>
              <div>
                <p className="text-[13px] text-[#9B9B9B] font-[Manrope,sans-serif] mb-1">Top Quartile</p>
                <p className="text-[36px] font-bold text-[#1A1A1A] font-[Manrope,sans-serif]">
                  71 <span className="text-[20px] text-[#9B9B9B] font-normal">/ 100</span>
                </p>
              </div>
            </div>

            <div className="w-full h-1.5 bg-[#EDEAE5] rounded-full overflow-hidden relative mt-5 mb-3">
              <div
                className="absolute left-0 top-0 h-full bg-[#EA2C00] rounded-full"
                style={{ width: `${Math.min(result.score, 100)}%` }}
              />
            </div>

            <p className="text-[15px] text-[#4B4B4B] leading-[1.6] font-[Manrope,sans-serif]" data-testid="text-capture-line">
              You are capturing approximately {result.score}% of the enterprise value flowing through your documentation infrastructure.
            </p>
          </div>
        </motion.div>

        <div className="h-px bg-[#E8E0D8] mb-10" />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <p className="font-abridge text-[11px] font-semibold uppercase tracking-[2px] text-[#9B9B9B] mb-4">
            Highest-Leverage Opportunity
          </p>

          <div className="bg-[#F5F0EB] border border-[#E8E0D8] border-l-[3px] border-l-[#EA2C00] rounded-xl p-6 mb-14" data-testid="card-top-opportunity">
            <p className="text-[20px] font-bold text-[#1A1A1A] font-[Manrope,sans-serif] mb-2">{topDomainName}</p>
            <p className="text-[32px] font-bold text-[#EA2C00] font-[Manrope,sans-serif] mb-4">{formatDollarFull(result.topDomainValue)} annually</p>
            <div className="h-px bg-[#E8E0D8] mb-4" />
            <p className="text-[15px] text-[#4B4B4B] leading-[1.75] font-[Manrope,sans-serif]">
              {topDomainOps.meaning} {topDomainOps.action}
            </p>
          </div>
        </motion.div>

        <div className="h-px bg-[#E8E0D8] mb-14" />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="text-center mb-8">
            <h2 className="text-[32px] font-bold text-[#1A1A1A] leading-[1.3] max-w-[400px] mx-auto" data-testid="text-invitation-headline">
              Would you like to see what documentation intelligence looks like at your scale?
            </h2>
            <p className="text-[15px] text-[#9B9B9B] leading-[1.75] mt-5 font-[Manrope,sans-serif]">
              This is not a product demonstration.<br />
              It is a 30-minute working session.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
        >
          {!showForm && !formSubmitted && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
              <Button
                onClick={() => setShowForm(true)}
                className="bg-[#EA2C00] hover:bg-[#D12600] text-white border-[#EA2C00] rounded-full px-6 font-medium gap-2 w-full sm:w-auto"
                data-testid="button-request-session"
              >
                Request a Working Session
                <ArrowRight size={16} />
              </Button>
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="rounded-full border border-[#E8E0D8] bg-transparent px-6 py-3 text-sm font-medium text-[#4B4B4B] transition-colors hover:bg-[#F5F0EB] inline-flex items-center gap-2 w-full sm:w-auto justify-center disabled:opacity-70 disabled:cursor-wait"
                data-testid="button-export"
              >
                {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                {isExporting ? 'Generating PDF...' : 'Export My Assessment'}
              </button>
            </div>
          )}

          {showForm && !formSubmitted && (
            <form onSubmit={handleSubmit} className="bg-[#F5F0EB] border border-[#E8E0D8] rounded-xl p-6 mb-14" data-testid="form-contact">
              <div className="flex flex-col gap-4">
                <input
                  type="text" placeholder="Name" value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-[#E8E0D8] bg-white px-4 py-3.5 text-lg font-semibold text-[#1A1A1A] outline-none focus:border-[#EA2C00] transition-colors"
                  data-testid="input-name"
                />
                <input
                  type="text" placeholder="Organization" value={formData.org}
                  onChange={(e) => setFormData({ ...formData, org: e.target.value })}
                  className="w-full rounded-lg border border-[#E8E0D8] bg-white px-4 py-3.5 text-lg font-semibold text-[#1A1A1A] outline-none focus:border-[#EA2C00] transition-colors"
                  data-testid="input-org"
                />
                <input
                  type="text" placeholder="Title" value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-lg border border-[#E8E0D8] bg-white px-4 py-3.5 text-lg font-semibold text-[#1A1A1A] outline-none focus:border-[#EA2C00] transition-colors"
                  data-testid="input-title"
                />
                <input
                  type="email" placeholder="Email" value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-lg border border-[#E8E0D8] bg-white px-4 py-3.5 text-lg font-semibold text-[#1A1A1A] outline-none focus:border-[#EA2C00] transition-colors"
                  data-testid="input-email"
                />
              </div>
              <Button
                type="submit"
                className="bg-[#EA2C00] hover:bg-[#D12600] text-white border-[#EA2C00] rounded-full px-6 font-medium gap-2 w-full mt-6"
                data-testid="button-submit"
              >
                Submit
                <ArrowRight size={16} />
              </Button>
            </form>
          )}

          {formSubmitted && (
            <div className="text-center bg-[#F5F0EB] border border-[#E8E0D8] rounded-xl p-6 mb-14" data-testid="form-confirmation">
              <p className="text-[17px] text-[#1A1A1A] font-semibold mb-3 font-[Manrope,sans-serif]">
                We'll be in touch within one business day.
              </p>
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="text-[15px] text-[#4B4B4B] underline underline-offset-2 font-medium bg-transparent border-none font-[Manrope,sans-serif] disabled:cursor-wait"
                data-testid="button-copy-link"
              >
                {isExporting ? 'Generating PDF...' : 'Download your assessment'}
              </button>
            </div>
          )}
        </motion.div>

        <p className="text-center text-[13px] text-[#9B9B9B] leading-[1.6] font-[Manrope,sans-serif]">
          Conservative estimates based on Abridge deployment benchmarks.<br />
          Methodology available on request.
        </p>
      </div>
    </div>
  );
}
