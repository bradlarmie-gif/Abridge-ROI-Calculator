import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  saveSnapshot,
  loadPlan,
  savedSettingsForPartner,
  clearSnapshot,
  type AttainSnapshot,
} from "@/pages/attain/attainStorage";

/**
 * Guard for the per-setting plan store: a partner holds ONE plan per care setting,
 * so building out a new setting (e.g. ED) never overwrites another (e.g. Nursing).
 * Also covers forward-migration of a legacy single-slot plan. The node test env has
 * no localStorage, so we install a minimal in-memory mock on globalThis.window.
 */

class MemStore {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  key(i: number): string | null { return Array.from(this.m.keys())[i] ?? null; }
  getItem(k: string): string | null { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string): void { this.m.set(k, v); }
  removeItem(k: string): void { this.m.delete(k); }
}

const NS = "attain:plan:v1:";
const PARTNER = "University of Utah Health";
const SLUG = "university-of-utah-health";

function snap(setting: string, goals: string[]): AttainSnapshot {
  return {
    partner: PARTNER, phase: "experience", setting, goals, baseline: {},
    pickedByCat: {}, playsByCat: {}, answersByCat: {}, inputsByCat: {},
    metricsByCat: {}, readingsByCat: {}, peopleByCat: {}, reviewLog: [], savedAt: 0,
  };
}

let store: MemStore;
beforeEach(() => {
  store = new MemStore();
  (globalThis as unknown as { window: { localStorage: MemStore } }).window = { localStorage: store };
});
afterEach(() => {
  delete (globalThis as unknown as { window?: unknown }).window;
});

describe("per-setting plan store (no clobber across settings)", () => {
  it("keeps a separate plan per care setting under one partner", () => {
    saveSnapshot(snap("nursing", ["capacity", "retention"]));
    saveSnapshot(snap("ed", ["access"]));

    expect(loadPlan(PARTNER, "nursing")?.goals).toEqual(["capacity", "retention"]);
    expect(loadPlan(PARTNER, "ed")?.goals).toEqual(["access"]);

    const saved = savedSettingsForPartner(PARTNER).map((x) => x.setting).sort();
    expect(saved).toEqual(["ed", "nursing"]);
  });

  it("saving a second setting does not overwrite the first", () => {
    saveSnapshot(snap("nursing", ["capacity", "retention"]));
    saveSnapshot(snap("ed", ["access"]));
    // nursing must survive untouched
    expect(loadPlan(PARTNER, "nursing")?.goals).toEqual(["capacity", "retention"]);
  });

  it("clearing one setting leaves the other intact", () => {
    saveSnapshot(snap("nursing", ["capacity", "retention"]));
    saveSnapshot(snap("ed", ["access"]));
    clearSnapshot(PARTNER, "ed");
    expect(loadPlan(PARTNER, "ed")).toBeNull();
    expect(loadPlan(PARTNER, "nursing")?.goals).toEqual(["capacity", "retention"]);
  });

  it("reads a legacy single-slot plan, then migrates it forward on save", () => {
    // legacy plan written under the name-only key (pre per-setting split)
    store.setItem(NS + SLUG, JSON.stringify(snap("nursing", ["capacity"])));
    // it resolves both by setting and in the partner listing
    expect(loadPlan(PARTNER, "nursing")?.goals).toEqual(["capacity"]);
    expect(savedSettingsForPartner(PARTNER).map((x) => x.setting)).toEqual(["nursing"]);
    // saving the same setting migrates it to the per-setting key and drops the legacy one
    saveSnapshot(snap("nursing", ["capacity", "retention"]));
    expect(store.getItem(NS + SLUG)).toBeNull();
    expect(loadPlan(PARTNER, "nursing")?.goals).toEqual(["capacity", "retention"]);
    // and a legacy plan never duplicates its migrated self in the listing
    expect(savedSettingsForPartner(PARTNER)).toHaveLength(1);
  });

  it("a legacy plan for one setting is not returned for a different setting", () => {
    store.setItem(NS + SLUG, JSON.stringify(snap("nursing", ["capacity"])));
    expect(loadPlan(PARTNER, "ed")).toBeNull();
  });
});
