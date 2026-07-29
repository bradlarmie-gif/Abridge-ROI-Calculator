import { useMemo, useState, useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";

/**
 * Quick ROI Calculator — the fast "enter a few numbers, get an answer" path in
 * the ROI Calculator (Forecast) section. One transparent, conservative model:
 * reclaimed documentation time, valued at a clinical-hour rate, against the
 * annual license. Every assumption is a visible, editable field, so the number
 * is never a black box. It is a directional estimate; the full Proforma refines.
 */

type SettingKey = "outpatient" | "ed" | "inpatient" | "nursing";

interface SettingDefaults {
  label: string;
  unitLabel: string; // "providers" | "staffed beds"
  volumeLabel: string; // "annual visits" | "annual patient days"
  minSaved: number;
  valuePerHour: number;
  pricePerUnit: number;
  units: number;
  volume: number;
}

const SETTINGS: Record<SettingKey, SettingDefaults> = {
  outpatient: { label: "Outpatient", unitLabel: "providers", volumeLabel: "annual visits", minSaved: 2, valuePerHour: 150, pricePerUnit: 3000, units: 120, volume: 350000 },
  ed: { label: "Emergency", unitLabel: "providers", volumeLabel: "annual ED visits", minSaved: 2.5, valuePerHour: 200, pricePerUnit: 4000, units: 40, volume: 120000 },
  inpatient: { label: "Inpatient", unitLabel: "providers", volumeLabel: "annual encounters", minSaved: 5, valuePerHour: 175, pricePerUnit: 4000, units: 45, volume: 60000 },
  nursing: { label: "Nursing", unitLabel: "staffed beds", volumeLabel: "annual patient days", minSaved: 3, valuePerHour: 70, pricePerUnit: 1200, units: 180, volume: 55000 },
};

const fmtUSD = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const fmtShort = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1e6) return `$${(n / 1e6).toFixed(2).replace(/\.?0+$/, "")}M`;
  if (a >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
};

function useCountUp(value: number, ms = 500): number {
  const [shown, setShown] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number>();
  useEffect(() => {
    const from = fromRef.current;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(from + (value - from) * eased);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, ms]);
  return shown;
}

interface Props {
  onBack: () => void;
  onHome: () => void;
}

export default function QuickRoiCalculator({ onBack, onHome }: Props) {
  const [setting, setSetting] = useState<SettingKey>("outpatient");
  const d = SETTINGS[setting];

  const [units, setUnits] = useState(d.units);
  const [volume, setVolume] = useState(d.volume);
  const [minSaved, setMinSaved] = useState(d.minSaved);
  const [valuePerHour, setValuePerHour] = useState(d.valuePerHour);
  const [pricePerUnit, setPricePerUnit] = useState(d.pricePerUnit);
  const [adoption, setAdoption] = useState(70);

  // Switching setting reseeds the defaults (a fresh, sensible starting point).
  const pickSetting = (k: SettingKey) => {
    const s = SETTINGS[k];
    setSetting(k);
    setUnits(s.units); setVolume(s.volume); setMinSaved(s.minSaved);
    setValuePerHour(s.valuePerHour); setPricePerUnit(s.pricePerUnit);
  };

  const calc = useMemo(() => {
    const hours = (volume * minSaved) / 60 * (adoption / 100);
    const value = hours * valuePerHour;
    const investment = units * pricePerUnit;
    const roi = investment > 0 ? value / investment : 0;
    const net = value - investment;
    const paybackMonths = value > 0 ? (investment / value) * 12 : null;
    return { hours, value, investment, roi, net, paybackMonths };
  }, [units, volume, minSaved, valuePerHour, pricePerUnit, adoption]);

  const roiShown = useCountUp(calc.roi);
  const valueShown = useCountUp(calc.value);

  return (
    <div className="min-h-screen bg-[#FDFCFA] text-[#5E534A] antialiased">
      {/* header */}
      <div className="h-16 border-b border-[#E8E2DA]">
        <div className="max-w-[1120px] mx-auto h-full px-5 sm:px-8 lg:px-14 flex items-center gap-3">
          <button onClick={onBack} aria-label="Back" className="w-8 h-8 rounded-full border border-[#E8E2DA] bg-white flex items-center justify-center text-[#5E534A] hover:text-[#EA2C00] hover:border-[#EA2C00] transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button onClick={onHome} className="font-abridge text-[22px] text-[#EA2C00] tracking-[0.03em]">ABRIDGE</button>
          <span className="hidden sm:inline text-[#B4A896]">|</span>
          <span className="hidden sm:inline text-[11px] font-extrabold tracking-[0.14em] uppercase text-[#8C8073]">ROI Calculator</span>
        </div>
      </div>

      <div className="max-w-[1120px] mx-auto px-5 sm:px-8 lg:px-14">
        {/* hero */}
        <div className="pt-12 sm:pt-14 pb-8">
          <div className="text-[11.5px] font-extrabold tracking-[0.15em] uppercase text-[#443A32]">Quick ROI</div>
          <h1 className="font-abridge text-[34px] sm:text-[44px] leading-[1.06] text-[#1A1A1A] mt-4 max-w-[720px]">The return, in a few numbers.</h1>
          <p className="mt-4 text-[15px] sm:text-[16px] leading-[1.55] text-[#5E534A] max-w-[600px]">
            A fast, conservative estimate from the documentation time Abridge reclaims. Every assumption below is yours to change, and nothing is hidden. Open the full Proforma when you are ready to model it in detail.
          </p>
        </div>

        {/* setting tabs */}
        <div className="inline-flex flex-wrap gap-1 bg-[#F2EDE5] rounded-[12px] p-1 mb-8">
          {(Object.keys(SETTINGS) as SettingKey[]).map((k) => (
            <button key={k} onClick={() => pickSetting(k)}
              className={setting === k
                ? "text-[13px] font-bold rounded-[9px] px-4 py-2 bg-white shadow-sm text-[#1A1A1A]"
                : "text-[13px] font-semibold rounded-[9px] px-4 py-2 text-[#8C8073] hover:text-[#443A32] transition-colors"}>
              {SETTINGS[k].label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6 pb-24">
          {/* inputs */}
          <div className="border border-[#E8E2DA] rounded-[22px] bg-[#FDFBF8] p-7 sm:p-8">
            <div className="text-[11px] font-extrabold tracking-[0.12em] uppercase text-[#443A32] mb-6">Your numbers</div>
            <Field label={`Number of ${d.unitLabel}`} value={units} onChange={setUnits} />
            <Field label={d.volumeLabel.charAt(0).toUpperCase() + d.volumeLabel.slice(1)} value={volume} onChange={setVolume} />
            <Field label="Minutes saved per encounter" value={minSaved} onChange={setMinSaved} step={0.5} suffix="min" />
            <Field label="Value per reclaimed clinical hour" value={valuePerHour} onChange={setValuePerHour} prefix="$" />
            <Field label={`Abridge price per ${d.unitLabel.replace(/s$/, "")} / year`} value={pricePerUnit} onChange={setPricePerUnit} prefix="$" />
            <Field label="Adoption" value={adoption} onChange={setAdoption} suffix="%" last />
          </div>

          {/* result */}
          <div className="border border-[#E8E2DA] rounded-[22px] bg-[#FDFBF8] p-7 sm:p-8 flex flex-col">
            <div className="text-[11px] font-extrabold tracking-[0.12em] uppercase text-[#443A32] mb-5">Your ROI</div>
            <div className="flex items-end gap-4">
              <div className="font-abridge text-[72px] leading-[0.9] text-[#EA2C00]">{roiShown.toFixed(1)}<span className="text-[36px]">×</span></div>
              <div className="pb-2 text-[13px] text-[#8C8073] leading-[1.4] max-w-[180px]">return on the annual license, at {adoption}% adoption</div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5">
              <Stat label="Annual value" value={fmtShort(valueShown)} strong />
              <Stat label="Annual investment" value={fmtShort(calc.investment)} />
              <Stat label="Net value / year" value={fmtShort(calc.net)} strong />
              <Stat label="Payback" value={calc.paybackMonths === null ? "—" : `${calc.paybackMonths < 1 ? "<1" : Math.round(calc.paybackMonths)} mo`} />
            </div>

            <div className="mt-8 pt-6 border-t border-[#EFE9E0]">
              <div className="text-[11px] font-extrabold tracking-[0.1em] uppercase text-[#443A32] mb-2">The read</div>
              <p className="text-[13.5px] leading-[1.6] text-[#5E534A]">
                {Math.round(calc.hours).toLocaleString()} clinical hours reclaimed a year across {units.toLocaleString()} {d.unitLabel}. Valued conservatively at {fmtUSD(valuePerHour)} an hour, that is {fmtShort(calc.value)} of value against a {fmtShort(calc.investment)} license, about a {calc.roi.toFixed(1)}× return. This counts reclaimed time only. Revenue and quality, which the full model adds, sit on top.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, prefix, suffix, step = 1, last }: {
  label: string; value: number; onChange: (n: number) => void;
  prefix?: string; suffix?: string; step?: number; last?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 py-3.5 ${last ? "" : "border-b border-[#EFE9E0]"}`}>
      <label className="text-[14px] font-semibold text-[#443A32]">{label}</label>
      <div className="flex items-center gap-1.5 bg-white border border-[#E8E2DA] rounded-[10px] px-3 h-11 focus-within:border-[#EA2C00] transition-colors">
        {prefix && <span className="text-[14px] text-[#8C8073]">{prefix}</span>}
        <input
          type="number"
          step={step}
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => onChange(e.target.value === "" ? 0 : parseFloat(e.target.value))}
          className="w-[120px] bg-transparent outline-none text-right text-[16px] font-bold text-[#1A1A1A] tabular-nums"
        />
        {suffix && <span className="text-[14px] text-[#8C8073]">{suffix}</span>}
      </div>
    </div>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <div className="text-[10.5px] font-extrabold tracking-[0.08em] uppercase text-[#8C8073] mb-1.5">{label}</div>
      <div className={`font-abridge ${strong ? "text-[26px] text-[#1A1A1A]" : "text-[22px] text-[#5E534A]"} tabular-nums`}>{value}</div>
    </div>
  );
}
