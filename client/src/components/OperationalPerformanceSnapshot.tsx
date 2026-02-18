import { useState } from "react";
import { X, Users, Clock, Pencil, ClipboardList, Heart, TrendingUp } from "lucide-react";
import { ABRIDGE_BENCHMARKS, type SwitchInputs } from "@/lib/switchGapCalculator";

interface OperationalPerformanceSnapshotProps {
  inputs: SwitchInputs;
  updateInput: <K extends keyof SwitchInputs>(key: K, value: SwitchInputs[K]) => void;
  onClose: () => void;
}

interface MetricDef {
  key: keyof SwitchInputs;
  label: string;
  description: string;
  icon: typeof Users;
  presets: { label: string; value: number }[];
  unit: string;
  prefix?: string;
  min: number;
  max: number;
  step: number;
  benchmark: string;
  testId: string;
}

const METRICS: MetricDef[] = [
  {
    key: "utilization",
    label: "Utilization",
    description: "% encounters documented with AI",
    icon: Users,
    presets: [{ label: "30%", value: 30 }, { label: "50%", value: 50 }, { label: "75%", value: 75 }],
    unit: "%",
    min: 0, max: 100, step: 5,
    benchmark: "70–80%",
    testId: "snap-utilization",
  },
  {
    key: "timeSavedPerEncounter",
    label: "Time Saved",
    description: "Minutes saved per encounter",
    icon: Clock,
    presets: [{ label: "1 min", value: 1 }, { label: "2.5", value: 2.5 }, { label: "4", value: 4 }],
    unit: " min",
    min: 0, max: 6, step: 0.5,
    benchmark: "3–5 min",
    testId: "snap-time-saved",
  },
  {
    key: "editTimePerEncounter",
    label: "Edit Time",
    description: "Minutes correcting AI output",
    icon: Pencil,
    presets: [{ label: "0.5", value: 0.5 }, { label: "1 min", value: 1 }, { label: "2", value: 2 }],
    unit: " min",
    min: 0, max: 10, step: 0.5,
    benchmark: "< 1 min",
    testId: "snap-edit-time",
  },
  {
    key: "docCompleteness",
    label: "Note Acceptance",
    description: "AI note used without major edits",
    icon: ClipboardList,
    presets: [{ label: "50%", value: 50 }, { label: "65%", value: 65 }, { label: "80%", value: 80 }],
    unit: "%",
    min: 0, max: 100, step: 5,
    benchmark: "75–85%",
    testId: "snap-note-acceptance",
  },
  {
    key: "satisfaction",
    label: "Satisfaction",
    description: "Would recommend current AI",
    icon: Heart,
    presets: [{ label: "50%", value: 50 }, { label: "65%", value: 65 }, { label: "80%", value: 80 }],
    unit: "%",
    min: 0, max: 100, step: 5,
    benchmark: "80–90%",
    testId: "snap-satisfaction",
  },
  {
    key: "wrvuLift",
    label: "Coding Impact",
    description: "Observed wRVU change",
    icon: TrendingUp,
    presets: [{ label: "+1%", value: 1 }, { label: "+3%", value: 3 }, { label: "+5%", value: 5 }],
    unit: "%",
    prefix: "+",
    min: 0, max: 12, step: 0.5,
    benchmark: "+4–7%",
    testId: "snap-coding-impact",
  },
];

function CompactMetric({
  metric,
  value,
  onChange,
}: {
  metric: MetricDef;
  value: number;
  onChange: (val: number) => void;
}) {
  const [showSlider, setShowSlider] = useState(false);
  const Icon = metric.icon;
  const fillPct = ((value - metric.min) / (metric.max - metric.min)) * 100;

  return (
    <div className="border border-[#E5E7EB] rounded-lg p-3" data-testid={metric.testId}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5 text-[#EA2C00] shrink-0" />
        <span className="text-xs font-medium text-[#1A1A1A]">{metric.label}</span>
        <span className="text-[10px] text-[#999] ml-auto">{metric.description}</span>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {metric.presets.map((p) => {
          const isActive = !showSlider && value === p.value;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => { setShowSlider(false); onChange(p.value); }}
              data-testid={`${metric.testId}-preset-${p.value}`}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                isActive
                  ? "bg-[#EA2C00] text-white"
                  : "bg-white text-[#666] border border-[#E5E7EB] hover:border-[#EA2C00]/30"
              }`}
            >
              {p.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setShowSlider(true)}
          data-testid={`${metric.testId}-custom`}
          className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
            showSlider
              ? "bg-[#EA2C00] text-white"
              : "bg-white text-[#666] border border-[#E5E7EB] hover:border-[#EA2C00]/30"
          }`}
        >
          Custom
        </button>
      </div>

      {showSlider && (
        <div className="flex items-center gap-2 mt-1.5">
          <input
            type="range"
            min={metric.min}
            max={metric.max}
            step={metric.step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #EA2C00 0%, #EA2C00 ${fillPct}%, #E0E0E0 ${fillPct}%, #E0E0E0 100%)`,
            }}
            data-testid={`${metric.testId}-slider`}
          />
          <span className="text-xs font-semibold text-[#1A1A1A] tabular-nums min-w-[40px] text-right">
            {metric.prefix || ""}{value}{metric.unit}
          </span>
        </div>
      )}

      <p className="text-[9px] text-[#BBB] mt-1">Typical: {metric.benchmark}</p>
    </div>
  );
}

export default function OperationalPerformanceSnapshot({
  inputs,
  updateInput,
  onClose,
}: OperationalPerformanceSnapshotProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      data-testid="modal-performance-snapshot"
    >
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto mx-4">
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-5 py-3 border-b border-[#E5E7EB]">
          <div>
            <h2 className="text-lg font-bold text-[#1A1A1A] font-abridge uppercase tracking-tight" data-testid="text-snapshot-title">
              Operational Performance Snapshot
            </h2>
            <p className="text-[11px] text-[#999] mt-0.5">
              These inputs refine pillar modeling. They do not determine enterprise value directly.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#F5F0EB] transition-colors"
            data-testid="button-close-snapshot"
          >
            <X className="w-4 h-4 text-[#999]" />
          </button>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {METRICS.map((m) => (
              <CompactMetric
                key={m.key}
                metric={m}
                value={(inputs[m.key] as number) || 0}
                onChange={(val) => updateInput(m.key, val as SwitchInputs[typeof m.key])}
              />
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-[#E5E7EB] flex items-center justify-between">
            <p className="text-[10px] text-[#BBB]">
              Values feed into capacity, yield, and workforce calculations.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-[#1A1A1A] text-white text-xs font-medium hover:bg-[#333] transition-colors"
              data-testid="button-done-snapshot"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
