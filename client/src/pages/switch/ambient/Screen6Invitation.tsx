import { useState, useMemo } from "react";
import { ArrowRight, Download, Loader2, FileText, Check, X } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAssessment } from "@/lib/assessment";
import { formatDollar } from "./ambientCalculator";
import {
  generateAmbientAssessmentPDF,
  opportunityText,
  type AmbientAssessmentPDFData,
} from "@/lib/ambient-assessment-pdf";
import {
  ACTIVATION_LABELS,
  scoreToActivationLevel,
  DOMAIN_ORDER,
  DOMAIN_LABELS,
  type Domain,
  type ActivationLevel,
} from "./domainCalculations";

interface Screen6Props {
  onBack: () => void;
  onBackToJourney?: () => void;
}

const ROADMAP_TEXT: Record<Domain, Record<ActivationLevel, { line1: string; line2: string }>> = {
  capacity: {
    1: {
      line1: "You're recovering time but haven't quantified the total across your deployment.",
      line2: "Understanding your aggregate recovered capacity is the first step toward making strategic decisions about how to use it.",
    },
    2: {
      line1: "You've quantified your recovered capacity but haven't made operational changes to deploy it.",
      line2: "The organizations capturing the most value from recovered time are the ones who have intentionally redesigned how that time is used.",
    },
    3: {
      line1: "You've redesigned access and are generating measurable capacity value.",
      line2: "The next frontier is using recovered capacity as a planning input for hiring, expansion, and service line decisions.",
    },
    4: {
      line1: "Recovered capacity is embedded in your workforce planning.",
      line2: "Continue expanding and deepening measurement across the organization.",
    },
  },
  revenue: {
    1: {
      line1: "Your revenue cycle hasn't engaged with the documentation change.",
      line2: "The single highest-value conversation you can start is between your ambient deployment team and your CDI or coding leadership.",
    },
    2: {
      line1: "Your revenue cycle has noticed signals but hasn't measured the impact.",
      line2: "Moving from anecdotal observation to formal measurement is what turns signals into a financial story.",
    },
    3: {
      line1: "You've measured documentation-driven revenue impact.",
      line2: "Formalizing this as an ongoing, governed metric — not a one-time study — is what separates measurement from management.",
    },
    4: {
      line1: "Documentation quality is integrated into revenue cycle operations.",
      line2: "Continue expanding governance and connecting documentation quality to payer strategy.",
    },
  },
  workforce: {
    1: {
      line1: "Providers report less after-hours work but the broader impact isn't being tracked.",
      line2: "Combining operational measurement with clinician feedback gives your organization a complete picture of how burden reduction is landing.",
    },
    2: {
      line1: "You've measured in-clinic burden reduction and captured provider sentiment.",
      line2: "Understanding what turnover is costing your organization — and how much of it connects to documentation burden — is the next layer of insight.",
    },
    3: {
      line1: "You've quantified turnover exposure against documentation burden.",
      line2: "The long-term proof is in labor spend — tracking agency and locum costs against burden reduction over time.",
    },
    4: {
      line1: "Documentation burden reduction is showing up in your labor spend.",
      line2: "Continue validating the trend and connecting it to long-term workforce strategy.",
    },
  },
  risk: {
    1: {
      line1: "Your documentation is better but nothing downstream has changed.",
      line2: "Establishing any form of quality measurement — even informal — is the foundation for everything that follows.",
    },
    2: {
      line1: "You're monitoring documentation quality.",
      line2: "Connecting that quality to the workflows that depend on it — CDI, coding, quality reporting — is where operational value begins to surface.",
    },
    3: {
      line1: "You've connected downstream workflows to documentation quality.",
      line2: "The strategic opportunity is in making documentation quality a variable in organizational decisions — payer strategy, value-based care design, compliance governance.",
    },
    4: {
      line1: "Your documentation infrastructure is a strategic data asset.",
      line2: "Continue expanding its role in organizational strategy and positioning for next-generation AI applications.",
    },
  },
};

function getScoreSummaryLine(score: number): string {
  if (score <= 30) return "in the early stages of capturing ambient ROI";
  if (score <= 50) return "beginning to measure ambient ROI but significant opportunity remains";
  if (score <= 70) return "actively managing ambient ROI with room to deepen";
  if (score <= 85) return "strategically managing ambient ROI across most domains";
  return "operating at best-in-class documentation intelligence";
}

export default function Screen6Invitation({ onBack }: Screen6Props) {
  const { state } = useAssessment();
  const { inputs } = state;

  const [showForm, setShowForm] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: '', org: '', title: '', email: '' });
  const [isExporting, setIsExporting] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportOrgName, setExportOrgName] = useState("");
  const [exportPreparedBy, setExportPreparedBy] = useState("");

  const providers = inputs.providers || 0;
  const annualEncounters = inputs.annualEncounters || 0;
  const utilization = inputs.utilization || 45;
  const timeSavings = inputs.timeSavedPerEncounter || 0;
  const revenuePerVisit = inputs.revenuePerVisit || 200;

  const domainHasValue: Record<string, boolean> = useMemo(() => ({
    capacity: inputs.capacityHasValue || false,
    revenue: inputs.revenueHasValue || false,
    workforce: inputs.workforceHasValue || false,
    risk: inputs.riskHasValue || false,
  }), [inputs.capacityHasValue, inputs.revenueHasValue, inputs.workforceHasValue, inputs.riskHasValue]);

  const domainData = useMemo(() => {
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

    const r: Record<string, { activationLevel: 1|2|3|4; activationLabel: string; score: number; gapValue: number; hasValue: boolean; primaryOpportunity: string }> = {};
    for (const d of DOMAIN_ORDER) {
      const level = scoreToActivationLevel(d, scores[d]);
      r[d] = {
        activationLevel: level,
        activationLabel: ACTIVATION_LABELS[d][level],
        score: scores[d],
        gapValue: gaps[d],
        hasValue: domainHasValue[d],
        primaryOpportunity: opportunityText[d]?.[level] || '',
      };
    }
    return r;
  }, [inputs, domainHasValue]);

  const totalScore = useMemo(() => {
    return (inputs.capacityScore || 0) + (inputs.revenueScore || 0) +
           (inputs.workforceScore || 0) + (inputs.riskScore || 0);
  }, [inputs.capacityScore, inputs.revenueScore, inputs.workforceScore, inputs.riskScore]);

  const displayedTotal = useMemo(() => {
    let sum = 0;
    for (const d of DOMAIN_ORDER) {
      if (domainHasValue[d]) sum += (inputs as any)[`${d}Gap`] || 0;
    }
    return sum;
  }, [inputs, domainHasValue]);

  const hasMeasuredDomains = DOMAIN_ORDER.some(d => domainHasValue[d]);

  const displayedMonthly = Math.round(displayedTotal / 12);
  const displayedDaily = Math.round(displayedTotal / 365);

  const roadmapDomains = useMemo(() => {
    return [...DOMAIN_ORDER].sort((a, b) => {
      const scoreA = domainData[a]?.score || 0;
      const scoreB = domainData[b]?.score || 0;
      return scoreA - scoreB;
    });
  }, [domainData]);

  const assessmentDate = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric"
    });
  }, []);

  const dt = displayedTotal;
  const actNow3yr = Math.round(dt * 3.45);
  const permanentlyLost6mo = Math.round(dt * 0.42);
  const permanentlyLost12mo = Math.round(dt * 0.95);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
  };

  const openExportModal = () => {
    setExportSuccess(false);
    setExportModalOpen(true);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const pdfData: AmbientAssessmentPDFData = {
        organizationName: exportOrgName || "Your Organization",
        preparedBy: exportPreparedBy || undefined,
        assessmentDate: new Date().toLocaleDateString("en-US", {
          month: "long", day: "numeric", year: "numeric"
        }),
        providers,
        annualEncounters,
        utilization,
        timeSavings,
        documentationScore: totalScore,
        totalAnnualGap: dt,
        monthlyGap: displayedMonthly,
        dailyGap: displayedDaily,
        actNow3yr,
        wait6mo3yr: Math.round(dt * (3.45 - 0.42)),
        wait12mo3yr: Math.round(dt * (3.45 - 0.95)),
        permanentlyLost6mo,
        permanentlyLost12mo,
        revenuePerVisit,
        providerRate: inputs.providerRate || 150,
        conversionFactor: inputs.conversionFactor || 33,
        domains: {
          capacity: domainData.capacity as any,
          revenue: domainData.revenue as any,
          workforce: domainData.workforce as any,
          risk: domainData.risk as any,
        },
      };
      await generateAmbientAssessmentPDF(pdfData);
      setExportSuccess(true);
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      <motion.div
        className="bg-[#1A1A1A] rounded-xl -mx-4 sm:-mx-6 px-4 sm:px-6 py-10 md:py-12 mb-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="max-w-[800px] mx-auto text-center">
          <p className="text-[10px] font-medium text-white/40 uppercase tracking-[2px] mb-6" data-testid="text-hero-label">
            Ambient Assessment
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16 mb-8">
            <div>
              <p className="text-[10px] font-medium text-white/40 uppercase tracking-[1.5px] mb-2">Your Score</p>
              <p className="text-[56px] md:text-[64px] font-bold text-white leading-none" data-testid="hero-score-value">
                {totalScore}
              </p>
              <p className="text-lg text-white/30 font-normal mt-1">/ 100</p>
            </div>

            <div className="hidden sm:block w-px h-20 bg-white/10" />

            <div>
              <p className="text-[10px] font-medium text-white/40 uppercase tracking-[1.5px] mb-2">Measured Value</p>
              {hasMeasuredDomains ? (
                <>
                  <p className="text-[40px] md:text-[48px] font-bold text-[#EA2C00] leading-none" data-testid="hero-total-value">
                    {formatDollar(displayedTotal)}
                  </p>
                  <p className="text-lg text-white/30 font-normal mt-1">annually</p>
                </>
              ) : (
                <p className="text-[28px] font-bold text-white/30 leading-none" data-testid="hero-total-value">
                  Not yet measured
                </p>
              )}
            </div>
          </div>

          <div className="max-w-[400px] mx-auto mb-6">
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden relative">
              <div
                className="absolute left-0 top-0 h-full bg-[#EA2C00] rounded-full transition-all duration-700"
                style={{ width: `${Math.min(totalScore, 100)}%` }}
              />
              <div className="absolute -top-0.5" style={{ left: '25%', transform: 'translateX(-50%)' }}>
                <div className="w-px h-3 bg-white/30" />
              </div>
              <div className="absolute -top-0.5" style={{ left: '50%', transform: 'translateX(-50%)' }}>
                <div className="w-px h-3 bg-white/30" />
              </div>
              <div className="absolute -top-0.5" style={{ left: '75%', transform: 'translateX(-50%)' }}>
                <div className="w-px h-3 bg-white/30" />
              </div>
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-[10px] text-white/40">Early deployment</span>
              <span className="text-[10px] text-white/40">Measured</span>
              <span className="text-[10px] text-white/40">Strategically managed</span>
              <span className="text-[10px] text-white/40">Best in class</span>
            </div>
          </div>

          <p className="text-sm text-white/50 leading-relaxed max-w-[500px] mx-auto" data-testid="text-capture-line">
            Your organization is {getScoreSummaryLine(totalScore)}.
          </p>
        </div>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-10">
        <div className="flex-1 max-w-[700px]">

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <div className="bg-[#F5F0EB] rounded-lg p-8 md:p-10 mb-8" data-testid="card-roadmap">
              <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
                Your Strategic Roadmap
              </p>
              <div className="h-px bg-[#E5E7EB] mb-2" />
              <p className="text-sm text-[#888888] leading-relaxed mb-6">
                Based on your assessment, these are the highest-value focus areas for your organization.
              </p>

              {roadmapDomains.map((domain, idx) => {
                const d = domainData[domain];
                const level = d?.activationLevel || 1;
                const roadmap = ROADMAP_TEXT[domain as Domain][level as ActivationLevel];
                return (
                  <div key={domain} data-testid={`roadmap-${domain}`}>
                    <div className="py-4">
                      <p className="text-xs font-medium text-[#EA2C00] uppercase tracking-[1px] mb-2">
                        {DOMAIN_LABELS[domain as Domain]} — Currently Level {level}
                      </p>
                      <p className="text-sm text-black leading-relaxed mb-1">
                        {roadmap.line1}
                      </p>
                      <p className="text-sm text-[#888888] leading-relaxed">
                        {roadmap.line2}
                      </p>
                    </div>
                    {idx < roadmapDomains.length - 1 && <div className="h-px bg-[#E5E7EB]/50" />}
                  </div>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.5 }}
          >
            <div className="bg-[#F5F0EB] rounded-lg p-8 md:p-10 mb-8" data-testid="card-assessment-details">
              <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
                Assessment Details
              </p>
              <div className="h-px bg-[#E5E7EB] mb-6" />

              <p className="text-xs font-medium text-[#888888] uppercase tracking-[1px] mb-4">
                Domain Performance
              </p>

              {DOMAIN_ORDER.map((domain, idx) => {
                const d = domainData[domain];
                return (
                  <div key={domain}>
                    <div className="flex items-start justify-between py-3" data-testid={`detail-domain-${domain}`}>
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-black">
                          {DOMAIN_LABELS[domain]}
                        </p>
                        <p className="text-xs text-[#888888]">
                          Level {d?.activationLevel} — {d?.activationLabel}
                        </p>
                        <p className="text-xs text-[#888888] mt-0.5">
                          {d?.hasValue ? formatDollar(d.gapValue) : '—'}
                        </p>
                      </div>
                      <p className="font-bold text-sm text-black" data-testid={`detail-score-${domain}`}>
                        {d?.score || 0}/25
                      </p>
                    </div>
                    {idx < DOMAIN_ORDER.length - 1 && <div className="h-px bg-[#E5E7EB]/50" />}
                  </div>
                );
              })}

              <div className="h-px bg-[#E5E7EB] mt-2" />
              <div className="bg-white/60 rounded-lg px-5 py-4 mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm text-black">Total Score</span>
                  <span className="font-bold text-lg text-black" data-testid="detail-total-score">{totalScore}/100</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-black">Measured Value</span>
                  <span className="font-bold text-lg text-[#EA2C00]" data-testid="detail-total-value">
                    {hasMeasuredDomains ? formatDollar(displayedTotal) : 'Not yet measured'}
                  </span>
                </div>
              </div>

              <div className="h-px bg-[#E5E7EB] mt-6 mb-4" />

              <p className="text-xs font-medium text-[#888888] uppercase tracking-[1px] mb-3">
                Baseline Inputs
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#888888]">Providers</span>
                  <span className="font-medium text-black">{providers}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#888888]">Annual encounters</span>
                  <span className="font-medium text-black">{annualEncounters.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#888888]">Utilization</span>
                  <span className="font-medium text-black">{utilization}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#888888]">Time saved</span>
                  <span className="font-medium text-black">{timeSavings > 0 ? `${timeSavings} min` : 'Not measured'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#888888]">Revenue per visit</span>
                  <span className="font-medium text-black">${revenuePerVisit}</span>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <div className="bg-[#F5F0EB] rounded-lg p-8 md:p-10" data-testid="card-invitation">
              <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
                Next Step
              </p>
              <div className="h-px bg-[#E5E7EB] mb-6" />

              <h2 className="text-xl md:text-2xl font-bold text-black font-abridge uppercase tracking-tight leading-[1.3] mb-4" data-testid="text-invitation-headline">
                Would you like to explore what documentation intelligence looks like at your scale?
              </h2>
              <p className="text-sm text-[#888888] leading-relaxed mb-6">
                This is not a product demonstration. It is a strategic working session where we walk through your organization's specific opportunities across each domain and build a roadmap together.
              </p>

              {!showForm && !formSubmitted && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <Button
                    onClick={() => setShowForm(true)}
                    className="bg-[#EA2C00] text-white border-[#EA2C00] rounded-full px-6 font-medium gap-2"
                    data-testid="button-request-session"
                  >
                    Request a Working Session
                    <ArrowRight size={16} />
                  </Button>
                  <Button
                    onClick={openExportModal}
                    variant="outline"
                    className="rounded-full px-6 font-medium gap-2"
                    data-testid="button-export"
                  >
                    <Download size={16} />
                    Export My Assessment
                  </Button>
                </div>
              )}

              {showForm && !formSubmitted && (
                <form onSubmit={handleSubmit} data-testid="form-contact">
                  <div className="flex flex-col gap-3">
                    <input
                      type="text" placeholder="Name" value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-semibold text-black outline-none focus:border-[#EA2C00] transition-colors"
                      data-testid="input-name"
                    />
                    <input
                      type="text" placeholder="Organization" value={formData.org}
                      onChange={(e) => setFormData({ ...formData, org: e.target.value })}
                      className="w-full rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-semibold text-black outline-none focus:border-[#EA2C00] transition-colors"
                      data-testid="input-org"
                    />
                    <input
                      type="text" placeholder="Title" value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-semibold text-black outline-none focus:border-[#EA2C00] transition-colors"
                      data-testid="input-title"
                    />
                    <input
                      type="email" placeholder="Email" value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-semibold text-black outline-none focus:border-[#EA2C00] transition-colors"
                      data-testid="input-email"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="bg-[#EA2C00] text-white border-[#EA2C00] rounded-full px-6 font-medium gap-2 w-full mt-4"
                    data-testid="button-submit"
                  >
                    Submit
                    <ArrowRight size={16} />
                  </Button>
                </form>
              )}

              {formSubmitted && (
                <div className="text-center" data-testid="form-confirmation">
                  <p className="text-base text-black font-semibold mb-3">
                    We'll be in touch within one business day.
                  </p>
                  <button
                    onClick={openExportModal}
                    className="text-sm text-[#888888] underline underline-offset-2 font-medium bg-transparent border-none cursor-pointer"
                    data-testid="button-copy-link"
                  >
                    Download your assessment
                  </button>
                </div>
              )}
            </div>
          </motion.div>

          <p className="text-xs text-[#888888] leading-relaxed mt-8 mb-4 italic" data-testid="text-summary-disclaimer">
            This assessment provides directional estimates based on organizational self-assessment and the inputs you provide. It does not guarantee specific financial outcomes. Benchmarks reflect maturity-based scoring and aggregated deployment data. Roadmap guidance is general — specific implementation should be tailored to your organization. Individual results vary. Methodology available on request.
          </p>
        </div>

        <motion.div
          className="w-full lg:w-[320px] flex-shrink-0"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.6, ease: "easeOut" }}
        >
          <div className="bg-[#1A1A1A] rounded-xl p-6 lg:sticky lg:top-24" data-testid="panel-summary">

            <p className="text-[10px] font-medium text-white/40 uppercase tracking-[2px] mb-4">
              Assessment Summary
            </p>

            <div className="flex items-end gap-3 mb-1">
              <span className="text-white font-bold text-[48px] leading-none" data-testid="panel-score">
                {totalScore}
              </span>
              <span className="text-white/30 text-lg mb-1">/ 100</span>
            </div>
            <p className="text-xs text-white/40 mb-5">Ambient Assessment Score</p>

            <div className="h-px bg-white/10 my-4" />

            <p className="text-[10px] font-medium text-white/40 uppercase tracking-[1.5px] mb-3">
              Measured Value
            </p>

            {hasMeasuredDomains ? (
              <>
                <p className="font-bold text-2xl text-[#EA2C00] leading-none mb-1" data-testid="panel-total-value">
                  {formatDollar(displayedTotal)}
                </p>
                <p className="text-xs text-white/40 mb-4">annually</p>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div>
                    <p className="text-white font-bold text-lg leading-none" data-testid="panel-monthly">
                      ${displayedMonthly.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-white/40 uppercase tracking-wide mt-1">/ month</p>
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg leading-none" data-testid="panel-daily">
                      ${displayedDaily.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-white/40 uppercase tracking-wide mt-1">/ day</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="font-bold text-xl text-white/30 leading-none mb-1" data-testid="panel-total-value">
                  Not yet measured
                </p>
                <p className="text-xs text-white/40 mb-4">complete domain inputs to see value</p>
              </>
            )}

            <div className="h-px bg-white/10 my-5" />

            <p className="text-[10px] font-medium text-white/40 uppercase tracking-[1.5px] mb-3">
              Domain Scores
            </p>
            <div className="space-y-2">
              {DOMAIN_ORDER.map((domain) => (
                <div key={domain} className="flex items-center justify-between text-sm">
                  <span className="text-white/60">{DOMAIN_LABELS[domain]}</span>
                  <span className="text-white font-semibold" data-testid={`panel-domain-score-${domain}`}>
                    {domainData[domain]?.score || 0}
                  </span>
                </div>
              ))}
            </div>

            <div className="h-px bg-white/10 my-5" />

            <p className="text-[10px] font-medium text-white/40 uppercase tracking-[1.5px] mb-3">
              Your Inputs
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/50">Providers</span>
                <span className="text-white/80 font-medium">{providers}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/50">Encounters / yr</span>
                <span className="text-white/80 font-medium">{annualEncounters.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/50">Utilization</span>
                <span className="text-white/80 font-medium">{utilization}%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/50">Time saved</span>
                <span className="text-white/80 font-medium">{timeSavings > 0 ? `${timeSavings} min` : '—'}</span>
              </div>
            </div>

            <div className="h-px bg-white/10 my-5" />

            <p className="text-xs text-white/40 mb-2">Completed {assessmentDate}</p>
            <p className="text-xs text-white/40 leading-relaxed italic">
              Based on organizational self-assessment. Estimates are directional. Individual results vary.
            </p>

          </div>
        </motion.div>
      </div>

      <Dialog open={exportModalOpen} onOpenChange={(open) => { setExportModalOpen(open); if (!open) setExportSuccess(false); }}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#EA2C00]" />
              Export Ambient Assessment
            </DialogTitle>
            <DialogDescription>
              Generate a professional PDF report with your assessment results, domain analysis, and cost-of-inaction projections.
            </DialogDescription>
          </DialogHeader>

          {!exportSuccess ? (
            <div className="space-y-5 py-3">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="export-org-name" className="text-sm font-medium">
                    Organization name
                  </Label>
                  <Input
                    id="export-org-name"
                    placeholder="e.g., Memorial Health System"
                    value={exportOrgName}
                    onChange={(e) => setExportOrgName(e.target.value)}
                    data-testid="input-export-org-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="export-prepared-by" className="text-sm font-medium">
                    Prepared by (optional)
                  </Label>
                  <Input
                    id="export-prepared-by"
                    placeholder="e.g., Partner Success Team"
                    value={exportPreparedBy}
                    onChange={(e) => setExportPreparedBy(e.target.value)}
                    data-testid="input-export-prepared-by"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-neutral-500 border-t pt-4">
                <span>Estimated length: <span className="font-medium">5 pages</span></span>
                <span>Format: <span className="font-medium">PDF</span></span>
              </div>

              <div className="flex gap-3 pt-1">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setExportModalOpen(false)}
                  data-testid="button-cancel-export"
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-[#EA2C00]"
                  onClick={handleExport}
                  disabled={isExporting}
                  data-testid="button-generate-pdf"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Generate PDF
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">PDF Generated Successfully</h3>
                <p className="text-sm text-neutral-500 mt-1">
                  Check your downloads folder for the file.
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleExport}
                  data-testid="button-download-again"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Again
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => setExportModalOpen(false)}
                  data-testid="button-close-export"
                >
                  <X className="mr-2 h-4 w-4" />
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
