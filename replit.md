# Abridge ROI Studio

## Overview
Abridge ROI Studio is a client-side single-page web application designed to calculate the return on investment (ROI) for implementing Abridge in various healthcare settings. It allows users to select a care setting, choose ROI levers, input practice-specific assumptions, and receive real-time financial impact calculations. The application provides comprehensive ROI modeling, including specialized flows for prospects switching from other ambient AI solutions or human scribes, and performance analysis for existing Abridge customers. Its core purpose is to provide defensible ROI estimates for Abridge's AI documentation tool, supporting Abridge's business vision for market penetration and customer value demonstration.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The application supports distinct user journeys: "Explore Path" for new prospects, "Assess Path" for evaluating current documentation, "Expand Path" for existing customers, and "Measure Path" for partners.

### UI/UX Decisions
The application adheres to Material Design principles, utilizing Abridge's brand color palette, Inter and JetBrains Mono fonts, and full mobile responsiveness. It includes premium UX enhancements like smooth page transitions, staggered entrance animations, and sticky right panels.

### Technical Implementations
-   **Frontend Framework**: React 18 with TypeScript.
-   **Build Tool**: Vite.
-   **Styling**: Tailwind CSS, custom design tokens, and shadcn/ui (built on Radix UI).
-   **State Management**: Primarily React's `useState` hooks.
-   **Data Management**: TanStack React Query for future API integrations.
-   **Security & Privacy**: Client-side processing, automatic session clearing, input security, and privacy-preserving analytics.
-   **Deep Linking**: Supports direct navigation to methodology pages and pre-selection of care settings.
-   **Mobile Responsiveness**: Tiered responsive design system with a global `useIsMobile` hook at 820px breakpoint.
-   **Performance**: Gzip compression on the Express server.

### Feature Specifications
-   **Measure Path**: A 5-page partner report flow with configuration, visualization, and PDF export.
-   **Assess Path — Ambient AI Assessment**: A 5-screen narrative flow to assess ambient AI documentation maturity across Capacity, Revenue, Workforce, and Quality domains, with PDF export.
-   **Assess Path — Nursing Edition**: A 6-screen strategic alignment tool for nursing leadership, focusing on Nurse Retention and Staffing Costs, with real-time impact calculations and PDF export.
-   **Learn Methodology Section**: Restructured modular methodology pages for each care setting.
-   **Multi-Setting Proforma Builder**: Allows layering multiple care settings (Outpatient, ED, Inpatient, Nursing) into a combined financial model. Features include: ProformaHub for managing settings, ProformaView with stacked area charts, 3-year P&L, card-based pricing, editable retention phasing, Value-to-Cost as the primary hero metric, and Scenario Comparison.
-   **Proforma Enhancements**: Includes detailed investment calculation, per-provider value metrics, clear hours returned context, full edit round-trip, engine-level retention calculation with configurable rates, display of both licensed and actively documenting providers, payback context, specific chart colors, and inline "Compare Pricing Models" tool.
-   **Per-Encounter Scaling**: Per-encounter is fully encounter-centric. Hospital buys an encounter cap (e.g., 500K Y1, 1M Y2). Investment uses full contracted encounter volume (no utilization reduction). Value scaling uses Y1 as baseline: `encounterScale = currentYearEncounters / yearlyEncounters.year1`, `utilScale = currentUtil / yearlyUtilization.year1`, `expansionMultiplier = encounterScale × utilScale`. This ensures Y1 expansion = 1.0 (no hidden scaling from Explore baseline mismatch) and Y2+ scales from Y1 targets. Utilization is a flat step function per year (no sigmoid ramps between years): Y1 flat at Y1%, Y2 flat at Y2%, Y3 flat at Y3%. `yearlyEncounters` is initialized from `yearlyProviders × encountersPerProvider` so encounters grow with provider expansion (not flat). `yearlyUtilization` is initialized from `state.utilizationPercent` (Explore value) for all years. UI is encounter-centric: "Contracted Encounters" replaces "Licensed Providers", encounter fields are editable inputs, "Utilized Encounters" replaces "Actively Documenting", chart annotations show encounters, "per provider at scale" is hidden, and pricing card subtitles show encounter trajectories. The `bySettings` record includes an `encounters` field for contracted encounter volumes. PDF KEY INPUTS and Methodology sections also show encounter trajectories for per-encounter settings. When providers change in ProformaHub, encounters are auto-recalculated proportionally. Editing Y1 utilization also syncs `setting.utilizationPercent`. `setting.encounters` is always synced to `yearlyEncounters.year1`.
-   **Year-by-Year Pricing**: Each pricing model (Per Provider/Month, Per Encounter, Annual Fixed Fee) supports independent prices for Year 1, Year 2, and Year 3. The `YearlyPricing` interface (`{ year1, year2, year3 }`) is stored in `ProformaSettingSnapshot.yearlyPricing`. The calculation engine (`buildMonthlyCashFlows`) resolves the active price per year based on months since go-live. Legacy single-price fields (`costPerUnit`, `costPerEncounter`, `annualLicenseFee`) are synced to Y1 for backward compatibility. For nursing settings, the unit label is "Bed" (per staffed bed).
-   **Inline Pricing Comparison**: ProformaHub edit panel includes a "Compare Pricing Models" button that expands an inline side-by-side comparison of current vs. alternative pricing model (per-provider vs. per-encounter). Shows year-by-year investment, 3-year total, net value, and ROI. User can switch pricing model directly from the comparison panel. Current side uses year-specific pricing; alternative side uses uniform pricing.
-   **Implementation and Utilization Ramps**: Configurable `implementationRampMonths` (default 3) and `yearlyUtilization` targets (55/75/85%, nursing 45/65/80%). Implementation ramp is gradual (linear fraction: 1/3, 2/3, 1.0 for 3-month ramp) — not a hard gate. Net-new providers at Y2/Y3 boundaries ramp over `implementationRampMonths` while carried-over providers remain fully ramped. "Actively Documenting" = `rampedProviders × currentUtil / 100` (stored in `bySettings.providers`). Nursing has separate UI sliders in ProformaHub when nursing settings are present. ProformaConfig state is lifted to App.tsx and reset on session clear. Driver adoption ramp duration uses `implementationRampMonths` (not hardcoded 12) to avoid double-suppression with onset delays and utilization ramps. Year 1 utilization is flat at the Y1 target (no within-year sigmoid); sigmoid transitions are only used for year-to-year changes (Y1→Y2, Y2→Y3).
-   **Driver Onset Timing**: Three onset modes with delay constants in `ONSET_DELAY_MONTHS`. `immediate`: 0.5 at monthsSinceGoLive=0, 1.0 after. `delayed`: $0 for months 1-3 (monthsSinceGoLive 0-2), hard cutoff to full value from month 4. `phased` (retention): $0 for months 1-6 (6-month delay), then year1Pct (20%) for months 7-12, year2Pct (65%) for months 13-24, year3Pct (100%) for months 25-36.
-   **IRR Removed**: All IRR calculation code, types, and tests have been fully removed from the codebase. Display metrics are: Value-to-Cost, Simple ROI, Payback, Net Value.
-   **Doc Quality Fallback**: When the user allocates time to Documentation Quality in the time allocation step but doesn't enable specific revenue drivers (wRVU, HCC, denials), a fallback "Documentation Quality" driver is automatically created using `totalHoursSaved × docQualityPct × valuePerHour`. This ensures the proforma always shows proportional doc quality value.
-   **Investment Calculation Rule**: Investment (cost side) uses FULL contracted amounts — no utilization or ramp reduction. Per Encounter: `contractedEncounters × pricePerEncounter`. Per Unit/Mo: `licensedProviders × price × 12`. Annual Flat: annual fee. Only the VALUE side is reduced by utilization, adoption ramp, and onset delays.
-   **Contract Year Field Visibility**: ProformaHub hides Year 3 pricing, provider, and encounter fields when contract term is 2 years or less. Fields shown match the number of contract years (1-year shows Y1 only, 2-year shows Y1-Y2, 3-year shows Y1-Y3).
-   **Quarterly Granularity Mode**: `ProformaConfig.granularity` supports "annual" (default) or "quarterly". `QuarterlyProviders`, `QuarterlyPricing`, and `QuarterlyUtilization` interfaces provide q1–q12 granularity (12 quarters for up to 3 years). Helper functions: `annualToQuarterlyProviders` (linear interpolation), `quarterlyToAnnualProviders` (uses Q4/Q8/Q12), `annualToQuarterlyPricing`, `quarterlyToAnnualPricing`, `annualToQuarterlyUtilization`, `quarterlyToAnnualUtilization`. Value scaling (`getProviderExpansion`), investment calculation (`getLicensedProviders`, pricing resolution), and utilization all use quarterly data when present. ProformaHub shows an Annual/Quarterly toggle; quarterly mode displays a single horizontally scrollable table with 12 columns (Q1'26–Q4'28) and rows for Providers, Utilization %, $/Mo, and Qtr Cost (read-only). ProformaView pricing cards show quarterly investment breakdown in quarterly mode.
-   **Chart Consolidation**: ProformaView has a single "Value Growth Trajectory" chart (no separate cumulative chart). Chart stacking order: Retention on bottom, Capacity & Efficiency in middle, Doc Quality on top — so Doc Quality (largest, immediate onset) is visually dominant and Retention (phased) appears as a thin base layer in early periods.
-   **Sensitivity Analysis**: Linear scaling on base summary output for conservative and optimistic scenarios.
-   **Narrative Sections**: Executive Summary callouts, simplified Cost of Waiting metrics, and refined ProformaConfig state management.
-   **PDF Structure**: A 7-page premium document with sections for Cover, Executive Summary, 3-Year Projection, Year-by-Year Narrative, Sensitivity & Risk, Methodology & Assumptions, and Back Cover. All sections are contract-term-aware (Y3 fields hidden for 2-year contracts). Executive Summary shows provider rollout trajectory. Year-by-Year cards use "Effective Adoption" label (active/licensed ratio). Model Confidence section is dynamic based on actual driver values. Sensitivity analysis uses `hasInvestment` guard for VTC display. Cover page shows "Prepared For" with organization name and generic "Financial Proforma" title. Back cover uses Abridge logo image. Year narratives support up to 6 years. All timing references (implementation ramp, delayed onset) use dynamic config values from `ONSET_DELAY_MONTHS`. Methodology describes implementation ramp as "gradual onset". Cost of Inaction shows "provider hours freed monthly". Investment bar in chart uses 0.35 opacity for print visibility. `getSettingInputSummary` has null guards for `fullExploreState`. `contractTermLabel` handles non-12-multiple months gracefully.

### System Design Choices
-   **Calculation Engines**: Two primary engines for driver-level and narrative flow pillar calculations.
-   **Confidence Haircuts**: Applied at the display layer based on data mode.
-   **Consolidated Benchmarks**: Single source of truth for key metrics.
-   **Variable Contract Terms**: Proforma supports 1–6 year contract terms.
-   **S-curve Adoption Model**: Projections use a sigmoid adoption curve.
-   **Time Allocation Page**: A dedicated Time Allocation step is included for all care settings, with a realization rate slider for Outpatient.
-   **Burden Relief Model**: Retention/wellbeing calculations use all non-capacity time as "burden relief" — doc quality + sustainability time both count toward provider hours returned. Only patient capacity (outpatient), throughput (ED), or OT reduction (nursing) is excluded. This applies across ExploreValueDrivers, ExploreModel, all PDF generators, and ExplorePDFExport.
-   **Care Setting Support**: Tailored drivers, defaults, and terminology for Outpatient, Emergency Department, Inpatient, and Nursing.
-   **Component-Driven UI**: Utilizes reusable components.
-   **Configuration-driven**: ROI levers and properties are externally managed.
-   **Pure Functions**: Encapsulated ROI calculation logic.
-   **Qualitative Driver Handling**: Adapts display and PDF exports for qualitative drivers.
-   **Explore PDF "Workforce Behind the Numbers" Page**: A dedicated page for workforce metrics, without dollar figures, is inserted into Explore PDFs for all four care settings, featuring setting-specific headlines, strategic observations, stat chips, and allocation intent blocks.
-   **Outpatient, ED, Inpatient, and Nursing PDF Narrative Rewrites**: Dedicated rendering paths for each care setting with tailored terminology, dynamic conditional blocks, and conditional documentation quality pages.

## External Dependencies

-   **UI/Charting Libraries**:
    -   Radix UI: For accessible, unstyled components.
    -   Recharts: For interactive data visualization.
    -   Lucide React: For icons.
    -   react-pdf: For generating PDF exports.
-   **Fonts**:
    -   Google Fonts: Inter, JetBrains Mono.