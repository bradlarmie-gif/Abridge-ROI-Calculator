# Abridge ROI Studio

## Overview
Abridge ROI Studio is a client-side single-page web application designed to calculate the return on investment (ROI) for implementing Abridge in various healthcare settings. It enables users to select a care setting, choose ROI levers, input practice-specific assumptions, and receive real-time financial impact calculations. The application provides comprehensive ROI modeling, including specialized flows for prospects switching from other ambient AI solutions or human scribes, and performance analysis for existing Abridge customers. Its core purpose is to provide defensible ROI estimates for Abridge's AI documentation tool, supporting Abridge's business vision for market penetration and customer value demonstration.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The application supports distinct user journeys: an "Explore Path" for new prospects, an "Assess Path" for evaluating current documentation approaches, an an "Expand Path" for existing Abridge customers, and a "Measure Path" for partners to build a value story from deployment data.

### UI/UX Decisions
The application adheres to Material Design principles, utilizing Inter and JetBrains Mono fonts, Abridge's brand color palette, and full mobile responsiveness. Premium UX enhancements include smooth page transitions, staggered entrance animations, input debouncing, and sticky right panels for contextual calculations.

### Technical Implementations
-   **Frontend Framework**: React 18 with TypeScript.
-   **Build Tool**: Vite.
-   **Styling**: Tailwind CSS, custom design tokens, and shadcn/ui built on Radix UI primitives.
-   **State Management**: Primarily React's `useState` hooks.
-   **Data Management**: TanStack React Query for future API integrations.
-   **Security & Privacy**: Client-side processing, automatic session clearing, input security, content security policy, data sanitization, privacy-preserving analytics, and a clear data button.
-   **Deep Linking**: Supports direct navigation to methodology pages and pre-selection of care settings for the Explore flow.
-   **Mobile Responsiveness**: Tiered responsive design system with a global `useIsMobile` hook at 820px breakpoint, unified headers, and custom Tailwind breakpoints.
-   **Performance**: Gzip compression via `compression` middleware on Express server.

### Feature Specifications
-   **Measure Path**: A 5-page partner report flow allowing configuration, visualization, and expansion of Abridge's value based on deployment data, including PDF export.
-   **Assess Path — Ambient AI Assessment**: A 5-screen narrative flow (Baseline → Domains → Score → Gap Analysis → Summary) to assess ambient AI documentation maturity across Capacity, Revenue, Workforce, and Quality domains, with PDF export. All four domains have 4 maturity levels with level-specific formulas. Capacity, Revenue, and Workforce use staircase UX (progress dots, sequential advancement, framing questions, completed summaries, nextLevelTeasers, unlock teasers on future levels). costOfWaiting excluded from Capacity, Revenue, and Workforce — only shown for Quality. Key Workforce changes: L1/L2 hours-only (no dollars), L3 headline = docDrivenCost (doc-attributable, not totalCost), fabricated burnout correlations removed, Workforce Summary panel (After-Hours hrs / In-Clinic hrs / Retention Exposure $ / Agency Reduction $ / Total).
-   **Assess Path — Nursing Edition**: A 6-screen strategic alignment tool for nursing leadership, focusing on priorities like Nurse Retention and Staffing Costs, with real-time sidebar impact calculations and PDF export.
-   **Learn Methodology Section**: Restructured section providing modular methodology pages for each care setting with a consistent 5-section structure and interactive elements.
-   **Multi-Setting Proforma Builder**: Allows users to layer multiple care settings (Outpatient, ED, Inpatient, Nursing) into a combined financial model. Features include: ProformaHub for managing settings, ProformaView with stacked area ramp charts, 3-year P&L, card-based pricing, editable retention phasing, annual IRR calculation, Value-to-Cost as the primary hero metric, PDF "Showing Our Math" export, per-year provider allocation, Driver Onset Timing, Proforma Hero Benchmarks, Promoted Sensitivity Analysis, "Annual Value at Scale" hero metric, elevated ProformaHub as a deal design workspace with Gantt component and deal snapshot panel, and Scenario Comparison for saving and comparing up to 3 named scenarios.

### System Design Choices
-   **Calculation Engines**: Two primary engines for driver-level and narrative flow pillar calculations.
-   **Confidence Haircuts**: Applied at the display layer based on data mode (benchmark, estimated, measured).
-   **Consolidated Benchmarks**: Single source of truth for key metrics.
-   **Variable Contract Terms**: Proforma supports 1–6 year contract terms via "2-Year" / "3-Year" / "Custom" selector.
-   **S-curve Adoption Model**: Projections use a sigmoid adoption curve for realistic modeling.
-   **Time Allocation Page**: All care settings (OP, ED, IP, Nursing) now include a dedicated Time Allocation step (step 4 of 8) between Time Savings and Value Drivers. For Outpatient, the allocation % is the primary driver of Patient Access value; a separate realization rate slider (default 75%, range 0–100%) applies a conservative haircut on the allocated time. Math: `totalHoursSaved × allocationPercent × realizationPercent`.
-   **Care Setting Support**: Tailored drivers, defaults, and terminology for Outpatient, Emergency Department, Inpatient, and Nursing.
-   **Component-Driven UI**: Utilizes reusable components.
-   **Configuration-driven**: ROI levers and properties are externally managed.
-   **Pure Functions**: Encapsulated ROI calculation logic.
-   **Qualitative Driver Handling**: Adapts display and PDF exports for qualitative drivers.
-   **Outpatient PDF Narrative Rewrite**: The Outpatient Explore PDF uses a dedicated rendering path with McKinsey-style narrative prose, dynamic conditional blocks (getOutpatientObservation, getOutpatientClosingQuote), and a conditional Documentation Quality page (page 3) that only renders when wRVU/HCC/Denial drivers are enabled (pushing total from 4 to 5 pages). PageFooter accepts a dynamic `totalPages` prop.
-   **ED PDF Narrative Rewrite**: The ED Explore PDF uses a dedicated rendering path with ED-specific terminology (physicians/visits, Throughput Value, LWBS Recovery, Admission Capture, Clinician Wellbeing, E&M Level Accuracy). Conditional Documentation Quality page (page 3) when E&M accuracy or denial prevention enabled (4 or 5 pages). Helper functions: getEdObservation (5-way conditional), getEdClosingQuote (5-way conditional).
-   **Inpatient Value Driver Flow**: All six inpatient value drivers now flow end-to-end: Clinical Operations includes Rounding Efficiency (qualitative), Hospitalist Retention, CDI Capacity Extension, and Cost Reduction; Documentation Quality includes DRG Accuracy, Obs/IP Status Defense, and CDI Query Reduction. Time allocation labels removed from inpatient value driver cards (they implied a mathematical connection that doesn't exist).

## External Dependencies

-   **UI/Charting Libraries**:
    -   Radix UI: For accessible, unstyled components.
    -   Recharts: For interactive data visualization.
    -   Lucide React: For icons.
    -   react-pdf: For generating PDF exports.
-   **Fonts**:
    -   Google Fonts: Inter, JetBrains Mono.