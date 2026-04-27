import { useState } from "react";
import { Trash2, Pencil, Check, X } from "lucide-react";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import {
  SETTING_LABELS,
  computeAddedSettingValue,
  type ForecastScenarioLevel,
} from "@/lib/forecastDefaults";
import type { ForecastAddedSetting } from "@/lib/measureCalculator";

interface AddedSettingCardProps {
  added: ForecastAddedSetting;
  onUpdate: (updates: Partial<ForecastAddedSetting>) => void;
  onRemove: () => void;
}

const SCENARIO_LABELS: Record<ForecastScenarioLevel, string> = {
  conservative: 'Conservative',
  typical: 'Typical',
  optimistic: 'Optimistic',
};

export default function AddedSettingCard({ added, onUpdate, onRemove }: AddedSettingCardProps) {
  const [editingValue, setEditingValue] = useState(false);
  const [tempValue, setTempValue] = useState(added.customValueOverride ?? 0);

  const computedValue = computeAddedSettingValue(added);
  const isOverridden = added.customValueOverride !== undefined && added.customValueOverride > 0;
  const isNursing = added.setting === 'nursing';

  const formatCurrency = (n: number) => '$' + Math.round(n).toLocaleString();
  const formatNumber = (n: number) => n.toLocaleString();

  return (
    <div className="bg-white rounded-lg border border-[#E5E5E5] p-4" data-testid={`added-setting-${added.id}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-black">{SETTING_LABELS[added.setting]}</p>
            <span className="text-[10px] font-medium text-[#888888] bg-[#F5F0EB] px-1.5 py-0.5 rounded uppercase tracking-wide">
              Modeled
            </span>
          </div>
          <p className="text-xs text-[#888888]">
            {formatNumber(added.providers)} {isNursing ? 'nurse FTEs' : 'providers'} · {added.utilizationPercent}% util
            {isNursing && added.staffedBeds > 0 && ` · ${formatNumber(added.staffedBeds)} beds`}
          </p>
        </div>
        <button
          onClick={onRemove}
          className="p-1.5 text-[#888888] hover:text-[#EA2C00] hover:bg-[#FCE8E2] rounded transition-colors"
          data-testid={`remove-added-setting-${added.id}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {(['conservative', 'typical', 'optimistic'] as ForecastScenarioLevel[]).map(s => (
          <button
            key={s}
            onClick={() => onUpdate({ scenario: s })}
            className={`py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
              added.scenario === s ? 'bg-[#EA2C00] text-white' : 'bg-[#F5F0EB] text-[#666666] hover:bg-[#EBE6E1]'
            }`}
            data-testid={`scenario-${added.id}-${s}`}
          >
            {SCENARIO_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="bg-[#F5F0EB] rounded-lg p-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-medium text-[#666666]">
            Estimated annual value
            {isOverridden && <span className="text-[10px] text-[#EA2C00] ml-1.5 font-semibold uppercase tracking-wide" data-testid={`badge-overridden-${added.id}`}>overridden</span>}
          </p>
          {!editingValue ? (
            <button
              onClick={() => { setTempValue(computedValue); setEditingValue(true); }}
              className="p-1 text-[#888888] hover:text-[#EA2C00] hover:bg-white rounded"
              data-testid={`edit-value-${added.id}`}
            >
              <Pencil className="w-3 h-3" />
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={() => { onUpdate({ customValueOverride: tempValue }); setEditingValue(false); }}
                className="p-1 text-[#EA2C00] hover:bg-white rounded"
                data-testid={`save-value-${added.id}`}
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                onClick={() => { onUpdate({ customValueOverride: undefined }); setEditingValue(false); }}
                className="p-1 text-[#888888] hover:bg-white rounded"
                title="Reset to auto-computed"
                data-testid={`reset-value-${added.id}`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
        {editingValue ? (
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-base font-bold text-[#EA2C00]">$</span>
            <FormattedNumberInput
              value={tempValue}
              onChange={(v: number) => setTempValue(v)}
              className="h-9 bg-white pl-6 text-base font-bold"
              data-testid={`input-custom-value-${added.id}`}
            />
          </div>
        ) : (
          <p className="text-2xl font-bold text-[#EA2C00]" data-testid={`text-value-${added.id}`}>{formatCurrency(computedValue)}</p>
        )}
      </div>
    </div>
  );
}
