import { useState } from "react";
import { Download, Save } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import AttainmentCurve, { USUAL_CEILING_PCT } from "@/components/attain/AttainmentCurve";
import type { AttainState, GoalDef, SettingGoalContent } from "@/lib/attain/attainTypes";
import type { GoalTargetResult, AttainmentResult } from "@/lib/attain/attainCalc";
import type { ChainLinkEdit } from "../AttainFlow";

function formatCompact(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${Math.round(abs)}`;
}

const AMBITION_LABELS: Record<string, string> = { conservative: "Conservative", typical: "Typical", ambitious: "Ambitious" };

const FLOW_CLASS: Record<string, string> = {
  start: "bg-[#EA2C00] text-white border-[#EA2C00] font-semibold",
  mid: "bg-[#F8F5F1] text-[#3A3A3A] border-[#E7E0D6]",
  risk: "bg-[#FFF6F3] text-[#EA2C00] border-[#EA2C00] font-semibold",
  end: "bg-white text-[#EA2C00] border-[#EA2C00] border-2 font-semibold",
};

interface StepPlanProps {
  state: AttainState;
  goal: GoalDef;
  content: SettingGoalContent;
  target: GoalTargetResult;
  attainment: AttainmentResult;
  chainEdits: Record<number, ChainLinkEdit>;
  baselineOverrides: Record<number, string>;
  onMonthsElapsedChange: (months: number) => void;
}

export default function StepPlan({ state, goal, content, target, attainment, chainEdits, baselineOverrides, onMonthsElapsedChange }: StepPlanProps) {
  const [orgName, setOrgName] = useState("");
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const usualMargin = target.margin * (USUAL_CEILING_PCT / 100);
  const curveGoalLabel = `${formatCompact(target.margin)} · ${target.label}`;
  const curveUsualLabel = `~${formatCompact(usualMargin)}`;
  const remainingMonths = Math.max(0, state.totalMonths - state.monthsElapsed);
  const remainingMargin = Math.max(0, target.margin - attainment.marginToDate);
  const ambitionLabel = state.ambitionKey ? AMBITION_LABELS[state.ambitionKey] : "";

  const fragileOnTrackCount = goal.chain.filter((l) => l.fragile && chainEdits[l.n]?.status === "onTrack").length;
  const fragileCount = goal.chain.filter((l) => l.fragile).length;

  const statusLabelFor = (n: number, isAbridge: boolean, fragile: boolean) => {
    if (fragile) return chainEdits[n]?.status === "onTrack" ? "On track" : "Needs action";
    if (isAbridge) return "On track";
    if (n === 6) return "In progress";
    if (n === 7) return "Validates later";
    return "On track";
  };

  const ownerFor = (n: number, fallback: string) => chainEdits[n]?.owner ?? fallback;
  const horizonFor = (n: number, fallback: string) => chainEdits[n]?.horizon ?? fallback;

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-1" data-testid="text-step-eyebrow">
            Step 7 · Your plan
          </p>
          <h1 className="text-2xl md:text-3xl font-bold text-black font-abridge uppercase tracking-tight" data-testid="text-step-title">
            The Value Attainment Plan
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" className="h-10 gap-2" data-testid="button-attain-save" onClick={() => { /* Save/share ships in a later task */ }}>
            <Save className="w-4 h-4" />
            Save
          </Button>
          <Button className="h-10 gap-2 bg-black hover:bg-black/90 text-white" data-testid="button-attain-download-pdf" onClick={() => { /* PDF export ships in a later task */ }}>
            <Download className="w-4 h-4" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* ============ SECTION 1 · COVER SUMMARY ============ */}
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-14" data-testid="section-attain-cover">
        <p className="text-[10px] font-semibold uppercase tracking-[3.2px] text-[#8C8C8C] mb-2">Value Attainment Plan</p>
        <h2 className="font-abridge text-4xl md:text-5xl text-[#1A1A1A] mb-3" data-testid="text-attain-plan-title">
          {goal.label}
        </h2>
        <div className="w-[100px] h-1 bg-[#EA2C00] mb-4" />
        <p className="text-base text-[#8C8C8C] mb-4">{content.subtitle}</p>
        <p className="text-[15px] leading-relaxed text-[#3A3A3A] max-w-[560px] mb-6">
          {content.thesis1}
          <br />
          <b className="text-[#EA2C00]">{content.thesis2}</b>
        </p>

        <div className="flex flex-wrap gap-6 mb-4">
          <div>
            <p className="text-[9.5px] font-semibold uppercase tracking-[2.5px] text-[#B4B4B4] mb-1">Prepared for</p>
            <input
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Your organization"
              className="text-[15px] font-bold text-[#1A1A1A] bg-transparent border-b border-dashed border-[#D8CFC4] focus:border-[#EA2C00] outline-none"
              data-testid="input-attain-org-name"
            />
          </div>
          <div>
            <p className="text-[9.5px] font-semibold uppercase tracking-[2.5px] text-[#B4B4B4] mb-1">Prepared by</p>
            <p className="text-[15px] text-[#3A3A3A]">Abridge Partner Success · {today}</p>
          </div>
          <div>
            <p className="text-[9.5px] font-semibold uppercase tracking-[2.5px] text-[#B4B4B4] mb-1">Ambition</p>
            <p className="text-[15px] text-[#3A3A3A]">{ambitionLabel} · {state.totalMonths} months</p>
          </div>
        </div>
        <p className="text-[11px] text-[#B4B4B4] leading-relaxed max-w-[600px] border-t border-[#E5E5E5] pt-3">
          A value attainment plan is a shared commitment, co-authored at kickoff and steered monthly. Figures are
          illustrative and valued at contribution margin.
        </p>
      </motion.section>

      {/* ============ SECTION 2 · YOUR STARTING POINT ============ */}
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-14" data-testid="section-attain-starting-point">
        <p className="text-[10px] font-semibold uppercase tracking-[3.2px] text-[#EA2C00] mb-1">Where You Are Today</p>
        <h2 className="font-abridge text-[28px] text-[#1A1A1A] mb-4">Your Starting Point</h2>
        <p className="text-[13px] leading-relaxed text-[#3A3A3A] mb-5 max-w-[720px]">{content.p1Lead}</p>

        <div className="flex flex-wrap gap-3 mb-5">
          {content.worldCards.map((card, i) => (
            <div key={card.k} className="flex-1 min-w-[150px] bg-[#F4F0EA] rounded-md p-4" data-testid={`card-attain-plan-world-${i}`}>
              <p className="text-[8.5px] font-semibold uppercase tracking-[1.4px] text-[#8C8C8C]">{card.k}</p>
              <p className={`font-abridge text-2xl mt-2 mb-1 ${card.coral ? "text-[#EA2C00]" : "text-[#1A1A1A]"}`}>
                {baselineOverrides[i] ?? card.n}
              </p>
              <p className="text-[9px] text-[#8C8C8C]">{card.f}</p>
            </div>
          ))}
        </div>

        <div className="bg-[#F4F0EA] border-l-[3px] border-[#EA2C00] rounded-r-md p-4 mb-5">
          <p className="text-[9px] font-bold uppercase tracking-wide text-[#EA2C00] mb-1.5">The opportunity, in one line</p>
          <p className="text-xs text-[#3A3A3A] leading-relaxed">{content.opportunity}</p>
        </div>

        <div className="mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-[2px] text-[#EA2C00] mb-2">{content.trappedLabel}</p>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {content.trappedSteps.map((step, i) => (
              <span key={i} className="flex items-center gap-2">
                <span className="text-[10px] px-3 py-2 rounded-md bg-[#F4F0EA] text-[#3A3A3A]">{step}</span>
                {i < content.trappedSteps.length - 1 && <span className="text-[#B4B4B4]">→</span>}
              </span>
            ))}
          </div>
          <p className="text-[10.5px] text-[#3A3A3A] leading-relaxed">{content.trappedCap}</p>
        </div>

        <p className="text-[15px] font-semibold text-[#1A1A1A] mb-3">{content.goodHead}</p>
        <div className="bg-[#1A1A1A] rounded-lg flex flex-wrap p-6 mb-2" data-testid="card-attain-plan-goal-hero">
          <div className="flex-1 min-w-[140px] px-3">
            <p className="font-abridge text-3xl text-white">{formatCompact(target.margin)}</p>
            <p className="text-[8px] font-semibold uppercase tracking-[1.8px] text-white/55 mt-2">Contribution margin</p>
          </div>
          <div className="flex-1 min-w-[140px] px-3">
            <p className="font-abridge text-3xl text-white">{target.count.toLocaleString()}</p>
            <p className="text-[8px] font-semibold uppercase tracking-[1.8px] text-white/55 mt-2">{target.label.replace(/^[\d,]+\s*/, "")}</p>
          </div>
          {content.goodCells
            .filter((c) => !c.coral)
            .slice(0, 2)
            .map((cell) => (
              <div key={cell.k} className="flex-1 min-w-[140px] px-3">
                <p className="font-abridge text-3xl text-white">{cell.n}</p>
                <p className="text-[8px] font-semibold uppercase tracking-[1.8px] text-white/55 mt-2">{cell.k}</p>
              </div>
            ))}
        </div>
        <p className="text-[10px] text-[#8C8C8C]">
          At {ambitionLabel.toLowerCase()} ambition, scoped to {state.scope.unitCount.toLocaleString()} in scope
          {state.scope.serviceLines.length > 0 ? ` · ${state.scope.serviceLines.join(", ")}` : ""}.
        </p>
      </motion.section>

      {/* ============ SECTION 3 · CLOSING THE GAP ============ */}
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-14" data-testid="section-attain-curve">
        <p className="text-[10px] font-semibold uppercase tracking-[3.2px] text-[#EA2C00] mb-1">The Trajectory</p>
        <h2 className="font-abridge text-[28px] text-[#1A1A1A] mb-4">Closing the Gap</h2>
        <p className="text-[13px] leading-relaxed text-[#3A3A3A] mb-5 max-w-[720px]">{content.curveIntro}</p>

        <AttainmentCurve
          pct={attainment.pct}
          onPacePct={attainment.onPacePct}
          monthsElapsed={state.monthsElapsed}
          totalMonths={state.totalMonths}
          goalLabel={curveGoalLabel}
          usualLabel={curveUsualLabel}
        />

        <div className="flex items-center gap-3 mt-3 mb-6 max-w-[420px]">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-[#8C8C8C] whitespace-nowrap">
            Today: month {state.monthsElapsed} of {state.totalMonths}
          </label>
          <input
            type="range"
            min={0}
            max={state.totalMonths}
            value={state.monthsElapsed}
            onChange={(e) => onMonthsElapsedChange(Number(e.target.value))}
            className="flex-1 accent-[#EA2C00]"
            data-testid="input-attain-months-elapsed"
          />
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex-1 min-w-[160px] border border-[#E7E0D6] bg-[#F8F5F1] rounded-md p-4" data-testid="card-attain-stat-attainment">
            <p className="text-[8.5px] font-semibold uppercase tracking-[1.4px] text-[#8C8C8C]">Attainment today</p>
            <p className="font-abridge text-2xl text-[#EA2C00] mt-2 mb-1">{attainment.pct}%</p>
            <p className="text-[9px] text-[#8C8C8C]">Of the {ambitionLabel.toLowerCase()} target</p>
          </div>
          <div className="flex-1 min-w-[160px] border border-[#E7E0D6] bg-[#F8F5F1] rounded-md p-4" data-testid="card-attain-stat-onpace">
            <p className="text-[8.5px] font-semibold uppercase tracking-[1.4px] text-[#8C8C8C]">On-pace target</p>
            <p className="font-abridge text-2xl text-[#1A1A1A] mt-2 mb-1">{attainment.onPacePct}%</p>
            <p className="text-[9px] text-[#8C8C8C]">Where the plan expected this month</p>
          </div>
          <div className="flex-1 min-w-[160px] border border-[#E7E0D6] bg-[#F8F5F1] rounded-md p-4" data-testid="card-attain-stat-runway">
            <p className="text-[8.5px] font-semibold uppercase tracking-[1.4px] text-[#8C8C8C]">Runway to goal</p>
            <p className="font-abridge text-2xl text-[#1A1A1A] mt-2 mb-1">{remainingMonths} mo</p>
            <p className="text-[9px] text-[#8C8C8C]">~{formatCompact(remainingMargin)} margin remaining</p>
          </div>
        </div>

        <div className="max-w-[720px]">
          <p className="text-[10px] font-semibold uppercase tracking-[2px] text-[#EA2C00] mb-2">What bends the line</p>
          <p className="text-[11px] leading-relaxed text-[#3A3A3A] mb-3">{content.bendsLead}</p>
          <div className="flex flex-col gap-3 mb-3">
            {content.bends.map((b, i) => (
              <div key={i} className="flex gap-3 items-baseline">
                <span className="font-abridge text-[#EA2C00] text-lg min-w-[24px]">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-[11.5px] leading-relaxed text-[#3A3A3A]">{b}</span>
              </div>
            ))}
          </div>
          <p className="text-[10.5px] leading-relaxed text-[#3A3A3A]">{content.bendsCloser}</p>
        </div>
      </motion.section>

      {/* ============ SECTION 4 · THE VALUE CHAIN ============ */}
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-14" data-testid="section-attain-chain">
        <div className="flex items-center gap-3 mb-2">
          <span className="inline-block text-[9px] font-bold uppercase tracking-[1.5px] text-white px-3 py-1 rounded-full" style={{ background: goal.pillBg }}>
            {goal.pill}
          </span>
          <span className="text-xs text-[#8C8C8C]">{goal.domainSub}</span>
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-[3.2px] text-[#EA2C00] mb-1 mt-3">The Value Chain</p>
        <h2 className="font-abridge text-[28px] text-[#1A1A1A] mb-4">
          {goal.chainTitle} <span className="text-[#EA2C00]">{goal.chainArrow === "↑" ? "↗" : "↘"}</span>
        </h2>
        <p className="text-[11.5px] leading-relaxed text-[#3A3A3A] mb-4 max-w-[720px]">
          {goal.label} is the end of a chain of links that must all fire. Abridge reliably delivers the first two,
          and the last two are the readout. <b className="text-[#1A1A1A]">Value leaks in the fragile middle, and
          every link there is owned by you.</b> This is the map we steer against together.
        </p>

        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8C8C8C] mb-2">How value moves through the chain</p>
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {goal.flow.map((f, i) => (
            <span key={i} className="flex items-center gap-2">
              <span className={`text-[10px] px-3 py-1.5 rounded-md border whitespace-nowrap ${FLOW_CLASS[f.kind]}`}>{f.label}</span>
              {i < goal.flow.length - 1 && <span className="text-[#B4B4B4] text-xs">→</span>}
            </span>
          ))}
        </div>

        <hr className="border-t border-[#E7E0D6] mb-5" />

        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8C8C8C] mb-2">The seven links, signal, owner, and status</p>
        <div className="overflow-x-auto mb-5">
          <table className="w-full text-left border-collapse" data-testid="table-attain-plan-chain">
            <thead>
              <tr>
                <th className="text-[8.5px] font-semibold uppercase tracking-wide text-[#8C8C8C] pb-2 border-b border-[#E7E0D6]">Link</th>
                <th className="text-[8.5px] font-semibold uppercase tracking-wide text-[#8C8C8C] pb-2 border-b border-[#E7E0D6]">Owner · Horizon</th>
                <th className="text-[8.5px] font-semibold uppercase tracking-wide text-[#8C8C8C] pb-2 border-b border-[#E7E0D6] text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {goal.chain.map((link) => (
                <tr key={link.n} className={link.fragile ? "shadow-[inset_3px_0_0_#EA2C00]" : ""} data-testid={`row-attain-plan-chain-${link.n}`}>
                  <td className="py-2 px-2 border-b border-[#F0ECE5] align-top">
                    <p className="text-[11px] font-bold text-[#1A1A1A]">{link.n} · {link.name}</p>
                    <p className="text-[9.5px] text-[#8C8C8C] mt-0.5">{link.signal}</p>
                  </td>
                  <td className="py-2 px-2 border-b border-[#F0ECE5] align-top text-[10px] text-[#3A3A3A]">
                    {ownerFor(link.n, link.ownerRole)}
                    <br />
                    <span className="text-[#B4B4B4]">{horizonFor(link.n, "")}</span>
                  </td>
                  <td className="py-2 px-2 border-b border-[#F0ECE5] align-top text-right">
                    <span className={`text-[8.5px] font-bold uppercase tracking-wide ${link.fragile && chainEdits[link.n]?.status !== "onTrack" ? "text-[#EA2C00]" : "text-[#8C8C8C]"}`}>
                      {statusLabelFor(link.n, link.isAbridge, link.fragile)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-[#F4F0EA] border-l-[3px] border-[#EA2C00] rounded-r-md p-4">
          <p className="text-[9px] font-bold uppercase tracking-wide text-[#EA2C00] mb-1.5">The fragile middle</p>
          <p className="text-xs text-[#3A3A3A] leading-relaxed">{content.fragile}</p>
          <p className="text-[10px] text-[#8C8C8C] mt-2">
            {fragileOnTrackCount} of {fragileCount} fragile links on track today.
          </p>
        </div>
      </motion.section>

      {/* ============ SECTION 5 · THE HARDEST LINK ============ */}
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-14" data-testid="section-attain-hardest-link">
        <p className="text-[10px] font-semibold uppercase tracking-[3.2px] text-[#EA2C00] mb-1">The Hardest Link</p>
        <h2 className="font-abridge text-[28px] text-[#1A1A1A] mb-4">
          {content.hardestTitle} <span className="text-[#EA2C00]">{content.hardestArrow === "↑" ? "↗" : "↘"}</span>
        </h2>
        <p className="text-[11.5px] leading-relaxed text-[#3A3A3A] mb-5 max-w-[720px]">{content.hardestLead}</p>

        <div className="flex flex-col gap-3 mb-6">
          {goal.mechanisms.map((m, i) => (
            <div key={i} className="bg-[#F8F5F1] border border-[#E7E0D6] rounded-md p-4">
              <p className="text-[11px] font-bold text-[#1A1A1A] mb-1">
                <span className="font-abridge text-[#EA2C00] mr-2">{String(i + 1).padStart(2, "0")}</span>
                {m.heading}
              </p>
              <p className="text-[10.5px] leading-relaxed text-[#3A3A3A]">{m.body}</p>
            </div>
          ))}
        </div>

        <p className="text-[10px] font-semibold uppercase tracking-[2px] text-[#EA2C00] mb-2">{content.splitLabel}</p>
        <div className="flex flex-wrap gap-3 mb-3">
          <div className="flex-1 min-w-[220px] border border-[#E7E0D6] bg-[#F8F5F1] rounded-md p-4">
            <p className="text-[9px] font-bold uppercase tracking-wide text-[#8C8C8C]">{content.splitLeft[0]}</p>
            <p className="text-[10px] leading-relaxed text-[#3A3A3A] mt-1.5">{content.splitLeft[1]}</p>
          </div>
          <div className="flex-1 min-w-[220px] border border-[#F3C9BE] bg-[#FFF6F3] rounded-md p-4">
            <p className="text-[9px] font-bold uppercase tracking-wide text-[#EA2C00]">{content.splitRight[0]}</p>
            <p className="text-[10px] leading-relaxed text-[#3A3A3A] mt-1.5">{content.splitRight[1]}</p>
          </div>
        </div>
        <p className="text-[10.5px] leading-relaxed text-[#3A3A3A] mb-6">{content.splitCloser}</p>

        <p className="text-[10px] font-semibold uppercase tracking-[2px] text-[#EA2C00] mb-2">{content.barHead}</p>
        <div className="relative mb-2">
          <div className="flex h-8 rounded-md overflow-hidden">
            <div className="bg-[#EA2C00]" style={{ width: `${content.barAcc}%` }} />
            <div className="bg-[#E4DCD0]" style={{ width: `${100 - content.barAcc}%` }} />
          </div>
          <div className="absolute top-[-6px] bottom-[-6px] w-[2px] bg-[#1A1A1A]" style={{ left: `${content.barTarget}%` }}>
            <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[7.5px] font-bold text-[#1A1A1A] whitespace-nowrap">
              Target · {content.barTarget}%
            </span>
          </div>
        </div>
        <div className="flex justify-between text-[9.5px] text-[#8C8C8C] mt-3">
          <span><b className="text-[#1A1A1A]">{content.barAcc}%</b> {content.barAccLbl}</span>
          <span><b className="text-[#1A1A1A]">{100 - content.barAcc}%</b> {content.barRelLbl}</span>
        </div>
      </motion.section>

      {/* ============ SECTION 6 · THE CADENCE ============ */}
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8" data-testid="section-attain-cadence">
        <p className="text-[10px] font-semibold uppercase tracking-[3.2px] text-[#EA2C00] mb-1">How This Gets Steered</p>
        <h2 className="font-abridge text-[28px] text-[#1A1A1A] mb-4">The Cadence</h2>
        <p className="text-[11.5px] leading-relaxed text-[#3A3A3A] mb-5 max-w-[720px]">
          A plan only closes the gap if someone steers it between the big reviews. Four things keep this one honest,
          and none of them depends on Abridge having authority it does not have.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="space-y-4">
            <p className="text-[11px] leading-relaxed text-[#3A3A3A]">
              <b className="text-[#1A1A1A]">Goal-owner.</b> An executive co-signs this plan at kickoff, so the goal
              sits on a scorecard beyond just this one, and the middle-link owners have someone to answer to.
            </p>
            <p className="text-[11px] leading-relaxed text-[#3A3A3A]">
              <b className="text-[#1A1A1A]">Cadence.</b> {content.cadenceLead}
            </p>
          </div>
          <div className="space-y-4">
            <p className="text-[11px] leading-relaxed text-[#3A3A3A]">
              <b className="text-[#1A1A1A]">The honest limit.</b> Abridge cannot open a slot, backfill a shift, or
              close a query. We surface the broken link and escalate it early. The teeth of this plan are
              transparency and a named owner, not authority.
            </p>
            <p className="text-[11px] leading-relaxed text-[#3A3A3A]">
              <b className="text-[#1A1A1A]">One page.</b> The working plan stays to a single page on purpose. The
              moment it becomes a report, the owners tune it out. It's a steering wheel.
            </p>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-[2px] text-[#EA2C00] mb-2">The monthly check</p>
          <p className="text-[11px] leading-relaxed text-[#3A3A3A] mb-3">
            Same five questions every month. Five minutes. This is what keeps a bleeding link from becoming a lost
            quarter.
          </p>
          <div className="flex flex-col gap-3">
            {content.monthly.map((q, i) => (
              <div key={i} className="flex gap-3 items-baseline">
                <span className="font-abridge text-[#EA2C00] text-lg min-w-[24px]">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-[11.5px] leading-relaxed text-[#3A3A3A]">{q}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-[2px] text-[#EA2C00] mb-2">Who owns what</p>
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[150px] border border-[#E7E0D6] bg-[#F8F5F1] rounded-md p-3">
              <p className="text-[8px] font-bold uppercase tracking-wide text-[#8C8C8C]">Goal-owner</p>
              <p className="text-[11px] font-bold text-[#1A1A1A] mt-1">{orgName ? `${orgName} executive sponsor` : "Executive sponsor"}</p>
              <p className="text-[9px] text-[#8C8C8C]">Owns the outcome</p>
            </div>
            {goal.chain
              .filter((l) => l.fragile || l.n === 5)
              .map((l) => (
                <div key={l.n} className="flex-1 min-w-[150px] border border-[#E7E0D6] bg-[#F8F5F1] rounded-md p-3" data-testid={`card-attain-owner-${l.n}`}>
                  <p className="text-[8px] font-bold uppercase tracking-wide text-[#8C8C8C]">Link {l.n} · {l.name}</p>
                  <p className="text-[11px] font-bold text-[#1A1A1A] mt-1">{ownerFor(l.n, l.ownerRole)}</p>
                  <p className="text-[9px] text-[#8C8C8C]">{horizonFor(l.n, "")}</p>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-[#F4F0EA] border-l-[3px] border-[#EA2C00] rounded-r-md p-4">
          <p className="text-[9px] font-bold uppercase tracking-wide text-[#8C8C8C] mb-1.5">At renewal</p>
          <p className="text-xs text-[#1A1A1A] leading-relaxed">{content.renewal}</p>
        </div>
      </motion.section>
    </div>
  );
}
