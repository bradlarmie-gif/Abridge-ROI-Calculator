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
-   **Multi-Setting Proforma Builder**: Allows layering multiple care settings (Outpatient, ED, Inpatient, Nursing) into a combined financial model. Features include: ProformaHub for managing settings, ProformaView with stacked area charts, 3-year P&L, card-based pricing, editable retention phasing, annual IRR calculation, Value-to-Cost as the primary hero metric, and Scenario Comparison.
-   **Proforma Enhancements**: Includes detailed investment calculation, per-provider value metrics, refined IRR calculation, clear hours returned context, full edit round-trip, engine-level retention calculation with configurable rates, display of both licensed and actively documenting providers, payback context, specific chart colors, and inline "Compare Pricing Models" tool.
-   **Per-Encounter Scaling**: Per-encounter investment auto-scales with provider rollout and utilization — monthly encounters = `licensedProviders × (encounters/providers) × (utilization/100) / 12`. The `computeYearlyEncounters` helper provides year-level summaries.
-   **Inline Pricing Comparison**: ProformaHub edit panel includes a "Compare Pricing Models" button that expands an inline side-by-side comparison of current vs. alternative pricing model (per-provider vs. per-encounter). Shows year-by-year investment, 3-year total, net value, and ROI. User can switch pricing model directly from the comparison panel.
-   **Implementation and Utilization Ramps**: Configurable `implementationRampMonths` (default 6) and `yearlyUtilization` targets (55/75/85%, nursing 45/65/80%) with sigmoid transitions. Nursing has separate UI sliders in ProformaHub when nursing settings are present. ProformaConfig state is lifted to App.tsx and reset on session clear.
-   **Sensitivity Analysis**: Linear scaling on base summary output for conservative and optimistic scenarios.
-   **Narrative Sections**: Executive Summary callouts, simplified Cost of Waiting metrics, and refined ProformaConfig state management.
-   **PDF Structure**: A 7-page premium document with sections for Cover, Executive Summary, 3-Year Projection, Year-by-Year Narrative, Sensitivity & Risk, Methodology & Assumptions, and Back Cover.

### System Design Choices
-   **Calculation Engines**: Two primary engines for driver-level and narrative flow pillar calculations.
-   **Confidence Haircuts**: Applied at the display layer based on data mode.
-   **Consolidated Benchmarks**: Single source of truth for key metrics.
-   **Variable Contract Terms**: Proforma supports 1–6 year contract terms.
-   **S-curve Adoption Model**: Projections use a sigmoid adoption curve.
-   **Time Allocation Page**: A dedicated Time Allocation step is included for all care settings, with a realization rate slider for Outpatient.
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