import { useMemo } from "react";
import { ArrowLeft, Download, Share2, Users, DollarSign, TrendingUp, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobalHeader } from "@/components/GlobalHeader";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import {
  type ScribeInputs,
  calculateScribeGap,
  formatCurrency,
  getScalingDataPoints,
  SCRIBE_ASSUMPTIONS,
} from "@/lib/scribeGapCalculator";

interface ScribeFullAnalysisProps {
  inputs: ScribeInputs;
  onBack: () => void;
  onBackToJourney?: () => void;
}

export default function ScribeFullAnalysis({
  inputs,
  onBack,
  onBackToJourney,
}: ScribeFullAnalysisProps) {
  const calculations = useMemo(() => calculateScribeGap(inputs), [inputs]);
  const scalingData = useMemo(() => getScalingDataPoints(inputs, calculations), [inputs, calculations]);

  return (
    <div className="min-h-screen bg-slate-50">
      <GlobalHeader pageName="Scribe Program Analysis" currentStep={2} totalSteps={2} />

      <main className="pt-[88px] pb-8 px-4 md:px-8 max-w-5xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={onBack}
            className="-ml-2"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-[#111827] mb-2">
            Your Scribe Program Analysis
          </h1>
          <p className="text-[#6B7280]">
            {inputs.scribeCount} scribes · {inputs.providersWithScribes} providers covered ·{" "}
            {inputs.totalProviders} total providers
          </p>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
            <div className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mb-1">
              Current Coverage
            </div>
            <div className="text-4xl font-bold text-[#111827]">{calculations.coveragePercent}%</div>
            <div className="text-sm text-[#6B7280]">of providers have support</div>
          </div>

          <div className="bg-amber-50 rounded-xl border-2 border-amber-400 p-6 text-center">
            <div className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-1">
              Coverage Gap
            </div>
            <div className="text-4xl font-bold text-amber-700">{calculations.providersWithoutSupport}</div>
            <div className="text-sm text-amber-600">providers without support</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
            <div className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mb-1">
              Cost to Scale
            </div>
            <div className="text-4xl font-bold text-[#111827]">
              {formatCurrency(calculations.costToScale)}
            </div>
            <div className="text-sm text-[#6B7280]">to give everyone a scribe</div>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-6 md:p-8 mb-8">
          <h2 className="text-xl font-bold text-[#111827] mb-2">The Scaling Comparison</h2>
          <p className="text-sm text-[#6B7280] mb-6">Cost vs. coverage: Scribes vs. Abridge</p>

          <div className="h-80">
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
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === "scribeCost" ? "Scribes" : "Abridge",
                  ]}
                  labelFormatter={(v) => `${v}% coverage`}
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="scribeCost"
                  name="Scribes"
                  stroke="#6B7280"
                  strokeWidth={3}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="abridgeCost"
                  name="Abridge"
                  stroke="#10B981"
                  strokeWidth={3}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-500"></div>
              <span className="text-[#6B7280]">
                Your current position: {calculations.coveragePercent}% coverage
              </span>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-6 md:p-8 mb-8">
          <h2 className="text-xl font-bold text-[#111827] mb-6">Why Ambient AI Scales Differently</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 pr-4 text-[#6B7280] font-medium"></th>
                  <th className="text-center py-3 px-4 text-[#6B7280] font-medium">Scribes</th>
                  <th className="text-center py-3 px-4 text-emerald-600 font-medium">Abridge</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-3 pr-4 font-medium text-[#111827]">Cost model</td>
                  <td className="py-3 px-4 text-center text-[#6B7280]">Per-scribe (linear)</td>
                  <td className="py-3 px-4 text-center text-emerald-600">Per-provider (flat)</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-3 pr-4 font-medium text-[#111827]">Scaling</td>
                  <td className="py-3 px-4 text-center text-[#6B7280]">Hire more people</td>
                  <td className="py-3 px-4 text-center text-emerald-600">Turn on licenses</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-3 pr-4 font-medium text-[#111827]">Availability</td>
                  <td className="py-3 px-4 text-center text-[#6B7280]">Limited by staffing</td>
                  <td className="py-3 px-4 text-center text-emerald-600">24/7, every visit</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-3 pr-4 font-medium text-[#111827]">Consistency</td>
                  <td className="py-3 px-4 text-center text-[#6B7280]">Varies by scribe</td>
                  <td className="py-3 px-4 text-center text-emerald-600">AI-consistent quality</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-3 pr-4 font-medium text-[#111827]">Training</td>
                  <td className="py-3 px-4 text-center text-[#6B7280]">Ongoing investment</td>
                  <td className="py-3 px-4 text-center text-emerald-600">Continuously learning</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium text-[#111827]">Burnout risk</td>
                  <td className="py-3 px-4 text-center text-[#6B7280]">High turnover</td>
                  <td className="py-3 px-4 text-center text-emerald-600">No turnover</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-6 md:p-8 mb-8">
          <h2 className="text-xl font-bold text-[#111827] mb-6">The Hybrid Opportunity</h2>
          <p className="text-sm text-[#6B7280] mb-6">
            You don't have to choose one or the other. Many organizations use Abridge to extend
            their scribe coverage while keeping scribes for complex cases.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-50 rounded-lg p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center">
                  <Users className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <div className="font-semibold text-[#111827]">Keep Scribes For</div>
                  <div className="text-xs text-[#6B7280]">Complex, high-acuity cases</div>
                </div>
              </div>
              <ul className="text-sm text-[#6B7280] space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-slate-500" />
                  Complex surgical cases
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-slate-500" />
                  Multi-hour procedures
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-slate-500" />
                  Provider preference
                </li>
              </ul>
            </div>

            <div className="bg-emerald-50 rounded-lg p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="font-semibold text-[#111827]">Add Abridge For</div>
                  <div className="text-xs text-emerald-600">Universal coverage at scale</div>
                </div>
              </div>
              <ul className="text-sm text-emerald-700 space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  All unsupported providers
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  Evening/weekend coverage
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  Backup for scribe absences
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 md:p-8 text-white mb-8">
          <h2 className="text-xl font-bold mb-4">Your Path Forward</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white/10 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold">{calculations.providersWithoutSupport}</div>
              <div className="text-sm text-emerald-100">providers to enable</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold">{formatCurrency(calculations.abridgeValueCreated)}</div>
              <div className="text-sm text-emerald-100">potential annual value</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold">{formatCurrency(calculations.savingsVsFullScribe)}</div>
              <div className="text-sm text-emerald-100">savings vs. full scribes</div>
            </div>
          </div>

          <p className="text-emerald-100 text-sm mb-6">
            By adding Abridge for your {calculations.providersWithoutSupport} unsupported providers,
            you can achieve universal coverage at a fraction of the cost of scaling your scribe
            program.
          </p>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-6 md:p-8 mb-8">
          <h2 className="text-lg font-bold text-[#111827] mb-4">Methodology</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="font-medium text-[#111827] mb-1">Scribe Assumptions</div>
              <ul className="text-[#6B7280] space-y-1">
                <li>• {SCRIBE_ASSUMPTIONS.weeksPerYear} working weeks/year</li>
                <li>• {SCRIBE_ASSUMPTIONS.scribeToProviderRatio}:1 scribe-to-provider ratio default</li>
                <li>• {SCRIBE_ASSUMPTIONS.minutesPerEncounterWithoutScribe} min/encounter without scribe</li>
              </ul>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="font-medium text-[#111827] mb-1">Abridge Benchmarks</div>
              <ul className="text-[#6B7280] space-y-1">
                <li>• ${SCRIBE_ASSUMPTIONS.abridgeCostPerProvider.toLocaleString()}/provider/year</li>
                <li>• {SCRIBE_ASSUMPTIONS.abridgeUtilization * 100}% typical utilization</li>
                <li>• {SCRIBE_ASSUMPTIONS.abridgeTimeSavedPerEncounter} min saved per encounter</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl border-2 border-[#EA2C00] p-8">
          <div className="flex flex-wrap gap-4 justify-center">
            <Button variant="outline" className="h-12 px-6" data-testid="button-export-pdf">
              <Download className="w-4 h-4 mr-2" />
              Export as PDF
            </Button>
            <Button variant="outline" className="h-12 px-6" data-testid="button-share">
              <Share2 className="w-4 h-4 mr-2" />
              Share with Team
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
