import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TermTooltipProps {
  term: string;
  short: string;
  full: string;
  className?: string;
}

export function TermTooltip({ term, short, full, className = "" }: TermTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button 
          type="button"
          className={`inline-flex items-center gap-1 text-inherit underline decoration-dotted decoration-neutral-400 underline-offset-2 cursor-help hover:decoration-neutral-600 transition-colors ${className}`}
        >
          {term}
          <HelpCircle className="w-3 h-3 text-neutral-400" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs p-3">
        <p className="font-semibold text-sm mb-1">{short}</p>
        <p className="text-xs text-neutral-600 leading-relaxed">{full}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export const TERMS = {
  wRVU: {
    term: "wRVU",
    short: "Work Relative Value Unit",
    full: "A measure of physician productivity based on the resources required for a service. Higher wRVU = more complex care = higher reimbursement.",
  },
  attribution: {
    term: "Attribution",
    short: "How much credit Abridge gets",
    full: "The percentage of improvement attributed to Abridge vs. other factors. Conservative estimates use 50% to account for other workflow changes.",
  },
  conversionRate: {
    term: "Conversion Rate",
    short: "Time savings → dollars",
    full: "How time saved converts to value. Patient Access assumes saved time = more patients seen. Overtime assumes saved time = reduced after-hours costs.",
  },
  utilization: {
    term: "Utilization",
    short: "% of providers using Abridge",
    full: "The percentage of providers actively using Abridge for documentation. Higher utilization = more value captured across your organization.",
  },
  emLevel: {
    term: "E&M Level",
    short: "Evaluation & Management code",
    full: "The complexity level (1-5) of a patient visit. Higher levels indicate more complex care and higher reimbursement.",
  },
  pajamaTime: {
    term: "Pajama Time",
    short: "Work outside work hours",
    full: "Time spent on documentation after hours, at home, on weekends. This 'hidden' work contributes to burnout and reduces quality of life.",
  },
};
