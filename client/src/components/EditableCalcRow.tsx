import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, X, Check, Lightbulb } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface EditableCalcRowProps {
  label: string;
  value: number;
  unit?: string;
  prefix?: string;
  isEditable?: boolean;
  isCustomized?: boolean;
  defaultValue?: number;
  postureName?: string;
  typicalRange?: { min: number; max: number };
  onSave: (newValue: number) => void;
  calculateImpact?: (newValue: number) => { 
    newTotal: number; 
    delta: number; 
    percentChange: number;
    affectedValues?: { label: string; oldValue: string; newValue: string }[];
  };
  driverName?: string;
}

export function EditableCalcRow({
  label,
  value,
  unit = "",
  prefix = "",
  isEditable = false,
  isCustomized = false,
  defaultValue,
  postureName = "Typical",
  typicalRange,
  onSave,
  calculateImpact,
  driverName = "",
}: EditableCalcRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string>(value.toString());
  const [impact, setImpact] = useState<{
    newTotal: number;
    delta: number;
    percentChange: number;
    affectedValues?: { label: string; oldValue: string; newValue: string }[];
  } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (isEditing && inputRef.current && !isMobile) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing, isMobile]);

  useEffect(() => {
    setEditValue(value.toString());
  }, [value]);

  const calculateDebounced = useCallback((val: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const numVal = parseFloat(val);
      if (!isNaN(numVal) && calculateImpact) {
        setImpact(calculateImpact(numVal));
      }
    }, 300);
  }, [calculateImpact]);

  const handleInputChange = (val: string) => {
    setEditValue(val);
    calculateDebounced(val);
  };

  const handleSave = () => {
    const numVal = parseFloat(editValue);
    if (!isNaN(numVal)) {
      onSave(numVal);
      setIsEditing(false);
      setImpact(null);
    }
  };

  const handleCancel = () => {
    setEditValue(value.toString());
    setIsEditing(false);
    setImpact(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") handleCancel();
  };

  const formatDisplayValue = () => {
    if (prefix) return `${prefix}${value.toLocaleString()}`;
    if (unit) return `${value.toLocaleString()} ${unit}`;
    return value.toLocaleString();
  };

  const renderEditContent = () => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={editValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-24 h-8 text-[16px] font-semibold tabular-nums border-2 border-[#EA2C00] bg-[#FFFBF5] focus:ring-2 focus:ring-[#EA2C00]/20"
          data-testid="input-inline-edit"
        />
        <span className="text-[14px] text-[#6B7280]">{unit}</span>
        <Button
          size="sm"
          onClick={handleSave}
          className="h-8 px-3 bg-[#EA2C00] hover:bg-[#D4421E] text-white text-[13px]"
          data-testid="button-save-inline"
        >
          <Check className="h-3.5 w-3.5 mr-1" />
          Save
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCancel}
          className="h-8 px-3 text-[13px] text-[#6B7280] border-[#E5E7EB]"
          data-testid="button-cancel-inline"
        >
          Cancel
        </Button>
      </div>

      {typicalRange && (
        <p className="text-[13px] text-[#6B7280]">
          Typical range: {typicalRange.min}–{typicalRange.max}{unit ? ` ${unit}` : ""} | Your current: {value} ({postureName} posture)
        </p>
      )}

      {impact && (
        <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-md p-3 mt-3">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-[#1E40AF] mt-0.5 shrink-0" />
            <div className="text-[13px] text-[#1E40AF]">
              <p>
                <span className="font-semibold">Impact:</span> Changing to {editValue} would {impact.delta >= 0 ? "increase" : "decrease"} {driverName} value by ${Math.abs(impact.delta).toLocaleString()} ({impact.percentChange >= 0 ? "+" : ""}{impact.percentChange.toFixed(0)}%)
              </p>
              {impact.affectedValues && impact.affectedValues.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {impact.affectedValues.map((av, i) => (
                    <li key={i}>• {av.label}: {av.oldValue} → {av.newValue}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isMobile && isEditing) {
    return (
      <>
        <div className="flex justify-between items-baseline gap-2">
          <span className="text-[14px] text-[#6B7280]">{label}</span>
          <div className="flex items-center gap-2">
            <span className="text-[16px] text-[#111827] font-semibold tabular-nums">
              {formatDisplayValue()}
            </span>
            {isCustomized && <Settings className="h-3.5 w-3.5 text-[#6B7280]" />}
          </div>
        </div>
        <Sheet open={isEditing} onOpenChange={(open) => !open && handleCancel()}>
          <SheetContent side="bottom" className="rounded-t-xl max-h-[80vh] overflow-y-auto">
            <SheetHeader className="mb-6">
              <SheetTitle className="text-left">Edit {label}</SheetTitle>
            </SheetHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#6B7280] mb-2">
                  Current value:
                </label>
                <div className="flex items-center gap-2">
                  {prefix && <span className="text-[16px] text-[#6B7280]">{prefix}</span>}
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={editValue}
                    onChange={(e) => handleInputChange(e.target.value)}
                    className="flex-1 h-12 text-[18px] font-semibold tabular-nums border-2 border-[#EA2C00] bg-[#FFFBF5]"
                    autoFocus
                    data-testid="input-mobile-edit"
                  />
                  {unit && <span className="text-[16px] text-[#6B7280]">{unit}</span>}
                </div>
              </div>

              {typicalRange && (
                <div className="text-[14px] text-[#6B7280] space-y-1">
                  <p>Typical range: {typicalRange.min}–{typicalRange.max}{unit ? ` ${unit}` : ""}</p>
                  <p>Your posture default: {defaultValue ?? value} ({postureName})</p>
                </div>
              )}

              {impact && (
                <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-5 w-5 text-[#1E40AF] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[14px] font-semibold text-[#1E40AF] mb-2">Impact Preview</p>
                      <p className="text-[14px] text-[#1E40AF]">
                        Changing to {editValue} would {impact.delta >= 0 ? "increase" : "decrease"} {driverName} value by ${Math.abs(impact.delta).toLocaleString()} ({impact.percentChange >= 0 ? "+" : ""}{impact.percentChange.toFixed(0)}%)
                      </p>
                      {impact.affectedValues && impact.affectedValues.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-[#BFDBFE]">
                          <p className="text-[13px] font-medium text-[#1E40AF] mb-1">Affected values:</p>
                          <ul className="text-[13px] text-[#1E40AF] space-y-1">
                            {impact.affectedValues.map((av, i) => (
                              <li key={i}>• {av.label}: {av.oldValue} → {av.newValue}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-[#E5E7EB]">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="flex-1 h-12 text-[15px]"
                  data-testid="button-mobile-cancel"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  className="flex-1 h-12 text-[15px] bg-[#EA2C00] hover:bg-[#D4421E] text-white"
                  data-testid="button-mobile-save"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <div className="flex justify-between items-baseline gap-2">
      <span className="text-[14px] text-[#6B7280]">{label}</span>
      <div className="flex items-center gap-2">
        {isEditing ? (
          renderEditContent()
        ) : (
          <>
            <span className="text-[16px] text-[#111827] font-semibold tabular-nums">
              {formatDisplayValue()}
            </span>
            {isCustomized && (
              <span title="Customized value">
                <Settings className="h-3.5 w-3.5 text-[#6B7280]" />
              </span>
            )}
            {isEditable && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-[13px] text-[#EA2C00] hover:text-[#D4421E] font-medium ml-1"
                data-testid={`button-edit-${label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                [Edit]
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface CalcRowProps {
  label: string;
  value: string | number;
  isResult?: boolean;
  isFinal?: boolean;
}

export function CalcRow({ label, value, isResult = false, isFinal = false }: CalcRowProps) {
  const valueFormatted = typeof value === "number" ? value.toLocaleString() : value;
  
  return (
    <div className={`flex justify-between items-baseline ${isResult ? "pt-2 border-t border-[#E5E7EB]" : ""}`}>
      <span className={`text-[14px] ${isFinal ? "font-semibold" : ""} text-[#6B7280]`}>
        {label}
      </span>
      <span className={`text-[16px] tabular-nums ${isResult ? "text-[#EA2C00] font-semibold" : "text-[#111827] font-semibold"} ${isFinal ? "font-bold" : ""}`}>
        {valueFormatted}
      </span>
    </div>
  );
}

interface CalcStepProps {
  stepNumber: number;
  title: string;
  children: React.ReactNode;
  note?: string;
  isLast?: boolean;
}

export function CalcStep({ stepNumber, title, children, note, isLast = false }: CalcStepProps) {
  return (
    <div className={`${isLast ? "" : "mb-6"} ${stepNumber > 1 ? "pt-6 border-t border-[#E5E7EB]" : ""}`}>
      <h4 className="text-[13px] font-bold text-[#6B7280] uppercase tracking-[0.05em] mb-4">
        Step {stepNumber}: {title}
      </h4>
      <div className="space-y-2">
        {children}
      </div>
      {note && (
        <p className="text-[13px] text-[#6B7280] italic mt-3">
          {note}
        </p>
      )}
    </div>
  );
}
