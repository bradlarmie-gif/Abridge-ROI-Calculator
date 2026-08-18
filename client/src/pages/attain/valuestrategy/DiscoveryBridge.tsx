import { ArrowRight } from "lucide-react";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";

/**
 * The seam between the discovery interview and the ROI. Discovery already carried
 * the setting + drivers into Explore; this screen narrates that in the discovery's
 * own editorial language (keeping the partner name and branding) so the handoff
 * reads as one intentional motion, not a cold jump into a different tool.
 */
export interface BridgeInfo {
  partner: string;
  settingLabel: string;
  counted: string[]; // drivers turned on (the money)
  tracked: string[]; // proof-first drivers turned on in tracked mode (retention)
}

export default function DiscoveryBridge({ info, onContinue, onBack, onHome }: { info: BridgeInfo; onContinue: () => void; onBack: () => void; onHome: () => void }) {
  const nothing = info.counted.length === 0 && info.tracked.length === 0;
  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="attain"
        pathLabel="Value Attainment Strategy"
        stepName="Into the ROI"
        onBack={onBack}
        onHome={onHome}
        rightAction={info.partner ? <span className="hidden md:inline text-[11px] text-[#B4A896] italic whitespace-nowrap">{info.partner}</span> : undefined}
      />
      <UnifiedHeaderSpacer />
      <div className="max-w-[720px] mx-auto px-6 py-10 md:py-14">
        <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#EA2C00] mb-3">From your discovery</p>
        <h1 className="font-abridge text-[30px] md:text-[40px] text-[#1A1A1A] leading-[1.1] mb-4">
          Here is what we are carrying into the ROI{info.partner.trim() ? <>, {info.partner.trim()}</> : null}.
        </h1>
        <p className="text-[15.5px] text-[#4A4238] leading-relaxed max-w-[600px] mb-9">
          No numbers yet. The ROI opens on exactly this, and you put your figures to it together, so the model is built from your discovery, not a benchmark.
        </p>

        <div className="border-l-2 border-[#EA2C00] pl-6 space-y-6">
          <Row label="Care setting" items={[info.settingLabel]} />
          {info.counted.length > 0 && <Row label="Turned on for you" items={info.counted} coral />}
          {info.tracked.length > 0 && <Row label="Tracked metrics" items={info.tracked} muted />}
          {nothing && (
            <p className="text-[14px] text-[#6E675C] leading-relaxed max-w-[560px]">
              Nothing is pre-selected: you told us documentation is not the main lever here. The ROI opens on your setting so you can explore it honestly.
            </p>
          )}
        </div>

        <div className="mt-12 flex items-center justify-end border-t border-[#E8E2DA] pt-6">
          <button type="button" onClick={onContinue} data-testid="bridge-continue" className="inline-flex items-center gap-2 rounded-xl bg-[#EA2C00] text-white text-[14px] font-semibold px-5 py-2.5 hover:bg-[#d12800] transition-colors">
            Put your numbers to it <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, items, coral, muted }: { label: string; items: string[]; coral?: boolean; muted?: boolean }) {
  return (
    <div>
      <div className="text-[10.5px] font-extrabold tracking-[0.08em] uppercase text-[#8C8073] mb-2">{label}</div>
      <ul className="space-y-1.5">
        {items.map((it) => (
          <li key={it} className="flex items-center gap-2.5 text-[15px] text-[#1A1A1A]">
            <span className={`w-[6px] h-[6px] rounded-full flex-shrink-0 ${coral ? "bg-[#EA2C00]" : "bg-[#D8CFC0]"}`} />
            <span className={coral ? "font-abridge text-[#EA2C00]" : muted ? "text-[#6E675C]" : ""}>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
