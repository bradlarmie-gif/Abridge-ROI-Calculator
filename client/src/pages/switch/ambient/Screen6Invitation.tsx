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
import { calculateAmbientScore, formatDollar, formatDollarFull } from "./ambientCalculator";
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
} from "./domainCalculations";

interface Screen6Props {
  onBack: () => void;
  onBackToJourney?: () => void;
}

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
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportOrgName, setExportOrgName] = useState("");
  const [exportPreparedBy, setExportPreparedBy] = useState("");

  const providers = inputs.providers || 0;
  const annualEncounters = inputs.annualEncounters || 0;
  const utilization = inputs.utilization || 45;
  const timeSavings = inputs.timeSavedPerEncounter || 2.0;

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

  const topDomainOps = DOMAIN_OPS[result.topDomain];

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
        documentationScore: result.score,
        totalAnnualGap: dt,
        monthlyGap: displayedMonthly,
        dailyGap: displayedDaily,
        actNow3yr,
        wait6mo3yr: Math.round(dt * (3.45 - 0.42)),
        wait12mo3yr: Math.round(dt * (3.45 - 0.95)),
        permanentlyLost6mo,
        permanentlyLost12mo,
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
        className="bg-[#1A1A1A] rounded-xl -mx-4 sm:-mx-6 px-4 sm:px-6 py-12 md:py-16 mb-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="max-w-[800px] mx-auto text-center">
          <p className="text-[10px] font-medium text-white/40 uppercase tracking-[2px] mb-6" data-testid="text-hero-label">
            Documentation Intelligence Assessment
          </p>

          <h1 className="text-3xl md:text-4xl font-bold text-white mb-10 font-abridge uppercase tracking-tight" data-testid="text-screen6-heading">
            Your Assessment
          </h1>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16 mb-8">
            <div>
              <p className="text-[10px] font-medium text-white/40 uppercase tracking-[1.5px] mb-2">Your Score</p>
              <p className="text-[64px] md:text-[80px] font-bold text-white leading-none" data-testid="hero-score-value">
                {result.score}
              </p>
              <p className="text-lg text-white/30 font-normal mt-1">/ 100</p>
            </div>

            <div className="hidden sm:block w-px h-20 bg-white/10" />

            <div>
              <p className="text-[10px] font-medium text-white/40 uppercase tracking-[1.5px] mb-2">Measured Value</p>
              {hasMeasuredDomains ? (
                <>
                  <p className="text-[48px] md:text-[56px] font-bold text-[#EA2C00] leading-none" data-testid="hero-total-value">
                    {formatDollar(displayedTotal)}
                  </p>
                  <p className="text-lg text-white/30 font-normal mt-1">annually</p>
                </>
              ) : (
                <p className="text-[32px] font-bold text-white/30 leading-none" data-testid="hero-total-value">
                  Not yet measured
                </p>
              )}
            </div>
          </div>

          <div className="max-w-[400px] mx-auto mb-6">
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden relative">
              <div
                className="absolute left-0 top-0 h-full bg-[#EA2C00] rounded-full transition-all duration-700"
                style={{ width: `${Math.min(result.score, 100)}%` }}
              />
              <div className="absolute -top-0.5" style={{ left: '34%', transform: 'translateX(-50%)' }}>
                <div className="w-px h-3 bg-white/40" />
              </div>
              <div className="absolute -top-0.5" style={{ left: '71%', transform: 'translateX(-50%)' }}>
                <div className="w-px h-3 bg-white/70" />
              </div>
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-[10px] text-white/30">0</span>
              <span className="text-[10px] text-white/40">Avg: 34</span>
              <span className="text-[10px] text-white/50">Top: 71</span>
              <span className="text-[10px] text-white/30">100</span>
            </div>
          </div>

          <p className="text-sm text-white/50 leading-relaxed max-w-[500px] mx-auto" data-testid="text-capture-line">
            You are capturing approximately {result.score}% of the enterprise value flowing through your documentation infrastructure.
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
            <div className="bg-[#F5F0EB] rounded-lg p-8 md:p-10 mb-8" data-testid="card-top-opportunity">
              <p className="text-xs font-medium text-[#EA2C00] uppercase tracking-[1.5px] mb-2">
                Highest-Leverage Opportunity — {DOMAIN_LABELS[result.topDomain as Domain] || 'Capacity'}
              </p>
              <div className="h-px bg-[#E5E7EB] mb-6" />
              <p className="text-[#EA2C00] font-bold text-3xl leading-none mb-3" data-testid="text-top-domain-value">
                {formatDollarFull(result.topDomainValue)} <span className="text-base font-normal text-[#888888]">annually</span>
              </p>
              <p className="text-sm text-[#888888] leading-relaxed">
                {topDomainOps.meaning} {topDomainOps.action}
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.5 }}
          >
            <div className="bg-[#F5F0EB] rounded-lg p-8 md:p-10 mb-8" data-testid="card-domain-summary">
              <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
                Domain Performance
              </p>
              <div className="h-px bg-[#E5E7EB] mb-6" />

              {DOMAIN_ORDER.map((domain, idx) => {
                const d = domainData[domain];
                return (
                  <div key={domain}>
                    <div className="flex items-center justify-between py-3" data-testid={`summary-domain-${domain}`}>
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-black">{DOMAIN_LABELS[domain]}</p>
                        <p className="text-xs text-[#888888] italic">{d?.activationLabel}</p>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="w-[100px]">
                          <div className="w-full h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#EA2C00] rounded-full transition-all duration-500"
                              style={{ width: `${d?.score || 0}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-sm font-bold text-black w-[40px] text-right">{d?.score || 0}</span>
                        <span className={`text-sm font-bold w-[80px] text-right ${d?.hasValue ? 'text-[#EA2C00]' : 'text-[#888888]'}`}>
                          {d?.hasValue ? formatDollar(d.gapValue) : 'Not measured'}
                        </span>
                      </div>
                    </div>
                    {idx < DOMAIN_ORDER.length - 1 && <div className="h-px bg-[#E5E7EB]/50" />}
                  </div>
                );
              })}

              <div className="h-px bg-[#E5E7EB] mt-2" />
              <div className="bg-white/60 rounded-lg px-5 py-4 mt-3 flex items-center justify-between">
                <span className="font-semibold text-sm text-black">Total Measured Value</span>
                <span className="font-bold text-xl text-[#EA2C00]" data-testid="text-total-gap">
                  {hasMeasuredDomains ? formatDollar(displayedTotal) : 'Not yet measured'}
                </span>
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
                Would you like to see what documentation intelligence looks like at your scale?
              </h2>
              <p className="text-sm text-[#888888] leading-relaxed mb-6">
                This is not a product demonstration. It is a 30-minute working session.
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

          <p className="text-center text-xs text-[#888888] leading-relaxed mt-8 mb-4">
            Conservative estimates based on Abridge deployment benchmarks. Methodology available on request.
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
                {result.score}
              </span>
              <span className="text-white/30 text-lg mb-1">/ 100</span>
            </div>
            <p className="text-xs text-white/40 mb-5">Documentation Intelligence Score</p>

            <div className="h-px bg-white/10 my-4" />

            <p className="text-[10px] font-medium text-white/40 uppercase tracking-[1.5px] mb-3">
              Enterprise Value
            </p>

            {hasMeasuredDomains ? (
              <>
                <p className="font-bold text-2xl text-[#EA2C00] leading-none mb-1" data-testid="panel-total-value">
                  {formatDollar(displayedTotal)}
                </p>
                <p className="text-xs text-white/40 mb-4">measured annually</p>

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

                <div className="h-px bg-white/10 my-5" />

                <p className="text-[10px] font-medium text-white/40 uppercase tracking-[1.5px] mb-3">
                  Cost of Waiting
                </p>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60">Wait 6 months</span>
                    <span className="font-bold text-sm text-[#EA2C00]" data-testid="panel-wait-6mo">
                      {formatDollarFull(permanentlyLost6mo)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60">Wait 12 months</span>
                    <span className="font-bold text-sm text-[#EA2C00]" data-testid="panel-wait-12mo">
                      {formatDollarFull(permanentlyLost12mo)}
                    </span>
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
              Domain Gaps
            </p>
            <div className="space-y-2">
              {DOMAIN_ORDER.map((domain) => (
                <div key={domain} className="flex items-center justify-between text-sm">
                  <span className="text-white/60">{DOMAIN_LABELS[domain]}</span>
                  <span className={domainData[domain]?.hasValue ? "text-white font-semibold" : "text-white/30 text-xs"}>
                    {domainData[domain]?.hasValue ? formatDollar(domainData[domain].gapValue) : 'Not measured'}
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
                <span className="text-white/80 font-medium">{timeSavings} min</span>
              </div>
            </div>

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
