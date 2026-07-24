import { describe, it, expect } from "vitest";
import {
  setToArr,
  arrToSet,
  recSetToArr,
  recArrToSet,
} from "@/pages/attain/attainStorage";

/**
 * Correctness harness for the Attain serialize helpers (attainStorage).
 * These are pure Set<->array converters used to round-trip the live plan state
 * to/from disk. Tested WITHOUT localStorage (absent in the node test env).
 */

describe("setToArr / arrToSet round-trip", () => {
  it("arrToSet ∘ setToArr is identity on a Set (as a set)", () => {
    const samples: string[][] = [
      [],
      ["a"],
      ["a", "b", "c"],
      ["burnout", "meaningful", "paylife"],
      ["dup", "dup", "unique"], // Set dedupes; identity holds at the set level
      ["with space", "with-dash", "with.dot", "123"],
    ];
    for (const arr of samples) {
      const original = new Set(arr);
      const back = arrToSet(setToArr(original));
      expect(back).toEqual(original);
      // and array form is stable order (insertion order preserved)
      expect(setToArr(back).sort()).toEqual(Array.from(original).sort());
    }
  });

  it("setToArr ∘ arrToSet preserves membership for arbitrary arrays", () => {
    const arr = ["x", "y", "z", "y"]; // has a duplicate
    const roundTripped = setToArr(arrToSet(arr));
    // the Set collapses the duplicate; membership must be identical
    expect(new Set(roundTripped)).toEqual(new Set(arr));
    expect(roundTripped.length).toBe(3);
  });

  it("arrToSet tolerates undefined (empty set)", () => {
    expect(arrToSet(undefined)).toEqual(new Set());
    expect(setToArr(arrToSet(undefined))).toEqual([]);
  });
});

describe("recSetToArr / recArrToSet round-trip", () => {
  it("recArrToSet ∘ recSetToArr is identity on a Record<string,Set>", () => {
    const samples: Record<string, Set<string>>[] = [
      {},
      { access: new Set(["lwbs", "admissions"]) },
      {
        "Patient Access": new Set(["a", "b"]),
        "Provider Retention": new Set([]),
        "Revenue Capture": new Set(["wrvu", "cf", "uplift"]),
      },
    ];
    for (const rec of samples) {
      const back = recArrToSet(recSetToArr(rec));
      expect(back).toEqual(rec);
      expect(Object.keys(back).sort()).toEqual(Object.keys(rec).sort());
    }
  });

  it("recSetToArr produces plain arrays keyed the same way", () => {
    const rec = { g1: new Set(["p1", "p2"]), g2: new Set(["p3"]) };
    const asArr = recSetToArr(rec);
    expect(asArr).toEqual({ g1: ["p1", "p2"], g2: ["p3"] });
    // and back again
    expect(recArrToSet(asArr)).toEqual(rec);
  });

  it("recArrToSet tolerates undefined (empty record)", () => {
    expect(recArrToSet(undefined)).toEqual({});
    expect(recSetToArr(recArrToSet(undefined))).toEqual({});
  });

  it("empty inner arrays round-trip to empty sets", () => {
    const rec = { a: new Set<string>(), b: new Set(["x"]) };
    expect(recArrToSet(recSetToArr(rec))).toEqual(rec);
  });
});
