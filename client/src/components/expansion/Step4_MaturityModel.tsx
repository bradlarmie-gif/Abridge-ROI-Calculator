import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, Download, TrendingUp, DollarSign, Zap, ChevronDown, ChevronRight, Check, AlertTriangle, Lightbulb, Target } from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Legend,
  ReferenceLine,
  Area,
  Line,
} from "recharts";
import type { BaselineData, ExpansionInputs, ExpansionResults, AccessValidation, LosValidation } from "./expansion-types";
import { calculateExpansionResults, calculateExpandedModel, formatCurrency, formatROI, getVolumeDiscount, DRIVER_MATURITY_CURVES } from "./expansion-calculations";
import { MaturityCurveViz } from "./MaturityCurveViz";
import type { LeverId } from "@/lib/roi-types";

interface Step4Props {
  baseline: BaselineData;
  inputs: ExpansionInputs;
  onBack: () => void;
  onSave: (results: ExpansionResults) => void;
}

const DRIVER_NAMES: Record<string, string> = {
  patientAccess: "Patient Access",
  workforce: "Clinician Retention",
  wrvu: "Level of Service",
  overtime: "Overtime & Locum",
  denials: "Denial Prevention",
  hcc: "HCC Capture",
};

export function Step4_MaturityModel({
  baseline,
  inputs,
  onBack,
  onSave,
}: Step4Props) {
  const [showMethodology, setShowMethodology] = useState(false);

  const results = useMemo(
    () => calculateExpansionResults(baseline, inputs),
    [baseline, inputs]
  );

  const expandedModel = useMemo(
    () => calculateExpandedModel(baseline, inputs),
    [baseline, inputs]
  );

  const newProviders = inputs.targetProviders - baseline.providers;
  const discount = getVolumeDiscount(inputs.targetProviders);

  const hasRetention = expandedModel.hasRetention;
  const hasAccess = expandedModel.hasAccess;

  const accessValidation = inputs.driverValidations?.patientAccess as AccessValidation | undefined;

  const incrementalYear1Cost = expandedModel.year1.incrementalCost;
  const incrementalYear1Benefit = expandedModel.year1.incrementalBenefit;
  const incrementalYear1NetGain = expandedModel.year1.incrementalNetGain;
  const incrementalYear1ROI = expandedModel.year1.incrementalROI;

  const incrementalYear2Cost = expandedModel.year2.incrementalCost;
  const incrementalYear2Benefit = expandedModel.year2.incrementalBenefit;
  const incrementalYear2NetGain = expandedModel.year2.incrementalNetGain;
  const incrementalYear2ROI = expandedModel.year2.incrementalROI;

  const incrementalYear3Cost = expandedModel.year3.incrementalCost;
  const incrementalYear3Benefit = expandedModel.year3.incrementalBenefit;
  const incrementalYear3NetGain = expandedModel.year3.incrementalNetGain;
  const incrementalYear3ROI = expandedModel.year3.incrementalROI;

  const totalIncrementalCost = expandedModel.threeYear.totalIncrementalCost;
  const totalIncrementalBenefit = expandedModel.threeYear.totalIncrementalBenefit;
  const totalIncrementalNetGain = expandedModel.threeYear.totalIncrementalNetGain;
  const blended3YearROI = expandedModel.threeYear.blendedROI;

  const threeYearData = [
    {
      year: "Year 1",
      investment: incrementalYear1Cost,
      benefit: incrementalYear1Benefit,
      net: incrementalYear1NetGain,
    },
    {
      year: "Year 2",
      investment: incrementalYear2Cost,
      benefit: incrementalYear2Benefit,
      net: incrementalYear2NetGain,
    },
    {
      year: "Year 3",
      investment: incrementalYear3Cost,
      benefit: incrementalYear3Benefit,
      net: incrementalYear3NetGain,
    },
  ];

  const handleSave = () => {
    onSave(results);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Target className="h-8 w-8 text-[#F03319]" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">Your 3-Year Expansion Model</h1>
        <p className="text-muted-foreground">
          From {baseline.providers} → {inputs.targetProviders} providers
          {inputs.rolloutType === "phased" && " (phased rollout)"}
        </p>
      </div>

      <Card className="bg-muted/30">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-[#F03319]" />
            <h2 className="text-lg font-medium">The Maturity Journey</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Utilization & value realization over time for your new {newProviders} providers
            {hasRetention && " (includes retention timing lag)"}
          </p>

          <MaturityCurveViz hasRetention={hasRetention} />

          {hasRetention && (
            <div className="mt-4 p-3 bg-[#0E9F6E]/10 rounded-lg border border-[#0E9F6E]/20 text-sm">
              <strong className="text-[#0E9F6E]">Retention Benefit Lag:</strong>
              <span className="text-muted-foreground ml-2">
                The green dashed line shows how Clinician Retention benefits lag behind other drivers 
                due to the 12-18 month decision cycle. Year 1 shows ~20%, Year 2 ~70%, Year 3 reaches 100%.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <YearCard
          year={1}
          title="The Ramp-Up Year"
          utilization={expandedModel.year1.avgUtilization}
          baselineCost={expandedModel.baseline.cost}
          baselineBenefit={expandedModel.baseline.benefit}
          baselineNetGain={expandedModel.baseline.netGain}
          baselineROI={expandedModel.baseline.roi}
          totalCost={expandedModel.year1.totalCost}
          totalBenefit={expandedModel.year1.totalBenefit}
          incrementalCost={incrementalYear1Cost}
          incrementalBenefit={incrementalYear1Benefit}
          incrementalROI={incrementalYear1ROI}
          insight={{
            type: "warning",
            title: "Lower Year 1 ROI is normal during ramp-up.",
            text: "New providers are onboarding, learning the system, and building adoption habits. This is expected and accounts for real-world implementation dynamics."
          }}
        />

        <YearCard
          year={2}
          title="The Maturing Year"
          utilization={expandedModel.year2.avgUtilization}
          baselineCost={expandedModel.baseline.cost}
          baselineBenefit={expandedModel.baseline.benefit}
          baselineNetGain={expandedModel.baseline.netGain}
          baselineROI={expandedModel.baseline.roi}
          totalCost={expandedModel.year2.totalCost}
          totalBenefit={expandedModel.year2.totalBenefit}
          incrementalCost={incrementalYear2Cost}
          incrementalBenefit={incrementalYear2Benefit}
          incrementalROI={incrementalYear2ROI}
          insight={{
            type: "success",
            title: "ROI improving as adoption matures.",
            text: "Providers are fully trained, utilization is ramping, and benefits are materializing. You're on track to match baseline performance."
          }}
        />

        <YearCard
          year={3}
          title="The Mature State"
          utilization={expandedModel.year3.avgUtilization}
          baselineCost={expandedModel.baseline.cost}
          baselineBenefit={expandedModel.baseline.benefit}
          baselineNetGain={expandedModel.baseline.netGain}
          baselineROI={expandedModel.baseline.roi}
          totalCost={expandedModel.year3.totalCost}
          totalBenefit={expandedModel.year3.totalBenefit}
          incrementalCost={incrementalYear3Cost}
          incrementalBenefit={incrementalYear3Benefit}
          incrementalROI={incrementalYear3ROI}
          insight={{
            type: "success",
            title: "Expansion ROI now matches baseline!",
            text: "Full maturity reached. Your new providers are delivering the same value per provider as your original deployment."
          }}
        />
      </div>

      <Card className="bg-[#0E9F6E]/5 border-[#0E9F6E]/20">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">3-Year Cumulative View</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-background rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Total Additional Investment</div>
              <div className="text-xl font-bold">{formatCurrency(totalIncrementalCost)}</div>
            </div>
            <div className="text-center p-4 bg-background rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Total Additional Benefit</div>
              <div className="text-xl font-bold text-[#0E9F6E]">{formatCurrency(totalIncrementalBenefit)}</div>
            </div>
            <div className="text-center p-4 bg-background rounded-lg border-2 border-[#0E9F6E]">
              <div className="text-sm text-muted-foreground mb-1">Total Net Value Created</div>
              <div className="text-2xl font-bold text-[#0E9F6E]">
                {formatCurrency(totalIncrementalNetGain)}
              </div>
            </div>
            <div className="text-center p-4 bg-background rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Blended 3-Year ROI</div>
              <div className="text-xl font-bold">{formatROI(blended3YearROI)}</div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              Key Insights
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-start gap-2 p-3 bg-background rounded-lg">
                <Check className="h-4 w-4 text-[#0E9F6E] mt-0.5" />
                <span className="text-sm">Year 1 ROI ({formatROI(incrementalYear1ROI)}) reflects ramp-up reality</span>
              </div>
              <div className="flex items-start gap-2 p-3 bg-background rounded-lg">
                <Check className="h-4 w-4 text-[#0E9F6E] mt-0.5" />
                <span className="text-sm">By Year 3, expansion achieves {formatROI(incrementalYear3ROI)} ROI</span>
              </div>
              {inputs.rolloutType === "phased" && (
                <div className="flex items-start gap-2 p-3 bg-background rounded-lg">
                  <Check className="h-4 w-4 text-[#0E9F6E] mt-0.5" />
                  <span className="text-sm">Phased rollout reduces risk and spreads investment</span>
                </div>
              )}
              {hasRetention && (
                <div className="flex items-start gap-2 p-3 bg-background rounded-lg">
                  <Check className="h-4 w-4 text-[#0E9F6E] mt-0.5" />
                  <span className="text-sm">Retention benefits lag 12-18 months (accounted for)</span>
                </div>
              )}
              {hasAccess && accessValidation?.hasCapacity && (
                <div className="flex items-start gap-2 p-3 bg-background rounded-lg">
                  <Check className="h-4 w-4 text-[#0E9F6E] mt-0.5" />
                  <span className="text-sm">Patient Access validated for capacity constraints</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-[#F03319]" />
            3-Year Comparison
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={threeYearData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="year"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar dataKey="investment" name="Investment" fill="#9CA3AF" radius={[4, 4, 0, 0]} />
                <Bar dataKey="benefit" name="Benefit" fill="#0E9F6E" radius={[4, 4, 0, 0]} />
                <ReferenceLine y={0} stroke="hsl(var(--border))" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Collapsible open={showMethodology} onOpenChange={setShowMethodology}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between" data-testid="button-toggle-methodology">
            <span className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              View Detailed Calculation Methodology
            </span>
            {showMethodology ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-4">
            <CardContent className="p-6 space-y-6">
              <h4 className="font-semibold">How We Calculated Your Expansion Model</h4>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <h5 className="font-medium text-[#F03319]">Maturity Curve Application</h5>
                  <p className="text-sm text-muted-foreground">
                    We applied a research-backed maturity curve based on 200+ health system deployments:
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc ml-4 space-y-1">
                    <li><strong>Months 1-3:</strong> 45% utilization - Initial adoption phase</li>
                    <li><strong>Months 4-6:</strong> 55% utilization - Building momentum</li>
                    <li><strong>Months 7-12:</strong> 70% utilization - Active adoption</li>
                    <li><strong>Year 2:</strong> 80% utilization - Maturing</li>
                    <li><strong>Year 3:</strong> 85% utilization - Mature state</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h5 className="font-medium text-[#F03319]">Rollout Strategy</h5>
                  <div className="p-3 bg-muted rounded-lg text-sm">
                    {inputs.rolloutType === "phased" ? (
                      <div className="space-y-2">
                        <strong>Phased Rollout (3 Waves)</strong>
                        <ul className="text-muted-foreground list-disc ml-4 space-y-1">
                          <li>Wave 1 (Month 1): {inputs.phasedPlan.wave1.providers} providers</li>
                          <li>Wave 2 (Month {inputs.phasedPlan.wave2.month}): {inputs.phasedPlan.wave2.providers} providers</li>
                          <li>Wave 3 (Month {inputs.phasedPlan.wave3.month}): {inputs.phasedPlan.wave3.providers} providers</li>
                        </ul>
                        <p className="text-muted-foreground mt-2">
                          Each wave follows its own maturity curve, reducing implementation risk.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <strong>All-at-Once Rollout</strong>
                        <p className="text-muted-foreground mt-1">
                          All {newProviders} new providers go live in Month 1 and follow a single maturity curve.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {hasRetention && (
                  <div className="space-y-2">
                    <h5 className="font-medium text-[#F03319]">Retention Timing Lag</h5>
                    <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                      Clinician Retention benefits follow a special curve accounting for the 12-18 month decision cycle:
                      <ul className="list-disc ml-4 mt-2 space-y-1">
                        <li>Year 1: ~20% of full retention value</li>
                        <li>Year 2: ~70% of full retention value</li>
                        <li>Year 3: 100% of full retention value</li>
                      </ul>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h5 className="font-medium text-[#F03319]">Investment Calculation</h5>
                  <div className="p-3 bg-muted rounded-lg text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <span className="text-muted-foreground">New providers:</span>
                      <span className="font-medium">{newProviders}</span>
                      <span className="text-muted-foreground">Cost per provider/month:</span>
                      <span className="font-medium">{formatCurrency(baseline.costPerProviderMonth)}</span>
                      <span className="text-muted-foreground">Pricing model:</span>
                      <span className="font-medium">{inputs.pricingModel === "enterprise" ? "Enterprise Agreement" : "Per-Provider"}</span>
                      {discount > 0 && (
                        <>
                          <span className="text-muted-foreground">Volume discount:</span>
                          <span className="font-medium text-[#0E9F6E]">{(discount * 100).toFixed(0)}%</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {inputs.rolloutType === "phased" && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-[#F03319]" />
              Phased Rollout Timeline
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-[#F03319]/5 rounded-lg border border-[#F03319]/20">
                <div className="text-sm text-muted-foreground">Wave 1 (Months 1-3)</div>
                <div className="text-xl font-bold">{inputs.phasedPlan.wave1.providers} providers</div>
                <div className="text-sm text-[#0E9F6E]">Ramping to 45% utilization</div>
              </div>
              <div className="p-4 bg-[#F03319]/5 rounded-lg border border-[#F03319]/20">
                <div className="text-sm text-muted-foreground">Wave 2 (Months 4-6)</div>
                <div className="text-xl font-bold">{inputs.phasedPlan.wave2.providers} providers</div>
                <div className="text-sm text-[#0E9F6E]">W1 @ 55%, W2 ramping</div>
              </div>
              <div className="p-4 bg-[#F03319]/5 rounded-lg border border-[#F03319]/20">
                <div className="text-sm text-muted-foreground">Wave 3 (Months 7-12)</div>
                <div className="text-xl font-bold">{inputs.phasedPlan.wave3.providers} providers</div>
                <div className="text-sm text-[#0E9F6E]">All waves maturing</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2" data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
          Back to Edit
        </Button>
        <Button onClick={handleSave} className="gap-2 bg-[#F03319] hover:bg-[#F03319]/90" data-testid="button-save-scenario">
          <Download className="h-4 w-4" />
          Save Expansion Scenario
        </Button>
      </div>
    </div>
  );
}

interface YearCardProps {
  year: number;
  title: string;
  utilization: number;
  baselineCost: number;
  baselineBenefit: number;
  baselineNetGain: number;
  baselineROI: number;
  totalCost: number;
  totalBenefit: number;
  incrementalCost: number;
  incrementalBenefit: number;
  incrementalROI: number;
  insight: {
    type: "warning" | "success";
    title: string;
    text: string;
  };
}

function YearCard({
  year,
  title,
  utilization,
  baselineCost,
  baselineBenefit,
  baselineNetGain,
  baselineROI,
  totalCost,
  totalBenefit,
  incrementalCost,
  incrementalBenefit,
  incrementalROI,
  insight,
}: YearCardProps) {
  const totalNetGain = totalBenefit - totalCost;
  const totalROI = totalCost > 0 ? totalBenefit / totalCost : 0;
  const incrementalNetGain = incrementalBenefit - incrementalCost;

  const yearBadgeColors = {
    1: "bg-yellow-500",
    2: "bg-[#F03319]",
    3: "bg-[#0E9F6E]",
  };

  const yearCardClasses = {
    1: "year-card-1",
    2: "year-card-2",
    3: "year-card-3",
  };

  return (
    <Card className={yearCardClasses[year as keyof typeof yearCardClasses]} data-testid={`year-${year}-card`}>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Badge className={`${yearBadgeColors[year as keyof typeof yearBadgeColors]} text-white`}>
              Year {year}
            </Badge>
            <span className="font-medium">{title}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Avg Utilization: {Math.round(utilization * 100)}%
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2"></th>
                <th className="text-right py-2 text-muted-foreground">Current</th>
                <th className="text-right py-2 font-medium">Expanded</th>
                <th className="text-right py-2 text-[#0E9F6E]">Incremental</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground">Investment</td>
                <td className="py-2 text-right">{formatCurrency(baselineCost)}</td>
                <td className="py-2 text-right font-medium">{formatCurrency(totalCost)}</td>
                <td className="py-2 text-right">{formatCurrency(incrementalCost)}</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 text-muted-foreground">Benefit</td>
                <td className="py-2 text-right">{formatCurrency(baselineBenefit)}</td>
                <td className="py-2 text-right font-medium">{formatCurrency(totalBenefit)}</td>
                <td className="py-2 text-right text-[#0E9F6E]">+{formatCurrency(incrementalBenefit)}</td>
              </tr>
              <tr className="border-b border-border/50 bg-muted/30">
                <td className="py-2 font-medium">Net Gain</td>
                <td className="py-2 text-right">{formatCurrency(baselineNetGain)}</td>
                <td className="py-2 text-right font-medium">{formatCurrency(totalNetGain)}</td>
                <td className="py-2 text-right text-[#0E9F6E] font-medium">
                  {incrementalNetGain >= 0 ? "+" : ""}{formatCurrency(incrementalNetGain)}
                  {incrementalNetGain > 0 && <Check className="inline h-3 w-3 ml-1" />}
                </td>
              </tr>
              <tr>
                <td className="py-2 font-medium">ROI</td>
                <td className="py-2 text-right">{formatROI(baselineROI)}</td>
                <td className="py-2 text-right font-medium">{formatROI(totalROI)}</td>
                <td className="py-2 text-right">{formatROI(incrementalROI)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className={`flex items-start gap-3 p-3 rounded-lg ${
          insight.type === "warning" 
            ? "insight-warning" 
            : "insight-success"
        }`}>
          {insight.type === "warning" ? (
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
          ) : (
            <Check className="h-4 w-4 text-[#0E9F6E] mt-0.5 flex-shrink-0" />
          )}
          <div>
            <strong className={`text-sm ${insight.type === "warning" ? "text-yellow-700 dark:text-yellow-400" : "text-[#0E9F6E]"}`}>
              {insight.title}
            </strong>
            <p className="text-xs text-muted-foreground mt-0.5">{insight.text}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
