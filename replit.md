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
-   **State Management**: Primarily React's `useState` hooks, with TanStack React Query for future API integrations.
-   **Security & Privacy**: Client-side processing, automatic session clearing, input security, and privacy-preserving analytics.
-   **Performance**: Gzip compression on the Express server.

### Feature Specifications
-   **Comprehensive ROI Modeling**: Includes specialized flows for various user journeys (Explore, Assess, Expand, Measure Paths) and detailed proforma builders for multiple care settings (Outpatient, ED, Inpatient, Nursing).
-   **Multi-Setting Proforma Builder**: Allows layering multiple care settings into a combined financial model with features like stacked area charts, 3-year P&L, card-based pricing, editable retention phasing, and scenario comparison.
-   **Flexible Pricing Models**: Supports Per Provider/Month, Per Encounter, and Annual Fixed Fee models in both the Explore flow and Proforma builder, with Year-by-Year pricing and an inline pricing comparison tool.
-   **Configurable Ramps and Onset Timings**: Allows detailed configuration of implementation and utilization ramps, and various driver onset timings (immediate, delayed, phased).
-   **Key Metrics**: Focuses on Value-to-Cost, Simple ROI, Payback, and Net Value.
-   **Dynamic PDF Generation**: Creates premium, 9-page PDFs tailored to contract terms, care settings, and driver values. Pages: Cover, Executive Summary, Key Assumptions & Configuration (deployment profile, pricing, implementation phasing), Value Driver Detail (per-driver breakdown with narratives, category subtotals, workforce impact), Contract Projection (stacked chart + P&L table), Year-by-Year Narrative, Sensitivity & Risk, Methodology & Assumptions, Back Cover. The `getDriverNarrative` helper generates per-driver explanations (wRVU, HCC, retention, patient access, LWBS, OT reduction, DRG, CDI, etc.).
-   **Quarterly Granularity Mode**: Provides an option for quarterly data input and display for providers, pricing, and utilization.
-   **Additional Cost Savings (Nursing)**: The Nursing Explore flow includes an "Additional Cost Savings" section on the Value Drivers page. Users can add multiple free-text line items (label + dollar amount) as one-time benefits. Items must have a non-empty label to be counted. These flow into the time value total, appear as driver entries on the summary card, render in the right-side summary panel, and are included in the Explore PDF under Staffing Efficiency. State: `timeDriverInputs.nursingAdditionalCostSavings: Array<{ id: string; label: string; amount: number }>`.
-   **Sensitivity Analysis**: Incorporates linear scaling for conservative and optimistic scenarios.
-   **Dedicated Workforce Insights**: Includes a "Workforce Behind the Numbers" page in Explore PDFs for workforce metrics without dollar figures.
-   **Ambient Assessment PDF (Domain Maturity)**: An 8-page PDF (`ambient-assessment-pdf.tsx`) for the Assess path that captures L1-L4 maturity across 4 domains (Capacity, Revenue, Workforce, Quality). Each domain page renders the user's specific inputs (checklist selections, before/after metrics, granular numbers), the calculation formula, dynamic context narrative from the domain feedback engine, and methodology footnotes. The PDF data flows from `Screen4Domains.tsx` (dispatches context/formula/footnote) through `Screen6Invitation.tsx` (builds `userInputs` summary via `buildUserInputsSummary` helper) into the PDF renderer. The legacy Switch PDF (`AmbientPDFExport.tsx`) has been removed.
    - **Deepened data collection at thin maturity levels**: Capacity L2 now collects weekly hours recovered, scheduling change status, and additional slots per week. Revenue L1 collects E&M complexity distribution and deficiency/query rate. Revenue L2 collects coding specificity improvement % and current denial rate %. Quality L1 collects chart completion rate and coding accuracy %. Quality L2 collects compliance audit pass rate and days to chart closure. All produce estimated opportunity calculations in the domain feedback engine.
    - **Organization context**: Screen2Baseline collects optional org profile (system size, org type, payer mix) stored as `systemSize`, `orgType`, `payerMixMedicare/Medicaid/Commercial` on `SwitchInputs`. Passed to PDF as `orgContext`.
    - **Enriched PDF Roadmap page**: Domains sorted by estimated gap (largest opportunity first). Each domain shows gap value, 30/60/90-day timeline tag, and data-driven insights referencing user's specific inputs and org context. Top priority domain highlighted. Org context chips shown at top.

### System Design Choices
-   **Calculation Engines**: Two primary engines for driver-level and narrative flow pillar calculations.
-   **Data Management**: Utilizes confidence haircuts, consolidated benchmarks, and supports variable contract terms (1-6 years).
-   **Adoption Model**: Employs an S-curve adoption model for projections.
-   **Inline Driver Inputs**: The capacity realization rate is embedded directly in the Patient Access driver (Outpatient). The nursing care time percentage is embedded in the Care Quality section (Nursing). No separate time allocation step exists — the Explore flow is 7 steps: Care Setting → Practice → Time Savings → Value Drivers → Doc/Care Quality → Investment → Your Model.
-   **Burden Relief Model**: Retention/wellbeing calculations use fixed allocation defaults (33/34/33 split across categories).
-   **Care Setting Support**: Tailored drivers, defaults, and terminology for Outpatient, Emergency Department, Inpatient, and Nursing.
-   **Architecture**: Component-driven UI, configuration-driven ROI levers, pure functions for calculation logic, and handling of qualitative drivers.

## External Dependencies

-   **UI/Charting Libraries**: Radix UI, Recharts, Lucide React, react-pdf.
-   **Fonts**: Google Fonts (Inter, JetBrains Mono).