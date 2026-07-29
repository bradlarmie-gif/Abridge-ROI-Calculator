import { useMemo, useState, useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, Plus, Check } from "lucide-react";

/**
 * Quick ROI Calculator — turns an Abridge impact-analysis data pull into dollars
 * for a partner. Open to the four care settings, then type the per-encounter
 * deltas straight off the pull (time saved / note, wRVU lift, HCC lift) and the
 * financial levers dollarize them: delta x volume x rate. Every formula is shown.
 * A directional estimate from measured deltas; the full Proforma models detail.
 */

type SettingKey = "outpatient" | "ed" | "inpatient" | "nursing";

interface LeverField { k: string; label: string; def: number; prefix?: string; suffix?: string; step?: number; }
interface Lever {
  id: string;
  domain: "Capacity" | "Revenue" | "Quality" | "Workforce";
  title: string;
  optional?: boolean;
  usesVolume: boolean; // whether the annual-volume input feeds this lever
  fields: LeverField[];
  compute: (volume: number, f: Record<string, number>) => number;
  formula: (volume: number, f: Record<string, number>) => string;
}
interface SettingCfg {
  label: string;
  blurb: string;
  volumeLabel: string;
  volumeDefault: number;
  levers: Lever[];
}

const fmtInt = (n: number) => Math.round(n).toLocaleString("en-US");
const fmtShort = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1e6) return `$${(n / 1e6).toFixed(2).replace(/\.?0+$/, "")}M`;
  if (a >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
};

// Physician settings share the same three levers; defaults differ per setting.
const physicianLevers = (o: { minSaved: number; valPerHr: number; wrvuLift: number }): Lever[] => [
  {
    id: "time", domain: "Capacity", title: "Reclaimed documentation time", usesVolume: true,
    fields: [
      { k: "minSaved", label: "Minutes saved per note", def: o.minSaved, suffix: "min", step: 0.1 },
      { k: "valPerHr", label: "Value per reclaimed clinical hour", def: o.valPerHr, prefix: "$" },
    ],
    compute: (v, f) => v * (f.minSaved / 60) * f.valPerHr,
    formula: (v, f) => `${fmtInt(v)} encounters × ${f.minSaved} min ÷ 60 × $${fmtInt(f.valPerHr)}/hr`,
  },
  {
    id: "coding", domain: "Revenue", title: "Coding accuracy · wRVU lift", usesVolume: true,
    fields: [
      { k: "wrvuLift", label: "wRVU lift per encounter", def: o.wrvuLift, step: 0.01 },
      { k: "cf", label: "Dollars per wRVU (2026 CF)", def: 33.4, prefix: "$" },
    ],
    compute: (v, f) => v * f.wrvuLift * f.cf,
    formula: (v, f) => `${fmtInt(v)} encounters × ${f.wrvuLift} wRVU × $${f.cf}/wRVU`,
  },
  {
    id: "hcc", domain: "Revenue", title: "Risk capture · HCC", optional: true, usesVolume: false,
    fields: [
      { k: "hccYr", label: "Additional HCCs captured per year", def: 0 },
      { k: "perHcc", label: "Value per HCC", def: 1200, prefix: "$" },
    ],
    compute: (_v, f) => f.hccYr * f.perHcc,
    formula: (_v, f) => `${fmtInt(f.hccYr)} HCCs × $${fmtInt(f.perHcc)} each`,
  },
];

const CFG: Record<SettingKey, SettingCfg> = {
  outpatient: {
    label: "Outpatient", blurb: "Office visits, primary care and specialty. E/M coding and reclaimed clinic time.",
    volumeLabel: "Annual Abridge-documented encounters", volumeDefault: 300000,
    levers: physicianLevers({ minSaved: 1.1, valPerHr: 150, wrvuLift: 0.08 }),
  },
  ed: {
    label: "Emergency", blurb: "The emergency department. Coding accuracy and time back at the bedside.",
    volumeLabel: "Annual Abridge-documented ED visits", volumeDefault: 120000,
    levers: physicianLevers({ minSaved: 1.3, valPerHr: 200, wrvuLift: 0.1 }),
  },
  inpatient: {
    label: "Inpatient", blurb: "Hospital medicine. Documentation completeness and reclaimed rounding time.",
    volumeLabel: "Annual Abridge-documented encounters", volumeDefault: 60000,
    levers: physicianLevers({ minSaved: 2.5, valPerHr: 175, wrvuLift: 0.09 }),
  },
  nursing: {
    label: "Nursing", blurb: "Inpatient nursing. Documentation-driven overtime and harm prevention.",
    volumeLabel: "Annual care events documented", volumeDefault: 400000,
    levers: [
      {
        id: "overtime", domain: "Capacity", title: "Reclaimed time · overtime avoided", usesVolume: true,
        fields: [
          { k: "minSaved", label: "Minutes saved per care event", def: 1.0, suffix: "min", step: 0.1 },
          { k: "otRate", label: "Overtime rate per hour", def: 65, prefix: "$" },
        ],
        compute: (v, f) => v * (f.minSaved / 60) * f.otRate,
        formula: (v, f) => `${fmtInt(v)} events × ${f.minSaved} min ÷ 60 × $${fmtInt(f.otRate)}/hr`,
      },
      {
        id: "harm", domain: "Quality", title: "Harm prevention", optional: true, usesVolume: false,
        fields: [
          { k: "events", label: "Harm events prevented per year", def: 0 },
          { k: "perEvent", label: "Cost per event avoided", def: 20000, prefix: "$" },
        ],
        compute: (_v, f) => f.events * f.perEvent,
        formula: (_v, f) => `${fmtInt(f.events)} events × $${fmtInt(f.perEvent)} each`,
      },
    ],
  },
};

const DOMAIN_TINT: Record<string, string> = {
  Revenue: "bg-[#FBEAE4] text-[#B02200]",
  Capacity: "bg-[#F3EEE7] text-[#7A6E5F]",
  Quality: "bg-[#F0EBE2] text-[#8C8073]",
  Workforce: "bg-[#F3EEE7] text-[#7A6E5F]",
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

interface Props { onBack: () => void; onHome: () => void; }

export default function QuickRoiCalculator({ onBack, onHome }: Props) {
  const [setting, setSetting] = useState<SettingKey | null>(null);

  return (
    <div className="min-h-screen bg-[#FDFCFA] text-[#5E534A] antialiased">
      <div className="h-16 border-b border-[#E8E2DA]">
        <div className="max-w-[1120px] mx-auto h-full px-5 sm:px-8 lg:px-14 flex items-center gap-3">
          <button onClick={() => (setting ? setSetting(null) : onBack())} aria-label="Back" className="w-8 h-8 rounded-full border border-[#E8E2DA] bg-white flex items-center justify-center text-[#5E534A] hover:text-[#EA2C00] hover:border-[#EA2C00] transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button onClick={onHome} className="font-abridge text-[22px] text-[#EA2C00] tracking-[0.03em]">ABRIDGE</button>
          <span className="hidden sm:inline text-[#B4A896]">|</span>
          <span className="hidden sm:inline text-[11px] font-extrabold tracking-[0.14em] uppercase text-[#8C8073]">ROI Calculator</span>
        </div>
      </div>

      <div className="max-w-[1120px] mx-auto px-5 sm:px-8 lg:px-14">
        {setting === null ? <SettingPicker onPick={setSetting} /> : <Calculator key={setting} setting={setting} onChangeSetting={() => setSetting(null)} />}
      </div>
    </div>
  );
}

function SettingPicker({ onPick }: { onPick: (s: SettingKey) => void }) {
  return (
    <div className="pt-12 sm:pt-16 pb-24">
      <div className="text-[11.5px] font-extrabold tracking-[0.15em] uppercase text-[#443A32]">Quick ROI</div>
      <h1 className="font-abridge text-[34px] sm:text-[44px] leading-[1.06] text-[#1A1A1A] mt-4 max-w-[760px]">How much is Abridge making your partner?</h1>
      <p className="mt-4 text-[15px] sm:text-[16px] leading-[1.55] text-[#5E534A] max-w-[620px]">
        Pull the per-encounter deltas from the impact analysis, type them in, and get the dollars. Start with the care setting.
      </p>
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(Object.keys(CFG) as SettingKey[]).map((k) => (
          <button key={k} onClick={() => onPick(k)}
            className="group text-left border border-[#E8E2DA] rounded-[20px] bg-[#FDFBF8] p-7 hover:border-[#EA2C00] hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)] transition-all">
            <div className="flex items-center justify-between">
              <span className="font-abridge text-[26px] text-[#1A1A1A]">{CFG[k].label}</span>
              <ArrowRight className="w-5 h-5 text-[#B4A896] group-hover:text-[#EA2C00] transition-colors" />
            </div>
            <p className="mt-2.5 text-[13.5px] leading-[1.5] text-[#8C8073]">{CFG[k].blurb}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function Calculator({ setting, onChangeSetting }: { setting: SettingKey; onChangeSetting: () => void }) {
  const cfg = CFG[setting];
  const [volume, setVolume] = useState(cfg.volumeDefault);
  const [fields, setFields] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    cfg.levers.forEach((l) => l.fields.forEach((f) => { init[`${l.id}.${f.k}`] = f.def; }));
    return init;
  });
  const [on, setOn] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    cfg.levers.forEach((l) => { init[l.id] = !l.optional; });
    return init;
  });
  const [price, setPrice] = useState(0);

  const set = (key: string, v: number) => setFields((p) => ({ ...p, [key]: v }));

  const results = useMemo(() => cfg.levers.map((l) => {
    const f: Record<string, number> = {};
    l.fields.forEach((fd) => { f[fd.k] = fields[`${l.id}.${fd.k}`] ?? fd.def; });
    const value = on[l.id] ? l.compute(l.usesVolume ? volume : 0, f) : 0;
    return { lever: l, f, value };
  }), [cfg, fields, on, volume]);

  const total = results.reduce((s, r) => s + r.value, 0);
  const totalShown = useCountUp(total);
  const roi = price > 0 ? total / price : 0;

  return (
    <div className="pt-10 pb-24">
      <div className="flex items-center gap-3 mb-2">
        <div className="text-[11.5px] font-extrabold tracking-[0.15em] uppercase text-[#443A32]">Quick ROI · {cfg.label}</div>
        <button onClick={onChangeSetting} className="text-[11px] font-bold text-[#B4A896] hover:text-[#EA2C00] transition-colors">change</button>
      </div>
      <h1 className="font-abridge text-[30px] sm:text-[38px] leading-[1.08] text-[#1A1A1A] max-w-[720px]">The dollars, from your data pull.</h1>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-6">
        {/* levers */}
        <div className="space-y-4">
          {/* volume */}
          <div className="border border-[#E8E2DA] rounded-[20px] bg-[#FDFBF8] p-6">
            <div className="text-[11px] font-extrabold tracking-[0.1em] uppercase text-[#443A32] mb-1">Volume</div>
            <Field label={cfg.volumeLabel} value={volume} onChange={setVolume} last />
          </div>

          {results.map(({ lever, value }) => (
            <div key={lever.id} className={`border rounded-[20px] p-6 transition-colors ${on[lever.id] ? "border-[#E8E2DA] bg-[#FDFBF8]" : "border-dashed border-[#E8E2DA] bg-[#FBF9F5]"}`}>
              <div className="flex items-start justify-between gap-3 mb-1">
                <div className="flex items-center gap-2.5">
                  <span className={`text-[10px] font-extrabold tracking-[0.08em] uppercase px-2 py-1 rounded-full ${DOMAIN_TINT[lever.domain]}`}>{lever.domain}</span>
                  <span className="text-[16px] font-bold text-[#1A1A1A]">{lever.title}</span>
                </div>
                {lever.optional && (
                  <button onClick={() => setOn((p) => ({ ...p, [lever.id]: !p[lever.id] }))}
                    className={`flex items-center gap-1 text-[11px] font-bold rounded-full px-2.5 py-1 transition-colors ${on[lever.id] ? "bg-[#FBEAE4] text-[#B02200]" : "border border-[#E8E2DA] text-[#8C8073] hover:border-[#EA2C00] hover:text-[#EA2C00]"}`}>
                    {on[lever.id] ? <><Check className="w-3 h-3" /> On</> : <><Plus className="w-3 h-3" /> Add</>}
                  </button>
                )}
              </div>
              {on[lever.id] && (
                <>
                  {lever.fields.map((fd) => (
                    <Field key={fd.k} label={fd.label} value={fields[`${lever.id}.${fd.k}`]} onChange={(v) => set(`${lever.id}.${fd.k}`, v)} prefix={fd.prefix} suffix={fd.suffix} step={fd.step} />
                  ))}
                  <div className="flex items-center justify-between pt-4 mt-1 border-t border-[#EFE9E0]">
                    <span className="text-[12px] text-[#8C8073] italic pr-3">{lever.formula(lever.usesVolume ? volume : 0, Object.fromEntries(lever.fields.map((fd) => [fd.k, fields[`${lever.id}.${fd.k}`] ?? fd.def])))}</span>
                    <span className="font-abridge text-[22px] text-[#EA2C00] whitespace-nowrap">{fmtShort(value)}</span>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* result rail */}
        <div className="lg:sticky lg:top-6 self-start">
          <div className="border border-[#E8E2DA] rounded-[22px] bg-[#FDFBF8] p-7">
            <div className="text-[11px] font-extrabold tracking-[0.12em] uppercase text-[#443A32] mb-3">Annual value to your partner</div>
            <div className="font-abridge text-[52px] leading-[0.95] text-[#EA2C00]">{fmtShort(totalShown)}<span className="text-[24px] text-[#B4A896]"> / yr</span></div>

            <div className="mt-6 space-y-2.5">
              {results.filter((r) => r.value > 0).map((r) => (
                <div key={r.lever.id} className="flex items-center justify-between text-[13px]">
                  <span className="text-[#5E534A]">{r.lever.title}</span>
                  <span className="font-abridge text-[15px] text-[#1A1A1A] tabular-nums">{fmtShort(r.value)}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-5 border-t border-[#EFE9E0]">
              <Field label="Abridge annual price (optional)" value={price} onChange={setPrice} prefix="$" last />
              {price > 0 && (
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="font-abridge text-[34px] text-[#1A1A1A]">{roi.toFixed(1)}×</span>
                  <span className="text-[12px] text-[#8C8073]">return · {fmtShort(total - price)} net</span>
                </div>
              )}
            </div>

            <p className="mt-5 text-[12px] leading-[1.55] text-[#8C8073]">
              A directional estimate from the deltas you entered, valued at the rates shown. Read alongside the analysis caveats; the full Proforma models it in detail.
            </p>
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
    <div className={`flex items-center justify-between gap-4 py-3 ${last ? "" : "border-b border-[#EFE9E0]"}`}>
      <label className="text-[13.5px] font-semibold text-[#443A32] leading-snug">{label}</label>
      <div className="flex items-center gap-1.5 bg-white border border-[#E8E2DA] rounded-[10px] px-3 h-10 focus-within:border-[#EA2C00] transition-colors flex-shrink-0">
        {prefix && <span className="text-[13px] text-[#8C8073]">{prefix}</span>}
        <input type="number" step={step} value={Number.isFinite(value) ? value : ""}
          onChange={(e) => onChange(e.target.value === "" ? 0 : parseFloat(e.target.value))}
          className="w-[110px] bg-transparent outline-none text-right text-[15px] font-bold text-[#1A1A1A] tabular-nums" />
        {suffix && <span className="text-[13px] text-[#8C8073]">{suffix}</span>}
      </div>
    </div>
  );
}
