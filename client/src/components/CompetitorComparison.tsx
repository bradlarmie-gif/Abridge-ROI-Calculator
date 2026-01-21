import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, AlertTriangle, TrendingUp, ChevronDown, ChevronUp, X } from "lucide-react";

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
  const [showMaturityModal, setShowMaturityModal] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const compAnnualCost = competitor.costPerProvider * providers * 12;
  const abridgeAnnualCost = abridge.costPerProvider * providers * 12;
  const costDifference = abridgeAnnualCost - compAnnualCost;

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
  const roiImprovement = compRoi > 0 ? abridgeRoi / compRoi : 0;

  const switchingOpportunity = abridgeNetGain - compNetGain;

  const utilizationDelta = competitor.utilization > 0 
    ? Math.round(((abridge.utilization - competitor.utilization) / competitor.utilization) * 100) 
    : 0;
  const timeDelta = competitor.minutesSaved > 0 
    ? Math.round(((abridge.minutesSaved - competitor.minutesSaved) / competitor.minutesSaved) * 100) 
    : 0;

  const maturityMultipliers = { year1: 0.4, year2: 0.7, year3: 0.85 };

  const getYearData = (multiplier: number) => {
    const yearPatientAccess = abridgePatientAccessValue * multiplier;
    const yearLos = abridgeLosValue * multiplier;
    const yearOvertime = abridgeOvertimeValue * multiplier;
    const yearValue = yearPatientAccess + yearLos + yearOvertime;
    const yearNetGain = yearValue - abridgeAnnualCost;
    const yearRoi = abridgeAnnualCost > 0 ? yearValue / abridgeAnnualCost : 0;
    return { value: yearValue, netGain: yearNetGain, roi: yearRoi, utilization: Math.round(abridge.utilization * multiplier) };
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
    <div data-testid="competitor-comparison" className="space-y-8">
      
      {/* SECTION 1: Hero Punchline */}
      <div 
        className="rounded-2xl border-[3px] border-[#10b981] p-12 md:p-16 text-center"
        style={{ background: "linear-gradient(135deg, #d1fae5 0%, #ecfdf5 100%)" }}
        data-testid="section-hero"
      >
        <div 
          className="text-[14px] uppercase tracking-[1.5px] text-[#047857] font-semibold mb-4"
          data-testid="label-switching-opportunity"
        >
          The Switching Opportunity
        </div>
        <div 
          className="text-[48px] md:text-[72px] font-black text-[#065f46] leading-none mb-4"
          style={{ fontFeatureSettings: "'tnum'" }}
          data-testid="value-switching-opportunity"
        >
          +{formatCurrency(switchingOpportunity)} per year
        </div>
        <div 
          className="text-[16px] md:text-[18px] text-[#047857] font-medium"
          data-testid="label-hero-context"
        >
          Additional value by switching to Abridge
        </div>
      </div>

      {/* SECTION 2: Cost vs Outcome Grid */}
      <div 
        className="grid gap-8"
        style={{ gridTemplateColumns: "320px 1fr" }}
        data-testid="section-cost-outcome"
      >
        {/* Left: What You Pay (muted) */}
        <div 
          className="bg-[#f9fafb] p-8 rounded-xl border-2 border-[#e5e7eb]"
          data-testid="panel-cost"
        >
          <div className="text-[12px] uppercase tracking-[1px] text-[#9ca3af] font-semibold mb-5">
            What You Pay
          </div>
          <div className="text-[16px] font-semibold text-[#374151] mb-1" data-testid="text-competitor-name">
            {competitor.name}
          </div>
          <div className="text-[32px] font-bold text-[#374151] mb-2" style={{ fontFeatureSettings: "'tnum'" }} data-testid="value-comp-annual-cost">
            {formatCurrency(compAnnualCost)}/year
          </div>
          <div className="text-[14px] text-[#6b7280] mb-4">
            ${competitor.costPerProvider}/provider/mo
          </div>
          <div className="text-[14px] text-[#6b7280]">
            {costDifference === 0 ? (
              <span>Same cost as current</span>
            ) : costDifference > 0 ? (
              <span>+{formatCurrency(costDifference)} more than current</span>
            ) : (
              <span className="text-[#059669]">Save {formatCurrency(Math.abs(costDifference))}/year</span>
            )}
          </div>
        </div>

        {/* Right: What You Get (HERO) */}
        <div 
          className="p-10 md:p-12 rounded-xl border-[3px] border-[#10b981] text-center"
          style={{ background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)" }}
          data-testid="panel-outcome"
        >
          <div className="text-[12px] uppercase tracking-[1px] text-[#9ca3af] font-semibold mb-4">
            What You Get
          </div>
          <div 
            className="text-[56px] md:text-[80px] font-black text-[#065f46] leading-none"
            style={{ fontFeatureSettings: "'tnum'" }}
            data-testid="value-abridge-roi"
          >
            {abridgeRoi.toFixed(1)}x ROI
          </div>
          <div className="text-[20px] md:text-[24px] text-[#047857] font-semibold mt-2" data-testid="text-abridge-name">
            Abridge
          </div>
          <div className="text-[18px] md:text-[20px] text-[#059669] font-semibold mt-4" data-testid="value-roi-improvement">
            {roiImprovement.toFixed(1)}x better ROI
          </div>
          <div className="text-[15px] md:text-[16px] text-[#047857] mt-2" data-testid="value-abridge-net-gain">
            {formatCurrency(abridgeNetGain)} net gain
          </div>
        </div>
      </div>

      {/* SECTION 3: Why The Difference */}
      <div 
        className="bg-white p-8 md:p-10 rounded-xl border-2 border-[#e5e7eb]"
        data-testid="section-why-difference"
      >
        <h3 className="text-[18px] font-semibold text-[#111827] uppercase tracking-[0.5px] mb-8">
          Why The Difference
        </h3>

        {/* Reason 1: Higher Utilization */}
        <div className="flex gap-5 py-6 border-b border-[#f3f4f6]" data-testid="reason-utilization">
          <div className="text-[32px] flex-shrink-0">
            <TrendingUp className="h-8 w-8 text-[#059669]" />
          </div>
          <div>
            <div className="text-[16px] font-semibold text-[#374151] mb-2">Higher Utilization</div>
            <div className="flex items-center gap-3 text-[15px] flex-wrap">
              <span className="text-[#6b7280]">{competitor.name}: {competitor.utilization}%</span>
              <span className="text-[#d1d5db] font-bold">→</span>
              <span className="text-[#059669] font-semibold">Abridge: {abridge.utilization}%</span>
              <span className="text-[#10b981] text-[13px] font-semibold">[+{utilizationDelta}% more adoption]</span>
            </div>
          </div>
        </div>

        {/* Reason 2: More Time Saved */}
        <div className="flex gap-5 py-6 border-b border-[#f3f4f6]" data-testid="reason-time">
          <div className="text-[32px] flex-shrink-0">
            <svg className="h-8 w-8 text-[#059669]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <div>
            <div className="text-[16px] font-semibold text-[#374151] mb-2">More Time Saved</div>
            <div className="flex items-center gap-3 text-[15px] flex-wrap">
              <span className="text-[#6b7280]">{competitor.name}: {competitor.minutesSaved} min</span>
              <span className="text-[#d1d5db] font-bold">→</span>
              <span className="text-[#059669] font-semibold">Abridge: {abridge.minutesSaved} min</span>
              <span className="text-[#10b981] text-[13px] font-semibold">[+{timeDelta}% more time]</span>
            </div>
          </div>
        </div>

        {/* Reason 3: Better Outcomes */}
        <div className="flex gap-5 py-6" data-testid="reason-outcomes">
          <div className="text-[32px] flex-shrink-0">
            <svg className="h-8 w-8 text-[#059669]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="text-[16px] font-semibold text-[#374151] mb-2">Better Outcomes</div>
            <div className="text-[14px] text-[#6b7280] mb-2">
              Access +{formatCurrency(patientAccessDelta)} • LoS +{formatCurrency(losDelta)} • Overtime +{formatCurrency(overtimeDelta)}
            </div>
            <button 
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="text-[14px] text-[#EA2C00] hover:underline flex items-center gap-1"
              data-testid="button-view-breakdown"
            >
              {showBreakdown ? "Hide" : "View"} detailed breakdown
              {showBreakdown ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            
            {/* Expanded Breakdown */}
            {showBreakdown && (
              <div className="mt-4 space-y-3 pl-4 border-l-2 border-[#e5e7eb]" data-testid="breakdown-details">
                <div className="grid grid-cols-4 gap-4 text-[13px]">
                  <div className="font-semibold text-[#6b7280]">Driver</div>
                  <div className="font-semibold text-[#6b7280]">{competitor.name}</div>
                  <div className="font-semibold text-[#059669]">Abridge</div>
                  <div className="font-semibold text-[#10b981]">Delta</div>
                </div>
                <div className="grid grid-cols-4 gap-4 text-[14px]">
                  <div className="text-[#374151]">Patient Access</div>
                  <div className="text-[#6b7280]">{formatCurrency(compPatientAccessValue)}</div>
                  <div className="text-[#059669]">{formatCurrency(abridgePatientAccessValue)}</div>
                  <div className="text-[#10b981] font-semibold">+{formatCurrency(patientAccessDelta)}</div>
                </div>
                <div className="grid grid-cols-4 gap-4 text-[14px]">
                  <div className="text-[#374151]">Level of Service</div>
                  <div className="text-[#6b7280]">{formatCurrency(compLosValue)}</div>
                  <div className="text-[#059669]">{formatCurrency(abridgeLosValue)}</div>
                  <div className="text-[#10b981] font-semibold">+{formatCurrency(losDelta)}</div>
                </div>
                <div className="grid grid-cols-4 gap-4 text-[14px]">
                  <div className="text-[#374151]">Overtime Savings</div>
                  <div className="text-[#6b7280]">{formatCurrency(compOvertimeValue)}</div>
                  <div className="text-[#059669]">{formatCurrency(abridgeOvertimeValue)}</div>
                  <div className="text-[#10b981] font-semibold">+{formatCurrency(overtimeDelta)}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 4: Reality Check Banner */}
      <div 
        className="bg-[#fef3c7] border-2 border-[#fbbf24] rounded-xl p-8 flex gap-5 items-start"
        data-testid="section-reality-check"
      >
        <AlertTriangle className="h-10 w-10 text-[#f59e0b] flex-shrink-0" />
        <div>
          <div className="text-[16px] text-[#78350f] leading-relaxed mb-4">
            This assumes mature Abridge performance ({abridge.utilization}%+ utilization).{" "}
            <strong className="text-[#92400e]">Reality: It takes 18-24 months to get there.</strong>
          </div>
          <Button 
            onClick={() => setShowMaturityModal(true)}
            className="bg-[#f59e0b] hover:bg-[#d97706] text-white"
            data-testid="button-show-timeline"
          >
            Show Me the Realistic Timeline
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>

      {/* MATURITY MODAL */}
      {showMaturityModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" data-testid="modal-maturity">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-[#e5e7eb] p-6 flex justify-between items-center">
              <div>
                <h2 className="text-[20px] font-bold text-[#111827]">The Realistic Path to {formatCurrency(switchingOpportunity)}</h2>
                <p className="text-[14px] text-[#6b7280]">Value doesn't happen overnight. Here's the realistic journey.</p>
              </div>
              <button 
                onClick={() => setShowMaturityModal(false)}
                className="p-2 hover:bg-[#f3f4f6] rounded-lg"
                data-testid="button-close-maturity"
              >
                <X className="h-5 w-5 text-[#6b7280]" />
              </button>
            </div>

            <div className="p-6 space-y-8">
              {/* Timeline Visual */}
              <div className="flex items-center justify-between" data-testid="section-timeline">
                {[
                  { label: "M6", value: "20%", color: "#f59e0b" },
                  { label: "M12", value: "40%", color: "#f59e0b" },
                  { label: "M18", value: "80%", color: "#3b82f6" },
                  { label: "M24+", value: "100%", color: "#10b981" },
                ].map((milestone, i) => (
                  <div key={milestone.label} className="flex flex-col items-center flex-1">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-[14px]"
                      style={{ backgroundColor: milestone.color }}
                    >
                      {milestone.value}
                    </div>
                    <div className="text-[13px] font-semibold text-[#374151] mt-2">{milestone.label}</div>
                    {i < 3 && <div className="w-full h-1 bg-[#e5e7eb] mt-2" />}
                  </div>
                ))}
              </div>

              {/* Year 1 */}
              <div className="border-l-4 border-[#f59e0b] pl-6 py-4" data-testid="section-year1">
                <h3 className="text-[18px] font-bold text-[#92400e] mb-2">Year 1: The Ramp-Up</h3>
                <p className="text-[14px] text-[#6b7280] mb-4">
                  Onboarding & training (Months 1-3) → Building habits & workflows (Months 4-8) → Early adopters succeeding (Months 9-12)
                </p>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[13px] text-[#6b7280]">Utilization: {year1.utilization}% avg</span>
                  <div className="flex-1 h-2 bg-[#e5e7eb] rounded-full">
                    <div className="h-full bg-[#f59e0b] rounded-full" style={{ width: `${year1.utilization}%` }} />
                  </div>
                </div>
                <div className="bg-[#fffbeb] border border-[#fbbf24] rounded-lg p-4 mt-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-[12px] text-[#6b7280] uppercase">Investment</div>
                      <div className="text-[16px] font-bold text-[#374151]">-{formatCurrency(abridgeAnnualCost)}</div>
                    </div>
                    <div>
                      <div className="text-[12px] text-[#6b7280] uppercase">Value</div>
                      <div className="text-[16px] font-bold text-[#059669]">+{formatCurrency(year1.value)}</div>
                    </div>
                    <div>
                      <div className="text-[12px] text-[#6b7280] uppercase">Net Gain</div>
                      <div className="text-[16px] font-bold text-[#059669]">+{formatCurrency(year1.netGain)}</div>
                    </div>
                    <div>
                      <div className="text-[12px] text-[#6b7280] uppercase">ROI</div>
                      <div className="text-[16px] font-bold text-[#374151]">{year1.roi.toFixed(1)}x</div>
                    </div>
                  </div>
                </div>
                <p className="text-[13px] text-[#047857] mt-3 font-medium">
                  Still better than {competitor.name}'s {compRoi.toFixed(1)}x ROI, even during ramp-up
                </p>
              </div>

              {/* Year 2 */}
              <div className="border-l-4 border-[#3b82f6] pl-6 py-4" data-testid="section-year2">
                <h3 className="text-[18px] font-bold text-[#1e40af] mb-2">Year 2: The Acceleration</h3>
                <p className="text-[14px] text-[#6b7280] mb-4">
                  Utilization climbing (65%+) → Workflows optimized → Retention benefits starting to materialize
                </p>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[13px] text-[#6b7280]">Utilization: {year2.utilization}% avg</span>
                  <div className="flex-1 h-2 bg-[#e5e7eb] rounded-full">
                    <div className="h-full bg-[#3b82f6] rounded-full" style={{ width: `${year2.utilization}%` }} />
                  </div>
                </div>
                <div className="bg-[#eff6ff] border border-[#3b82f6] rounded-lg p-4 mt-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-[12px] text-[#6b7280] uppercase">Investment</div>
                      <div className="text-[16px] font-bold text-[#374151]">-{formatCurrency(abridgeAnnualCost)}</div>
                    </div>
                    <div>
                      <div className="text-[12px] text-[#6b7280] uppercase">Value</div>
                      <div className="text-[16px] font-bold text-[#059669]">+{formatCurrency(year2.value)}</div>
                    </div>
                    <div>
                      <div className="text-[12px] text-[#6b7280] uppercase">Net Gain</div>
                      <div className="text-[16px] font-bold text-[#059669]">+{formatCurrency(year2.netGain)}</div>
                    </div>
                    <div>
                      <div className="text-[12px] text-[#6b7280] uppercase">ROI</div>
                      <div className="text-[16px] font-bold text-[#374151]">{year2.roi.toFixed(1)}x</div>
                    </div>
                  </div>
                </div>
                <p className="text-[13px] text-[#047857] mt-3 font-medium">
                  ROI now {(year2.roi / compRoi).toFixed(0)}x better than {competitor.name}
                </p>
              </div>

              {/* Year 3 */}
              <div className="border-l-4 border-[#10b981] pl-6 py-4" data-testid="section-year3">
                <h3 className="text-[18px] font-bold text-[#065f46] mb-2">Year 3: The Payoff</h3>
                <p className="text-[14px] text-[#6b7280] mb-4">
                  Full maturity achieved → Compounding benefits → Retention delivering → Provider satisfaction high
                </p>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[13px] text-[#6b7280]">Utilization: {year3.utilization}% avg</span>
                  <div className="flex-1 h-2 bg-[#e5e7eb] rounded-full">
                    <div className="h-full bg-[#10b981] rounded-full" style={{ width: `${Math.min(year3.utilization, 100)}%` }} />
                  </div>
                </div>
                <div className="bg-[#ecfdf5] border border-[#10b981] rounded-lg p-4 mt-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-[12px] text-[#6b7280] uppercase">Investment</div>
                      <div className="text-[16px] font-bold text-[#374151]">-{formatCurrency(abridgeAnnualCost)}</div>
                    </div>
                    <div>
                      <div className="text-[12px] text-[#6b7280] uppercase">Value</div>
                      <div className="text-[16px] font-bold text-[#059669]">+{formatCurrency(year3.value)}</div>
                    </div>
                    <div>
                      <div className="text-[12px] text-[#6b7280] uppercase">Net Gain</div>
                      <div className="text-[16px] font-bold text-[#059669]">+{formatCurrency(year3.netGain)}</div>
                    </div>
                    <div>
                      <div className="text-[12px] text-[#6b7280] uppercase">ROI</div>
                      <div className="text-[16px] font-bold text-[#374151]">{year3.roi.toFixed(1)}x</div>
                    </div>
                  </div>
                </div>
                <p className="text-[13px] text-[#047857] mt-3 font-medium">
                  Compounds forever - {formatCurrency(year3.netGain)}+ more per year
                </p>
              </div>

              {/* But Even During Ramp-Up */}
              <div className="bg-[#f9fafb] border border-[#e5e7eb] rounded-xl p-6" data-testid="section-ramp-comparison">
                <h3 className="text-[16px] font-bold text-[#111827] mb-4">But Even During Ramp-Up...</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-[13px] text-[#6b7280] mb-1">Year</div>
                    <div className="text-[14px] font-semibold text-[#374151]">Year 1</div>
                    <div className="text-[14px] font-semibold text-[#374151]">Year 2</div>
                    <div className="text-[14px] font-semibold text-[#374151]">Year 3</div>
                  </div>
                  <div>
                    <div className="text-[13px] text-[#6b7280] mb-1">Abridge ROI</div>
                    <div className="text-[14px] font-bold text-[#059669]">{year1.roi.toFixed(1)}x</div>
                    <div className="text-[14px] font-bold text-[#059669]">{year2.roi.toFixed(1)}x</div>
                    <div className="text-[14px] font-bold text-[#059669]">{year3.roi.toFixed(1)}x</div>
                  </div>
                  <div>
                    <div className="text-[13px] text-[#6b7280] mb-1">{competitor.name} ROI</div>
                    <div className="text-[14px] text-[#9ca3af]">{compRoi.toFixed(1)}x</div>
                    <div className="text-[14px] text-[#9ca3af]">{compRoi.toFixed(1)}x</div>
                    <div className="text-[14px] text-[#9ca3af]">{compRoi.toFixed(1)}x</div>
                  </div>
                </div>
              </div>

              {/* 3-Year Cumulative */}
              <div 
                className="rounded-xl p-8 text-center border-[3px] border-[#10b981]"
                style={{ background: "linear-gradient(135deg, #d1fae5 0%, #ecfdf5 100%)" }}
                data-testid="section-3year-summary"
              >
                <div className="text-[14px] uppercase tracking-[1px] text-[#047857] font-semibold mb-2">
                  3-Year Cumulative Advantage
                </div>
                <div 
                  className="text-[48px] font-black text-[#065f46]"
                  style={{ fontFeatureSettings: "'tnum'" }}
                  data-testid="value-3year-advantage"
                >
                  +{formatCurrency(threeYearAdvantage)}
                </div>
                <div className="text-[16px] text-[#047857] mt-2">
                  more value vs. staying with {competitor.name}
                </div>
                <div className="text-[14px] text-[#6b7280] mt-4">
                  Break-even at ~Month 18 • Compounding benefits from Year 3+
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-[#e5e7eb]">
                <Button 
                  variant="outline" 
                  onClick={() => setShowMaturityModal(false)}
                  data-testid="button-close-maturity-footer"
                >
                  Close
                </Button>
                {onSave && (
                  <Button 
                    onClick={() => {
                      onSave();
                      setShowMaturityModal(false);
                    }}
                    className="bg-[#EA2C00] hover:bg-[#D14729] text-white"
                    data-testid="button-save-from-maturity"
                  >
                    Save This Comparison
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CompetitorComparison;
