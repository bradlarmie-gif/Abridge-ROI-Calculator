import { Info } from 'lucide-react';

interface PrivacyNoticeProps {
  compact?: boolean;
  className?: string;
}

export function PrivacyNotice({ compact = false, className = '' }: PrivacyNoticeProps) {
  if (compact) {
    return (
      <div className={`flex items-center gap-2 text-xs text-slate-500 ${className}`}>
        <Info className="w-3.5 h-3.5 text-slate-400" />
        <span>Estimates are for planning purposes only. Please validate with your internal data.</span>
      </div>
    );
  }

  return (
    <div className={`bg-slate-50 border border-slate-200 rounded-lg p-4 ${className}`} data-testid="privacy-notice">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
          <Info className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <p className="text-sm text-[#374151]">
            <strong className="text-[#111827]">These estimates are for planning purposes.</strong> Results are based on industry benchmarks and should be validated with your organization's data.
          </p>
        </div>
      </div>
    </div>
  );
}
