import { motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

export type BadgeType = "Demonstrated" | "Emerging" | "Strategic";

const badgeStyles: Record<BadgeType, string> = {
  Demonstrated: "bg-[#1A1A1A] text-white",
  Emerging: "border border-[#666] text-[#666] bg-transparent",
  Strategic: "bg-[#F5F0EB] text-[#888]",
};

export function ImpactBadge({ type }: { type: BadgeType }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${badgeStyles[type]}`}>
      {type}
    </span>
  );
}

export type DomainName = "QUALITY" | "WORKFORCE" | "CAPACITY" | "REVENUE";

export const domainColors: Record<DomainName, string> = {
  QUALITY:   "#4F46E5",
  WORKFORCE: "#16A34A",
  CAPACITY:  "#D97706",
  REVENUE:   "#EA2C00",
};

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
      className="w-full text-left bg-white rounded-lg border border-[#E5E5E5] p-5 hover:border-[#D1D5DB] hover:shadow-sm transition-all cursor-pointer"
      style={{ borderLeftWidth: 3, borderLeftColor: color }}
    >
      <p className="text-xs font-bold uppercase tracking-[1.5px] mb-1" style={{ color }}>
        {data.domain}
      </p>
      <p className="text-sm text-[#666666] mb-4 leading-snug">{data.description}</p>
      <div className="space-y-2">
        {data.items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3">
            <span className="text-xs text-[#444444] leading-tight">{item.label}</span>
            <ImpactBadge type={item.badge} />
          </div>
        ))}
      </div>
    </button>
  );
}

export function DomainOverviewGrid({
  cards,
  onDomainClick,
}: {
  cards: DomainCardData[];
  onDomainClick?: (domain: DomainName) => void;
}) {
  return (
    <div className="mb-10">
      <div className="mb-5">
        <h2 className="text-sm font-bold text-black uppercase tracking-tight mb-1">Four Domains of Value</h2>
        <p className="text-sm text-[#888888]">Click a domain to explore the evidence and calculation detail below.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map((card) => (
          <DomainOverviewCard key={card.domain} data={card} onClick={() => onDomainClick?.(card.domain)} />
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-4 items-center">
        <span className="text-[10px] text-[#888888] uppercase tracking-wide font-medium">Evidence level:</span>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-1.5">
            <ImpactBadge type="Demonstrated" />
            <span className="text-[10px] text-[#666666]">trackable from EHR/claims/payroll</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ImpactBadge type="Emerging" />
            <span className="text-[10px] text-[#666666]">attributable with confidence over 6–18 mo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ImpactBadge type="Strategic" />
            <span className="text-[10px] text-[#666666]">directional, real but not easily monetized</span>
          </div>
        </div>
      </div>
      <p className="mt-2 text-[10px] text-[#888888] leading-relaxed">These reflect evidence level for the category, not a guarantee of outcomes at your organization.</p>
    </div>
  );
}

interface SectionProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  sectionId: string;
  accentColor?: string;
}

export function CollapsibleSection({ title, subtitle, children, defaultOpen = false, sectionId, accentColor }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[#E5E5E5] last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-6 flex items-start justify-between text-left"
        data-testid={`button-section-${sectionId}`}
      >
        <div>
          <h2
            className="text-lg font-bold text-black uppercase tracking-tight"
            style={accentColor ? { borderLeft: `3px solid ${accentColor}`, paddingLeft: 10 } : undefined}
          >
            {title}
          </h2>
          <p className="text-sm text-[#888888] mt-1">{subtitle}</p>
        </div>
        <div className="ml-4 mt-1">
          {isOpen ? <ChevronUp className="w-5 h-5 text-[#888888]" /> : <ChevronDown className="w-5 h-5 text-[#888888]" />}
        </div>
      </button>
      {isOpen && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="pb-8">
          {children}
        </motion.div>
      )}
    </div>
  );
}

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

export function DomainDetailSection({ data, sectionRef }: { data: DomainDetailData; sectionRef?: React.RefObject<HTMLDivElement> }) {
  const color = domainColors[data.domain];
  return (
    <CollapsibleSection
      sectionId={`domain-${data.domain.toLowerCase()}`}
      title={data.sectionTitle}
      subtitle={data.sectionSubtitle}
      accentColor={color}
    >
      <div ref={sectionRef} className="space-y-4">
        {data.items.map((item) => (
          <DomainImpactCard key={item.label} item={item} color={color} />
        ))}
        {data.honestLimit && (
          <div className="mt-2 bg-[#F5F0EB] rounded-lg p-4 text-sm text-[#666666] leading-relaxed">
            <strong className="text-black">Honest limit: </strong>{data.honestLimit}
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}

function DomainImpactCard({ item, color }: { item: DomainImpactItem; color: string }) {
  const [showFormula, setShowFormula] = useState(false);
  return (
    <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h4 className="font-semibold text-black text-sm">{item.label}</h4>
        <ImpactBadge type={item.badge} />
      </div>
      <p className="text-sm text-[#666666] leading-relaxed">{item.explanation}</p>
      {item.formula && (
        <div className="mt-3">
          <button
            onClick={() => setShowFormula(!showFormula)}
            className="text-xs font-medium uppercase tracking-wide flex items-center gap-1 transition-colors"
            style={{ color }}
          >
            {showFormula ? "Hide formula" : "Show formula"}
            {showFormula ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {showFormula && (
            <div className="mt-2 bg-[#F5F0EB] rounded-lg p-3">
              <p className="font-mono text-xs text-black">{item.formula}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
