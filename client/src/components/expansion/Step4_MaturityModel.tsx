import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, TrendingUp, DollarSign, Calendar, Users, Zap } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
  Bar,
  Legend,
  ReferenceLine,
} from "recharts";
import type { BaselineData, ExpansionInputs, ExpansionResults } from "./expansion-types";
import { calculateExpansionResults, formatCurrency, formatROI, formatNumber, getVolumeDiscount } from "./expansion-calculations";

interface Step4Props {
  baseline: BaselineData;
  inputs: ExpansionInputs;
  onBack: () => void;
  onSave: (results: ExpansionResults) => void;
}

export function Step4_MaturityModel({
  baseline,
  inputs,
  onBack,
  onSave,
}: Step4Props) {
  const results = useMemo(
    () => calculateExpansionResults(baseline, inputs),
    [baseline, inputs]
  );

  const validatedBenefit = useMemo(() => {
    return Object.values(inputs.driverValidations || {}).reduce(
      (sum, v) => sum + (v?.adjustedValue || 0),
      0
    );
  }, [inputs.driverValidations]);

  const newProviders = inputs.targetProviders - baseline.providers;
  const discount = getVolumeDiscount(inputs.targetProviders);

  const maturityChartData = results.maturityCurve.map((point) => ({
    month: `M${point.month}`,
    providers: point.providers,
    utilization: Math.round(point.utilization * 100),
    monthlyBenefit: point.benefit,
    cumulativeBenefit: results.maturityCurve
      .slice(0, point.month)
      .reduce((sum, p) => sum + p.benefit, 0),
  }));

  const threeYearData = [
    {
      year: "Year 1",
      cost: results.year1.totalCost,
      benefit: results.year1.totalBenefit,
      net: results.year1.netGain,
      roi: results.year1.roi,
    },
    {
      year: "Year 2",
      cost: results.year2.totalCost,
      benefit: results.year2.totalBenefit,
      net: results.year2.netGain,
      roi: results.year2.roi,
    },
    {
      year: "Year 3",
      cost: results.year3.totalCost,
      benefit: results.year3.totalBenefit,
      net: results.year3.netGain,
      roi: results.year3.roi,
    },
  ];

  const handleSave = () => {
    onSave(results);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Your Expansion Model</h1>
        <p className="text-muted-foreground">
          Here's your complete 3-year projection with maturity curves and phased value realization.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-[#F03319]/20 bg-[#F03319]/5">
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 text-[#F03319] mx-auto mb-2" />
            <div className="text-2xl font-bold" data-testid="text-total-providers">
              {inputs.targetProviders}
            </div>
            <div className="text-sm text-muted-foreground">Total Providers</div>
            <Badge variant="outline" className="mt-2 text-[#0E9F6E] border-[#0E9F6E]">
              +{newProviders} new
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-[#0E9F6E]/20 bg-[#0E9F6E]/5">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-5 w-5 text-[#0E9F6E] mx-auto mb-2" />
            <div className="text-2xl font-bold text-[#0E9F6E]" data-testid="text-three-year-roi">
              {formatROI(results.threeYearTotal.roi)}
            </div>
            <div className="text-sm text-muted-foreground">3-Year ROI</div>
          </CardContent>
        </Card>

        <Card className="border-[#0E9F6E]/20 bg-[#0E9F6E]/5">
          <CardContent className="p-4 text-center">
            <DollarSign className="h-5 w-5 text-[#0E9F6E] mx-auto mb-2" />
            <div className="text-2xl font-bold text-[#0E9F6E]" data-testid="text-three-year-net">
              {formatCurrency(results.threeYearTotal.netGain)}
            </div>
            <div className="text-sm text-muted-foreground">3-Year Net Value</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
            <div className="text-2xl font-bold">
              {inputs.rolloutType === "phased" ? "12 mo" : "1 mo"}
            </div>
            <div className="text-sm text-muted-foreground">Rollout Period</div>
            {discount > 0 && (
              <Badge className="mt-2 bg-[#0E9F6E] text-white">
                {(discount * 100).toFixed(0)}% discount
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#F03319]" />
            Year 1 Maturity Curve
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Watch how value builds as new providers ramp up and reach maturity.
          </p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={maturityChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === "Utilization") return [`${value}%`, name];
                    return [formatCurrency(value), name];
                  }}
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="cumulativeBenefit"
                  name="Cumulative Benefit"
                  fill="#0E9F6E"
                  fillOpacity={0.2}
                  stroke="#0E9F6E"
                  strokeWidth={2}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="utilization"
                  name="Utilization"
                  stroke="#F03319"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-[#F03319]" />
            3-Year Financial Summary
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
                <Bar dataKey="cost" name="Investment" fill="#9CA3AF" radius={[4, 4, 0, 0]} />
                <Bar dataKey="benefit" name="Benefit" fill="#0E9F6E" radius={[4, 4, 0, 0]} />
                <ReferenceLine y={0} stroke="hsl(var(--border))" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardContent className="p-6">
          <h3 className="text-lg font-medium mb-4">Detailed Projections</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 font-medium"></th>
                  <th className="text-right py-2 font-medium">Year 1</th>
                  <th className="text-right py-2 font-medium">Year 2</th>
                  <th className="text-right py-2 font-medium">Year 3</th>
                  <th className="text-right py-2 font-medium text-[#F03319]">3-Year Total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="py-2 text-muted-foreground">Providers</td>
                  <td className="py-2 text-right">{results.year1.totalProviders}</td>
                  <td className="py-2 text-right">{results.year2.totalProviders}</td>
                  <td className="py-2 text-right">{results.year3.totalProviders}</td>
                  <td className="py-2 text-right font-medium">{inputs.targetProviders}</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 text-muted-foreground">Investment</td>
                  <td className="py-2 text-right">{formatCurrency(results.year1.totalCost)}</td>
                  <td className="py-2 text-right">{formatCurrency(results.year2.totalCost)}</td>
                  <td className="py-2 text-right">{formatCurrency(results.year3.totalCost)}</td>
                  <td className="py-2 text-right font-medium">{formatCurrency(results.threeYearTotal.totalCost)}</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 text-muted-foreground">Benefit</td>
                  <td className="py-2 text-right text-[#0E9F6E]">{formatCurrency(results.year1.totalBenefit)}</td>
                  <td className="py-2 text-right text-[#0E9F6E]">{formatCurrency(results.year2.totalBenefit)}</td>
                  <td className="py-2 text-right text-[#0E9F6E]">{formatCurrency(results.year3.totalBenefit)}</td>
                  <td className="py-2 text-right font-medium text-[#0E9F6E]">{formatCurrency(results.threeYearTotal.totalBenefit)}</td>
                </tr>
                <tr className="border-b border-border/50 bg-muted/30">
                  <td className="py-2 font-medium">Net Value</td>
                  <td className="py-2 text-right font-medium">{formatCurrency(results.year1.netGain)}</td>
                  <td className="py-2 text-right font-medium">{formatCurrency(results.year2.netGain)}</td>
                  <td className="py-2 text-right font-medium">{formatCurrency(results.year3.netGain)}</td>
                  <td className="py-2 text-right font-bold text-[#0E9F6E]">{formatCurrency(results.threeYearTotal.netGain)}</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium">ROI</td>
                  <td className="py-2 text-right">{formatROI(results.year1.roi)}</td>
                  <td className="py-2 text-right">{formatROI(results.year2.roi)}</td>
                  <td className="py-2 text-right">{formatROI(results.year3.roi)}</td>
                  <td className="py-2 text-right font-bold text-[#0E9F6E]">{formatROI(results.threeYearTotal.roi)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

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

      <Card className="bg-[#0E9F6E]/5 border-[#0E9F6E]/20">
        <CardContent className="p-4 flex items-start gap-4">
          <div className="w-10 h-10 bg-[#0E9F6E]/20 rounded-full flex items-center justify-center flex-shrink-0">
            <TrendingUp className="h-5 w-5 text-[#0E9F6E]" />
          </div>
          <div>
            <strong className="text-foreground">Your expansion creates significant incremental value.</strong>
            <p className="text-sm text-muted-foreground mt-1">
              Adding {newProviders} providers generates {formatCurrency(results.incremental.benefit)} in incremental benefit
              at an incremental investment of {formatCurrency(results.incremental.cost)}, 
              resulting in {formatROI(results.incremental.roi)} incremental ROI.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2" data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleSave} className="gap-2" data-testid="button-save-scenario">
          <Download className="h-4 w-4" />
          Save Expansion Scenario
        </Button>
      </div>
    </div>
  );
}
