# Abridge ROI Studio

## Overview
Abridge ROI Studio is a client-side single-page web application designed to calculate the return on investment (ROI) for implementing Abridge in various healthcare settings. It allows users to select a care setting, choose ROI levers, input practice-specific assumptions, and receive real-time financial impact calculations. The application provides comprehensive ROI modeling, including specialized flows for prospects switching from other ambient AI solutions or human scribes, and performance analysis for existing Abridge customers. Its core purpose is to provide defensible ROI estimates for Abridge's AI documentation tool, supporting Abridge's business vision for market penetration and customer value demonstration.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The application supports distinct user journeys: "Explore Path" for new prospects, "Assess Path" for evaluating current documentation, "Expand Path" for existing customers, "Measure Path" for partners, and "Forecast Path" (internal Abridge tool) for forward-modeling existing partner ROI under different pricing/adoption/term configurations.

### UI/UX Decisions
The application adheres to Material Design principles, utilizing Abridge's brand color palette, Inter and JetBrains Mono fonts, and full mobile responsiveness. It includes premium UX enhancements like smooth page transitions, staggered entrance animations, and sticky right panels.

### Technical Implementations
-   **Frontend Framework**: React 18 with TypeScript.
-   **Build Tool**: Vite.
-   **Styling**: Tailwind CSS, custom design tokens, and shadcn/ui (built on Radix UI).
-   **State Management**: Primarily React's `useState` hooks, with TanStack React Query for future API integrations.
-   **Security & Privacy**: Client-side processing, automatic session clearing, input security, and privacy-preserving analytics.
-   **Performance**: Gzip compression on the Express server.
-   **Short Links**: Server-side short URL service (`/s/:code`) using PostgreSQL `short_links` table. Partner-facing URLs (data request forms, data receipts, intake receipts) are stored server-side with 30-day TTL and resolved via 302 redirect, keeping the main app URL hidden from partners. API: `POST /api/shorten`, `GET /s/:code`.

### Feature Specifications
-   **Comprehensive ROI Modeling**: Includes specialized flows for various user journeys (Explore, Assess, Expand, Measure Paths) and detailed proforma builders for multiple care settings (Outpatient, ED, Inpatient, Nursing).
-   **Multi-Setting Proforma Builder**: Allows layering multiple care settings into a combined financial model with features like stacked area charts, 3-year P&L, card-based pricing, editable retention phasing, and scenario comparison.
-   **Forecast Path (Phase 1)**: Internal Abridge tool routed at `/forecast`. Three-step setup wizard (Start → Configure → Build scenarios) followed by a Dashboard. Phase 1 ships the entry screen (`ForecastStart`) with three entry points — Import from Measure (stub dialog), Start from scratch, Load saved Forecast (sessionStorage list) — plus partner-context fields, session persistence via `forecastUrlState` (LZString-compressed `?f=` param mirroring measure pattern), and placeholder shells for Configure/Build/Dashboard. Types live in `client/src/pages/forecast/types.ts` (ForecastState, ForecastScenario, PricingConfig, AdoptionCurve, UtilizationCurve, EncounterShareCurve, ForecastValueDriver, DriverClinicalInputs, SavedForecast). Reuses shared `MAX_SCENARIOS=4` from proforma. Header uses `pathType="forecast"` (added to UnifiedHeader PathType union). JourneySelector grid expanded from 3 to 4 cards with `LineChart` icon for the Forecast tile. Shared proforma changes: `CONTRACT_TERM_OPTIONS` shrunk from 2–6 yr to 1–5 yr; `DriverOnset` extended with `longTerm` (15-month delay).
-   **Forecast Driver Studio (Phase 5)**: Every value driver carries an optional `clinicalInputs` block (`DriverClinicalInputs`) that preserves the raw before/after metrics, factor values, and allocation %. `convertMeasureToForecast` seeds clinicalInputs on all 7 measure-derived drivers (time savings, work-outside-hours, wRVU lift, E/M lift, denial reduction, throughput, CMI, nursing OT, retention). The Forecast Dashboard driver expansion panel renders an "Adjust Inputs · recalculates live" section using `recalculateProjectedDelta()` to recompute projectedDelta on every keystroke. The Add Driver dialog has a `DRIVER_TEMPLATES` selector (10 templates: custom, timeSavingsWorkforce/Capacity, wrvuLift, emLevelLift, cmiLift, hccCapture, denialReduction, retentionLift, nursingOvertimeReduction) that auto-fills domain/onset/scaling and exposes the appropriate clinical input fields with smart defaults.
-   **Flexible Pricing Models**: Supports Per Provider/Month, Per Encounter, and Annual Fixed Fee models.
-   **Configurable Ramps and Onset Timings**: Allows detailed configuration of implementation and utilization ramps, and various driver onset timings.
-   **Key Metrics**: Focuses on Value-to-Cost, Simple ROI, Payback, and Net Value.
-   **Dynamic PDF Generation**: Creates premium, 9-page PDFs tailored to contract terms, care settings, and driver values, including executive summaries, assumptions, value driver details, contract projections, and sensitivity analysis.
-   **Quarterly Granularity Mode**: Provides an option for quarterly data input and display.
-   **Additional Cost Savings (Nursing)**: Supports free-text line items for one-time benefits in the Nursing Explore flow.
-   **Sensitivity Analysis**: Incorporates linear scaling for conservative and optimistic scenarios.
-   **Dedicated Workforce Insights**: Includes a "Workforce Behind the Numbers" page in Explore PDFs.
-   **Ambient Assessment PDF (Domain Maturity)**: A 9-page PDF for the Assess path capturing L1-L4 maturity across 4 domains (Capacity, Revenue, Workforce, Quality) with dynamic context narrative and methodology footnotes.
-   **Deepened data collection at thin maturity levels**: Revenue L1 collects E&M complexity distribution and deficiency/query rate; Revenue L2 collects coding specificity improvement % and current denial rate %.
-   **Enriched PDF Roadmap page**: Domains sorted by estimated gap, showing gap value, timeline, and data-driven insights.

### System Design Choices
-   **Calculation Engines**: Two primary engines for driver-level and narrative flow pillar calculations.
-   **Data Management**: Utilizes confidence haircuts, consolidated benchmarks, and supports variable contract terms (1-6 years).
-   **Adoption Model**: Employs an S-curve adoption model for projections.
-   **Patient Access (Outpatient)**: Uses a direct `additionalVisitsPerWeek` input with presets and a formula for revenue calculation.
-   **Nursing OT Reduction**: Uses concrete inputs grounded in actual OT spend for calculating reduction.
-   **Care Quality (Nursing)**: HAPI and Falls prevention rates directly drive values.
-   **Burden Relief Model**: Retention/wellbeing calculations use fixed allocation defaults.
-   **ED LWBS Recovery**: Uses a slider with presets for expected LWBS reduction, including admission capture as a sub-toggle.
-   **Care Setting Support**: Tailored drivers, defaults, and terminology for Outpatient, Emergency Department, Inpatient, and Nursing. All four care settings now have structured domain maps (`OUTPATIENT_METRICS`, `ED_METRICS`, `INPATIENT_METRICS`, `NURSING_METRICS`) with per-setting metric arrays, sync functions, data entry sections, and journey domain cards.
-   **Measure Path (EBR)**: Consolidated multi-screen Executive Business Review tool with story arc: 1-Data Entry (MeasureDataEntry) → 2-Metric Selection (MeasureMetricSelection) → 3-Measurement Picture (MeasureJourney) → 4-Financial Impact (MeasureAllocate) → 5-Growth Path (MeasureOpportunity). Screen 4 (Financial Impact) uses a three-category defensible model: Billing Capture (wRVU lift via measured delta or implied from E/M levels using `EM_TO_WRVU` mapping, CMI), Revenue Recovery (LWBS for ED, denial reduction), and Actual Cost Reduction (after-hours OT payroll savings, retention signal from burnout/likelihood-to-stay). E/M level data is converted to implied wRVU delta (no separate $45/level line). ALOS calculation is split into cost avoidance (always shown) and throughput revenue (only when census-constrained toggle is checked). Hero shows animated count-up dollar range only when financial data exists; sensitivity panel with attribution/realization sliders recalculates all values live. Value stream toggle system persists `streamStates` and `censusConstrained` into MeasureState. Optional `annualContractValue` in deployment enables ROI ratio, payback period, and net value cards on Screen 5 and in PDF. `CONFIDENCE_LABELS` mapping provides maturity-aware output labels (Benchmark estimate → Directional estimate → Based on measured outcomes → Financially documented). Features `SettingStage` data model with `deriveSettingStage()` for per-setting maturity. Domain-level value breakdowns via `calculateConfirmedValue()` with `ConfirmedDomainValues`, Abridge native metrics (`ABRIDGE_NATIVE_METRICS`), trend tracking. DataSource badges: Analytics Pull / Partner Platform / Team Estimate. Multi-setting data integrity: when 2+ care settings are active, Data Entry shows per-setting provider and encounter count inputs to prevent double-counting; calculations use `resolveSettingCounts()` with per-setting fallback (even split of global, nursing excluded from split denominator); Financial Impact and PDF show per-setting breakdown table with providers, encounters, and value range per setting.
-   **Architecture**: Component-driven UI, configuration-driven ROI levers, pure functions for calculation logic, and handling of qualitative drivers.

## External Dependencies

-   **UI/Charting Libraries**: Radix UI, Recharts, Lucide React, react-pdf.
-   **Fonts**: Google Fonts (Inter, JetBrains Mono). PDF generators use custom registered fonts: Manrope (body text, regular + bold), Abridge (display/heading font for titles fontSize 14+).