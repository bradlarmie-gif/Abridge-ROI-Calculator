# Abridge ROI Studio

## Overview

Abridge ROI Studio is a single-page web application designed to calculate the return on investment (ROI) for implementing Abridge (an AI documentation tool) in various healthcare care settings (Outpatient, Emergency Department, Nursing, Inpatient). The application enables users to select a care setting, choose ROI levers, input practice-specific assumptions, and receive real-time financial impact calculations, including ROI multiple, total annual benefit, investment costs, and net value created. The primary goal is to empower healthcare organizations to make data-driven decisions about adopting AI for documentation, streamlining operations, and improving financial outcomes.

The application operates entirely client-side, providing a responsive and interactive experience with a two-panel layout: inputs on the left and results (KPIs, waterfall charts, lever tables) on the right.

### Recent Changes (January 2026)
- **EXPLORE Path Redesign**: New 4-step sales-led flow (Care Setting → Strategic Priorities → Model Builder → Summary)
- **Model Builder (Step 3)**: 65/35 split layout with Organization inputs, Value Driver accordions, Investment section, and sticky Live Model sidebar
- **Enhanced Strategic Priorities**: Context tags with color coding (amber/orange/slate/green) and value ranges
- **6 Driver-Specific Flows (Outpatient)**: Overtime, Patient Access, Retention, Level of Service, HCC Capture, Denials
- **Emergency Department (ED) Support**: Full ED support with 5 ED-specific drivers:
  - Patient Throughput / LWBS Reduction (edThroughput)
  - Scribe Cost Reduction (edScribe)
  - Physician Retention (edRetention)
  - Level-of-Service Accuracy (edLevelOfService)
  - Documentation-Related Denials (edDenials)
- **ED-Specific Defaults**: 25 physicians (vs 50 providers), 1,800 encounters/physician (vs 2,000), utilization rates 55/70/85% (vs 50/65/80%)
- **Inpatient (Hospitalist) Support**: Full Inpatient support with 5 hospitalist-specific drivers:
  - Rounding Efficiency & Time Savings (inpatientRounding)
  - Hospitalist Retention (inpatientRetention)
  - CC/MCC Capture / DRG Optimization (inpatientCCMCC)
  - CDI Query Reduction (inpatientCDI)
  - Documentation-Related Denials (inpatientDenials)
- **Inpatient-Specific Defaults**: 20 hospitalists (vs 50 providers), 400 admissions/hospitalist (8,000 total), uses "hospitalists" and "admissions" terminology, hospitalist-specific burnout rates (55%) and denial patterns (45% doc-related)
- **State Persistence**: Model Builder state now persists when navigating to Summary and back via initialResults prop

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Core Application Flow
The application guides users through a multi-step process:
1.  **Care Setting Selection**: Users choose a healthcare environment (Outpatient, ED, Nursing, Inpatient).
2.  **Strategic Priorities Selection**: Users identify relevant ROI levers, grouped by categories like 'Time Savings' or 'Documentation Quality'.
3.  **Baseline Assumptions Wizard**: A three-step process to define adoption rates, value posture (Conservative, Typical, Aggressive), and investment details.
4.  **Calculator Screen**: The main interface displaying inputs, KPIs, a waterfall chart visualizing financial impact, and a detailed lever table.

### Specific Flow Enhancements
-   **Nursing Flow**: Features dedicated strategic priorities with up to 8 drivers, a Value Methodology page explaining driver impact with reference scenarios, and a specialized Value Posture step with predefined presets and fine-tuning options.
-   **Expansion Calculator**: A 4-step wizard for modeling ROI in provider expansion scenarios, including baseline review, expansion planning, a "Reality Check" for driver validation, and 3-year maturity model projections.
-   **New Care Setting Flow**: A two-step process to explore adding new care settings to an existing deployment, offering educational insights and a "Combined Preview" with real-time ROI calculations for integrated deployments, considering volume discounts and driver inheritance.
-   **Competitor Comparison Wizard**: A 4-step wizard enabling users to compare the incremental value of Abridge against other ambient documentation vendors. Features:
    - **Step 3 Driver Math Cards**: Side-by-side visual calculation waterfalls showing competitor (gray) vs Abridge (green) flows
    - **Editable Assumptions**: Inline editable fields with pencil icons for key assumptions (realization factor, revenue per visit, overtime rate, wRVU rate, etc.)
    - **Progressive Driver Reveal**: "Add Driver" button to progressively add Overtime Savings and Level of Service cards
    - **Total Gap Summary**: Aggregated view showing breakdown of all enabled driver gaps
    - **Critical Benchmark**: Abridge saves 3 minutes per encounter (documented benchmark)

### Frontend Architecture
-   **Framework**: React 18 with TypeScript.
-   **Build Tool**: Vite for rapid development and hot module replacement.
-   **Styling**: Tailwind CSS, utilizing custom design tokens and CSS variables.
-   **UI Components**: shadcn/ui built on Radix UI primitives for accessibility and consistent design.
-   **State Management**: Primarily React's `useState` hooks, suitable for the application's complexity.
-   **Data Management**: TanStack React Query is configured for potential future API integrations.

### Design Patterns & Principles
-   **Configuration-driven**: All ROI levers and their properties are centrally managed in `SETTING_CONFIG.ts`.
-   **Pure Functions**: ROI calculation logic is encapsulated in side-effect-free functions (`roi-calculator.ts`).
-   **Reusable Components**: Extensive use of reusable UI components like `CareSettingCard` and a consistent background pattern.
-   **Eligible Encounters Foundation**: All driver calculations are meticulously derived from `eligible encounters` (annual encounters × utilization rate) to ensure accurate and dynamic recalculations across the application.
-   **UI/UX**: Adheres to Material Design principles with a focus on enterprise data applications. Uses Inter for UI text and JetBrains Mono for numerical data. The color palette emphasizes professionalism with Abridge Red for branding, muted grays, and greens for financial indicators. Responsive design is implemented using Tailwind's breakpoints, ensuring adaptability across devices, with layouts adjusting from two-column desktop to single-column mobile.

### Directory Structure
-   `/client/src/pages/`: Main application screens.
-   `/client/src/components/`: Reusable UI elements.
-   `/client/src/lib/`: Business logic, types, and utility functions.

## External Dependencies

### UI/Charting Libraries
-   **Radix UI**: Provides accessible, unstyled components for building custom UI.
-   **Recharts**: Used for generating interactive charts, specifically waterfall and bar charts.
-   **Lucide React**: An icon library for visual elements.

### Build & Development Tools
-   **Vite**: Frontend build tool.
-   **TypeScript**: Ensures type safety throughout the codebase.

### Fonts
-   **Google Fonts (Inter, JetBrains Mono)**: Used for consistent typography.