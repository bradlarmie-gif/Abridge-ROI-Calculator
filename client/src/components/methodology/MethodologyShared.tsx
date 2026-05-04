import { motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

// ─── Evidence Badge ───────────────────────────────────────────────────────────

export type BadgeType = "Demonstrated" | "Emerging" | "Strategic";

const badgeStyles: Record<BadgeType, { className: string }> = {
  Demonstrated: { className: "bg-[#1A1A1A] text-white" },
  Emerging:     { className: "border border-[#999999] text-[#555555] bg-transparent" },
  Strategic:    { className: "bg-[#F5F0EB] text-[#888888] border border-[#E5E5E5]" },
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
        <div>
          <h2
            className="text-sm font-bold text-black uppercase tracking-[1.5px]"
            style={accentColor ? { borderLeft: `2px solid ${accentColor}`, paddingLeft: 10 } : undefined}
          >
            {title}
          </h2>
          <p className="text-xs text-[#888888] mt-1 ml-[14px]">{subtitle}</p>
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
}

export interface DomainDetailData {
  domain: DomainName;
  sectionTitle: string;
  sectionSubtitle: string;
  items: DomainImpactItem[];
  honestLimit?: string;
}

function DomainImpactCard({
  item,
  accentColor,
}: {
  item: DomainImpactItem;
  accentColor: string;
}) {
  const [showFormula, setShowFormula] = useState(false);

  return (
    <div className="bg-white border border-[#E5E5E5] rounded-sm p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h4 className="font-bold text-black text-xs uppercase tracking-wide leading-snug">{item.label}</h4>
        <ImpactBadge type={item.badge} />
      </div>
      <p className="text-sm text-[#666666] leading-relaxed">{item.explanation}</p>
      {item.formula && (
        <div className="mt-3">
          <button
            onClick={() => setShowFormula(!showFormula)}
            className="text-[10px] font-bold uppercase tracking-[1.5px] flex items-center gap-1 text-[#EA2C00] hover:text-[#C22000] transition-colors"
          >
            {showFormula ? "Hide formula" : "Show formula"}
            {showFormula
              ? <ChevronUp className="w-3 h-3" />
              : <ChevronDown className="w-3 h-3" />}
          </button>
          {showFormula && (
            <div className="mt-2 bg-[#F5F0EB] rounded-sm p-3 border-l-2 border-[#EA2C00]">
              <p className="font-mono text-xs text-[#1A1A1A] leading-relaxed whitespace-pre-line">{item.formula}</p>
            </div>
          )}
        </div>
      )}
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
  children,
}: {
  cards: DomainCardData[];
  domainDetails: DomainDetailData[];
  qualitativeByDomain: Partial<Record<DomainName, QualitativeSignal[]>>;
  defaultDomain?: DomainName;
  children?: React.ReactNode;
}) {
  const [activeDomain, setActiveDomain] = useState<DomainName>(defaultDomain);

  const activeDetail = domainDetails.find((d) => d.domain === activeDomain);
  const activeCard = cards.find((c) => c.domain === activeDomain);
  const activeSignals = qualitativeByDomain[activeDomain] ?? [];

  return (
    <div className="mb-10">
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
            <ImpactBadge type="Demonstrated" />
            <span className="text-[10px] text-[#666666]">trackable from EHR / claims / payroll</span>
          </div>
          <div className="flex items-center gap-2">
            <ImpactBadge type="Emerging" />
            <span className="text-[10px] text-[#666666]">attributable with confidence over 6–18 mo</span>
          </div>
          <div className="flex items-center gap-2">
            <ImpactBadge type="Strategic" />
            <span className="text-[10px] text-[#666666]">directional — real but not easily monetized</span>
          </div>
        </div>
      </div>

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
                <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#888888] mb-3">Modeled Drivers</p>
                <div className="space-y-3">
                  {activeDetail.items.map((item) => (
                    <DomainImpactCard key={item.label} item={item} accentColor={domainColors[activeDomain]} />
                  ))}
                </div>
                {activeDetail.honestLimit && (
                  <div className="mt-4 border-l-2 border-[#EA2C00] pl-4 py-3 bg-white rounded-sm">
                    <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#EA2C00] mb-1">Honest limit</p>
                    <p className="text-xs text-[#666666] leading-relaxed">{activeDetail.honestLimit}</p>
                  </div>
                )}
              </div>
            )}

            {/* Qualitative signals — Metrics to Watch */}
            {activeSignals.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#888888] mb-3">Metrics to Watch</p>
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
