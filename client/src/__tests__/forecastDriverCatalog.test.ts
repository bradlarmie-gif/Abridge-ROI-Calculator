import { describe, it, expect } from "vitest";
import {
  FORECAST_DRIVER_CATALOG_IDS,
  getCatalogDriver,
  resolveForecastDriver,
  catalogLabelForFormulaType,
} from "@/lib/forecastDriverCatalog";
import { EXPLORE_DRIVERS } from "@/lib/exploreDrivers";

describe("forecast driver catalog", () => {
  it("every Forecast catalogId resolves to a real exploreDrivers entry (no dangling links)", () => {
    for (const [forecastId, catalogId] of Object.entries(
      FORECAST_DRIVER_CATALOG_IDS,
    )) {
      const catalog = getCatalogDriver(catalogId);
      expect(
        catalog,
        `Forecast driver "${forecastId}" points at catalogId "${catalogId}" which has no exploreDrivers entry`,
      ).toBeDefined();
    }
  });

  it("resolveForecastDriver inherits the catalog label for a mapped driver", () => {
    const resolved = resolveForecastDriver({
      catalogId: FORECAST_DRIVER_CATALOG_IDS.cmiLift,
      label: "CMI improvement → Revenue (inpatient)",
      defaultLabel: "CMI improvement",
      metricUnit: "CMI points",
      factor1Value: 1500,
    });
    const catalog = EXPLORE_DRIVERS.find((d) => d.id === "drgAccuracy");
    expect(resolved.label).toBe(catalog!.label);
    expect(resolved.description).toBe(catalog!.shortDescription);
  });

  it("falls back to the driver's own fields when no catalogId is set", () => {
    const resolved = resolveForecastDriver({
      label: "Custom (enter dollar value directly)",
      defaultLabel: "My custom driver",
    });
    expect(resolved.label).toBe("My custom driver");
  });

  it("throws in dev when a catalogId does not resolve", () => {
    expect(() =>
      resolveForecastDriver({ catalogId: "doesNotExist" }),
    ).toThrow(/doesNotExist/);
  });

  it("catalogLabelForFormulaType returns the shared label for mapped formula types", () => {
    expect(catalogLabelForFormulaType("wrvuLift")).toBe(
      EXPLORE_DRIVERS.find((d) => d.id === "wrvu")!.label,
    );
    expect(catalogLabelForFormulaType("nursingOvertimeReduction")).toBe(
      EXPLORE_DRIVERS.find((d) => d.id === "nursingOvertime")!.label,
    );
  });

  it("catalogLabelForFormulaType returns undefined for unmapped formula types", () => {
    expect(catalogLabelForFormulaType("timeSavingsWorkforce")).toBeUndefined();
    expect(catalogLabelForFormulaType("workOutsideHoursReduction")).toBeUndefined();
    expect(catalogLabelForFormulaType(undefined)).toBeUndefined();
  });
});
