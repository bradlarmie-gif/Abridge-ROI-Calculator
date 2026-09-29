import { useCallback, useEffect, useRef } from "react";

/**
 * Make a tool's internal steps real browser-history entries.
 *
 * Without this, a tool's steps are plain React state, so the browser Back
 * button skips the whole flow and exits the tool from wherever you stood.
 *
 * The subtle part is the other half. An in-app Back is just "go to the previous
 * position", indistinguishable from a forward move unless the flow remembers
 * where it came from. Pushing unconditionally therefore APPENDS a duplicate
 * entry on every Back, and the browser Back button then walks FORWARD into the
 * step just left, ping-ponging between the two. So `go` unwinds the real entry
 * when the target is the previous position, and only pushes otherwise.
 *
 * Positions are strings so they survive `history.state` and compare with ===.
 * Each flow encodes its own (e.g. "picker", "outpatient:2").
 *
 * IMPORTANT: entries pushed here deliberately DROP App's `idx` while keeping
 * its `view`. App.navigateTo only unwinds while parked on an entry it pushed
 * itself, which it detects by that `idx`. Carrying it would let App unwind
 * INTO this tool when it meant to leave it.
 *
 * @param scope unique per flow; namespaces the keys written to history.state
 * @param initial the position the flow opens on
 * @param restore applies a position that came back from history
 */
export function useFlowHistory(
  scope: string,
  initial: string,
  restore: (position: string) => void,
): (next: string) => void {
  const POS = `${scope}Pos`;
  const IDX = `${scope}Idx`;

  const stackRef = useRef<string[]>([initial]);
  const idxRef = useRef(0);
  // Kept in a ref so the popstate listener never needs re-binding.
  const restoreRef = useRef(restore);
  restoreRef.current = restore;

  // Seed the entry the flow opened on, so position 0 is addressable.
  useEffect(() => {
    const state = (window.history.state || {}) as Record<string, unknown>;
    if (typeof state[POS] !== "string") {
      stackRef.current = [initial];
      idxRef.current = 0;
      window.history.replaceState({ ...state, [POS]: initial, [IDX]: 0 }, "");
    }
    // Seeding is a mount-time concern; re-running it would clobber the stack.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onPop = (event: PopStateEvent) => {
      const state = event.state as Record<string, unknown> | null;
      // Not one of ours: an App-level entry, which App's own handler owns.
      if (!state || typeof state[POS] !== "string") return;
      if (typeof state[IDX] === "number") idxRef.current = state[IDX] as number;
      restoreRef.current(state[POS] as string);
      window.scrollTo({ top: 0, behavior: "auto" });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [POS, IDX]);

  return useCallback(
    (next: string) => {
      const idx = idxRef.current;
      const state = (window.history.state || {}) as Record<string, unknown>;

      // Unwind rather than duplicate, but only while parked on an entry this
      // flow pushed: another pusher may sit on top.
      if (state[IDX] === idx && idx > 0 && stackRef.current[idx - 1] === next) {
        window.history.back(); // popstate applies the position
        return;
      }

      stackRef.current = [...stackRef.current.slice(0, idx + 1), next];
      idxRef.current = idx + 1;
      restoreRef.current(next);

      const { idx: _appIdx, ...carried } = state as { idx?: number };
      window.history.pushState({ ...carried, [POS]: next, [IDX]: idx + 1 }, "");
      window.scrollTo({ top: 0, behavior: "auto" });
    },
    [POS, IDX],
  );
}
