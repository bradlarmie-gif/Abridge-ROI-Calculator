import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type Lever, type LeverId } from "@/lib/roi-types";
import { formatCurrency } from "@/lib/roi-calculator";

const leverEducationalContent: Record<string, string> = {
  patientAccess: `Most capacity problems in outpatient care aren't caused by a shortage of clinicians — they come from the quiet minutes lost to documentation throughout the day. Those minutes squeeze schedules, push work past clinic hours, and create the sense that "we'd see more patients if we had more time." When those minutes are returned, even modestly, schedules stabilize and access improves without changing staffing.

Abridge gives clinicians back the time that documentation has been quietly stealing for years. By capturing the story in real time and producing drafts that reflect what was actually said, documentation stops leaking into every corner of the day. More of the clinician's energy stays with patients. And access expands not because you've added staff — but because you've removed the friction that was holding them back.`,
  overtime: `Overtime in outpatient care is rarely about patient volume — it's about documentation that doesn't fit inside the workday. Clinicians stay late to finish notes, catch up on inbox messages, or close charts that couldn't be completed between visits. Over time, this becomes normalized, but the cost compounds: premium labor, burnout, and declining morale.

Abridge reduces overtime by compressing documentation into the encounter itself. When notes are drafted in real time and require only light editing, there's less to carry into evening hours. Work ends closer to when clinic ends. And the savings show up not just in labor costs, but in the sustainability of the work itself.`,
  workforce: `Turnover among outpatient clinicians is often attributed to compensation or workload — but the deeper driver is frequently the cumulative weight of administrative burden. Documentation that follows clinicians home, inbox messages that pile up, and the sense that "the job has changed" all erode satisfaction. When clinicians leave, the cost is substantial: recruiting, onboarding, lost patient relationships, and coverage gaps.

Abridge addresses the root cause. By reducing the documentation load and giving clinicians back time they thought was permanently lost, it restores a sense of control. Clinicians who feel less burdened are more likely to stay — and that retention compounds into organizational stability.`,
  riskAdjustment: `Risk adjustment depends on documentation — but not on heroic efforts to "code better." It depends on whether the clinical story captures what's actually happening with the patient. Chronic conditions that are discussed but not documented, nuances that are understood but not written down — these gaps quietly erode RAF scores and downstream reimbursement.

Abridge captures the full clinical conversation, including the conditions and context that often go unrecorded. When the note reflects what was actually said, previously known conditions are more consistently documented, and newly identified ones are less likely to be missed. The result is a more complete picture — and more accurate risk scoring — without asking clinicians to do more.`,
  wrvu: `Many outpatient encounters are billed below their actual complexity — not because the work wasn't done, but because the documentation doesn't fully reflect it. Clinical reasoning, time spent, and the nuance of shared decision-making often don't make it into the note. The result is systematic under-coding that leaves revenue on the table.

Abridge captures the richness of the clinical conversation, including the reasoning and detail that support accurate coding. When notes reflect the full complexity of the visit, coding teams can assign the level that matches the work. This isn't about upcoding — it's about aligning documentation with reality.`,
  denials: `A significant share of claim denials originate not from coding errors, but from documentation that doesn't clearly support medical necessity. The clinical reasoning was sound, the care was appropriate — but the note didn't tell the story well enough for the payer. These denials create rework, delays, and lost revenue.

Abridge strengthens the clinical narrative by capturing what was actually discussed, including the reasoning behind decisions. When the story is clearer, there's less room for payers to question necessity. Denials drop, appeals decrease, and revenue cycle teams spend less time chasing preventable problems.`,
  edPatientAccess: `Flow in the ED depends as much on documentation speed as it does on staffing or room availability. When clinicians can complete documentation during the encounter, patients are dispositioned sooner — reducing LWBS and restoring predictable throughput.

Abridge captures the clinical conversation in real time, producing drafts that reflect what was actually said. Documentation becomes part of the encounter rather than something that happens after it. The result is faster disposition, shorter waits, and fewer patients who leave without being seen.`,
  edProviderRetention: `Emergency clinicians tolerate intensity — what erodes them is the administrative load layered on top of it. Documentation that piles up, charts that can't be closed, and the sense that "the job has become something else" all contribute to burnout and turnover.

Abridge reduces that load by handling documentation in real time. When notes are drafted during the encounter and require only light review, clinicians can focus on care rather than paperwork. The job feels more like medicine again — and that makes a difference in who stays.`,
  edScribeSavings: `Scribes help ED teams keep pace when documentation demands exceed real-time capacity. But scribe programs are expensive, variable in quality, and create their own coordination overhead.

When documentation becomes lighter and more synchronous with care, organizations can rebalance scribe use — maintaining support where it's truly needed while reducing dependence where it's become a workaround for broken workflows.`,
  edDocumentationQuality: `A strong ED note captures the clinical reasoning behind urgency, acuity, and disposition. When the story is clearer, coding, downstream teams, and quality reviews align more closely with the clinician's intent.

Abridge captures the full clinical conversation, including the reasoning and context that often don't make it into typed notes. The result is documentation that better reflects what actually happened — and that supports more accurate coding, fewer queries, and clearer handoffs.`,
};

function getFirstSentence(text: string): string {
  const match = text.match(/^[^.!?]+[.!?]/);
  return match ? match[0] : text;
}

function getBaseLeverId(id: string): string {
  // Extract base lever ID from "setting:leverId" format
  const parts = id.split(":");
  return parts.length > 1 ? parts[1] : id;
}

interface LeverTableProps {
  levers: Lever[];
  onToggle: (id: LeverId) => void;
}

export function LeverTable({ levers, onToggle }: LeverTableProps) {
  const [selectedLever, setSelectedLever] = useState<Lever | null>(null);

  const totalEnabled = levers
    .filter((l) => l.enabled)
    .reduce((sum, l) => sum + l.value, 0);

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Annual Impact by Lever</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-center">Active</TableHead>
                <TableHead>Lever</TableHead>
                <TableHead className="text-right">Annual Value</TableHead>
                <TableHead className="hidden md:table-cell">Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {levers.map((lever) => (
                <TableRow 
                  key={lever.id} 
                  className={!lever.enabled ? "opacity-50" : ""}
                  data-testid={`lever-row-${lever.id}`}
                >
                  <TableCell className="text-center">
                    <Checkbox
                      checked={lever.enabled}
                      onCheckedChange={() => onToggle(lever.id)}
                      data-testid={`checkbox-${lever.id}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{lever.label}</TableCell>
                  <TableCell className="text-right font-mono">
                    {lever.enabled ? formatCurrency(lever.value) : "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    <span>{getFirstSentence(lever.description)}</span>
                    {leverEducationalContent[getBaseLeverId(lever.id)] && (
                      <>
                        {" "}
                        <button
                          onClick={() => setSelectedLever(lever)}
                          className="text-neutral-500 text-sm hover:underline cursor-pointer"
                          data-testid={`read-more-${lever.id}`}
                        >
                          Read more…
                        </button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-semibold bg-muted/50">
                <TableCell></TableCell>
                <TableCell>Total Annual Benefit</TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(totalEnabled)}
                </TableCell>
                <TableCell className="hidden md:table-cell"></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedLever} onOpenChange={(open) => !open && setSelectedLever(null)}>
        <DialogContent className="max-w-[600px] w-full rounded-xl shadow-xl p-6 sm:p-8 max-h-[85vh] overflow-y-auto bg-white [&>button]:top-6 [&>button]:right-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-black">
              {selectedLever?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 text-sm text-neutral-700 leading-relaxed whitespace-pre-line">
            {selectedLever && leverEducationalContent[getBaseLeverId(selectedLever.id)]}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
