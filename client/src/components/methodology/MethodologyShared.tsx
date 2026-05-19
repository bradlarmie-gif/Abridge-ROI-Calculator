import { motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// ─── Evidence Badge ───────────────────────────────────────────────────────────

export type BadgeType = "Signal" | "Trend" | "Proof";

const badgeStyles: Record<BadgeType, { className: string }> = {
  Signal: { className: "bg-[#1A1A1A] text-white" },
  Trend:  { className: "border border-[#999999] text-[#555555] bg-transparent" },
  Proof:  { className: "bg-[#F5F0EB] text-[#888888] border border-[#E5E5E5]" },
};

export function ImpactBadge({ type }: { type: BadgeType }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-[0.08em] whitespace-nowrap ${badgeStyles[type].className}`}>
      {type}
    </span>
  );
}

// ─── Domain Colors ────────────────────────────────────────────────────────────
// Brand-aligned: monochromatic scale with red as the single accent

export type DomainName = "QUALITY" | "WORKFORCE" | "CAPACITY" | "REVENUE";

export const domainColors: Record<DomainName, string> = {
  QUALITY:   "#1A1A1A",
  WORKFORCE: "#555555",
  CAPACITY:  "#888888",
  REVENUE:   "#EA2C00",
};

// ─── Domain Overview Card ─────────────────────────────────────────────────────

export interface ImpactItem {
  label: string;
  badge: BadgeType;
}

export interface DomainCardData {
  domain: DomainName;
  description: string;
  items: ImpactItem[];
}

export function DomainOverviewCard({ data, onClick }: { data: DomainCardData; onClick?: () => void }) {
  const color = domainColors[data.domain];
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-sm border border-[#E5E5E5] p-5 hover:border-[#CCCCCC] hover:shadow-sm transition-all group"
      style={{ borderTopWidth: 2, borderTopColor: color }}
    >
      <p
        className="text-[10px] font-bold uppercase tracking-[2px] mb-2"
        style={{ color }}
      >
        {data.domain}
      </p>
      <p className="text-sm text-[#666666] mb-4 leading-snug">{data.description}</p>
      <div className="space-y-2.5">
        {data.items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3">
            <span className="text-xs text-[#444444] leading-tight">{item.label}</span>
            <ImpactBadge type={item.badge} />
          </div>
        ))}
      </div>
      <p className="text-[10px] text-[#EA2C00] mt-4 font-medium uppercase tracking-wide opacity-0 group-hover:opacity-100 transition-opacity">
        Explore ↓
      </p>
    </button>
  );
}

// ─── Collapsible Section ──────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  sectionId: string;
  accentColor?: string;
}

export function CollapsibleSection({
  title,
  subtitle,
  children,
  defaultOpen = false,
  sectionId,
  accentColor,
}: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-[#D9D4CF] last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-5 flex items-start justify-between text-left"
        data-testid={`button-section-${sectionId}`}
      >
        <div className="border-l-2 border-[#EA2C00] pl-4">
          <h2 className="text-[15px] font-bold text-black">
            {title}
          </h2>
          <p className="text-[12px] text-[#888888] mt-1">{subtitle}</p>
        </div>
        <div className="ml-4 mt-0.5 shrink-0">
          {isOpen
            ? <ChevronUp className="w-4 h-4 text-[#888888]" />
            : <ChevronDown className="w-4 h-4 text-[#888888]" />}
        </div>
      </button>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="pb-7"
        >
          {children}
        </motion.div>
      )}
    </div>
  );
}

// ─── Domain Detail Types & Card ───────────────────────────────────────────────

export interface DomainImpactItem {
  label: string;
  badge: BadgeType;
  explanation: string;
  formula?: string;
  limit?: string;
  // Structured four-part content — when present, renders labeled sections instead of explanation prose
  mechanism?: string;
  whyItMatters?: string;
  whenToExpect?: string;
}

export interface DomainDetailData {
  domain: DomainName;
  sectionTitle: string;
  sectionSubtitle: string;
  items: DomainImpactItem[];
  honestLimit?: string;
}

export function DomainImpactCard({
  item,
  accentColor,
}: {
  item: DomainImpactItem;
  accentColor: string;
}) {
  const [showFormula, setShowFormula] = useState(false);
  const hasStructured = !!(item.mechanism || item.whyItMatters || item.whenToExpect);

  return (
    <div className="bg-white border border-[#E5E5E5] rounded-sm overflow-hidden flex">
      <div className="w-[3px] shrink-0" style={{ backgroundColor: accentColor }} />
      <div className="flex-1 p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <h4 className="font-semibold text-black text-sm leading-snug">{item.label}</h4>
          <ImpactBadge type={item.badge} />
        </div>

        {hasStructured ? (
          <div className="space-y-3">
            {item.mechanism && (
              <p className="text-[13px] text-[#444444] leading-relaxed">{item.mechanism}</p>
            )}
            {item.whyItMatters && (
              <p className="text-[13px] text-[#666666] leading-relaxed">{item.whyItMatters}</p>
            )}
            {item.whenToExpect && (
              <div className="bg-[#F5F0EB] rounded-sm px-4 py-3">
                <p className="text-[10px] text-[#888888] font-medium mb-1">When to expect</p>
                <p className="text-[12px] text-[#444444] leading-relaxed">{item.whenToExpect}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-[13px] text-[#666666] leading-relaxed">{item.explanation}</p>
        )}

        {item.limit && (
          <p className="text-[11px] text-[#999999] leading-relaxed italic mt-3">{item.limit}</p>
        )}

        {item.formula && (
          <div className="mt-4 pt-3 border-t border-[#F0EDE9]">
            <button
              onClick={() => setShowFormula(!showFormula)}
              className="text-[10px] font-bold uppercase tracking-[1.5px] flex items-center gap-1 text-[#EA2C00] hover:text-[#C22000] transition-colors"
            >
              {showFormula ? "Hide formula" : "Show formula"}
              {showFormula ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showFormula && (
              <div className="mt-2 bg-[#F5F0EB] rounded-sm p-3 border-l-2 border-[#EA2C00]">
                <p className="font-mono text-xs text-[#1A1A1A] leading-relaxed whitespace-pre-line">{item.formula}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Qualitative Signal ───────────────────────────────────────────────────────

export interface QualitativeSignal {
  label: string;
  tagline: string;
  howToTrack: string;
  badge: BadgeType;
}

function QualitativeSignalCard({ signal }: { signal: QualitativeSignal }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white border border-[#E5E5E5] rounded-sm p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h5 className="font-bold text-black text-xs uppercase tracking-wide leading-snug">{signal.label}</h5>
        <ImpactBadge type={signal.badge} />
      </div>
      <p className="text-sm text-[#666666] leading-relaxed mb-3">{signal.tagline}</p>
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-[10px] font-bold uppercase tracking-[1.5px] flex items-center gap-1 text-[#EA2C00] hover:text-[#C22000] transition-colors"
      >
        {expanded ? "Hide" : "How to track"}
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {expanded && (
        <div className="mt-2 bg-[#F5F0EB] rounded-sm p-3 border-l-2 border-[#EA2C00]">
          <p className="text-xs text-[#1A1A1A] leading-relaxed">{signal.howToTrack}</p>
        </div>
      )}
    </div>
  );
}

// ─── Domain Tab Explorer ──────────────────────────────────────────────────────

const DOMAIN_ORDER: DomainName[] = ["QUALITY", "WORKFORCE", "CAPACITY", "REVENUE"];
const DOMAIN_LABELS: Record<DomainName, string> = {
  QUALITY: "Quality",
  WORKFORCE: "Workforce",
  CAPACITY: "Capacity",
  REVENUE: "Revenue",
};

export function DomainTabExplorer({
  cards,
  domainDetails,
  qualitativeByDomain,
  defaultDomain = "QUALITY",
  hideOverviewGrid = false,
  activeDomain: controlledDomain,
  onDomainChange,
  children,
}: {
  cards: DomainCardData[];
  domainDetails: DomainDetailData[];
  qualitativeByDomain: Partial<Record<DomainName, QualitativeSignal[]>>;
  defaultDomain?: DomainName;
  hideOverviewGrid?: boolean;
  activeDomain?: DomainName;
  onDomainChange?: (domain: DomainName) => void;
  children?: React.ReactNode;
}) {
  const [internalDomain, setInternalDomain] = useState<DomainName>(defaultDomain);
  const activeDomain = controlledDomain ?? internalDomain;
  const setActiveDomain = (d: DomainName) => {
    setInternalDomain(d);
    onDomainChange?.(d);
  };

  const activeDetail = domainDetails.find((d) => d.domain === activeDomain);
  const activeCard = cards.find((c) => c.domain === activeDomain);
  const activeSignals = qualitativeByDomain[activeDomain] ?? [];

  return (
    <div className="mb-10">
      {!hideOverviewGrid && (
        <>
          {/* Section header */}
          <div className="mb-6 pb-3 border-b-2 border-[#EA2C00]">
            <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#EA2C00] mb-1">Framework</p>
            <h2 className="text-lg font-bold text-black uppercase tracking-tight">Four Domains of Value</h2>
            <p className="text-sm text-[#888888] mt-1">Select a domain to explore the evidence and methodology below.</p>
          </div>

          {/* Overview cards — clicking switches active tab */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {cards.map((card) => (
              <DomainOverviewCard key={card.domain} data={card} onClick={() => setActiveDomain(card.domain)} />
            ))}
          </div>

          {/* Badge legend */}
          <div className="mb-6 pt-4 border-t border-[#E5E5E5] flex flex-wrap gap-x-6 gap-y-2 items-center">
            <span className="text-[10px] text-[#888888] uppercase tracking-[1.5px] font-bold">Evidence level:</span>
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <ImpactBadge type="Signal" />
                <span className="text-[10px] text-[#666666]">visible in first 30–90 days of per-encounter use</span>
              </div>
              <div className="flex items-center gap-2">
                <ImpactBadge type="Trend" />
                <span className="text-[10px] text-[#666666]">meaningful patterns emerge at 3–6 months</span>
              </div>
              <div className="flex items-center gap-2">
                <ImpactBadge type="Proof" />
                <span className="text-[10px] text-[#666666]">system-level proof at 6–18 months</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Beige container — tab bar, tab content, and collapsible children */}
      <div className="bg-[#F5F0EB] rounded-lg">
        <div className="px-6">

          {/* Tab bar — inside the beige panel */}
          <div className="flex border-b border-[#D9D4CF] overflow-x-auto">
            {DOMAIN_ORDER.map((domain) => {
              const isActive = activeDomain === domain;
              const color = domainColors[domain];
              return (
                <button
                  key={domain}
                  onClick={() => setActiveDomain(domain)}
                  className="px-4 py-3 text-xs font-bold uppercase tracking-[1.5px] whitespace-nowrap transition-colors hover:text-[#444444]"
                  style={{
                    color: isActive ? color : "#888888",
                    borderBottom: `2px solid ${isActive ? color : "transparent"}`,
                    marginBottom: -1,
                  }}
                  data-testid={`tab-domain-${domain.toLowerCase()}`}
                >
                  {DOMAIN_LABELS[domain]}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <motion.div
            key={activeDomain}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="space-y-6 py-6"
          >
            {/* Domain description */}
            {activeCard && (
              <p className="text-[15px] text-[#666666] leading-relaxed">{activeCard.description}</p>
            )}

            {/* Modeled drivers */}
            {activeDetail && activeDetail.items.length > 0 && (
              <div>
                {activeDetail.honestLimit && (
                  <div className="mb-4 border-l-2 border-[#EA2C00] pl-4 py-3 bg-white rounded-sm">
                    <p className="text-[10px] font-semibold text-[#EA2C00] mb-1">Honest limit</p>
                    <p className="text-xs text-[#666666] leading-relaxed">{activeDetail.honestLimit}</p>
                  </div>
                )}
                <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#888888] mb-3">Modeled Drivers</p>
                <div className="space-y-3">
                  {activeDetail.items.map((item) => (
                    <DomainImpactCard key={item.label} item={item} accentColor={domainColors[activeDomain]} />
                  ))}
                </div>
              </div>
            )}

            {/* Qualitative signals — Signals to Track */}
            {activeSignals.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#888888] mb-3">Signals to Track</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeSignals.map((signal) => (
                    <QualitativeSignalCard key={signal.label} signal={signal} />
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Collapsible sections passed as children — sit below tab content, inside same beige panel */}
          {children}

        </div>
      </div>
    </div>
  );
}

// ─── Value Accrual Section ────────────────────────────────────────────────────

export interface ValueAccrualStage {
  badge: BadgeType;
  timing: string;
  title: string;
  description: string;
}

export function ValueAccrualSection({ stages: customStages }: { stages?: ValueAccrualStage[] } = {}) {
  const defaultStages: ValueAccrualStage[] = [
    {
      badge: "Signal" as BadgeType,
      timing: "30–90 days",
      title: "The Provider Feels It",
      description: "Time returned per encounter. After-hours documentation dropping. Less cognitive load at the end of shift. These signals are individual-level and EHR-measurable as soon as a provider is using Abridge consistently on their own encounters.",
    },
    {
      badge: "Trend" as BadgeType,
      timing: "3–6 months",
      title: "The Chart Shows It",
      description: "CDI query reduction. Note completeness. H&P timing. CC/MCC capture. These require the provider to trust the capture — using the tool isn't enough, the documentation itself has to change. That trust takes time to build.",
    },
    {
      badge: "Proof" as BadgeType,
      timing: "6–18 months",
      title: "The System Measures It",
      description: "CMI, wRVU, denial rates, retention, HCAHPS. Downstream of documentation quality. Requires data volume for statistical credibility. This is what goes in the annual business case and contract renewal conversation.",
    },
  ];
  const stages = customStages ?? defaultStages;

  return (
    <div className="mb-10 border border-[#E5E5E5] rounded-sm overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#E5E5E5]">
        {stages.map((stage) => (
          <div key={stage.badge} className="p-5">
            <div className="flex items-center justify-between mb-3">
              <ImpactBadge type={stage.badge} />
              <span className="text-[10px] font-medium text-[#888888] uppercase tracking-wide">{stage.timing}</span>
            </div>
            <p className="font-bold text-black text-xs uppercase tracking-wide mb-2">{stage.title}</p>
            <p className="text-xs text-[#666666] leading-relaxed">{stage.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Methodology Glossary & NarrativeText ─────────────────────────────────────

export const METHODOLOGY_GLOSSARY: Record<string, string> = {
  'LWBS':    'Left Without Being Seen — patients who register at the ED but leave before a provider sees them, typically due to long wait times.',
  'wRVU':    'Work Relative Value Unit — the productivity metric used to measure and compensate physician clinical work. Higher-complexity visits carry more wRVUs.',
  'E/M':     'Evaluation and Management — CPT code category for office and ED visits. Level (1–5) is determined by complexity and drives reimbursement.',
  'CDI':     'Clinical Documentation Integrity — a hospital program that reviews records to ensure diagnoses and comorbidities are fully and accurately documented for appropriate coding.',
  'DRG':     'Diagnosis-Related Group — the payment category CMS uses for inpatient stays. Which DRG is assigned — and what it pays — depends on the diagnoses and severity documented.',
  'CC/MCC':  'Complication or Comorbidity / Major Complication or Comorbidity — when these are documented, DRG weight increases, raising reimbursement for that discharge.',
  'CMI':     'Case Mix Index — average DRG weight across all inpatient discharges. Higher CMI reflects more complex (and better-reimbursed) patients on paper.',
  'MDM':     'Medical Decision Making — the complexity assessment in E/M coding. Captures number of problems addressed, data reviewed, and management risk level.',
  'VBP':     'Value-Based Purchasing — the CMS program that ties a portion of hospital Medicare payments to quality and patient experience scores.',
  'HACRP':   'Hospital-Acquired Condition Reduction Program — CMS penalizes hospitals in the worst-performing quartile for hospital-acquired conditions.',
  'HRRP':    'Hospital Readmissions Reduction Program — CMS reduces payments to hospitals with above-expected readmission rates for select conditions.',
  'HEDIS':   'Healthcare Effectiveness Data and Information Set — the standard quality measure framework used by health plans. Performance affects plan ratings and provider contracts.',
  'STARS':   'CMS Star Ratings — the 1–5 star quality rating for Medicare Advantage plans. Higher ratings unlock bonus payments and affect member acquisition.',
  'HCAHPS':  'Hospital Consumer Assessment of Healthcare Providers and Systems — standardized patient satisfaction survey used in CMS quality and VBP reporting.',
  'CAUTI':   'Catheter-Associated Urinary Tract Infection — a hospital-acquired infection tracked as a nursing-sensitive quality and safety measure.',
  'CLABSI':  'Central Line-Associated Bloodstream Infection — a serious hospital-acquired infection tracked as a nursing-sensitive quality measure.',
  'HAPI':    'Hospital-Acquired Pressure Injury — a pressure injury that develops during a hospital stay, reported as a nursing-sensitive quality indicator.',
  'PSI-90':  'Patient Safety Indicator 90 — a CMS composite measure of hospital-acquired complications including post-surgical infections and other safety events.',
  'NDNQI':   'National Database of Nursing Quality Indicators — the primary benchmarking database for nursing-sensitive quality measures, used by Magnet-designated hospitals.',
  'O/E':     'Observed-to-Expected Ratio — compares actual patient outcomes to risk-adjusted expected outcomes. A lower ratio means better-than-expected performance.',
};

export function NarrativeText({ text }: { text: string }) {
  const matches: { start: number; end: number; term: string; key: string }[] = [];

  for (const key of Object.keys(METHODOLOGY_GLOSSARY)) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?<![A-Za-z])${escaped}(?![A-Za-z])`, 'g');
    re.lastIndex = 0;
    const m = re.exec(text);
    if (m) matches.push({ start: m.index, end: m.index + m[0].length, term: m[0], key });
  }

  matches.sort((a, b) => a.start - b.start);
  const clean: typeof matches = [];
  let cursor = 0;
  for (const m of matches) {
    if (m.start >= cursor) { clean.push(m); cursor = m.end; }
  }

  const parts: ReactNode[] = [];
  let pos = 0;
  for (const m of clean) {
    if (m.start > pos) parts.push(text.slice(pos, m.start));
    parts.push(
      <Tooltip key={m.start}>
        <TooltipTrigger asChild>
          <span className="border-b border-dotted border-[#BBBBBB] cursor-help">{m.term}</span>
        </TooltipTrigger>
        <TooltipContent className="max-w-[280px] text-[12px] leading-relaxed">
          {METHODOLOGY_GLOSSARY[m.key]}
        </TooltipContent>
      </Tooltip>
    );
    pos = m.end;
  }
  if (pos < text.length) parts.push(text.slice(pos));

  return <p className="text-[13px] text-[#333333] leading-[1.65] mb-4">{parts}</p>;
}

