import { Compass, TrendingUp, ClipboardCheck, BookOpen, ChevronRight, ArrowRight, Layers, LineChart, FileSpreadsheet, Target } from "lucide-react";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { GlobalHeader } from "@/components/GlobalHeader";
import abridgeShape from "@assets/abridge-shape-07_1770229105848.png";

interface JourneySelectorProps {
  onSelectExplore: () => void;
  onSelectExpand: () => void;
  onSelectSwitch: () => void;
  onSelectLearn: () => void;
  onSelectAttain: () => void;
  onSelectForecast?: () => void;
  onSelectDataRequest?: () => void;
  proformaCount?: number;
  onOpenProforma?: () => void;
}

export default function JourneySelector({ onSelectExplore, onSelectExpand, onSelectSwitch, onSelectLearn, onSelectAttain, onSelectForecast, onSelectDataRequest, proformaCount, onOpenProforma }: JourneySelectorProps) {
  // Temporarily hide the "Assess" path from the home page. Set back to true to restore it.
  const SHOW_ASSESS = false;

  const handleCardKey = (e: React.KeyboardEvent, handler: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handler();
    }
  };

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      <GlobalHeader pageName="Home" />
      <div 
        className="absolute pointer-events-none z-0"
        style={{
          right: '-10%',
          top: '50%',
          transform: 'translateY(-50%) rotate(-90deg)',
          width: '85vh',
          height: '85vh',
          opacity: 0.04,
        }}
      >
        <img 
          src={abridgeShape} 
          alt="" 
          className="w-full h-full object-contain"
          aria-hidden="true"
        />
      </div>
      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-[88px] md:pt-[96px] pb-8 relative z-10">
        <motion.section 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-center mb-12 md:mb-16"
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-black px-2 font-abridge uppercase" style={{ letterSpacing: '0.025em' }}>
            The value of
            <span className="block mt-3 md:mt-4 text-[#EA2C00]" style={{ letterSpacing: '0.025em' }}>
              Abridge
            </span>
          </h1>
        </motion.section>

        <section className="mb-8 md:mb-12">
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="text-center mb-8 md:mb-10 text-xs uppercase text-[#999999] font-medium"
            style={{ letterSpacing: '3px' }}
          >
            What brings you here today?
          </motion.p>

          {proformaCount != null && proformaCount > 0 && onOpenProforma && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex justify-center mb-8"
            >
              <button
                onClick={onOpenProforma}
                className="inline-flex items-center gap-2.5 bg-[#F5F0EB] hover:bg-[#EDE7E0] rounded-full px-5 py-2.5 transition-colors group"
                data-testid="button-open-proforma"
              >
                <Layers className="w-4 h-4 text-[#EA2C00]" />
                <span className="text-sm font-medium text-neutral-700">
                  {proformaCount} {proformaCount === 1 ? 'setting' : 'settings'} in proforma
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-[#EA2C00] transition-colors" />
              </button>
            </motion.div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 max-w-5xl mx-auto">

            {/* CARD 1: EXPLORE */}
            <motion.div 
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
              whileHover={{ y: -4 }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => handleCardKey(e, onSelectExplore)}
              className="group relative flex flex-col cursor-pointer transition-all duration-300 ease-out rounded-xl p-8 min-h-[320px] bg-[#F5F0EB] hover:bg-[#EDE7E0] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA2C00] focus-visible:ring-offset-2"
              onClick={onSelectExplore}
              data-testid="card-explore"
            >
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-5">
                <Compass className="w-6 h-6 text-[#EA2C00]" />
              </div>
              
              <p className="text-[13px] text-[#EA2C00] font-medium mb-1.5" data-testid="text-explore-tagline">
                New to Abridge?
              </p>
              <h3 className="text-2xl font-bold text-[#1A1A1A] mb-2.5" data-testid="text-explore-title">
                Explore
              </h3>
              <p className="text-sm text-[#666666] leading-relaxed flex-1 mb-6" data-testid="text-explore-description">
                Discover what ambient documentation could unlock for your organization—in real numbers.
              </p>
              
              <Button
                className="w-full bg-[#EA2C00] text-white border-[#EA2C00]"
                size="lg"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectExplore();
                }}
                data-testid="card-explore-button"
              >
                Start Exploring
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </motion.div>

            {/* CARD: ATTAIN — sits between Explore and Measure */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              whileHover={{ y: -4 }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => handleCardKey(e, onSelectAttain)}
              className="group relative flex flex-col cursor-pointer transition-all duration-300 ease-out rounded-xl p-8 min-h-[320px] bg-[#F5F0EB] hover:bg-[#EDE7E0] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA2C00] focus-visible:ring-offset-2"
              onClick={onSelectAttain}
              data-testid="card-attain"
            >
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-5">
                <Target className="w-6 h-6 text-[#EA2C00]" />
              </div>

              <p className="text-[13px] text-[#EA2C00] font-medium mb-1.5" data-testid="text-attain-tagline">
                Committed to a goal?
              </p>
              <h3 className="text-2xl font-bold text-[#1A1A1A] mb-2.5" data-testid="text-attain-title">
                Attain
              </h3>
              <p className="text-sm text-[#666666] leading-relaxed flex-1 mb-6" data-testid="text-attain-description">
                Pick the outcome you're chasing and build the step-by-step plan to reach it, together.
              </p>

              <Button
                className="w-full bg-[#EA2C00] text-white border-[#EA2C00]"
                size="lg"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectAttain();
                }}
                data-testid="card-attain-button"
              >
                Build the Plan
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </motion.div>

            {/* CARD 2: MEASURE — Warm beige background */}
            <motion.div 
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
              whileHover={{ y: -4 }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => handleCardKey(e, onSelectExpand)}
              className="group relative flex flex-col cursor-pointer transition-all duration-300 ease-out rounded-xl p-8 min-h-[320px] bg-[#F5F0EB] hover:bg-[#EDE7E0] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA2C00] focus-visible:ring-offset-2"
              onClick={onSelectExpand}
              data-testid="card-measure"
            >
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-5">
                <TrendingUp className="w-6 h-6 text-[#EA2C00]" />
              </div>
              
              <p className="text-[13px] text-[#EA2C00] font-medium mb-1.5" data-testid="text-measure-tagline">
                Already using Abridge?
              </p>
              <h3 className="text-2xl font-bold text-[#1A1A1A] mb-2.5" data-testid="text-measure-title">
                Measure
              </h3>
              <p className="text-sm text-[#666666] leading-relaxed flex-1 mb-6" data-testid="text-measure-description">
                Capture what you've built and frame your value story with data.
              </p>
              
              <Button
                className="w-full bg-[#EA2C00] text-white border-[#EA2C00]"
                size="lg"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectExpand();
                }}
                data-testid="card-measure-button"
              >
                Start Your Story
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </motion.div>

            {/* CARD 3: SWITCH / ASSESS — hidden for now via SHOW_ASSESS flag (not deleted) */}
            {SHOW_ASSESS && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
              whileHover={{ y: -4 }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => handleCardKey(e, onSelectSwitch)}
              className="group relative flex flex-col cursor-pointer transition-all duration-300 ease-out rounded-xl p-8 min-h-[320px] bg-[#F5F0EB] hover:bg-[#EDE7E0] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA2C00] focus-visible:ring-offset-2"
              onClick={onSelectSwitch}
              data-testid="card-switch"
            >
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-5">
                <ClipboardCheck className="w-6 h-6 text-[#EA2C00]" />
              </div>
              
              <p className="text-[13px] text-[#EA2C00] font-medium mb-1.5" data-testid="text-switch-tagline">
                Understand your organization
              </p>
              <h3 className="text-2xl font-bold text-[#1A1A1A] mb-2.5" data-testid="text-switch-title">
                Assess
              </h3>
              <p className="text-sm text-[#666666] leading-relaxed flex-1 mb-6" data-testid="text-switch-description">
                Evaluate your current documentation approach — for providers or nursing — and discover where value lives.
              </p>
              
              <Button
                className="w-full bg-[#EA2C00] text-white border-[#EA2C00]"
                size="lg"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectSwitch();
                }}
                data-testid="card-switch-button"
              >
                Start an Assessment
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </motion.div>
            )}

            {onSelectForecast && (
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
                whileHover={{ y: -4 }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => handleCardKey(e, onSelectForecast)}
                className="group relative flex flex-col cursor-pointer transition-all duration-300 ease-out rounded-xl p-8 min-h-[320px] bg-[#F5F0EB] hover:bg-[#EDE7E0] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA2C00] focus-visible:ring-offset-2"
                onClick={onSelectForecast}
                data-testid="card-forecast"
              >
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-5">
                  <LineChart className="w-6 h-6 text-[#EA2C00]" />
                </div>

                <p className="text-[13px] text-[#EA2C00] font-medium mb-1.5" data-testid="text-forecast-tagline">
                  Model what's next
                </p>
                <h3 className="text-2xl font-bold text-[#1A1A1A] mb-2.5" data-testid="text-forecast-title">
                  Forecast
                </h3>
                <p className="text-sm text-[#666666] leading-relaxed flex-1 mb-6" data-testid="text-forecast-description">
                  Compare deal structures, model new partnerships, or forward-project an existing partner's ROI.
                </p>

                <Button
                  className="w-full bg-[#EA2C00] text-white border-[#EA2C00]"
                  size="lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectForecast();
                  }}
                  data-testid="card-forecast-button"
                >
                  Build a Model
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </motion.div>
            )}

            {onSelectDataRequest && (
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
                whileHover={{ y: -4 }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => handleCardKey(e, onSelectDataRequest)}
                className="group relative flex flex-col cursor-pointer transition-all duration-300 ease-out rounded-xl p-8 min-h-[320px] bg-[#F5F0EB] hover:bg-[#EDE7E0] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA2C00] focus-visible:ring-offset-2"
                onClick={onSelectDataRequest}
                data-testid="card-data-request"
              >
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-5">
                  <FileSpreadsheet className="w-6 h-6 text-[#EA2C00]" />
                </div>

                <p className="text-[13px] text-[#EA2C00] font-medium mb-1.5" data-testid="text-data-request-tagline">
                  Preparing for a conversation?
                </p>
                <h3 className="text-2xl font-bold text-[#1A1A1A] mb-2.5" data-testid="text-data-request-title">
                  Data Request
                </h3>
                <p className="text-sm text-[#666666] leading-relaxed flex-1 mb-6" data-testid="text-data-request-description">
                  Generate a targeted Excel to collect the exact data points you need from a prospect — no more, no less.
                </p>

                <Button
                  className="w-full bg-[#EA2C00] text-white border-[#EA2C00]"
                  size="lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectDataRequest();
                  }}
                  data-testid="card-data-request-button"
                >
                  Build a Request
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </motion.div>
            )}
          </div>
        </section>

        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="text-center pt-6 md:pt-10 pb-2 space-y-5"
        >
          <div className="flex items-center justify-center gap-3">
            <BookOpen className="w-[18px] h-[18px] text-[#EA2C00] shrink-0" />
            <p className="text-sm text-[#666666]">
              See how we calculate this &mdash; every assumption, formula, and limitation.
            </p>
            <Button
              variant="ghost"
              onClick={onSelectLearn}
              className="text-sm font-medium text-[#EA2C00] shrink-0 gap-1"
              data-testid="link-learn"
            >
              Understand the Value Story
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
          <p className="text-[12px] text-[#999999]">
            Estimates are for planning purposes. Results should be validated with your organization's data.
          </p>
        </motion.footer>
      </div>
    </div>
  );
}
