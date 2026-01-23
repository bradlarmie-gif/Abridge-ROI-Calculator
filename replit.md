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
-   **Switch Path (Value Realization Assessment)**: A 2-page diagnostic with two separate flows based on solution type:
    - **Ambient AI Path** (for prospects using other ambient AI solutions):
      1. **Assessment Page** (SwitchAssessment.tsx) - Four-dimensional value assessment:
         - Solution type selector (Ambient AI, Human Scribes)
         - Provider count and annual encounters inputs
         - 2x2 grid of dimension cards with sliders + editable number inputs: Utilization (75%), Efficiency (4 min), Quality/wRVU (+5%), Satisfaction (85%)
         - Value Realization Score using simple average of all 4 dimensions
         - Maturity spectrum bar (Early Stage <40%, Developing 40-60%, Optimized 60-80%, Transformed 80%+)
         - Live-updating "Your Annual Gap" card with gap components
      2. **Full Analysis Page** (SwitchFullAnalysis.tsx) - Comprehensive gap analysis:
         - 3 headline cards (Annual Gap, Realization Score %, 3-Year Gap)
         - "Cost of Gap Over Time" line chart (current vs Abridge trajectory)
         - "How the Gap Breaks Down" with expandable step-by-step calculation details for each dimension
         - "How Your Score is Calculated" with simple average formula
         - "The Cost of Waiting" (close now vs wait 6mo vs wait 12mo)
         - "Methodology" with all four Abridge benchmarks
         - CTAs: Export PDF, Share with Team
      - **Key Benchmarks**: Utilization 75%, Efficiency 4 min/encounter, Quality +5% wRVU, Satisfaction 85%
      - **Value Assumptions**: $150/hr × 15% conversion (utilization gap tied to time savings), $150/hr × 20% conversion (efficiency gap), $33/wRVU × 50% attribution (quality gap)
      - **Calculation Engine**: switchGapCalculator.ts with simple average realization score
      - **UI Styling**: Dollar amounts in gap cards shown in emerald-600 (green), bar text sizes increased for readability
    - **Human Scribes Path** (Scribe Program Analysis - purely educational):
      1. **Assessment Page** (ScribeAssessment.tsx) - Scribe program cost/coverage analysis:
         - Scribe program inputs: scribe count, cost per hour, hours per week
         - Provider coverage inputs: providers with scribes, total providers, annual encounters
         - "Your Coverage Gap" visualization bar showing supported vs unsupported providers
         - "What Full Scribe Coverage Would Cost" with 2 comparison cards (Current State, Full Coverage)
         - "The Burden on Unsupported Providers" with documentation time, pajama time, time per provider
      2. **Full Analysis Page** (ScribeFullAnalysis.tsx):
         - 3 headline cards (Your Investment, Your Coverage %, Cost Per Covered Provider)
         - "Your Coverage Gap" visualization and stats
         - "What Full Scribe Coverage Would Cost" with step-by-step math breakdown
         - "The Burden on Unsupported Providers" documentation time analysis
         - "How Scribe Programs Scale" with linear scaling chart and educational content
         - "Methodology & Assumptions" showing user inputs and industry assumptions
         - CTAs: Export PDF, Share with Team
      - **Key Frame**: Educational analysis - no Abridge pricing, savings, or value claims
      - **Calculation Engine**: scribeGapCalculator.ts with coverage and scaling math (no Abridge calculations)
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
-   **UI/UX**: Adheres to Material Design principles for enterprise data applications. Uses Inter and JetBrains Mono fonts. Color palette includes Abridge Cadmium Red (#EA2C00) for CTAs with #d12700 hover, muted grays, and emerald-600 for positive financial indicators.
-   **GlobalHeader Component**: Fixed 72px header used across Switch pages with: Abridge logo on left (clickable to home), "ROI Calculator · {pageName}" centered, progress dots on right. Back button placed in page content below header.
-   **Mobile Responsiveness**: Full mobile support with:
    - Responsive grids: `grid-cols-1 sm:grid-cols-2 md:grid-cols-3` pattern
    - Responsive typography: `text-2xl md:text-3xl` scaling
    - Responsive padding: `p-4 md:p-6 lg:p-8` per section
    - Touch targets: 44px minimum for interactive elements
    - Charts: Horizontally scrollable on mobile with `-mx-4 px-4` pattern
    - CTA buttons: Stack vertically on mobile with `flex-col sm:flex-row`
    - No emojis: Use lucide-react icons instead

### Security & Privacy
-   **Session Security Provider** (`SessionSecurityContext.tsx`): Wraps the application with automatic session management
    - 30-minute inactivity timeout with automatic data clear
    - 10-minute hidden tab timeout (when user switches tabs)
    - Clears all sessionStorage on tab close (beforeunload event)
    - Shows SessionExpiredModal when session times out
-   **Privacy Notice**: Displayed on home page explaining client-side processing and data handling
-   **Input Security**: All FormattedNumberInput components include `autoComplete="off"`, `data-lpignore="true"`, and `data-form-type="other"` to prevent browser/password manager autofill
-   **Content Security Policy**: Meta tag in index.html restricting script/style sources
-   **Data Sanitization**: Security utilities in `lib/security.ts` for sanitizing numbers, percentages, and text
-   **Analytics Privacy**: Data bucketing functions for privacy-preserving analytics (providerBuckets, encounterBuckets, gapBuckets)
-   **Clear Data Button** (`ClearDataButton.tsx`): Allows users to manually clear all entered data with confirmation dialog

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