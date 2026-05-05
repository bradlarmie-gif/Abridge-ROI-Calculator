import { motion } from "framer-motion";
import { ArrowLeft, Download, ArrowRight, Activity, Stethoscope, Heart, Loader2, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { generateMethodologyPDF } from "@/lib/methodology-pdf-export";
import abridgeLogo from '@assets/abridge-logo-wordmark-red_1769020684647.png';
import { CollapsibleSection, ImpactBadge, type BadgeType } from "@/components/methodology/MethodologyShared";

interface MethodologyInpatientProps {
  onBack: () => void;
  onNavigateToSetting?: (setting: string) => void;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type IPDomainName = "CAPACITY" | "WORKFORCE" | "REVENUE" | "QUALITY";

type IPMechanism = { label: string; description: string };

type IPMetricItem = {
  label: string;
  badge: BadgeType;
  explanation: string;
  whenToExpect?: string;
  formula?: string;
};

type IPDomainData = {
  domain: IPDomainName;
  tagline: string;
  outcomes: { label: string; direction: "↑" | "↓" }[];
  problem: string;
  mechanisms: IPMechanism[];
};

const ipDomainColors: Record<IPDomainName, string> = {
  CAPACITY: "#888888",
  WORKFORCE: "#555555",
  REVENUE: "#EA2C00",
  QUALITY: "#1A1A1A",
};

// ─── Domain Methodology Data ──────────────────────────────────────────────────

const ipDomainData: IPDomainData[] = [
  {
    domain: "CAPACITY",
    tagline: "Rounding Time & Note Burden",
    outcomes: [
      { label: "Physician hours returned", direction: "↑" },
      { label: "After-hours charting", direction: "↓" },
    ],
    problem: "Hospitalists manage 15–20 patients per day, each requiring an H&P at admission, a daily progress note, and responses to consultant recommendations. Documentation consumes 2–4 hours per shift before a single note is written after the shift ends. The bottleneck isn't clinical complexity — it's the time required to convert what was verbalized into what gets charted.",
    mechanisms: [
      { label: "H&P time per admission", description: "The H&P is the most documentation-intensive note in the admission. Ambient capture converts it from a 20–45 minute writing exercise to a 5–10 minute review — generating a draft from the actual admission conversation rather than from memory." },
      { label: "Progress note time per patient per day", description: "Hospitalists write a progress note for each of their 15–20 patients every day. At 8–15 minutes per note, that's 2–4 hours of daily charting. Ambient capture drafts each note from the rounding conversation — reducing it to a 2–4 minute review per patient." },
      { label: "Consult documentation time", description: "Specialist consultation notes typically take 20–35 minutes to complete from scratch. Ambient capture drafts the consult note during the encounter — preserving the specialist's clinical reasoning without a separate documentation session." },
      { label: "After-hours documentation carry-over", description: "Incomplete notes from the shift carry over into after-hours. When ambient capture handles documentation in real time, the after-shift queue shrinks — what used to be 1–2 hours of midnight charting becomes a quick review queue." },
    ],
  },
  {
    domain: "WORKFORCE",
    tagline: "Clinician Wellbeing & Retention",
    outcomes: [
      { label: "Hospitalist satisfaction", direction: "↑" },
      { label: "Voluntary turnover", direction: "↓" },
    ],
    problem: "Hospitalist burnout is driven by documentation volume in a way that's uniquely visible — 15 progress notes per shift is not occasional overtime, it's the daily workload. When physicians cite burnout in exit interviews, documentation burden is consistently in the top two reasons. Replacement runs $250K–$500K per departure, and the hospitalist talent market is tight.",
    mechanisms: [
      { label: "After-shift charting time (pajama time)", description: "Hospitalists average 60–90 minutes of post-shift documentation per shift. Ambient capture generates drafts in real time, so the post-shift queue is review rather than creation — returning that time to physicians." },
      { label: "Cognitive load during rounding", description: "The mental overhead of knowing you have 15 progress notes to write after seeing 15 patients. When documentation writes itself during the encounter, physicians can be fully present in the conversation instead of mentally composing the note while the patient is talking." },
      { label: "Clinician satisfaction scores", description: "Validated instruments (Mini Z, SHM burnout surveys) show documentation burden as the top driver in hospital medicine. Track the documentation subscore specifically among Abridge users — it's more attributable and moves faster than composite scores." },
      { label: "Locum utilization rate", description: "Locum coverage spikes when retention falters. Locum hourly rates run 2–3× employed physician costs. Track locum spend as a lagging indicator of retention pressure — when it starts declining, the workforce story is working." },
    ],
  },
  {
    domain: "REVENUE",
    tagline: "DRG Accuracy & Concurrent Review",
    outcomes: [
      { label: "CMI / DRG weight", direction: "↑" },
      { label: "Medical necessity denials", direction: "↓" },
    ],
    problem: "The H&P sets the DRG foundation. The progress note justifies continued stay. When either is incomplete — because the physician was managing 18 patients and ran out of time — the revenue impact is real: CDI sends a query, the coder downgrades the DRG, or the payer denies the continued stay. These are documentation failures, not clinical ones.",
    mechanisms: [
      { label: "CC/MCC capture in H&P and progress notes", description: "Complication and Comorbidity (CC) and Major Comorbidity (MCC) documentation drives DRG weighting. When H&Ps and progress notes capture qualifying conditions with the specificity required for CC/MCC assignment, DRG weight improves where it's clinically warranted. CDI tracks this daily." },
      { label: "CDI query-to-documentation loop", description: "When the H&P or progress note doesn't capture what the physician verbalized, CDI sends a query — back to the physician, requiring a response, delaying coding, adding CDI labor. Better documentation breaks this loop before it starts." },
      { label: "Concurrent review documentation quality", description: "Payers audit continued inpatient status by reading daily progress notes. When notes capture clinical reasoning for continued stay — not just treatment activities — concurrent review is more defensible and medical necessity denials drop." },
      { label: "H&P within CMS 24-hour rule", description: "CMS requires the H&P within 24 hours of admission. Late H&Ps are a regulatory risk and delay CDI engagement that sets the DRG trajectory. Ambient capture makes the H&P faster and more complete — improving both compliance and coding accuracy at admission." },
    ],
  },
  {
    domain: "QUALITY",
    tagline: "Documentation Integrity & Clinical Defensibility",
    outcomes: [
      { label: "CDI query volume", direction: "↓" },
      { label: "HCAHPS Doctor Communication", direction: "↑" },
    ],
    problem: "Quality documentation in inpatient care is a team sport. CDI, coding, payers, and downstream clinicians all depend on what the physician writes. When notes are incomplete — not because the clinical work wasn't done but because there wasn't time to document it — every downstream team works harder to recover the clinical picture.",
    mechanisms: [
      { label: "CDI query volume per admission", description: "Each CDI query represents a documentation gap — something said or known that didn't make it into the note. Ambient capture reduces these gaps at the point of care. Most CDI departments track query rates daily and can show before/after comparison within 60–90 days." },
      { label: "H&P completeness and specificity", description: "The H&P is the foundation of the inpatient record. When it captures the full clinical picture — presenting history, comorbidities, exam findings, and clinical reasoning for admission — downstream CDI, coding, and care team communication all improve." },
      { label: "Consult note completeness", description: "Specialist consultation notes support complex DRG coding and care coordination. When consult notes are complete and specific — capturing the specialist's assessment and differential — the hospitalist, CDI, and coding teams have richer content to work with." },
      { label: "HCAHPS Doctor Communication score", description: "The 'doctor listened carefully / explained things clearly' composite in value-based purchasing. When physicians spend less time at the keyboard during rounds, patients notice. CMS puts 2% of Medicare inpatient payments at risk based on HCAHPS scores." },
    ],
  },
];

// ─── Metric Items ─────────────────────────────────────────────────────────────

const ipMetricItems: Record<IPDomainName, IPMetricItem[]> = {
  CAPACITY: [
    {
      label: "Documentation Time Per Note Type",
      badge: "Signal",
      explanation: "EHR session timestamps show how long H&Ps, progress notes, and consult responses take. In inpatient, savings stack across note types — 15–30 minutes per H&P, 5–10 minutes per daily progress note across 15–20 patients. Visible in EHR audit data within 4–6 weeks for consistent users.",
      whenToExpect: "Week 4–8. EHR session data is the cleanest early metric — no billing cycle, no CDI engagement needed. Often the first metric leaders ask for.",
      formula: "(Minutes saved per H&P + minutes saved per progress note × avg census) / 60 = physician hours returned per shift",
    },
    {
      label: "After-Shift Documentation Burden",
      badge: "Signal",
      explanation: "Time spent charting after shift end — the most visceral metric for hospitalist buy-in. Hospitalists average 60–90 minutes of post-shift documentation per shift. When ambient capture drafts notes in real time, the after-shift queue becomes a review queue. EHR session data after shift end is directly measurable for the same providers before vs. after deployment.",
      whenToExpect: "Week 4–8. Often the most dramatic early signal in inpatient. Physicians talk about it to each other — and that conversation is your adoption strategy.",
    },
    {
      label: "Consult Turnaround Time",
      badge: "Trend",
      explanation: "Time from consult request to completed consult note. When the consult note drafts from the consultation encounter, turnaround time shrinks — improving the hospitalist's ability to act on specialist recommendations and reducing note-lag in complex cases.",
      whenToExpect: "Month 2–3. Track consult request timestamps vs. note completion timestamps in the EHR.",
    },
  ],
  WORKFORCE: [
    {
      label: "After-Shift Charting Time",
      badge: "Signal",
      explanation: "Time spent documenting after the shift ends. Hospitalists average 60–90 minutes of post-shift charting per shift — cutting into sleep, family time, and cognitive recovery. Ambient capture generates note drafts in real time, so the after-shift queue becomes a review queue. EHR session logs after shift end are directly measurable.",
      whenToExpect: "Week 4–8 for active users. The fastest physician behavior metric to move — no billing cycle, no downstream process dependency.",
    },
    {
      label: "Hospitalist Satisfaction Score",
      badge: "Trend",
      explanation: "Validated instruments (Mini Z, SHM/ACP surveys, internal pulse surveys) consistently rank documentation burden as the top driver of hospitalist burnout. Track the documentation-specific subscore among Abridge users vs. a control group. More attributable and more Abridge-moveable than composite burnout scores.",
      whenToExpect: "Month 2–4 for validated survey signal. Internal pulse surveys can show directional movement earlier.",
    },
    {
      label: "Voluntary Hospitalist Turnover",
      badge: "Proof",
      explanation: "Replacing a hospitalist costs $250K–$500K fully loaded — recruitment, credentialing, locum coverage during the gap, productivity ramp. Documentation burden is consistently cited in exit interviews. Use this to anchor the 3-year value story, not to prove short-term ROI. Track exit interview data and compare Abridge-enabled programs vs. those without.",
      whenToExpect: "Month 12–18 for statistically meaningful data. Don't claim causation without sufficient N and exit interview evidence.",
    },
  ],
  REVENUE: [
    {
      label: "CDI Query Reduction Per Admission",
      badge: "Signal",
      explanation: "CDI departments track query rates daily — one of the fastest post-deployment signals. When H&Ps and progress notes capture what was verbalized, CDI specialists receive fewer queries. ACDIS benchmark: 25–35% query rate, $50/query in CDI specialist time. Even a 20% reduction is meaningful at volume.",
      whenToExpect: "Month 2–3. CDI teams can pull before/after comparison within two billing cycles. Often the first financial signal leadership asks for.",
      formula: "Admissions × CDI query rate × reduction % × $50/query = CDI labor savings",
    },
    {
      label: "CC/MCC Capture Rate",
      badge: "Trend",
      explanation: "When H&Ps and progress notes capture qualifying comorbidities and complications with the specificity required for CC/MCC coding, DRG weight improves where it's clinically warranted. CDI tracks CC/MCC capture rates per discharge — compare Abridge-enabled providers against a control cohort for a credible signal.",
      whenToExpect: "Month 3–6. Requires sufficient discharge volume for statistical significance. Compare same providers before and after, or Abridge vs. non-Abridge cohorts.",
      formula: "CC/MCC capture rate improvement × discharges × average DRG weight delta × base payment rate",
    },
    {
      label: "Medical Necessity Denial Rate",
      badge: "Proof",
      explanation: "Payers deny continued inpatient status when progress notes document what was done rather than why the patient still needed inpatient-level care. When notes capture clinical reasoning — not just treatment activities — concurrent review is more defensible. RCM teams track documentation-related denial root cause specifically.",
      whenToExpect: "Month 4–8. RCM denial root-cause data requires 90+ days of claims volume. Isolate documentation-related denials from other denial causes.",
      formula: "(denial rate before − after, in pp) × annual admissions × $3,500/case × attribution %",
    },
  ],
  QUALITY: [
    {
      label: "CDI Query Volume Per Admission",
      badge: "Signal",
      explanation: "How often CDI specialists send queries back to the attending to clarify the clinical picture for DRG coding. Better H&Ps and progress notes answer these questions before they're asked. CDI departments track this daily — before/after comparison is fast and clean.",
      whenToExpect: "Month 2–3. CDI query data already exists. This is a before/after comparison with data your CDI team already has.",
    },
    {
      label: "H&P Within CMS 24-Hour Rule",
      badge: "Signal",
      explanation: "CMS requires H&P completion within 24 hours of admission. Late H&Ps are a regulatory risk and delay care plan development, CDI engagement, and consultation requests. Ambient capture makes the H&P faster — improving both compliance rates and the quality of admission documentation.",
      whenToExpect: "Week 4–8. EHR timestamps for H&P completion vs. admission time are directly measurable. Often shows rapid improvement as the H&P drafts from the admission conversation.",
    },
    {
      label: "HCAHPS Doctor Communication Score",
      badge: "Trend",
      explanation: "The 'doctor listened carefully / explained things clearly' composite. Physicians using ambient documentation spend less time at the keyboard during rounds and more time in direct patient contact. Reported quarterly — track the doctor communication composite specifically. CMS puts 2% of Medicare inpatient payments at risk based on HCAHPS scores.",
      whenToExpect: "Month 3–6. HCAHPS is collected quarterly. Need 2–3 cycles for a meaningful trend. Isolate the doctor communication composite — it's the most directly Abridge-attributable HCAHPS domain.",
    },
  ],
};

// ─── IPMetricCard ─────────────────────────────────────────────────────────────

function IPMetricCard({ item }: { item: IPMetricItem }) {
  const [showFormula, setShowFormula] = useState(false);
  return (
    <div className="bg-white border border-[#E5E5E5] rounded-sm p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-[14px] font-bold text-black leading-snug">{item.label}</p>
        <ImpactBadge type={item.badge} />
      </div>
      <p className="text-[14px] text-[#444444] leading-relaxed mt-2">{item.explanation}</p>
      {item.whenToExpect && (
        <div className="bg-[#F5F0EB] rounded-sm px-4 py-2.5 mt-3">
          <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#888888] mb-1">When to expect</p>
          <p className="text-[12px] text-[#666666] leading-relaxed">{item.whenToExpect}</p>
        </div>
      )}
      {item.formula && (
        <div className="mt-3">
          <button
            onClick={() => setShowFormula(!showFormula)}
            className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[1.5px] text-[#EA2C00]"
            data-testid={`button-formula-${item.label.replace(/\s+/g, '-').toLowerCase()}`}
          >
            {showFormula ? "Hide formula" : "Show formula"}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFormula ? 'rotate-180' : ''}`} />
          </button>
          {showFormula && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-2 bg-[#F5F0EB] rounded-sm px-4 py-3"
            >
              <pre className="text-[12px] text-[#333333] leading-relaxed whitespace-pre-wrap font-mono">{item.formula}</pre>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── IPDomainCard ─────────────────────────────────────────────────────────────

function IPDomainCard({
  data,
  metrics,
  isExpanded,
  onToggle,
}: {
  data: IPDomainData;
  metrics: IPMetricItem[] | undefined;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const color = ipDomainColors[data.domain];
  const [expandedMechanism, setExpandedMechanism] = useState<string | null>(null);

  return (
    <div className="rounded-lg overflow-hidden border border-[#E5E5E5] mb-4 bg-white shadow-sm">
      <div className="bg-[#1A1A1A] px-7 py-6 flex items-start justify-between gap-6">
        <div className="flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[2.5px] mb-2 text-[#EA2C00]">
            {data.domain}
          </p>
          <h3 className="text-[22px] font-bold text-white leading-tight tracking-tight">{data.tagline}</h3>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-2 mt-1">
          {data.outcomes.map((o) => (
            <div
              key={o.label}
              className="flex items-center gap-2 bg-white/8 border border-white/15 rounded-sm px-3 py-1.5"
            >
              <span className="text-white/80 text-[12px] font-medium">{o.label}</span>
              <span className="text-[14px] font-bold" style={{ color }}>{o.direction}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white px-7 pt-5 pb-4">
        <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#AAAAAA] mb-2">The Problem</p>
        <p className="text-[14px] text-[#444444] leading-relaxed">{data.problem}</p>
      </div>

      <div className="bg-white px-7 pb-5 pt-1">
        <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#AAAAAA] mb-3">Value Mechanisms</p>
        <div className="space-y-0">
          {data.mechanisms.map((mechanism) => (
            <div key={mechanism.label} className="border-b border-[#F2EDE8] last:border-b-0">
              <button
                onClick={() => setExpandedMechanism(expandedMechanism === mechanism.label ? null : mechanism.label)}
                className="w-full flex items-center gap-3 py-2.5 text-left group"
                data-testid={`button-mechanism-${data.domain.toLowerCase()}-${mechanism.label.replace(/\s+/g, '-').toLowerCase()}`}
              >
                <div
                  className="w-[3px] h-4 rounded-full shrink-0 transition-opacity"
                  style={{ backgroundColor: '#EA2C00', opacity: expandedMechanism === mechanism.label ? 1 : 0.4 }}
                />
                <span className="flex-1 text-[13px] text-[#333333] font-medium group-hover:text-black transition-colors">
                  {mechanism.label}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#AAAAAA] transition-transform shrink-0 ${expandedMechanism === mechanism.label ? 'rotate-180' : ''}`}
                />
              </button>
              {expandedMechanism === mechanism.label && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="pb-3 pl-6 pr-2"
                >
                  <p className="text-[12px] text-[#666666] leading-relaxed border-l-2 border-[#EA2C00]/30 pl-3">
                    {mechanism.description}
                  </p>
                </motion.div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div
        onClick={onToggle}
        className="bg-[#F5F0EB] px-7 py-4 border-t border-[#EDE8E2] flex items-center justify-between cursor-pointer"
        data-testid={`button-toggle-domain-${data.domain.toLowerCase()}`}
      >
        <span className="text-[10px] font-bold uppercase tracking-[1.5px]" style={{ color }}>
          {isExpanded ? "Hide the metrics" : "Explore the metrics →"}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} style={{ color }} />
      </div>

      {isExpanded && metrics && metrics.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="bg-[#F5F0EB] px-7 pb-7 pt-4">
            <div className="space-y-3">
              {metrics.map((m) => (
                <IPMetricCard key={m.label} item={m} />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── IPDomainMethodologySection ───────────────────────────────────────────────

function IPDomainMethodologySection() {
  const [expandedDomain, setExpandedDomain] = useState<IPDomainName | null>(null);
  return (
    <div className="space-y-4">
      {ipDomainData.map((d) => (
        <IPDomainCard
          key={d.domain}
          data={d}
          metrics={ipMetricItems[d.domain]}
          isExpanded={expandedDomain === d.domain}
          onToggle={() => setExpandedDomain(expandedDomain === d.domain ? null : d.domain)}
        />
      ))}
    </div>
  );
}

// ─── IPValueArcSection ────────────────────────────────────────────────────────

function IPValueArcSection() {
  const stages: { badge: BadgeType; timing: string; title: string; description: string; domains: IPDomainName[] }[] = [
    {
      badge: "Signal",
      timing: "Week 4–8",
      title: "The Provider Feels It",
      description: "H&P and progress note drafts appear in real time. After-shift charting drops measurably. EHR session timestamps show documentation time falling within weeks of consistent use.",
      domains: ["CAPACITY", "WORKFORCE"],
    },
    {
      badge: "Trend",
      timing: "Month 2–4",
      title: "CDI Notices It",
      description: "Progress note specificity improves. CDI query rates drop as notes capture clinical reasoning without prompting. CC/MCC capture begins moving in claims data.",
      domains: ["QUALITY", "REVENUE"],
    },
    {
      badge: "Proof",
      timing: "Month 6–18",
      title: "The System Measures It",
      description: "CMI improvement validated against a provider cohort. Medical necessity denial rates traceable to documentation quality. Hospitalist retention signal begins to emerge.",
      domains: ["REVENUE", "WORKFORCE"],
    },
  ];

  const chipStyles: Record<IPDomainName, string> = {
    CAPACITY: "bg-[#F0EEEC] text-[#888888]",
    WORKFORCE: "bg-[#EDECEB] text-[#555555]",
    REVENUE: "bg-[#FFF0EC] text-[#EA2C00]",
    QUALITY: "bg-[#E8E8E8] text-[#1A1A1A]",
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 border border-[#E5E5E5] rounded-lg overflow-hidden divide-y md:divide-y-0 md:divide-x divide-[#E5E5E5]">
      {stages.map((stage) => {
        const cellBg =
          stage.badge === "Signal" ? "bg-white" : stage.badge === "Trend" ? "bg-[#F9F7F5]" : "bg-[#F5F0EB]";
        return (
          <div key={stage.badge} className={`${cellBg} px-6 py-6`}>
            <div className="flex items-center justify-between mb-3">
              <ImpactBadge type={stage.badge} />
              <span className="text-[11px] font-medium text-[#888888]">{stage.timing}</span>
            </div>
            <p className="text-[17px] font-bold text-black tracking-tight mb-2">{stage.title}</p>
            <p className="text-[12px] text-[#666666] leading-relaxed mb-4">{stage.description}</p>
            <div className="flex flex-wrap gap-1.5">
              {stage.domains.map((d) => (
                <span
                  key={d}
                  className={`rounded-sm px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${chipStyles[d]}`}
                >
                  {d}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MethodologyInpatient({ onBack, onNavigateToSetting }: MethodologyInpatientProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await generateMethodologyPDF("inpatient");
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('PDF export failed. Please try again or check your browser settings.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 bg-white border-b border-[#E5E5E5]">
        <div className="max-w-[800px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="flex items-center cursor-pointer bg-transparent border-none p-0" data-testid="link-home-logo">
              <img src={abridgeLogo} alt="Abridge" className="h-5 md:h-6" />
            </button>
            <span className="text-[#E5E5E5]">|</span>
            <button onClick={onBack} className="flex items-center gap-1 text-[#666666] hover:text-black transition-colors" data-testid="button-back">
              <ArrowLeft className="w-3 h-3" />
              <span className="text-xs font-medium uppercase tracking-wide">Methodology</span>
            </button>
          </div>
          <button onClick={handleExportPDF} disabled={isExporting} className="flex items-center gap-2 text-[#666666] hover:text-black transition-colors text-sm disabled:opacity-50" data-testid="button-export-pdf">
            <Download className="w-4 h-4" />
            <span>{isExporting ? "Exporting..." : "Export PDF"}</span>
          </button>
        </div>
      </header>

      <div className="max-w-[800px] mx-auto px-6 py-12">
        <motion.div className="text-center mb-12" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-[11px] font-bold uppercase tracking-[2.5px] text-[#EA2C00] mb-4">Inpatient</p>
          <h1 className="text-[32px] md:text-[40px] font-bold text-black leading-tight tracking-tight mb-4">
            How We Think<br />About Value
          </h1>
          <p className="text-[15px] text-[#666666] max-w-[560px] mx-auto leading-relaxed">
            H&P notes, progress notes, and consult documentation — the three note types where documentation quality becomes DRG accuracy and clinician time.
          </p>
        </motion.div>

        <div className="mb-10">
          <div className="mb-6 pb-3 border-b-2 border-[#EA2C00]">
            <p className="text-[11px] font-bold uppercase tracking-[2.5px] text-[#888888] mb-2">The Inpatient Value Story</p>
            <h2 className="text-[24px] font-bold text-black tracking-tight">Four Domains of Value</h2>
            <p className="text-sm text-[#888888] mt-1">
              Four domains. Each has a distinct problem, a set of mechanisms, and a measurement path. Start with whichever matters most to your hospitalist program.
            </p>
          </div>
          <IPDomainMethodologySection />
        </div>

        <div className="mb-10">
          <div className="mb-6 pb-3 border-b-2 border-[#EA2C00]">
            <p className="text-[11px] font-bold uppercase tracking-[2.5px] text-[#888888] mb-2">Value Arc</p>
            <h2 className="text-[24px] font-bold text-black tracking-tight">How It Accrues Over Time</h2>
            <p className="text-sm text-[#888888] mt-1">
              Value doesn't arrive all at once. The sequence is mechanistically predictable — not arbitrary.
            </p>
          </div>
          <IPValueArcSection />
        </div>

        <div className="mt-12 mb-10">
          <div className="mb-6">
            <p className="text-[11px] font-bold uppercase tracking-[2.5px] text-[#888888] mb-2">Methodology Reference</p>
            <h2 className="text-[24px] font-bold text-black tracking-tight">The Full Framework</h2>
            <p className="text-[14px] text-[#888888] mt-1.5">Formulas, assumptions, and honest limits — for the scrutinizers in the room.</p>
          </div>
          <div className="divide-y divide-[#E5E5E5] border border-[#E5E5E5] rounded-lg overflow-hidden">
            <div className="px-6">
              <CollapsibleSection sectionId="what-goes-in" title="What Goes Into the Number" subtitle="Exactly what the calculator uses — and what it doesn't">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#D1D5DB]">
                        <th className="text-left py-3 font-semibold text-black">Value Driver</th>
                        <th className="text-left py-3 font-semibold text-black">In the Calculator?</th>
                        <th className="text-left py-3 font-semibold text-black">Formula</th>
                      </tr>
                    </thead>
                    <tbody className="text-[#666666]">
                      <tr><td colSpan={3} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#EA2C00', borderColor: '#EA2C00' }}>Revenue</span></td></tr>
                      <tr className="border-b border-[#E5E5E5]"><td className="py-3">CMI / DRG accuracy</td><td className="py-3">✅ Yes</td><td className="py-3">CMI delta × discharges × $6,800</td></tr>
                      <tr className="border-b border-[#E5E5E5]"><td className="py-3">Denial rate reduction</td><td className="py-3">✅ Yes</td><td className="py-3">Denial pp delta × encounters × $3,500/case</td></tr>
                      <tr className="border-b border-[#E5E5E5]"><td className="py-3">Obs/IP status defense</td><td className="py-3">✅ Yes (if denial data provided)</td><td className="py-3">Admissions at risk × denial rate × avg claim delta × doc-attributable %</td></tr>
                      <tr className="border-b border-[#E5E5E5]">
                        <td className="py-3">DNFB / billing cycle influence</td>
                        <td className="py-3 text-[#F59E0B] font-medium">Narrative only — not modeled in $</td>
                        <td className="py-3">DNFB days × daily IP revenue (illustrative; live in Q3 with discharge capture)</td>
                      </tr>
                      <tr><td colSpan={3} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#1A1A1A', borderColor: '#1A1A1A' }}>Quality</span></td></tr>
                      <tr className="border-b border-[#E5E5E5]"><td className="py-3">CDI query reduction</td><td className="py-3 text-[#F59E0B] font-medium">Explore model: ✅ calculated · Measure model: signal only</td><td className="py-3">Admissions × query rate × reduction % × $50/query</td></tr>
                      <tr><td colSpan={3} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#888888', borderColor: '#888888' }}>Capacity</span></td></tr>
                      <tr className="border-b border-[#E5E5E5]"><td className="py-3">Documentation time returned</td><td className="py-3 text-[#F59E0B] font-medium">Hours only — not monetized</td><td className="py-3">Physician time is salaried</td></tr>
                      <tr><td colSpan={3} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#555555', borderColor: '#555555' }}>Workforce</span></td></tr>
                      <tr className="border-b border-[#E5E5E5]"><td className="py-3">Hospitalist retention</td><td className="py-3">✅ Yes (if survey data provided)</td><td className="py-3">Turnovers avoided × $250K–$500K</td></tr>
                    </tbody>
                  </table>
                </div>
              </CollapsibleSection>
            </div>

            <div className="px-6">
              <CollapsibleSection sectionId="assumptions" title="The Assumptions" subtitle="Inpatient-specific defaults and ranges">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#D1D5DB]">
                        <th className="text-left py-3 font-semibold text-black">Assumption</th>
                        <th className="text-left py-3 font-semibold text-black">Range</th>
                        <th className="text-left py-3 font-semibold text-black">Our Default</th>
                      </tr>
                    </thead>
                    <tbody className="text-[#666666]">
                      <tr><td colSpan={3} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#888888', borderColor: '#888888' }}>Capacity</span></td></tr>
                      <Tooltip><TooltipTrigger asChild><tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors"><td className="py-3">Time saved per admission</td><td className="py-3">15-45 minutes</td><td className="py-3">30 minutes</td></tr></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p className="text-xs">Total documentation time saved across H&P, progress notes, and discharge summary. Higher for complex admissions.</p></TooltipContent></Tooltip>
                      <tr className="border-b border-[#E5E5E5]"><td className="py-3">Time saved per H&P</td><td className="py-3">15–30 min</td><td className="py-3">20 min</td></tr>
                      <tr className="border-b border-[#E5E5E5]"><td className="py-3">Time saved per progress note</td><td className="py-3">5–12 min</td><td className="py-3">8 min</td></tr>
                      <tr><td colSpan={3} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#EA2C00', borderColor: '#EA2C00' }}>Revenue</span></td></tr>
                      <Tooltip><TooltipTrigger asChild><tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors"><td className="py-3">DRG base rate</td><td className="py-3">$6,000–$8,000</td><td className="py-3">$6,800</td></tr></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p className="text-xs">CMS IPPS base rate; varies by hospital wage index and DSH adjustment.</p></TooltipContent></Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors">
                            <td className="py-3">DNFB days (industry baseline)</td>
                            <td className="py-3">5–7 days</td>
                            <td className="py-3">5.5 days (illustrative only)</td>
                          </tr>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-xs">Discharge Not Final Billed days — a working-capital metric tracked by hospital revenue cycle. We use this baseline to illustrate potential influence, but do not model dollars in the calculator until discharge summary capture is live.</p>
                        </TooltipContent>
                      </Tooltip>
                      <tr><td colSpan={3} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#555555', borderColor: '#555555' }}>Workforce</span></td></tr>
                      <tr className="border-b border-[#E5E5E5]"><td className="py-3">Hospitalist replacement cost</td><td className="py-3">$250K–$500K</td><td className="py-3">$350K</td></tr>
                      <tr><td colSpan={3} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#1A1A1A', borderColor: '#1A1A1A' }}>Quality</span></td></tr>
                      <Tooltip><TooltipTrigger asChild><tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors"><td className="py-3">CDI query rate</td><td className="py-3">25-35%</td><td className="py-3">30%</td></tr></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p className="text-xs">ACDIS benchmark. Shown here as context for the signal — query reduction is not included as a direct financial line in the calculator.</p></TooltipContent></Tooltip>
                      <Tooltip><TooltipTrigger asChild><tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors"><td className="py-3">Query reduction %</td><td className="py-3">15-35%</td><td className="py-3">25%</td></tr></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p className="text-xs">Expected reduction in CDI queries when documentation is more complete at point of care.</p></TooltipContent></Tooltip>
                      <Tooltip><TooltipTrigger asChild><tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors"><td className="py-3">Cost per query</td><td className="py-3">$40-$60</td><td className="py-3">$50</td></tr></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p className="text-xs">CDI specialist time cost per query including creation, tracking, and follow-up. Based on ACDIS productivity benchmarks.</p></TooltipContent></Tooltip>
                    </tbody>
                  </table>
                </div>
              </CollapsibleSection>
            </div>

            <div className="px-6">
              <CollapsibleSection sectionId="honest-limits" title="The Honest Limits" subtitle="What we can prove, what we can support, and what we can only enable in inpatient">
                <div className="space-y-6">
                  <p className="text-[15px] text-black leading-relaxed">Inpatient revenue is team-produced. Documentation is step one, but CDI, coding, and clinical operations all affect the final outcome. We're honest about what documentation improvement can and can't claim credit for.</p>
                  <div className="grid gap-4">
                    <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                      <div className="flex items-center gap-2 mb-3"><div className="w-3 h-3 bg-[#22C55E] rounded-full" /><h4 className="font-semibold text-black text-sm uppercase tracking-wide">We Can Measure This</h4></div>
                      <ul className="text-sm text-[#666666] space-y-2 ml-5">
                        <li><strong>Documentation time per note type:</strong> EHR session data for H&Ps, progress notes, discharge summaries. Visible in weeks.</li>
                        <li><strong>CDI query rates:</strong> CDI departments track this daily. Before/after comparison is clean and fast.</li>
                        <li><strong>CMI trends:</strong> Claims data, tracked quarterly. Compare Abridge providers vs. control group.</li>
                        <li><strong>Note completeness:</strong> CDI can assess documentation quality directly. Audit-ready evidence.</li>
                        <li><strong>Discharge documentation lag:</strong> Time from discharge order to completed discharge summary is an EHR-measurable metric.</li>
                        <li><strong>H&P completion vs. CMS 24-hour rule:</strong> EHR timestamps show whether H&Ps are landing inside the regulatory window. Direct measurement of whether ambient is closing the front of the documentation cycle.</li>
                        <li><strong>Obs/IP status defense:</strong> Medical necessity denial rates by root cause are tracked by revenue cycle.</li>
                      </ul>
                    </div>
                    <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                      <div className="flex items-center gap-2 mb-3"><div className="w-3 h-3 bg-[#F59E0B] rounded-full" /><h4 className="font-semibold text-black text-sm uppercase tracking-wide">We Can Influence This</h4></div>
                      <ul className="text-sm text-[#666666] space-y-2 ml-5">
                        <li><strong>DRG accuracy:</strong> Documentation is the input; CDI, coding, and payer response determine the output. Trackable, but multi-factorial.</li>
                        <li><strong>Denial prevention:</strong> Documentation-related denials are identifiable. Requires 6+ months of data to see trends.</li>
                        <li><strong>Readmission-related documentation:</strong> Better discharge summaries may reduce readmissions, but many factors contribute.</li>
                        <li><strong>Billing cycle (DNFB days):</strong> Faster H&P + cleaner progress notes pull CDI engagement forward, reducing end-of-stay query backlog. Discharge summary timing dominates DNFB and is outside today's product scope. Track as a working-capital influence signal — don't promise specific day reductions yet.</li>
                      </ul>
                    </div>
                    <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                      <div className="flex items-center gap-2 mb-3"><div className="w-3 h-3 bg-[#EF4444] rounded-full" /><h4 className="font-semibold text-black text-sm uppercase tracking-wide">We Can Only Enable This</h4></div>
                      <ul className="text-sm text-[#666666] space-y-2 ml-5">
                        <li><strong>Length of stay:</strong> Many factors drive LOS beyond documentation — staffing, bed management, discharge planning, social determinants. We don't model it.</li>
                        <li><strong>Discharge summary impact:</strong> Tracked as narrative today; modeled in dollars when discharge summary capture ships in Q3 2026.</li>
                        <li><strong>Rounding efficiency:</strong> Real in hours, harder to convert to dollars. We show hours, not revenue.</li>
                        <li><strong>Retention:</strong> Long-term measurement needed. Track, but don't claim causation prematurely.</li>
                      </ul>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-5 border-l-2 border-[#EA2C00]">
                    <p className="text-sm text-[#666666] leading-relaxed"><strong className="text-black">Our philosophy:</strong> We'd rather show you a defensible DRG improvement number based on CDI data than a speculative LOS reduction based on assumptions. Key variables in our model are editable — because your CDI team knows your gaps better than any default can.</p>
                  </div>
                </div>
              </CollapsibleSection>
            </div>

            <div className="px-6">
              <CollapsibleSection sectionId="validation-path" title="The Validation Path" subtitle="How to prove this with your hospitalist program's data">
                <div className="space-y-6">
                  <p className="text-[15px] text-black leading-relaxed">Inpatient has an advantage: your CDI department already tracks most of the metrics you need. Here's how to leverage that existing infrastructure for a credible ROI story.</p>
                  <div className="space-y-4">
                    <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                      <div className="flex items-center justify-between mb-3"><h4 className="font-semibold text-black text-sm uppercase tracking-wide">Before Implementation</h4><span className="text-xs text-[#888888] font-medium">Baseline period</span></div>
                      <p className="text-sm text-[#666666] mb-3">Work with CDI and coding to establish baselines. Most of this data already exists.</p>
                      <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                        <li>12 months of CMI data by hospitalist — you need provider-level granularity</li>
                        <li>CDI query rates by provider and query type</li>
                        <li>DRG denial rates with documentation-related root cause analysis</li>
                        <li>Documentation time estimates (if EHR data is available)</li>
                        <li>CC/MCC capture rates — your CDI team tracks this</li>
                      </ul>
                    </div>
                    <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                      <div className="flex items-center justify-between mb-3"><h4 className="font-semibold text-black text-sm uppercase tracking-wide">At 90 Days</h4><span className="text-xs text-[#888888] font-medium">Early signal</span></div>
                      <p className="text-sm text-[#666666] mb-3">CDI query reduction shows up fast. CMI takes longer because of claims lag.</p>
                      <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                        <li>Documentation time by note type — H&Ps, progress notes, discharges</li>
                        <li>CDI query rate trends (this is often the earliest financial signal)</li>
                        <li>Note quality assessment from CDI perspective</li>
                        <li>Hospitalist satisfaction surveys — qualitative signal matters</li>
                      </ul>
                    </div>
                    <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                      <div className="flex items-center justify-between mb-3"><h4 className="font-semibold text-black text-sm uppercase tracking-wide">At 6-12 Months</h4><span className="text-xs text-[#888888] font-medium">Revenue validation</span></div>
                      <p className="text-sm text-[#666666] mb-3">CMI and denial data become statistically meaningful. This is your board presentation window.</p>
                      <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                        <li>Year-over-year CMI comparison by provider cohort</li>
                        <li>CC/MCC capture rate trends</li>
                        <li>DRG denial rate trends — isolate documentation-related categories</li>
                        <li>CDI productivity metrics — are CDI specialists covering more cases?</li>
                      </ul>
                    </div>
                    <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                      <div className="flex items-center justify-between mb-3"><h4 className="font-semibold text-black text-sm uppercase tracking-wide">At 18+ Months</h4><span className="text-xs text-[#888888] font-medium">Long-term impact</span></div>
                      <p className="text-sm text-[#666666] mb-3">Retention and culture shifts. Don't rush this measurement.</p>
                      <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                        <li>Hospitalist turnover: Abridge-enabled program vs. pre-implementation</li>
                        <li>LOS trends (with appropriate controls for patient acuity changes)</li>
                        <li>Exit interview data — is documentation still cited as a burnout factor?</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CollapsibleSection>
            </div>

            <div className="px-6">
              <CollapsibleSection sectionId="connected-value" title="Connected Value" subtitle="How inpatient documentation connects to your organization">
                <div className="space-y-4 text-[15px] text-black leading-relaxed">
                  <p>Inpatient sits at the center of the hospital value chain. Documentation here connects to almost every other care setting:</p>
                  <div className="space-y-4 mt-4">
                    <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]"><h4 className="font-bold text-black mb-2 text-sm">ED → Inpatient (upstream feed)</h4><p className="text-sm text-[#666666] leading-relaxed">ED documentation quality directly affects the starting point of inpatient care. When ED notes capture presenting conditions and comorbidities completely, CDI teams have a stronger foundation. We quantify this in the ED methodology to avoid double-counting.</p></div>
                    <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]"><h4 className="font-bold text-black mb-2 text-sm">Nursing → Inpatient (CC/MCC support)</h4><p className="text-sm text-[#666666] leading-relaxed">Nursing documentation captures clinical observations that support CC/MCC coding — skin assessments, fall risk documentation, nutritional status. When nursing notes are complete, CDI teams have additional evidence to support DRG accuracy.</p></div>
                    <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]"><h4 className="font-bold text-black mb-2 text-sm">Inpatient → Outpatient (discharge quality)</h4><p className="text-sm text-[#666666] leading-relaxed">Complete discharge summaries improve post-discharge follow-up care. When the PCP receives a comprehensive discharge note, medication reconciliation, follow-up, and care continuity all improve. This connects to readmission reduction, though attribution is indirect.</p></div>
                  </div>
                  <p className="text-[#666666] italic mt-4">We don't sum cross-setting values into the inpatient model — the attribution gets complex when value flows through multiple teams. But when building a system-level business case, these connections matter.</p>
                </div>
              </CollapsibleSection>
            </div>
          </div>
        </div>

        <motion.div className="mt-4 mb-10 bg-gradient-to-r from-[#1A1A1A] to-[#2D2D2D] rounded-lg p-8 text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h3 className="text-xl font-bold text-white mb-2">Ready to Build Your Model?</h3>
          <p className="text-[#999999] mb-6 text-sm">Use these methodology principles to create a customized ROI model for your hospitalist program.</p>
          <button onClick={onBack} className="inline-flex items-center gap-2 bg-[#EA2C00] hover:bg-[#D12600] text-white font-medium px-6 py-3 rounded-lg transition-colors" data-testid="button-build-model">
            Build an Inpatient Model <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>

        <p className="text-xs text-[#888888] leading-relaxed mb-6">Projections are modeled estimates based on user-provided inputs, published industry benchmarks, and aggregated deployment experience. Actual results may vary based on implementation approach, provider adoption, organizational factors, and care setting. This methodology does not constitute a guarantee of financial outcomes.</p>

        <div className="mb-8">
          <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">Related Methodologies</p>
          <div className="grid md:grid-cols-3 gap-4">
            <button onClick={() => onNavigateToSetting?.("ed")} className="flex items-center gap-3 p-4 bg-white border border-[#E5E5E5] rounded-lg hover:border-[#EA2C00]/30 hover:bg-[#FFF8F0] transition-colors text-left" data-testid="link-setting-ed">
              <div className="w-10 h-10 rounded-full bg-[#F5F0EB] flex items-center justify-center"><Activity className="w-5 h-5 text-[#EA2C00]" /></div>
              <div><p className="font-medium text-black text-sm">Emergency</p><p className="text-xs text-[#888888]">Admissions originate here</p></div>
            </button>
            <button onClick={() => onNavigateToSetting?.("nursing")} className="flex items-center gap-3 p-4 bg-white border border-[#E5E5E5] rounded-lg hover:border-[#EA2C00]/30 hover:bg-[#FFF8F0] transition-colors text-left" data-testid="link-setting-nursing">
              <div className="w-10 h-10 rounded-full bg-[#F5F0EB] flex items-center justify-center"><Heart className="w-5 h-5 text-[#EA2C00]" /></div>
              <div><p className="font-medium text-black text-sm">Nursing</p><p className="text-xs text-[#888888]">Inpatient nursing documentation</p></div>
            </button>
            <button onClick={() => onNavigateToSetting?.("outpatient")} className="flex items-center gap-3 p-4 bg-white border border-[#E5E5E5] rounded-lg hover:border-[#EA2C00]/30 hover:bg-[#FFF8F0] transition-colors text-left" data-testid="link-setting-outpatient">
              <div className="w-10 h-10 rounded-full bg-[#F5F0EB] flex items-center justify-center"><Stethoscope className="w-5 h-5 text-[#EA2C00]" /></div>
              <div><p className="font-medium text-black text-sm">Outpatient</p><p className="text-xs text-[#888888]">Post-discharge follow-up</p></div>
            </button>
          </div>
        </div>
      </div>

      {isExporting && (
        <div className="fixed bottom-4 right-4 bg-[#EA2C00] text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 z-50" data-testid="toast-pdf-download">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm font-medium">Preparing your PDF...</span>
        </div>
      )}
    </div>
  );
}
