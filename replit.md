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
3. **Calculator Screen**: Full two-panel calculator with inputs, KPIs, waterfall chart, and lever table

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