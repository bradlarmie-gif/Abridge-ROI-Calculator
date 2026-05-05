import { motion } from "framer-motion";
import { ArrowLeft, Download, ArrowRight, Activity, Building2, Stethoscope, Loader2, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { generateMethodologyPDF } from "@/lib/methodology-pdf-export";
import abridgeLogo from '@assets/abridge-logo-wordmark-red_1769020684647.png';
import { CollapsibleSection, ImpactBadge, type BadgeType } from "@/components/methodology/MethodologyShared";

interface MethodologyNursingProps {
  onBack: () => void;
  onNavigateToSetting?: (setting: string) => void;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type NursingDomainName = "CAPACITY" | "WORKFORCE" | "REVENUE" | "QUALITY";

type NursingMechanism = { label: string; description: string };

type NursingMetricItem = {
  label: string;
  badge: BadgeType;
  explanation: string;
  whenToExpect?: string;
  formula?: string;
};

type NursingDomainData = {
  domain: NursingDomainName;
  tagline: string;
  outcomes: { label: string; direction: "↑" | "↓" }[];
  problem: string;
  mechanisms: NursingMechanism[];
};

const nursingDomainColors: Record<NursingDomainName, string> = {
  CAPACITY: "#888888",
  WORKFORCE: "#555555",
  REVENUE: "#EA2C00",
  QUALITY: "#1A1A1A",
};

// ─── Domain Data ──────────────────────────────────────────────────────────────

const nursingDomainData: NursingDomainData[] = [
  {
    domain: "CAPACITY",
    tagline: "Overtime Reduction & Shift Efficiency",
    outcomes: [
      { label: "Overtime hours", direction: "↓" },
      { label: "On-time shift completion", direction: "↑" },
    ],
    problem: "Nursing documentation routinely runs past the end of the shift — not because nurses are inefficient, but because patient care happens faster than documentation can follow. A 12-hour shift generates 60–90 minutes of post-shift charting for many nurses. Multiply that by a unit of 20 nurses working 5 shifts per week and you have a significant payroll line item that appears in your timekeeping system every pay cycle.",
    mechanisms: [
      { label: "Documentation time per shift", description: "Total time spent charting during and after a 12-hour shift. Unlike physician settings where time savings are modeled as capacity or retention signal, nursing time savings are directly monetizable — because nurses are hourly. Every minute of post-shift charting that ambient capture eliminates is a minute that doesn't appear on the overtime register." },
      { label: "Point-of-care documentation rate", description: "The share of nursing documentation completed at the moment of care rather than batched at the end of shift. The defining behavioral shift ambient nursing enables: assessments, observations, and care events documented when they happen rather than recalled and transcribed hours later." },
      { label: "Charting after shift end", description: "EHR session activity after the scheduled shift ends — the direct precursor to overtime. Visible in EHR audit logs within weeks of deployment. When this metric drops, the payroll impact follows in the next billing period." },
      { label: "On-time clock-out rate", description: "The percentage of nurses clocking out within 15 minutes of their scheduled shift end. Your time-and-attendance system tracks this already — it's the most operationally verifiable signal that documentation burden is or isn't extending the shift." },
    ],
  },
  {
    domain: "WORKFORCE",
    tagline: "Nurse Retention & Agency Cost Reduction",
    outcomes: [
      { label: "Voluntary nurse turnover", direction: "↓" },
      { label: "Agency / travel nurse spend", direction: "↓" },
    ],
    problem: "Nursing turnover runs 15–22% nationally (NSI 2023), with replacement costs of $46K–$100K+ per nurse depending on specialty. Documentation burden is cited in ANA surveys as a top contributor to 30–50% of voluntary departures. When a nurse leaves, the unit loses institutional knowledge, remaining staff absorb heavier loads, burnout accelerates, and the cycle compounds — filling gaps with agency nurses at 2–3× employed staff cost.",
    mechanisms: [
      { label: "Documentation burden score", description: "Validated instruments (NDNQI RN Job Satisfaction Survey, Maslach Burnout Inventory) consistently identify documentation burden as a top driver of nurse burnout. Track the documentation subscore specifically among Abridge units — it's more attributable and moves faster than composite engagement scores." },
      { label: "Likelihood to stay / retention intent", description: "Retention intent surveys administered to nursing staff. A shift in intent to stay among Abridge units vs. control is a leading indicator for the turnover data that follows 6–12 months later. Start tracking this at baseline so you have the attribution story when you need it." },
      { label: "Voluntary turnover rate", description: "Annual voluntary departures per unit, tracked against system average. Requires 12–18 months to show a statistically meaningful trend. The financial case: NSI 2023 data puts bedside RN replacement cost at $46K–$65K; ICU and specialty nurses run $80K–$100K+. One retained nurse in a 12-month window often offsets a meaningful share of Abridge costs for that unit." },
      { label: "Agency and travel nurse fill rate", description: "The percentage of shifts filled by agency or travel nurses versus core staff. Agency reliance is a lagging indicator of retention pressure — and it's visible in your workforce budget. When retention stabilizes, agency spend follows. Track monthly by unit against the pre-deployment 12-month baseline." },
    ],
  },
  {
    domain: "REVENUE",
    tagline: "Value-Based Reimbursement & Penalty Prevention",
    outcomes: [
      { label: "HCAHPS nurse communication", direction: "↑" },
      { label: "HAC penalty exposure", direction: "↓" },
    ],
    problem: "Nurses don't generate billing codes — but nursing documentation quality is directly connected to two CMS programs that put real Medicare revenue at risk. HCAHPS scores determine performance-based payment adjustments under Value-Based Purchasing (2% of base DRG payments). HAC rates determine whether a hospital falls into the penalty zone (bottom quartile loses 1% of Medicare payments). These aren't soft quality signals — they're regulatory payment programs.",
    mechanisms: [
      { label: "HCAHPS Nurse Communication composite", description: "The 'nurses communicated well / listened carefully / explained things clearly' composite is one of five HCAHPS domains that feed Value-Based Purchasing. When nurses spend less time at the workstation and more time at the bedside, patients notice in survey responses. CMS puts 2% of Medicare inpatient base payments at risk based in part on these scores." },
      { label: "HAC rate and CMS penalty zone status", description: "CMS penalizes hospitals in the bottom quartile for Hospital-Acquired Conditions — including pressure injuries, falls, CAUTI, and CLABSI — by withholding 1% of Medicare inpatient payments. Real-time nursing documentation enables earlier identification of at-risk patients and faster care team response. Documentation lag between a care event and charting it is a safety gap." },
      { label: "Nursing CDI documentation support", description: "Nursing observations — skin assessments, nutritional status, fall risk scores, wound care findings — are clinical evidence that CDI teams use to support CC/MCC coding and DRG accuracy. When nursing documentation is complete and real-time, CDI specialists have stronger evidence. This value flows to the inpatient DRG story, not a nursing billing line — but it's real and it's attributed to nursing documentation quality." },
      { label: "Sepsis bundle SEP-1 nursing compliance", description: "SEP-1 is a CMS quality measure that tracks timely completion of the sepsis bundle — and nursing documentation is required evidence for bundle compliance. Real-time documentation of vital signs, assessments, and interventions supports SEP-1 compliance in a way that end-of-shift batch entry cannot. Affects both regulatory reporting and VBP quality scoring." },
    ],
  },
  {
    domain: "QUALITY",
    tagline: "Clinical Safety & Care Continuity",
    outcomes: [
      { label: "Safety event (HAC) rate", direction: "↓" },
      { label: "Shift handoff completeness", direction: "↑" },
    ],
    problem: "Nursing is the continuous clinical record of the patient's stay. When documentation is batched at end of shift rather than captured at the point of care, the patient record is stale — a 3-hour lag between a clinical observation and when it's charted is a 3-hour window where a developing pressure injury, a deteriorating vital sign, or a missed fall risk isn't visible to the care team or the oncoming shift.",
    mechanisms: [
      { label: "Documentation lag per care event", description: "Time between when a clinical event occurs and when it appears in the chart. The defining quality signal for ambient nursing: documentation lag drops from hours to minutes when nurses capture at the point of care. The oncoming shift, the charge nurse, and the attending all work from a current record rather than a stale one." },
      { label: "Safety assessment completion rate", description: "Braden scale skin assessments, Morse or Hendrich fall risk scores — these are structured tools that nursing must complete on admission and at each shift change. Completion rates are tracked by nursing quality teams and are directly responsive to documentation burden. When assessments are completed on time, pressure injuries and falls are identifiable earlier." },
      { label: "Shift handoff quality (SBAR completeness)", description: "The quality of shift-to-shift nursing handoffs, scored against SBAR (Situation-Background-Assessment-Recommendation) completeness. When nurses document in real time throughout the shift, the outgoing handoff note reflects the current patient state rather than recalled details from hours earlier. The Joint Commission tracks structured handoff processes as a National Patient Safety Goal." },
      { label: "Nursing documentation as CDI evidence", description: "Nursing notes provide clinical observations that support — or fail to support — the physician's documentation of conditions like malnutrition, skin breakdown stages, and acute functional decline. When nursing documentation is complete and specific, CDI and coding teams have corroborating evidence that strengthens CC/MCC capture for inpatient DRG accuracy." },
    ],
  },
];

// ─── Metric Items ─────────────────────────────────────────────────────────────

const nursingMetricItems: Record<NursingDomainName, NursingMetricItem[]> = {
  CAPACITY: [
    {
      label: "Overtime Reduction",
      badge: "Signal",
      explanation: "Nursing is the only care setting in this methodology where documentation time savings convert directly to a payroll dollar. When post-shift charting drops, that time doesn't appear on the overtime register. Payroll data makes this verifiable within 90 days — compare overtime hours on Abridge-deployed units against the same units pre-deployment, controlling for census and staffing changes.",
      whenToExpect: "Week 4–8 to see EHR session data moving. 90 days for payroll data to show a credible trend. This is your fastest financially verifiable metric.",
      formula: "Hours saved per shift × OT conversion rate (15–40%) × nurses × OT hourly rate × 52 weeks",
    },
    {
      label: "Point-of-Care Documentation Rate",
      badge: "Signal",
      explanation: "The share of nursing documentation completed at the moment of care versus batched at the end of shift. Moves from 40–60% at baseline to 80–90%+ for consistent users. EHR timestamp data shows when each documentation event occurs relative to the care event. This is the behavioral signal that drives every downstream outcome — overtime, safety, handoff quality.",
      whenToExpect: "Week 4–8. EHR timestamps are directly measurable. Compare the time distribution of documentation events across the shift before and after deployment.",
    },
    {
      label: "Charting After Shift End",
      badge: "Signal",
      explanation: "EHR session activity logged after the scheduled shift end — the direct upstream measure of overtime. When ambient capture handles documentation throughout the shift, the post-shift queue shrinks from 60–90 minutes to a brief review. Compare same nurses, same shifts, before vs. after. This is the metric nursing managers ask about first.",
      whenToExpect: "Week 4–6 for active users. Visible in EHR session logs before any pay period comparison is possible. Often the clearest early adoption signal.",
    },
  ],
  WORKFORCE: [
    {
      label: "Documentation Burden Score",
      badge: "Signal",
      explanation: "Validated instruments (NDNQI RN Job Satisfaction Survey, Maslach Burnout Inventory) consistently rank documentation burden among the top contributors to nurse burnout. Track the documentation subscore specifically among Abridge-deployed units — it's more attributable and moves faster than composite engagement or satisfaction scores. Establishes the baseline for the retention and turnover story that follows.",
      whenToExpect: "Month 2–3 for validated survey signal. Internal pulse surveys can show directional movement sooner. Administer the same instrument at baseline and at 90-day intervals.",
    },
    {
      label: "Voluntary Nurse Turnover Rate",
      badge: "Trend",
      explanation: "Annual voluntary departures per unit compared against system average and pre-deployment baseline. Bedside RN replacement cost runs $46K–$65K (NSI 2023); ICU and specialty nurses $80K–$100K+. Retaining one nurse who would otherwise leave due to documentation burden more than offsets a unit's Abridge costs for the year. Track exit interview data specifically — is documentation burden still cited as a departure reason?",
      whenToExpect: "Month 12–18 for statistically meaningful data. Start tracking exit interview data and intent-to-stay surveys at deployment — you'll need the longitudinal record to make the attribution case.",
    },
    {
      label: "Agency and Travel Nurse Fill Rate",
      badge: "Proof",
      explanation: "Percentage of shifts filled by agency or travel nurses versus core employed staff. Agency reliance spikes when retention falters — at 2–3× the hourly cost of employed nurses. When documentation-driven retention stabilizes, agency fill rates follow. Track monthly by unit against the 12-month pre-deployment baseline. Multi-factorial: control for census, market availability, and scheduled vacancies when interpreting.",
      whenToExpect: "Month 6–12 for a meaningful trend. Agency spend data is in your workforce budget — establish the baseline before deployment so before/after comparison is clean.",
      formula: "Observed reduction in agency hours × (agency rate − employed rate) = cost avoidance",
    },
  ],
  REVENUE: [
    {
      label: "HCAHPS Nurse Communication Score",
      badge: "Trend",
      explanation: "The 'nurses communicated well / listened carefully / explained things clearly' composite. CMS puts 2% of Medicare inpatient base DRG payments at risk through Value-Based Purchasing — HCAHPS is one of five weighted domains. When nurses spend less time at the workstation and more time at the bedside, patients report it in surveys. Reported quarterly; needs 2–3 cycles for a meaningful trend.",
      whenToExpect: "Month 3–6. HCAHPS is collected and reported quarterly. Isolate the nurse communication composite — it's the most directly Abridge-attributable HCAHPS domain for nursing.",
    },
    {
      label: "HAC Rate and CMS Penalty Zone Status",
      badge: "Trend",
      explanation: "CMS penalizes hospitals in the bottom quartile for Hospital-Acquired Conditions — pressure injuries, falls, CAUTI, CLABSI — by withholding 1% of Medicare inpatient payments. Real-time nursing documentation enables faster identification of deteriorating conditions. Track unit-level HAC rates on Abridge-deployed units vs. control. The financial exposure from HAC penalty zone status can exceed the cost of nursing ambient documentation at scale.",
      whenToExpect: "Month 6–12 for unit-level HAC trends. HAC penalty zone status is determined annually by CMS — use this as a strategic narrative alongside the unit-level signal.",
      formula: "Annual Medicare inpatient revenue × 1% CMS HAC penalty = maximum penalty exposure prevented",
    },
    {
      label: "Nursing CDI Documentation Support",
      badge: "Trend",
      explanation: "Nursing observations — skin breakdown stages, functional decline, nutritional status, fall risk specifics — provide clinical corroboration that CDI teams use to support CC/MCC coding. When nursing documentation is complete and real-time, CDI has stronger evidence for DRG accuracy. This value flows to the inpatient revenue line, not a nursing billing code — but it's directly enabled by nursing documentation quality and worth surfacing in the inpatient business case.",
      whenToExpect: "Month 2–4. CDI teams can assess whether nursing documentation is improving the evidence available for CC/MCC queries. Coordinate with your CDI department to track this signal.",
    },
  ],
  QUALITY: [
    {
      label: "Documentation Lag Per Care Event",
      badge: "Signal",
      explanation: "Time between when a clinical event occurs — a vital sign change, a skin assessment finding, a patient complaint — and when it appears in the EHR. The defining quality improvement from ambient nursing: documentation lag drops from hours to minutes when nurses capture at the point of care. The oncoming shift, the charge nurse, and the attending all work from a current record. EHR timestamps make this directly measurable.",
      whenToExpect: "Week 4–8. Compare the time distribution of documentation events across the shift before and after deployment. This is the upstream signal for safety assessment completion and handoff quality.",
    },
    {
      label: "Safety Assessment Completion Rate",
      badge: "Signal",
      explanation: "Braden scale skin assessments and Morse / Hendrich fall risk scores — required on admission and at each shift change per unit policy. These are tracked by nursing quality teams already. When documentation burden drops, completion rates improve and on-time completion rates rise. Early identification of at-risk patients is the upstream mechanism for HAC prevention.",
      whenToExpect: "Month 2–3. Nursing quality teams track completion rates daily per unit. Before/after comparison on pilot units vs. control is straightforward and fast.",
    },
    {
      label: "Shift Handoff Quality (SBAR Completeness)",
      badge: "Trend",
      explanation: "The quality of shift-to-shift nursing handoffs scored against the SBAR framework. When nurses document in real time throughout the shift, the outgoing handoff reflects the current patient state rather than recalled details from 4 hours earlier. The Joint Commission tracks structured handoff processes as a National Patient Safety Goal. Better handoff documentation reduces the adverse events and near-misses caused by information gaps at shift change.",
      whenToExpect: "Month 2–3. Score 10–20 handoffs per unit per month against a SBAR completeness rubric. Compare pilot vs. control units. Nursing quality and patient safety teams often have existing audit infrastructure for this.",
    },
  ],
};

// ─── NursingMetricCard ────────────────────────────────────────────────────────

function NursingMetricCard({ item }: { item: NursingMetricItem }) {
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

// ─── NursingDomainCard ────────────────────────────────────────────────────────

function NursingDomainCard({
  data,
  metrics,
  isExpanded,
  onToggle,
}: {
  data: NursingDomainData;
  metrics: NursingMetricItem[] | undefined;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const color = nursingDomainColors[data.domain];
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
                <NursingMetricCard key={m.label} item={m} />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── NursingDomainMethodologySection ──────────────────────────────────────────

function NursingDomainMethodologySection() {
  const [expandedDomain, setExpandedDomain] = useState<NursingDomainName | null>(null);
  return (
    <div className="space-y-4">
      {nursingDomainData.map((d) => (
        <NursingDomainCard
          key={d.domain}
          data={d}
          metrics={nursingMetricItems[d.domain]}
          isExpanded={expandedDomain === d.domain}
          onToggle={() => setExpandedDomain(expandedDomain === d.domain ? null : d.domain)}
        />
      ))}
    </div>
  );
}

// ─── NursingValueArcSection ───────────────────────────────────────────────────

function NursingValueArcSection() {
  const stages: { badge: BadgeType; timing: string; title: string; description: string; domains: NursingDomainName[] }[] = [
    {
      badge: "Signal",
      timing: "Week 4–8",
      title: "The Nurse Feels It",
      description: "Post-shift charting drops measurably. More documentation completed during the shift. On-time clock-out improves. EHR session data and payroll both show the change within the first 90 days.",
      domains: ["CAPACITY", "WORKFORCE"],
    },
    {
      badge: "Trend",
      timing: "Month 2–4",
      title: "The Unit Sees It",
      description: "Safety assessment completion rates rise. Documentation burden scores improve on pulse surveys. CDI teams notice better nursing documentation quality in chart reviews.",
      domains: ["QUALITY", "WORKFORCE"],
    },
    {
      badge: "Proof",
      timing: "Month 6–18",
      title: "The System Measures It",
      description: "Voluntary turnover trending down on Abridge units vs. control. Agency fill rate declining. HCAHPS nurse communication composite moving in quarterly reports.",
      domains: ["REVENUE", "WORKFORCE"],
    },
  ];

  const chipStyles: Record<NursingDomainName, string> = {
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

export function MethodologyNursing({ onBack, onNavigateToSetting }: MethodologyNursingProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await generateMethodologyPDF("nursing");
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
          <p className="text-[11px] font-bold uppercase tracking-[2.5px] text-[#EA2C00] mb-4">Nursing</p>
          <h1 className="text-[32px] md:text-[40px] font-bold text-black leading-tight tracking-tight mb-4">
            How We Think<br />About Value
          </h1>
          <p className="text-[15px] text-[#666666] max-w-[560px] mx-auto leading-relaxed">
            The only care setting where documentation time saves a payroll dollar directly — and where retention is the compounding long-game.
          </p>
        </motion.div>

        <div className="mb-10">
          <div className="mb-6 pb-3 border-b-2 border-[#EA2C00]">
            <p className="text-[11px] font-bold uppercase tracking-[2.5px] text-[#888888] mb-2">The Nursing Value Story</p>
            <h2 className="text-[24px] font-bold text-black tracking-tight">Four Domains of Value</h2>
            <p className="text-sm text-[#888888] mt-1">
              Four domains. Each has a distinct problem, a set of mechanisms, and a measurement path. Start with whichever matters most to your unit.
            </p>
          </div>
          <NursingDomainMethodologySection />
        </div>

        <div className="mb-10">
          <div className="mb-6 pb-3 border-b-2 border-[#EA2C00]">
            <p className="text-[11px] font-bold uppercase tracking-[2.5px] text-[#888888] mb-2">Value Arc</p>
            <h2 className="text-[24px] font-bold text-black tracking-tight">How It Accrues Over Time</h2>
            <p className="text-sm text-[#888888] mt-1">
              Value doesn't arrive all at once. The sequence is mechanistically predictable — not arbitrary.
            </p>
          </div>
          <NursingValueArcSection />
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
                      <tr><td colSpan={3} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#888888', borderColor: '#888888' }}>Capacity</span></td></tr>
                      <tr className="border-b border-[#E5E5E5]"><td className="py-3">Overtime reduction</td><td className="py-3">✅ Yes (nursing only)</td><td className="py-3">Hours saved × OT conversion rate × OT hourly rate × 52 weeks</td></tr>
                      <tr><td colSpan={3} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#555555', borderColor: '#555555' }}>Workforce</span></td></tr>
                      <tr className="border-b border-[#E5E5E5]"><td className="py-3">Nurse retention</td><td className="py-3">✅ Yes (if survey data provided)</td><td className="py-3">Turnovers avoided × $50K–$100K replacement cost</td></tr>
                      <tr className="border-b border-[#E5E5E5]"><td className="py-3">Agency / locum spend</td><td className="py-3">✅ Yes (if data provided)</td><td className="py-3">Observed agency spend reduction × attribution %</td></tr>
                      <tr><td colSpan={3} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#1A1A1A', borderColor: '#1A1A1A' }}>Quality</span></td></tr>
                      <tr className="border-b border-[#E5E5E5]"><td className="py-3">Falls / HAPI prevention</td><td className="py-3 text-[#F59E0B] font-medium">Potential value — shown separately</td><td className="py-3">Current events × 5% doc-preventable rate × cost/event</td></tr>
                      <tr className="border-b border-[#E5E5E5]"><td className="py-3">HCAHPS improvement</td><td className="py-3 text-[#F59E0B] font-medium">Signal only — not calculated</td><td className="py-3">Too many confounding variables to attribute</td></tr>
                      <tr className="border-b border-[#E5E5E5]"><td className="py-3">CC/MCC support for inpatient</td><td className="py-3">Not here — see Inpatient</td><td className="py-3">Captured in CMI delta calculation</td></tr>
                    </tbody>
                  </table>
                </div>
              </CollapsibleSection>
            </div>

            <div className="px-6">
              <CollapsibleSection sectionId="assumptions" title="The Assumptions" subtitle="Nursing-specific defaults and ranges">
                <div className="space-y-6">
                  <p className="text-[15px] text-black leading-relaxed">Every model rests on assumptions. Here are ours—with ranges, not point estimates.</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#D1D5DB]">
                          <th className="text-left py-3 font-semibold text-black">Assumption</th>
                          <th className="text-left py-3 font-semibold text-black">Range</th>
                          <th className="text-left py-3 font-semibold text-black">Our Default</th>
                          <th className="text-left py-3 font-semibold text-black">Source</th>
                        </tr>
                      </thead>
                      <tbody className="text-[#666666]">
                        <tr><td colSpan={4} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#888888', borderColor: '#888888' }}>Capacity</span></td></tr>
                        <Tooltip><TooltipTrigger asChild><tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors"><td className="py-3">Time saved per shift</td><td className="py-3">15-30 minutes</td><td className="py-3">20 minutes</td><td className="py-3">Abridge customer data</td></tr></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p className="text-xs">Based on time-motion studies across 12+ nursing implementations. Varies by unit type and existing documentation workflows.</p></TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors"><td className="py-3">OT conversion rate</td><td className="py-3">15-40%</td><td className="py-3">25%</td><td className="py-3">Implementation studies</td></tr></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p className="text-xs">Not all saved time converts to OT reduction. Accounts for nurses already leaving on time, shift overlap, and other documentation tasks.</p></TooltipContent></Tooltip>
                        <tr><td colSpan={4} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#555555', borderColor: '#555555' }}>Workforce</span></td></tr>
                        <Tooltip><TooltipTrigger asChild><tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors"><td className="py-3">Nurse turnover rate</td><td className="py-3">15-25%</td><td className="py-3">18%</td><td className="py-3">NSI Nursing Solutions</td></tr></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p className="text-xs">NSI 2023 National Healthcare Retention & RN Staffing Report. National average ~22.5%, we use conservative 18%.</p></TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors"><td className="py-3">Burnout-related %</td><td className="py-3">30-50%</td><td className="py-3">40%</td><td className="py-3">ANA surveys</td></tr></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p className="text-xs">American Nurses Association workplace surveys indicate burnout contributes to 30-50% of voluntary turnover. Documentation burden is a key burnout driver.</p></TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors"><td className="py-3">Abridge retention impact</td><td className="py-3">10-25%</td><td className="py-3">15%</td><td className="py-3">Conservative estimate</td></tr></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p className="text-xs">Conservative estimate of retention improvement from reduced documentation burden. Actual impact depends on baseline burden and organizational factors.</p></TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors"><td className="py-3">Replacement cost</td><td className="py-3">$50K–$100K</td><td className="py-3">$65,000</td><td className="py-3">NSI 2023 Nursing Retention Report</td></tr></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p className="text-xs">NSI 2023 Report range: $46K–$52K for standard bedside RN. Specialty and ICU nurses carry higher replacement costs. We use $65K as a conservative midpoint.</p></TooltipContent></Tooltip>
                        <tr><td colSpan={4} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#1A1A1A', borderColor: '#1A1A1A' }}>Quality</span></td></tr>
                        <Tooltip><TooltipTrigger asChild><tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors"><td className="py-3">Documentation-preventable HAE</td><td className="py-3">3-10%</td><td className="py-3">5%</td><td className="py-3">Conservative estimate</td></tr></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p className="text-xs">Percentage of hospital-acquired events where better real-time documentation could have enabled earlier intervention. Intentionally conservative.</p></TooltipContent></Tooltip>
                      </tbody>
                    </table>
                  </div>
                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <p className="text-sm text-[#666666]"><strong className="text-black">Why we default conservative:</strong> It's better to exceed expectations than to fall short. If your organization's data suggests higher impact, adjust the assumptions— but start skeptical.</p>
                  </div>
                </div>
              </CollapsibleSection>
            </div>

            <div className="px-6">
              <CollapsibleSection sectionId="honest-limits" title="The Honest Limits" subtitle="What we can measure vs. what we can only influence">
                <div className="space-y-6">
                  <p className="text-[15px] text-black leading-relaxed">Not all value is created equal. Here's our honest assessment of measurability.</p>
                  <div className="grid gap-4">
                    <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                      <div className="flex items-center gap-2 mb-3"><div className="w-3 h-3 bg-[#22C55E] rounded-full" /><h4 className="font-semibold text-black text-sm uppercase tracking-wide">Direct and Measurable</h4></div>
                      <ul className="text-sm text-[#666666] space-y-2 ml-5">
                        <li><strong>Overtime hours:</strong> payroll data, before/after by unit. This is a hard dollar line — verifiable from your payroll system within 90 days.</li>
                        <li><strong>Documentation time:</strong> EHR time stamps, time studies</li>
                        <li><strong>Agency spend:</strong> Invoices, budget line items</li>
                      </ul>
                    </div>
                    <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                      <div className="flex items-center gap-2 mb-3"><div className="w-3 h-3 bg-[#F59E0B] rounded-full" /><h4 className="font-semibold text-black text-sm uppercase tracking-wide">Logical and Attributable</h4></div>
                      <ul className="text-sm text-[#666666] space-y-2 ml-5">
                        <li><strong>Retention improvement:</strong> Requires 6-12 months of data, survey correlation</li>
                        <li><strong>Burnout reduction:</strong> Measurable via validated instruments (MBI, etc.)</li>
                      </ul>
                    </div>
                    <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                      <div className="flex items-center gap-2 mb-3"><div className="w-3 h-3 bg-[#EF4444] rounded-full" /><h4 className="font-semibold text-black text-sm uppercase tracking-wide">Indirect and Harder to Attribute</h4></div>
                      <ul className="text-sm text-[#666666] space-y-2 ml-5">
                        <li><strong>Falls/HAPI prevention:</strong> Multiple factors; documentation is one enabler</li>
                        <li><strong>HCAHPS improvement:</strong> Many variables; can track but not attribute</li>
                      </ul>
                    </div>
                  </div>
                  <div className="bg-[#F5F0EB] rounded-lg p-4 text-sm text-[#666666] leading-relaxed">
                    Nursing is the only care setting in this methodology where we monetize time savings directly through overtime. In physician settings (outpatient, ED, inpatient), physicians are salaried — time savings are modeled as capacity or retention signal, not as a payroll line.
                  </div>
                  <div className="border-l-2 border-[#EA2C00] pl-4">
                    <p className="text-[15px] text-[#666666]"><strong className="text-black">Our approach:</strong> We calculate everything, but we label it honestly. Direct value goes in the primary ROI. Indirect value is shown separately as "potential" so you can decide how much weight to give it.</p>
                  </div>
                </div>
              </CollapsibleSection>
            </div>

            <div className="px-6">
              <CollapsibleSection sectionId="validation-path" title="The Validation Path" subtitle="How to validate these assumptions with your own data">
                <div className="space-y-6">
                  <p className="text-[15px] text-black leading-relaxed">Our defaults are starting points. Here's how to validate them in your organization.</p>
                  <div className="space-y-4">
                    <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                      <h4 className="font-semibold text-black mb-3 text-sm uppercase tracking-wide">Before Implementation</h4>
                      <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                        <li>Pull 12 months of overtime data by unit</li>
                        <li>Review agency spend and fill rates</li>
                        <li>Survey nurses on documentation burden (use validated tools)</li>
                        <li>Baseline your HAC rates (falls, HAPIs)</li>
                        <li>Document current turnover rates by tenure band</li>
                      </ul>
                    </div>
                    <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                      <h4 className="font-semibold text-black mb-3 text-sm uppercase tracking-wide">At 90 Days</h4>
                      <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                        <li>Time studies: documentation time before/after</li>
                        <li>OT hours on pilot units vs. control</li>
                        <li>Re-survey nurses on burden (same instrument)</li>
                        <li>Qualitative: manager observations on shift completion</li>
                      </ul>
                    </div>
                    <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                      <h4 className="font-semibold text-black mb-3 text-sm uppercase tracking-wide">At 12 Months</h4>
                      <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                        <li>Year-over-year OT and agency comparison</li>
                        <li>Turnover rates on Abridge units vs. system</li>
                        <li>HAC rate trends (may need longer timeframe)</li>
                        <li>HCAHPS scores (directional, not attributable)</li>
                      </ul>
                    </div>
                    <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                      <h4 className="font-semibold text-black mb-3 text-sm uppercase tracking-wide">At 18+ Months</h4>
                      <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                        <li>Year-over-year turnover rates on Abridge-enabled units vs. rest of system</li>
                        <li>Agency spend: compare against 18-month pre-implementation baseline</li>
                        <li>Exit interview data: is documentation burden still cited as a departure factor?</li>
                        <li>Retention intent surveys: are nurses in Abridge units reporting higher intent to stay?</li>
                      </ul>
                    </div>
                  </div>
                  <div className="bg-[#FFF8F0] border border-[#EA2C00]/20 rounded-lg p-5">
                    <p className="text-sm text-[#666666]"><strong className="text-black">The goal isn't to prove our model right.</strong> It's to build your organization's understanding of what ambient documentation actually delivers in your context. Adjust the model based on what you learn.</p>
                  </div>
                </div>
              </CollapsibleSection>
            </div>

            <div className="px-6">
              <CollapsibleSection sectionId="connected-value" title="Connected Value" subtitle="How nursing documentation supports the broader care system">
                <div className="space-y-4 text-[15px] text-black leading-relaxed">
                  <p>Nursing is often framed as a cost center. The documentation picture changes that framing.</p>
                  <div className="space-y-4 mt-4">
                    <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]"><h4 className="font-bold text-black mb-2 text-sm">Nursing → Inpatient (CC/MCC support)</h4><p className="text-sm text-[#666666] leading-relaxed">Nursing documentation captures clinical observations that CDI teams use to support CC/MCC coding — skin assessments, fall risk factors, nutritional status, wound care. When nursing notes are complete and real-time, CDI specialists have stronger evidence to defend appropriate DRG assignment. This is quantified in the inpatient methodology rather than here, to avoid double-counting.</p></div>
                    <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]"><h4 className="font-bold text-black mb-2 text-sm">Nursing → Patient Experience (HCAHPS signal)</h4><p className="text-sm text-[#666666] leading-relaxed">When nurses spend less time on documentation, they spend more time at the bedside. Research consistently shows bedside time correlates with patient satisfaction scores. We don't attribute HCAHPS improvement directly to documentation — too many variables — but it's a directional signal worth tracking as a leading indicator after implementation.</p></div>
                    <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]"><h4 className="font-bold text-black mb-2 text-sm">Nursing → Workforce Stability (system-level)</h4><p className="text-sm text-[#666666] leading-relaxed">Nursing turnover creates ripple effects: remaining staff absorb heavier loads, burnout accelerates, and the cycle continues. When documentation burden is reduced and retention improves even modestly, the stabilization effect compounds. The system-level value of a stable nursing workforce exceeds what any single-unit retention calculation shows.</p></div>
                  </div>
                  <p className="text-[#666666] italic mt-4">We don't sum cross-setting values into the nursing model — attribution gets complex when value flows through multiple teams. But when building a system-level business case, these connections are part of the story.</p>
                </div>
              </CollapsibleSection>
            </div>
          </div>
        </div>

        <motion.div className="mt-4 mb-10 bg-gradient-to-r from-[#1A1A1A] to-[#2D2D2D] rounded-lg p-8 text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h3 className="text-xl font-bold text-white mb-2">Ready to Build Your Model?</h3>
          <p className="text-[#999999] mb-6 text-sm">Use these methodology principles to create a customized ROI model for your nursing program.</p>
          <button onClick={onBack} className="inline-flex items-center gap-2 bg-[#EA2C00] hover:bg-[#D12600] text-white font-medium px-6 py-3 rounded-lg transition-colors" data-testid="button-build-model">
            Build a Nursing Model <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>

        <p className="text-xs text-[#888888] leading-relaxed mb-6">Projections are modeled estimates based on user-provided inputs, published industry benchmarks, and aggregated deployment experience. Actual results may vary based on implementation approach, provider adoption, organizational factors, and care setting. This methodology does not constitute a guarantee of financial outcomes.</p>

        <div className="mb-8">
          <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">Related Methodologies</p>
          <div className="grid md:grid-cols-3 gap-4">
            <button onClick={() => onNavigateToSetting?.("inpatient")} className="flex items-center gap-3 p-4 bg-white border border-[#E5E5E5] rounded-lg hover:border-[#EA2C00]/30 hover:bg-[#FFF8F0] transition-colors text-left" data-testid="link-setting-inpatient">
              <div className="w-10 h-10 rounded-full bg-[#F5F0EB] flex items-center justify-center"><Building2 className="w-5 h-5 text-[#EA2C00]" /></div>
              <div><p className="font-medium text-black text-sm">Inpatient</p><p className="text-xs text-[#888888]">DRG & documentation quality</p></div>
            </button>
            <button onClick={() => onNavigateToSetting?.("ed")} className="flex items-center gap-3 p-4 bg-white border border-[#E5E5E5] rounded-lg hover:border-[#EA2C00]/30 hover:bg-[#FFF8F0] transition-colors text-left" data-testid="link-setting-ed">
              <div className="w-10 h-10 rounded-full bg-[#F5F0EB] flex items-center justify-center"><Activity className="w-5 h-5 text-[#EA2C00]" /></div>
              <div><p className="font-medium text-black text-sm">Emergency</p><p className="text-xs text-[#888888]">Throughput & LWBS</p></div>
            </button>
            <button onClick={() => onNavigateToSetting?.("outpatient")} className="flex items-center gap-3 p-4 bg-white border border-[#E5E5E5] rounded-lg hover:border-[#EA2C00]/30 hover:bg-[#FFF8F0] transition-colors text-left" data-testid="link-setting-outpatient">
              <div className="w-10 h-10 rounded-full bg-[#F5F0EB] flex items-center justify-center"><Stethoscope className="w-5 h-5 text-[#EA2C00]" /></div>
              <div><p className="font-medium text-black text-sm">Outpatient</p><p className="text-xs text-[#888888]">wRVU & patient access</p></div>
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
