import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { GoalDef } from "@/lib/attain/attainTypes";
import type { ChainLinkEdit } from "../AttainFlow";

const HORIZON_OPTIONS = ["Month 1-2", "Month 2-3", "Month 3-4", "Month 4-6", "Month 5-6", "Month 6-9", "Month 9-12"];

const ROLE_OPTIONS = [
  "Abridge CSM + champion",
  "Service-line / department leadership",
  "Ambulatory / unit operations",
  "Access / referral ops",
  "Ops / staffing",
  "Revenue cycle / coding / CDI",
  "Billing",
  "Charge nurses / unit leads",
  "Rapid response / unit",
  "Finance / partner finance",
  "Joint (shared)",
];

interface StepPathProps {
  goal: GoalDef;
  edits: Record<number, ChainLinkEdit>;
  onChangeEdit: (n: number, edit: Partial<ChainLinkEdit>) => void;
  onNext: () => void;
}

export default function StepPath({ goal, edits, onChangeEdit, onNext }: StepPathProps) {
  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-3" data-testid="text-step-eyebrow">
          Step 5 · Who holds each link?
        </p>
        <h1 className="text-2xl md:text-4xl font-bold text-black mb-3 font-abridge uppercase tracking-tight" data-testid="text-step-title">
          {goal.chainTitle}
        </h1>
        <p className="text-sm text-[#666666] leading-relaxed max-w-[620px]" data-testid="text-step-teach">
          {goal.label} is the end of a chain of seven links that all have to fire. Abridge reliably delivers the
          first two. The last two are the readout. Value leaks in the fragile middle, links 3 and 4, and every link
          there needs a name and a date attached to it, not just a hope.
        </p>
      </motion.div>

      <div className="space-y-3 mb-8">
        {goal.chain.map((link, i) => {
          const edit = edits[link.n] ?? { owner: link.ownerRole, horizon: HORIZON_OPTIONS[Math.min(i, HORIZON_OPTIONS.length - 1)], status: "needsAction" as const };
          const roleOptions = Array.from(new Set([link.ownerRole, ...ROLE_OPTIONS]));
          const staticStatus = link.isAbridge ? "On track" : link.n === 6 ? "In progress" : link.n === 7 ? "Validates later" : "On track";

          return (
            <motion.div
              key={link.n}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.03 * i }}
              className={`rounded-lg border p-4 ${link.fragile ? "border-[#EA2C00] bg-[#FFF6F3]" : "border-[#E5E5E5] bg-white"}`}
              data-testid={`row-attain-chain-link-${link.n}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-abridge text-lg text-[#1A1A1A]">{link.n}</span>
                    <span className="text-sm font-bold text-[#1A1A1A]">{link.name}</span>
                    {link.fragile && (
                      <span className="text-[8.5px] font-bold uppercase tracking-wide text-[#EA2C00] border border-[#EA2C00] rounded-full px-2 py-0.5">
                        Fragile
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#8C8C8C] mt-1">{link.signal}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                  <Select value={edit.owner} onValueChange={(v) => onChangeEdit(link.n, { owner: v })}>
                    <SelectTrigger className="h-9 w-[220px] text-xs" data-testid={`select-attain-owner-${link.n}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((r) => (
                        <SelectItem key={r} value={r} className="text-xs">
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={edit.horizon} onValueChange={(v) => onChangeEdit(link.n, { horizon: v })}>
                    <SelectTrigger className="h-9 w-[130px] text-xs" data-testid={`select-attain-horizon-${link.n}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HORIZON_OPTIONS.map((h) => (
                        <SelectItem key={h} value={h} className="text-xs">
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {link.fragile ? (
                    <div className="flex rounded-md border border-[#E5E5E5] overflow-hidden">
                      <button
                        type="button"
                        onClick={() => onChangeEdit(link.n, { status: "onTrack" })}
                        className={`px-2.5 h-9 text-xs font-medium ${edit.status === "onTrack" ? "bg-[#1A1A1A] text-white" : "bg-white text-[#8C8C8C]"}`}
                        data-testid={`button-attain-status-ontrack-${link.n}`}
                      >
                        On track
                      </button>
                      <button
                        type="button"
                        onClick={() => onChangeEdit(link.n, { status: "needsAction" })}
                        className={`px-2.5 h-9 text-xs font-medium ${edit.status === "needsAction" ? "bg-[#EA2C00] text-white" : "bg-white text-[#8C8C8C]"}`}
                        data-testid={`button-attain-status-needsaction-${link.n}`}
                      >
                        Needs action
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-[#8C8C8C] px-2">{staticStatus}</span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="bg-[#F5F0EB] border-l-[3px] border-[#EA2C00] rounded-r-md p-4 mb-8 max-w-[620px]">
        <p className="text-[9px] font-bold uppercase tracking-wide text-[#EA2C00] mb-1">The fragile middle</p>
        <p className="text-xs text-[#3A3A3A] leading-relaxed">
          Links 3 and 4 are flagged because that's where every plan like this quietly dies. Toggle each one to where
          it actually stands today. That toggle drives the attainment curve on the final page: the more of the
          fragile middle is on track, the closer this plan tracks its own goal line instead of drifting to what
          usually happens.
        </p>
      </div>

      <Button
        onClick={onNext}
        className="h-12 px-6 font-semibold rounded-full bg-black hover:bg-black/90 text-white"
        data-testid="button-attain-path-continue"
      >
        Continue
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}
