import { Compass, TrendingUp, ArrowLeftRight, BookOpen, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
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
  delay: number;
  accent: {
    iconBg: string;
    iconColor: string;
    subtitleColor: string;
    buttonBorder: string;
    buttonText: string;
    buttonHoverBg: string;
    glowColor: string;
  };
  isPrimary?: boolean;
}

function PathCard({ icon: Icon, title, subtitle, description, buttonText, onClick, testId, delay, accent, isPrimary }: PathCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.5, 
        delay: delay,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      whileHover={{ scale: 1.02, y: -4 }}
      className="group relative bg-white border-2 border-slate-200 rounded-2xl p-6 md:p-7 flex flex-col cursor-pointer transition-all duration-300 ease-out shadow-sm hover:shadow-xl hover:border-slate-300"
      onClick={onClick}
      data-testid={testId}
      style={{
        ['--accent-color' as string]: accent.glowColor,
      }}
    >
      {/* Top accent bar on hover */}
      <div 
        className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ backgroundColor: accent.glowColor }}
      />
      
      {/* Icon */}
      <div 
        className="relative w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center mb-5 md:mb-6 transition-all duration-300 ease-out group-hover:scale-105"
        style={{ 
          backgroundColor: accent.iconBg,
        }}
      >
        <Icon className="w-6 h-6 md:w-7 md:h-7 transition-transform duration-300" style={{ color: accent.iconColor }} />
      </div>
      
      <h3 className="text-lg md:text-xl font-semibold text-[#111827] mb-1 relative">{title}</h3>
      <p className="text-xs md:text-sm font-medium mb-2 md:mb-3 relative" style={{ color: accent.subtitleColor }}>{subtitle}</p>
      <p className="text-[#6B7280] text-xs md:text-sm leading-relaxed flex-1 mb-5 md:mb-6 relative">{description}</p>
      
      {isPrimary ? (
        <Button
          className="w-full font-medium transition-all duration-200 text-white relative"
          style={{ 
            backgroundColor: accent.buttonHoverBg, 
            borderColor: accent.buttonHoverBg,
          }}
          data-testid={`${testId}-button`}
        >
          {buttonText}
          <ChevronRight className="w-4 h-4 ml-1 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Button>
      ) : (
        <Button
          variant="outline"
          className="w-full font-medium transition-all duration-200 relative group-hover:text-white"
          style={{ 
            borderColor: accent.buttonBorder, 
            color: accent.buttonText,
            ['--hover-bg' as string]: accent.buttonHoverBg,
          }}
          data-testid={`${testId}-button`}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = accent.buttonHoverBg;
            e.currentTarget.style.borderColor = accent.buttonHoverBg;
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = accent.buttonBorder;
            e.currentTarget.style.color = accent.buttonText;
          }}
        >
          {buttonText}
          <ChevronRight className="w-4 h-4 ml-1 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Button>
      )}
    </motion.div>
  );
}

// Accent configurations - subtle, brand-appropriate
const accents = {
  explore: {
    iconBg: '#EEF4FF',
    iconColor: '#4F6BED',
    subtitleColor: '#4F6BED',
    buttonBorder: '#4F6BED',
    buttonText: '#4F6BED',
    buttonHoverBg: '#4F6BED',
    glowColor: '#4F6BED',
  },
  expand: {
    iconBg: '#ECFDF5',
    iconColor: '#059669',
    subtitleColor: '#059669',
    buttonBorder: '#059669',
    buttonText: '#059669',
    buttonHoverBg: '#059669',
    glowColor: '#059669',
  },
  switch: {
    iconBg: '#FEF0EC',
    iconColor: '#EA2C00',
    subtitleColor: '#EA2C00',
    buttonBorder: '#EA2C00',
    buttonText: '#EA2C00',
    buttonHoverBg: '#EA2C00',
    glowColor: '#EA2C00',
  },
};

export default function JourneySelector({ onSelectExplore, onSelectExpand, onSelectSwitch, onSelectLearn }: JourneySelectorProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 relative overflow-hidden">
      <GlobalHeader pageName="Home" />
      {/* Subtle radial gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-100/50 via-transparent to-transparent pointer-events-none" />
      {/* Giant A background on right */}
      <div 
        className="absolute right-0 top-0 bottom-0 w-1/2 pointer-events-none z-0"
        style={{
          backgroundImage: `url(${abridgeABg})`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'left center',
          backgroundSize: 'cover',
          opacity: 0.45,
        }}
      />
      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-[88px] md:pt-[96px] pb-8 relative z-10">
        <motion.section 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-center mb-10 md:mb-14"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-full text-sm text-slate-600 mb-6 shadow-sm"
          >
            <span className="w-2 h-2 rounded-full bg-[#EA2C00] animate-pulse" />
            ROI Calculator
          </motion.div>
          
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-3 md:mb-4 tracking-tight px-2">
            Model the impact of ambient documentation
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-slate-500 max-w-2xl mx-auto px-2 leading-relaxed">
            Understand where the value actually comes from.
          </p>
        </motion.section>

        <section className="mb-8 md:mb-12">
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="text-xs md:text-sm text-slate-400 uppercase tracking-wider font-semibold text-center mb-6 md:mb-8"
          >
            What brings you here today?
          </motion.p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 max-w-5xl mx-auto">
            <PathCard
              icon={Compass}
              title="Explore"
              subtitle="New to Abridge?"
              description="Build your first ROI model and see what ambient documentation could deliver for your organization"
              buttonText="Get Started"
              onClick={onSelectExplore}
              testId="card-explore"
              delay={0.15}
              accent={accents.explore}
            />
            
            <PathCard
              icon={TrendingUp}
              title="Expand"
              subtitle="Already using Abridge?"
              description="Model what expansion to new settings or more providers could look like based on your current results"
              buttonText="Load Your Results"
              onClick={onSelectExpand}
              testId="card-expand"
              delay={0.25}
              accent={accents.expand}
            />
            
            <PathCard
              icon={ArrowLeftRight}
              title="Switch"
              subtitle="Using another solution?"
              description="See how Abridge compares and what switching could mean for your ROI"
              buttonText="Compare Solutions"
              onClick={onSelectSwitch}
              testId="card-switch"
              delay={0.35}
              accent={accents.switch}
            />
          </div>
        </section>

        <motion.section 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="max-w-5xl mx-auto mb-6 md:mb-8"
        >
          <div 
            onClick={onSelectLearn}
            className="flex flex-wrap items-center justify-center gap-2 md:gap-3 py-3 md:py-4 px-4 md:px-6 bg-[#F9FAFB] rounded-xl cursor-pointer transition-all duration-200 hover:bg-[#F3F4F6]"
            data-testid="link-learn"
          >
            <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-[#6B7280]" />
            <span className="text-[#6B7280] text-xs md:text-sm text-center">Just want to understand how ambient ROI works?</span>
            <span className="text-[#EA2C00] text-xs md:text-sm font-medium flex items-center gap-1">
              Learn the methodology
              <ChevronRight className="w-4 h-4" />
            </span>
          </div>
        </motion.section>

        <motion.section 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="max-w-2xl mx-auto mb-8 md:mb-12"
        >
          <PrivacyNotice />
        </motion.section>

        <motion.footer 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.7 }}
          className="border-t border-[#F3F4F6] pt-6 md:pt-8 text-center"
        >
          <p className="text-xs md:text-sm text-[#9CA3AF]">
            Used by 200+ health system partners
          </p>
        </motion.footer>
      </div>
    </div>
  );
}
