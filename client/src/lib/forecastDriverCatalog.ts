import { EXPLORE_DRIVERS, type ExploreDriver } from "./exploreDrivers";

/**
 * Shared driver catalog bridge (Forecast to exploreDrivers).
 *
 * `exploreDrivers.ts` is the single source of truth for each driver's DISPLAY
 * definition: label, short description, unit, and value-per-unit default.
 * Forecast keeps its own projection math but reads those display fields from
 * the catalog by `catalogId`, so a name changed once in Measure lands in
 * Forecast too. See docs/superpowers/specs/2026-07-14-shared-driver-catalog-design.md.
 *
 * This is display-only. It does not touch Forecast's projection mechanics.
 */

/**
 * Canonical link from a Forecast driver to its exploreDrivers catalog entry.
 * Keyed by the Forecast driver id, which is also its `formulaType`, so both
 * consumers (the from-scratch template picker and the Measure to Forecast
 * bridge) resolve through the same map. Drivers with no clean catalog match
 * (custom, timeSavingsWorkforce, workOutsideHoursReduction) are absent here.
 */
export const FORECAST_DRIVER_CATALOG_IDS = {
  timeSavingsCapacity: "patientAccess",
  wrvuLift: "wrvu",
  emLevelLift: "opEmLevelDistribution",
  cmiLift: "drgAccuracy",
  hccCapture: "hccCapture",
  denialReduction: "denialPrevention",
  retentionLift: "providerWellbeing",
  nursingOvertimeReduction: "nursingOvertime",
} as const satisfies Record<string, string>;

export type ForecastDriverCatalogKey = keyof typeof FORECAST_DRIVER_CATALOG_IDS;

/** Look up a catalog entry by its exploreDrivers id. */
export function getCatalogDriver(catalogId: string): ExploreDriver | undefined {
  return EXPLORE_DRIVERS.find((d) => d.id === catalogId);
}

/** Display fields the catalog supplies to a Forecast driver. */
export interface ForecastDriverDisplay {
  label: string;
  description?: string;
  unit?: string;
  valuePerUnit?: number;
}

/** Shape the resolver reads for its own fallbacks when no catalog entry applies. */
export interface ForecastDriverLike {
  catalogId?: string;
  label?: string;
  defaultLabel?: string;
  shortDescription?: string;
  metricUnit?: string;
  factor1Value?: number;
}

/**
 * Merge catalog display fields (label, description, unit, value-per-unit) over a
 * Forecast driver's projection config and return the combined object.
 *
 * When `catalogId` is set but does not resolve, this throws in dev (the guard
 * test catches dangling links) and falls back to the Forecast driver's own
 * fields in prod so nothing renders blank. Drivers with no `catalogId` keep
 * their own fields.
 */
export function resolveForecastDriver<T extends ForecastDriverLike>(
  forecastDriver: T,
): T & ForecastDriverDisplay {
  const catalog = forecastDriver.catalogId
    ? getCatalogDriver(forecastDriver.catalogId)
    : undefined;

  if (forecastDriver.catalogId && !catalog) {
    const message = `resolveForecastDriver: catalogId "${forecastDriver.catalogId}" does not match any exploreDrivers entry`;
    if (import.meta.env.DEV) throw new Error(message);
    if (typeof console !== "undefined") console.warn(message);
  }

  const fallbackLabel = forecastDriver.defaultLabel ?? forecastDriver.label ?? "";

  return {
    ...forecastDriver,
    label: catalog?.label ?? fallbackLabel,
    description: catalog?.shortDescription ?? forecastDriver.shortDescription,
    unit: catalog?.measureDefaults?.deltaUnit ?? forecastDriver.metricUnit,
    valuePerUnit:
      catalog?.measureDefaults?.valuePerUnitDefault ?? forecastDriver.factor1Value,
  } as T & ForecastDriverDisplay;
}

/**
 * Catalog display label for a Forecast `formulaType`, if it maps to the catalog.
 * Used by the Measure to Forecast bridge to name its produced driver instances
 * from the shared catalog. Returns undefined for unmapped formula types.
 */
export function catalogLabelForFormulaType(
  formulaType: string | undefined | null,
): string | undefined {
  if (!formulaType) return undefined;
  const catalogId = (
    FORECAST_DRIVER_CATALOG_IDS as Record<string, string>
  )[formulaType];
  if (!catalogId) return undefined;
  return getCatalogDriver(catalogId)?.label;
}
