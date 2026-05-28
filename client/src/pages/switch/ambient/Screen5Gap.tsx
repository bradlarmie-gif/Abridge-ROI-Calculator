import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Download, Loader2 } from "lucide-react";
import { useAssessment } from "@/lib/assessment";
import { formatDollar } from "./ambientCalculator";
import {
  type Domain, type ActivationLevel,
  DOMAIN_ORDER, DOMAIN_LABELS, ACTIVATION_LABELS,
  scoreToActivationLevel,
} from "./domainCalculations";
import {
  generateAmbientAssessmentPDF,
  opportunityText,
  type AmbientAssessmentPDFData,
} from "@/lib/ambient-assessment-pdf";
import { buildUserInputsSummary, buildLevelGaps, parseDomainInputs } from "./ambientPdfHelpers";

interface Screen5Props {
  onBack: () => void;
  onNavigateToBaseline?: () => void;
  onNavigateToExplore?: (providers: number, encounters: number) => void;
}

const NEXT_MOVES: Record<Domain, Record<1|2|3|4, string>> = {
  capacity: {
    1: "A 30-day scheduling comparison — before and after documentation time recovery — is the fastest path to a confirmed number. One person in access or ops can run it. The result is almost always larger than expected.",
    2: "The recovered time is visible. What's missing is a decision about where it goes. One conversation between clinical operations and access leadership — framed around the scheduling data — is what converts emerging signal into a confirmed number.",
    3: "The access story is confirmed. The move now is embedding it into budget assumptions so it informs care model decisions, not just metrics reporting.",
    4: "All four capacity levers are integrated. The work ahead is compounding what's already built, not widening the foundation.",
  },
  revenue: {
    1: "A 90-day pre/post coding comparison is what turns this from an assumption into a number. Revenue cycle can run it. It tends to produce a figure that surprises people — typically landing between $400 and $900 per provider per month.",
    2: "The directional signal is there. A single quarter of formal analysis — with revenue cycle and clinical leadership in the same room — is what converts it. That's usually the only barrier between Emerging and Demonstrated.",
    3: "Revenue impact is confirmed. The next move is connecting documentation quality to payer strategy: CDI governance, contract negotiation inputs, VBC positioning. That's where the compounding returns are.",
    4: "Revenue is integrated and strategic. The work ahead is depth — using documentation intelligence as an active tool in payer strategy and CDI governance.",
  },
  workforce: {
    1: "Compare ambient adopters to non-adopters on 12-month turnover data. HR can pull it in a day. The calculation is simple — and the number it produces is almost never small.",
    2: "Behavioral signals are visible. The move to Demonstrated is one HR data pull: ambient adopters vs. non-adopters on turnover, with a dollar figure attached. Clinical ops and HR need to own it together — that's usually the only barrier.",
    3: "Retention value is confirmed. The next move is elevating it: provider experience data as a board-level asset in recruitment positioning and workforce planning — not just a satisfaction metric.",
    4: "Workforce advantage is fully integrated. Provider experience data is informing board-level decisions. The work ahead is depth and compounding.",
  },
  risk: {
    1: "CDI query volume is the fastest financial path. Documentation specificity improvements typically reduce queries by 20–25%, and the dollar value is auditable without payer mix data. Lowest-friction first number to get on the books.",
    2: "Quality signals are tracked. The move to Demonstrated is building one bridge: documentation quality to a single financial program — CDI, denials, or MIPS. Starting narrow is intentional. The breadth follows the first number.",
    3: "Documentation quality is formally attributed. The next move is treating it as a governance layer: presenting at board level, connecting to VBC contract strategy, positioning as a clinical AI readiness asset.",
    4: "Documentation is a strategic asset across all quality dimensions. The work ahead is depth in governance and VBC integration.",
  },
};


export default function Screen5Gap({ onBack, onNavigateToBaseline, onNavigateToExplore }: Screen5Props) {
  const { state } = useAssessment();
  const { inputs } = state;

  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportError, setExportError] = useState(false);
  const [exportOrgName, setExportOrgName] = useState(inputs.organizationName as string || "");
  const [exportPreparedBy, setExportPreparedBy] = useState("");

  const providers = inputs.providers || 0;
  const annualEncounters = inputs.annualEncounters || 0;
  const utilization = inputs.utilization || 0;

  const domainLevels: Record<Domain, number> = useMemo(() => ({
    capacity: scoreToActivationLevel('capacity', inputs.capacityScore || 0),
    revenue: scoreToActivationLevel('revenue', inputs.revenueScore || 0),
    workforce: scoreToActivationLevel('workforce', inputs.workforceScore || 0),
    risk: scoreToActivationLevel('risk', inputs.riskScore || 0),
  }), [inputs.capacityScore, inputs.revenueScore, inputs.workforceScore, inputs.riskScore]);

  const domainHasValue: Record<Domain, boolean> = useMemo(() => ({
    capacity: inputs.capacityHasValue || false,
    revenue: inputs.revenueHasValue || false,
    workforce: inputs.workforceHasValue || false,
    risk: inputs.riskHasValue || false,
  }), [inputs.capacityHasValue, inputs.revenueHasValue, inputs.workforceHasValue, inputs.riskHasValue]);

  const domainGaps: Record<Domain, number> = useMemo(() => ({
    capacity: inputs.capacityGap || 0,
    revenue: inputs.revenueGap || 0,
    workforce: inputs.workforceGap || 0,
    risk: inputs.riskGap || 0,
  }), [inputs.capacityGap, inputs.revenueGap, inputs.workforceGap, inputs.riskGap]);

  const totalMeasured = useMemo(() => {
    let sum = 0;
    for (const d of DOMAIN_ORDER) {
      if (domainHasValue[d]) {
        if (d === 'revenue' && domainLevels[d] === 2) continue;
        sum += domainGaps[d];
      }
    }
    return sum;
  }, [domainHasValue, domainGaps, domainLevels]);

  const measuredDomainsList = useMemo(() =>
    DOMAIN_ORDER.filter(d => domainLevels[d] >= 2)
  , [domainLevels]);

  const priorityDomain: Domain = useMemo(() => {
    // Prefer L2 domains (closest to confirmed/L3) over L1 — highest ROI next move
    const L2_PRIORITY: Domain[] = ['revenue', 'workforce', 'capacity', 'risk'];
    const l2Domains = L2_PRIORITY.filter(d => domainLevels[d] === 2);
    if (l2Domains.length > 0) return l2Domains[0];

    // No L2 domains — fall back to lowest level, tiebreak by same order
    const TIEBREAKER: Domain[] = ['capacity', 'revenue', 'workforce', 'risk'];
    let lowest = TIEBREAKER[0];
    let lowestLevel = domainLevels[lowest];
    for (const d of TIEBREAKER) {
      if (domainLevels[d] < lowestLevel) { lowest = d; lowestLevel = domainLevels[d]; }
    }
    return lowest;
  }, [domainLevels]);

  const [selectedPriorityDomain, setSelectedPriorityDomain] = useState<Domain>(priorityDomain);


  const revenuePerVisit = inputs.revenuePerVisit || 0;

  const totalScore = useMemo(() => {
    return (inputs.capacityScore || 0) + (inputs.revenueScore || 0) +
           (inputs.workforceScore || 0) + (inputs.riskScore || 0);
  }, [inputs.capacityScore, inputs.revenueScore, inputs.workforceScore, inputs.riskScore]);

  const pdfDomainData = useMemo(() => {
    const r: Record<string, any> = {};
    for (const d of DOMAIN_ORDER) {
      const level = domainLevels[d] as ActivationLevel;
      const rawInputs = parseDomainInputs((inputs as any)[`${d}DomainInputs`] || '{}');
      r[d] = {
        activationLevel: level,
        activationLabel: ACTIVATION_LABELS[d][level],
        score: (inputs as any)[`${d}Score`] || 0,
        gapValue: domainGaps[d],
        hasValue: domainHasValue[d],
        headlineMetric: (inputs as any)[`${d}HeadlineMetric`] || '',
        primaryOpportunity: opportunityText[d]?.[level] || '',
        context: (inputs as any)[`${d}Context`] || '',
        formula: (inputs as any)[`${d}Formula`] || '',
        footnote: (inputs as any)[`${d}Footnote`] || '',
        userInputs: buildUserInputsSummary(d as Domain, level, rawInputs),
        gapItems: buildLevelGaps(d as Domain, level, rawInputs),
      };
    }
    return r;
  }, [inputs, domainLevels, domainHasValue, domainGaps]);


  const handleExport = async () => {
    setIsExporting(true);
    setExportError(false);
    setExportSuccess(false);
    try {
      const dt = totalMeasured;

      const pdfData: AmbientAssessmentPDFData = {
        organizationName: exportOrgName || "Your Organization",
        preparedBy: exportPreparedBy || undefined,
        assessmentDate: new Date().toLocaleDateString("en-US", {
          month: "long", day: "numeric", year: "numeric"
        }),
        providers,
        annualEncounters,
        utilization,
        timeSavings: inputs.timeSavedPerEncounter || parseDomainInputs(inputs.capacityDomainInputs).timeSaved as number || 0,
        documentationScore: totalScore,
        totalAnnualGap: dt,
        revenuePerVisit,
        conversionFactor: inputs.conversionFactor || 33,
        deploymentTenure: inputs.deploymentTenure || '',
        patientExperienceNoticeable: (inputs.patientExperienceNoticeable as string) || '',
        patientExperienceSignals: (inputs.patientExperienceSignals as string) || '',
        patientExperienceFormalized: (inputs.patientExperienceFormalized as string) || '',
        priorityDomain: selectedPriorityDomain,
        orgContext: {
          systemSize: inputs.systemSize || 0,
          orgType: inputs.orgType || '',
          payerMixMedicare: inputs.payerMixMedicare || 0,
          payerMixMedicaid: inputs.payerMixMedicaid || 0,
          payerMixCommercial: inputs.payerMixCommercial || 0,
        },
        domains: {
          capacity: pdfDomainData.capacity as any,
          revenue: pdfDomainData.revenue as any,
          workforce: pdfDomainData.workforce as any,
          risk: pdfDomainData.risk as any,
        },
      };
      await generateAmbientAssessmentPDF(pdfData);
      setExportSuccess(true);
    } catch (err) {
      console.error('PDF generation failed:', err instanceof Error ? err.message : err, err);
      setExportError(true);
    } finally {
      setIsExporting(false);
    }
  };

  const bandLabel = totalScore <= 16 ? 'Unmeasured' : totalScore <= 48 ? 'Emerging' : totalScore <= 76 ? 'Demonstrated' : 'Strategic Impact';
  const priorityLevel = Math.min(domainLevels[selectedPriorityDomain], 4) as 1|2|3|4;

  const pdfBullets = [
    `Score ${totalScore} — ${bandLabel}`,
    `All four domains with activation levels${totalMeasured > 0 ? ` and ${formatDollar(totalMeasured)}/yr confirmed` : ''}`,
    `${DOMAIN_LABELS[selectedPriorityDomain]} as your priority next move`,
    totalMeasured > 0
      ? 'A 3-year measurement scenario based on confirmed values and domain benchmarks'
      : 'A 3-year measurement scenario based on industry benchmarks at your scale',
  ];

  return (
    <div>

      {/* ── BACK NAV ── */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-[#AAAAAA] hover:text-[#1A1A1A] transition-colors border-none bg-transparent cursor-pointer p-0"
          style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 500 }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M8 2L4 6L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Score
        </button>
      </motion.div>

      {/* ── OPENER ── */}
      <motion.div
        className="mb-10"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <p
          className="text-[10px] font-semibold text-[#EA2C00] uppercase tracking-[4px] mb-10"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          Ambient Value Domains
        </p>
        <motion.h1
          className="font-abridge uppercase text-[#1A1A1A] leading-[1.04] mb-8"
          style={{ fontSize: 'clamp(2.4rem, 5vw, 4.2rem)', maxWidth: '580px' }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {totalMeasured > 0 ? (
            <>Here&rsquo;s where<br />to take it.</>
          ) : measuredDomainsList.length > 0 ? (
            <>Signal is there.<br />Here&rsquo;s the move.</>
          ) : (
            <>Four streams.<br />Here&rsquo;s where<br />to start.</>
          )}
        </motion.h1>
        <motion.div
          className="bg-[#EA2C00] h-[2px]"
          initial={{ width: 0 }}
          animate={{ width: 44 }}
          transition={{ delay: 0.4, duration: 0.5, ease: 'easeOut' }}
        />
      </motion.div>

      {/* ── PRIORITY NEXT MOVE ── */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-4">
          <p
            className="text-[10px] font-semibold text-[#AAAAAA] uppercase tracking-[3px]"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            Priority Domain
          </p>
          <p
            className="text-[9px] text-[#BBBBBB]"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            ★ recommended · tap to switch
          </p>
        </div>

        {/* Domain selector pills */}
        <div className="flex flex-wrap gap-2 mb-5">
          {DOMAIN_ORDER.map(domain => {
            const level = domainLevels[domain];
            const isSelected = selectedPriorityDomain === domain;
            const isRecommended = domain === priorityDomain;
            return (
              <button
                key={domain}
                type="button"
                onClick={() => setSelectedPriorityDomain(domain)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer border-none ${
                  isSelected
                    ? 'bg-[#1A1A1A] text-white'
                    : 'bg-[#F0EBE6] text-[#666] hover:bg-[#E8E3DE]'
                }`}
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                {isRecommended && (
                  <span style={{ color: isSelected ? '#EA2C00' : '#EA2C00', fontSize: 8, lineHeight: 1 }}>★</span>
                )}
                <span>{DOMAIN_LABELS[domain]}</span>
                <span className={`text-[10px] font-bold ${isSelected ? 'text-white/50' : 'text-[#AAA]'}`}>L{level}</span>
              </button>
            );
          })}
        </div>

        <div className="bg-[#F5F0EB] rounded-2xl overflow-hidden">
          <div className="px-6 sm:px-8 py-7 sm:py-9">
            <p
              className="text-[10px] font-semibold uppercase tracking-[3px] mb-2"
              style={{ fontFamily: "'Manrope', sans-serif", color: 'rgba(234,44,0,0.75)' }}
            >
              {selectedPriorityDomain === priorityDomain ? 'Highest-ROI Next Move' : 'Your Next Move'} · {DOMAIN_LABELS[selectedPriorityDomain]}
            </p>
            <h2
              className="font-abridge uppercase text-[#1A1A1A] leading-[1.04] mb-1"
              style={{ fontSize: 'clamp(1.6rem, 3vw, 2.6rem)' }}
            >
              Your move in<br />{DOMAIN_LABELS[selectedPriorityDomain]}.
            </h2>
            <p
              className="text-xs text-[#888888] mb-3"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              {ACTIVATION_LABELS[selectedPriorityDomain][domainLevels[selectedPriorityDomain] as ActivationLevel]} · Level {domainLevels[selectedPriorityDomain]}
            </p>
            <div className="w-8 h-[2px] bg-[#EA2C00] mb-5" />
            <p
              style={{
                fontFamily: "'Manrope', sans-serif",
                fontWeight: 300,
                fontSize: 'clamp(0.9rem, 1.2vw, 1rem)',
                lineHeight: 1.8,
                color: '#555555',
              }}
            >
              {NEXT_MOVES[selectedPriorityDomain][priorityLevel]}
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── PDF HERO ── */}
      <motion.div
        className="mb-10"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <div className="bg-[#1A1A1A] rounded-2xl overflow-hidden">
          <div className="px-6 sm:px-8 md:px-10 py-8 sm:py-10">

            <p
              className="text-[11px] font-semibold text-white/40 uppercase tracking-[4px] mb-6"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              Your Assessment
            </p>
            <h2
              className="font-abridge uppercase text-white leading-[1.04] mb-3"
              style={{ fontSize: 'clamp(1.9rem, 3.5vw, 3rem)' }}
            >
              The Ambient<br />Value Brief.
            </h2>
            <div className="w-8 h-[2px] bg-[#EA2C00] mb-7" />

            {/* What's inside */}
            <div className="flex flex-col gap-2.5 mb-8">
              {pdfBullets.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-1 h-1 rounded-full bg-[#EA2C00] flex-shrink-0 mt-[0.45rem]" />
                  <p
                    className="text-sm text-white/60 leading-relaxed"
                    style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}
                  >
                    {item}
                  </p>
                </div>
              ))}
            </div>

            {/* Inputs */}
            <div className="flex flex-col gap-3 mb-7">
              <input
                type="text"
                placeholder="Organization name (optional)"
                value={exportOrgName}
                onChange={(e) => setExportOrgName(e.target.value)}
                className="w-full bg-white/[0.07] border border-white/[0.12] rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30 transition-colors"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              />
              <input
                type="text"
                placeholder="Prepared by (optional)"
                value={exportPreparedBy}
                onChange={(e) => setExportPreparedBy(e.target.value)}
                className="w-full bg-white/[0.07] border border-white/[0.12] rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30 transition-colors"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              />
            </div>

            {/* CTA */}
            {exportSuccess ? (
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-[#EA2C00] flex items-center justify-center flex-shrink-0">
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-sm text-white/70" style={{ fontFamily: "'Manrope', sans-serif" }}>
                  PDF downloaded — check your downloads folder.
                </p>
              </div>
            ) : exportError ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-red-400" style={{ fontFamily: "'Manrope', sans-serif" }}>
                  Something went wrong generating the PDF. Try again.
                </p>
                <button
                  type="button"
                  onClick={handleExport}
                  className="inline-flex items-center gap-2 bg-white text-[#1A1A1A] rounded-full border-none cursor-pointer hover:bg-[#EA2C00] hover:text-white transition-colors duration-300"
                  style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 600, fontSize: '0.875rem', letterSpacing: '0.3px', padding: '1rem 2.25rem' }}
                >
                  <Download size={14} />
                  Try Again
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleExport}
                disabled={isExporting}
                className="inline-flex items-center gap-2 bg-white text-[#1A1A1A] rounded-full border-none cursor-pointer hover:bg-[#EA2C00] hover:text-white transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 600, fontSize: '0.875rem', letterSpacing: '0.3px', padding: '1rem 2.25rem' }}
                data-testid="button-export"
              >
                {isExporting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download size={14} />
                    Download the Assessment →
                  </>
                )}
              </button>
            )}

          </div>
        </div>
      </motion.div>

      {/* ── DISCLAIMER ── */}
      <div className="pb-16 pt-6 border-t border-[#E5E5E5]">
        <p className="text-xs text-[#AAAAAA] leading-relaxed">
          Dollar values shown are modeled estimates based on user-provided inputs and published industry benchmarks. Capacity: based on MGMA Physician Compensation data and published literature on time-to-access in ambulatory care. Revenue: based on AMA/MGMA coding benchmarks on E&M level distribution, denial rate data, and CDI program outcomes. Workforce: based on AMGA Physician Retention Survey; physician replacement cost literature ($250K–$500K per physician). Quality: based on CMS quality penalty exposure data and CDI program ROI literature. Actual results depend on implementation approach, provider adoption, and organizational factors. Abridge makes no guarantee of financial results.
        </p>
      </div>

    </div>
  );
}
