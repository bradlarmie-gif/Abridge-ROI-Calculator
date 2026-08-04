import { useMemo, useState } from "react";
import { Download, ArrowLeft, Loader2, FileText, TrendingUp, ChevronDown, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import {
  getActiveDrivers,
  type ExploreSetting,
  type ExploreQuadrant,
  type ExploreDriver,
} from "@/lib/exploreDrivers";
import { SETTING_LABELS } from "@/lib/forecastDefaults";
import {
  type MeasurePDFDriver,
  buildMeasurePDFDataFromState,
} from "@/components/measure/MeasurePDFExport";
import { generateMeasureNarrativePDF } from "@/components/measure/MeasureNarrativePDF";
import { type MeasureState, type MeasureDriverEntry, type MeasureQuote, computeRealizedDriverValue, fmtMoneyCompact } from "@/lib/measureCalculator";
import { useToast } from "@/hooks/use-toast";

interface MeasureOutputProps {
  state: MeasureState;
  updateState: (updates: Partial<MeasureState>) => void;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

const QUADRANT_ORDER: ExploreQuadrant[] = ["Capacity", "Workforce", "Revenue", "Quality"];

const QUADRANT_COLORS: Record<string, string> = {
  Capacity: '#0891B2',   // sky/cyan — clinical efficiency, calm
  Workforce: '#4E5A6B',  // slate — neutral, on-palette
  Revenue: '#EA2C00',    // brand red
  Quality: '#059669',    // emerald — clinical outcomes
};

const QUADRANT_TAGLINES: Record<string, string> = {
  Capacity: 'Time reclaimed, and what it became',
  Workforce: 'The retention story, in the provider\'s own numbers',
  Revenue: 'Documentation accuracy showing up in the bill',
  Quality: 'Clinical signals building the long-term case',
};

const ENTRY_DATA_SOURCE_LABELS: Record<string, string> = {
  ehr: 'EHR',
  survey: 'Survey',
  admin_data: 'Admin data',
  chart_review: 'Chart review',
  manual_entry: 'Manual entry',
};

const SETTING_BADGE: Record<string, string> = { outpatient: 'OP', ed: 'ED', inpatient: 'IP', nursing: 'NUR' };

// ─── Sparkline (SVG, no recharts needed) ───────────────────────────────────────
function Sparkline({ values, lowerIsBetter, id }: { values: number[]; lowerIsBetter?: boolean; id: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  if (range === 0) return null;

  const W = 72, H = 28, pad = 3;
  const pts = values.map((v, i) => [
    pad + (i / (values.length - 1)) * (W - pad * 2),
    pad + ((max - v) / range) * (H - pad * 2),
  ] as [number, number]);

  const linePath = `M ${pts.map(([x, y]) => `${x},${y}`).join(' L ')}`;
  const areaPath = `${linePath} L ${pts[pts.length - 1][0]},${H - pad} L ${pts[0][0]},${H - pad} Z`;

  const improved = lowerIsBetter
    ? values[values.length - 1] < values[0]
    : values[values.length - 1] > values[0];
  const color = improved ? '#059669' : '#EF4444';
  const gid = `sg-${id.replace(/[^a-z0-9]/gi, '')}`;

  return (
    <svg width={W} height={H} className="overflow-visible flex-shrink-0" aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gid})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.5" fill={color} />
    </svg>
  );
}

// ─── Build driver payload ──────────────────────────────────────────────────────
function buildDriverPayload(
  driver: ExploreDriver,
  entry: MeasureDriverEntry,
  abridgeEncounters?: number,
): MeasurePDFDriver {
  const md = driver.measureDefaults;
  const sortedMonthly = [...(entry.monthlyData || [])].sort((a, b) => a.month.localeCompare(b.month));
  const latest = sortedMonthly[sortedMonthly.length - 1];
  const effWith = entry.isMonthlyMode && latest ? latest.withAbridge : entry.withAbridge;
  const effWithout = entry.isMonthlyMode && latest ? latest.withoutAbridge : entry.withoutAbridge;
  const lowerIsBetter = md?.lowerIsBetter ?? entry.lowerIsBetter ?? false;
  const delta = lowerIsBetter ? effWithout - effWith : effWith - effWithout;
  // Single source of truth shared with the exported PDF.
  const realizedValue = computeRealizedDriverValue(driver, entry, abridgeEncounters);
  const isPerEncounter = Boolean(md?.isPerEncounterRate && (abridgeEncounters ?? 0) > 0);
  const scaleUnits = isPerEncounter
    ? abridgeEncounters!
    : (entry.scaleDivisor && entry.scaleDivisor > 0 && entry.scaleValue !== undefined)
      ? entry.scaleValue / entry.scaleDivisor
      : 1;
  const scaleUnitLabel = driver.settings.length === 1 && driver.settings[0] === "inpatient" ? "discharges" : "encounters";

  return {
    id: driver.id,
    label: driver.label,
    shortDescription: driver.shortDescription,
    visibility: driver.visibility,
    isMonthlyMode: Boolean(entry.isMonthlyMode),
    withoutAbridge: effWithout,
    withAbridge: effWith,
    delta,
    valuePerUnit: entry.valuePerUnit,
    attributionPercent: entry.attributionPercent,
    realizedValue,
    scaleUnits,
    isPerEncounter,
    scaleUnitLabel,
    notes: entry.notes,
    monthlyData: sortedMonthly.length > 0 ? sortedMonthly : undefined,
    deltaUnit: md?.deltaUnit,
    deltaLabel: md?.deltaLabel,
    valuePerUnitLabel: md?.valuePerUnitLabel,
    valuePerUnitPrefix: md?.valuePerUnitPrefix,
    measuredAt: entry.measuredAt,
    entryDataSource: entry.entryDataSource,
    serviceLineRows: entry.serviceLineRows,
    lowerIsBetter,
    singleValueEntry: md?.singleValueEntry,
  };
}

// ─── Quote card ────────────────────────────────────────────────────────────────
function QuoteCard({ quote }: { quote: MeasureQuote }) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden flex">
      <div className="w-1 flex-shrink-0 bg-[#EA2C00]" />
      <div className="px-5 py-4 flex-1 min-w-0">
        <p className="text-[15px] leading-relaxed text-[#1A1A1A] mb-3">
          <span className="text-[#EA2C00] font-bold mr-1 text-lg leading-none">"</span>
          {quote.text}
        </p>
        <p className="text-xs text-[#8C7E6E] font-medium">
          — {quote.attribution}{quote.role ? `, ${quote.role}` : ''}
        </p>
      </div>
    </div>
  );
}

// ─── Quotes block ──────────────────────────────────────────────────────────────
function QuotesBlock({ quotes }: { quotes: MeasureQuote[] }) {
  if (quotes.length === 0) return null;
  return (
    <motion.div
      className={`mb-4 ${quotes.length === 1 ? '' : 'grid grid-cols-1 md:grid-cols-2 gap-3'}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {quotes.map(q => <QuoteCard key={q.id} quote={q} />)}
    </motion.div>
  );
}

// ─── Manage quotes panel ───────────────────────────────────────────────────────
function ManageQuotesPanel({
  quotes,
  onUpdate,
}: {
  quotes: MeasureQuote[];
  onUpdate: (quotes: MeasureQuote[]) => void;
}) {
  const [draft, setDraft] = useState<Omit<MeasureQuote, 'id'>>({ text: '', attribution: '', role: '' });

  const addQuote = () => {
    if (!draft.text.trim() || !draft.attribution.trim()) return;
    onUpdate([...quotes, { ...draft, id: crypto.randomUUID(), role: draft.role || undefined }]);
    setDraft({ text: '', attribution: '', role: '' });
  };

  const removeQuote = (id: string) => onUpdate(quotes.filter(q => q.id !== id));

  const updateQuote = (id: string, changes: Partial<MeasureQuote>) =>
    onUpdate(quotes.map(q => q.id === id ? { ...q, ...changes } : q));

  return (
    <motion.div
      className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden p-5 mb-4"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.22, ease: 'easeInOut' }}
    >
      <p className="text-[11px] font-bold text-[#888888] uppercase tracking-[1.5px] mb-4">Love Stories</p>

      {/* Existing quotes */}
      {quotes.length > 0 && (
        <div className="space-y-3 mb-5">
          {quotes.map(q => (
            <div key={q.id} className="group relative bg-[#FAFAF8] rounded-xl p-4 border border-[#EEEEEE]">
              <button
                onClick={() => removeQuote(q.id)}
                className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#F0EBE4] text-[#8C7E6E] text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-100 hover:text-red-500"
                aria-label="Remove quote"
              >
                ×
              </button>
              <textarea
                value={q.text}
                onChange={(e) => updateQuote(q.id, { text: e.target.value })}
                className="w-full bg-transparent text-sm text-[#1A1A1A] leading-relaxed outline-none resize-none mb-2 focus:ring-0"
                rows={2}
              />
              <input
                value={q.attribution}
                onChange={(e) => updateQuote(q.id, { attribution: e.target.value })}
                className="w-full bg-transparent text-xs text-[#8C7E6E] outline-none border-b border-[#EEEEEE] pb-1 focus:ring-0 focus:border-[#EA2C00]"
                placeholder="Dr. Name, Specialty"
              />
            </div>
          ))}
        </div>
      )}

      {/* Add new quote */}
      <div className="border border-dashed border-[#E0D8D0] rounded-xl p-4">
        <textarea
          value={draft.text}
          onChange={(e) => setDraft(d => ({ ...d, text: e.target.value }))}
          placeholder="What did they say?"
          className="w-full h-16 bg-transparent text-sm text-[#1A1A1A] outline-none resize-none mb-3 placeholder:text-[#CCCCCC]"
        />
        <div className="flex items-center gap-2">
          <input
            value={draft.attribution}
            onChange={(e) => setDraft(d => ({ ...d, attribution: e.target.value }))}
            placeholder="Dr. Name, Specialty"
            className="flex-1 h-8 bg-[#F7F6F3] border border-[#E5E5E5] rounded-lg px-3 text-xs text-[#444] outline-none focus:border-[#EA2C00]"
          />
          <input
            value={draft.role ?? ''}
            onChange={(e) => setDraft(d => ({ ...d, role: e.target.value }))}
            placeholder="Role (optional)"
            className="w-28 h-8 bg-[#F7F6F3] border border-[#E5E5E5] rounded-lg px-3 text-xs text-[#444] outline-none focus:border-[#EA2C00]"
          />
          <button
            onClick={addQuote}
            disabled={!draft.text.trim() || !draft.attribution.trim()}
            className="h-8 px-4 bg-[#EA2C00] hover:bg-[#EA2C00]/90 disabled:bg-[#F0EBE4] disabled:text-[#CCCCCC] text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Add
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Financial driver card ─────────────────────────────────────────────────────
function FinancialDriverCard({
  drv,
  settingBadges,
  lowerIsBetter,
  showDollars,
}: {
  drv: MeasurePDFDriver;
  settingBadges: string[];
  lowerIsBetter?: boolean;
  showDollars?: boolean;
}) {
  const hasData = drv.withoutAbridge !== 0 || drv.withAbridge !== 0;
  const positiveOutcome = drv.delta >= 0;
  const sparkValues = drv.monthlyData?.map(m => m.withAbridge);

  return (
    <div className="bg-white rounded-xl border border-[#E8E8E8] overflow-hidden">
      {/* Card top */}
      <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="font-semibold text-[15px] text-black leading-snug">{drv.label}</p>
            {settingBadges.map(s => (
              <span key={s} className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#F0EBE4] text-[9px] font-bold text-[#8C7E6E] uppercase tracking-wide">
                {SETTING_BADGE[s] ?? s}
              </span>
            ))}
          </div>
          <p className="text-xs text-[#999999] leading-relaxed">{drv.shortDescription}</p>
        </div>
        {showDollars && drv.realizedValue !== 0 && (
          <div className="text-right flex-shrink-0">
            <p className="text-xl font-bold text-[#EA2C00] tabular-nums leading-none">
              {'$' + Math.round(drv.realizedValue).toLocaleString()}
            </p>
            <p className="text-[10px] text-[#AAAAAA] mt-0.5">realized / yr</p>
          </div>
        )}
      </div>

      {/* Single-value drivers (e.g. Patient Access): the amount IS the gain, so show one number */}
      {drv.singleValueEntry && hasData && drv.deltaUnit && (
        <div className="mx-5 mb-4">
          <div className="bg-[#F7F7F5] rounded-xl border border-[#EEEEEE] py-3 px-4 flex items-center justify-between gap-3">
            <p className="text-[11px] font-medium text-[#888888] leading-snug">{drv.deltaLabel ?? 'Amount'}</p>
            <p className="text-lg font-bold text-emerald-600 tabular-nums flex-shrink-0">
              +{drv.delta.toLocaleString()} <span className="text-xs font-medium text-[#999999]">{drv.deltaUnit}</span>
            </p>
          </div>
        </div>
      )}

      {/* Before → After data row (level metrics) */}
      {!drv.singleValueEntry && hasData && drv.deltaUnit && (
        <div className="mx-5 mb-4">
          <div className="grid grid-cols-3 gap-0 bg-[#F7F7F5] rounded-xl overflow-hidden border border-[#EEEEEE]">
            <div className="text-center py-3 px-2">
              <p className="text-[10px] font-medium text-[#AAAAAA] uppercase tracking-wide mb-1">Before</p>
              <p className="text-base font-bold text-[#333333] tabular-nums">{drv.withoutAbridge.toLocaleString()}</p>
              <p className="text-[10px] text-[#BBBBBB] mt-0.5">{drv.deltaUnit}</p>
            </div>
            <div className="text-center py-3 px-2 border-x border-[#EEEEEE]">
              <p className="text-[10px] font-medium text-[#AAAAAA] uppercase tracking-wide mb-1">With Abridge</p>
              <p className="text-base font-bold text-[#333333] tabular-nums">{drv.withAbridge.toLocaleString()}</p>
              <p className="text-[10px] text-[#BBBBBB] mt-0.5">{drv.deltaUnit}</p>
            </div>
            <div className="text-center py-3 px-2">
              <p className="text-[10px] font-medium text-[#AAAAAA] uppercase tracking-wide mb-1">Change</p>
              <p className={`text-base font-bold tabular-nums ${positiveOutcome ? 'text-emerald-600' : 'text-red-500'}`}>
                {positiveOutcome ? '+' : ''}{drv.delta.toLocaleString()}
              </p>
              <p className="text-[10px] text-[#BBBBBB] mt-0.5">{drv.deltaUnit}</p>
            </div>
          </div>
        </div>
      )}

      {/* Bottom: attribution + sparkline + timestamp */}
      <div className="px-5 pb-4">
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#F0EBE4] text-[10px] font-medium text-[#8C7E6E]">
              {drv.attributionPercent}% attributed to Abridge
            </span>
            {drv.entryDataSource && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#F0EBE4] text-[10px] font-medium text-[#8C7E6E]">
                {ENTRY_DATA_SOURCE_LABELS[drv.entryDataSource] ?? drv.entryDataSource}
              </span>
            )}
            {drv.isMonthlyMode && sparkValues && sparkValues.length >= 2 && (
              <span className="text-[10px] text-[#AAAAAA]">{sparkValues.length}-month trend</span>
            )}
          </div>
          {sparkValues && sparkValues.length >= 2 && (
            <Sparkline values={sparkValues} lowerIsBetter={lowerIsBetter} id={drv.id} />
          )}
        </div>
        {drv.measuredAt && (
          <p className="text-[10px] text-[#AAAAAA]">
            Measured {new Date(drv.measuredAt + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        )}
      </div>

      {/* Notes */}
      {drv.notes && (
        <div className="mx-5 mb-4 flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
          <MessageSquare className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-800 leading-relaxed">{drv.notes}</p>
        </div>
      )}
    </div>
  );
}

// ─── Signal driver row ─────────────────────────────────────────────────────────
function SignalDriverRow({
  drv,
  settingBadges,
  lowerIsBetter,
}: {
  drv: MeasurePDFDriver;
  settingBadges: string[];
  lowerIsBetter?: boolean;
}) {
  const slRows = drv.serviceLineRows ?? [];
  const hasServiceLines = slRows.length > 0;
  const hasData = drv.withoutAbridge !== 0 || drv.withAbridge !== 0;
  const sparkValues = drv.monthlyData?.map(m => m.withAbridge);
  const delta = lowerIsBetter ? drv.withoutAbridge - drv.withAbridge : drv.withAbridge - drv.withoutAbridge;
  const improved = delta > 0;

  return (
    <div className="flex items-center gap-3 py-3 px-4 rounded-xl border border-[#EEEEEE] bg-white">
      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#CCCCCC' }} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-[#1A1A1A]">{drv.label}</p>
          {settingBadges.map(s => (
            <span key={s} className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#F0EBE4] text-[9px] font-bold text-[#8C7E6E] uppercase tracking-wide">
              {SETTING_BADGE[s] ?? s}
            </span>
          ))}
          {!hasData && !hasServiceLines && (
            <span className="text-[10px] text-[#BBBBBB] italic">tracking</span>
          )}
        </div>
        {hasServiceLines && (
          <div className="mt-1.5 space-y-1">
            {slRows.map((row, i) => {
              const rowDelta = lowerIsBetter ? row.withoutAbridge - row.withAbridge : row.withAbridge - row.withoutAbridge;
              const rowImproved = rowDelta > 0;
              return (
                <div key={i} className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-[#1A1A1A] min-w-[110px]">{row.serviceLine || 'Unspecified'}</span>
                  <span className="text-xs text-[#666666] tabular-nums">{row.withoutAbridge.toLocaleString()}</span>
                  <span className="text-[#CCCCCC]">→</span>
                  <span className="text-xs font-semibold text-[#1A1A1A] tabular-nums">{row.withAbridge.toLocaleString()} {drv.deltaUnit}</span>
                  {rowDelta !== 0 && (
                    <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums ${
                      rowImproved ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                    }`}>
                      {row.withAbridge < row.withoutAbridge ? '↓' : '↑'} {Math.abs(rowDelta).toLocaleString()}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {!hasServiceLines && hasData && drv.deltaUnit && (
          <div className="flex items-center gap-2 flex-wrap mt-1.5">
            <span className="text-xs text-[#666666] tabular-nums">
              <span className="text-[9px] font-bold uppercase tracking-wide text-[#AAAAAA] mr-1">Before</span>
              {drv.withoutAbridge.toLocaleString()} {drv.deltaUnit}
            </span>
            <span className="text-[#CCCCCC]">→</span>
            <span className="text-xs font-semibold text-[#1A1A1A] tabular-nums">
              <span className="text-[9px] font-bold uppercase tracking-wide text-[#AAAAAA] mr-1">Now</span>
              {drv.withAbridge.toLocaleString()} {drv.deltaUnit}
            </span>
            <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full tabular-nums ${
              improved ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
            }`}>
              {drv.withAbridge < drv.withoutAbridge ? '↓' : '↑'} {Math.abs(delta).toLocaleString()} {drv.deltaUnit}
            </span>
          </div>
        )}
        {drv.notes && (
          <div className="flex items-start gap-1.5 mt-1.5">
            <MessageSquare className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700 leading-relaxed">{drv.notes}</p>
          </div>
        )}
        {(drv.entryDataSource || drv.measuredAt) && (
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {drv.entryDataSource && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#F0EBE4] text-[10px] font-medium text-[#8C7E6E]">
                {ENTRY_DATA_SOURCE_LABELS[drv.entryDataSource] ?? drv.entryDataSource}
              </span>
            )}
            {drv.measuredAt && (
              <span className="text-[10px] text-[#AAAAAA]">
                Measured {new Date(drv.measuredAt + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
          </div>
        )}
      </div>

      {sparkValues && sparkValues.length >= 2 && (
        <Sparkline values={sparkValues} lowerIsBetter={lowerIsBetter} id={`sig-${drv.id}`} />
      )}
    </div>
  );
}

// ─── Audience toggle types ─────────────────────────────────────────────────────
type Audience = 'executive' | 'clinical' | 'financial';
const AUDIENCE_LABELS: Record<Audience, string> = {
  clinical: 'Clinical',
  financial: 'Financial',
  executive: 'Executive',
};
const AUDIENCE_DESCRIPTIONS: Record<Audience, string> = {
  clinical: 'Outcomes & trends, no dollar figures',
  financial: 'Full dollar impact across all domains',
  executive: 'Complete view, value + provider voice',
};

// ─── Main component ────────────────────────────────────────────────────────────
export default function MeasureOutput({ state, updateState, onNext, onBack, onHome }: MeasureOutputProps) {
  const [exporting, setExporting] = useState(false);
  // key is quadrant (single-setting) or "setting:quadrant" (multi-setting); absent = expanded
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [audience, setAudience] = useState<Audience>('executive');
  const [showManageQuotes, setShowManageQuotes] = useState(false);

  const showDollars = audience === 'financial' || audience === 'executive';
  const showQuotes = (audience === 'clinical' || audience === 'executive') && (state.quotes?.length ?? 0) > 0;
  const { toast } = useToast();

  const isSectionExpanded = (key: string) => expandedSections[key] !== false;
  const toggleSection = (key: string) =>
    setExpandedSections(prev => ({ ...prev, [key]: !(prev[key] !== false) }));

  const activeSettings = (
    state.activeCareSettings && state.activeCareSettings.length > 0
      ? state.activeCareSettings
      : [state.careSetting || 'outpatient']
  ) as ExploreSetting[];

  const dep = state.deployment as any;

  const getSettingAbridgeEnc = (setting: string): number => {
    const sd = (state.settingData?.[setting as ExploreSetting] || {}) as Record<string, number>;
    return sd.deploy_abridgeEncounters || dep?.abridgeEncounters || 0;
  };

  const quadrants = useMemo(() => {
    return QUADRANT_ORDER.map((q) => {
      const drivers: MeasurePDFDriver[] = [];
      for (const setting of activeSettings) {
        const st = state.trackedDrivers?.[setting] || {};
        const abridgeEnc = getSettingAbridgeEnc(setting);
        getActiveDrivers(state.customDriverDefs)
          .filter(d => d.quadrant === q && d.settings.includes(setting) && st[d.id])
          .forEach(d => {
            drivers.push({ ...buildDriverPayload(d, st[d.id], abridgeEnc), setting });
          });
      }
      const realizedTotal = drivers.reduce((sum, d) => sum + d.realizedValue, 0);
      return { quadrant: q, realizedTotal, drivers };
    });
  }, [activeSettings, state.trackedDrivers, state.settingData, state.deployment, state.customDriverDefs]);

  // Per-setting breakdown (used for multi-setting hero + content sections)
  const settingSections = useMemo(() => {
    return activeSettings.map(setting => {
      const st = state.trackedDrivers?.[setting] || {};
      const abridgeEnc = getSettingAbridgeEnc(setting);
      const settingQuadrants = QUADRANT_ORDER.map(q => {
        const drivers = getActiveDrivers(state.customDriverDefs)
          .filter(d => d.quadrant === q && d.settings.includes(setting) && st[d.id])
          .map(d => buildDriverPayload(d, st[d.id], abridgeEnc));
        return {
          quadrant: q as ExploreQuadrant,
          realizedTotal: drivers.reduce((sum, d) => sum + d.realizedValue, 0),
          drivers,
        };
      }).filter(q => q.drivers.length > 0);
      return {
        setting,
        label: SETTING_LABELS[setting as keyof typeof SETTING_LABELS] || setting,
        settingTotal: settingQuadrants.reduce((sum, q) => sum + q.realizedTotal, 0),
        settingQuadrants,
      };
    }).filter(s => s.settingQuadrants.length > 0);
  }, [activeSettings, state.trackedDrivers, state.customDriverDefs]);

  const totalRealized = quadrants.reduce((sum, q) => sum + q.realizedTotal, 0);
  const driversTrackedCount = quadrants.reduce((sum, q) => sum + q.drivers.length, 0);
  const financialDriverCount = quadrants.reduce((sum, q) => sum + q.drivers.filter((d: MeasurePDFDriver) => d.visibility === 'quantified').length, 0);
  const signalDriverCount = driversTrackedCount - financialDriverCount;
  const activeQuadrantCount = quadrants.filter(q => q.drivers.length > 0).length;

  const isMultiSetting = activeSettings.length > 1;
  const primarySetting = activeSettings[0];
  const careSettingLabel = isMultiSetting
    ? activeSettings.map(s => SETTING_LABELS[s]).join(' + ')
    : SETTING_LABELS[primarySetting];

  const getDriverSettingBadges = (drv: MeasurePDFDriver) => {
    if (!isMultiSetting) return [];
    return drv.setting ? [drv.setting] : [];
  };

  const getDriverLowerIsBetter = (drvId: string) => {
    return getActiveDrivers(state.customDriverDefs).find(d => d.id === drvId)?.measureDefaults?.lowerIsBetter;
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await generateMeasureNarrativePDF(buildMeasurePDFDataFromState(state, audience));
      toast({ title: "Evidence doc generated", description: "PDF download has started." });
    } catch (err) {
      console.error("PDF generation failed", err);
      toast({ title: "Export failed", description: "Could not generate the PDF. Please try again.", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = fmtMoneyCompact;
  const noContent = driversTrackedCount === 0;

  return (
    <div className="min-h-screen bg-[#F7F6F3]">
      <UnifiedHeader
        pathType="measure"
        currentStep={6}
        totalSteps={7}
        stepName="Evidence Summary"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-[1080px] mx-auto px-4 sm:px-6 py-8 md:py-12">

        {noContent ? (
          /* ── Empty state ───────────────────────────────────────────────── */
          <motion.div
            className="bg-[#1A1A1A] rounded-2xl p-12 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <FileText className="w-12 h-12 text-white/30 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-3 font-abridge uppercase tracking-tight">
              Build the evidence first
            </h2>
            <p className="text-base text-white/50 max-w-md mx-auto mb-6">
              No drivers are tracked yet. Walk back through the domain pages to capture outcomes for this customer.
            </p>
            <Button
              onClick={onBack}
              className="h-12 px-8 bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white font-semibold rounded-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Go back
            </Button>
          </motion.div>
        ) : (
          <>
            {/* ── Hero ──────────────────────────────────────────────────────── */}
            <motion.div
              className="bg-[#1A1A1A] rounded-2xl p-7 md:p-8 mb-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              data-testid="card-realized-today"
            >
              <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">

                {/* Left: headline number + context */}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-white/40 uppercase tracking-[2px] mb-3">
                    {showDollars ? `Realized Annual Value · ${careSettingLabel}` : `Measured Outcomes · ${careSettingLabel}`}
                  </p>
                  {showDollars ? (
                    <p className="text-5xl md:text-6xl font-bold text-white tabular-nums leading-none mb-3">
                      {totalRealized > 0 ? formatCurrency(totalRealized) : '—'}
                    </p>
                  ) : (
                    <p className="text-5xl md:text-6xl font-bold text-white tabular-nums leading-none mb-3">
                      {driversTrackedCount}
                      <span className="text-2xl font-normal text-white/40 ml-2">drivers measured</span>
                    </p>
                  )}
                  <p className="text-sm text-white/40 mb-5">
                    {showDollars
                      ? (financialDriverCount > 0
                          ? `Across ${financialDriverCount} financial driver${financialDriverCount === 1 ? '' : 's'}, attribution-adjusted`
                          : 'Add financial drivers to see dollar impact')
                      : `${activeQuadrantCount} of 4 domains · ${activeSettings.length} care setting${activeSettings.length === 1 ? '' : 's'}`
                    }
                  </p>

                  {/* Deployment context chips */}
                  <div className="flex flex-wrap gap-2">
                    {dep?.organizationName && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 text-xs font-medium text-white/60">
                        {dep.organizationName}
                      </span>
                    )}
                    {dep?.providers > 0 && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 text-xs font-medium text-white/60">
                        {dep.providers} providers
                      </span>
                    )}
                    {dep?.monthsOnAbridge > 0 && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 text-xs font-medium text-white/60">
                        {dep.monthsOnAbridge} months live
                      </span>
                    )}
                    {dep?.utilizationRate > 0 && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 text-xs font-medium text-white/60">
                        {dep.utilizationRate}% adoption
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: breakdown panel */}
                <div className="lg:w-[300px] flex-shrink-0">
                  {isMultiSetting ? (
                    <>
                      <p className="text-[10px] font-semibold text-white/40 uppercase tracking-[2px] mb-4">By Setting</p>
                      <div className="space-y-3 mb-5">
                        {settingSections.map(ss => {
                          const pct = totalRealized > 0 ? (ss.settingTotal / totalRealized) * 100 : 0;
                          return (
                            <div key={ss.setting}>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[11px] font-semibold text-white/60 uppercase tracking-wide">{ss.label}</span>
                                <span className="text-sm font-bold text-white/80 tabular-nums">
                                  {showDollars && ss.settingTotal > 0
                                    ? formatCurrency(ss.settingTotal)
                                    : <span className="text-white/25">—</span>}
                                </span>
                              </div>
                              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700 bg-[#EA2C00]" style={{ width: `${pct}%`, opacity: pct > 0 ? 1 : 0 }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="h-px bg-white/10 mb-4" />
                      <p className="text-[10px] font-semibold text-white/40 uppercase tracking-[2px] mb-3">By Domain</p>
                      <div className="space-y-2 mb-4">
                        {QUADRANT_ORDER
                          .map(q => {
                          const qd = quadrants.find(x => x.quadrant === q);
                          const val = qd?.realizedTotal ?? 0;
                          const color = QUADRANT_COLORS[q];
                          const dCount = qd?.drivers.length ?? 0;
                          if (dCount === 0) return null;
                          return (
                            <div key={q} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                                <span className="text-[11px] text-white/50 uppercase tracking-wide">{q}</span>
                              </div>
                              <span className="text-xs font-bold text-white/60 tabular-nums">
                                {showDollars && val > 0
                                  ? formatCurrency(val)
                                  : <span className="text-white/25">—</span>}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-[10px] font-semibold text-white/40 uppercase tracking-[2px] mb-4">Value by Domain</p>
                      <div className="space-y-3">
                        {QUADRANT_ORDER
                          .map(q => {
                          const qd = quadrants.find(x => x.quadrant === q);
                          const val = qd?.realizedTotal ?? 0;
                          const pct = totalRealized > 0 ? (val / totalRealized) * 100 : 0;
                          const color = QUADRANT_COLORS[q];
                          const dCount = qd?.drivers.length ?? 0;
                          return (
                            <div key={q}>
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                                  <span className="text-[11px] font-semibold text-white/60 uppercase tracking-wide">{q}</span>
                                  {dCount > 0 && (
                                    <span className="text-[10px] text-white/30">{dCount} driver{dCount === 1 ? '' : 's'}</span>
                                  )}
                                </div>
                                <span className="text-sm font-bold text-white/80 tabular-nums">
                                  {showDollars && val > 0
                                    ? formatCurrency(val)
                                    : <span className="text-white/25">—</span>}
                                </span>
                              </div>
                              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-700"
                                  style={{ width: `${pct}%`, backgroundColor: color, opacity: pct > 0 ? 1 : 0 }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                  <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-[10px] text-white/30">
                    <span>{driversTrackedCount} drivers · {activeQuadrantCount} of 4 domains</span>
                    {signalDriverCount > 0 && <span>{signalDriverCount} signals tracked</span>}
                  </div>
                </div>

              </div>
            </motion.div>

            {/* ── Audience toggle ─────────────────────────────────────────────────────── */}
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 bg-[#F0EBE4] rounded-full p-0.5">
                  {(['clinical', 'financial', 'executive'] as Audience[]).map(a => (
                    <button
                      key={a}
                      onClick={() => setAudience(a)}
                      className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                        audience === a
                          ? 'bg-white text-neutral-900 shadow-sm'
                          : 'text-[#8C7E6E] hover:text-neutral-900'
                      }`}
                      data-testid={`audience-tab-${a}`}
                    >
                      {AUDIENCE_LABELS[a]}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowManageQuotes(v => !v)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    showManageQuotes
                      ? 'bg-[#1A1A1A] text-white'
                      : (state.quotes?.length ?? 0) > 0
                        ? 'bg-[#1A1A1A] text-white'
                        : 'bg-[#F0EBE4] text-[#525252] hover:bg-[#E8E2DA]'
                  }`}
                  data-testid="button-manage-quotes"
                >
                  <MessageSquare className="w-3 h-3" />
                  {showManageQuotes ? 'Done' : (state.quotes?.length ?? 0) > 0 ? `Love Stories · ${state.quotes?.length}` : 'Add Love Stories'}
                </button>
              </div>
              <p className="text-[11px] text-[#9E948C] mt-2 pl-1">{AUDIENCE_DESCRIPTIONS[audience]}</p>
            </div>

            <AnimatePresence>
              {showManageQuotes && (
                <ManageQuotesPanel
                  quotes={state.quotes ?? []}
                  onUpdate={(quotes) => updateState({ quotes })}
                />
              )}
            </AnimatePresence>

            {!showManageQuotes && (state.quotes?.length ?? 0) === 0 && (
              <motion.button
                onClick={() => setShowManageQuotes(true)}
                className="w-full flex items-center justify-between gap-4 mb-4 px-5 py-4 rounded-2xl border border-dashed border-[#DDD6CE] bg-white hover:border-[#A39888] hover:bg-[#FDFCFA] transition-all text-left"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                data-testid="card-empty-quotes"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <MessageSquare className="w-5 h-5 text-[#A39888] flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-[#525252]">Add provider quotes</p>
                    <p className="text-xs text-[#9E948C] mt-0.5">The voice behind the numbers, often the most memorable part of a customer review</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-[#8C7E6E] flex-shrink-0">+ Add</span>
              </motion.button>
            )}

            {showQuotes && <QuotesBlock quotes={state.quotes ?? []} />}

            {/* ── Domain sections ───────────────────────────────────────────── */}
            <motion.div
              className="space-y-3 mb-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {isMultiSetting ? (
                /* Multi-setting: one card per setting, nested collapsible quadrant rows */
                settingSections.map((ss, si) => (
                  <motion.div
                    key={ss.setting}
                    className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12 + si * 0.05 }}
                    data-testid={`section-setting-${ss.setting}`}
                  >
                    {/* Setting header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0F0F0]">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#EA2C00] flex-shrink-0" />
                        <span className="text-sm font-bold text-black uppercase tracking-wide">{ss.label}</span>
                        <span className="text-xs text-[#AAAAAA]">
                          {ss.settingQuadrants.reduce((n, q) => n + q.drivers.length, 0)} drivers
                        </span>
                      </div>
                      {showDollars && ss.settingTotal > 0 && (
                        <span className="text-base font-bold text-[#EA2C00] tabular-nums">{formatCurrency(ss.settingTotal)}</span>
                      )}
                    </div>

                    {/* Nested quadrant rows */}
                    <div className="divide-y divide-[#F8F8F8]">
                      {ss.settingQuadrants
                        .map(q => {
                        const color = QUADRANT_COLORS[q.quadrant];
                        const sectionKey = `${ss.setting}:${q.quadrant}`;
                        const isExpanded = isSectionExpanded(sectionKey);
                        const financialDrivers = q.drivers.filter(d => d.visibility === 'quantified');
                        const signalDrivers = q.drivers.filter(d => d.visibility === 'qualitative');
                        const tagline = QUADRANT_TAGLINES[q.quadrant];
                        return (
                          <div key={q.quadrant}>
                            <button
                              onClick={() => toggleSection(sectionKey)}
                              className="w-full flex items-center justify-between px-6 py-3 hover:bg-[#FAFAF8] transition-colors text-left"
                              data-testid={`toggle-${ss.setting}-${q.quadrant.toLowerCase()}`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-black uppercase tracking-wide">{q.quadrant}</span>
                                    <span className="text-[11px] text-[#AAAAAA]">{q.drivers.length} driver{q.drivers.length === 1 ? '' : 's'}</span>
                                  </div>
                                  <p className="text-[10px] text-[#AAAAAA] leading-none mt-0.5 truncate">{tagline}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                                {showDollars && q.realizedTotal > 0 && (
                                  <span className="text-sm font-bold tabular-nums" style={{ color }}>{formatCurrency(q.realizedTotal)}</span>
                                )}
                                <ChevronDown className={`w-4 h-4 text-[#CCCCCC] transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                              </div>
                            </button>

                            <AnimatePresence initial={false}>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.22, ease: 'easeInOut' }}
                                  className="overflow-hidden"
                                >
                                  <div className="border-t border-[#F0F0F0]">
                                    {financialDrivers.length > 0 && (
                                      <div className="p-5">
                                        <p className="text-[10px] font-bold text-[#888888] uppercase tracking-[1.5px] mb-3">Financial Impact</p>
                                        <div className="space-y-3">
                                          {financialDrivers.map(drv => (
                                            <FinancialDriverCard key={drv.id} drv={drv} settingBadges={[]} lowerIsBetter={getDriverLowerIsBetter(drv.id)} showDollars={showDollars} />
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {signalDrivers.length > 0 && (
                                      <div className={`px-5 pb-5 ${financialDrivers.length > 0 ? 'pt-0' : 'pt-5'}`}>
                                        {financialDrivers.length > 0 && <div className="h-px bg-[#F0F0F0] mb-4" />}
                                        <p className="text-[10px] font-bold text-[#888888] uppercase tracking-[1.5px] mb-1">Signal Evidence</p>
                                        <p className="text-[11px] text-[#AAAAAA] mb-3">Early proof the value story is real: metrics trending the right way, not yet valued in dollars.</p>
                                        <div className="space-y-2">
                                          {signalDrivers.map(drv => (
                                            <SignalDriverRow key={drv.id} drv={drv} settingBadges={[]} lowerIsBetter={getDriverLowerIsBetter(drv.id)} />
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                ))
              ) : (
                /* Single-setting: quadrant sections (same as before) */
                quadrants
                  .filter(q => q.drivers.length > 0)
                  .map((q, qi) => {
                  const color = QUADRANT_COLORS[q.quadrant];
                  const isExpanded = isSectionExpanded(q.quadrant);
                  const financialDrivers = q.drivers.filter((d: MeasurePDFDriver) => d.visibility === 'quantified');
                  const signalDrivers = q.drivers.filter((d: MeasurePDFDriver) => d.visibility === 'qualitative');
                  const tagline = QUADRANT_TAGLINES[q.quadrant];

                  return (
                    <motion.div
                      key={q.quadrant}
                      className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.12 + qi * 0.05 }}
                      data-testid={`section-quadrant-${q.quadrant.toLowerCase()}`}
                    >
                      <button
                        onClick={() => toggleSection(q.quadrant)}
                        className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#FAFAF8] transition-colors text-left group"
                        data-testid={`toggle-quadrant-${q.quadrant.toLowerCase()}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-black uppercase tracking-wide">{q.quadrant}</span>
                              <span className="text-xs text-[#AAAAAA]">
                                {q.drivers.length} driver{q.drivers.length === 1 ? '' : 's'}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#AAAAAA] leading-none mt-0.5 truncate">{tagline}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                          {showDollars && q.realizedTotal > 0 && (
                            <span className="text-base font-bold tabular-nums" style={{ color }}>
                              {formatCurrency(q.realizedTotal)}
                            </span>
                          )}
                          <ChevronDown
                            className={`w-4 h-4 text-[#CCCCCC] transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                          />
                        </div>
                      </button>

                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div className="border-t border-[#F0F0F0]">
                              {financialDrivers.length > 0 && (
                                <div className="p-5">
                                  <p className="text-[10px] font-bold text-[#888888] uppercase tracking-[1.5px] mb-3">
                                    Financial Impact
                                  </p>
                                  <div className="space-y-3">
                                    {financialDrivers.map((drv: MeasurePDFDriver) => (
                                      <FinancialDriverCard
                                        key={drv.id}
                                        drv={drv}
                                        settingBadges={getDriverSettingBadges(drv)}
                                        lowerIsBetter={getDriverLowerIsBetter(drv.id)}
                                        showDollars={showDollars}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}
                              {signalDrivers.length > 0 && (
                                <div className={`px-5 pb-5 ${financialDrivers.length > 0 ? 'pt-0' : 'pt-5'}`}>
                                  {financialDrivers.length > 0 && (
                                    <div className="h-px bg-[#F0F0F0] mb-4" />
                                  )}
                                  <p className="text-[10px] font-bold text-[#888888] uppercase tracking-[1.5px] mb-1">
                                    Signal Evidence
                                  </p>
                                  <p className="text-[11px] text-[#AAAAAA] mb-3">
                                    Early proof the value story is real: metrics trending the right way, not yet valued in dollars.
                                  </p>
                                  <div className="space-y-2">
                                    {signalDrivers.map((drv: MeasurePDFDriver) => (
                                      <SignalDriverRow
                                        key={drv.id}
                                        drv={drv}
                                        settingBadges={getDriverSettingBadges(drv)}
                                        lowerIsBetter={getDriverLowerIsBetter(drv.id)}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })
              )}
            </motion.div>

            {/* ── Sensitivity range ─────────────────────────────────────────── */}
            {totalRealized > 0 && financialDriverCount > 0 && (
              <motion.div
                className="bg-white rounded-2xl border border-[#E8E8E8] p-5 mb-3"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <p className="text-[10px] font-bold text-[#888888] uppercase tracking-[1.5px] mb-1">Value Range</p>
                <p className="text-[10px] text-[#A39888] mb-3 leading-snug">±25% sensitivity on adoption depth. Base is what was measured. Rollout breadth is modeled explicitly in Forecast.</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Conservative', pct: 0.75, sub: 'Adoption 25% shallower' },
                    { label: 'Base case', pct: 1.0, sub: 'As measured', highlight: true },
                    { label: 'Optimistic', pct: 1.25, sub: 'Adoption 25% deeper' },
                  ].map(({ label, pct, sub, highlight }) => (
                    <div
                      key={label}
                      className={`rounded-xl p-3 text-center ${highlight ? 'bg-[#1A1A1A]' : 'bg-[#F7F6F3]'}`}
                    >
                      <p className={`text-[10px] mb-1 ${highlight ? 'text-white/50' : 'text-[#888888]'}`}>{label}</p>
                      <p className={`text-base font-bold tabular-nums ${highlight ? 'text-white' : 'text-[#1A1A1A]'}`}>
                        {'$' + Math.round(totalRealized * pct).toLocaleString()}
                      </p>
                      <p className={`text-[9px] mt-0.5 ${highlight ? 'text-white/30' : 'text-[#BBBBBB]'}`}>{sub}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Download summary ─────────────────────────────────────────── */}
            <motion.div
              className="bg-[#1A1A1A] rounded-2xl p-6 mb-4"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#EA2C00]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Download className="w-5 h-5 text-[#EA2C00]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white mb-1">Take this with you</p>
                    <p className="text-sm text-white/50 leading-relaxed max-w-sm">
                      A polished PDF of the full summary, ready to share or present.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleExport}
                  disabled={exporting}
                  className="h-11 px-6 bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white font-semibold rounded-full gap-2 flex-shrink-0"
                  data-testid="button-download-evidence-doc"
                >
                  {exporting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                  ) : (
                    <><Download className="w-4 h-4" /> Download Summary</>
                  )}
                </Button>
              </div>
            </motion.div>

            {/* ── Scale & Forecast CTA ──────────────────────────────────────── */}
            <motion.div
              className="bg-[#1A1A1A] rounded-2xl p-6 mb-6"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#EA2C00]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <TrendingUp className="w-5 h-5 text-[#EA2C00]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white mb-1">Model the ceiling</p>
                    <p className="text-sm text-white/50 leading-relaxed max-w-sm">
                      What does this look like at full adoption? Across new care settings? Compare pricing scenarios and project the next 3 years.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={onNext}
                  className="h-11 px-6 bg-white hover:bg-white/90 text-black font-semibold rounded-full gap-2 flex-shrink-0"
                  data-testid="button-open-forecast"
                >
                  Scale &amp; Forecast
                  <TrendingUp className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>

          </>
        )}
      </div>
    </div>
  );
}
