import { ClearDataButton } from './ClearDataButton';
import { PrivacyNotice } from './PrivacyNotice';

interface SecurityFooterProps {
  onClear: () => void;
  className?: string;
}

export function SecurityFooter({ onClear, className = '' }: SecurityFooterProps) {
  return (
    <footer className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-4 border-t border-slate-200 bg-white ${className}`}>
      <PrivacyNotice compact />
      <ClearDataButton onClear={onClear} variant="text" />
    </footer>
  );
}
