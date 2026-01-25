import { Compass, TrendingUp, ArrowLeftRight, BookOpen, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobalHeader } from "@/components/GlobalHeader";
import { PrivacyNotice } from "@/components/PrivacyNotice";
import abridgeABg from "@assets/abridge-a-bg_1769025961657.png";

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
      className="bg-white border border-[#E5E7EB] rounded-xl p-5 md:p-8 flex flex-col cursor-pointer hover-elevate"
      onClick={onClick}
      data-testid={testId}
    >
      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-[#FEF0EC] flex items-center justify-center mb-4 md:mb-6">
        <Icon className="w-5 h-5 md:w-6 md:h-6 text-[#EA2C00]" />
      </div>
      
      <h3 className="text-lg md:text-xl font-semibold text-[#111827] mb-1">{title}</h3>
      <p className="text-xs md:text-sm text-[#EA2C00] font-medium mb-2 md:mb-3">{subtitle}</p>
      <p className="text-[#6B7280] text-xs md:text-sm leading-relaxed flex-1 mb-4 md:mb-6">{description}</p>
      
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
    <div className="min-h-screen bg-white relative overflow-hidden">
      <GlobalHeader pageName="Home" />
      {/* Giant A background on right */}
      <div 
        className="absolute right-0 top-0 bottom-0 w-1/2 pointer-events-none z-0"
        style={{
          backgroundImage: `url(${abridgeABg})`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'left center',
          backgroundSize: 'cover',
          opacity: 0.65,
        }}
      />
      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-[88px] md:pt-[96px] pb-8 relative z-10">
        <section className="text-center mb-10 md:mb-16">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-[#111827] mb-3 md:mb-4 tracking-tight px-2">
            Model the impact of ambient documentation
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-[#6B7280] max-w-2xl mx-auto px-2">
            Understand where the value actually comes from.
          </p>
        </section>

        <section className="mb-8 md:mb-12">
          <p className="text-xs md:text-sm text-[#9CA3AF] uppercase tracking-wider font-medium text-center mb-6 md:mb-8">
            What brings you here today?
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto">
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

        <section className="max-w-5xl mx-auto mb-6 md:mb-8">
          <div 
            onClick={onSelectLearn}
            className="flex flex-wrap items-center justify-center gap-2 md:gap-3 py-3 md:py-4 px-4 md:px-6 bg-[#F9FAFB] rounded-xl cursor-pointer hover-elevate"
            data-testid="link-learn"
          >
            <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-[#6B7280]" />
            <span className="text-[#6B7280] text-xs md:text-sm text-center">Just want to understand how ambient ROI works?</span>
            <span className="text-[#EA2C00] text-xs md:text-sm font-medium flex items-center gap-1">
              Learn the methodology
              <ChevronRight className="w-4 h-4" />
            </span>
          </div>
        </section>

        <section className="max-w-2xl mx-auto mb-8 md:mb-12">
          <PrivacyNotice />
        </section>

        <footer className="border-t border-[#F3F4F6] pt-6 md:pt-8 text-center">
          <p className="text-xs md:text-sm text-[#9CA3AF]">
            Used by 200+ health system partners
          </p>
        </footer>
      </div>
    </div>
  );
}
