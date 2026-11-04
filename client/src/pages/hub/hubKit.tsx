import { Children, Fragment, createContext, useContext, type ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ChevronRight } from "lucide-react";
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
  watermarkOpacity,
  wide = false,
}: {
  /** Override the watermark strength (the home hub's app layouts want it seen). */
  watermarkOpacity?: number;
  /** Full-width column for the tile layouts; the list layouts keep max-w-6xl. */
  wide?: boolean;
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
      {watermark && <BackgroundShape opacity={watermarkOpacity} />}
      {/* A sub-hub's only parent IS home, so Back and the wordmark share a
          destination. Passing onBack explicitly matters: the header no longer
          falls back to window.history.back(), which used to leave this button
          walking the raw browser stack. */}
      <UnifiedHeader
        pathType="forecast"
        pathLabel={pageName}
        onHome={onHome}
        onBack={showBack ? onHome : undefined}
        showBack={showBack}
      />
      <div
        className={
          centered
            ? `${wide ? "max-w-[1200px]" : "max-w-6xl"} mx-auto px-4 md:px-6 pt-[88px] md:pt-[96px] pb-8 relative z-10 md:min-h-screen md:flex md:flex-col md:justify-center md:pb-[calc(2rem+48px)]`
            : "max-w-6xl mx-auto px-4 md:px-6 pt-[88px] md:pt-[96px] pb-8 relative z-10"
        }
      >
        {header != null && <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          /* Left-aligned on every hub: all four now lead with the row list, and a
             centred header over a left-aligned list leaves the two on different
             axes, which reads as a mistake rather than a choice. */
          className={centered ? "mb-10 md:mb-12" : "mb-10 md:mb-14"}
        >
          {header}
        </motion.section>}
        {children}
        {/* On phone the disclaimer stays in flow: the viewport is short enough
            that pinning it risks overlapping the last row. */}
        <div className="md:hidden">{footer}</div>
      </div>
      {/*
        Pinned bottom-left from md up, OUTSIDE the centred column.

        It used to sit inside that column, so it was vertically centred along
        with the hero and the list — which floated a legal line into the middle
        of the page with a few hundred px of nothing under it, at the same left
        indent and nearly the same size as the content. It read as part of the
        composition rather than as the furniture it is.

        Same left gutter as the content so it still lines up, just smaller,
        fainter, and out of the way.
      */}
      <div className="hidden md:block absolute bottom-0 left-0 right-0 z-10 pointer-events-none">
        <div className={`${wide ? "max-w-[1200px]" : "max-w-6xl"} mx-auto px-4 md:px-6 pb-6`}>{footer}</div>
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

/**
 * Set by HubTileGrid when a row is five across: narrow cards where some names
 * wrap to two lines, so every card reserves two lines to keep the row aligned.
 * Wider rows have names on one line and reserving a second only leaves a gap.
 */
export const ReserveTwoLineTitles = createContext(false);

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
  /**
   * 1-based position, rendered as the 01 / 02 / 03 rail. OMIT IT when the
   * options are peers rather than a sequence — the ROI calculator's care-setting
   * picker is four equivalent choices, and numbering them would imply you should
   * start with outpatient.
   */
  index?: number;
  /** Optional: the coral line above the title, where there is one to write. */
  tagline?: string;
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
      {index != null && (
        <span
          aria-hidden="true"
          className={`font-abridge text-[15px] tracking-[0.06em] w-9 flex-none ${
            description ? "mt-[22px]" : ""
          } ${comingSoon ? "text-[#DED7CD]" : "text-[#CFC5B7] group-hover:text-[#EA2C00]"}`}
        >
          {String(index).padStart(2, "0")}
        </span>
      )}
      <span className="flex-1 min-w-0">
        <span className={`flex items-center gap-2 ${tagline || comingSoon ? "" : "hidden"}`}>
          {tagline && <span className={`block text-[12.5px] font-bold ${comingSoon ? "text-[#B5AC9F]" : "text-[#EA2C00]"}`}>{tagline}</span>}
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
      className="pt-10 md:pt-0 pb-2 md:pb-0"
    >
      <p className="text-[12px] md:text-[10.5px] text-[#999999] md:text-[#B8B2AA] md:leading-[1.5]">
        Estimates are for planning purposes. Results should be validated with your organization&apos;s data.
      </p>
    </motion.footer>
  );
}

const EASE = [0.25, 0.46, 0.45, 0.94] as const;

/**
 * The tan tile every hub landing is built from (home + The Case / The Numbers /
 * The Plan), so a sub-hub opens in the same clothes as the door you came
 * through. "lg" is the home hub's three doors; "md" is a sub-hub, a notch
 * quieter so home stays the loudest screen.
 *
 * The footer under the hairline is either a one-line description (sub-hubs) or
 * the list of what is inside (home). It holds a fixed two-line height so every
 * title in a row sits on the same line whatever the tile says.
 */
export function HubTile({
  index,
  tagline,
  title,
  description,
  contents,
  soon,
  comingSoon = false,
  onClick,
  testId,
  delay = 0.15,
  size = "md",
  art,
  cta = "Open",
  badge,
  selected = false,
}: {
  index?: number;
  tagline?: string;
  title: string;
  description?: string;
  /** Home only: the entries inside this section, shown as a dotted list. */
  contents?: string[];
  /** A not-yet-live entry appended to `contents`, greyed. */
  soon?: string;
  /** The whole tile is not live yet: no arrow, no click, muted ink. */
  comingSoon?: boolean;
  onClick?: () => void;
  testId?: string;
  delay?: number;
  size?: "lg" | "md";
  /** A line-art vignette (hubArt.tsx). Turns the tile into a portrait card. */
  art?: ReactNode;
  /** Footer label beside the arrow on art tiles. */
  cta?: string;
  /** Pill shown on a tile that is not live. Defaults to "Coming soon". */
  badge?: string;
  /** Marks the current choice (e.g. the care setting already picked). */
  selected?: boolean;
}) {
  const lg = size === "lg";
  const live = !comingSoon && !!onClick;
  if (art) {
    return (
      <ArtTile
        {...{ index, tagline, title, description, contents, soon, onClick, testId, delay, art, cta, badge, selected }}
        lg={lg}
        live={live}
      />
    );
  }
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: EASE }}
      onClick={live ? onClick : undefined}
      disabled={!live}
      aria-disabled={!live || undefined}
      data-testid={testId}
      className={`group relative h-full w-full text-left flex flex-col justify-between rounded-[20px] backdrop-blur-sm border transition-all duration-300 ${
        lg ? "md:min-h-[280px] p-6 md:p-7" : "md:min-h-[224px] p-6"
      } ${
        live
          ? "bg-[#F6F1EA]/90 border-[#E9E0D4] shadow-[0_1px_2px_rgba(26,26,26,0.04),0_8px_24px_-12px_rgba(26,26,26,0.10)] hover:-translate-y-1 hover:bg-[#F3EDE4] hover:border-[#DDD2C4] hover:shadow-[0_1px_2px_rgba(26,26,26,0.04),0_24px_48px_-20px_rgba(26,26,26,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA2C00] focus-visible:ring-offset-2"
          : "bg-[#FAF7F2]/80 border-dashed border-[#E6DDD0] cursor-default"
      }`}
    >
      <span className="flex items-center justify-between h-9">
        <span className={`font-abridge text-[13px] tracking-[0.08em] ${live ? "text-[#B5AA9B]" : "text-[#D3CABE]"}`}>
          {index != null ? String(index).padStart(2, "0") : ""}
        </span>
        {live ? (
          <span className="w-9 h-9 rounded-full border border-[#E2D8CB] bg-white/70 text-[#8A8072] flex items-center justify-center transition-colors duration-200 group-hover:bg-[#EA2C00] group-hover:border-[#EA2C00] group-hover:text-white">
            <ArrowUpRight className="w-4 h-4" />
          </span>
        ) : (
          <span className="text-[10px] font-extrabold tracking-[0.06em] uppercase text-[#8A8072] bg-[#EEE7DD] rounded-full px-2.5 py-1">
            Coming soon
          </span>
        )}
      </span>
      <span className={`block ${lg ? "mt-6 md:mt-10" : "mt-6 md:mt-8"}`}>
        {tagline && (
          <span className={`block text-[12.5px] font-bold ${live ? "text-[#EA2C00]" : "text-[#B5AC9F]"}`}>{tagline}</span>
        )}
        <span
          className={`block mt-1 font-semibold leading-[1.08] tracking-[-0.02em] ${
            lg ? "text-[28px] md:text-[32px]" : "text-[22px] md:text-[24px]"
          } ${live ? "text-[#1A1A1A]" : "text-[#9A9086]"}`}
        >
          {title}
        </span>
        {(description || contents) && (
          <span
            className={`block mt-4 pt-3.5 border-t border-[#E6DCCF] text-[12.5px] leading-[1.65] text-pretty ${
              contents ? "md:min-h-[calc(2*1.65em+0.875rem)]" : "md:min-h-[calc(3*1.65em+0.875rem)]"
            } ${
              live ? "text-[#6B6259]" : "text-[#A79E92]"
            }`}
          >
            {contents ? <TileContents items={contents} soon={soon} /> : description}
          </span>
        )}
      </span>
    </motion.button>
  );
}

/**
 * Portrait card: the drawing on top in its own inset panel, then the words.
 * Used where a row holds five, so each card is narrow and tall like a product
 * card rather than a squat box. Title and description each reserve a fixed
 * height so every card in the row lines up line for line.
 */
function ArtTile({
  index,
  tagline,
  title,
  description,
  onClick,
  testId,
  delay = 0.15,
  art,
  live,
  lg = false,
  contents,
  soon,
  cta = "Open",
  badge = "Coming soon",
  selected = false,
}: {
  index?: number;
  tagline?: string;
  title: string;
  description?: string;
  onClick?: () => void;
  testId?: string;
  delay?: number;
  art: ReactNode;
  live: boolean;
  lg?: boolean;
  contents?: string[];
  soon?: string;
  cta?: string;
  badge?: string;
  selected?: boolean;
}) {
  const reserveTwo = useContext(ReserveTwoLineTitles);
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: EASE }}
      onClick={live ? onClick : undefined}
      disabled={!live}
      aria-disabled={!live || undefined}
      data-testid={testId}
      className={`group relative h-full w-full text-left flex flex-col rounded-[22px] border p-2.5 backdrop-blur-sm transition-all duration-300 ${
        live
          ? `bg-[#F6F1EA]/90 ${selected ? "border-[#EA2C00] ring-1 ring-[#EA2C00]" : "border-[#E9E0D4]"} shadow-[0_1px_2px_rgba(26,26,26,0.04),0_8px_24px_-12px_rgba(26,26,26,0.10)] hover:-translate-y-1.5 hover:border-[#DDD2C4] hover:shadow-[0_1px_2px_rgba(26,26,26,0.04),0_28px_56px_-24px_rgba(26,26,26,0.26)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA2C00] focus-visible:ring-offset-2`
          : "bg-[#F8F5F0]/85 border-[#ECE5DB] cursor-default"
      }`}
    >
      <span
        className={`relative block ${lg ? "h-[150px] md:h-[176px]" : "aspect-[5/3]"} rounded-[16px] border overflow-hidden transition-colors duration-300 ${
          live ? "bg-[#EFE7DC]/70 border-[#E6DCCE] group-hover:bg-[#F2EBE1]" : "bg-[#F1ECE5]/70 border-[#EAE3D9] opacity-60"
        }`}
      >
        <span className="absolute inset-0 px-3 py-4">{art}</span>
        <span className={`absolute left-3 top-2.5 font-abridge text-[11.5px] tracking-[0.08em] ${live ? "text-[#AE9F8C]" : "text-[#CBC1B4]"}`}>
          {index != null ? String(index).padStart(2, "0") : ""}
        </span>
      </span>
      {!live && (
        <span className="absolute right-[22px] top-[20px] text-[9.5px] font-extrabold tracking-[0.06em] uppercase text-[#8A8072] bg-white/90 border border-[#E6DCCE] rounded-full px-2 py-0.5">
          {badge}
        </span>
      )}
      <span className={`flex flex-col flex-1 ${lg ? "px-4 md:px-5 pt-5 pb-4" : "px-3.5 pt-4 pb-3.5"}`}>
        {tagline && <span className={`block text-[12px] font-bold ${live ? "text-[#EA2C00]" : "text-[#B5AC9F]"}`}>{tagline}</span>}
        <span
          className={`block mt-1 font-semibold leading-[1.12] tracking-[-0.015em] ${
            lg ? "text-[28px] md:text-[30px]" : `text-[19px] xl:text-[20px] ${reserveTwo ? "lg:min-h-[2.24em]" : ""}`
          } ${
            live ? "text-[#1A1A1A]" : "text-[#9A9086]"
          }`}
        >
          {title}
        </span>
        {(description || contents) && (
          <span
            className={`block mt-3 pt-3 border-t border-[#E6DCCF] text-[12.5px] leading-[1.6] text-pretty ${
              live ? "text-[#6B6259]" : "text-[#A79E92]"
            }`}
          >
            {contents ? <TileContents items={contents} soon={soon} /> : description}
          </span>
        )}
        <span className="mt-auto pt-4 flex items-center justify-between">
          <span className={`text-[11.5px] font-semibold ${live ? "text-[#8A8072] group-hover:text-[#EA2C00]" : "text-transparent"} transition-colors duration-200`}>
            {live ? cta : ""}
          </span>
          {live && (
            <span className="w-8 h-8 rounded-full border border-[#E2D8CB] bg-white/70 text-[#8A8072] flex items-center justify-center transition-colors duration-200 group-hover:bg-[#EA2C00] group-hover:border-[#EA2C00] group-hover:text-white">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          )}
        </span>
      </span>
    </motion.button>
  );
}

function TileContents({ items, soon }: { items: string[]; soon?: string }) {
  const all = [...items.map((c) => ({ c, soon: false })), ...(soon ? [{ c: `${soon} (soon)`, soon: true }] : [])];
  return (
    <>
      {all.map(({ c, soon: isSoon }, i) => (
        <Fragment key={c}>
          {/* Each name is unbreakable; the line may only wrap between names. */}
          <span className={`whitespace-nowrap ${isSoon ? "text-[#B5AA9B]" : ""}`}>
            {c}
            {i < all.length - 1 && <span className="text-[#CFC5B7]">&nbsp;·</span>}
          </span>
          {i < all.length - 1 && " "}
        </Fragment>
      ))}
    </>
  );
}

/**
 * Lays tiles out in a single row on desktop: up to five across. Splitting five
 * three over two read as a broken grid.
 */
export function HubTileGrid({ children }: { children: ReactNode }) {
  const items = Children.toArray(children);
  const n = items.length;
  const cols = n === 5 ? "md:grid-cols-2 lg:grid-cols-5" : n === 4 ? "md:grid-cols-2 lg:grid-cols-4" : n === 2 ? "md:grid-cols-2" : "md:grid-cols-3";
  return (
    <ReserveTwoLineTitles.Provider value={n === 5}>
      <div className={`grid grid-cols-1 ${cols} gap-4 ${n === 5 ? "lg:gap-3.5" : "md:gap-5"}`}>
        {items.map((child, i) => (
          <div key={i}>{child}</div>
        ))}
      </div>
    </ReserveTwoLineTitles.Provider>
  );
}
