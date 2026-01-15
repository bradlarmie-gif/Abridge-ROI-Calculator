# Abridge ROI Studio

## Overview

Abridge ROI Studio is a single-page web application that calculates return on investment for implementing Abridge (an AI documentation tool) across different healthcare care settings. The application allows users to select a care setting (Outpatient, Emergency Department, or Nursing), choose which ROI levers to analyze, input practice-specific assumptions, and view real-time financial impact calculations including ROI multiple, total annual benefit, investment costs, and net value created.

The application runs entirely in the browser with no backend data processing required. It features a two-panel layout with inputs on the left and results (KPIs, waterfall charts, lever tables) on the right.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with hot module replacement
- **Styling**: Tailwind CSS with custom design tokens defined in CSS variables
- **Component Library**: shadcn/ui components built on Radix UI primitives
- **State Management**: React useState hooks (no external state library needed for this complexity level)
- **Data Fetching**: TanStack React Query (configured but primarily used for future API integration)

### Application Flow
1. **Care Setting Selection Screen**: Users select Outpatient, ED, or Nursing (Inpatient is "coming soon")
2. **Strategic Priorities Screen**: Users select which ROI levers to include, grouped by category (time vs documentation)
3. **Baseline Assumptions Wizard (3-Step)**:
   - **Step 1 - Adoption**: Providers, encounters, utilization rate (required before proceeding)
   - **Step 2 - Value Posture**: Conservative/Typical/Aggressive driver assumptions
   - **Step 3 - Investment**: Pricing and contract inputs
   - Step navigation pills enforce completion - Step 2 requires Step 1 complete, Step 3 requires Steps 1 & 2 complete
4. **Calculator Screen**: Full two-panel calculator with inputs, KPIs, waterfall chart, and lever table

### Nursing Strategic Priorities Flow
The Nursing flow has a dedicated Strategic Priorities screen with 8 drivers across 3 categories:

**Categories**:
1. **Capacity & Labor** (4 drivers): documentation_time_savings, overtime_reduction, agency_reduction, nurse_retention
2. **Documentation Quality** (2 drivers): documentation_timeliness, documentation_completeness
3. **Quality & Revenue** (2 drivers with warnings): safety_event_reduction, ccmcc_support

**Selection Constraints**:
- Minimum: 2 drivers required to continue
- Maximum: 6 drivers allowed
- Visual feedback: disabled cards at max (opacity-50, cursor-not-allowed)
- Sidebar shows "X of 8 selected" with amber color at max

**Key Files**:
- `/client/src/pages/NursingStrategicPriorities.tsx` - Main component
- `/client/src/lib/SETTING_CONFIG.ts` - Nursing driver configuration

### Expansion Calculator (4-Step Full Wizard)
The Expansion Calculator allows modeling ROI for provider expansion scenarios with a sophisticated 4-step wizard:

1. **Step 1 - Baseline Review**: Displays current deployment metrics (providers, cost, benefit, ROI)
2. **Step 2 - Expansion Plan**: Target provider selection, rollout type (all-at-once or phased 3-wave), pricing model
3. **Step 3 - Reality Check**: Driver-by-driver validation with progress bar navigation:
   - **AccessValidation**: Capacity constraints, demand validation
   - **RetentionValidation**: 12-18 month timing lag visualization  
   - **LosValidation**: Case mix validation
   - **DefaultValidation**: For locum, denials, HCC drivers
4. **Step 4 - Maturity Model**: 3-year projections with year cards showing Current/Expanded/Incremental columns

**Maturity Curve Constants**:
- Year 1: 45-70% utilization (ramp-up phase)
- Year 2: 80% utilization (maturing)
- Year 3: 85% utilization (mature state)
- Retention-specific: 20% → 70% → 100% (accounts for decision cycle lag)

**Calculation Consistency**: All year totals (Year 1, 2, 3) include baseline + incremental for proper comparative analysis.

**Key Files**:
- `/client/src/components/expansion/` - All expansion wizard components
- `expansion-calculations.ts` - Core calculation functions (maturity, costs, scaling)
- `expansion-types.ts` - TypeScript interfaces for driver validations

### New Care Setting Flow (Component-Based)
The New Care Setting Flow allows users to explore adding additional care settings (ED, Nursing, Inpatient) to their current deployment with real-time combined ROI calculations.

**Design Philosophy**: "Show, don't ask. Educate, don't interrogate. Make it feel inevitable."

**Two-Step Flow**:
1. **CareSettingExplorer**: Educational cards for each care setting showing characteristics, recommended drivers, typical ROI, and pricing. ED is available; Nursing and Inpatient show "Coming Soon".
2. **CombinedPreview**: Real-time configuration with sliders for providers/utilization, comparison table (Baseline vs New vs Combined with delta %), and driver inheritance visualization.

**Key Components** (`/client/src/components/expansion/`):
- `NewCareSettingFlow.tsx` - Orchestrator component managing step state
- `CareSettingExplorer.tsx` - Educational cards with setting selection
- `CombinedPreview.tsx` - Live combined preview with configuration controls
- `newCareSettingCalculations.ts` - Combined deployment calculation logic

**Care Setting Defaults**:
- ED: 5,000 encounters/provider, 2.8 avg wRVU, drivers: throughput, LOS, denial reduction
- Nursing: 2,000 encounters/provider (coming soon)
- Inpatient: 800 encounters/provider, 3.5 avg wRVU (coming soon)

**Calculation Features**:
- Volume discount applied to combined provider count
- Driver inheritance badges (from baseline, new, or both)
- Dynamic insight generation with actual numbers
- Three-year value projections

### Key Design Patterns
- **Configuration-driven levers**: All lever definitions (labels, categories, descriptions) are centralized in `SETTING_CONFIG.ts`
- **Pure calculation functions**: ROI calculations are side-effect free functions in `roi-calculator.ts`
- **Reusable card components**: `CareSettingCard` component used across multiple screens with compact mode
- **Background pattern component**: Decorative SVG-based background shared across all screens
- **Eligible Encounters as Foundation**: All driver calculations derive from eligible encounters (annual encounters × utilization rate) to ensure values automatically recalculate when inputs change

### Calculation Architecture (Critical)
All ROI driver calculations must derive from **eligible encounters** (encountersWithAbridge = annualEncounters × utilizationPct / 100):

1. **HCC Capture**: MA patients = (eligible encounters ÷ 2.5) × pctMedicareAdvantage%
   - Type field: `pctMedicareAdvantage` (percentage, not absolute patient count)
   
2. **Denial Reduction**: Revenue base = eligible encounters × avgRevenuePerEncounter
   - Type field: `avgRevenuePerEncounter` (per-visit amount, not total revenue)
   
3. **Overtime Savings**: Hours = total hours × pctAfterHours% × pctOvertimeReduced% × rate
   - Type field: `pctAfterHours` (percentage of time occurring after-hours)
   
4. **Patient Access, wRVU, Workforce**: Already use encountersWithAbridge directly

This architecture ensures that when providers, encounters, or utilization rate change (including in scenarios), all downstream values automatically recalculate correctly.

### Directory Structure
- `/client/src/pages/` - Main page components (ObjectiveSelectionScreen, RoiCalculator)
- `/client/src/components/` - Reusable UI components (KpiCard, WaterfallChart, LeverTable, etc.)
- `/client/src/components/ui/` - shadcn/ui base components
- `/client/src/lib/` - Business logic, types, and utilities
- `/server/` - Express server (minimal, primarily serves static files)
- `/shared/` - Shared types and database schema

### Styling Approach
- Material Design principles adapted for enterprise data applications
- Typography: Inter for UI text, JetBrains Mono for numerical displays
- Color scheme: Black/neutral grays for accents (no blue), warm off-white backgrounds (#FAFAF8) with tan decorative patterns
- **Brand Colors**:
  - Abridge Red: #F03319 (used for section headers, brand logo, key accents)
  - Muted grey: #9CA3AF (used for current scope in charts, investment costs)
  - Green: #0E9F6E (used for benefits in charts)
  - Black: #000000 (used for enterprise projections)
- **KPI Cards**: Support optional subtitle/micro-labels for improved clarity
- **Section Spacing**: Major sections use space-y-8 for visual breathing room
- **Scenario Summary Block**: At-a-glance summary with Abridge Red headers showing providers, encounters, and utilization

### Responsive Design
- **Breakpoints**: Uses Tailwind's `md` (768px) and `lg` (1024px) breakpoints
- **Main Layout**: Two-column on desktop (≥1024px), single-column stacked on mobile/tablet
  - Sidebar: `w-full lg:w-96` (full width on mobile, 384px on desktop)
  - Results panel: `flex-1` fills remaining space
- **Show Work Drawers**: `w-full md:w-[420px]` (full-width on mobile, 420px on tablet+)
  - Rounded corners only on desktop via `md:rounded-l-xl`
- **Understanding Your Drivers Table**: 
  - Card with `overflow-hidden` to contain content
  - Inner div with `overflow-x-auto` for horizontal scroll
  - Table has `min-w-[600px]` to ensure proper column widths
  - Description column hidden on mobile via `hidden md:table-cell`
- **KPI Grid**: `grid-cols-2 lg:grid-cols-4` (2 columns on mobile, 4 on desktop)
- **Charts**: Use Recharts `ResponsiveContainer` with fixed height `h-80` (320px)

## External Dependencies

### UI Framework
- **Radix UI**: Headless accessible components (accordion, checkbox, dialog, dropdown, etc.)
- **Recharts**: Charting library for waterfall/bar charts
- **Lucide React**: Icon library

### Database (configured but not actively used)
- **PostgreSQL**: Database configured via DATABASE_URL environment variable
- **Drizzle ORM**: Type-safe database toolkit with Zod schema validation
- Schema defined in `/shared/schema.ts` (currently only users table)

### Build & Development
- **Vite**: Frontend build tool with React plugin
- **esbuild**: Server bundling for production
- **TypeScript**: Full type coverage across client and server

### Fonts (via Google Fonts CDN)
- Inter (primary UI font)
- JetBrains Mono (numerical displays)
- DM Sans, Fira Code, Geist Mono (additional options)