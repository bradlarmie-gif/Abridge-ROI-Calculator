import type { ReactNode } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnifiedHeader } from "@/components/UnifiedHeader";

/**
 * Shared scaffold for the Value Attainment Hub landings (home + sub-hubs).
 * Reuses the card-grid language from JourneySelector / ForecastModeSelector so
 * the new IA feels native. One source for the page frame, header, and cards.
 */

export function HubPage({
  pageName,
  header,
  children,
  footer,
  onHome,
}: {
  pageName: string;
  header: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  // Return to the top-level home hub (Strategy / Financial / Planning). Without
  // it, the Abridge logo's click handler has nothing to call and no-ops.
  onHome?: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#FFFFFF] relative overflow-hidden">
      <UnifiedHeader pathType="forecast" pathLabel={pageName} onHome={onHome} />
      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-[88px] md:pt-[96px] pb-8 relative z-10">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-center mb-12 md:mb-16"
        >
          {header}
        </motion.section>
        {children}
        {footer}
      </div>
    </div>
  );
}

export function HubHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <>
      <p className="text-xs uppercase text-[#999999] font-medium mb-3" style={{ letterSpacing: "3px" }}>
        {eyebrow}
      </p>
      <h1 className="text-3xl sm:text-4xl font-bold text-black font-abridge uppercase" style={{ letterSpacing: "0.025em" }}>
        {title}
      </h1>
    </>
  );
}

export function HubCard({
  icon: Icon,
  tagline,
  title,
  description,
  cta,
  onClick,
  testId,
  delay = 0.15,
  comingSoon = false,
}: {
  icon: LucideIcon;
  tagline: string;
  title: string;
  description: string;
  cta: string;
  onClick: () => void;
  testId?: string;
  delay?: number;
  comingSoon?: boolean;
}) {
  const handleKey = (e: React.KeyboardEvent) => {
    if (comingSoon) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={comingSoon ? undefined : { y: -4 }}
      role={comingSoon ? undefined : "button"}
      tabIndex={comingSoon ? undefined : 0}
      onKeyDown={handleKey}
      onClick={comingSoon ? undefined : onClick}
      data-testid={testId}
      aria-disabled={comingSoon || undefined}
      className={`group relative flex flex-col rounded-xl p-8 min-h-[300px] transition-all duration-300 ease-out ${
        comingSoon
          ? "bg-[#F5F0EB]/60 cursor-default"
          : "cursor-pointer bg-[#F5F0EB] hover:bg-[#EDE7E0] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA2C00] focus-visible:ring-offset-2"
      }`}
    >
      <div className={`w-12 h-12 rounded-full bg-white flex items-center justify-center mb-5 ${comingSoon ? "opacity-60" : ""}`}>
        <Icon className="w-6 h-6 text-[#EA2C00]" />
      </div>
      <div className="flex items-center gap-2 mb-1.5">
        <p className="text-[13px] text-[#EA2C00] font-medium">{tagline}</p>
        {comingSoon && (
          <span className="text-[10px] font-extrabold tracking-[0.06em] uppercase text-[#8A8072] bg-[#EEE7DD] rounded-full px-2 py-0.5">Coming soon</span>
        )}
      </div>
      {/* reserve two lines so a title that wraps (e.g. "App Rationalization") keeps
          the body/CTA aligned with its single-line neighbors across a card row */}
      <h3 className={`text-2xl font-bold leading-[1.15] min-h-[2.3em] mb-2.5 ${comingSoon ? "text-[#8A8073]" : "text-[#1A1A1A]"}`}>{title}</h3>
      <p className={`text-sm leading-relaxed flex-1 mb-6 ${comingSoon ? "text-[#9A9086]" : "text-[#666666]"}`}>{description}</p>
      {comingSoon ? (
        <div className="w-full text-center rounded-md border border-[#E0D9CE] text-[#9A9086] text-[14px] font-semibold py-2.5 select-none" data-testid={testId ? `${testId}-comingsoon` : undefined}>
          Coming soon
        </div>
      ) : (
        <Button
          className="w-full bg-[#EA2C00] text-white border-[#EA2C00]"
          size="lg"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          data-testid={testId ? `${testId}-button` : undefined}
        >
          {cta}
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      )}
    </motion.div>
  );
}

export function HubDisclaimer() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.5 }}
      className="text-center pt-10 md:pt-14 pb-2"
    >
      <p className="text-[12px] text-[#999999]">
        Estimates are for planning purposes. Results should be validated with your organization&apos;s data.
      </p>
    </motion.footer>
  );
}
