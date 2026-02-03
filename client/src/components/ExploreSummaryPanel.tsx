import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StatItem {
  value: string | number;
  label: string;
  highlight?: boolean;
}

interface LineItem {
  label: string;
  value: string | number | null;
  sublabel?: string;
}

interface ExploreSummaryPanelProps {
  title: string;
  subtitle?: string;
  heroValue?: string | number;
  heroLabel?: string;
  heroSubtext?: string;
  stats?: StatItem[];
  lineItems?: LineItem[];
  secondaryLineItems?: LineItem[];
  footerNote?: string;
  buttonText: string;
  buttonDisabled?: boolean;
  disabledMessage?: string;
  onContinue: () => void;
  children?: React.ReactNode;
}

export function ExploreSummaryPanel({
  title,
  subtitle,
  heroValue,
  heroLabel,
  heroSubtext,
  stats,
  lineItems,
  secondaryLineItems,
  footerNote,
  buttonText,
  buttonDisabled = false,
  disabledMessage,
  onContinue,
  children,
}: ExploreSummaryPanelProps) {
  const formatValue = (val: string | number | null) => {
    if (val === null) return "—";
    return val;
  };

  return (
    <div className="bg-[#1A1A1A] rounded-xl p-6 sticky top-24">
      {/* Header */}
      <div className="mb-4">
        <p className="text-[11px] font-medium text-white uppercase tracking-[1.5px]">
          {title}
        </p>
        {subtitle && (
          <p className="text-sm text-[#888888] mt-1">{subtitle}</p>
        )}
      </div>

      {/* Stats with left border */}
      {stats && stats.length > 0 && (
        <div className="space-y-3 mb-4">
          {stats.map((stat, i) => (
            <div key={i} className="border-l-4 border-[#EA2C00] pl-3">
              <p className={`text-lg font-bold ${stat.highlight ? 'text-[#EA2C00]' : 'text-white'}`}>
                {stat.value}
              </p>
              <p className="text-sm text-[#888888]">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Hero Value */}
      {heroValue !== undefined && (
        <>
          <div className="h-px bg-[#333333] my-4" />
          <div className="text-center my-4">
            {heroLabel && (
              <p className="text-[11px] font-medium text-white uppercase tracking-[1.5px] mb-2">
                {heroLabel}
              </p>
            )}
            <p className="text-3xl md:text-4xl font-bold text-[#EA2C00]">
              {heroValue}
            </p>
            {heroSubtext && (
              <p className="text-sm text-[#888888] mt-1">{heroSubtext}</p>
            )}
          </div>
        </>
      )}

      {/* Line Items */}
      {lineItems && lineItems.length > 0 && (
        <>
          <div className="h-px bg-[#333333] my-4" />
          <div className="space-y-2">
            {lineItems.map((item, i) => (
              <div key={i}>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#888888]">{item.label}</span>
                  <span className={`text-sm font-semibold ${item.value === null ? 'text-[#666666]' : 'text-white'}`}>
                    {formatValue(item.value)}
                  </span>
                </div>
                {item.sublabel && (
                  <p className="text-xs text-[#666666] mt-0.5">{item.sublabel}</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Secondary Line Items */}
      {secondaryLineItems && secondaryLineItems.length > 0 && (
        <>
          <div className="h-px bg-[#333333] my-4" />
          <div className="space-y-2">
            {secondaryLineItems.map((item, i) => (
              <div key={i}>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#888888]">{item.label}</span>
                  <span className={`text-sm font-semibold ${item.value === null ? 'text-[#666666]' : 'text-white'}`}>
                    {formatValue(item.value)}
                  </span>
                </div>
                {item.sublabel && (
                  <p className="text-xs text-[#666666] mt-0.5">{item.sublabel}</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Custom Children */}
      {children}

      {/* Footer Note */}
      {footerNote && (
        <>
          <div className="h-px bg-[#333333] my-4" />
          <p className="text-xs text-[#666666] italic">{footerNote}</p>
        </>
      )}

      {/* Continue Button */}
      <div className="mt-6">
        <Button
          onClick={onContinue}
          disabled={buttonDisabled}
          className={`w-full h-11 font-medium rounded-md gap-2 ${
            buttonDisabled
              ? "bg-[#333333] text-[#666666] cursor-not-allowed"
              : "bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white"
          }`}
          data-testid="button-panel-continue"
        >
          {buttonText}
          <ArrowRight className="w-4 h-4" />
        </Button>
        {buttonDisabled && disabledMessage && (
          <p className="text-xs text-[#666666] text-center mt-2">{disabledMessage}</p>
        )}
      </div>
    </div>
  );
}

interface SummaryStatBoxProps {
  label: string;
  value: string | number;
}

export function SummaryStatBox({ label, value }: SummaryStatBoxProps) {
  return (
    <div className="bg-[#2A2A2A] rounded-lg p-3 text-center">
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-xs text-[#888888]">{label}</p>
    </div>
  );
}

interface SummaryHighlightBoxProps {
  label: string;
  value: string | number;
}

export function SummaryHighlightBox({ label, value }: SummaryHighlightBoxProps) {
  return (
    <div className="bg-[#2A2A2A] rounded-lg p-4 text-center border border-[#EA2C00]/30">
      <p className="text-[11px] font-medium text-white uppercase tracking-[1.5px] mb-2">
        {label}
      </p>
      <p className="text-2xl font-bold text-[#EA2C00]">{value}</p>
    </div>
  );
}
