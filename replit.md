# Abridge ROI Studio

## Overview
Abridge ROI Studio is a client-side single-page web application designed to calculate the return on investment (ROI) for implementing Abridge (an AI documentation tool) in various healthcare settings (Outpatient, Emergency Department, Nursing, Inpatient). It allows users to select a care setting, choose ROI levers, input practice-specific assumptions, and receive real-time financial impact calculations. The application aims to provide comprehensive ROI modeling, including specialized flows for prospects switching from other ambient AI solutions or human scribes, and performance analysis for existing Abridge customers.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The application supports multiple distinct user journeys:
-   **Explore Path**: A 7-step commitment-modeling wizard for new prospects covering care setting, opportunity size, time savings, time allocation, documentation path, documentation drivers, and review. This flow leads to an investment page with pre-calculated value results.
-   **Switch Path**: Designed for prospects using other solutions, with specific flows for those switching from other ambient AI solutions or human scribes.
-   **Expand Path**: A 5-step narrative journey for existing Abridge customers to document and share their value story.

### Technical Implementations
-   **Comprehensive Care Setting Support**: Tailored drivers, defaults, and terminology for Outpatient, Emergency Department, Inpatient, and Nursing settings. This includes specific time allocation categories and documentation drivers for each setting.
    - **Outpatient**: Patient Access (capacity-to-visits conversion), Cost Reduction (user-estimated), Clinician Wellbeing (retention)
    - **Emergency Department**: LWBS Recovery (recovered patients from reduced left-without-being-seen rates), Admission Capture (improved admission documentation revenue), Clinician Wellbeing. ED uses smaller time savings (1/2/3 min vs Outpatient's 2/4/6 min) due to faster-paced, templated workflows. ED-specific defaults: wRVU baseline 2.5, denial rate 10%, avg claim $300. Documentation Quality includes E&M Level Accuracy and Denial Prevention (no HCC).
    - **Inpatient**: LOS Impact (length of stay reduction savings), Rounding Efficiency (time-to-value conversion), Clinician Wellbeing
    - **Nursing**: OT Reduction (overtime cost savings with 1.5x multiplier), Retention Savings (nurse turnover reduction), Care Time (qualitative - bedside time returned)
-   **Defensible Math with Realization Rates**: All ROI calculations incorporate conservative realization rates for defensible estimates across all benefit categories (e.g., Patient Access, Locum Reduction, wRVU, HCC, Denials, Wellbeing).
-   **ROI Calculation Logic**:
    - **Today's ROI**: `totalValue / annualInvestment` (gross value multiplier)
    - **Full Scale ROI**: `(totalValue × expansionMultiplier) / expandedInvestment`
      - `expansionMultiplier = (expandedProviders / numberOfProviders) × (expandedUtilization / currentUtilization)`
      - `expandedInvestment = annualInvestment × (expandedProviders / numberOfProviders)`
      - Investment scales with provider count; utilization improvement only affects value, not cost
    - This ensures Full Scale ROI = Today's ROI × utilization improvement factor (e.g., 80%/70% = 1.14×)
-   **Simplified Wellbeing Retention Model**: A conservative threshold-based approach to calculate retention lift based on saved hours per provider, categorized into minimal, moderate, significant, and maximum tiers.
-   **Expandable Math Breakdowns**: "See the math" functionality provides step-by-step calculations with highlighted realization rates.
-   **Component-Driven UI**: Utilizes `PathwayCard` components for progressive disclosure.

### Frontend Architecture
-   **Framework**: React 18 with TypeScript.
-   **Build Tool**: Vite.
-   **Styling**: Tailwind CSS, custom design tokens, and shadcn/ui built on Radix UI primitives.
-   **State Management**: Primarily React's `useState` hooks.
-   **Data Management**: TanStack React Query for future API integrations.

### Design Patterns & Principles
-   **Configuration-driven**: ROI levers and properties are externally managed.
-   **Pure Functions**: Encapsulated ROI calculation logic.
-   **Reusable Components**: Extensive UI component reuse.
-   **UI/UX**: Adheres to Material Design principles, using Inter and JetBrains Mono fonts, Abridge's brand color palette, and full mobile responsiveness.

### Premium UX Enhancements
-   **Animations**: Smooth page transitions using framer-motion, staggered entrance animations, and accordion animations.
-   **Navigation**: Scroll-to-top on navigation and keyboard navigation support.
-   **Input Handling**: Input debouncing for delayed processing.
-   **Sticky Right Panels**: Explore path pages 2-6 feature dark-styled (#1A1A1A) sticky right panels showing running totals and contextual calculations. Panels use red-orange (#E85A2C) accent for hero values and are hidden on mobile (lg:block). Each panel displays accumulated values from previous steps and includes navigation.

### Summary Page Design
Features a premium restructured layout with a Hero Section (dark gradient background, large net value display), Value Breakdown (two-column layout with labor/efficiency and revenue/quality cards), Scaling Journey (Recharts chart, pace selector, pilot vs. full scale comparison), Investment Summary (3-year projection table), and an Actions Section (CTA for PDF download and model editing).

### Security & Privacy
-   **Session Management**: Automatic session clearing on tab close.
-   **Privacy Features**: Client-side processing notice, input security, content security policy, data sanitization utilities, privacy-preserving analytics, and a clear data button.

## External Dependencies

### UI/Charting Libraries
-   **Radix UI**: Accessible, unstyled components.
-   **Recharts**: Interactive charts.
-   **Lucide React**: Icon library.

### Build & Development Tools
-   **Vite**: Frontend build tool.
-   **TypeScript**: Type safety.

### Fonts
-   **Google Fonts**: Inter, JetBrains Mono.
-   **react-pdf**: Helvetica for PDF exports.

### PDF Generator Architecture
Dedicated PDF generators for each care setting (`outpatient-pdf-generator.tsx`, `ed-pdf-generator.tsx`, `inpatient-pdf-generator.tsx`, `nursing-pdf-generator.tsx`) with corresponding data transformers. PDF designs prioritize a narrative arc, emotional anchors, sophisticated visual hierarchy, transparent calculations, and industry benchmarks.

## Recent Changes (February 2026)

### Brand Color Update
- **Abridge Cadmium Red**: Updated all instances of the brand accent color from #E85A2C to the correct Abridge Cadmium Red (#EA2C00)
- Global change applied across all components, pages, and styling files
- This color is used for: primary buttons, accent highlights, icons, progress indicators, and key value displays

### Explore Path Styling Redesign
- **Toggle Accordions**: Removed heavy left borders (`border-l-4`) from all value driver and documentation quality toggle sections
- **Clean Card Design**: Toggle sections now use clean white backgrounds (`bg-white`) with subtle hover states
- **Consistent Styling**: Applied unified styling across ExploreValueDrivers.tsx and ExploreDocQuality.tsx for all care settings
- **Design Pattern**: Toggle sections use:
  - Header: `bg-white` or `bg-white/70 hover:bg-white` based on enabled state
  - Expanded content: `bg-white rounded-b-lg p-5` without heavy borders
  - Animation: framer-motion for smooth expand/collapse transitions

### Premium Spacing Updates
- **Main Card Padding**: Increased from 24-32px to 32-40px (`p-8 md:p-10`)
- **Section Spacing**: Increased to 40px between sections (`space-y-10`)
- **Section Labels**: 8px margin-bottom after labels, 24px after dividers (`mb-2`, `mb-6`)
- **Input Fields**: Taller inputs (48px / `h-12`), more label spacing (`space-y-2.5`)
- **Segmented Controls**: Larger touch targets with 16px vertical padding (`py-4 px-3`)
- **Content Gap**: 40px gap between main content and right panel (`gap-10`)
- **Helper Text**: Increased margin-top for better separation (`mt-3`)

### Inpatient Flow Redesign
- **Time Savings**: 15/30/45 min per admission (not per encounter)
- **Value Drivers**: Rounding Efficiency is qualitative-only (shows hours back, no $ value). Clinician Wellbeing uses hospitalist defaults: 8% turnover, 45% burnout-related, $400k replacement cost
- **Documentation Quality Drivers**: Inpatient-specific drivers replace wRVU/HCC/Denials:
  - **DRG Accuracy**: 25% at-risk admissions, 15%/20%/25% protection by scenario, 0.4 DRG weight increase, $6k base payment, 50% realization. Includes denial prevention to avoid double-counting
  - **CDI Query Reduction**: 30% query rate, 15%/25%/35% reduction by scenario, $50 cost per query
- **Calculation Flow**: Admissions at risk × Protection rate × DRG weight increase × Base payment × Realization = Net DRG value
- **Scenario Labels**: "Aggressive" renamed to "Optimistic" throughout

### Nursing Pages Updates
- **Your Nursing Program Page (ExploreOpportunity.tsx)**:
  - Added "Patient Days Per Year" as a prominent calculated field
  - Formula: Staffed Beds × 365 × Occupancy Rate
  - Shows step-by-step calculation breakdown
  - Only appears when nursingStaffedBeds > 0
  - Includes helper text explaining this is the denominator for HAC rates and quality metrics
- **Time Savings Page (ExploreTimeSavings.tsx)**:
  - Complete reframe from "minutes per encounter" to "time saved per shift" for nursing
  - Scenarios: Conservative 15 min/shift, Typical 20 min/shift, Optimistic 30 min/shift
  - Header: "How much documentation time could your nurses get back each shift?"
  - Data section: "Nurses spend 25-35% of their shift on documentation..."
  - Right panel shows "Eligible Shifts" instead of "Eligible Encounters"
  - Per-unit labels show "Per nurse:" instead of "Per provider:"
  - Calculation: Nursing Shifts Per Year = Nurse FTEs × 365

### Nursing Care Quality Section
- **Value vs Potential Distinction**: Nursing care quality drivers are shown as "potential value" rather than "hard value" to acknowledge that clinical practice matters more than documentation alone
- **Visual Treatment for Potential Value**:
  - Dashed borders (`border-2 border-dashed border-[#EA2C00]/30`) instead of solid
  - "POTENTIAL" badges in red (`bg-[#EA2C00]/10 text-[#EA2C00]`)
  - Outlined cards instead of filled
  - Right panel shows separate "Time Savings Value" (hard) vs "Care Quality Potential" sections
- **Care Quality Drivers**:
  - **HAPI Prevention**: 2.5 per 1,000 patient days (default), 5% prevention rate, $40,000 per HAPI. Step-by-step calculation with patient days × HAPI rate × prevention rate × cost
  - **Falls Prevention**: 3.5 per 1,000 patient days (default), 5% prevention rate, $6,500 per fall. Similar step-by-step calculation
  - **Patient Experience (HCAHPS)**: Qualitative-only driver with "QUALITATIVE" badge. Shows hours back at bedside but no dollar calculation
- **Intro Box**: Explains that documentation enables visibility for prevention but doesn't directly cause outcomes
- **Right Panel**: Shows "Time Savings Value" prominently, with "Care Quality Potential" in a separate dashed-border section below

### Learn Methodology Section Restructure
- **Complete Restructure**: Replaced 2369-line LearnPath.tsx with modular methodology pages
- **New Architecture**:
  - `LearnPath.tsx`: Simple router (~50 lines) that switches between methodology pages
  - `client/src/pages/methodology/MethodologyHome.tsx`: Landing page "How We Think About Value"
  - `client/src/pages/methodology/MethodologyNursing.tsx`: Nursing-specific methodology
  - `client/src/pages/methodology/MethodologyOutpatient.tsx`: Outpatient-specific methodology
  - `client/src/pages/methodology/MethodologyED.tsx`: Emergency Department methodology
  - `client/src/pages/methodology/MethodologyInpatient.tsx`: Inpatient methodology
  - `client/src/pages/methodology/index.ts`: Barrel export file
- **Consistent 5-Section Structure** (all setting pages):
  1. THE CONTEXT - Why this setting is unique
  2. THE VALUE MECHANISMS - How time saved becomes dollars
  3. THE ASSUMPTIONS - Key assumptions with ranges, not point estimates
  4. THE HONEST LIMITS - Direct vs. indirect measurability
  5. THE VALIDATION PATH - How to validate with your own data
- **Home Page Features**:
  - Hero section with "How We Think About Value" title
  - Introduction text on warm beige background (#F5F0EB)
  - Four care setting cards with icons and hover states
  - "Our Principles" section with 4 principles (Show our work, Conservative by default, Honest about limits, Validate with your data)
- **Setting Page Design**:
  - Sticky header with back button
  - Hero section with setting-specific title
  - Collapsible sections using framer-motion
  - MechanismCard components for detailed content
  - Tables for assumptions
  - Color-coded measurability indicators (green/yellow/red)
- **Styling**:
  - Brand colors: Abridge Cadmium Red (#EA2C00), warm beige (#F5F0EB)
  - 11px ALL CAPS section labels with 1.5px letter-spacing
  - Consistent typography hierarchy
  - White cards on beige backgrounds
- **Data-testid Attributes**:
  - `button-back`: Back navigation buttons
  - `button-setting-{setting}`: Care setting cards
  - `button-section-{sectionId}`: Collapsible section buttons