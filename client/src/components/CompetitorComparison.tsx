import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowUp, AlertTriangle, TrendingUp, Clock, DollarSign, Target, Zap, CheckCircle, Check, Minus } from "lucide-react";

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
      {/* Split-Screen Comparison */}
      <div className="relative grid grid-cols-2">
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[#e5e7eb] -translate-x-1/2" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10" data-testid="badge-vs">
          <div className="w-10 h-10 rounded-full bg-white border border-[#e5e7eb] flex items-center justify-center">
            <span className="text-[12px] font-bold text-[#6b7280]">VS</span>
          </div>
        </div>

        {/* Competitor */}
        <div className="bg-[#f9fafb] py-4 px-4" data-testid="column-competitor">
          <div className="text-[12px] uppercase tracking-[1px] text-[#6b7280] font-semibold" data-testid="text-competitor-name">{competitor.name}</div>
          <div className="text-[16px] font-bold text-[#374151] mb-4" data-testid="header-what-you-get">What You Get</div>
          <div className="flex items-center gap-2 text-[#6b7280] text-[11px] uppercase tracking-wide mb-1" data-testid="label-comp-investment"><DollarSign className="h-3 w-3" /> Investment</div>
          <div className="text-[24px] font-bold text-[#374151] font-mono" data-testid="value-comp-investment">{formatCurrency(compAnnualCost)}/yr</div>
          <div className="text-[12px] text-[#9ca3af] mb-3">${competitor.costPerProvider}/provider/mo</div>
          <div className="flex items-center gap-2 text-[#6b7280] text-[11px] uppercase tracking-wide mb-1" data-testid="label-comp-utilization"><Target className="h-3 w-3" /> Utilization</div>
          <div className="text-[24px] font-bold text-[#374151] font-mono" data-testid="value-comp-utilization">{competitor.utilization}%</div>
          <div className="h-1.5 w-full bg-[#e5e7eb] rounded-full mt-1 mb-3"><div className="h-full bg-[#9ca3af] rounded-full" style={{ width: `${competitor.utilization}%` }} /></div>
          <div className="flex items-center gap-2 text-[#6b7280] text-[11px] uppercase tracking-wide mb-1" data-testid="label-comp-time"><Clock className="h-3 w-3" /> Time Saved</div>
          <div className="text-[24px] font-bold text-[#374151] font-mono" data-testid="value-comp-time">{competitor.minutesSaved} min</div>
          <div className="text-[12px] text-[#9ca3af] mb-3">per encounter</div>
          <div className="h-px bg-[#e5e7eb] my-3" />
          <div className="flex items-center gap-2 text-[#6b7280] text-[11px] uppercase tracking-wide mb-2" data-testid="label-comp-value"><Zap className="h-3 w-3" /> Value You Get</div>
          <div className="text-[12px] text-[#6b7280]" data-testid="label-comp-patient-access">Patient Access, {competitor.patientAccessVisits} visits/prov</div>
          <div className="text-[18px] font-bold text-[#374151] font-mono mb-2" data-testid="value-comp-patient-access">{formatCurrency(compPatientAccessValue)}</div>
          <div className="text-[12px] text-[#6b7280]" data-testid="label-comp-los">Level of Service, {competitor.losWrvus} wRVUs/prov</div>
          <div className="text-[18px] font-bold text-[#374151] font-mono mb-2" data-testid="value-comp-los">{formatCurrency(compLosValue)}</div>
          <div className="text-[12px] text-[#6b7280]" data-testid="label-comp-overtime">Overtime, {competitor.overtimeHours > 0 ? `${competitor.overtimeHours} hrs/prov` : "Not tracking"}</div>
          <div className="text-[18px] font-bold text-[#374151] font-mono mb-3" data-testid="value-comp-overtime">{formatCurrency(compOvertimeValue)}</div>
          <div className="h-px bg-[#e5e7eb] my-3" />
          <div className="flex justify-between text-[13px] mb-1"><span className="text-[#6b7280]" data-testid="label-comp-total">Total Value</span><span className="font-bold text-[#374151] font-mono" data-testid="value-comp-total">{formatCurrency(compTotalValue)}</span></div>
          <div className="flex justify-between text-[13px] mb-1"><span className="text-[#6b7280]" data-testid="label-comp-net">Net Gain</span><span className="font-bold text-[#374151] font-mono" data-testid="value-comp-net">{formatCurrency(compNetGain)}</span></div>
          <div className="flex justify-between items-center"><span className="text-[13px] text-[#6b7280]" data-testid="label-comp-roi">ROI</span><span className="text-[20px] font-black text-[#374151] font-mono" data-testid="value-comp-roi">{compRoi.toFixed(1)}x</span></div>
        </div>

        {/* Abridge */}
        <div className="bg-gradient-to-br from-[#ecfdf5] to-[#f0fdf4] py-4 px-4" data-testid="column-abridge">
          <div className="text-[12px] uppercase tracking-[1px] text-[#059669] font-semibold" data-testid="text-abridge-name">Abridge</div>
          <div className="text-[16px] font-bold text-[#065f46] mb-4" data-testid="header-what-youd-get">What You'd Get</div>
          <div className="flex items-center gap-2 text-[#059669] text-[11px] uppercase tracking-wide mb-1" data-testid="label-abridge-investment"><DollarSign className="h-3 w-3" /> Investment</div>
          <div className="text-[24px] font-bold text-[#065f46] font-mono" data-testid="value-abridge-investment">{formatCurrency(abridgeAnnualCost)}/yr</div>
          <div className="text-[12px] text-[#047857]">${abridge.costPerProvider}/provider/mo</div>
          {costSavings > 0 && <div className="text-[12px] font-semibold text-[#059669] flex items-center gap-1" data-testid="delta-cost-savings"><Check className="h-3 w-3" /> Save {formatCurrency(costSavings)}/yr</div>}
          <div className="mb-3" />
          <div className="flex items-center gap-2 text-[#059669] text-[11px] uppercase tracking-wide mb-1" data-testid="label-abridge-utilization"><Target className="h-3 w-3" /> Utilization</div>
          <div className="text-[24px] font-bold text-[#065f46] font-mono" data-testid="value-abridge-utilization">{abridge.utilization}%</div>
          <div className="h-1.5 w-full bg-[#d1fae5] rounded-full mt-1"><div className="h-full bg-[#10b981] rounded-full" style={{ width: `${abridge.utilization}%` }} /></div>
          <div className="text-[12px] font-semibold text-[#059669] mb-3 flex items-center gap-1" data-testid="delta-utilization"><ArrowUp className="h-3 w-3" /> {(abridge.utilization / competitor.utilization).toFixed(1)}x adoption</div>
          <div className="flex items-center gap-2 text-[#059669] text-[11px] uppercase tracking-wide mb-1" data-testid="label-abridge-time"><Clock className="h-3 w-3" /> Time Saved</div>
          <div className="text-[24px] font-bold text-[#065f46] font-mono" data-testid="value-abridge-time">{abridge.minutesSaved} min</div>
          <div className="text-[12px] text-[#047857]">per encounter</div>
          <div className="text-[12px] font-semibold text-[#059669] mb-3 flex items-center gap-1" data-testid="delta-time"><ArrowUp className="h-3 w-3" /> +{Math.round(((abridge.minutesSaved - competitor.minutesSaved) / competitor.minutesSaved) * 100)}% more</div>
          <div className="h-px bg-[#d1fae5] my-3" />
          <div className="flex items-center gap-2 text-[#059669] text-[11px] uppercase tracking-wide mb-2" data-testid="label-abridge-value"><Zap className="h-3 w-3" /> Value You'd Get</div>
          <div className="text-[12px] text-[#047857]" data-testid="label-abridge-patient-access">Patient Access, {abridge.patientAccessVisits} visits/prov</div>
          <div className="flex items-center gap-1"><span className="text-[18px] font-bold text-[#065f46] font-mono" data-testid="value-abridge-patient-access">{formatCurrency(abridgePatientAccessValue)}</span><span className="text-[12px] font-bold text-[#059669] flex items-center" data-testid="delta-patient-access"><ArrowUp className="h-3 w-3" /> +{formatCurrency(patientAccessDelta)}</span></div>
          <div className="mb-2" />
          <div className="text-[12px] text-[#047857]" data-testid="label-abridge-los">Level of Service, {abridge.losWrvus} wRVUs/prov</div>
          <div className="flex items-center gap-1"><span className="text-[18px] font-bold text-[#065f46] font-mono" data-testid="value-abridge-los">{formatCurrency(abridgeLosValue)}</span><span className="text-[12px] font-bold text-[#059669] flex items-center" data-testid="delta-los"><ArrowUp className="h-3 w-3" /> +{formatCurrency(losDelta)}</span></div>
          <div className="mb-2" />
          <div className="text-[12px] text-[#047857]" data-testid="label-abridge-overtime">Overtime, {abridge.overtimeHours} hrs/prov</div>
          <div className="flex items-center gap-1"><span className="text-[18px] font-bold text-[#065f46] font-mono" data-testid="value-abridge-overtime">{formatCurrency(abridgeOvertimeValue)}</span><span className="text-[12px] font-bold text-[#059669] flex items-center" data-testid="delta-overtime"><ArrowUp className="h-3 w-3" /> +{formatCurrency(overtimeDelta)}</span></div>
          <div className="mb-3" />
          <div className="h-px bg-[#d1fae5] my-3" />
          <div className="flex justify-between text-[13px] mb-1"><span className="text-[#047857]" data-testid="label-abridge-total">Total Value</span><span className="font-bold text-[#065f46] font-mono" data-testid="value-abridge-total">{formatCurrency(abridgeTotalValue)}</span></div>
          <div className="flex justify-between text-[13px] mb-1"><span className="text-[#047857]" data-testid="label-abridge-net">Net Gain</span><span className="font-bold text-[#065f46] font-mono" data-testid="value-abridge-net">{formatCurrency(abridgeNetGain)}</span></div>
          <div className="flex justify-between items-center"><span className="text-[13px] text-[#047857]" data-testid="label-abridge-roi">ROI</span><span className="text-[20px] font-black text-[#065f46] font-mono" data-testid="value-abridge-roi">{abridgeRoi.toFixed(1)}x</span></div>
        </div>
      </div>

      {/* Punchline - text only */}
      <div className="text-center py-4" data-testid="section-punchline">
        <span className="text-[11px] uppercase tracking-[1px] text-[#059669] font-semibold" data-testid="label-switching-opportunity">The Switching Opportunity: </span>
        <span className="text-[32px] md:text-[40px] font-black text-[#065f46] font-mono" style={{ fontVariantNumeric: "tabular-nums" }} data-testid="value-switching-opportunity">+{formatCurrency(switchingOpportunity)}/year</span>
      </div>

      {/* Warning - single line */}
      {!showMaturityCurve && (
        <div className="text-center py-2 flex items-center justify-center gap-2 flex-wrap" data-testid="section-warning">
          <span className="text-[#92400e] text-[12px] flex items-center gap-1"><AlertTriangle className="h-3 w-3" />This assumes mature performance immediately. Reality: 18-24 months.</span>
          <Button onClick={() => setShowMaturityCurve(true)} variant="ghost" size="sm" data-testid="button-show-realistic-path">
            Show realistic path <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      )}

      {/* Maturity Curve - inline text flow */}
      {showMaturityCurve && (
        <div className="px-4 py-2" data-testid="section-maturity">
          <div className="text-[12px] text-[#6b7280] mb-2" data-testid="label-realistic-path">
            <strong>The realistic path to {formatCurrency(switchingOpportunity)}:</strong> Value builds over time.
          </div>

          <div className="text-[12px] text-[#374151] leading-relaxed">
            <span className="border-l-2 border-[#f59e0b] pl-2" data-testid="section-year1">
              <strong className="text-[#92400e]" data-testid="header-year1">Year 1 (Ramp-up, 40% util):</strong>{" "}
              <span data-testid="value-year1-investment"><Minus className="h-3 w-3 inline" />{formatCurrency(abridgeAnnualCost)}</span>{" "}
              <ArrowRight className="h-3 w-3 inline" />{" "}
              <span className="text-[#059669]" data-testid="value-year1-value">+{formatCurrency(year1.value)}</span> ={" "}
              <strong className="text-[#059669]" data-testid="value-year1-net">+{formatCurrency(year1.netGain)} net</strong>{" "}
              (<span data-testid="value-year1-roi">{year1.roi.toFixed(1)}x ROI</span>, still beats {competitor.name}'s {compRoi.toFixed(1)}x)
            </span>
            <br />
            <span className="border-l-2 border-[#3b82f6] pl-2" data-testid="section-year2">
              <strong className="text-[#1e40af]" data-testid="header-year2">Year 2 (Acceleration, 70% util):</strong>{" "}
              <span data-testid="value-year2-investment"><Minus className="h-3 w-3 inline" />{formatCurrency(abridgeAnnualCost)}</span>{" "}
              <ArrowRight className="h-3 w-3 inline" />{" "}
              <span className="text-[#059669]" data-testid="value-year2-value">+{formatCurrency(year2.value)}</span> ={" "}
              <strong className="text-[#059669]" data-testid="value-year2-net">+{formatCurrency(year2.netGain)} net</strong>{" "}
              (<span data-testid="value-year2-roi">{year2.roi.toFixed(1)}x ROI</span>, {(year2.roi / compRoi).toFixed(0)}x better than {competitor.name})
            </span>
            <br />
            <span className="border-l-2 border-[#10b981] pl-2" data-testid="section-year3">
              <strong className="text-[#065f46]" data-testid="header-year3">Year 3 (Payoff, 85% util):</strong>{" "}
              <span data-testid="value-year3-investment"><Minus className="h-3 w-3 inline" />{formatCurrency(abridgeAnnualCost)}</span>{" "}
              <ArrowRight className="h-3 w-3 inline" />{" "}
              <span className="text-[#059669]" data-testid="value-year3-value">+{formatCurrency(year3.value)}</span> ={" "}
              <strong className="text-[#059669]" data-testid="value-year3-net">+{formatCurrency(year3.netGain)} net</strong>{" "}
              (<span data-testid="value-year3-roi">{year3.roi.toFixed(1)}x ROI</span>, compounds forever)
            </span>
          </div>

          <div className="text-[12px] text-[#374151] mt-3" data-testid="section-3year-summary">
            <span className="text-[#6b7280]" data-testid="label-3year-advantage">3-Year Cumulative Advantage:</span>{" "}
            <strong className="text-[#065f46] text-[16px] font-mono" data-testid="value-3year-advantage">+{formatCurrency(threeYearAdvantage)}</strong>{" "}
            <span className="text-[#6b7280]">more vs. staying with {competitor.name}</span>
          </div>

          <div className="text-[11px] text-[#6b7280] mt-3" data-testid="section-insights">
            <span data-testid="label-key-insights"><strong>Key insights:</strong></span>{" "}
            <span data-testid="insight-year1-beats"><CheckCircle className="h-3 w-3 inline text-[#059669]" /> Even Year 1 beats {competitor.name}</span>{" | "}
            <span data-testid="insight-breakeven"><TrendingUp className="h-3 w-3 inline text-[#059669]" /> Break-even at Month 18</span>{" | "}
            <span data-testid="insight-year3-payoff"><Zap className="h-3 w-3 inline text-[#059669]" /> Year 3+ delivers {formatCurrency(year3.netGain)}+ more/yr</span>{" | "}
            <span data-testid="insight-ramp-payoff"><Target className="h-3 w-3 inline text-[#059669]" /> Ramp is real, payoff is massive</span>
          </div>

          {onSave && (
            <div className="mt-3">
              <Button onClick={onSave} variant="outline" size="sm" data-testid="button-save-comparison">Save This Comparison</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CompetitorComparison;
