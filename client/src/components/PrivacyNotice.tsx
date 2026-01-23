import { Shield } from 'lucide-react';

interface PrivacyNoticeProps {
  compact?: boolean;
  className?: string;
}

export function PrivacyNotice({ compact = false, className = '' }: PrivacyNoticeProps) {
  if (compact) {
    return (
      <div className={`flex items-center gap-2 text-xs text-slate-500 ${className}`}>
        <Shield className="w-3.5 h-3.5 text-slate-400" />
        <span>Your data is stored locally and cleared when you close this tab.</span>
      </div>
    );
  }

  return (
    <div className={`bg-slate-50 border border-slate-200 rounded-lg p-4 ${className}`} data-testid="privacy-notice">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
          <Shield className="w-4 h-4 text-emerald-600" />
        </div>
        <div>
          <p className="text-sm text-[#374151]">
            <strong className="text-[#111827]">Your privacy matters.</strong> All calculations happen in your browser. 
            We don't store or transmit your data. Information is automatically cleared 
            after 30 minutes of inactivity or when you close this tab.
          </p>
        </div>
      </div>
    </div>
  );
}
