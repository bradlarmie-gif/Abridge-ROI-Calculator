import { Compass, TrendingUp, ArrowLeftRight, BookOpen, ChevronRight } from "lucide-react";
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
  measure: {
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
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4 md:mb-6 tracking-tight px-2 font-abridge uppercase">
            Model the Impact of
            <span 
              className="block mt-3 md:mt-4 tracking-wide cursor-default transition-all duration-500 hover:text-[#EA2C00] hover:tracking-wider"
              style={{ 
                background: 'linear-gradient(90deg, #EA2C00 50%, currentColor 50%)',
                backgroundSize: '200% 100%',
                backgroundPosition: '100% 0',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                transition: 'background-position 0.4s ease, letter-spacing 0.4s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundPosition = '0% 0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundPosition = '100% 0';
              }}
            >Abridge</span>
          </h1>
          <button
            onClick={onSelectLearn}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#EA2C00] transition-colors"
            data-testid="link-learn"
          >
            <BookOpen className="w-4 h-4" />
            <span>Learn the methodology</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
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
              title="Measure"
              subtitle="Already using Abridge?"
              description="See what you've built and capture your value story"
              buttonText="Start Your Story"
              onClick={onSelectExpand}
              testId="card-measure"
              delay={0.25}
              accent={accents.measure}
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

        <motion.footer 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="text-center pt-4 md:pt-6"
        >
          <p className="text-xs text-slate-400">
            Estimates are for planning purposes. Results should be validated with your organization's data.
          </p>
        </motion.footer>
      </div>
    </div>
  );
}
