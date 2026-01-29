import { ArrowRight, Sparkles, Target, FileText, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { PageTransition } from "@/components/PageTransition";

interface MeasureWelcomeProps {
  onNext: () => void;
  onBack: () => void;
}

export default function MeasureWelcome({ onNext, onBack }: MeasureWelcomeProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
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
        <main className="max-w-2xl mx-auto px-4 md:px-6 py-8 md:py-16">
          <div className="text-center space-y-8 md:space-y-12">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 text-[#EA2C00] mb-4">
                <Sparkles className="w-5 h-5" />
                <span className="text-sm font-semibold tracking-wide uppercase">Your Value Story</span>
              </div>
              
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#111827] leading-tight" data-testid="text-welcome-title">
                Every Deployment Is a Story
                <span className="block text-[#EA2C00]">of Transformation</span>
              </h1>
            </div>

            <p className="text-lg md:text-xl text-[#6B7280] max-w-xl mx-auto leading-relaxed">
              You championed this change. You navigated the rollout. Now let's capture what you've built — in a way that resonates with anyone who needs to see the value.
            </p>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 max-w-md mx-auto shadow-sm">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Target className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium text-[#111827]">Your real outcomes</p>
                    <p className="text-sm text-[#6B7280]">Documented with your data</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-[#111827]">Transparent methodology</p>
                    <p className="text-sm text-[#6B7280]">Defensible and clear</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Share2 className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-[#111827]">Ready to share</p>
                    <p className="text-sm text-[#6B7280]">With leadership and stakeholders</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Button
                onClick={onNext}
                size="lg"
                className="bg-[#EA2C00] hover:bg-[#d12700] text-white px-8 py-6 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
                data-testid="button-lets-begin"
              >
                Let's Begin
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>

            <p className="text-sm text-[#9CA3AF]">
              Takes about 5 minutes
            </p>
          </div>
        </main>
      </PageTransition>
    </div>
  );
}
