import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { liveFiles, relative } from "./support/liveSurface";
import { DOMAIN_COLORS } from "@/lib/domainColors";

/**
 * The four domains carry ONE identity across the app.
 *
 * `lib/domainColors.ts` says so in its own header ("Single source of truth —
 * every per-tool domain map should import from here"). Fifteen files do. Three
 * did not, and had quietly forked a second palette that swapped Revenue and
 * Capacity:
 *
 *            canonical            the fork
 *   Capacity #EA2C00 (deepest)    #F0704E (mid)
 *   Revenue  #F7A488 (lightest)   #EA2C00 (deepest)
 *
 * The worst case was inside a single page: the proforma PDF's per-setting
 * stacked bar used the fork while the domain cards 200px below it used the
 * canonical map. Same page, same three categories, opposite mapping — and the
 * bar is labelled only by a plain-text run underneath, so colour was the
 * reader's only way in and it pointed the wrong way.
 *
 * This guard bans the fork's hexes from appearing next to a domain name.
 */
const FORK_HEXES = ["#F0704E", "#F4A48C", "#F6B79E"];
const DOMAINS = ["Capacity", "Workforce", "Revenue", "Quality"];

/** Blank comments, so prose about the fork cannot trip the scan. */
function code(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "))
    .split("\n")
    .map((l) => (/^\s*(\/\/|\*)/.test(l) ? "" : l.replace(/([^:"'`])\/\/.*$/, "$1")))
    .join("\n");
}

describe("the four domains use one palette", () => {
  it("no live file maps a domain name to a forked hex", () => {
    const offenders: string[] = [];
    for (const file of liveFiles().filter((f) => /\.tsx?$/.test(f))) {
      if (/domainColors\.ts$/.test(file)) continue;
      const src = code(readFileSync(file, "utf8"));
      src.split("\n").forEach((line, i) => {
        const hex = FORK_HEXES.find((h) => line.toUpperCase().includes(h));
        if (!hex) return;
        // only a problem when the line is mapping a DOMAIN to it
        if (!DOMAINS.some((d) => new RegExp(`\\b${d}\\b`, "i").test(line))) return;
        offenders.push(`${relative(file)}:${i + 1}  ${line.trim().slice(0, 120)}`);
      });
    }
    expect(
      offenders,
      "These map a domain to a colour outside lib/domainColors, which is how the " +
        "same domain ended up two different colours on one page. Import " +
        "DOMAIN_COLORS instead:\n  " + offenders.join("\n  "),
    ).toEqual([]);
  });

  it("the canonical palette still runs Capacity deepest to Revenue lightest", () => {
    // The ordering is the palette's stated intent; if it inverts, the guard
    // above is banning the wrong set of hexes.
    expect(DOMAIN_COLORS.Capacity).toBe("#EA2C00");
    expect(DOMAIN_COLORS.Revenue).toBe("#F7A488");
  });
});
