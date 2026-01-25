import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import abridgeLogo from '@assets/abridge-logo-wordmark-red_1769020684647.png';

interface ProgressDotsProps {
  currentStep: number;
  totalSteps: number;
}

function ProgressDots({ currentStep, totalSteps }: ProgressDotsProps) {
  return (
    <div className="flex gap-1.5 sm:gap-2 items-center">
      {Array.from({ length: totalSteps }, (_, i) => (
        <span
          key={i}
          className={`h-1.5 sm:h-2 rounded-full transition-all ${
            i === currentStep - 1 
              ? 'w-4 sm:w-6 bg-[#EA2C00]' 
              : i < currentStep 
                ? 'w-1.5 sm:w-2 bg-slate-800' 
                : 'w-1.5 sm:w-2 bg-slate-200'
          }`}
          data-testid={`progress-dot-${i + 1}`}
        />
      ))}
    </div>
  );
}

interface GlobalHeaderProps {
  pageName?: string;
  showContext?: boolean;
  currentStep?: number;
  totalSteps?: number;
  onLogoClick?: () => void;
  onBack?: () => void;
  showBack?: boolean;
}

export function GlobalHeader({ pageName, showContext = true, currentStep, totalSteps, onLogoClick, onBack, showBack = true }: GlobalHeaderProps) {
  const [, setLocation] = useLocation();
  
  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onLogoClick) {
      onLogoClick();
    } else {
      setLocation("/");
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-white border-b border-slate-200 z-50 h-[72px]">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 h-full flex items-center justify-between">
        {/* Left: Logo + Back */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink-0">
          <a 
            href="/" 
            onClick={handleLogoClick}
            className="flex items-center transition-opacity hover:opacity-70 cursor-pointer flex-shrink-0"
            data-testid="link-logo-home"
          >
            <img 
              src={abridgeLogo} 
              alt="Abridge" 
              className="h-5 sm:h-6"
            />
          </a>
          
          {showBack && (
            <>
              <div className="w-px h-5 bg-slate-200 hidden sm:block" />
              <button
                onClick={handleBack}
                className="flex items-center gap-1 text-slate-600 hover:text-slate-900 transition-colors p-1.5 -ml-1 rounded-md hover:bg-slate-100"
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-sm font-medium hidden sm:inline">Back</span>
              </button>
            </>
          )}
        </div>

        {showContext && (
          <div className="hidden md:flex absolute left-1/2 transform -translate-x-1/2 items-center gap-2">
            <span className="text-sm text-slate-500 font-medium">ROI Calculator</span>
            {pageName && (
              <>
                <span className="text-slate-300">·</span>
                <span className="text-sm text-slate-900 font-semibold truncate max-w-[200px]">{pageName}</span>
              </>
            )}
          </div>
        )}

        <div className="flex items-center gap-3">
          {currentStep !== undefined && totalSteps !== undefined && (
            <ProgressDots currentStep={currentStep} totalSteps={totalSteps} />
          )}
        </div>
      </div>
    </header>
  );
}
