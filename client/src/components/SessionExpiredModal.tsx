import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SessionExpiredModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SessionExpiredModal({ isOpen, onClose }: SessionExpiredModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      data-testid="modal-session-expired"
    >
      <div className="bg-white rounded-xl p-6 md:p-8 max-w-md mx-4 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <Shield className="w-5 h-5 text-amber-600" />
          </div>
          <h3 className="text-lg font-bold text-[#111827]">Session Expired</h3>
        </div>
        <p className="text-[#6B7280] mb-6">
          For your security, your session has expired due to inactivity. 
          All entered data has been cleared.
        </p>
        <Button 
          onClick={onClose}
          className="w-full bg-[#EA2C00] hover:bg-[#d12700] text-white"
          data-testid="button-start-over"
        >
          Start Over
        </Button>
      </div>
    </div>
  );
}
