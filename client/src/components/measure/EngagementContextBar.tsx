import { type EngagementContext, type DataSource } from "@/lib/measureCalculator";

interface EngagementContextBarProps {
  context: EngagementContext;
  dataSource: DataSource;
  organizationName?: string;
}

const SOURCE_CONFIG: Record<DataSource, { label: string; bg: string; text: string }> = {
  analytics: { label: 'Analytics Pull', bg: 'bg-green-100', text: 'text-green-700' },
  benchmark: { label: 'Partner Platform', bg: 'bg-blue-100', text: 'text-blue-700' },
  estimate: { label: 'Team Estimate', bg: 'bg-gray-100', text: 'text-gray-600' },
};

export function EngagementContextBar({ context, dataSource, organizationName }: EngagementContextBarProps) {
  const src = SOURCE_CONFIG[dataSource] || SOURCE_CONFIG.estimate;

  return (
    <div className="flex items-center gap-3 flex-wrap mb-6 px-1" data-testid="engagement-context-bar">
      {organizationName && (
        <span className="text-sm font-medium text-[#1A1A1A]" data-testid="text-org-name">{organizationName}</span>
      )}
      {organizationName && <span className="text-[#CCCCCC]">|</span>}
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#EA2C00] text-white" data-testid="badge-phase">
        Phase {context.phase} {"–"} {context.phaseLabel}
      </span>
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#1A1A1A] text-white" data-testid="badge-maturity">
        {context.maturityLabel}
      </span>
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${src.bg} ${src.text}`} data-testid="badge-source">
        {src.label}
      </span>
    </div>
  );
}
