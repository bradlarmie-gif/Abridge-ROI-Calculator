import { useState, useMemo } from "react";
import { ArrowRight, Download } from "lucide-react";
import { DS } from "./designTokens";
import { useAssessment } from "@/lib/assessment";
import { calculateAmbientScore, formatDollar, formatDollarFull } from "./ambientCalculator";

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

  const topDomainName = DOMAIN_NAMES[result.topDomain] || 'Capacity Creation';
  const topDomainOps = DOMAIN_OPS[result.topDomain];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
  };

  const handleExport = () => {
    const text = [
      `ABRIDGE DOCUMENTATION INTELLIGENCE ASSESSMENT`,
      ``,
      `Documentation Intelligence Score: ${result.score} / 100`,
      ``,
      `Domain Breakdown:`,
      `  Capacity:  ${formatDollar(Math.round(result.domains.capacity * result.haircut))}`,
      `  Revenue:   ${formatDollar(Math.round(result.domains.revenue * result.haircut))}`,
      `  Workforce: ${formatDollar(Math.round(result.domains.workforce * result.haircut))}`,
      `  Risk:      ${formatDollar(Math.round(result.domains.risk * result.haircut))}`,
      ``,
      `Total Annual Gap: ${formatDollarFull(result.displayedTotal)}`,
      `Monthly Cost of Inaction: ${formatDollarFull(result.monthlyGap)}`,
      ``,
      `Organization Profile:`,
      `  Providers: ${inputs.providers}`,
      `  Annual Encounters: ${inputs.annualEncounters.toLocaleString()}`,
      `  Utilization: ${inputs.utilization || 45}%`,
      `  Time Saved: ${(inputs.timeSavedPerEncounter || 2.0).toFixed(1)} min/encounter`,
      ``,
      `Conservative estimate. Methodology available on request.`,
    ].join('\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'abridge-assessment.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const inputStyle: React.CSSProperties = {
    fontFamily: DS.font, fontWeight: 600, fontSize: 18, color: DS.black,
    backgroundColor: DS.white, border: `1.5px solid ${DS.border}`, borderRadius: DS.radius.input,
    padding: '14px 18px', width: '100%', outline: 'none', transition: 'border-color 150ms ease',
  };

  return (
    <div style={{ fontFamily: DS.font, paddingTop: 80, paddingBottom: 80 }}>
      <div className="max-w-[520px] mx-auto">
        <p style={{ fontWeight: 600, fontSize: 11, color: DS.muted, letterSpacing: '2.5px', textTransform: 'uppercase' }} className="mb-6" data-testid="text-screen6-label">
          Your Score
        </p>

        <div className="flex items-start justify-between gap-8 mb-6 flex-wrap">
          <div>
            <p style={{ fontSize: 13, color: DS.muted }} className="mb-1">Your Score</p>
            <p style={{ fontSize: 36, fontWeight: 700, color: DS.black }}>{result.score} <span style={{ fontSize: 20, color: DS.muted, fontWeight: 400 }}>/ 100</span></p>
          </div>
          <div>
            <p style={{ fontSize: 13, color: DS.muted }} className="mb-1">Top Quartile</p>
            <p style={{ fontSize: 36, fontWeight: 700, color: DS.black }}>71 <span style={{ fontSize: 20, color: DS.muted, fontWeight: 400 }}>/ 100</span></p>
          </div>
        </div>

        <div style={{ width: '100%', height: 6, backgroundColor: DS.border, borderRadius: 3, overflow: 'hidden', marginBottom: 20, position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${Math.min(result.score, 100)}%`, backgroundColor: DS.red, borderRadius: 3 }} />
          <div style={{ position: 'absolute', left: `${Math.min(result.score, 100)}%`, top: 0, height: '100%', width: `${Math.max(0, 71 - result.score)}%`, backgroundColor: DS.border }} />
          <div style={{ position: 'absolute', left: '71%', top: 0, height: '100%', width: '29%', backgroundColor: '#F5F5F4' }} />
        </div>

        <p style={{ fontSize: 17, color: DS.body, lineHeight: 1.75 }} className="mb-14" data-testid="text-capture-line">
          You are capturing approximately {result.score}% of the enterprise value flowing through your documentation infrastructure.
        </p>

        <div style={{ height: 1, backgroundColor: DS.border, marginBottom: 56 }} />

        <p style={{ fontWeight: 600, fontSize: 11, color: DS.muted, letterSpacing: '2.5px', textTransform: 'uppercase' }} className="mb-4">
          Highest-Leverage Opportunity
        </p>

        <div style={{ backgroundColor: DS.white, border: `1px solid ${DS.border}`, borderLeft: `4px solid ${DS.red}`, borderRadius: DS.radius.card, padding: 32, boxShadow: DS.shadow }} className="mb-14" data-testid="card-top-opportunity">
          <p style={{ fontSize: 20, fontWeight: 700, color: DS.black }} className="mb-2">{topDomainName}</p>
          <p style={{ fontSize: 32, fontWeight: 700, color: DS.red }} className="mb-4">{formatDollarFull(result.topDomainValue)} annually</p>
          <div style={{ height: 1, backgroundColor: DS.border, marginBottom: 16 }} />
          <p style={{ fontSize: 15, color: DS.body, lineHeight: 1.75 }}>
            {topDomainOps.meaning} {topDomainOps.action}
          </p>
        </div>

        <div style={{ height: 1, backgroundColor: DS.border, marginBottom: 56 }} />

        <div className="text-center mb-8">
          <h2 style={{ fontSize: 32, fontWeight: 700, color: DS.black, lineHeight: 1.3, maxWidth: 400, margin: '0 auto' }} data-testid="text-invitation-headline">
            Would you like to see what documentation intelligence looks like at your scale?
          </h2>
          <p style={{ fontSize: 15, color: DS.muted, lineHeight: 1.75, marginTop: 20 }}>
            This is not a product demonstration.<br />
            It is a 30-minute working session.
          </p>
        </div>

        {!showForm && !formSubmitted && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 w-full sm:w-auto justify-center"
              style={{
                fontFamily: DS.font, fontWeight: 600, fontSize: 15, padding: '15px 36px', borderRadius: DS.radius.input,
                backgroundColor: DS.red, color: DS.white, border: 'none', cursor: 'pointer',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = DS.redHover)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = DS.red)}
              data-testid="button-request-session"
            >
              Request a Working Session
              <ArrowRight size={16} />
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 w-full sm:w-auto justify-center"
              style={{
                fontFamily: DS.font, fontWeight: 500, fontSize: 15, padding: '13px 28px', borderRadius: DS.radius.input,
                backgroundColor: 'transparent', color: DS.black, border: `1.5px solid ${DS.black}`, cursor: 'pointer',
                transition: 'background 150ms ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = DS.hoverBg)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              data-testid="button-export"
            >
              <Download size={16} />
              Export My Assessment
            </button>
          </div>
        )}

        {showForm && !formSubmitted && (
          <form onSubmit={handleSubmit} style={{ backgroundColor: DS.bg, border: `1px solid ${DS.border}`, borderRadius: DS.radius.card, padding: 32 }} className="mb-14" data-testid="form-contact">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <input
                type="text" placeholder="Name" value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = DS.red)}
                onBlur={(e) => (e.target.style.borderColor = DS.border)}
                data-testid="input-name"
              />
              <input
                type="text" placeholder="Organization" value={formData.org}
                onChange={(e) => setFormData({ ...formData, org: e.target.value })}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = DS.red)}
                onBlur={(e) => (e.target.style.borderColor = DS.border)}
                data-testid="input-org"
              />
              <input
                type="text" placeholder="Title" value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = DS.red)}
                onBlur={(e) => (e.target.style.borderColor = DS.border)}
                data-testid="input-title"
              />
              <input
                type="email" placeholder="Email" value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = DS.red)}
                onBlur={(e) => (e.target.style.borderColor = DS.border)}
                data-testid="input-email"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 w-full justify-center mt-6"
              style={{
                fontFamily: DS.font, fontWeight: 600, fontSize: 15, padding: '15px 36px', borderRadius: DS.radius.input,
                backgroundColor: DS.red, color: DS.white, border: 'none', cursor: 'pointer',
              }}
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
          <div className="text-center mb-14" style={{ backgroundColor: DS.bg, border: `1px solid ${DS.border}`, borderRadius: DS.radius.card, padding: 32 }} data-testid="form-confirmation">
            <p style={{ fontSize: 17, color: DS.black, fontWeight: 600, marginBottom: 12 }}>
              We'll be in touch within one business day.
            </p>
            <button
              onClick={handleExport}
              style={{ fontSize: 15, color: DS.body, textDecoration: 'underline', textUnderlineOffset: '2px', cursor: 'pointer', background: 'none', border: 'none', fontFamily: DS.font, fontWeight: 500 }}
              data-testid="button-copy-link"
            >
              Copy your assessment link
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
