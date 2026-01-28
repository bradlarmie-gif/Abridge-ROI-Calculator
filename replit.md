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
-   **Switch Path (Value Realization Assessment)**: Different flows based on solution type:
    - **Ambient AI Path** (6-step narrative wizard for prospects using other ambient AI solutions):
      - **Narrative Arc**: "Where you are → The gap → Why this happens → What good looks like → The math → The invitation"
      - **Design Philosophy**: Educational with soul, never salesy, delayed pitch approach
      1. **Step 1 - Where You Are** (StepWhereYouAre.tsx) - Reflection and data gathering:
         - Provider count and annual encounters inputs
         - Four dimension sliders: Utilization (75%), Efficiency (4 min), Quality/wRVU (+5%), Satisfaction (85%)
         - Live value realization score with maturity spectrum
         - Reflective framing: "Let's understand your current experience"
      2. **Step 2 - The Gap** (StepTheGap.tsx) - Dramatic value reveal:
         - Animated gap headline with dollar amount
         - Gap breakdown by dimension (utilization, efficiency, quality)
         - "What you're leaving on the table" framing
         - Loading overlay transition from Step 1
      3. **Step 3 - Why This Happens** (StepWhyThisHappens.tsx) - Diagnostic framing:
         - Four diagnostic cards: Adoption Friction, Technology Ceiling, Implementation Gaps, Provider Fatigue
         - Educational content explaining common challenges
         - Empathetic, non-judgmental tone
      4. **Step 4 - What Good Looks Like** (StepWhatGoodLooksLike.tsx) - Benchmark showcase:
         - Abridge benchmark cards as proof points
         - Educational content, not sales pitch
         - Industry context and validation
      5. **Step 5 - The Math** (StepTheMath.tsx) - Transparent calculations:
         - Full breakdown with editable assumptions
         - Value attribution methodology
         - Conversion rate explanations
      6. **Step 6 - The Invitation** (StepTheInvitation.tsx) - Clear next steps:
         - Summary of total opportunity
         - CTAs: Export PDF, Share with Team, Schedule Conversation
         - Professional, consultative close
      - **Orchestrator**: AmbientNarrativeFlow.tsx manages step state, progress indicator, and navigation
      - **Progress Indicator**: Clickable dots allowing navigation between completed steps
      - **Key Benchmarks**: Utilization 75%, Efficiency 4 min/encounter, Quality +5% wRVU, Satisfaction 85%
      - **Value Assumptions**: $150/hr × 15% conversion (utilization gap), $150/hr × 20% conversion (efficiency gap), $33/wRVU × 50% attribution (quality gap)
      - **Calculation Engine**: switchGapCalculator.ts with simple average realization score
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
-   **Expand Path**: A 5-step performance analysis flow for current Abridge customers focused on "Value Created" (not ROI):
    1. Setting Selection (ExpandSettingSelection.tsx)
    2. Deployment Setup (ExpandDeploymentSetup.tsx) - providers, encounters, utilization, months on Abridge, metric selection
    3. Data Entry (ExpandDataEntry.tsx) - Per-metric Quick/Trend entry modes with before/after values
    4. Value Configuration (ExpandValueConfiguration.tsx) - Tiered value model configuration:
       - Revenue Capture: wRVU always valued ($33/wRVU, 50% attribution)
       - Time Efficiency: Conversion method selection (None/Patient Access/Overtime)
       - Quality of Life: Optional retention estimation
       - Live preview sidebar showing "Annual Value Created" (no investment/ROI display)
    5. Your Results (ExpandResults.tsx) - Consolidated results page with:
       - Headline metrics: Current Value, Value/Provider, Expansion Potential (no ROI)
       - Data-driven journey chart using real wRVU trend data when available, with "YOU ARE HERE" marker
       - Tiered value breakdown (Core Financial Value, Operational Efficiency, Strategic Indicators)
       - Elevated expansion modeling section with gradient styling and animated projections
       - Export/Share functionality (PDF, email, copy link)
       - TermTooltip integration for complex healthcare terms (wRVU, attribution, conversion)
    - **PDF Export**: Comprehensive 6-page coaching document with:
       - Executive Summary: Annual Value Created, Value/Provider, Expansion Potential
       - Metric Deep Dives: Trend charts, benchmarks, value calculations, warnings
       - Narrative Analysis: Working well/Areas to watch, Optimization opportunities with actions, Bottom Line summary
       - Expansion Opportunity: Current state vs Full Scale projections (value-focused)
       - Methodology: Calculation approaches and benchmark ranges
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

### Premium UX Enhancements
-   **Smooth Page Transitions**: Fade/slide animations between wizard steps using framer-motion (`PageTransition.tsx`)
    - Implemented on ExpandFlow (wraps all 5 steps), ObjectiveSelectionScreen, BaselineSetup, InvestmentPage
-   **Staggered Entrance Animations**: Hero cards on ExpandResults page animate in with 0.1s, 0.2s, 0.3s delays
-   **Accordion Animations**: AnimatePresence + motion.div for smooth expand/collapse in Data Entry (LOS distribution, Chart Closure breakdown)
-   **Prominent Share Section**: Dark gradient card (from-[#1e293b] to-[#0f172a]) at bottom of Results page with Download PDF, Email Report, Copy Link CTAs
-   **Scroll-to-Top**: Automatic smooth scroll to top on page navigation
-   **Keyboard Navigation** (`useKeyboardNavigation.ts`): Enter advances to next step, Escape goes back
    - Implemented on ObjectiveSelectionScreen, BaselineSetup, InvestmentPage
-   **Input Debouncing** (`useDebounce.ts`): Reusable hook for delayed input processing

### Security & Privacy
-   **Session Security Provider** (`SessionSecurityContext.tsx`): Wraps the application with automatic session management
    - Clears all sessionStorage on tab close (beforeunload event)
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