import { useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ClearDataButtonProps {
  onClear: () => void;
  variant?: 'icon' | 'text';
  className?: string;
}

export function ClearDataButton({ onClear, variant = 'text', className = '' }: ClearDataButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleClear = () => {
    onClear();
    setShowConfirm(false);
  };

  return (
    <>
      {variant === 'icon' ? (
        <button
          onClick={() => setShowConfirm(true)}
          className={`p-2 text-slate-400 hover:text-slate-600 transition-colors ${className}`}
          aria-label="Clear all entered data"
          data-testid="button-clear-data"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ) : (
        <button
          onClick={() => setShowConfirm(true)}
          className={`flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors ${className}`}
          aria-label="Clear all entered data"
          data-testid="button-clear-data"
        >
          <Trash2 className="w-4 h-4" />
          <span>Clear Data</span>
        </button>
      )}

      {showConfirm && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          data-testid="modal-clear-confirm"
        >
          <div className="bg-white rounded-xl p-6 md:p-8 max-w-md mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-[#111827]">Clear All Data?</h3>
            </div>
            <p className="text-[#6B7280] mb-6">
              This will remove all information you've entered. This cannot be undone.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => setShowConfirm(false)}
                className="flex-1"
                data-testid="button-cancel-clear"
              >
                Cancel
              </Button>
              <Button
                onClick={handleClear}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                data-testid="button-confirm-clear"
              >
                Clear Data
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
