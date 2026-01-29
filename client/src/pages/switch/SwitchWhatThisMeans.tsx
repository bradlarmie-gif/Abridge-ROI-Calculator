import { ArrowLeft, Phone, Link2, Edit3, ChevronDown, ChevronUp, TrendingUp, Users, ClipboardList, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { SwitchState } from "./SwitchFlow";

interface Props {
  currentStep: number;
  switchState: SwitchState;
  onBack: () => void;
  onBackToJourney?: () => void;
}

const formatNumber = (num: number): string => {
  return num.toLocaleString("en-US");
};

const formatCurrency = (num: number): string => {
  return "$" + num.toLocaleString("en-US");
};

export default function SwitchWhatThisMeans({
  currentStep,
  switchState,
  onBack,
  onBackToJourney,
}: Props) {
  const [showAssumptions, setShowAssumptions] = useState(false);
  const { situation } = switchState;

  const getProviderCount = (): number => {
    switch (situation.scale) {
      case "<25": return 20;
      case "25-50": return 37;
      case "50-100": return 75;
      case "100-200": return 150;
      case "200+": return 250;
      default: return 75;
    }
  };

  const getUtilization = (): number => {
    switch (situation.utilization) {
      case "not-sure": return 45;
      case "30-40": return 35;
      case "45-55": return 50;
      case "60+": return 65;
      default: return 45;
    }
  };

  const getTimeSavings = (): number => {
    switch (situation.efficiency) {
      case "not-sure": return 1.5;
      case "1-2": return 1.5;
      case "2-3": return 2.5;
      case "3+": return 3.5;
      default: return 1.5;
    }
  };

  const providers = getProviderCount();
  const currentUtilization = getUtilization();
  const currentTimeSavings = getTimeSavings();

  const abridgeUtilization = 65;
  const abridgeTimeSavings = 3;

  const encountersPerProvider = 2000;
  const totalEncounters = providers * encountersPerProvider;

  const currentDocumented = Math.round(totalEncounters * (currentUtilization / 100));
  const abridgeDocumented = Math.round(totalEncounters * (abridgeUtilization / 100));

  const additionalEncounters = Math.max(0, abridgeDocumented - currentDocumented);

  const currentHoursReturned = Math.round((currentTimeSavings * currentDocumented) / 60);
  const abridgeHoursReturned = Math.round((abridgeTimeSavings * abridgeDocumented) / 60);

  const additionalHours = Math.max(0, abridgeHoursReturned - currentHoursReturned);

  const valuePerEncounter = 2.6;
  const productivityValuePerHour = 75;

  const utilizationGapValue = Math.round(additionalEncounters * valuePerEncounter);
  const efficiencyGapValue = Math.round(additionalHours * productivityValuePerHour);

  const totalAnnualGap = utilizationGapValue + efficiencyGapValue;

  const drivers = [
    {
      id: "patient-access",
      name: "Patient Access",
      description: "More encounters documented = better access",
      value: Math.round(totalAnnualGap * 0.26),
      icon: <Users className="w-5 h-5" />,
    },
    {
      id: "level-of-service",
      name: "Level of Service Accuracy",
      description: "Better documentation captures complexity",
      value: Math.round(totalAnnualGap * 0.45),
      icon: <ClipboardList className="w-5 h-5" />,
    },
    {
      id: "denials",
      name: "Documentation-Related Denials",
      description: "Complete notes reduce denials",
      value: Math.round(totalAnnualGap * 0.29),
      icon: <Shield className="w-5 h-5" />,
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <header className="sticky top-0 z-10 bg-white border-b border-neutral-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#EA2C00] flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="font-semibold text-slate-900 tracking-wide">SWITCH</span>
          </div>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">What this means</h1>
          <p className="text-slate-500 max-w-lg mx-auto">
            Based on the comparison, here's an estimate of the value gap
            between your current state and what may be achievable.
          </p>
        </div>

        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200 p-5 md:p-8 mb-6 md:mb-8 text-center">
          <p className="text-sm text-slate-500 uppercase tracking-wider mb-2">
            ESTIMATED ANNUAL GAP
          </p>
          <p className="text-3xl md:text-5xl font-bold text-emerald-600 mb-4" data-testid="text-annual-gap">
            {formatCurrency(totalAnnualGap)}
          </p>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            This represents the difference between your current state
            and the Abridge benchmark, translated to dollar value.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 mb-6 md:mb-8">
          <h3 className="text-xs font-semibold text-slate-500 tracking-wider uppercase mb-4">
            HOW WE CALCULATED THIS
          </h3>

          <div className="space-y-4">
            <div className="p-3 md:p-4 bg-slate-50 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                <div>
                  <p className="font-medium text-slate-800">Utilization gap</p>
                  <p className="text-xs sm:text-sm text-slate-500">
                    +{formatNumber(additionalEncounters)} additional encounters × value per encounter
                  </p>
                </div>
                <p className="text-base sm:text-lg font-semibold text-emerald-600">
                  = {formatCurrency(utilizationGapValue)}
                </p>
              </div>
            </div>

            <div className="p-3 md:p-4 bg-slate-50 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                <div>
                  <p className="font-medium text-slate-800">Efficiency gap</p>
                  <p className="text-xs sm:text-sm text-slate-500">
                    +{formatNumber(additionalHours)} additional hours × ${productivityValuePerHour}/hour productivity value
                  </p>
                </div>
                <p className="text-base sm:text-lg font-semibold text-emerald-600">
                  = {formatCurrency(efficiencyGapValue)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <p className="font-semibold text-slate-800">Total Annual Gap</p>
            <p className="text-lg md:text-xl font-bold text-emerald-600">
              {formatCurrency(totalAnnualGap)}/year
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 mb-6 md:mb-8">
          <h3 className="text-xs font-semibold text-slate-500 tracking-wider uppercase mb-4">
            WHERE THAT VALUE SHOWS UP
          </h3>
          <div className="space-y-3">
            {drivers.map((driver) => (
              <div
                key={driver.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 md:p-4 bg-slate-50 rounded-lg gap-2"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 flex-shrink-0">
                    {driver.icon}
                  </div>
                  <span className="font-medium text-slate-800 text-sm md:text-base">{driver.name}</span>
                </div>
                <span className="font-semibold text-emerald-600 text-sm md:text-base">
                  +{formatCurrency(driver.value)}/yr
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 md:p-6 mb-6 md:mb-8">
          <h4 className="font-semibold text-slate-800 mb-3">THE DECISION</h4>
          <p className="text-sm text-slate-600 mb-4">
            You already invested in ambient AI. The question is whether you're getting full value.
          </p>
          <ul className="space-y-2 text-xs sm:text-sm text-slate-700 mb-4">
            <li className="flex flex-wrap items-center gap-1 sm:gap-2">
              <TrendingUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span>Your utilization: <strong>{currentUtilization}%</strong></span>
              <span className="text-slate-400">(Abridge avg: 65%)</span>
            </li>
            <li className="flex flex-wrap items-center gap-1 sm:gap-2">
              <TrendingUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span>Your time savings: <strong>{currentTimeSavings} min</strong></span>
              <span className="text-slate-400">(Abridge avg: 3 min)</span>
            </li>
            <li className="flex flex-wrap items-center gap-1 sm:gap-2">
              <TrendingUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span>Annual gap: <strong className="text-emerald-600">{formatCurrency(totalAnnualGap)}</strong></span>
            </li>
          </ul>
          <p className="text-sm text-slate-600">
            Every month you stay at current state costs <strong>~{formatCurrency(Math.round(totalAnnualGap / 12))}</strong> in value you could be capturing.
          </p>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAssumptions(!showAssumptions)}
            className="mt-4 flex items-center gap-1 text-sm text-slate-500"
            data-testid="button-view-assumptions"
          >
            {showAssumptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            View assumptions
          </Button>

          {showAssumptions && (
            <div className="mt-4 p-4 bg-white rounded-lg border border-slate-200 text-sm text-slate-600 space-y-2">
              <p>• Providers: {providers}</p>
              <p>• Encounters/provider/year: {encountersPerProvider}</p>
              <p>• Total encounters: {formatNumber(totalEncounters)}</p>
              <p>• Value per additional encounter: ${valuePerEncounter}</p>
              <p>• Productivity value per hour: ${productivityValuePerHour}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-4">
          <Button
            className="px-8 py-3 rounded-lg font-medium bg-[#EA2C00] hover:bg-[#D94E32] text-white transition-all flex items-center gap-2"
            data-testid="button-lets-talk"
          >
            <Phone className="w-4 h-4" />
            Let's Talk
          </Button>
          <div className="flex gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-sm text-slate-500 flex items-center gap-1"
              data-testid="button-copy-link"
            >
              <Link2 className="w-4 h-4" />
              Copy Link
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onBackToJourney}
              className="text-sm text-slate-500 flex items-center gap-1"
              data-testid="button-edit-model"
            >
              <Edit3 className="w-4 h-4" />
              Edit model
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
