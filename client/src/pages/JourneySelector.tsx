import { Compass, TrendingUp, ArrowLeftRight, BookOpen, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BackgroundShape } from "@/components/BackgroundShape";
import abridgeLogo from "@assets/abridge-logo-wordmark-black-onwhite_1767885563802.jpg";

interface JourneySelectorProps {
  onSelectExplore: () => void;
  onSelectExpand: () => void;
  onSelectSwitch: () => void;
  onSelectLearn: () => void;
}

interface PathCardProps {
  icon: typeof Compass;
  title: string;
  subtitle: string;
  description: string;
  buttonText: string;
  onClick: () => void;
  testId: string;
}

function PathCard({ icon: Icon, title, subtitle, description, buttonText, onClick, testId }: PathCardProps) {
  return (
    <div 
      className="bg-white border border-[#E5E7EB] rounded-xl p-8 flex flex-col cursor-pointer hover-elevate"
      onClick={onClick}
      data-testid={testId}
    >
      <div className="w-12 h-12 rounded-xl bg-[#FEF2F0] flex items-center justify-center mb-6">
        <Icon className="w-6 h-6 text-[#EA2C00]" />
      </div>
      
      <h3 className="text-xl font-semibold text-[#111827] mb-1">{title}</h3>
      <p className="text-sm text-[#EA2C00] font-medium mb-3">{subtitle}</p>
      <p className="text-[#6B7280] text-sm leading-relaxed flex-1 mb-6">{description}</p>
      
      <Button
        variant="outline"
        className="w-full border-[#EA2C00] text-[#EA2C00]"
        data-testid={`${testId}-button`}
      >
        {buttonText}
        <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
}

export default function JourneySelector({ onSelectExplore, onSelectExpand, onSelectSwitch, onSelectLearn }: JourneySelectorProps) {
  return (
    <div className="min-h-screen bg-white relative">
      <BackgroundShape />
      <div className="max-w-6xl mx-auto px-6 py-8 relative z-10">
        <header className="mb-16">
          <div className="flex items-start">
            <div>
              <img src={abridgeLogo} alt="Abridge" className="h-7 mb-1" data-testid="img-logo" />
              <p className="text-sm text-[#6B7280] font-medium tracking-wide">ROI Calculator</p>
            </div>
          </div>
        </header>

        <section className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold text-[#111827] mb-4 tracking-tight">
            Model the impact of ambient documentation
          </h1>
          <p className="text-lg sm:text-xl text-[#6B7280] max-w-2xl mx-auto">
            Understand where the value actually comes from.
          </p>
        </section>

        <section className="mb-12">
          <p className="text-sm text-[#9CA3AF] uppercase tracking-wider font-medium text-center mb-8">
            What brings you here today?
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <PathCard
              icon={Compass}
              title="Explore"
              subtitle="New to Abridge?"
              description="Build your first ROI model and see what ambient documentation could deliver for your organization"
              buttonText="Get Started"
              onClick={onSelectExplore}
              testId="card-explore"
            />
            
            <PathCard
              icon={TrendingUp}
              title="Expand"
              subtitle="Already using Abridge?"
              description="Model what expansion to new settings or more providers could look like based on your current results"
              buttonText="Load Your Results"
              onClick={onSelectExpand}
              testId="card-expand"
            />
            
            <PathCard
              icon={ArrowLeftRight}
              title="Switch"
              subtitle="Using another solution?"
              description="See how Abridge compares and what switching could mean for your ROI"
              buttonText="Compare Solutions"
              onClick={onSelectSwitch}
              testId="card-switch"
            />
          </div>
        </section>

        <section className="max-w-5xl mx-auto mb-16">
          <div 
            onClick={onSelectLearn}
            className="flex items-center justify-center gap-3 py-4 px-6 bg-[#F9FAFB] rounded-xl cursor-pointer hover-elevate"
            data-testid="link-learn"
          >
            <BookOpen className="w-5 h-5 text-[#6B7280]" />
            <span className="text-[#6B7280] text-sm">Just want to understand how ambient ROI works?</span>
            <span className="text-[#EA2C00] text-sm font-medium flex items-center gap-1">
              Learn the methodology
              <ChevronRight className="w-4 h-4" />
            </span>
          </div>
        </section>

        <footer className="border-t border-[#F3F4F6] pt-8 text-center">
          <p className="text-sm text-[#9CA3AF]">
            Used by 200+ health system partners
          </p>
          <div className="flex items-center justify-center gap-8 mt-4 opacity-50">
            <span className="text-xs text-[#9CA3AF] font-medium">Epic</span>
            <span className="text-xs text-[#9CA3AF] font-medium">Oracle Health</span>
            <span className="text-xs text-[#9CA3AF] font-medium">MEDITECH</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
