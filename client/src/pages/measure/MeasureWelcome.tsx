import { ArrowRight, Sparkles, Target, FileText, Share2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { PageTransition } from "@/components/PageTransition";
import { motion } from "framer-motion";
import geometricPattern from "@assets/Screenshot_2026-01-09_at_2.33.22_AM_1767947608832.png";

interface MeasureWelcomeProps {
  onNext: () => void;
  onBack: () => void;
}

export default function MeasureWelcome({ onNext, onBack }: MeasureWelcomeProps) {
  const staggerChildren = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 relative overflow-hidden">
      {/* Premium background layers */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-100/30 via-transparent to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-emerald-100/20 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-bl from-[#EA2C00]/[0.03] to-transparent pointer-events-none" />
      
      {/* Geometric pattern overlay */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
        <img src={geometricPattern} alt="" className="w-full h-full object-cover" />
      </div>

      <UnifiedHeader 
        pathType="measure"
        currentStep={1} 
        totalSteps={5}
        stepName="Welcome"
        onBack={onBack}
        onHome={onBack}
      />
      <UnifiedHeaderSpacer />

      <PageTransition pageKey="measure-welcome">
        <main className="relative z-10 max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-16">
          <motion.div 
            className="text-center space-y-8 md:space-y-12"
            initial="hidden"
            animate="visible"
            variants={staggerChildren}
          >
            <motion.div className="space-y-4" variants={fadeInUp}>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-50 to-emerald-50 border border-purple-200/50 rounded-full text-sm text-purple-700 shadow-sm">
                <Sparkles className="w-4 h-4 text-[#EA2C00]" />
                <span className="font-semibold tracking-wide">Your Value Story</span>
              </div>
              
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 leading-tight tracking-tight" data-testid="text-welcome-title">
                Every Deployment Is a Story
                <span className="block bg-gradient-to-r from-[#EA2C00] to-[#ff6b4a] bg-clip-text text-transparent">
                  of Transformation
                </span>
              </h1>
            </motion.div>

            <motion.p 
              className="text-lg md:text-xl text-slate-500 max-w-xl mx-auto leading-relaxed"
              variants={fadeInUp}
            >
              You championed this change. You navigated the rollout. Now let's capture what you've built — in a way that resonates with anyone who needs to see the value.
            </motion.p>

            <motion.div 
              className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-6 md:p-8 max-w-lg mx-auto shadow-lg shadow-slate-200/50"
              variants={fadeInUp}
            >
              <div className="space-y-5">
                {[
                  {
                    icon: Target,
                    iconBg: "bg-emerald-100",
                    iconColor: "text-emerald-600",
                    title: "Your real outcomes",
                    subtitle: "Documented with your data"
                  },
                  {
                    icon: FileText,
                    iconBg: "bg-blue-100",
                    iconColor: "text-blue-600",
                    title: "Transparent methodology",
                    subtitle: "Defensible and clear"
                  },
                  {
                    icon: Share2,
                    iconBg: "bg-purple-100",
                    iconColor: "text-purple-600",
                    title: "Ready to share",
                    subtitle: "With leadership and stakeholders"
                  }
                ].map((item, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center gap-4 text-left group"
                  >
                    <div className={`w-12 h-12 rounded-xl ${item.iconBg} flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform`}>
                      <item.icon className={`w-5 h-5 ${item.iconColor}`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <p className="text-sm text-slate-500">{item.subtitle}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div className="pt-4 space-y-4" variants={fadeInUp}>
              <Button
                onClick={onNext}
                size="lg"
                className="bg-gradient-to-r from-[#EA2C00] to-[#d12700] hover:from-[#d12700] hover:to-[#b82300] text-white px-10 py-6 text-lg font-semibold rounded-xl shadow-lg shadow-[#EA2C00]/20 hover:shadow-xl hover:shadow-[#EA2C00]/30 transition-all hover:scale-[1.02]"
                data-testid="button-lets-begin"
              >
                Let's Begin
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              
              <p className="text-sm text-slate-400">
                Takes about 5 minutes
              </p>
            </motion.div>
          </motion.div>
        </main>
      </PageTransition>
    </div>
  );
}
