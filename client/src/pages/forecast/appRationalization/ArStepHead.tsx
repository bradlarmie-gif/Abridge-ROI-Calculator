import type { ReactNode } from "react";

// One header for every Offset the Cost step: the same headline scale and body
// tone as Size the ROI and Model the Value, with an optional action on the right.
export function ArStepHead({ title, intro, right, testId }: {
  title: ReactNode;
  intro?: ReactNode;
  right?: ReactNode;
  testId?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5" data-testid={testId}>
      <div className="min-w-0">
        <h1 className="font-abridge text-[27px] sm:text-[34px] lg:text-[38px] leading-[1.1] text-[#1A1A1A] max-w-[860px]">{title}</h1>
        {intro && <p className="text-[15.5px] leading-[1.55] text-[#565250] mt-3 max-w-[620px]">{intro}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

// Small dark label used above numbers and panels across the flow.
export function ArLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`text-[11px] font-bold uppercase tracking-[0.1em] text-[#443A32] ${className}`}>{children}</div>;
}
