# Abridge ROI Studio

## Overview

Abridge ROI Studio is a single-page web application designed to calculate the return on investment (ROI) for implementing Abridge (an AI documentation tool) in various healthcare care settings (Outpatient, Emergency Department, Nursing, Inpatient). The application empowers healthcare organizations to make data-driven decisions about adopting AI for documentation, streamlining operations, and improving financial outcomes. It allows users to select a care setting, choose ROI levers, input practice-specific assumptions, and receive real-time financial impact calculations, including ROI multiple, total annual benefit, investment costs, and net value created. The application operates entirely client-side, providing a responsive and interactive experience with a two-panel layout: inputs on the left and results (KPIs, waterfall charts, lever tables) on the right.

The project's ambition is to provide comprehensive ROI modeling across all major healthcare settings, including specialized flows for prospects switching from other ambient AI solutions or human scribes, and performance analysis for existing Abridge customers.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Core Application Flow
The application guides users through multi-step processes:
-   **Explore Path**: A 6-step sales-led flow for new prospects across Outpatient, Emergency Department, Inpatient, and Nursing care settings:
    1. Care Setting Selection (ObjectiveSelectionScreen)
    2. Strategic Priorities (ObjectiveSelectionScreen)
    3. Baseline Setup (BaselineSetup.tsx) - "Your Organization" inputs: providers, encounters, utilization rate
    4. Value Drivers (ModelBuilder.tsx) - ROI driver cards with Live Model sidebar
    5. Investment (InvestmentPage.tsx) - pricing configuration
    6. Summary (SummaryCommandCenter.tsx) - final ROI results with waterfall chart
-   **Switch Path (Unified)**: A 2-page "You vs. Your Potential" displacement calculator for prospects switching from other ambient AI solutions or scribes:
    1. **Assessment Page** (SwitchAssessment.tsx) - Data collection with live visualization:
       - Solution type selector (Ambient AI, Scribes)
       - Provider count and annual encounters inputs
       - Three gauges with Abridge benchmarks: Utilization (75%), Efficiency (4 min), Revenue/wRVU (+5%)
       - "Why Small Gaps Compound" section: utilization × efficiency × revenue = combined capture %
       - Live-updating "Your Annual Gap" card with three gap components
    2. **Full Analysis Page** (SwitchFullAnalysis.tsx) - Comprehensive gap analysis:
       - 3 headline cards (Annual Gap, Capture Rate %, 3-Year Gap)
       - "Cost of Gap Over Time" line chart (current vs Abridge trajectory)
       - "How the Gap Breaks Down" with 3 visual bar charts (utilization/efficiency/wRVU)
       - "Why Small Gaps Compound" short multiplier explanation
       - "The Cost of Waiting" (close now vs wait 6mo vs wait 12mo)
       - "Methodology" with Abridge benchmarks
       - CTAs: Schedule Demo, Export PDF, Share with Team
    - **Key Benchmarks**: Utilization 75%, Efficiency 4 min/encounter, wRVU lift +5%
    - **Value Assumptions**: $4/encounter (utilization), $150/hr × 20% conversion (efficiency), $33/wRVU × 50% attribution
    - **Calculation Engine**: switchGapCalculator.ts with three-dimensional gap breakdown and 3-year projections
-   **Expand Path**: A 5-step performance analysis flow for current Abridge customers with tiered ROI calculations:
    1. Setting Selection (ExpandSettingSelection.tsx)
    2. Deployment Setup (ExpandDeploymentSetup.tsx) - providers, encounters, utilization, months on Abridge, metric selection
    3. Data Entry (ExpandDataEntry.tsx) - Per-metric Quick/Trend entry modes with before/after values
    4. Value Configuration (ExpandValueConfiguration.tsx) - Tiered value model configuration:
       - Revenue Capture: wRVU always valued ($33/wRVU, 50% attribution)
       - Time Efficiency: Conversion method selection (None/Patient Access/Overtime)
       - Quality of Life: Optional retention estimation
       - Live preview sidebar with running totals and sanity check warnings
    5. Your Results (ExpandResults.tsx) - Consolidated results page with:
       - Headline metrics: Current Value (Tier 1), ROI multiple, Expansion Potential
       - Time-based journey graph (Before Abridge → Today → Full Scale)
       - Tiered value breakdown (Tier 1: Hard Value, Tier 2: Efficiency, Tier 3: Leading Indicators)
       - Inline expansion modeling with editable providers, utilization (max 85%), and investment
       - Export/Share functionality (PDF, email, copy link)
-   **Care Setting Selection**: Users choose a healthcare environment.
-   **Strategic Priorities Selection**: Users identify relevant ROI levers.
-   **Baseline Assumptions Wizard**: Defines adoption rates, value posture, and investment details.
-   **Calculator Screen**: Displays inputs, KPIs, a waterfall chart, and a detailed lever table.

### Technical Implementations
-   **Comprehensive Care Setting Support**: Full support for Outpatient, Emergency Department (ED), Inpatient (Hospitalist), and Nursing with specific drivers, defaults, and terminology tailored to each setting.
-   **Defensible Pathway Toggle System**: Each ROI driver includes multiple defensible value pathways that can be individually toggled, with real-time recalculation of totals and gaps. Pathways are structured with "Your Gap" and "How This Creates Value" sections, including context notes for applicability.
-   **Level of Service Calculation Refactor**: Simplified wRVU-based approach for calculating Level of Service, providing a transparent step-by-step breakdown in the UI.
-   **Component-Driven UI for Pathways**: Utilizes `PathwayCard` components for progressive disclosure of driver pathways, featuring collapsed/expanded states, editable inline inputs, one-liner summaries, and consistent visual styling.
-   **Nursing Calculation Architecture**: Dedicated nursing driver calculations in `calculateDriverValues` function use nursing-specific state (staffedBeds, nurseFTEs).
-   **State Persistence**: Model Builder state persists when navigating between Model Builder and Summary screens.

### Frontend Architecture
-   **Framework**: React 18 with TypeScript.
-   **Build Tool**: Vite.
-   **Styling**: Tailwind CSS, custom design tokens, and CSS variables.
-   **UI Components**: shadcn/ui built on Radix UI primitives.
-   **State Management**: Primarily React's `useState` hooks.
-   **Data Management**: TanStack React Query configured for future API integrations.

### Design Patterns & Principles
-   **Configuration-driven**: ROI levers and properties managed in `SETTING_CONFIG.ts`.
-   **Pure Functions**: ROI calculation logic in `roi-calculator.ts`.
-   **Reusable Components**: Extensive use of reusable UI components.
-   **Eligible Encounters Foundation**: All driver calculations derived from `eligible encounters`.
-   **UI/UX**: Adheres to Material Design principles for enterprise data applications. Uses Inter and JetBrains Mono fonts. Color palette includes Abridge Cadmium Red (#EA2C00) for CTAs with #d12700 hover, muted grays, and emerald-600 for positive financial indicators. Responsive design using Tailwind's breakpoints.
-   **GlobalHeader Component**: Fixed 72px header used across Switch pages with: Abridge logo on left (clickable to home), "ROI Calculator · {pageName}" centered, progress dots on right. Back button placed in page content below header.

### Directory Structure
-   `/client/src/pages/`: Main application screens.
-   `/client/src/components/`: Reusable UI elements.
-   `/client/src/lib/`: Business logic, types, and utility functions.

## External Dependencies

### UI/Charting Libraries
-   **Radix UI**: Accessible, unstyled components.
-   **Recharts**: Interactive charts (waterfall, bar).
-   **Lucide React**: Icon library.

### Build & Development Tools
-   **Vite**: Frontend build tool.
-   **TypeScript**: Type safety.

### Fonts
-   **Google Fonts**: Inter, JetBrains Mono.