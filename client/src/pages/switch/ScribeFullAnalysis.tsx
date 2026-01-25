import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Download, Share2, Timer, Moon, BarChart3, Info, Sparkles, Check, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot, Legend } from "recharts";
import {
  type ScribeInputs,
  calculateScribeGap,
  formatCurrency,
  getScalingDataPoints,
  SCRIBE_ASSUMPTIONS,
} from "@/lib/scribeGapCalculator";
import { generateScribePDF } from "@/components/switch/ScribePDFExport";
import { useToast } from "@/hooks/use-toast";

interface ScribeFullAnalysisProps {
  inputs: ScribeInputs;
  onBack: () => void;
  onBackToJourney?: () => void;
  onExploreAmbientAI?: (providers: number, encounters: number) => void;
}

export default function ScribeFullAnalysis({
  inputs,
  onBack,
  onBackToJourney,
  onExploreAmbientAI,
}: ScribeFullAnalysisProps) {
  const calculations = useMemo(() => calculateScribeGap(inputs), [inputs]);
  const scalingData = useMemo(() => getScalingDataPoints(inputs, calculations), [inputs, calculations]);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await generateScribePDF(inputs, calculations);
      toast({
        title: "PDF Generated",
        description: "Your Scribe Program Analysis has been downloaded.",
      });
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast({
        title: "Export Failed",
        description: "Unable to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <UnifiedHeader 
        pathType="switch"
        currentStep={2} 
        totalSteps={2}
        stepName="Full Analysis"
        onBack={onBack}
      />
      <UnifiedHeaderSpacer />

      <main className="py-6 md:py-8 pb-8 px-4 md:px-8 max-w-5xl mx-auto">
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-[#111827] mb-2">
            Your Scribe Program Analysis
          </h1>
          <p className="text-xs md:text-sm text-[#6B7280]">
            Understand your scribe program economics
          </p>
        </div>

        {/* Section 1: Your Program at a Glance */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 text-center">
            <div className="text-[10px] md:text-xs font-medium text-[#6B7280] uppercase tracking-wide mb-1">
              Your Investment
            </div>
            <div className="text-2xl md:text-4xl font-bold text-[#111827]">
              {formatCurrency(calculations.totalScribeCost)}
            </div>
            <div className="text-xs md:text-sm text-[#6B7280]">annual scribe program cost</div>
          </div>

          <div className="bg-slate-100 rounded-xl border-2 border-slate-400 p-4 md:p-6 text-center">
            <div className="text-[10px] md:text-xs font-medium text-[#6B7280] uppercase tracking-wide mb-1">
              Your Coverage
            </div>
            <div className="text-2xl md:text-4xl font-bold text-[#111827]">{calculations.coveragePercent}%</div>
            <div className="text-xs md:text-sm text-[#6B7280]">
              {inputs.providersWithScribes} of {inputs.totalProviders} providers
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 text-center">
            <div className="text-[10px] md:text-xs font-medium text-[#6B7280] uppercase tracking-wide mb-1">
              Cost Per Covered Provider
            </div>
            <div className="text-2xl md:text-4xl font-bold text-[#111827]">
              {formatCurrency(calculations.costPerProviderCovered)}
            </div>
            <div className="text-xs md:text-sm text-[#6B7280]">annual</div>
          </div>
        </section>

        {/* Section 2: Your Coverage Gap */}
        <section className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 lg:p-8 mb-6 md:mb-8">
          <h2 className="text-lg md:text-xl font-bold text-[#111827] mb-4 md:mb-6">Your Coverage Gap</h2>

          <div className="mb-6">
            <div className="relative h-12 bg-slate-100 rounded-lg overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-slate-500 flex items-center px-3 transition-all"
                style={{ width: `${Math.max(calculations.coveragePercent, 2)}%`, minWidth: calculations.coveragePercent > 0 ? '8px' : '0' }}
              />
              {calculations.coveragePercent >= 20 ? (
                <span 
                  className="absolute top-1/2 -translate-y-1/2 left-3 text-xs font-semibold text-white"
                  style={{ maxWidth: `${calculations.coveragePercent - 5}%` }}
                >
                  {inputs.providersWithScribes} with scribes
                </span>
              ) : (
                <span 
                  className="absolute top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-600"
                  style={{ left: `${Math.max(calculations.coveragePercent, 2) + 2}%` }}
                >
                  {inputs.providersWithScribes} with scribes
                </span>
              )}
              <div
                className="absolute top-0 h-full bg-amber-100 flex items-center justify-center transition-all"
                style={{
                  left: `${calculations.coveragePercent}%`,
                  width: `${100 - calculations.coveragePercent}%`,
                }}
              >
                {calculations.coveragePercent < 60 && (
                  <span className="text-xs font-semibold text-amber-700">
                    {calculations.providersWithoutSupport} without support
                  </span>
                )}
              </div>
              {calculations.coveragePercent >= 60 && (
                <span 
                  className="absolute top-1/2 -translate-y-1/2 right-3 text-xs font-semibold text-amber-700"
                >
                  {calculations.providersWithoutSupport} without support
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-[#111827]">{calculations.coveragePercent}%</div>
              <div className="text-xs text-[#6B7280]">have scribe support</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-amber-700">
                {100 - calculations.coveragePercent}%
              </div>
              <div className="text-xs text-amber-600">documenting alone</div>
            </div>
          </div>
        </section>

        {/* Section 3: The Scaling Math */}
        <section className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 lg:p-8 mb-6 md:mb-8">
          <h2 className="text-lg md:text-xl font-bold text-[#111827] mb-2">What Full Scribe Coverage Would Cost</h2>
          <p className="text-xs md:text-sm text-[#6B7280] mb-4 md:mb-6">
            If you wanted to give every provider scribe support
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-50 rounded-xl p-5">
              <div className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mb-3">
                Current State
              </div>

              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Scribes</span>
                  <span className="font-medium text-[#111827]">{inputs.scribeCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Providers covered</span>
                  <span className="font-medium text-[#111827]">{inputs.providersWithScribes}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Coverage</span>
                  <span className="font-medium text-[#111827]">{calculations.coveragePercent}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Scribe:Provider ratio</span>
                  <span className="font-medium text-[#111827]">1:{calculations.scribeRatio}</span>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <div className="flex justify-between items-end">
                  <span className="text-xs text-[#6B7280]">Annual cost</span>
                  <span className="text-xl font-bold text-[#111827]">{formatCurrency(calculations.totalScribeCost)}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-100 rounded-xl p-5 relative">
              <div className="absolute top-3 right-3">
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mb-3">
                Full Coverage
              </div>

              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Scribes needed</span>
                  <span className="font-medium text-[#111827]">{calculations.scribesNeededForFullCoverage}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Providers covered</span>
                  <span className="font-medium text-[#111827]">{inputs.totalProviders}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Coverage</span>
                  <span className="font-medium text-[#111827]">100%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Scribe:Provider ratio</span>
                  <span className="font-medium text-[#111827]">1:{calculations.scribeRatio}</span>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <div className="flex justify-between items-end">
                  <span className="text-xs text-[#6B7280]">Annual cost</span>
                  <span className="text-xl font-bold text-[#111827]">{formatCurrency(calculations.fullScribeCost)}</span>
                </div>
                <div className="text-xs text-amber-600 font-medium text-right mt-1">
                  +{formatCurrency(calculations.costToScale)} to scale
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-[#111827] mb-3">The Math</h4>
            <div className="space-y-2 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="text-[#6B7280]">Additional providers to cover:</span>
                <span className="font-mono text-[#111827]">
                  {inputs.totalProviders} - {inputs.providersWithScribes} = {calculations.providersWithoutSupport}
                </span>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <span className="text-[#6B7280]">Additional scribes needed (at 1:{calculations.scribeRatio} ratio):</span>
                <span className="font-mono text-[#111827]">
                  {calculations.providersWithoutSupport} / {calculations.scribeRatio} = {calculations.additionalScribesNeeded}
                </span>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <span className="text-[#6B7280]">Additional annual cost:</span>
                <span className="font-mono text-[#111827]">
                  {calculations.additionalScribesNeeded} x {formatCurrency(calculations.scribeSalaryAnnual)} = {formatCurrency(calculations.costToScale)}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: The Burden on Unsupported Providers */}
        <section className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 lg:p-8 mb-6 md:mb-8">
          <h2 className="text-lg md:text-xl font-bold text-[#111827] mb-2">The Burden on Unsupported Providers</h2>
          <p className="text-xs md:text-sm text-[#6B7280] mb-4 md:mb-6">
            Your {calculations.providersWithoutSupport} providers without scribe support are handling documentation alone
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-4">
            <div className="bg-slate-50 rounded-lg p-5 text-center">
              <div className="flex justify-center mb-2">
                <Timer className="w-6 h-6 text-slate-500" />
              </div>
              <div className="text-xl font-bold text-[#111827]">
                {calculations.unsupportedDocTimeHours.toLocaleString()}
              </div>
              <div className="text-xs text-[#6B7280] mb-2">hours/year on documentation</div>
              <div className="text-[10px] text-slate-400 font-mono">
                {calculations.providersWithoutSupport} providers x {calculations.encountersPerProvider.toLocaleString()} encounters x 12 min / 60
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-5 text-center">
              <div className="flex justify-center mb-2">
                <Moon className="w-6 h-6 text-slate-500" />
              </div>
              <div className="text-xl font-bold text-[#111827]">
                {calculations.pajamaTimeHours.toLocaleString()}
              </div>
              <div className="text-xs text-[#6B7280] mb-2">hours/year after clinic hours</div>
              <div className="text-[10px] text-slate-400 font-mono">
                ~25% of documentation time occurs outside clinic hours*
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-5 text-center">
              <div className="flex justify-center mb-2">
                <BarChart3 className="w-6 h-6 text-slate-500" />
              </div>
              <div className="text-xl font-bold text-[#111827]">
                {calculations.docTimePerUnsupportedProvider}
              </div>
              <div className="text-xs text-[#6B7280] mb-2">hours/year per unsupported provider</div>
              <div className="text-[10px] text-slate-400 font-mono">
                Average documentation burden per provider
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 italic">
            * Based on industry research on physician documentation patterns
          </div>
        </section>

        {/* Section 5: What Scaling Your Scribe Program Would Cost */}
        <section className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 lg:p-8 mb-6 md:mb-8">
          <h2 className="text-lg md:text-xl font-bold text-[#111827] mb-4 md:mb-6">What Scaling Your Scribe Program Would Cost</h2>

          <div className="bg-slate-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-[#374151]">
              Scribe programs scale in <strong>steps</strong> — each new scribe adds fixed capacity. 
              The staircase pattern shows how costs jump as you cross thresholds requiring additional hires.
            </p>
          </div>

          <div className="h-64 md:h-80 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scalingData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="coverage"
                  tickFormatter={(v) => `${v}%`}
                  stroke="#6B7280"
                  fontSize={12}
                  label={{ value: "Coverage", position: "bottom", offset: 0 }}
                />
                <YAxis
                  tickFormatter={(v) => formatCurrency(v)}
                  stroke="#6B7280"
                  fontSize={12}
                  width={80}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                  labelFormatter={(v) => `${v}% coverage`}
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="scribeCost"
                  name="Scribes (linear scaling)"
                  stroke="#6B7280"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={(props: { cx: number; cy: number; payload: { currentPosition?: boolean } }) => {
                    if (props.payload.currentPosition) {
                      return (
                        <circle
                          cx={props.cx}
                          cy={props.cy}
                          r={8}
                          fill="#EA2C00"
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      );
                    }
                    return <circle r={0} />;
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-sm mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 border-t-2 border-dashed border-[#6B7280]"></div>
              <span className="text-[#6B7280]">Scribe program cost (linear scaling)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#EA2C00]"></div>
              <span className="text-[#6B7280]">Your current position: {calculations.coveragePercent}%</span>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-slate-500" />
              <h4 className="text-sm font-semibold text-[#111827]">Factors That Affect Scribe Program Costs</h4>
            </div>
            <ul className="text-sm text-[#6B7280] space-y-2">
              <li><strong className="text-[#374151]">Scribe:Provider ratio</strong> — Ranges from 1:1 to 1:3 depending on specialty and volume</li>
              <li><strong className="text-[#374151]">Scribe compensation</strong> — Varies by market, experience, and employment model</li>
              <li><strong className="text-[#374151]">Turnover</strong> — Scribe turnover averages 30-50% annually, creating ongoing training costs</li>
              <li><strong className="text-[#374151]">Coverage hours</strong> — Evening/weekend coverage requires additional scribes</li>
            </ul>
          </div>
        </section>

        {/* Section 6: Methodology */}
        <section className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 lg:p-8 mb-6 md:mb-8">
          <h2 className="text-base md:text-lg font-bold text-[#111827] mb-4">Methodology & Assumptions</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="font-medium text-[#111827] mb-2 text-sm">From Your Inputs</div>
              <ul className="text-sm text-[#6B7280] space-y-1">
                <li>Scribe count: {inputs.scribeCount}</li>
                <li>Cost per scribe: ${inputs.scribeCostPerHour}/hour x {inputs.scribeHoursPerWeek} hrs/week = {formatCurrency(calculations.scribeSalaryAnnual)}/year</li>
                <li>Providers with scribes: {inputs.providersWithScribes}</li>
                <li>Total providers: {inputs.totalProviders}</li>
                <li>Annual encounters: {inputs.annualEncounters.toLocaleString()}</li>
              </ul>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <div className="font-medium text-[#111827] mb-2 text-sm">Calculated Values</div>
              <ul className="text-sm text-[#6B7280] space-y-1">
                <li>Scribe:Provider ratio: 1:{calculations.scribeRatio} (from your inputs)</li>
                <li>Encounters per provider: {calculations.encountersPerProvider.toLocaleString()}/year</li>
              </ul>
              
              <div className="font-medium text-[#111827] mb-2 mt-4 text-sm">Industry Assumptions</div>
              <ul className="text-sm text-[#6B7280] space-y-1">
                <li>Documentation time without scribe: {SCRIBE_ASSUMPTIONS.minutesPerEncounterWithoutScribe} min/encounter</li>
                <li>After-hours documentation: ~{SCRIBE_ASSUMPTIONS.pajamaTimePercent * 100}% of total</li>
                <li>Working weeks per year: {SCRIBE_ASSUMPTIONS.weeksPerYear}</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 7: Explore Ambient AI CTA */}
        <section className="mb-6 md:mb-8 pt-6 md:pt-8 border-t border-slate-200">
          <div className="bg-gradient-to-br from-red-50 to-white border border-red-200 rounded-xl p-5 md:p-8">
            <div className="flex flex-col lg:flex-row gap-6 lg:items-center lg:justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-[#EA2C00]" />
                  <h3 className="text-lg md:text-xl font-semibold text-[#111827]">Explore Your Options</h3>
                </div>
                <p className="text-sm md:text-base text-[#6B7280] mb-4">
                  Now that you understand your scribe program economics, 
                  see what ambient AI value realization could look like 
                  for your organization.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm text-[#374151]">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>Model different coverage scenarios</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm text-[#374151]">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>Understand the four dimensions of ambient AI value</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm text-[#374151]">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>See how utilization, efficiency, quality, and satisfaction compound</span>
                  </li>
                </ul>
              </div>
              <div className="flex-shrink-0">
                <Button 
                  className="w-full lg:w-auto bg-[#EA2C00] hover:bg-[#d12700] text-white h-12 px-6 text-base font-semibold"
                  onClick={() => onExploreAmbientAI?.(inputs.totalProviders, inputs.annualEncounters)}
                  data-testid="button-explore-ambient"
                >
                  Explore Ambient AI for {inputs.totalProviders} Providers
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Section 8: Export */}
        <section className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 md:gap-4 justify-center">
            <Button 
              variant="outline" 
              className="h-11 md:h-12 px-4 md:px-6" 
              data-testid="button-export-pdf"
              onClick={handleExportPDF}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              {isExporting ? "Generating..." : "Export as PDF"}
            </Button>
            <Button variant="outline" className="h-11 md:h-12 px-4 md:px-6" data-testid="button-share">
              <Share2 className="w-4 h-4 mr-2" />
              Share with Team
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
