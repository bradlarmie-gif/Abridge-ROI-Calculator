import { useLocation } from 'wouter';
import abridgeLogo from '@assets/abridge-logo-wordmark-red_1769020684647.png';

interface ProgressDotsProps {
  currentStep: number;
  totalSteps: number;
}

function ProgressDots({ currentStep, totalSteps }: ProgressDotsProps) {
  return (
    <div className="flex gap-2 items-center">
      {Array.from({ length: totalSteps }, (_, i) => (
        <span
          key={i}
          className={`h-2 rounded-full transition-all ${
            i === currentStep - 1 
              ? 'w-6 bg-[#EA2C00]' 
              : i < currentStep 
                ? 'w-2 bg-slate-800' 
                : 'w-2 bg-slate-200'
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
}

export function GlobalHeader({ pageName, showContext = true, currentStep, totalSteps }: GlobalHeaderProps) {
  const [, setLocation] = useLocation();

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setLocation('/');
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-white border-b border-slate-200 z-50 h-[72px]">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 h-full flex items-center justify-between">
        <a 
          href="/" 
          onClick={handleLogoClick}
          className="flex items-center transition-opacity hover:opacity-70 cursor-pointer"
          data-testid="link-logo-home"
        >
          <img 
            src={abridgeLogo} 
            alt="Abridge" 
            className="h-6"
          />
        </a>

        {showContext && (
          <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2">
            <span className="text-sm text-slate-500 font-medium">ROI Calculator</span>
            {pageName && (
              <>
                <span className="text-slate-300">·</span>
                <span className="text-sm text-slate-900 font-semibold">{pageName}</span>
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
