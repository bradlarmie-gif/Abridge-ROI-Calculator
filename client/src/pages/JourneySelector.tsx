import { useState } from "react";
import { Compass, TrendingUp, ArrowLeftRight, BookOpen, ChevronRight, Check } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { GlobalHeader } from "@/components/GlobalHeader";
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
  onSelect: () => void;
  isSelected: boolean;
  testId: string;
  delay: number;
}

function PathCard({ icon: Icon, title, subtitle, description, buttonText, onClick, onSelect, isSelected, testId, delay }: PathCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.5, 
        delay: delay,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      whileHover={{ y: -4 }}
      className={`
        group relative rounded-2xl p-6 md:p-7 flex flex-col cursor-pointer transition-all duration-300 ease-out
        ${isSelected 
          ? 'bg-white border-l-4 border-l-[#EA2C00] border-t border-r border-b border-[#E5E7EB] shadow-lg' 
          : 'bg-white border border-slate-200 shadow-sm hover:shadow-lg hover:border-slate-300'
        }
      `}
      onClick={onSelect}
      data-testid={testId}
    >
      {/* Selection indicator */}
      {isSelected && (
        <motion.div 
          className="absolute top-4 right-4 w-6 h-6 bg-[#EA2C00] rounded-full flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
          <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
        </motion.div>
      )}
      
      {/* Icon */}
      <div 
        className={`
          relative w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center mb-5 md:mb-6 transition-all duration-300 ease-out
          ${isSelected ? 'bg-[#FFF5F2]' : 'bg-[#FFF5F2]'}
        `}
      >
        <Icon className={`w-6 h-6 md:w-7 md:h-7 transition-transform duration-300 ${isSelected ? 'text-[#EA2C00]' : 'text-[#EA2C00]'}`} />
      </div>
      
      <h3 className="text-lg md:text-xl font-semibold mb-1 text-black">
        {title}
      </h3>
      <p className="text-xs md:text-sm font-medium mb-2 md:mb-3 text-[#888888]">
        {subtitle}
      </p>
      <p className="text-xs md:text-sm leading-relaxed flex-1 mb-5 md:mb-6 text-[#6B7280]">
        {description}
      </p>
      
      <Button
        className="w-full font-medium transition-all duration-200 rounded-full bg-[#EA2C00] text-white hover:bg-[#EA2C00]/90"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        data-testid={`${testId}-button`}
      >
        {buttonText}
        <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </motion.div>
  );
}

export default function JourneySelector({ onSelectExplore, onSelectExpand, onSelectSwitch, onSelectLearn }: JourneySelectorProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

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
          opacity: 0.3,
        }}
      />
      
      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-[88px] md:pt-[96px] pb-8 relative z-10">
        <motion.section 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-center mb-10 md:mb-14"
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-black mb-3 tracking-tight px-2 font-abridge uppercase">
            The value of
            <span className="block mt-3 md:mt-4 tracking-normal" style={{ color: '#EA2C00' }}>
              Abridge
            </span>
          </h1>
          <p className="text-base md:text-lg text-[#6B7280]">
            See what's possible for your organization.
          </p>
        </motion.section>

        <section className="mb-8 md:mb-12">
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="text-xs md:text-sm text-[#888888] uppercase tracking-widest font-semibold text-center mb-6 md:mb-8"
          >
            What brings you here today?
          </motion.p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 max-w-5xl mx-auto">
            <PathCard
              icon={Compass}
              title="Explore"
              subtitle="New to Abridge?"
              description="Discover what ambient documentation could unlock for your organization—in real numbers"
              buttonText="Start Exploring"
              onClick={onSelectExplore}
              onSelect={() => setSelectedPath('explore')}
              isSelected={selectedPath === 'explore'}
              testId="card-explore"
              delay={0.15}
            />
            
            <PathCard
              icon={TrendingUp}
              title="Measure"
              subtitle="Already using Abridge?"
              description="Measure your impact and frame your value story"
              buttonText="Start Your Story"
              onClick={onSelectExpand}
              onSelect={() => setSelectedPath('measure')}
              isSelected={selectedPath === 'measure'}
              testId="card-measure"
              delay={0.25}
            />
            
            <PathCard
              icon={ArrowLeftRight}
              title="Switch"
              subtitle="Using another solution?"
              description="See how Abridge compares—and what you'd gain by switching"
              buttonText="Run the Comparison"
              onClick={onSelectSwitch}
              onSelect={() => setSelectedPath('switch')}
              isSelected={selectedPath === 'switch'}
              testId="card-switch"
              delay={0.35}
            />
          </div>
        </section>

        <motion.footer 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="text-center pt-4 md:pt-6 space-y-3"
        >
          <p className="text-xs text-[#888888]">
            Estimates are for planning purposes. Results should be validated with your organization's data.
          </p>
          <button
            onClick={onSelectLearn}
            className="inline-flex items-center gap-1.5 text-xs text-[#888888] hover:text-[#EA2C00] transition-colors"
            data-testid="link-learn"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Learn the methodology</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </motion.footer>
      </div>
    </div>
  );
}
