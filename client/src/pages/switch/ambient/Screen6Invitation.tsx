import { useState, useMemo } from "react";
import { ArrowRight, Download, Loader2 } from "lucide-react";
import { DS, labelStyle, cardStyle, featuredCardStyle, primaryButtonStyle, secondaryButtonStyle, backLinkStyle } from "./designTokens";
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

  const formInputStyle: React.CSSProperties = {
    fontFamily: DS.font, fontWeight: 600, fontSize: 18, color: DS.black,
    backgroundColor: DS.white, border: `1.5px solid ${DS.border}`, borderRadius: DS.radius.input,
    padding: '14px 18px', width: '100%', outline: 'none', transition: 'border-color 150ms ease',
  };

  return (
    <div style={{ fontFamily: DS.font, paddingTop: 72, paddingBottom: 80 }}>
      <div className="max-w-[520px] mx-auto">
        <p style={labelStyle} className="mb-6" data-testid="text-screen6-label">
          Your Assessment
        </p>

        <div style={cardStyle} className="mb-10" data-testid="card-verdict-numbers">
          <div className="flex items-start justify-between gap-8 flex-wrap">
            <div>
              <p style={{ fontSize: 13, color: DS.muted, fontFamily: DS.font }} className="mb-1">Your Score</p>
              <p style={{ fontSize: 36, fontWeight: 700, color: DS.black, fontFamily: DS.font }}>
                {result.score} <span style={{ fontSize: 20, color: DS.muted, fontWeight: 400 }}>/ 100</span>
              </p>
            </div>
            <div>
              <p style={{ fontSize: 13, color: DS.muted, fontFamily: DS.font }} className="mb-1">Top Quartile</p>
              <p style={{ fontSize: 36, fontWeight: 700, color: DS.black, fontFamily: DS.font }}>
                71 <span style={{ fontSize: 20, color: DS.muted, fontWeight: 400 }}>/ 100</span>
              </p>
            </div>
          </div>

          <div style={{ width: '100%', height: 6, backgroundColor: DS.border, borderRadius: 3, overflow: 'hidden', marginTop: 20, marginBottom: 12, position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${Math.min(result.score, 100)}%`, backgroundColor: DS.red, borderRadius: 3 }} />
            <div style={{ position: 'absolute', left: `${Math.min(result.score, 100)}%`, top: 0, height: '100%', width: `${Math.max(0, 71 - result.score)}%`, backgroundColor: DS.border }} />
            <div style={{ position: 'absolute', left: '71%', top: 0, height: '100%', width: '29%', backgroundColor: '#F5F5F4' }} />
          </div>

          <p style={{ fontSize: 15, color: DS.body, lineHeight: 1.6, fontFamily: DS.font }} data-testid="text-capture-line">
            You are capturing approximately {result.score}% of the enterprise value flowing through your documentation infrastructure.
          </p>
        </div>

        <div style={{ height: 1, backgroundColor: DS.border, marginBottom: 40 }} />

        <p style={labelStyle} className="mb-4">
          Highest-Leverage Opportunity
        </p>

        <div style={featuredCardStyle} className="mb-14" data-testid="card-top-opportunity">
          <p style={{ fontSize: 20, fontWeight: 700, color: DS.black, fontFamily: DS.font }} className="mb-2">{topDomainName}</p>
          <p style={{ fontSize: 32, fontWeight: 700, color: DS.red, fontFamily: DS.font }} className="mb-4">{formatDollarFull(result.topDomainValue)} annually</p>
          <div style={{ height: 1, backgroundColor: DS.border, marginBottom: 16 }} />
          <p style={{ fontSize: 15, color: DS.body, lineHeight: 1.75, fontFamily: DS.font }}>
            {topDomainOps.meaning} {topDomainOps.action}
          </p>
        </div>

        <div style={{ height: 1, backgroundColor: DS.border, marginBottom: 56 }} />

        <div className="text-center mb-8">
          <h2 style={{ fontSize: 32, fontWeight: 700, color: DS.black, lineHeight: 1.3, maxWidth: 400, margin: '0 auto', fontFamily: DS.font }} data-testid="text-invitation-headline">
            Would you like to see what documentation intelligence looks like at your scale?
          </h2>
          <p style={{ fontSize: 15, color: DS.muted, lineHeight: 1.75, marginTop: 20, fontFamily: DS.font }}>
            This is not a product demonstration.<br />
            It is a 30-minute working session.
          </p>
        </div>

        {!showForm && !formSubmitted && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 w-full sm:w-auto justify-center"
              style={primaryButtonStyle()}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = DS.redHover)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = DS.red)}
              data-testid="button-request-session"
            >
              Request a Working Session
              <ArrowRight size={16} />
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="inline-flex items-center gap-2 w-full sm:w-auto justify-center"
              style={{ ...secondaryButtonStyle, opacity: isExporting ? 0.7 : 1, cursor: isExporting ? 'wait' : 'pointer' }}
              onMouseEnter={(e) => { if (!isExporting) e.currentTarget.style.backgroundColor = DS.hoverBg; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              data-testid="button-export"
            >
              {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {isExporting ? 'Generating PDF...' : 'Export My Assessment'}
            </button>
          </div>
        )}

        {showForm && !formSubmitted && (
          <form onSubmit={handleSubmit} style={cardStyle} className="mb-14" data-testid="form-contact">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <input
                type="text" placeholder="Name" value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={formInputStyle}
                onFocus={(e) => (e.target.style.borderColor = DS.red)}
                onBlur={(e) => (e.target.style.borderColor = DS.border)}
                data-testid="input-name"
              />
              <input
                type="text" placeholder="Organization" value={formData.org}
                onChange={(e) => setFormData({ ...formData, org: e.target.value })}
                style={formInputStyle}
                onFocus={(e) => (e.target.style.borderColor = DS.red)}
                onBlur={(e) => (e.target.style.borderColor = DS.border)}
                data-testid="input-org"
              />
              <input
                type="text" placeholder="Title" value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                style={formInputStyle}
                onFocus={(e) => (e.target.style.borderColor = DS.red)}
                onBlur={(e) => (e.target.style.borderColor = DS.border)}
                data-testid="input-title"
              />
              <input
                type="email" placeholder="Email" value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={formInputStyle}
                onFocus={(e) => (e.target.style.borderColor = DS.red)}
                onBlur={(e) => (e.target.style.borderColor = DS.border)}
                data-testid="input-email"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 w-full justify-center mt-6"
              style={primaryButtonStyle()}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = DS.redHover)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = DS.red)}
              data-testid="button-submit"
            >
              Submit
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        {formSubmitted && (
          <div className="text-center mb-14" style={cardStyle} data-testid="form-confirmation">
            <p style={{ fontSize: 17, color: DS.black, fontWeight: 600, marginBottom: 12, fontFamily: DS.font }}>
              We'll be in touch within one business day.
            </p>
            <button
              onClick={handleExport}
              disabled={isExporting}
              style={{ fontSize: 15, color: DS.body, textDecoration: 'underline', textUnderlineOffset: '2px', cursor: isExporting ? 'wait' : 'pointer', background: 'none', border: 'none', fontFamily: DS.font, fontWeight: 500 }}
              data-testid="button-copy-link"
            >
              {isExporting ? 'Generating PDF...' : 'Download your assessment'}
            </button>
          </div>
        )}

        <p className="text-center" style={{ fontSize: 13, color: DS.muted, lineHeight: 1.6, fontFamily: DS.font }}>
          Conservative estimates based on Abridge deployment benchmarks.<br />
          Methodology available on request.
        </p>
      </div>
    </div>
  );
}
