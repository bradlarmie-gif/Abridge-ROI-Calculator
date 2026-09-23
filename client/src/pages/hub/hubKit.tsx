import { createContext, useContext, type ReactNode } from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import { BackgroundShape } from "@/components/BackgroundShape";

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
  showBack = true,
  watermark = true,
  centered = false,
}: {
  pageName: string;
  header: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  // Return to the top-level home hub (Strategy / Financial / Planning). Without
  // it, the Abridge logo's click handler has nothing to call and no-ops.
  onHome?: () => void;
  // The top-level home passes false — there is nowhere to go back to from root.
  showBack?: boolean;
  // The faint half-visible "A" watermark behind the hub landings. On by default
  // for every hub (home + Strategy / Financial / Planning).
  watermark?: boolean;
  /**
   * Centre the content in the viewport instead of stacking it under the header.
   * The home hub is a short left-aligned list, so top-anchoring dumped all the
   * leftover height into one corner and it read as a hole rather than as air.
   * Lifted 48px above true centre: the eye reads a block's mass as lower than it
   * measures, so dead-centre looks a touch low.
   */
  centered?: boolean;
}) {
  return (
    <div className="min-h-screen bg-[#FFFFFF] relative overflow-hidden">
      {watermark && <BackgroundShape />}
      <UnifiedHeader pathType="forecast" pathLabel={pageName} onHome={onHome} showBack={showBack} />
      <div
        className={
          centered
            ? "max-w-6xl mx-auto px-4 md:px-6 pt-[88px] md:pt-[96px] pb-8 relative z-10 md:min-h-screen md:flex md:flex-col md:justify-center md:pb-[calc(2rem+48px)]"
            : "max-w-6xl mx-auto px-4 md:px-6 pt-[88px] md:pt-[96px] pb-8 relative z-10"
        }
      >
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          /* Left-aligned on every hub: all four now lead with the row list, and a
             centred header over a left-aligned list leaves the two on different
             axes, which reads as a mistake rather than a choice. */
          className={centered ? "mb-10 md:mb-12" : "mb-10 md:mb-14"}
        >
          {header}
        </motion.section>
        {children}
        {footer}
      </div>
    </div>
  );
}

export function HubHeader({ eyebrow, title, lead }: { eyebrow: string; title: string; lead?: string }) {
  return (
    <>
      <p className="text-xs uppercase text-[#999999] font-medium mb-3" style={{ letterSpacing: "3px" }}>
        {eyebrow}
      </p>
      <h1 className="text-3xl sm:text-4xl font-bold text-black font-abridge uppercase" style={{ letterSpacing: "0.025em" }}>
        {title}
      </h1>
      {/* Optional. The Case uses it to state the spine once, so its rows read as
          chapters of one argument rather than a menu of unrelated documents. */}
      {lead && <p className="mt-5 text-[15px] leading-relaxed text-[#666666] max-w-[520px]">{lead}</p>}
    </>
  );
}

/**
 * Sub-hub rows sit a notch lighter than the home list. Home is the loudest thing
 * in the app and its names are short ("The Case"); a sub-hub name like "Ambient
 * Documentation" is more than twice the characters, so at the same weight it puts
 * far more ink on the page and reads heavier than the level above it. Carried on
 * context so the list decides once and no row can drift.
 */
const QuietTitles = createContext(false);

export function HubList({
  children,
  wide = false,
  className = "",
}: {
  children: ReactNode;
  /**
   * Rows that carry a description need a longer measure. At the home hub's 470px
   * a three-line description wraps to four and the list runs off the fold, so the
   * sub-hubs (which keep their descriptions) set this.
   */
  wide?: boolean;
  className?: string;
}) {
  return (
    <QuietTitles.Provider value={wide}>
      <div className={`${wide ? "max-w-[660px]" : "max-w-[470px]"} ${className}`}>{children}</div>
    </QuietTitles.Provider>
  );
}

export function HubRow({
  index,
  tagline,
  title,
  description,
  onClick,
  testId,
  delay = 0.15,
  comingSoon = false,
}: {
  /** 1-based position; rendered as the 01 / 02 / 03 rail. */
  index: number;
  tagline: string;
  title: string;
  /**
   * Optional. The home hub omits it: "Run the numbers" over "Financial" already
   * says it, and a paragraph underneath was the page explaining itself twice.
   * Sub-hub entries keep it, because "App Rationalization" does not self-explain.
   */
  description?: string;
  /**
   * Omit for a coming-soon row. Not merely unused: PlanningHub's Metrics row
   * shipped pointing at navigateTo("planning"), so the row said "Coming soon"
   * while carrying a live handler that opened the PLAN BUILDER. It was inert only
   * because `comingSoon` nulls onClick below, meaning the day anyone removed that
   * flag the row would silently open the wrong screen. Optional here so a
   * coming-soon row has nothing to mis-wire.
   */
  onClick?: () => void;
  testId?: string;
  delay?: number;
  comingSoon?: boolean;
}) {
  const quiet = useContext(QuietTitles);
  const handleKey = (e: React.KeyboardEvent) => {
    if (comingSoon) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.();
    }
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      role={comingSoon ? undefined : "button"}
      tabIndex={comingSoon ? undefined : 0}
      onKeyDown={handleKey}
      onClick={comingSoon ? undefined : onClick}
      data-testid={testId}
      aria-disabled={comingSoon || undefined}
      className={`group flex ${description ? "items-start" : "items-center"} gap-6 sm:gap-7 rounded-xl ${quiet ? "py-5" : "py-6 sm:py-7"} pl-3 pr-4 transition-colors duration-200 ${
        comingSoon
          ? "cursor-default"
          : "cursor-pointer hover:bg-[#FAF7F3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA2C00] focus-visible:ring-offset-2"
      }`}
    >
      {/* No dividers: three static rules turned the list into a table. The hover
          wash and the arrow carry the affordance instead. */}
      <span
        aria-hidden="true"
        className={`font-abridge text-[15px] tracking-[0.06em] w-9 flex-none ${
          description ? "mt-[22px]" : ""
        } ${comingSoon ? "text-[#DED7CD]" : "text-[#CFC5B7] group-hover:text-[#EA2C00]"}`}
      >
        {String(index).padStart(2, "0")}
      </span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2">
          <span className={`block text-[12.5px] font-bold ${comingSoon ? "text-[#B5AC9F]" : "text-[#EA2C00]"}`}>{tagline}</span>
          {comingSoon && (
            <span className="text-[10px] font-extrabold tracking-[0.06em] uppercase text-[#8A8072] bg-[#EEE7DD] rounded-full px-2 py-0.5">
              Coming soon
            </span>
          )}
        </span>
        {/* 600, not 700. Manrope is a variable face here (200..800), so this is a
            real weight rather than a synthesised one. At 700 the names sat heavier
            than the headline above them and the row read as shouting. */}
        <span className={`block text-[26px] sm:text-[30px] ${quiet ? "font-medium" : "font-semibold"} leading-[1.08] tracking-[-0.018em] mt-0.5 ${comingSoon ? "text-[#9A9086]" : "text-[#1A1A1A]"}`}>
          {title}
        </span>
        {description && (
          <span className={`block text-[13.5px] leading-relaxed mt-2 ${comingSoon ? "text-[#A79E92]" : "text-[#666666]"}`}>
            {description}
          </span>
        )}
      </span>
      {/* The chevron is a "this goes somewhere" promise, so a coming-soon row does
          not get one. It used to render the same circle in the same position,
          just paler — which reads as a live control to anyone who is not
          comparing it side by side with the row above, and there is nobody
          standing next to a self-serve user to explain why clicking did nothing.
          The greyed title plus the COMING SOON pill is the whole signal. */}
      {!comingSoon && (
        <span
          aria-hidden="true"
          className={`flex-none w-10 h-10 rounded-full border flex items-center justify-center transition-colors duration-200 ${
            description ? "mt-[7px]" : ""
          } border-[#E8E2DA] text-[#D6CCBE] opacity-60 group-hover:opacity-100 group-hover:bg-[#EA2C00] group-hover:border-[#EA2C00] group-hover:text-white`}
        >
          <ChevronRight className="w-4 h-4" />
        </span>
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
      className="pt-10 md:pt-14 pb-2"
    >
      <p className="text-[12px] text-[#999999]">
        Estimates are for planning purposes. Results should be validated with your organization&apos;s data.
      </p>
    </motion.footer>
  );
}
