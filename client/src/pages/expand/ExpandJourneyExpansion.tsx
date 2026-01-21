import { useState, useMemo } from "react";
import { ArrowLeft, ArrowRight, MapPin, Rocket, Lightbulb, Share2, Copy, Check, FileText, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type DeploymentData, type MetricType, type MetricsData } from "./ExpandFlow";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts";

interface ExpandJourneyExpansionProps {
  deploymentData: DeploymentData;
  metricsData: MetricsData;
  selectedMetrics: MetricType[];
  onBack: () => void;
}

const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatCompactCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value}`;
};

// Custom Tooltip
function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { providers: number; utilization: number; value: number; roi: string } }> }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#1e293b] rounded-lg p-3 shadow-xl">
        <p className="text-white font-semibold text-sm mb-1">{data.providers} providers</p>
        <p className="text-neutral-300 text-xs mb-1">{data.utilization}% utilization</p>
        <p className="text-emerald-400 font-semibold text-sm">{formatCurrency(data.value)} value</p>
        <p className="text-neutral-300 text-xs">{data.roi}x ROI</p>
      </div>
    );
  }
  return null;
}

export default function ExpandJourneyExpansion({
  deploymentData,
  metricsData,
  selectedMetrics,
  onBack,
}: ExpandJourneyExpansionProps) {
  const [copied, setCopied] = useState(false);
  
  // Current state from deployment data
  const pilotProviders = deploymentData.providers;
  const annualEncounters = deploymentData.annualEncounters;
  const encountersPerProvider = Math.round(annualEncounters / pilotProviders);
  const pilotUtilization = deploymentData.utilizationRate;
  
  // Editable expansion state
  const [fullScaleProviders, setFullScaleProviders] = useState(pilotProviders * 4);
  const [fullScaleUtilization, setFullScaleUtilization] = useState(80);
  
  // Calculate value per encounter from current data
  const pricePerProvider = 150;
  const abridgeEncounters = Math.round(annualEncounters * (pilotUtilization / 100));
  
  // Time savings value
  const timeSavings = metricsData.timeSavings.before - metricsData.timeSavings.after;
  const totalHoursSaved = (timeSavings * abridgeEncounters) / 60;
  const realizedHours = totalHoursSaved * 0.5;
  const hourlyValue = 75;
  const timeSavingsValue = Math.round(realizedHours * hourlyValue);
  
  // wRVU value
  const wrvuLift = metricsData.wrvuCapture.after - metricsData.wrvuCapture.before;
  const totalWrvuGain = wrvuLift * abridgeEncounters;
  const conversionFactor = 33;
  const realizationRate = 0.5;
  const wrvuValue = Math.round(totalWrvuGain * conversionFactor * realizationRate);
  
  // Total pilot value
  const pilotValue = timeSavingsValue + wrvuValue;
  const pilotInvestment = pilotProviders * pricePerProvider * 12;
  const pilotNet = pilotValue - pilotInvestment;
  const pilotROI = pilotInvestment > 0 ? (pilotValue / pilotInvestment) : 0;
  
  // Value per encounter
  const valuePerEncounter = abridgeEncounters > 0 ? pilotValue / abridgeEncounters : 0;
  
  // Generate chart data
  const chartData = useMemo(() => {
    const points = [];
    const steps = 20;
    
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      
      const providers = Math.round(
        pilotProviders + (fullScaleProviders - pilotProviders) * progress
      );
      
      const utilization = (
        pilotUtilization + (fullScaleUtilization - pilotUtilization) * progress
      ) / 100;
      
      const encounters = providers * encountersPerProvider * utilization;
      const value = encounters * valuePerEncounter;
      const investment = providers * pricePerProvider * 12;
      const net = value - investment;
      const roi = investment > 0 ? (value / investment) : 0;
      
      points.push({
        providers,
        value: Math.round(value),
        net: Math.round(net),
        roi: roi.toFixed(1),
        utilization: Math.round(utilization * 100),
        isPilot: i === 0,
        isFullScale: i === steps
      });
    }
    
    return points;
  }, [pilotProviders, fullScaleProviders, pilotUtilization, fullScaleUtilization, encountersPerProvider, valuePerEncounter, pricePerProvider]);
  
  const pilot = chartData[0];
  const fullScale = chartData[chartData.length - 1];
  const expansionPotential = fullScale.net - pilot.net;
  const valueMultiple = pilot.value > 0 ? (fullScale.value / pilot.value).toFixed(1) : "0";
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#6B7280] hover:text-[#111827] transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>
          <span className="text-sm text-[#6B7280]">Step 4 of 4 · Your Journey</span>
          <Button
            size="sm"
            className="gap-2"
            data-testid="button-export"
          >
            <Share2 className="w-4 h-4" />
            Export & Share
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-[#111827] mb-2">Your Journey with Abridge</h1>
          <p className="text-[#6B7280]">
            You've proven the value. Here's what expansion looks like.
          </p>
        </div>

        {/* Hero Summary */}
        <section className="bg-white rounded-2xl border border-neutral-200 p-8 mb-8">
          <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider text-center mb-8">
            Your ROI at a Glance
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-emerald-50 rounded-xl p-6 text-center border border-emerald-100">
              <div className="font-mono font-bold text-4xl text-emerald-600 mb-2" data-testid="summary-net-value">
                {formatCurrency(pilotNet)}
              </div>
              <div className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                Current Net Value
              </div>
            </div>
            
            <div className="bg-[#111827] rounded-xl p-6 text-center">
              <div className="font-mono font-bold text-4xl text-white mb-2" data-testid="summary-roi">
                {pilotROI.toFixed(1)}x
              </div>
              <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Return on Investment
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-6 text-center border border-emerald-300">
              <div className="font-mono font-bold text-4xl text-emerald-600 mb-2" data-testid="summary-expansion">
                +{formatCurrency(expansionPotential)}
              </div>
              <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                Expansion Potential
              </div>
            </div>
          </div>
        </section>

        {/* Journey Chart */}
        <section className="bg-white rounded-2xl border border-neutral-200 p-8 mb-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-[#111827] mb-1">
              Your Growth Trajectory
            </h2>
            <p className="text-sm text-[#6B7280]">
              Based on your proven results, here's how value scales with expansion.
            </p>
          </div>
          
          {/* Area Chart */}
          <div className="h-80 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                <defs>
                  <linearGradient id="expandValueGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#E85D3F" stopOpacity={1} />
                    <stop offset="50%" stopColor="#94a3b8" stopOpacity={1} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={1} />
                  </linearGradient>
                  <linearGradient id="expandAreaFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                
                <XAxis 
                  dataKey="providers" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6B7280", fontSize: 12 }}
                  label={{ 
                    value: "PROVIDERS", 
                    position: "bottom", 
                    fill: "#94a3b8",
                    fontSize: 11,
                    fontWeight: 500,
                    offset: -10
                  }}
                />
                
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6B7280", fontSize: 12 }}
                  tickFormatter={(v) => formatCompactCurrency(v)}
                  width={70}
                />
                
                <Tooltip content={<CustomTooltip />} />
                
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="url(#expandValueGradient)"
                  strokeWidth={3}
                  fill="url(#expandAreaFill)"
                />
                
                <ReferenceDot 
                  x={pilot.providers} 
                  y={pilot.value} 
                  r={10} 
                  fill="#E85D3F" 
                  stroke="white"
                  strokeWidth={3}
                />
                
                <ReferenceDot 
                  x={fullScale.providers} 
                  y={fullScale.value} 
                  r={10} 
                  fill="#059669" 
                  stroke="white"
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          {/* Chart Annotations */}
          <div className="flex justify-between px-16 mb-8">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#E85D3F]" />
              <span className="text-sm font-medium text-[#6B7280]">You are here ({pilotProviders} providers)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-sm font-medium text-[#6B7280]">Your opportunity ({fullScaleProviders} providers)</span>
            </div>
          </div>
          
          {/* Model Your Expansion */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Rocket className="w-5 h-5 text-[#E85D3F]" />
              <h3 className="text-sm font-semibold text-[#111827] uppercase tracking-wide">
                Model Your Expansion
              </h3>
            </div>
            
            <div className="flex flex-col md:flex-row items-stretch gap-6 mb-8">
              {/* Current State (Read Only) */}
              <div className="flex-1 bg-white rounded-xl border-2 border-orange-200 p-5">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <MapPin className="w-5 h-5 text-[#E85D3F]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#111827] uppercase tracking-wide">Current State</h4>
                    <p className="text-xs text-[#6B7280]">Your proven results</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-neutral-50 rounded-lg">
                    <span className="text-sm text-[#6B7280]">Providers</span>
                    <span className="font-mono font-bold text-[#111827]">{pilotProviders}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-neutral-50 rounded-lg">
                    <span className="text-sm text-[#6B7280]">Utilization</span>
                    <span className="font-mono font-bold text-[#111827]">{pilotUtilization}%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-neutral-50 rounded-lg">
                    <span className="text-sm text-[#6B7280]">Annual Value</span>
                    <span className="font-mono font-bold text-emerald-600">{formatCurrency(pilot.value)}</span>
                  </div>
                </div>
              </div>
              
              {/* Divider */}
              <div className="hidden md:flex flex-col items-center justify-center py-4">
                <div className="w-px h-full bg-neutral-200" />
                <div className="p-2 bg-white border border-neutral-200 rounded-full my-2">
                  <ArrowRight className="w-5 h-5 text-neutral-400" />
                </div>
                <div className="w-px h-full bg-neutral-200" />
              </div>
              
              {/* Expansion Target (Editable) */}
              <div className="flex-1 bg-white rounded-xl border-2 border-emerald-200 p-5">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Rocket className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#111827] uppercase tracking-wide">Expansion Target</h4>
                    <p className="text-xs text-[#6B7280]">Model your opportunity</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-[#6B7280] mb-1">Total providers</label>
                    <input 
                      type="number" 
                      value={fullScaleProviders}
                      onChange={(e) => setFullScaleProviders(Math.max(pilotProviders, Number(e.target.value)))}
                      min={pilotProviders}
                      max={1000}
                      className="w-full px-3 py-2 rounded-lg border border-neutral-200 font-mono text-[#111827] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      data-testid="input-expansion-providers"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-[#6B7280] mb-1">Target utilization</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        value={fullScaleUtilization}
                        onChange={(e) => setFullScaleUtilization(Math.min(95, Math.max(50, Number(e.target.value))))}
                        min={50}
                        max={95}
                        className="flex-1 px-3 py-2 rounded-lg border border-neutral-200 font-mono text-[#111827] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        data-testid="input-expansion-utilization"
                      />
                      <span className="text-[#6B7280] font-medium">%</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
                    <span className="text-sm text-emerald-700">Projected Value</span>
                    <span className="font-mono font-bold text-emerald-600">{formatCurrency(fullScale.value)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Results Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-orange-200 p-5 text-center">
                <div className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Current</div>
                <div className="font-mono font-bold text-2xl text-[#111827] mb-1">{formatCurrency(pilot.value)}</div>
                <div className="text-xs text-[#6B7280] mb-2">annual value</div>
                <div className="text-sm font-semibold text-[#111827]">{pilot.roi}x ROI</div>
              </div>
              
              <div className="bg-white rounded-xl border border-emerald-200 p-5 text-center">
                <div className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Expanded</div>
                <div className="font-mono font-bold text-2xl text-emerald-600 mb-1">{formatCurrency(fullScale.value)}</div>
                <div className="text-xs text-[#6B7280] mb-2">annual value</div>
                <div className="text-sm font-semibold text-[#111827]">{fullScale.roi}x ROI</div>
              </div>
              
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border border-emerald-300 p-5 text-center">
                <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">Gain</div>
                <div className="font-mono font-bold text-2xl text-emerald-600 mb-1">+{formatCurrency(expansionPotential)}</div>
                <div className="text-xs text-emerald-700 mb-2">additional per year</div>
                <div className="text-sm font-semibold text-emerald-800">{valueMultiple}x more value</div>
              </div>
            </div>
          </div>
        </section>

        {/* Key Insight */}
        <section className="flex gap-4 p-5 bg-amber-50 border border-amber-200 rounded-xl mb-8">
          <div className="p-2 bg-amber-100 rounded-lg h-fit">
            <Lightbulb className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[#111827] mb-1">KEY INSIGHT</h4>
            <p className="text-sm text-[#6B7280]">
              Your {deploymentData.monthsOnAbridge}-month pilot has proven {pilotROI.toFixed(1)}x ROI. 
              Expanding from {pilotProviders} to {fullScaleProviders} providers would add {formatCurrency(expansionPotential)} in annual value — 
              that's {valueMultiple}x your current return.
            </p>
          </div>
        </section>

        {/* Actions */}
        <section className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button variant="outline" className="gap-2" data-testid="button-export-pdf">
            <FileText className="w-4 h-4" />
            Export PDF
          </Button>
          <Button variant="outline" className="gap-2" data-testid="button-share-email">
            <Mail className="w-4 h-4" />
            Share via Email
          </Button>
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={handleCopyLink}
            data-testid="button-copy-link"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy Link"}
          </Button>
        </section>
      </main>
    </div>
  );
}
