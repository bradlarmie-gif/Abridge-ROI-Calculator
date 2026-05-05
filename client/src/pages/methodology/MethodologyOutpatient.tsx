import { motion } from "framer-motion";
import { ArrowLeft, Download, ArrowRight, Activity, Building2, Heart, Loader2, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { generateMethodologyPDF } from "@/lib/methodology-pdf-export";
import abridgeLogo from '@assets/abridge-logo-wordmark-red_1769020684647.png';
import { CollapsibleSection, ImpactBadge, type BadgeType } from "@/components/methodology/MethodologyShared";

interface MethodologyOutpatientProps {
  onBack: () => void;
  onNavigateToSetting?: (setting: string) => void;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type OPDomainName = "CAPACITY" | "WORKFORCE" | "REVENUE" | "QUALITY";

type OPMechanism = { label: string; description: string };

type OPMetricItem = {
  label: string;
  badge: BadgeType;
  explanation: string;
  whenToExpect?: string;
  formula?: string;
};

type OPDomainData = {
  domain: OPDomainName;
  tagline: string;
  outcomes: { label: string; direction: "↑" | "↓" }[];
  problem: string;
  mechanisms: OPMechanism[];
};

const opDomainColors: Record<OPDomainName, string> = {
  CAPACITY: "#888888",
  WORKFORCE: "#555555",
  REVENUE: "#EA2C00",
  QUALITY: "#1A1A1A",
};

// ─── Domain Methodology Data ──────────────────────────────────────────────────

const opDomainData: OPDomainData[] = [
  {
    domain: "CAPACITY",
    tagline: "Patient Access & Clinical Time",
    outcomes: [
      { label: "Patients seen per provider", direction: "↑" },
      { label: "After-hours charting", direction: "↓" },
    ],
    problem: "The average outpatient encounter generates 8–15 minutes of documentation. Multiplied by 20 patients per day and 240 clinic days per year, that's 640–1,200 hours of physician documentation time annually — per provider. Most of it happens after clinic ends. The time saved per encounter is modest; the scale is the leverage.",
    mechanisms: [
      { label: "Documentation time per encounter", description: "How long the physician spends in the EHR charting each patient. Ambient capture reduces this from 8–15 minutes of writing to 2–4 minutes of note review — the draft exists before the patient leaves the room." },
      { label: "Same-day note closure rate", description: "The share of encounter notes signed before the provider leaves clinic. Goes from 40–60% baseline to 85–95% for consistent Abridge users. This metric eliminates the carry-forward queue that fuels pajama time." },
      { label: "Patient access slots", description: "When documentation time drops, providers have headroom to see additional patients — or to stop working after hours. For practices with wait lists, this headroom converts to incremental volume. For practices at capacity, it converts to physician wellbeing." },
      { label: "Third-next-available appointment", description: "The industry standard outpatient access metric — days until a new patient can be seen. When providers close more of their schedule by seeing additional patients with reclaimed time, this number shrinks. Moves slowly but compounds." },
    ],
  },
  {
    domain: "WORKFORCE",
    tagline: "Clinician Wellbeing & Retention",
    outcomes: [
      { label: "Physician satisfaction", direction: "↑" },
      { label: "Voluntary turnover", direction: "↓" },
    ],
    problem: "Medscape has ranked documentation and EHR burden as the #1 or #2 cause of physician burnout for over a decade. In outpatient, it manifests as a predictable, measurable daily ritual: clinic ends, patients go home, physician opens the laptop. 'Pajama time' is the term physicians use for it. It's not a metaphor — it's EHR session data logged between 8pm and midnight.",
    mechanisms: [
      { label: "After-hours documentation time (pajama time)", description: "Time spent charting outside scheduled clinical hours. EHR session logs show exactly when this happens and for how long. When notes draft themselves during the encounter, the post-clinic queue becomes a review queue — and that time returns to physicians." },
      { label: "Same-day note closure rate", description: "The behavioral outcome that correlates most directly with burnout reduction. When providers sign notes before leaving clinic instead of carrying them home, the psychological boundary between work and home is restored." },
      { label: "Burnout score on validated instruments", description: "Mini Z, Maslach Burnout Inventory, or internal pulse surveys. Track the documentation burden subscore specifically among Abridge users — it's more attributable and moves faster than the overall composite." },
      { label: "Locum utilization and vacancy rate", description: "Locum coverage spikes when retention falters — at 2–3× the cost of employed physicians. Track locum spend as a lagging indicator of retention pressure. When it starts declining, the workforce story is working." },
    ],
  },
  {
    domain: "REVENUE",
    tagline: "wRVU Capture & Denial Prevention",
    outcomes: [
      { label: "wRVU per encounter", direction: "↑" },
      { label: "Documentation-related denials", direction: "↓" },
    ],
    problem: "Outpatient E/M coding runs from 99211 to 99215. Under time pressure, physicians default to mid-level codes — not because the clinical work was simple, but because there wasn't time to document the complexity. The result is a systematic pattern of undercoding that shows up in E/M distribution data and is directly recoverable when documentation captures what actually happened.",
    mechanisms: [
      { label: "E/M level distribution (99211–99215)", description: "The five outpatient E/M levels. When documentation captures history, exam findings, and clinical decision-making with the specificity that supports higher-complexity codes, the distribution shifts toward 99214 and 99215 where the work was done. Claims data shows this shift directly." },
      { label: "wRVU per encounter", description: "The aggregate revenue signal that rolls up E/M level accuracy. Published studies and deployment observations show 2–7% wRVU lift from better documentation, depending on baseline quality and specialty. At $33.40/wRVU (CMS 2026 MPFS), even a 3% lift across 10,000 encounters per provider is meaningful annual revenue." },
      { label: "Documentation-related denial rate", description: "Medical necessity denials that occur because the documentation didn't support the level of care billed. RCM teams track denial root cause — documentation-related denials are an identifiable subset. 30–40% of claim denials are unappealable because the documentation gap existed at the time of service." },
      { label: "Charge lag reduction", description: "Days from service to billing. When notes are signed same-day instead of 2–5 days later, the billing queue advances — improving cash flow and reducing the risk of late notes missing billing windows." },
    ],
  },
  {
    domain: "QUALITY",
    tagline: "Risk Capture & Care Gap Closure",
    outcomes: [
      { label: "HCC / RAF score accuracy", direction: "↑" },
      { label: "Care gap closure rate", direction: "↑" },
    ],
    problem: "For practices with Medicare Advantage populations, HCC coding accuracy is the difference between being paid for the risk you're actually managing and being systematically underpaid for it. Chronic conditions discussed during the visit but not documented create HCC gaps that accumulate year over year — each missing diagnosis is a capitated payment reduction that compounds across the panel.",
    mechanisms: [
      { label: "HCC capture rate (MA populations)", description: "Hierarchical Condition Category coding drives Risk Adjustment Factor scores in Medicare Advantage. When ambient capture preserves the chronic condition documentation discussed during the visit, HCC gap rates fall and RAF scores reflect the actual complexity of the panel." },
      { label: "Care gap closure (HEDIS measures)", description: "HEDIS-aligned quality measures — A1c documentation, blood pressure, preventive screenings — depend on documentation completeness. When the note captures what was discussed and ordered, care gap closure rates improve on population health dashboards and payer scorecards." },
      { label: "Referral note completeness", description: "When primary care documentation is complete, specialists receive better clinical context — fewer repeat tests, faster diagnoses, better care continuity. Hard to quantify directly, but practices competing on value-based contracts cite this as a differentiator in specialist partnership conversations." },
      { label: "MIPS / quality reporting performance", description: "MIPS quality scores aggregate documentation-dependent measures. As care gap closure and diagnosis specificity improve, MIPS quality category performance trends upward — affecting performance-based payment adjustments." },
    ],
  },
];

// ─── Metric Items ─────────────────────────────────────────────────────────────

const opMetricItems: Record<OPDomainName, OPMetricItem[]> = {
  CAPACITY: [
    {
      label: "Documentation Time Per Encounter",
      badge: "Signal",
      explanation: "EHR session data shows exactly when documentation happens and how long it takes. This is the most immediate and unambiguous post-deployment signal. Deployment observations suggest time savings of 2–4 minutes per encounter for consistent users. Illustratively, 20 patients/day × 240 days × 3 minutes = 240 physician hours annually per provider — returned to patients or to life.",
      whenToExpect: "Week 4–6 for active users. EHR session timestamps are the cleanest early metric — no billing cycle, no coding team, no CDI engagement needed.",
      formula: "Minutes saved × daily encounters × working days = estimated annual physician hours returned",
    },
    {
      label: "Same-Day Note Closure Rate",
      badge: "Signal",
      explanation: "The share of encounter notes signed before the provider leaves clinic. Typically runs 40–60% at baseline — the rest carry forward to evenings and weekends. For consistent Abridge users, this often rises to 85–95% within 60 days. EHR audit logs show this directly, and it's often the most dramatic early metric that physicians talk about with colleagues.",
      whenToExpect: "Week 4–8. Track as the share of encounters with a note signed before 6pm (or end of scheduled clinic). Compare same providers before and after.",
    },
    {
      label: "Patient Access Capacity",
      badge: "Trend",
      explanation: "For practices with patient demand outpacing supply, reclaimed documentation time converts to additional patient visits. We model the capacity potential — your leadership decides how to deploy it. For practices with wait lists, an additional 1–2 patients per provider per day is meaningful access expansion and incremental revenue.",
      whenToExpect: "Month 2–4, but only if patient demand exists. If you're scheduling-constrained, track third-next-available appointment as the access signal.",
      formula: "Additional patients/provider/month × providers × 12 months × avg revenue per visit",
    },
  ],
  WORKFORCE: [
    {
      label: "After-Hours Documentation Time",
      badge: "Signal",
      explanation: "Time spent charting outside scheduled clinical hours — the canonical outpatient burnout metric. EHR session data shows exactly when this happens. Medscape 2023: outpatient physicians average 1–2 hours of after-hours charting per clinic day. When notes draft themselves during the encounter, the post-clinic queue becomes a review queue. This is the metric physicians ask about most.",
      whenToExpect: "Week 4–6 for active users. EHR session logs outside clinic hours are directly measurable. Compare same providers, same days of week, before vs. after.",
    },
    {
      label: "Physician Satisfaction Score",
      badge: "Trend",
      explanation: "Validated instruments (Mini Z, Maslach Burnout Inventory, internal pulse surveys) consistently rank documentation burden as the top outpatient burnout driver. Track the documentation burden subscore specifically among Abridge users — it's more attributable and moves faster than the composite score. A 2-point improvement on the documentation subscale is a meaningful signal.",
      whenToExpect: "Month 2–4 for validated survey signal. Internal pulse surveys can show directional movement sooner. Run documentation-specific questions — not just overall satisfaction.",
    },
    {
      label: "Voluntary Physician Turnover",
      badge: "Proof",
      explanation: "Replacing a physician costs $250K–$500K fully loaded — recruiting, credentialing, onboarding, and the productivity ramp of a new hire. Documentation burden is consistently cited in exit interviews as a top reason physicians leave. This is the 3-year value story metric — anchor it in the contract renewal conversation, not the 90-day check-in.",
      whenToExpect: "Month 12–18. Track exit interview data from day one so you have the attribution evidence when you need it.",
    },
  ],
  REVENUE: [
    {
      label: "E/M Level Distribution Shift",
      badge: "Signal",
      explanation: "Claims data shows the distribution of visits at each E/M level (99211–99215) per provider. When documentation captures complexity more completely, the distribution shifts toward 99214 and 99215 where the clinical work supports it. Compare the same provider's distribution before and after — it's a clean before/after with data your billing team already has.",
      whenToExpect: "Month 2–3. Claims data requires one full billing cycle. Compare at least 90 days of post-deployment claims against the same 90 days prior year — same provider, same patient mix.",
    },
    {
      label: "wRVU Per Encounter",
      badge: "Trend",
      explanation: "The aggregate revenue signal that rolls up E/M level accuracy. Industry data and deployment observations show 2–7% wRVU lift from better documentation, depending on baseline quality and specialty. At $33.40/wRVU (CMS 2026 MPFS), a 4% lift on 8,000 annual encounters at 1.8 baseline wRVU = ~$19,300 per provider. Scale by provider count for the practice total.",
      whenToExpect: "Month 3–6 for a statistically meaningful trend. Requires sufficient encounter volume and a controlled comparison — same providers, same patient mix.",
      formula: "wRVU delta per encounter × adopted encounters × $33.40 (CMS 2026 MPFS) × realization %",
    },
    {
      label: "Documentation-Related Denial Rate",
      badge: "Trend",
      explanation: "Medical necessity denials that occur because the note didn't support the level of care billed. RCM teams track denial root cause — documentation-related denials are an identifiable subset. 30–40% of claim denials are unappealable because the documentation gap existed at service. Work with your RCM team to isolate documentation-related denials before attributing the improvement.",
      whenToExpect: "Month 4–8. Requires 90+ days of claims volume and root-cause categorization by your RCM team. Establish the documentation-related denial baseline before deployment.",
      formula: "(denial rate before − after, in pp) × annual encounters × $350/encounter × attribution %",
    },
  ],
  QUALITY: [
    {
      label: "HCC Capture Rate (MA Populations)",
      badge: "Trend",
      explanation: "Hierarchical Condition Category documentation drives Risk Adjustment Factor scores in Medicare Advantage. When ambient capture preserves chronic condition documentation discussed during the visit, HCC gap rates fall and RAF scores reflect actual panel complexity. For a practice with 2,000 MA patients, closing a 5% HCC gap rate can represent significant capitated payment recovery.",
      whenToExpect: "Month 3–6. Risk adjustment teams track suspected vs. confirmed HCC closures per provider quarterly. Compare Abridge-enabled providers against a control group.",
      formula: "MA patients × HCC gap rate × recapture % × RAF point value × capitation rate",
    },
    {
      label: "Care Gap Closure Rate",
      badge: "Trend",
      explanation: "HEDIS-aligned quality measures — A1c documentation, blood pressure control, preventive screenings — depend on what gets captured in the note. When ambient documentation preserves what was discussed and ordered during the visit, care gap closure rates improve on population health dashboards and payer quality scorecards.",
      whenToExpect: "Month 3–6. Track on your population health platform or payer quality scorecard. Compare gap closure rates per measure for Abridge-enabled providers vs. control.",
    },
    {
      label: "MIPS Quality Score",
      badge: "Proof",
      explanation: "MIPS quality category performance aggregates documentation-dependent measures. As care gap closure and diagnosis specificity improve, MIPS quality scores trend upward — affecting the performance-based payment adjustment CMS applies to Medicare revenue. Long-game metric: annual reporting cadence, but the upstream signals (HCC capture, care gap closure) move faster and confirm the direction.",
      whenToExpect: "Annual MIPS reporting cycle. Track upstream signals (HCC capture, care gap closure) quarterly as leading indicators. Don't use MIPS score as a short-term ROI proof point.",
    },
  ],
};

// ─── OPMetricCard ─────────────────────────────────────────────────────────────

function OPMetricCard({ item }: { item: OPMetricItem }) {
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

// ─── OPDomainCard ─────────────────────────────────────────────────────────────

function OPDomainCard({
  data,
  metrics,
  isExpanded,
  onToggle,
}: {
  data: OPDomainData;
  metrics: OPMetricItem[] | undefined;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const color = opDomainColors[data.domain];
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
                <OPMetricCard key={m.label} item={m} />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── OPDomainMethodologySection ───────────────────────────────────────────────

function OPDomainMethodologySection() {
  const [expandedDomain, setExpandedDomain] = useState<OPDomainName | null>(null);
  return (
    <div className="space-y-4">
      {opDomainData.map((d) => (
        <OPDomainCard
          key={d.domain}
          data={d}
          metrics={opMetricItems[d.domain]}
          isExpanded={expandedDomain === d.domain}
          onToggle={() => setExpandedDomain(expandedDomain === d.domain ? null : d.domain)}
        />
      ))}
    </div>
  );
}

// ─── OPValueArcSection ────────────────────────────────────────────────────────

function OPValueArcSection() {
  const stages: { badge: BadgeType; timing: string; title: string; description: string; domains: OPDomainName[] }[] = [
    {
      badge: "Signal",
      timing: "Week 4–6",
      title: "The Provider Feels It",
      description: "Documentation time per encounter drops measurably. Same-day note closure rises. After-hours EHR sessions shrink. All visible in EHR audit logs before any billing cycle closes.",
      domains: ["CAPACITY", "WORKFORCE"],
    },
    {
      badge: "Trend",
      timing: "Month 2–4",
      title: "The Chart Shows It",
      description: "E/M level distribution begins shifting in claims data. wRVU per encounter starts moving. HCC gap closure improves for MA populations. The coding team and risk adjustment team start to notice.",
      domains: ["REVENUE", "QUALITY"],
    },
    {
      badge: "Proof",
      timing: "Month 6–18",
      title: "The Practice Measures It",
      description: "wRVU improvement validated against controlled comparison. Denial rate reduction attributable to documentation. Physician retention signal emerges in satisfaction surveys and exit data.",
      domains: ["REVENUE", "WORKFORCE"],
    },
  ];

  const chipStyles: Record<OPDomainName, string> = {
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

export function MethodologyOutpatient({ onBack, onNavigateToSetting }: MethodologyOutpatientProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await generateMethodologyPDF("outpatient");
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
          <p className="text-[11px] font-bold uppercase tracking-[2.5px] text-[#EA2C00] mb-4">Outpatient</p>
          <h1 className="text-[32px] md:text-[40px] font-bold text-black leading-tight tracking-tight mb-4">
            How We Think<br />About Value
          </h1>
          <p className="text-[15px] text-[#666666] max-w-[560px] mx-auto leading-relaxed">
            Every encounter creates documentation debt. Multiply that by 4,000+ annual encounters per provider and the math becomes the case.
          </p>
        </motion.div>

        <div className="mb-10">
          <div className="mb-6 pb-3 border-b-2 border-[#EA2C00]">
            <p className="text-[11px] font-bold uppercase tracking-[2.5px] text-[#888888] mb-2">The Outpatient Value Story</p>
            <h2 className="text-[24px] font-bold text-black tracking-tight">Four Domains of Value</h2>
            <p className="text-sm text-[#888888] mt-1">
              Four domains. Each has a distinct problem, a set of mechanisms, and a measurement path. Start with whichever matters most to your practice.
            </p>
          </div>
          <OPDomainMethodologySection />
        </div>

        <div className="mb-10">
          <div className="mb-6 pb-3 border-b-2 border-[#EA2C00]">
            <p className="text-[11px] font-bold uppercase tracking-[2.5px] text-[#888888] mb-2">Value Arc</p>
            <h2 className="text-[24px] font-bold text-black tracking-tight">How It Accrues Over Time</h2>
            <p className="text-sm text-[#888888] mt-1">
              Value doesn't arrive all at once. The sequence is mechanistically predictable — not arbitrary.
            </p>
          </div>
          <OPValueArcSection />
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
                      <tr className="border-b border-[#E5E5E5]"><td className="py-3">wRVU lift</td><td className="py-3">✅ Yes</td><td className="py-3">wRVU delta × adopted encounters × $33/wRVU</td></tr>
                      <tr className="border-b border-[#E5E5E5]"><td className="py-3">E/M level improvement</td><td className="py-3">✅ Yes</td><td className="py-3">E/M level delta × adopted encounters × ~$45/level</td></tr>
                      <tr className="border-b border-[#E5E5E5]"><td className="py-3">Denial rate reduction</td><td className="py-3">✅ Yes</td><td className="py-3">Denial pp delta × encounters × $350/encounter</td></tr>
                      <tr><td colSpan={3} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#888888', borderColor: '#888888' }}>Capacity</span></td></tr>
                      <tr className="border-b border-[#E5E5E5]"><td className="py-3">Patient capacity revenue</td><td className="py-3">✅ Yes (if data provided)</td><td className="py-3">Additional patients/mo × providers × 12 × $200/visit</td></tr>
                      <tr className="border-b border-[#E5E5E5]"><td className="py-3">After-hours time savings</td><td className="py-3 text-[#F59E0B] font-medium">Signal only — not monetized</td><td className="py-3">Tracked as hours, not dollars (salaried providers)</td></tr>
                      <tr><td colSpan={3} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#1A1A1A', borderColor: '#1A1A1A' }}>Quality</span></td></tr>
                      <tr className="border-b border-[#E5E5E5]"><td className="py-3">HCC / risk adjustment</td><td className="py-3">✅ Yes (if MA data provided)</td><td className="py-3">MA patients × gap rate × recapture % × RAF point value</td></tr>
                      <tr><td colSpan={3} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#555555', borderColor: '#555555' }}>Workforce</span></td></tr>
                      <tr className="border-b border-[#E5E5E5]"><td className="py-3">Physician retention</td><td className="py-3">✅ Yes (if survey data provided)</td><td className="py-3">Turnovers avoided × $250K–$500K replacement cost</td></tr>
                    </tbody>
                  </table>
                </div>
              </CollapsibleSection>
            </div>

            <div className="px-6">
              <CollapsibleSection sectionId="assumptions" title="The Assumptions" subtitle="Outpatient-specific defaults and ranges">
                <div className="space-y-6">
                  <p className="text-[15px] text-black leading-relaxed">Every model rests on assumptions. Here are ours—with ranges, not point estimates.</p>
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
                        <Tooltip><TooltipTrigger asChild><tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors"><td className="py-3">Time saved per encounter</td><td className="py-3">2–4 minutes</td><td className="py-3">3 minutes</td></tr></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p className="text-xs">Based on aggregated deployment experience across outpatient implementations. Primary care typically 2–4 min, specialists 2–3 min.</p></TooltipContent></Tooltip>
                        <tr><td colSpan={3} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#EA2C00', borderColor: '#EA2C00' }}>Revenue</span></td></tr>
                        <Tooltip><TooltipTrigger asChild><tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors"><td className="py-3">wRVU baseline per visit</td><td className="py-3">1.5-2.5</td><td className="py-3">1.8</td></tr></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p className="text-xs">MGMA median wRVU per visit. Varies significantly by specialty and payer mix.</p></TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors"><td className="py-3">wRVU lift %</td><td className="py-3">2-7%</td><td className="py-3">4%</td></tr></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p className="text-xs">Better documentation captures visit complexity more accurately. Studies show 2-7% improvement in E&M level accuracy.</p></TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors"><td className="py-3">wRVU conversion factor</td><td className="py-3">$30-$50</td><td className="py-3">$33.40 (CMS 2026 MPFS)</td></tr></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p className="text-xs">CMS MPFS Medicare conversion factor $33.40 (CMS 2026 MPFS). Commercial payers often higher. Blended rate depends on payer mix.</p></TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors"><td className="py-3">Denial rate</td><td className="py-3">5-12%</td><td className="py-3">8%</td></tr></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p className="text-xs">MGMA data shows average denial rates 5-12%. Documentation-related denials are a subset but often preventable.</p></TooltipContent></Tooltip>
                        <tr><td colSpan={3} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#1A1A1A', borderColor: '#1A1A1A' }}>Quality</span></td></tr>
                        <Tooltip><TooltipTrigger asChild><tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors"><td className="py-3">HCC gap rate</td><td className="py-3">20-30%</td><td className="py-3">25%</td></tr></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p className="text-xs">Percentage of chronic conditions not captured in documentation. Industry research shows 25-40% gap rate in typical practices.</p></TooltipContent></Tooltip>
                        <tr><td colSpan={3} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#555555', borderColor: '#555555' }}>Workforce</span></td></tr>
                        <Tooltip><TooltipTrigger asChild><tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors"><td className="py-3">Physician replacement cost</td><td className="py-3">$250K–$500K</td><td className="py-3">$350,000</td></tr></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p className="text-xs">AMGA Physician Retention Survey; range reflects recruiting, onboarding, and lost productivity. Excludes lost revenue during vacancy.</p></TooltipContent></Tooltip>
                      </tbody>
                    </table>
                  </div>
                </div>
              </CollapsibleSection>
            </div>

            <div className="px-6">
              <CollapsibleSection sectionId="honest-limits" title="The Honest Limits" subtitle="What we can prove, what we can support, and what we can only enable">
                <div className="space-y-6">
                  <p className="text-[15px] text-black leading-relaxed">Most vendors will tell you their product saves money. We think you deserve to know exactly how confident we are in each claim — and what it takes to verify it in your specific practice.</p>
                  <div className="grid gap-4">
                    <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                      <div className="flex items-center gap-2 mb-3"><div className="w-3 h-3 bg-[#22C55E] rounded-full" /><h4 className="font-semibold text-black text-sm uppercase tracking-wide">We Can Measure This</h4></div>
                      <ul className="text-sm text-[#666666] space-y-2 ml-5">
                        <li><strong>Documentation time per encounter:</strong> EHR session data, before/after studies. You'll see this in weeks.</li>
                        <li><strong>wRVU per visit:</strong> Claims data shows E/M distribution shifts. Measurable at 90 days.</li>
                        <li><strong>Same-day note closure:</strong> EHR timestamps. Immediate and unambiguous.</li>
                        <li><strong>After-hours documentation:</strong> Session data shows when charting happens. This is the "pajama time" metric.</li>
                      </ul>
                    </div>
                    <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                      <div className="flex items-center gap-2 mb-3"><div className="w-3 h-3 bg-[#F59E0B] rounded-full" /><h4 className="font-semibold text-black text-sm uppercase tracking-wide">We Can Influence This</h4></div>
                      <ul className="text-sm text-[#666666] space-y-2 ml-5">
                        <li><strong>Capacity expansion:</strong> Requires patient demand and scheduling intent. We provide the time; you decide how to use it.</li>
                        <li><strong>HCC recapture:</strong> Depends on MA population, baseline gap rate, and coding workflows. Trackable but multi-factorial.</li>
                        <li><strong>Denial prevention:</strong> Doc-related denials are identifiable, but denial rates reflect many process factors.</li>
                      </ul>
                    </div>
                    <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                      <div className="flex items-center gap-2 mb-3"><div className="w-3 h-3 bg-[#EF4444] rounded-full" /><h4 className="font-semibold text-black text-sm uppercase tracking-wide">We Can Only Enable This</h4></div>
                      <ul className="text-sm text-[#666666] space-y-2 ml-5">
                        <li><strong>Retention:</strong> Documentation burden is one of many burnout drivers. Impact takes 12-18 months to observe. Track it, but don't bet on it alone.</li>
                        <li><strong>Patient satisfaction:</strong> More present providers may improve experience, but CAHPS is influenced by everything from wait times to parking.</li>
                        <li><strong>Referral patterns:</strong> Better documentation may improve referral quality, but attribution is indirect.</li>
                      </ul>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-5 border-l-2 border-[#EA2C00]">
                    <p className="text-sm text-[#666666] leading-relaxed"><strong className="text-black">Our philosophy:</strong> We'd rather show you a smaller number you can defend in a board presentation than a larger number that falls apart under scrutiny. Key assumptions in our model are editable — because your data should drive the answer, not ours.</p>
                  </div>
                </div>
              </CollapsibleSection>
            </div>

            <div className="px-6">
              <CollapsibleSection sectionId="validation-path" title="The Validation Path" subtitle="How to prove this with your own data — before, during, and after">
                <div className="space-y-6">
                  <p className="text-[15px] text-black leading-relaxed">A model is only as good as its validation. Here's exactly what to measure and when — so you're not relying on our assumptions when you could be relying on your data.</p>
                  <div className="space-y-4">
                    <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                      <div className="flex items-center justify-between mb-3"><h4 className="font-semibold text-black text-sm uppercase tracking-wide">Before Implementation</h4><span className="text-xs text-[#888888] font-medium">Baseline period</span></div>
                      <p className="text-sm text-[#666666] mb-3">Lock in your baselines before anything changes. This is what makes before/after credible.</p>
                      <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                        <li>Pull 12 months of wRVU data by provider and specialty — you need enough volume to see patterns</li>
                        <li>Baseline E/M level distribution (what % at each level, by provider)</li>
                        <li>Document current denial rates by reason code — isolate documentation-related denials</li>
                        <li>Survey physicians on documentation burden — you'll want to repeat this</li>
                        <li>EHR session data: when does charting happen? How much is after-hours?</li>
                      </ul>
                    </div>
                    <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                      <div className="flex items-center justify-between mb-3"><h4 className="font-semibold text-black text-sm uppercase tracking-wide">At 90 Days</h4><span className="text-xs text-[#888888] font-medium">Early signal</span></div>
                      <p className="text-sm text-[#666666] mb-3">Time savings and documentation quality show up fast. Revenue impact takes longer.</p>
                      <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                        <li>Repeat time studies — compare doc time per encounter, after-hours charting</li>
                        <li>E/M level comparison: pilot providers vs. baseline (same providers, not just average)</li>
                        <li>Same-day note closure rate — often the most dramatic early metric</li>
                        <li>Provider satisfaction survey — qualitative signal matters here</li>
                      </ul>
                    </div>
                    <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                      <div className="flex items-center justify-between mb-3"><h4 className="font-semibold text-black text-sm uppercase tracking-wide">At 6-12 Months</h4><span className="text-xs text-[#888888] font-medium">Revenue validation</span></div>
                      <p className="text-sm text-[#666666] mb-3">This is where financial impact becomes statistically meaningful.</p>
                      <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                        <li>Year-over-year wRVU comparison — control for patient mix and volume changes</li>
                        <li>Denial rate trends by category — isolate documentation-related improvement</li>
                        <li>Capacity utilization: did volumes increase? Were new slots added?</li>
                        <li>HCC recapture rates for MA populations (if applicable)</li>
                      </ul>
                    </div>
                    <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                      <div className="flex items-center justify-between mb-3"><h4 className="font-semibold text-black text-sm uppercase tracking-wide">At 18+ Months</h4><span className="text-xs text-[#888888] font-medium">Long-term impact</span></div>
                      <p className="text-sm text-[#666666] mb-3">Retention and culture shifts take time. Don't rush this measurement.</p>
                      <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                        <li>Turnover rates: Abridge providers vs. control group</li>
                        <li>Exit interview data — is documentation still cited as a burnout driver?</li>
                        <li>Recruiting pipeline — are candidates asking about AI documentation tools?</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CollapsibleSection>
            </div>

            <div className="px-6">
              <CollapsibleSection sectionId="connected-value" title="Connected Value" subtitle="How outpatient documentation connects to your organization">
                <div className="space-y-4 text-[15px] text-black leading-relaxed">
                  <p>Outpatient documentation doesn't exist in isolation. The quality of what's captured in the office visit ripples across the organization:</p>
                  <div className="space-y-4 mt-4">
                    <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]"><h4 className="font-bold text-black mb-2 text-sm">Downstream referrals</h4><p className="text-sm text-[#666666] leading-relaxed">When primary care documentation is complete, specialists receive better context. Fewer repeat tests, faster diagnoses, better outcomes. Hard to quantify, but real.</p></div>
                    <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]"><h4 className="font-bold text-black mb-2 text-sm">Value-based contracts</h4><p className="text-sm text-[#666666] leading-relaxed">HCC accuracy drives risk adjustment in MA plans. Complete documentation supports accurate RAF scores, which determine capitated payments. This is quantified separately in our model for practices with significant MA populations.</p></div>
                    <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]"><h4 className="font-bold text-black mb-2 text-sm">Pre-authorization efficiency</h4><p className="text-sm text-[#666666] leading-relaxed">Complete clinical documentation reduces prior auth denials and the back-and-forth that consumes staff time. We don't model this directly, but organizations with high prior auth volumes report meaningful time savings.</p></div>
                  </div>
                  <p className="text-[#666666] italic mt-4">We don't sum these into the ROI model because the attribution gets fuzzy. But they're real — and they're part of the strategic case for documentation quality that goes beyond the numbers.</p>
                </div>
              </CollapsibleSection>
            </div>
          </div>
        </div>

        <motion.div className="mt-4 mb-10 bg-gradient-to-r from-[#1A1A1A] to-[#2D2D2D] rounded-lg p-8 text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h3 className="text-xl font-bold text-white mb-2">Ready to Build Your Model?</h3>
          <p className="text-[#999999] mb-6 text-sm">Use these methodology principles to create a customized ROI model for your outpatient practice.</p>
          <button onClick={onBack} className="inline-flex items-center gap-2 bg-[#EA2C00] hover:bg-[#D12600] text-white font-medium px-6 py-3 rounded-lg transition-colors" data-testid="button-build-model">
            Build an Outpatient Model <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>

        <p className="text-xs text-[#888888] leading-relaxed mb-6">Projections are modeled estimates based on user-provided inputs, published industry benchmarks, and aggregated deployment experience. Actual results may vary based on implementation approach, provider adoption, organizational factors, and care setting. This methodology does not constitute a guarantee of financial outcomes.</p>

        <div className="mb-8">
          <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">Related Methodologies</p>
          <div className="grid md:grid-cols-3 gap-4">
            <button onClick={() => onNavigateToSetting?.("ed")} className="flex items-center gap-3 p-4 bg-white border border-[#E5E5E5] rounded-lg hover:border-[#EA2C00]/30 hover:bg-[#FFF8F0] transition-colors text-left" data-testid="link-setting-ed">
              <div className="w-10 h-10 rounded-full bg-[#F5F0EB] flex items-center justify-center"><Activity className="w-5 h-5 text-[#EA2C00]" /></div>
              <div><p className="font-medium text-black text-sm">Emergency</p><p className="text-xs text-[#888888]">Throughput & LWBS</p></div>
            </button>
            <button onClick={() => onNavigateToSetting?.("inpatient")} className="flex items-center gap-3 p-4 bg-white border border-[#E5E5E5] rounded-lg hover:border-[#EA2C00]/30 hover:bg-[#FFF8F0] transition-colors text-left" data-testid="link-setting-inpatient">
              <div className="w-10 h-10 rounded-full bg-[#F5F0EB] flex items-center justify-center"><Building2 className="w-5 h-5 text-[#EA2C00]" /></div>
              <div><p className="font-medium text-black text-sm">Inpatient</p><p className="text-xs text-[#888888]">DRG & documentation quality</p></div>
            </button>
            <button onClick={() => onNavigateToSetting?.("nursing")} className="flex items-center gap-3 p-4 bg-white border border-[#E5E5E5] rounded-lg hover:border-[#EA2C00]/30 hover:bg-[#FFF8F0] transition-colors text-left" data-testid="link-setting-nursing">
              <div className="w-10 h-10 rounded-full bg-[#F5F0EB] flex items-center justify-center"><Heart className="w-5 h-5 text-[#EA2C00]" /></div>
              <div><p className="font-medium text-black text-sm">Nursing</p><p className="text-xs text-[#888888]">OT reduction & retention</p></div>
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
