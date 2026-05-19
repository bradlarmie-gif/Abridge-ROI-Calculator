import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";

interface EmCode {
  code: string;
  label: string;
  section?: string;
}

interface EmDistributionInputProps {
  codes: EmCode[];
  before: Record<string, number>;
  after: Record<string, number>;
  onBeforeChange: (before: Record<string, number>) => void;
  onAfterChange: (after: Record<string, number>) => void;
  driverId: string;
  highComplexityCodes?: string[];
}

// Group codes by section (undefined section = ungrouped)
function groupBySectionOrder(codes: EmCode[]): Array<{ section: string | undefined; codes: EmCode[] }> {
  const seenSections: Array<string | undefined> = [];
  const map = new Map<string | undefined, EmCode[]>();
  for (const c of codes) {
    const key = c.section;
    if (!map.has(key)) {
      map.set(key, []);
      seenSections.push(key);
    }
    map.get(key)!.push(c);
  }
  return seenSections.map(s => ({ section: s, codes: map.get(s)! }));
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; payload: { code: string; beforePct: number; afterPct: number } }>;
  label?: string;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  const delta = data.afterPct - data.beforePct;
  return (
    <div className="bg-white border border-[#E5E5E5] rounded-lg shadow-sm px-3 py-2 text-xs">
      <p className="font-semibold text-black mb-1">{data.code}</p>
      <p className="text-[#888888]">Before: <span className="font-medium text-black">{data.beforePct.toFixed(1)}%</span></p>
      <p className="text-[#888888]">After: <span className="font-medium text-[#EA2C00]">{data.afterPct.toFixed(1)}%</span></p>
      <p className={`font-semibold mt-0.5 ${delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-500' : 'text-[#888888]'}`}>
        Δ {delta >= 0 ? '+' : ''}{delta.toFixed(1)} pp
      </p>
    </div>
  );
}

export default function EmDistributionInput({
  codes,
  before,
  after,
  onBeforeChange,
  onAfterChange,
  driverId,
  highComplexityCodes,
}: EmDistributionInputProps) {
  const groups = useMemo(() => groupBySectionOrder(codes), [codes]);

  const beforeTotal = useMemo(() => codes.reduce((s, c) => s + (before[c.code] ?? 0), 0), [codes, before]);
  const afterTotal = useMemo(() => codes.reduce((s, c) => s + (after[c.code] ?? 0), 0), [codes, after]);
  const totalDelta = afterTotal - beforeTotal;

  const hasData = beforeTotal > 0 || afterTotal > 0;

  const chartData = useMemo(() => {
    return codes.map(c => {
      const b = before[c.code] ?? 0;
      const a = after[c.code] ?? 0;
      const beforePct = beforeTotal > 0 ? (b / beforeTotal) * 100 : 0;
      const afterPct = afterTotal > 0 ? (a / afterTotal) * 100 : 0;
      return { code: c.code, beforePct, afterPct };
    });
  }, [codes, before, after, beforeTotal, afterTotal]);

  const highComplexityCallout = useMemo(() => {
    if (!highComplexityCodes || highComplexityCodes.length === 0 || !hasData) return null;
    const beforeHigh = highComplexityCodes.reduce((s, code) => s + (before[code] ?? 0), 0);
    const afterHigh = highComplexityCodes.reduce((s, code) => s + (after[code] ?? 0), 0);
    const beforeSharePct = beforeTotal > 0 ? (beforeHigh / beforeTotal) * 100 : 0;
    const afterSharePct = afterTotal > 0 ? (afterHigh / afterTotal) * 100 : 0;
    const deltaPp = afterSharePct - beforeSharePct;
    if (deltaPp === 0) return null;
    return { beforeSharePct, afterSharePct, deltaPp };
  }, [highComplexityCodes, before, after, beforeTotal, afterTotal, hasData]);

  return (
    <div className="space-y-4">
      {/* Input table */}
      <div className="bg-[#FAFAF8] rounded-xl overflow-hidden border border-[#E8E8E8]">
        {/* Table header */}
        <div className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-[#E8E8E8]">
          <div className="col-span-3 text-[9px] font-bold uppercase tracking-[1.5px] text-[#AAAAAA]">Code</div>
          <div className="col-span-3 text-[9px] font-bold uppercase tracking-[1.5px] text-[#AAAAAA] text-center">Before Abridge</div>
          <div className="col-span-3 text-[9px] font-bold uppercase tracking-[1.5px] text-[#EA2C00] text-center">With Abridge</div>
          <div className="col-span-3 text-[9px] font-bold uppercase tracking-[1.5px] text-[#AAAAAA] text-right">Δ</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-[#F0EDE9]">
          {groups.map(({ section, codes: groupCodes }) => (
            <div key={section ?? '__ungrouped'}>
              {section && (
                <div className="px-3 pt-2.5 pb-1">
                  <span className="text-[9px] font-bold uppercase tracking-[1.5px] text-[#AAAAAA]">{section}</span>
                </div>
              )}
              {groupCodes.map((c) => {
                const b = before[c.code] ?? 0;
                const a = after[c.code] ?? 0;
                const delta = a - b;
                return (
                  <div key={c.code} className="grid grid-cols-12 gap-2 items-center px-3 py-1.5">
                    <div className="col-span-3 flex items-center gap-1.5">
                      <span className="bg-[#F5F0EB] text-[#5C5751] text-[11px] font-mono font-medium px-2 py-0.5 rounded">
                        {c.code}
                      </span>
                    </div>
                    <div className="col-span-3">
                      <FormattedNumberInput
                        value={b}
                        onChange={(v: number) => onBeforeChange({ ...before, [c.code]: v })}
                        className="h-8 w-full border border-[#E5E5E5] rounded-lg px-2.5 text-sm text-center focus:border-[#EA2C00] outline-none bg-white"
                        data-testid={`em-before-${driverId}-${c.code}`}
                      />
                    </div>
                    <div className="col-span-3">
                      <FormattedNumberInput
                        value={a}
                        onChange={(v: number) => onAfterChange({ ...after, [c.code]: v })}
                        className="h-8 w-full border border-[#E5E5E5] rounded-lg px-2.5 text-sm text-center focus:border-[#EA2C00] outline-none bg-white"
                        data-testid={`em-after-${driverId}-${c.code}`}
                      />
                    </div>
                    <div className="col-span-3 text-right text-xs tabular-nums">
                      {delta === 0 ? (
                        <span className="text-[#CCCCCC]">—</span>
                      ) : (
                        <span className={delta > 0 ? 'text-emerald-600 font-medium' : 'text-red-500 font-medium'}>
                          {delta > 0 ? '+' : ''}{delta.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Totals row */}
        <div className="grid grid-cols-12 gap-2 items-center px-3 py-2 border-t border-[#E0DDD9] bg-[#F5F0EB]">
          <div className="col-span-3 text-[10px] font-bold text-[#5C5751] uppercase tracking-[1px]">Total</div>
          <div className="col-span-3 text-center text-sm font-bold text-black tabular-nums">
            {beforeTotal.toLocaleString()}
          </div>
          <div className="col-span-3 text-center text-sm font-bold text-[#EA2C00] tabular-nums">
            {afterTotal.toLocaleString()}
          </div>
          <div className="col-span-3 text-right text-xs font-bold tabular-nums">
            {totalDelta === 0 ? (
              <span className="text-[#CCCCCC]">—</span>
            ) : (
              <span className={totalDelta > 0 ? 'text-emerald-600' : 'text-red-500'}>
                {totalDelta > 0 ? '+' : ''}{totalDelta.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bar chart */}
      {hasData && (
        <div className="bg-white rounded-xl border border-[#E8E8E8] p-4">
          <p className="text-[9px] font-bold uppercase tracking-[1.5px] text-[#AAAAAA] mb-3">Distribution (% of total)</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} barCategoryGap="25%" barGap={2}>
              <XAxis
                dataKey="code"
                tick={{ fontSize: 10, fill: '#888888' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide domain={[0, 'auto']} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F5F0EB' }} />
              <Bar dataKey="beforePct" name="Before" radius={[3, 3, 0, 0]} maxBarSize={28}>
                {chartData.map((entry) => (
                  <Cell key={`before-${entry.code}`} fill="#C8BDB4" />
                ))}
              </Bar>
              <Bar dataKey="afterPct" name="After" radius={[3, 3, 0, 0]} maxBarSize={28}>
                {chartData.map((entry) => (
                  <Cell key={`after-${entry.code}`} fill="#EA2C00" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2 justify-center">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-[#C8BDB4]" />
              <span className="text-[10px] text-[#888888]">Before</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-[#EA2C00]" />
              <span className="text-[10px] text-[#888888]">With Abridge</span>
            </div>
          </div>
        </div>
      )}

      {/* High-complexity callout */}
      {highComplexityCallout && (
        <div className="rounded-xl border border-[#E8E8E8] border-l-4 border-l-[#EA2C00] bg-[#FAFAF8] px-4 py-3">
          <p className="text-[9px] font-bold uppercase tracking-[1.5px] text-[#AAAAAA] mb-1.5">High-acuity share</p>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold text-black tabular-nums">
              {highComplexityCallout.beforeSharePct.toFixed(1)}%
            </span>
            <span className="text-[#AAAAAA] text-xs">→</span>
            <span className="text-sm font-bold text-black tabular-nums">
              {highComplexityCallout.afterSharePct.toFixed(1)}%
            </span>
            <span className={`text-sm font-bold tabular-nums ml-1 ${highComplexityCallout.deltaPp > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {highComplexityCallout.deltaPp > 0 ? '+' : ''}{highComplexityCallout.deltaPp.toFixed(1)} pp
            </span>
          </div>
          <p className={`text-[11px] mt-1 ${highComplexityCallout.deltaPp > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {highComplexityCallout.deltaPp > 0
              ? '↑ shift toward higher-complexity visits'
              : '↓ shift away from higher-complexity visits'}
          </p>
        </div>
      )}
    </div>
  );
}
