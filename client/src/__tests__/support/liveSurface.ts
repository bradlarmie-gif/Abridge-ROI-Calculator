import { readFileSync, existsSync, statSync } from "fs";
import { dirname, join, resolve } from "path";

/**
 * The set of files a user can actually reach, computed rather than listed.
 *
 * Roughly a third of `client/src/pages` is unreachable: retired screens that
 * nothing imports, or that only the retired JourneySelector imported. Guards
 * that hardcode a list of directories drift the other way — the four Case story
 * pages and the entire hub shipped with no copy linting at all, because nobody
 * remembered to add `pages/hub` to a glob in a test file.
 *
 * So: walk the real import graph out from the entry points. Anything reachable
 * is customer-facing and gets linted; anything not is dead code, excluded from
 * the launch audit on purpose, and does not get to fail a gate.
 */

const CLIENT_SRC = resolve(__dirname, "..", "..");

/** Entry points. main.tsx boots the app; print routes are opened directly by URL. */
const ENTRIES = ["main.tsx", "App.tsx"];

/**
 * Screens App.tsx still imports but no user can open.
 *
 * `hubMode` is permanently on, so the splash enters the hub and the whole legacy
 * IA is sealed off. App.tsx nonetheless imports every one of these at the top,
 * which is why a plain import walk from App.tsx reports ~250 reachable .tsx and
 * badly overstates the launch surface.
 *
 * Only the ROOT file of each dead screen is excluded, never a subtree: anything
 * a live screen also imports is still picked up through the live path. So a
 * shared component stays linted, and a component that ONLY the retired Switch
 * flow used drops out, which is the distinction that matters.
 *
 * Kept live deliberately, because a URL reaches them even though the hub does
 * not: ForecastFlow (`/forecast`), LearnPath (`/learn/*`), and Measure (the
 * `?data_receipt=` link — see e2e/measure-path.spec.ts).
 */
const DEAD_ROOTS = [
  "pages/JourneySelector",       // the retired splash; hubJourneyUnreachable.test.ts seals it
  "pages/switch/SwitchFlow",     // one navigateTo, on JourneySelector, no deep link
  "pages/expand/ExpandFlow",     // same
  "pages/ObjectiveSelectionScreen", // only its TYPE is imported; the component is never rendered
  "pages/BaselineSetup",         // the handleSelectionComplete chain: defined, never called
  "pages/ModelBuilder",          // 69 number inputs, no way in
  "pages/InvestmentPage",
  "pages/SummaryCommandCenter",
  "pages/forecast/ForecastModeSelector", // only JourneySelector opens it
];

const EXTENSIONS = ["", ".tsx", ".ts", "/index.tsx", "/index.ts"];

function resolveImport(fromFile: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = join(CLIENT_SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = resolve(dirname(fromFile), spec);
  else return null; // node_modules
  for (const ext of EXTENSIONS) {
    const candidate = base + ext;
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/** Static `import … from "x"`, `export … from "x"`, and dynamic `import("x")`. */
function specifiersIn(src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(/(?:^|\n)\s*(?:import|export)[\s\S]*?from\s*["']([^"']+)["']/g)) out.push(m[1]);
  for (const m of src.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g)) out.push(m[1]);
  for (const m of src.matchAll(/(?:^|\n)\s*import\s+["']([^"']+)["']/g)) out.push(m[1]);
  return out;
}

function isDeadRoot(file: string): boolean {
  const rel = file.replace(CLIENT_SRC + "/", "").replace(/\.tsx?$/, "");
  return DEAD_ROOTS.some((d) => rel === d || rel.startsWith(d + "/"));
}

let cached: string[] | null = null;

/** Absolute paths of every .ts/.tsx file reachable from the entry points. */
export function liveFiles(): string[] {
  if (cached) return cached;
  const seen = new Set<string>();
  const queue: string[] = [];
  for (const e of ENTRIES) {
    const p = join(CLIENT_SRC, e);
    if (existsSync(p)) queue.push(p);
  }
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    let src: string;
    try {
      src = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    for (const spec of specifiersIn(src)) {
      const target = resolveImport(file, spec);
      if (!target || seen.has(target)) continue;
      if (isDeadRoot(target)) continue;
      queue.push(target);
    }
  }
  cached = [...seen].sort();
  return cached;
}

/** Live files under any of the given `client/src`-relative directories. */
export function liveFilesUnder(...dirs: string[]): string[] {
  const prefixes = dirs.map((d) => join(CLIENT_SRC, d) + "/");
  return liveFiles().filter((f) => prefixes.some((p) => f.startsWith(p)));
}

/** `client/src/...` form, for readable failure messages. */
export function relative(file: string): string {
  return file.replace(CLIENT_SRC, "client/src");
}
