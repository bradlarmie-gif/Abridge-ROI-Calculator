import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, AlertTriangle, TrendingUp, Clock, DollarSign, Target, Zap, CheckCircle } from "lucide-react";

interface CompetitorData {
  name: string;
  costPerProvider: number;
  utilization: number;
  minutesSaved: number;
  patientAccessVisits: number;
  losWrvus: number;
  overtimeHours: number;
}

interface AbridgeData {
  costPerProvider: number;
  utilization: number;
  minutesSaved: number;
  patientAccessVisits: number;
  losWrvus: number;
  overtimeHours: number;
}

interface Props {
  providers: number;
  encounters: number;
  competitor: CompetitorData;
  abridge: AbridgeData;
  revenuePerVisit?: number;
  wrvuRate?: number;
  hourlyRate?: number;
  onSave?: () => void;
}

const formatCurrency = (value: number): string => {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
};

export function CompetitorComparison({
  providers,
  encounters,
  competitor,
  abridge,
  revenuePerVisit = 200,
  wrvuRate = 40,
  hourlyRate = 145,
  onSave,
}: Props) {
  const [showMaturityCurve, setShowMaturityCurve] = useState(false);

  const compAnnualCost = competitor.costPerProvider * providers * 12;
  const abridgeAnnualCost = abridge.costPerProvider * providers * 12;
  const costSavings = compAnnualCost - abridgeAnnualCost;

  const compPatientAccessValue = competitor.patientAccessVisits * providers * revenuePerVisit;
  const abridgePatientAccessValue = abridge.patientAccessVisits * providers * revenuePerVisit;
  const patientAccessDelta = abridgePatientAccessValue - compPatientAccessValue;

  const compLosValue = competitor.losWrvus * providers * wrvuRate;
  const abridgeLosValue = abridge.losWrvus * providers * wrvuRate;
  const losDelta = abridgeLosValue - compLosValue;

  const compOvertimeValue = competitor.overtimeHours * providers * hourlyRate;
  const abridgeOvertimeValue = abridge.overtimeHours * providers * hourlyRate;
  const overtimeDelta = abridgeOvertimeValue - compOvertimeValue;

  const compTotalValue = compPatientAccessValue + compLosValue + compOvertimeValue;
  const abridgeTotalValue = abridgePatientAccessValue + abridgeLosValue + abridgeOvertimeValue;

  const compNetGain = compTotalValue - compAnnualCost;
  const abridgeNetGain = abridgeTotalValue - abridgeAnnualCost;

  const compRoi = compAnnualCost > 0 ? compTotalValue / compAnnualCost : 0;
  const abridgeRoi = abridgeAnnualCost > 0 ? abridgeTotalValue / abridgeAnnualCost : 0;

  const switchingOpportunity = abridgeNetGain - compNetGain;

  const maturityMultipliers = { year1: 0.4, year2: 0.7, year3: 0.85 };

  const getYearData = (multiplier: number) => {
    const yearPatientAccess = abridgePatientAccessValue * multiplier;
    const yearLos = abridgeLosValue * multiplier;
    const yearOvertime = abridgeOvertimeValue * multiplier;
    const yearValue = yearPatientAccess + yearLos + yearOvertime;
    const yearNetGain = yearValue - abridgeAnnualCost;
    const yearRoi = abridgeAnnualCost > 0 ? yearValue / abridgeAnnualCost : 0;
    return { value: yearValue, netGain: yearNetGain, roi: yearRoi };
  };

  const year1 = getYearData(maturityMultipliers.year1);
  const year2 = getYearData(maturityMultipliers.year2);
  const year3 = getYearData(maturityMultipliers.year3);

  const threeYearAbridgeValue = year1.value + year2.value + year3.value;
  const threeYearAbridgeInvestment = abridgeAnnualCost * 3;
  const threeYearAbridgeNet = threeYearAbridgeValue - threeYearAbridgeInvestment;

  const threeYearCompValue = compTotalValue * 3;
  const threeYearCompInvestment = compAnnualCost * 3;
  const threeYearCompNet = threeYearCompValue - threeYearCompInvestment;

  const threeYearAdvantage = threeYearAbridgeNet - threeYearCompNet;

  return (
    <div data-testid="competitor-comparison">
      {/* SECTION 1: Split-Screen Comparison */}
      <div className="relative grid grid-cols-2">
        {/* Vertical Divider */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[#e5e7eb] -translate-x-1/2" />
        
        {/* VS Badge */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10" data-testid="badge-vs">
          <div className="w-10 h-10 rounded-full bg-white border border-[#e5e7eb] flex items-center justify-center">
            <span className="text-[12px] font-bold text-[#6b7280]">VS</span>
          </div>
        </div>

        {/* Competitor Column */}
        <div className="bg-[#f9fafb] py-6 px-6" data-testid="column-competitor">
          <div className="text-[12px] uppercase tracking-[1px] text-[#6b7280] font-semibold" data-testid="text-competitor-name">
            {competitor.name}
          </div>
          <div className="text-[16px] font-bold text-[#374151] mb-6" data-testid="header-what-you-get">What You Get</div>

          <div className="flex items-center gap-2 text-[#6b7280] text-[11px] uppercase tracking-wide mb-1">
            <DollarSign className="h-3 w-3" /> Investment
          </div>
          <div className="text-[24px] font-bold text-[#374151] font-mono" data-testid="value-comp-investment">{formatCurrency(compAnnualCost)}/yr</div>
          <div className="text-[12px] text-[#9ca3af] mb-4">${competitor.costPerProvider}/provider/mo</div>

          <div className="flex items-center gap-2 text-[#6b7280] text-[11px] uppercase tracking-wide mb-1">
            <Target className="h-3 w-3" /> Utilization
          </div>
          <div className="text-[24px] font-bold text-[#374151] font-mono" data-testid="value-comp-utilization">{competitor.utilization}%</div>
          <div className="h-1.5 w-full bg-[#e5e7eb] rounded-full mt-1 mb-4">
            <div className="h-full bg-[#9ca3af] rounded-full" style={{ width: `${competitor.utilization}%` }} />
          </div>

          <div className="flex items-center gap-2 text-[#6b7280] text-[11px] uppercase tracking-wide mb-1">
            <Clock className="h-3 w-3" /> Time Saved
          </div>
          <div className="text-[24px] font-bold text-[#374151] font-mono" data-testid="value-comp-time">{competitor.minutesSaved} min</div>
          <div className="text-[12px] text-[#9ca3af] mb-4">per encounter</div>

          <div className="h-px bg-[#e5e7eb] my-4" />

          <div className="flex items-center gap-2 text-[#6b7280] text-[11px] uppercase tracking-wide mb-3">
            <Zap className="h-3 w-3" /> Value You Get
          </div>

          <div className="text-[12px] text-[#6b7280]">Patient Access · {competitor.patientAccessVisits} visits/prov</div>
          <div className="text-[18px] font-bold text-[#374151] font-mono mb-2" data-testid="value-comp-patient-access">{formatCurrency(compPatientAccessValue)}</div>

          <div className="text-[12px] text-[#6b7280]">Level of Service · {competitor.losWrvus} wRVUs/prov</div>
          <div className="text-[18px] font-bold text-[#374151] font-mono mb-2" data-testid="value-comp-los">{formatCurrency(compLosValue)}</div>

          <div className="text-[12px] text-[#6b7280]">Overtime · {competitor.overtimeHours > 0 ? `${competitor.overtimeHours} hrs/prov` : "Not tracking"}</div>
          <div className="text-[18px] font-bold text-[#374151] font-mono mb-4" data-testid="value-comp-overtime">{formatCurrency(compOvertimeValue)}</div>

          <div className="h-px bg-[#e5e7eb] my-4" />

          <div className="flex justify-between text-[13px] mb-1">
            <span className="text-[#6b7280]">Total Value</span>
            <span className="font-bold text-[#374151] font-mono" data-testid="value-comp-total">{formatCurrency(compTotalValue)}</span>
          </div>
          <div className="flex justify-between text-[13px] mb-1">
            <span className="text-[#6b7280]">Net Gain</span>
            <span className="font-bold text-[#374151] font-mono" data-testid="value-comp-net">{formatCurrency(compNetGain)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[13px] text-[#6b7280]">ROI</span>
            <span className="text-[20px] font-black text-[#374151] font-mono" data-testid="value-comp-roi">{compRoi.toFixed(1)}x</span>
          </div>
        </div>

        {/* Abridge Column */}
        <div className="bg-gradient-to-br from-[#ecfdf5] to-[#f0fdf4] py-6 px-6" data-testid="column-abridge">
          <div className="text-[12px] uppercase tracking-[1px] text-[#059669] font-semibold">Abridge</div>
          <div className="text-[16px] font-bold text-[#065f46] mb-6" data-testid="header-what-youd-get">What You'd Get</div>

          <div className="flex items-center gap-2 text-[#059669] text-[11px] uppercase tracking-wide mb-1">
            <DollarSign className="h-3 w-3" /> Investment
          </div>
          <div className="text-[24px] font-bold text-[#065f46] font-mono" data-testid="value-abridge-investment">{formatCurrency(abridgeAnnualCost)}/yr</div>
          <div className="text-[12px] text-[#047857]">${abridge.costPerProvider}/provider/mo</div>
          {costSavings > 0 && <div className="text-[12px] font-semibold text-[#059669]" data-testid="delta-cost-savings">✓ Save {formatCurrency(costSavings)}/yr</div>}
          <div className="mb-4" />

          <div className="flex items-center gap-2 text-[#059669] text-[11px] uppercase tracking-wide mb-1">
            <Target className="h-3 w-3" /> Utilization
          </div>
          <div className="text-[24px] font-bold text-[#065f46] font-mono" data-testid="value-abridge-utilization">{abridge.utilization}%</div>
          <div className="h-1.5 w-full bg-[#d1fae5] rounded-full mt-1">
            <div className="h-full bg-[#10b981] rounded-full" style={{ width: `${abridge.utilization}%` }} />
          </div>
          <div className="text-[12px] font-semibold text-[#059669] mb-4" data-testid="delta-utilization">↑ {(abridge.utilization / competitor.utilization).toFixed(1)}x adoption</div>

          <div className="flex items-center gap-2 text-[#059669] text-[11px] uppercase tracking-wide mb-1">
            <Clock className="h-3 w-3" /> Time Saved
          </div>
          <div className="text-[24px] font-bold text-[#065f46] font-mono" data-testid="value-abridge-time">{abridge.minutesSaved} min</div>
          <div className="text-[12px] text-[#047857]">per encounter</div>
          <div className="text-[12px] font-semibold text-[#059669] mb-4" data-testid="delta-time">↑ +{Math.round(((abridge.minutesSaved - competitor.minutesSaved) / competitor.minutesSaved) * 100)}% more</div>

          <div className="h-px bg-[#d1fae5] my-4" />

          <div className="flex items-center gap-2 text-[#059669] text-[11px] uppercase tracking-wide mb-3">
            <Zap className="h-3 w-3" /> Value You'd Get
          </div>

          <div className="text-[12px] text-[#047857]">Patient Access · {abridge.patientAccessVisits} visits/prov</div>
          <div className="flex items-center gap-2">
            <span className="text-[18px] font-bold text-[#065f46] font-mono" data-testid="value-abridge-patient-access">{formatCurrency(abridgePatientAccessValue)}</span>
            <span className="text-[12px] font-bold text-[#059669]" data-testid="delta-patient-access">↑ +{formatCurrency(patientAccessDelta)}</span>
          </div>
          <div className="mb-2" />

          <div className="text-[12px] text-[#047857]">Level of Service · {abridge.losWrvus} wRVUs/prov</div>
          <div className="flex items-center gap-2">
            <span className="text-[18px] font-bold text-[#065f46] font-mono" data-testid="value-abridge-los">{formatCurrency(abridgeLosValue)}</span>
            <span className="text-[12px] font-bold text-[#059669]" data-testid="delta-los">↑ +{formatCurrency(losDelta)}</span>
          </div>
          <div className="mb-2" />

          <div className="text-[12px] text-[#047857]">Overtime · {abridge.overtimeHours} hrs/prov</div>
          <div className="flex items-center gap-2">
            <span className="text-[18px] font-bold text-[#065f46] font-mono" data-testid="value-abridge-overtime">{formatCurrency(abridgeOvertimeValue)}</span>
            <span className="text-[12px] font-bold text-[#059669]" data-testid="delta-overtime">↑ +{formatCurrency(overtimeDelta)}</span>
          </div>
          <div className="mb-4" />

          <div className="h-px bg-[#d1fae5] my-4" />

          <div className="flex justify-between text-[13px] mb-1">
            <span className="text-[#047857]">Total Value</span>
            <span className="font-bold text-[#065f46] font-mono" data-testid="value-abridge-total">{formatCurrency(abridgeTotalValue)}</span>
          </div>
          <div className="flex justify-between text-[13px] mb-1">
            <span className="text-[#047857]">Net Gain</span>
            <span className="font-bold text-[#065f46] font-mono" data-testid="value-abridge-net">{formatCurrency(abridgeNetGain)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[13px] text-[#047857]">ROI</span>
            <span className="text-[20px] font-black text-[#065f46] font-mono" data-testid="value-abridge-roi">{abridgeRoi.toFixed(1)}x</span>
          </div>
        </div>
      </div>

      {/* Punchline */}
      <div className="bg-gradient-to-br from-[#d1fae5] via-[#ecfdf5] to-[#d1fae5] py-10 text-center" data-testid="section-punchline">
        <div className="text-[12px] uppercase tracking-[1px] text-[#059669] font-semibold mb-1">The Switching Opportunity</div>
        <div className="text-[48px] md:text-[64px] font-black text-[#065f46] font-mono leading-none" style={{ fontVariantNumeric: "tabular-nums" }} data-testid="value-switching-opportunity">
          +{formatCurrency(switchingOpportunity)}/year
        </div>
        <div className="text-[14px] text-[#047857] mt-2">
          By switching {providers} providers from {competitor.name} to Abridge
        </div>
      </div>

      {/* Warning */}
      {!showMaturityCurve && (
        <div className="bg-[#fef3c7] border-y border-[#f59e0b] py-4 text-center" data-testid="section-warning">
          <div className="flex items-center justify-center gap-2 text-[#92400e] mb-1">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-[12px] font-bold uppercase tracking-wide">But Wait...</span>
          </div>
          <p className="text-[14px] text-[#78350f] mb-3">
            This assumes mature performance immediately. <strong>Reality: 18-24 months.</strong>
          </p>
          <Button onClick={() => setShowMaturityCurve(true)} variant="default" data-testid="button-show-realistic-path">
            Show Me the Realistic Path <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}

      {/* SECTION 2: Maturity Curve */}
      {showMaturityCurve && (
        <>
          <div className="text-center py-6 border-b border-[#e5e7eb]" data-testid="section-maturity-header">
            <div className="text-[12px] uppercase tracking-[1px] text-[#6b7280] font-semibold mb-1">
              The Realistic Path to {formatCurrency(switchingOpportunity)}
            </div>
            <p className="text-[14px] text-[#6b7280]">Value doesn't happen overnight. Here's the journey:</p>
          </div>

          {/* Year 1 */}
          <div className="border-l-4 border-[#f59e0b] bg-[#fef3c7] py-4 pl-4 pr-6" data-testid="section-year1">
            <div className="text-[16px] font-black text-[#92400e] mb-2">YEAR 1: THE RAMP-UP</div>
            <div className="text-[13px] text-[#78350f] mb-3">
              Onboarding (Mo 1-3) → Building habits (Mo 4-8) → Early adopters succeeding (Mo 9-12)
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[12px] text-[#78350f]">Utilization: 40%</span>
              <div className="flex-1 h-1.5 bg-[#fde68a] rounded-full">
                <div className="h-full bg-[#f59e0b] rounded-full" style={{ width: "40%" }} />
              </div>
            </div>
            <div className="flex gap-6 text-[13px]">
              <div><span className="text-[#78350f]">Investment:</span> <span className="font-bold text-[#92400e] font-mono" data-testid="value-year1-investment">-{formatCurrency(abridgeAnnualCost)}</span></div>
              <div><span className="text-[#78350f]">Value:</span> <span className="font-bold text-[#059669] font-mono" data-testid="value-year1-value">+{formatCurrency(year1.value)}</span></div>
              <div><span className="text-[#78350f]">Net:</span> <span className="font-bold text-[#059669] font-mono" data-testid="value-year1-net">+{formatCurrency(year1.netGain)}</span></div>
              <div><span className="text-[#78350f]">ROI:</span> <span className="font-bold text-[#92400e] font-mono" data-testid="value-year1-roi">{year1.roi.toFixed(1)}x</span></div>
            </div>
            <div className="mt-2 text-[12px] text-[#78350f] flex items-center gap-1">
              <Zap className="h-3 w-3 text-[#f59e0b]" /> Still better than {competitor.name}'s {compRoi.toFixed(1)}x ROI
            </div>
          </div>

          {/* Year 2 */}
          <div className="border-l-4 border-[#3b82f6] bg-[#dbeafe] py-4 pl-4 pr-6" data-testid="section-year2">
            <div className="text-[16px] font-black text-[#1e40af] mb-2">YEAR 2: THE ACCELERATION</div>
            <div className="text-[13px] text-[#1e3a8a] mb-3">
              Utilization climbing (65%+) → Workflows optimized → Retention benefits materializing
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[12px] text-[#1e3a8a]">Utilization: 70%</span>
              <div className="flex-1 h-1.5 bg-[#bfdbfe] rounded-full">
                <div className="h-full bg-[#3b82f6] rounded-full" style={{ width: "70%" }} />
              </div>
            </div>
            <div className="flex gap-6 text-[13px]">
              <div><span className="text-[#1e3a8a]">Investment:</span> <span className="font-bold text-[#1e40af] font-mono" data-testid="value-year2-investment">-{formatCurrency(abridgeAnnualCost)}</span></div>
              <div><span className="text-[#1e3a8a]">Value:</span> <span className="font-bold text-[#059669] font-mono" data-testid="value-year2-value">+{formatCurrency(year2.value)}</span></div>
              <div><span className="text-[#1e3a8a]">Net:</span> <span className="font-bold text-[#059669] font-mono" data-testid="value-year2-net">+{formatCurrency(year2.netGain)}</span></div>
              <div><span className="text-[#1e3a8a]">ROI:</span> <span className="font-bold text-[#1e40af] font-mono" data-testid="value-year2-roi">{year2.roi.toFixed(1)}x</span></div>
            </div>
            <div className="mt-2 text-[12px] text-[#1e3a8a] flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-[#3b82f6]" /> ROI now {(year2.roi / compRoi).toFixed(0)}x better than {competitor.name}
            </div>
          </div>

          {/* Year 3 */}
          <div className="border-l-4 border-[#10b981] bg-[#d1fae5] py-4 pl-4 pr-6" data-testid="section-year3">
            <div className="text-[16px] font-black text-[#065f46] mb-2">YEAR 3: THE PAYOFF</div>
            <div className="text-[13px] text-[#047857] mb-3">
              Near-mature (85%) → Documentation quality driving max value → Full workforce benefits
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[12px] text-[#047857]">Utilization: 85%</span>
              <div className="flex-1 h-1.5 bg-[#a7f3d0] rounded-full">
                <div className="h-full bg-[#10b981] rounded-full" style={{ width: "85%" }} />
              </div>
            </div>
            <div className="flex gap-6 text-[13px]">
              <div><span className="text-[#047857]">Investment:</span> <span className="font-bold text-[#065f46] font-mono" data-testid="value-year3-investment">-{formatCurrency(abridgeAnnualCost)}</span></div>
              <div><span className="text-[#047857]">Value:</span> <span className="font-bold text-[#059669] font-mono" data-testid="value-year3-value">+{formatCurrency(year3.value)}</span></div>
              <div><span className="text-[#047857]">Net:</span> <span className="font-bold text-[#059669] font-mono" data-testid="value-year3-net">+{formatCurrency(year3.netGain)}</span></div>
              <div><span className="text-[#047857]">ROI:</span> <span className="font-bold text-[#065f46] font-mono" data-testid="value-year3-roi">{year3.roi.toFixed(1)}x</span></div>
            </div>
            <div className="mt-2 text-[12px] text-[#047857] flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-[#10b981]" /> Year 3+ delivers {formatCurrency(year3.netGain)}+ more forever
            </div>
          </div>

          {/* 3-Year Summary */}
          <div className="bg-gradient-to-br from-[#ecfdf5] to-[#d1fae5] py-8 text-center border-y-2 border-[#10b981]" data-testid="section-3year-summary">
            <div className="text-[12px] uppercase tracking-[1px] text-[#059669] font-semibold mb-1">3-Year Cumulative Advantage</div>
            <div className="text-[48px] md:text-[56px] font-black text-[#065f46] font-mono leading-none" style={{ fontVariantNumeric: "tabular-nums" }} data-testid="value-3year-advantage">
              +{formatCurrency(threeYearAdvantage)}
            </div>
            <div className="text-[14px] text-[#047857] mt-1">more over 3 years vs. staying with {competitor.name}</div>
          </div>

          {/* SECTION 3: Key Insights */}
          <div className="py-6 border-b border-[#e5e7eb]" data-testid="section-insights">
            <div className="text-[12px] uppercase tracking-[1px] text-[#6b7280] font-semibold mb-4 text-center">Key Insights</div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 max-w-3xl mx-auto px-6">
              <div className="flex items-start gap-2" data-testid="insight-year1-beats">
                <CheckCircle className="h-4 w-4 text-[#059669] shrink-0 mt-0.5" />
                <span className="text-[13px] text-[#374151]"><strong>Even Year 1 beats {competitor.name}</strong> — {year1.roi.toFixed(1)}x vs {compRoi.toFixed(1)}x ROI</span>
              </div>
              <div className="flex items-start gap-2" data-testid="insight-breakeven">
                <TrendingUp className="h-4 w-4 text-[#059669] shrink-0 mt-0.5" />
                <span className="text-[13px] text-[#374151]"><strong>Break-even at Month 18</strong> — Cumulative value exceeds competitor</span>
              </div>
              <div className="flex items-start gap-2" data-testid="insight-year3-payoff">
                <Zap className="h-4 w-4 text-[#059669] shrink-0 mt-0.5" />
                <span className="text-[13px] text-[#374151]"><strong>Year 3+ delivers {formatCurrency(year3.netGain)}+ more</strong> — Compounds every year</span>
              </div>
              <div className="flex items-start gap-2" data-testid="insight-ramp-payoff">
                <Target className="h-4 w-4 text-[#059669] shrink-0 mt-0.5" />
                <span className="text-[13px] text-[#374151]"><strong>Ramp is real, payoff is massive</strong> — Realistic expectations, exceptional outcomes</span>
              </div>
            </div>
          </div>

          {/* Save */}
          {onSave && (
            <div className="py-4 text-center border-b border-[#e5e7eb]">
              <Button onClick={onSave} variant="default" data-testid="button-save-comparison">
                Save This Comparison
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default CompetitorComparison;
