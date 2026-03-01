# Abridge ROI Studio

## Overview
Abridge ROI Studio is a client-side single-page web application designed to calculate the return on investment (ROI) for implementing Abridge in various healthcare settings. It enables users to select a care setting, choose ROI levers, input practice-specific assumptions, and receive real-time financial impact calculations. The application provides comprehensive ROI modeling, including specialized flows for prospects switching from other ambient AI solutions or human scribes, and performance analysis for existing Abridge customers. Its core purpose is to provide defensible ROI estimates for Abridge's AI documentation tool, supporting Abridge's business vision for market penetration and customer value demonstration.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The application supports distinct user journeys: an "Explore Path" for new prospects, an "Assess Path" for evaluating current documentation approaches, an "Expand Path" for existing Abridge customers, and a "Measure Path" for partners to build a value story from deployment data.

### UI/UX Decisions
The application adheres to Material Design principles, utilizing Inter and JetBrains Mono fonts, Abridge's brand color palette (Abridge Cadmium Red #EA2C00), and full mobile responsiveness. Premium UX enhancements include smooth page transitions, staggered entrance animations, input debouncing, and sticky right panels for contextual calculations.

### Technical Implementations
-   **Frontend Framework**: React 18 with TypeScript.
-   **Build Tool**: Vite.
-   **Styling**: Tailwind CSS, custom design tokens, and shadcn/ui built on Radix UI primitives.
-   **State Management**: Primarily React's `useState` hooks.
-   **Data Management**: TanStack React Query for future API integrations.
-   **Security & Privacy**: Client-side processing, automatic session clearing, input security, content security policy, data sanitization, privacy-preserving analytics, and a clear data button.
-   **Deep Linking**: Supports direct navigation to methodology pages and pre-selection of care settings for the Explore flow.

### Feature Specifications
-   **Measure Path**: A 5-page partner report flow allowing partners to configure, visualize, and expand Abridge's value based on deployment data, including PDF export.
-   **Assess Path — Ambient AI Assessment**: A 5-screen narrative flow to assess ambient AI documentation maturity across Capacity, Revenue, Workforce, and Risk domains, featuring dynamic scoring, gap analysis, 3-year projections, and PDF export.
-   **Assess Path — Nursing Edition**: A 6-screen strategic alignment tool for nursing leadership, focusing on priorities like Nurse Retention and Staffing Costs, with real-time sidebar impact calculations and PDF export.
-   **Learn Methodology Section**: Restructured section providing modular methodology pages for each care setting with a consistent 5-section structure and interactive elements.
-   **Multi-Setting Proforma Builder**: Allows users to layer multiple care settings (Outpatient, ED, Inpatient, Nursing) into a combined financial model. Features include:
    -   ProformaHub for managing settings and inline editing assumptions.
    -   ProformaView with stacked area ramp charts, 3-year P&L, card-based pricing (per-unit/month and annual flat license toggle per care setting), editable retention phasing, and Quarters/Years toggle.
    -   Annual IRR calculation using total-cost-basis approach: Period 0 = -(implementation fees + total subscription), Periods 1-N = gross annual value. Newton-Raphson with MIRR fallback, capped at 200% for display.
    -   Value-to-Cost as the primary hero metric.
    -   PDF "Showing Our Math" export that reconstructs per-driver formula strings.
    -   Per-year provider allocation for flexible ramp modeling.
    -   Driver Onset Timing (immediate, delayed, phased) for realistic cash flow projections.
    -   Proforma Hero Benchmarks for contextual annotations of key metrics with guardrails (VtC > 10x, payback < 2mo, ROI > 1000% trigger "Validate assumptions" annotations).
    -   Promoted Sensitivity Analysis for value-realization-only scenarios (70%/100%/130%).
    -   "Annual Value at Scale" hero metric using run-rate value (last 12 months of cash flows) instead of raw unscaled base value, for CFO defensibility.
    -   Elevated ProformaHub as a deal design workspace with Gantt component and deal snapshot panel.
    -   Scenario Comparison for saving and comparing up to 3 named scenarios with side-by-side metrics and overlay charts.

### PDF Value Consistency
-   **Single Source of Truth**: All financial values in PDF exports are derived from the `sum(drivers array)` to prevent divergence.
-   **Driver Array Alignment**: The driver array includes all drivers contributing to time and documentation value, with matching conditions and formulas per care setting.
-   **Clinician Retention**: Unified calculation for outpatient, ED, and inpatient settings.
-   **Care-Setting-Specific Exclusions**: Inpatient denials are excluded, and cost reduction drivers are included for all non-nursing settings.

### System Design Choices
-   **Calculation Engines**: Two primary engines for driver-level and narrative flow pillar calculations.
-   **Confidence Haircuts**: Applied at the display layer based on data mode (benchmark, estimated, measured).
-   **Consolidated Benchmarks**: Single source of truth for key metrics.
-   **S-curve Adoption Model**: 3-year projections use a sigmoid adoption curve for realistic modeling.
-   **Care Setting Support**: Tailored drivers, defaults, and terminology for Outpatient, Emergency Department, Inpatient, and Nursing.
-   **Component-Driven UI**: Utilizes reusable components.
-   **Configuration-driven**: ROI levers and properties are externally managed.
-   **Pure Functions**: Encapsulated ROI calculation logic.
-   **Qualitative Driver Handling**: Adapts display and PDF exports for qualitative drivers to avoid misleading "$0" values.

## External Dependencies

-   **UI/Charting Libraries**:
    -   Radix UI: For accessible, unstyled components.
    -   Recharts: For interactive data visualization.
    -   Lucide React: For icons.
    -   react-pdf: For generating PDF exports.
-   **Fonts**:
    -   Google Fonts: Inter, JetBrains Mono.