import { useState, useMemo } from "react";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from "recharts";
import { type MeasureState, generateTrendData } from "@/lib/measureCalculator";

interface MeasureTrendsProps {
  state: MeasureState;
  onBack: () => void;
}

const METRIC_OPTIONS = [
  { value: 'wrvu', label: 'wRVU per Encounter' },
  { value: 'emLevel', label: 'Avg E&M Level' },
  { value: 'timeInNotes', label: 'Time in Notes' },
  { value: 'sameDayClosure', label: 'Same-day Closure' },
];

export default function MeasureTrends({ state, onBack }: MeasureTrendsProps) {
  const [selectedMetric, setSelectedMetric] = useState('wrvu');
  
  const trendData = useMemo(() => 
    generateTrendData(state.deployment.monthsOnAbridge, selectedMetric),
    [state.deployment.monthsOnAbridge, selectedMetric]
  );
  
  const metricLabel = METRIC_OPTIONS.find(m => m.value === selectedMetric)?.label || 'wRVU per Encounter';
  
  const firstValue = trendData[0]?.abridge || 0;
  const lastValue = trendData[trendData.length - 1]?.abridge || 0;
  const baseline = trendData[0]?.baseline || 0;
  
  const firstLift = ((firstValue - baseline) / baseline * 100).toFixed(0);
  const lastLift = ((lastValue - baseline) / baseline * 100).toFixed(0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="text-slate-600 hover:text-slate-900 transition-colors text-sm flex items-center gap-1"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Summary
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3" data-testid="text-trends-title">
            YOUR JOURNEY
          </h1>
          <p className="text-lg text-slate-600">
            Here's how your metrics have evolved since you started with Abridge.
          </p>
        </motion.div>

        <motion.div 
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <label className="text-sm font-medium text-slate-700 mb-2 block">Select metric</label>
          <Select value={selectedMetric} onValueChange={setSelectedMetric}>
            <SelectTrigger className="w-full md:w-64" data-testid="select-metric">
              <SelectValue placeholder="Select metric" />
            </SelectTrigger>
            <SelectContent>
              {METRIC_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        <motion.div 
          className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-lg font-bold text-slate-900 mb-4">{metricLabel} Over Time</h3>
          
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <YAxis 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  domain={['auto', 'auto']}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Legend />
                <ReferenceLine 
                  y={baseline} 
                  stroke="#94a3b8" 
                  strokeDasharray="5 5" 
                  label={{ value: 'Non-Abridge Baseline', fill: '#94a3b8', fontSize: 11 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="abridge" 
                  name="With Abridge"
                  stroke="#6366f1" 
                  strokeWidth={3}
                  dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#6366f1' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div 
          className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-200 p-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">WHAT THIS SHOWS</h3>
              <p className="text-sm text-slate-600 mt-1">
                The gap between Abridge and non-Abridge encounters has remained consistent—and is actually growing. This isn't a fluke. It's a sustained improvement in documentation quality.
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-white/70 rounded-xl p-4">
              <p className="text-sm text-slate-500">Month 1</p>
              <p className="text-lg font-bold text-indigo-600">+{firstLift}% {metricLabel.toLowerCase().includes('time') ? 'reduction' : 'lift'}</p>
            </div>
            <div className="bg-white/70 rounded-xl p-4">
              <p className="text-sm text-slate-500">Month {state.deployment.monthsOnAbridge}</p>
              <p className="text-lg font-bold text-indigo-600">+{lastLift}% {metricLabel.toLowerCase().includes('time') ? 'reduction' : 'lift'}</p>
            </div>
          </div>
        </motion.div>

        <Button
          variant="outline"
          onClick={onBack}
          className="w-full h-12 text-base font-medium border-2"
          data-testid="button-back-bottom"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Summary
        </Button>
      </div>
    </div>
  );
}
