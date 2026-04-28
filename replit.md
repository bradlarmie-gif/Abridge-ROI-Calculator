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
-   **Short Links**: Server-side short URL service (`/s/:code`) using PostgreSQL `short_links` table for partner-facing URLs.

### Feature Specifications
-   **Comprehensive ROI Modeling**: Includes specialized flows for various user journeys and detailed proforma builders for multiple care settings (Outpatient, ED, Inpatient, Nursing).
-   **Multi-Setting Proforma Builder**: Allows layering multiple care settings into a combined financial model with features like stacked area charts, 3-year P&L, card-based pricing, editable retention phasing, and scenario comparison.
-   **Forecast Path**: An internal Abridge tool for forward-modeling, including a setup wizard, dashboard, driver studio for value driver configuration with clinical inputs, and a calibration panel for global assumptions.
-   **Forecast Narrative Intelligence**: Generates plain-English prose summaries and insights based on forecast data.
-   **Forecast Scenario Comparison**: Allows comparison of different deal structures, pricing models, and adoption paces with KPI comparison.
-   **Dynamic PDF Generation**: Creates premium, tailored PDFs including executive summaries, assumptions, value driver details, contract projections, and sensitivity analysis.
-   **Flexible Pricing Models**: Supports Per Provider/Month, Per Encounter, and Annual Fixed Fee models.
-   **Configurable Ramps and Onset Timings**: Allows detailed configuration of implementation and utilization ramps, and various driver onset timings.
-   **Key Metrics**: Focuses on Value-to-Cost, Simple ROI, Payback, and Net Value.
-   **Sensitivity Analysis**: Incorporates linear scaling for conservative and optimistic scenarios.
-   **Ambient Assessment PDF (Domain Maturity)**: A 9-page PDF for the Assess path capturing L1-L4 maturity across 4 domains.

### System Design Choices
-   **Calculation Engines**: Two primary engines for driver-level and narrative flow pillar calculations.
-   **Data Management**: Utilizes confidence haircuts, consolidated benchmarks, and supports variable contract terms (1-6 years).
-   **Adoption Model**: Employs an S-curve adoption model for projections.
-   **Care Setting Support**: Tailored drivers, defaults, and terminology for Outpatient, Emergency Department, Inpatient, and Nursing, with structured domain maps.
-   **Measure Path (EBR)**: A multi-screen Executive Business Review tool for consolidated measurement, metric selection, financial impact allocation, and growth path analysis, supporting multi-setting data integrity. It uses a per-driver With/Without entry pattern for quantifiable and qualitative drivers.
-   **Measure Forecast**: Provides multi-axis projection with sliders for key metrics to reproject tracked drivers live, anchored to their realized baseline. Includes pricing comparison and care-setting expansion modeling.
-   **Measure Outcome Summary**: A slim on-screen summary for Realized Today, Projected at Scale, Best Pricing Net, and four per-quadrant summaries (Capacity, Workforce, Revenue, Quality).
-   **Measure Evidence Doc PDF**: The Measure PDF export consumes a quadrant-aware data model, including executive summary, two quadrant pages with driver delta math and monthly sparklines, Forecast at Scale, Modeled Expansions (conditional), Pricing Comparison (conditional), and Methodology.
-   **Architecture**: Component-driven UI, configuration-driven ROI levers, pure functions for calculation logic, and handling of qualitative drivers.
-   **Explore Quadrant Information Architecture**: Each Explore quadrant page categorizes drivers into "Financial Drivers" (quantified) and "Other Metrics to Watch" (qualitative), with corresponding groupings in the right-side sticky panel. Qualitative drivers are curated and setting-specific, and do not impact monetary calculations.
-   **Explore Step 9 OP Connected Value**: An Outpatient-specific "Connected Value" narrative section rendered in `ExploreModel.tsx` Step 9, providing insights into value generation for Outpatient settings.
-   **Explore IP Driver Lineup (R-IP-1)**: The Inpatient Explore path is realigned to product reality. Capacity centers on H&P Completion Within 24 Hours (replacing Rounding Efficiency); Revenue drops the E/M Coding Accuracy financial driver entirely; Quality lands at four qualitative items — Note Quality (Star Rating), Hand-Off Completeness, Discharge Documentation Completeness, and Leapfrog Hospital Safety Grade (intentional exception to the 3-per-quadrant rule). Workforce is unchanged.
-   **Explore ED Driver Lineup (R-ED-1)**: The Emergency Department Explore path is consolidated and polished to product reality. Capacity replaces Door-to-Disposition + Bed Turnover with Encounters per Provider per Shift + End-of-Shift Note Completion Rate (Door-to-Provider Time retained). Revenue replaces CDI Query Volume Trend with Down-coding Rate (more ED-specific, directly Abridge-moveable). Quality replaces Provider Communication with Admission Hand-Off Completeness (parallel to IP's Hand-Off Completeness, system-wide story when ED admits). Workforce unchanged. Each ED quadrant lands at exactly 3 qualitative items.

## External Dependencies

-   **UI/Charting Libraries**: Radix UI, Recharts, Lucide React, react-pdf.
-   **Fonts**: Google Fonts (Inter, JetBrains Mono), Manrope, Abridge.