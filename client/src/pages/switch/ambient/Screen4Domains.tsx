import { useState, useEffect, useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { DS } from "./designTokens";
import { useAssessment } from "@/lib/assessment";
import { calculateAmbientScore, formatDollar, type AmbientDomainValues } from "./ambientCalculator";
import { ABRIDGE_BENCHMARKS, VALUE_ASSUMPTIONS } from "@/lib/switchGapCalculator";
import { PageTransition } from "@/components/PageTransition";

interface Screen4Props {
  onNext: () => void;
  onBack: () => void;
}

type Domain = 'capacity' | 'revenue' | 'workforce' | 'risk';
const DOMAIN_ORDER: Domain[] = ['capacity', 'revenue', 'workforce', 'risk'];
const DOMAIN_LABELS: Record<Domain, { short: string; full: string }> = {
  capacity: { short: 'C', full: 'Capacity' },
  revenue: { short: 'R', full: 'Revenue' },
  workforce: { short: 'W', full: 'Workforce' },
  risk: { short: 'X', full: 'Risk' },
};

const DOMAIN_CTA: Record<Domain, string> = {
  capacity: 'See Revenue Impact',
  revenue: 'See Workforce Impact',
  workforce: 'See Risk Exposure',
  risk: 'See My Full Gap',
};

export default function Screen4Domains({ onNext, onBack }: Screen4Props) {
  const { state } = useAssessment();
  const { inputs } = state;
  const [activeDomain, setActiveDomain] = useState<Domain>('capacity');
  const [showCTA, setShowCTA] = useState(false);

  const result = useMemo(() => calculateAmbientScore(
    inputs.providers, inputs.annualEncounters,
    inputs.utilization || 45, inputs.timeSavedPerEncounter || 2.0,
    inputs.dataMode,
  ), [inputs]);

  useEffect(() => {
    setShowCTA(false);
    const t = setTimeout(() => setShowCTA(true), 1600);
    return () => clearTimeout(t);
  }, [activeDomain]);

  const handleAdvance = () => {
    const idx = DOMAIN_ORDER.indexOf(activeDomain);
    if (idx < DOMAIN_ORDER.length - 1) {
      setActiveDomain(DOMAIN_ORDER[idx + 1]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      onNext();
    }
  };

  const utilization = inputs.utilization || 45;
  const timeSavings = inputs.timeSavedPerEncounter || 2.0;

  const domainContent = useMemo((): Record<Domain, {
    headline: string;
    leftLabel: string; leftPrimary: string; leftPrimaryDesc: string; leftSecondary: string; leftSecondaryDesc: string;
    rightLabel: string; rightPrimary: string; rightPrimaryDesc: string; rightGap: string; rightGapDesc: string;
    rightNote?: string;
    insight: string;
  }> => {
    const yourDoc = result.yourDocumented;
    const abridgeDoc = result.abridgeDocumented;
    const gapEnc = result.utilizationGapEncounters;
    const gapHrs = Math.max(0, result.abridgeHours - result.yourHours);
    const timeDiff = (4.0 - timeSavings).toFixed(1);

    return {
      capacity: {
        headline: "Your utilization gap.",
        leftLabel: "YOUR CURRENT", leftPrimary: `${utilization}%`, leftPrimaryDesc: "utilization rate",
        leftSecondary: yourDoc.toLocaleString(), leftSecondaryDesc: "encounters documented annually",
        rightLabel: "DOCUMENTATION-INTELLIGENT", rightPrimary: "76%", rightPrimaryDesc: "documentation-intelligent average",
        rightGap: `+${gapEnc.toLocaleString()}`, rightGapDesc: "encounters currently undocumented",
        insight: `At ${utilization}% utilization, ${gapEnc.toLocaleString()} eligible encounters annually go undocumented. Every undocumented encounter represents unrealized clinical supply \u2014 capacity that exists in your operations but never reaches your enterprise.`,
      },
      revenue: {
        headline: "Your revenue integrity gap.",
        leftLabel: "YOUR CURRENT", leftPrimary: `${timeSavings.toFixed(1)} min`, leftPrimaryDesc: "returned per encounter",
        leftSecondary: result.yourHours.toLocaleString() + " hrs", leftSecondaryDesc: "returned annually",
        rightLabel: "DOCUMENTATION-INTELLIGENT", rightPrimary: "4.0 min", rightPrimaryDesc: "documentation-intelligent average",
        rightGap: `+${gapHrs.toLocaleString()} hrs`, rightGapDesc: "additional capacity",
        insight: `Documentation fidelity governs reimbursement accuracy at every encounter. The ${timeDiff} minute gap in time returned per encounter compounds across ${yourDoc.toLocaleString()} annual encounters \u2014 affecting E/M coding accuracy, denial rates, and HCC capture simultaneously.`,
      },
      workforce: {
        headline: "Your workforce stability exposure.",
        leftLabel: "YOUR CURRENT", leftPrimary: `${result.afterHoursEstimate.toLocaleString()} hrs`, leftPrimaryDesc: "after-hours burden estimate",
        leftSecondary: "", leftSecondaryDesc: "",
        rightLabel: "DOCUMENTATION-INTELLIGENT",
        rightPrimary: "", rightPrimaryDesc: "Documentation-intelligent organizations report significantly lower after-hours charting burden and turnover attribution to documentation.",
        rightGap: formatDollar(Math.round(result.domains.workforce * result.haircut)), rightGapDesc: "estimated annual exposure",
        rightNote: `Based on ${timeSavings.toFixed(1)} min/encounter benchmark`,
        insight: `After-hours documentation burden is the leading self-reported driver of physician burnout. At your current efficiency profile, your providers are carrying an estimated ${result.afterHoursEstimate.toLocaleString()} hours of after-hours charting annually \u2014 a direct input to turnover risk and premium labor cost.`,
      },
      risk: {
        headline: "Your risk and compliance posture.",
        leftLabel: "YOUR CURRENT", leftPrimary: result.riskLevel, leftPrimaryDesc: "documentation defensibility",
        leftSecondary: "", leftSecondaryDesc: "",
        rightLabel: "DOCUMENTATION-INTELLIGENT",
        rightPrimary: "", rightPrimaryDesc: "Documentation-intelligent organizations maintain audit-ready, structured, defensible notes at scale.",
        rightGap: formatDollar(Math.round(result.domains.risk * result.haircut)), rightGapDesc: "estimated annual exposure",
        insight: `Documentation infrastructure governs audit defensibility, quality reporting accuracy, and downstream automation readiness. At your current maturity, your organization carries structural exposure in each of these dimensions \u2014 exposure that compounds as payer scrutiny increases.`,
      },
    };
  }, [result, utilization, timeSavings]);

  const content = domainContent[activeDomain];

  return (
    <div style={{ fontFamily: DS.font, paddingTop: 80, paddingBottom: 80 }}>
      <div className="flex justify-center gap-2 mb-12 flex-wrap">
        {DOMAIN_ORDER.map((d) => {
          const idx = DOMAIN_ORDER.indexOf(d);
          const activeIdx = DOMAIN_ORDER.indexOf(activeDomain);
          const isActive = d === activeDomain;
          const isComplete = idx < activeIdx;
          const isUpcoming = idx > activeIdx;

          return (
            <div
              key={d}
              className="flex items-center gap-1.5"
              style={{
                padding: '6px 14px', borderRadius: DS.radius.pill, fontSize: 12, fontWeight: 600,
                letterSpacing: '2px', textTransform: 'uppercase', fontFamily: DS.font, transition: 'all 200ms ease',
                backgroundColor: isActive ? DS.red : isComplete ? DS.black : DS.border,
                color: isActive || isComplete ? DS.white : DS.muted,
              }}
              data-testid={`domain-pill-${d}`}
            >
              <span>{DOMAIN_LABELS[d].short}</span>
              <span className="hidden sm:inline">{DOMAIN_LABELS[d].full}</span>
            </div>
          );
        })}
      </div>

      <div className="max-w-[600px] mx-auto">
        <PageTransition pageKey={`domain-${activeDomain}`}>
          <div>
            <p style={{ fontWeight: 600, fontSize: 11, color: DS.muted, letterSpacing: '2.5px', textTransform: 'uppercase' }} className="mb-2.5" data-testid="text-domain-label">
              {DOMAIN_LABELS[activeDomain].full}
            </p>
            <h1 style={{ fontWeight: 700, fontSize: 'clamp(38px, 5vw, 52px)', color: DS.black, lineHeight: 1.15 }} className="mb-10" data-testid="text-domain-headline">
              {content.headline}
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div style={{ backgroundColor: DS.bg, border: `1px solid ${DS.border}`, borderRadius: DS.radius.card, padding: 32 }} data-testid="card-domain-current">
                <p style={{ fontWeight: 600, fontSize: 11, color: DS.muted, letterSpacing: '2.5px', textTransform: 'uppercase' }} className="mb-4">
                  {content.leftLabel}
                </p>
                {content.leftPrimary && <p style={{ fontWeight: 700, fontSize: 48, color: DS.black, lineHeight: 1 }} className="mb-1">{content.leftPrimary}</p>}
                <p style={{ fontSize: 15, color: DS.muted }} className="mb-5">{content.leftPrimaryDesc}</p>
                {content.leftSecondary && (
                  <>
                    <div style={{ height: 1, backgroundColor: DS.border }} className="mb-5" />
                    <p style={{ fontWeight: 700, fontSize: 24, color: DS.black }} className="mb-1">{content.leftSecondary}</p>
                    <p style={{ fontSize: 13, color: DS.muted }}>{content.leftSecondaryDesc}</p>
                  </>
                )}
              </div>

              <div style={{ backgroundColor: DS.white, border: `1px solid ${DS.border}`, borderLeft: `4px solid ${DS.red}`, borderRadius: DS.radius.card, padding: 32, boxShadow: DS.shadow }} data-testid="card-domain-intelligent">
                <p style={{ fontWeight: 600, fontSize: 11, color: DS.muted, letterSpacing: '2.5px', textTransform: 'uppercase' }} className="mb-4">
                  {content.rightLabel}
                </p>
                {content.rightPrimary && <p style={{ fontWeight: 700, fontSize: 48, color: DS.black, lineHeight: 1 }} className="mb-1">{content.rightPrimary}</p>}
                <p style={{ fontSize: 15, color: DS.muted }} className="mb-5">{content.rightPrimaryDesc}</p>
                <div style={{ height: 1, backgroundColor: DS.border }} className="mb-5" />
                <p style={{ fontWeight: 700, fontSize: 24, color: DS.red }} className="mb-1">{content.rightGap}</p>
                <p style={{ fontSize: 13, color: DS.muted }}>{content.rightGapDesc}</p>
                {content.rightNote && <p style={{ fontSize: 13, color: DS.muted, marginTop: 8 }}>{content.rightNote}</p>}
              </div>
            </div>

            <div style={{ backgroundColor: DS.bg, border: `1px solid ${DS.border}`, borderRadius: DS.radius.card, padding: 32 }} className="mb-10" data-testid="card-domain-insight">
              <p style={{ fontSize: 17, color: DS.body, lineHeight: 1.75 }}>
                {content.insight}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <button onClick={onBack} style={{ fontSize: 15, color: DS.body, textDecoration: 'underline', textUnderlineOffset: '2px', cursor: 'pointer', background: 'none', border: 'none', fontFamily: DS.font, fontWeight: 500 }} data-testid="button-back">
                Back
              </button>
              <button
                onClick={handleAdvance}
                className="inline-flex items-center gap-2 transition-all duration-300"
                style={{
                  fontFamily: DS.font, fontWeight: 600, fontSize: 15, padding: '15px 36px', borderRadius: DS.radius.input,
                  backgroundColor: DS.red, color: DS.white, border: 'none', cursor: 'pointer',
                  opacity: showCTA ? 1 : 0,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = DS.redHover)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = DS.red)}
                data-testid="button-domain-next"
              >
                {DOMAIN_CTA[activeDomain]}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </PageTransition>
      </div>
    </div>
  );
}
