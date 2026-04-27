# Abridge ROI Studio

## Overview
Abridge ROI Studio is a client-side single-page web application designed to calculate the return on investment (ROI) for implementing Abridge in various healthcare settings. It enables users to select care settings, choose ROI levers, input practice-specific assumptions, and receive real-time financial impact calculations. The application provides comprehensive ROI modeling, including specialized flows for prospects switching from other ambient AI solutions or human scribes, and performance analysis for existing Abridge customers. Its core purpose is to provide defensible ROI estimates for Abridge's AI documentation tool, supporting Abridge's business vision for market penetration and customer value demonstration.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The application supports distinct user journeys: "Explore Path" for new prospects, "Assess Path" for evaluating current documentation, "Expand Path" for existing customers, "Measure Path" for partners, and "Forecast Path" (internal Abridge tool) for forward-modeling existing partner ROI.

### UI/UX Decisions
The application adheres to Material Design principles, utilizing Abridge's brand color palette, Inter and JetBrains Mono fonts, and full mobile responsiveness. It includes premium UX enhancements like smooth page transitions, staggered entrance animations, and sticky right panels.

### Technical Implementations
-   **Frontend Framework**: React 18 with TypeScript.
-   **Build Tool**: Vite.
-   **Styling**: Tailwind CSS, custom design tokens, and shadcn/ui (built on Radix UI).
-   **State Management**: Primarily React's `useState` hooks, with TanStack React Query for future API integrations.
-   **Security & Privacy**: Client-side processing, automatic session clearing, input security, and privacy-preserving analytics.
-   **Performance**: Gzip compression on the Express server.
-   **Short Links**: Server-side short URL service (`/s/:code`) using PostgreSQL `short_links` table for partner-facing URLs with a 30-day TTL.

### Feature Specifications
-   **Comprehensive ROI Modeling**: Includes specialized flows for various user journeys and detailed proforma builders for multiple care settings (Outpatient, ED, Inpatient, Nursing).
-   **Multi-Setting Proforma Builder**: Allows layering multiple care settings into a combined financial model with features like stacked area charts, 3-year P&L, card-based pricing, editable retention phasing, and scenario comparison.
-   **Forecast Path**: An internal Abridge tool for forward-modeling, including a setup wizard, dashboard, driver studio for value driver configuration with clinical inputs, and a calibration panel for global assumptions.
-   **Forecast Narrative Intelligence**: Generates plain-English prose summaries and insights based on forecast data for dashboard rendering and PDF generation.
-   **Forecast Scenario Comparison**: Allows comparison of different deal structures, pricing models, and adoption paces with KPI comparison and a "Use this deal" CTA.
-   **Forecast PDF Credibility Pass**: Upgraded PDF generation with executive summaries tiered by ROI, provenance callouts, detailed measured outcomes, driver calculation chains, and prioritized recommendations.
-   **Flexible Pricing Models**: Supports Per Provider/Month, Per Encounter, and Annual Fixed Fee models.
-   **Configurable Ramps and Onset Timings**: Allows detailed configuration of implementation and utilization ramps, and various driver onset timings.
-   **Key Metrics**: Focuses on Value-to-Cost, Simple ROI, Payback, and Net Value.
-   **Dynamic PDF Generation**: Creates premium, 9-page PDFs tailored to contract terms, care settings, and driver values, including executive summaries, assumptions, value driver details, contract projections, and sensitivity analysis.
-   **Quarterly Granularity Mode**: Provides an option for quarterly data input and display.
-   **Sensitivity Analysis**: Incorporates linear scaling for conservative and optimistic scenarios.
-   **Dedicated Workforce Insights**: Includes a "Workforce Behind the Numbers" page in Explore PDFs.
-   **Ambient Assessment PDF (Domain Maturity)**: A 9-page PDF for the Assess path capturing L1-L4 maturity across 4 domains.
-   **Deepened data collection**: Enriched data collection at thin maturity levels for revenue.
-   **Enriched PDF Roadmap page**: Domains sorted by estimated gap, showing gap value, timeline, and data-driven insights.

### System Design Choices
-   **Calculation Engines**: Two primary engines for driver-level and narrative flow pillar calculations.
-   **Data Management**: Utilizes confidence haircuts, consolidated benchmarks, and supports variable contract terms (1-6 years).
-   **Adoption Model**: Employs an S-curve adoption model for projections.
-   **Care Setting Support**: Tailored drivers, defaults, and terminology for Outpatient, Emergency Department, Inpatient, and Nursing, with structured domain maps.
-   **Measure Path (EBR)**: A multi-screen Executive Business Review tool for consolidated measurement, metric selection, financial impact allocation, and growth path analysis, supporting multi-setting data integrity. Measure quadrant pages (Capacity, Workforce, Revenue, Quality) use a per-driver With/Without entry pattern: PS picks drivers from the EXPLORE_DRIVERS catalog, enters Without/With Abridge values, adjusts attribution and realization, and sees realized dollars per driver. Quantifiable drivers carry $ math (delta × valuePerUnit × attribution% × realization%); qualitative drivers are tracked with notes only.
-   **Measure Forecast (multi-axis projection)**: Sliders for provider count, utilization, encounters (and staffed beds + occupancy for nursing) reproject every tracked driver live, anchored to its realized baseline. Each driver's `measureDefaults.scaleAxis` (`providers` | `encounters` | `patientDays` | `fixed`) selects the scaling formula. Per-quadrant cards show realized → projected, and a sticky right panel surfaces total realized vs. projected and the delta. Lazy-init seeds the projected scenario from the baseline on first arrival; a Reset control restores baseline. Note: nursing `patientDays` axis (staffed beds × occupancy) is wired in the UI but baseline values are 0 until those fields are added to `MeasureDeployment`, so nursing quality drivers do not yet reproject — a planned follow-up.
-   **Measure Forecast — pricing comparison**: A "Pricing Comparison" section on the Forecast page lets PS configure tiered pricing scenarios (Per Provider/Month, Per Encounter, or Annual License) and see annual investment computed at the combined projected scale (current setting + added expansions). Stepped tier math — all units price at the matched tier's rate. Each scenario card has an editable label, model segmented control, From/To/Rate tier table with add/remove, and a black calc card showing Investment, Net, and ROI with the applied tier highlighted. With ≥2 scenarios, the lowest-investment scenario earns a red "★ Best Value" badge and the right panel grows a "Best Pricing" block surfacing that scenario's investment + net annual value.
-   **Measure Forecast — care-setting expansion**: A "Modeled Expansions" section on the Forecast page lets PS layer additional care settings into the forecast. "+ Add a care setting" opens a modal where PS picks the setting (excluding the current one + already-added ones), enters provider count (or nurse FTEs + staffed beds + occupancy for nursing), utilization, and a Conservative/Typical/Optimistic scenario. A live preview shows the auto-computed annual value (`providers × valuePerProvider × utilization/70`, with per-setting/per-scenario value defaults in `client/src/lib/forecastDefaults.ts`). Each added setting renders as an `AddedSettingCard` with scenario toggles, a pencil-to-edit value override, and a trash to remove. The right panel becomes "Combined Annual Value" showing Realized + Projected + Expansion + Combined total. Per-driver detail for added settings is intentionally simplified (one number per setting); the value-per-provider numbers are modeling defaults pending Brad's review.
-   **Measure Outcome Summary (Step 7)**: A slim on-screen summary that reads from the new quadrant-aware data model. Three hero cards (Realized Today, Projected at Scale, Best Pricing Net) plus four per-quadrant cards (Capacity, Workforce, Revenue, Quality) summarize the model. A primary "Download Evidence Doc" button generates a PDF; "Edit Model" returns to Forecast. An empty-state card ("Build the evidence first") is shown when no drivers are tracked.
-   **Measure Evidence Doc PDF**: The Measure PDF export (`MeasurePDFExport.tsx`) consumes a quadrant-aware `MeasurePDFData` shape (drivers, quadrants, added settings, pricing scenarios). Cover page is preserved from the prior EBR design (label, subtitle composition, disclaimer). Body pages: Executive Summary, two Quadrant pages (Capacity+Workforce, Revenue+Quality) showing per-driver With/Without delta math + monthly sparklines, Forecast at Scale, Modeled Expansions (conditional), Pricing Comparison (conditional, with Best Value badge), and Methodology. The `generateMeasurePDF` entry point accepts either `MeasurePDFData` or a raw `MeasureState` (legacy compatibility for the mid-flow export in `MeasureOpportunity.tsx`); a `buildMeasurePDFDataFromState` helper handles state-to-data conversion.
-   **Architecture**: Component-driven UI, configuration-driven ROI levers, pure functions for calculation logic, and handling of qualitative drivers.
-   **Explore Quadrant Running Total**: Each Explore quadrant page (Workforce, Revenue, Quality) renders a "Progress So Far" + "Running Total" block in its right panel showing prior quadrants' annual totals plus the current quadrant, so users see cumulative annual value building up as they progress (Capacity has no priors so the block is hidden). Per-quadrant totals are computed by shared pure functions in `client/src/lib/exploreQuadrantValues.ts` (`computeCapacityBreakdown`, `computeWorkforceBreakdown`, `computeRevenueBreakdown`, `computeQualityBreakdown`); `ExploreFlow.tsx` calls them to derive the `priorQuadrants` prop passed into each page. Revenue page has no quantitative drivers wired yet but uses the shared compute function to keep its `quadrantAnnualTotal` (Revenue-tagged Other Financial Benefits roll-up) consistent with what downstream Quality sees.

## External Dependencies

-   **UI/Charting Libraries**: Radix UI, Recharts, Lucide React, react-pdf.
-   **Fonts**: Google Fonts (Inter, JetBrains Mono). Custom registered fonts: Manrope (body text), Abridge (display/heading font).