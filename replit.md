# Abridge ROI Studio

## Overview

Abridge ROI Studio is a single-page web application designed to calculate the return on investment (ROI) for implementing Abridge (an AI documentation tool) in various healthcare settings (Outpatient, Emergency Department, Nursing, Inpatient). It allows users to select a care setting, choose ROI levers, input practice-specific assumptions, and receive real-time financial impact calculations, including ROI multiple, total annual benefit, investment costs, and net value created. The application operates entirely client-side, providing a responsive and interactive experience. Its ambition is to provide comprehensive ROI modeling across all major healthcare settings, including specialized flows for prospects switching from other ambient AI solutions or human scribes, and performance analysis for existing Abridge customers.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Core Application Flows
The application supports multiple distinct user journeys:
-   **Explore Path**: A 7-step commitment-modeling wizard for new prospects:
    1. **Care Setting** (ExploreCareSettings.tsx) - Select Outpatient/ED/Nursing/Inpatient
    2. **Opportunity Size** (ExploreOpportunity.tsx) - Configure providers and utilization
    3. **Time Path** (ExploreTimePath.tsx) - Choose Conservative (1.5 min), Typical (3 min), or Aggressive (4.5 min) time savings scenario
    4. **Time Allocation** (ExploreTimeAllocation.tsx) - Distribute saved hours across Patient Access, Reducing Locums, and Clinician Wellbeing
    5. **Documentation Path** (ExploreDocPath.tsx) - Focus on wRVU improvement, HCC capture, or Denial prevention
    6. **Documentation Drivers** (ExploreDocDrivers.tsx) - Fine-tune assumptions with live receipt calculations
    7. **Review** (ExploreReview.tsx) - Summary with projected annual value before investment configuration
    - Orchestrated by ExploreFlow.tsx with ExploreState for cross-step state management
    - Leads into Investment page with pre-calculated ValueResults
-   **Switch Path**: Designed for prospects currently using other solutions.
    -   **Ambient AI Path**: A 6-step narrative wizard focused on educating users about value gaps when switching from other ambient AI solutions, culminating in transparent calculations and an invitation for next steps.
    -   **Human Scribes Path**: An educational flow for analyzing current scribe program costs and coverage gaps, without Abridge-specific pricing or savings claims.
-   **Expand Path**: A 5-step narrative journey for existing Abridge customers to document and share their value story, focusing on celebrating accomplishments and tailoring results for various stakeholders.

### Technical Implementations
-   **Comprehensive Care Setting Support**: Tailored drivers, defaults, and terminology for Outpatient, Emergency Department, Inpatient, and Nursing settings.
-   **ED-Specific Time Allocation**: Emergency Department uses distinct time allocation categories:
    - **Patient Throughput (LWBS Reduction)**: Instead of Patient Access, calculates recovered revenue from patients who would have left without being seen. Formula: ED visits × LWBS rate (3.5%) × retention rate (10%) × Abridge attribution (33%) × visit revenue ($600). Optional admission revenue: attributed patients × admission rate (12%) × admission revenue ($15K).
    - **Patient Experience**: Qualitative value indicator for improved patient satisfaction.
    - **Physician Retention**: Uses wellbeing-based retention model with threshold tiers.
    - ED Presets: Balanced (30/30/40), Throughput Focus (60/20/20), Retention Focus (20/20/60).
    - ED Throughput Settings Modal: Configurable LWBS rate, retention rate, Abridge attribution, visit revenue, and optional admission revenue toggle with capacity warning.
-   **ED-Specific Documentation Drivers**: Emergency Department uses three specialized drivers:
    - **Level of Service (wRVU)**: Base wRVU 2.5 (vs 1.5 outpatient), captures complexity during high-volume surges.
    - **Medical Necessity**: Prevents denials from insufficient medical decision-making documentation. Formula: ED visits × denial rate (12%) × med necessity % (40%) × prevention target × avg denial value ($500) × realization rate (70%).
    - **CDI & Inpatient Connection**: Improves DRG weight for admitted patients. Formula: ED visits × admission rate (12%) × base DRG weight (1.8) × improvement % × DRG payment rate ($6K) × realization rate (60%).
-   **Inpatient-Specific Time Allocation**: Inpatient uses simplified 2-category structure:
    - **Clinical Operations**: Qualitative value indicator with optional experimental LOS impact toggle. Includes "What to track" section with EHR-measurable metrics (documentation completion time, late night charting, EMR time per encounter).
    - **Physician Wellbeing**: Hospitalist-specific labels ("hospitalists" instead of "clinicians"). Uses same threshold-based retention model.
    - Inpatient Presets: Balanced (50/50), Operations Focus (70/30), Retention Focus (30/70).
    - LOS Impact Toggle: Experimental model for length-of-stay reduction, disabled by default with clear "limited validation" warning.
-   **Nursing-Specific Wizard Flow**: Nursing uses a simplified 5-step wizard (skips Documentation Quality) with per-shift model:
    - **Setup**: Staffed Beds, Nurse FTEs, Occupancy Rate (50-100%, default 85%). Patient days calculated as: staffedBeds × occupancyRate × 365.
    - **Time Allocation Categories**:
        - **Staffing Efficiency (OT Reduction)**: DIRECT, measurable payroll savings. Formula: Current OT hours (nurses × 4 hrs/wk × 50 weeks) × doc-driven % (33%) → hours that can be eliminated × OT rate ($45 × 1.5 = $67.50). Trackable in payroll data.
        - **Care Quality**: Always-on Falls + HAPI prevention calculations using patient days (not admissions). Formula: Falls = (patient days / 1000) × falls rate (3.5) × preventable % (5%) × cost per fall ($6,500) × realization (85%). HAPI = (patient days / 1000) × HAPI rate (2.5) × preventable % (5%) × cost per HAPI ($20,000) × realization (85%). Shows POTENTIAL label.
        - **Nurse Wellbeing**: Combined retention value + agency reduction. Uses NURSING_WELLBEING_THRESHOLDS (lower than physician thresholds): 0-25 hrs/yr MINIMAL (5-8%), 25-50 hrs/yr MODERATE (10-15%), 50+ hrs/yr SIGNIFICANT (18-25%). Formula: Retention Value = (Nurses × Turnover 18% × Burnout-related 50%) × Retention Lift × Replacement Cost ($52K). Shows POTENTIAL label.
    - Nursing Presets: Balanced (40/30/30), Efficiency Focus (60/20/20), Retention Focus (20/50/30).
    - Receipt shows DIRECT label for Staffing Efficiency, POTENTIAL labels for Care Quality and Wellbeing.
    - Nursing Settings Modals: Configurable base RN hourly rate, OT multiplier, OT hours/week, doc-driven OT %, turnover rate, burnout-related %, replacement cost, agency FTEs, agency premium, retention-driven reduction.
-   **Inpatient-Specific Documentation Drivers**: Inpatient uses two specialized drivers:
    - **DRG Accuracy & Revenue Protection**: Protects revenue from downcoding and denial write-offs. Formula: Admissions (6500) × at-risk rate (25%) × protection rate (25%) × DRG weight lift (0.4) × base DRG payment ($6K) × realization rate (50%). Includes nested "See benchmarks" section with DRG weight examples and revenue leakage rates.
    - **CDI Query Reduction**: Reduces CDI specialist burden. Formula: Admissions × query rate (30%) × reduction rate (25%) × cost per query ($50). Includes nested "See benchmarks" section with cost breakdown.
-   **Defensible Math with Realization Rates**: All ROI calculations include conservative realization rates for defensible estimates:
    - Patient Access: 15% (scheduling constraints, room availability)
    - ED Throughput/LWBS: Configurable attribution rate (default 33%)
    - Locum Reduction: 60% (minimum shift requirements)
    - Clinician Wellbeing: Threshold-based retention lift (see below)
    - wRVU: 75% (payer mix, fee schedules)
    - HCC: 60% (RAF adjustments, audit risk)
    - Denials: 70-85% (appeals success rate)
    - ED Medical Necessity: 70%
    - ED CDI: 60%
    - Inpatient DRG Accuracy: 50% (coding lag, payer adjustments)
    - Inpatient CDI Query: Direct savings (no realization rate applied)
    - Nursing Care Quality: 85% (indirect causal link between documentation and prevention)
-   **Simplified Wellbeing Retention Model**: Conservative threshold-based approach:
    - 0-100 hrs/yr per provider (<2 hrs/week): MINIMAL tier, 3-5% retention lift
    - 100-150 hrs/yr (2-3 hrs/week): MODERATE tier, 8-12% retention lift
    - 150-200 hrs/yr (3-4 hrs/week): SIGNIFICANT tier, 15-20% retention lift
    - 200+ hrs/yr (4+ hrs/week): MAXIMUM tier, 25-30% retention lift
    - Formula: Annual Value = (Providers × Turnover Rate) × Retention Lift × Replacement Cost
    - LOW IMPACT warning displayed for allocations under 100 hrs/year per provider
    - MINIMAL tier shows value ranges instead of single point estimate
-   **Expandable Math Breakdowns**: "See the math" buttons on Time Allocation and Doc Drivers pages reveal step-by-step calculations with highlighted realization rates and explanatory text.
-   **Optional Locums Toggle**: Time Allocation page allows users to disable locum savings if not relevant; when disabled, allocation redistributes to Patient Access and Wellbeing, and "Cost Focus" preset disappears.
-   **Level of Service Calculation**: Simplified wRVU-based approach with transparent UI breakdowns.
-   **Component-Driven UI**: Utilizes `PathwayCard` components for progressive disclosure of driver pathways.

### Frontend Architecture
-   **Framework**: React 18 with TypeScript.
-   **Build Tool**: Vite.
-   **Styling**: Tailwind CSS, custom design tokens.
-   **UI Components**: shadcn/ui built on Radix UI primitives.
-   **State Management**: Primarily React's `useState` hooks.
-   **Data Management**: TanStack React Query for future API integrations.

### Design Patterns & Principles
-   **Configuration-driven**: ROI levers and properties are managed externally.
-   **Pure Functions**: ROI calculation logic is encapsulated.
-   **Reusable Components**: Emphasizes extensive UI component reuse.
-   **UI/UX**: Adheres to Material Design principles, utilizing Inter and JetBrains Mono fonts, and Abridge's brand color palette.
-   **Mobile Responsiveness**: Full support with responsive grids, typography, padding, touch targets, and adapted chart/CTA layouts.

### Premium UX Enhancements
-   **Smooth Page Transitions**: Uses framer-motion for fade/slide animations between wizard steps.
-   **Staggered Entrance Animations**: Elements animate into view with timed delays.
-   **Accordion Animations**: Smooth expand/collapse functionality.
-   **Prominent Share Section**: Dedicated section for PDF export, email, and link sharing.
-   **Scroll-to-Top**: Automatic smooth scroll on page navigation.
-   **Keyboard Navigation**: Enables navigation using Enter and Escape keys.
-   **Input Debouncing**: Reusable hook for delayed input processing.

### Summary Page Design (SummaryCommandCenter.tsx)
Premium restructured layout matching Abridge's Pentagram-designed brand identity:
1. **Hero Section**: Dark gradient background (slate-900 to slate-800) with large bold net value using gradient text (white → coral → cadmium red). Three glassmorphism key metrics cards (ROI, Payback Months, Value Drivers).
2. **Value Breakdown**: Two-column layout with Labor & Efficiency (slate themed) and Revenue & Quality (red themed) cards. Simplified stacked bar visualization.
3. **Scaling Journey**: Full-width section with premium Recharts chart, clean pace selector (Measured/Steady/Aggressive), pilot vs full scale comparison cards, compounding effect explanation.
4. **Investment Summary**: Clean 3-year projection table showing value, investment, and net value.
5. **Actions Section**: Dark background CTA with Download PDF and Edit Model buttons.
6. **Key Assumptions**: Collapsible section showing model configuration.

### Security & Privacy
-   **Session Security Provider**: Manages automatic session clearing on tab close.
-   **Privacy Notice**: Informs users about client-side processing and data handling.
-   **Input Security**: Formatted inputs prevent browser autofill.
-   **Content Security Policy**: Restricts script/style sources.
-   **Data Sanitization**: Utilities for sanitizing numbers, percentages, and text.
-   **Analytics Privacy**: Functions for privacy-preserving data bucketing.
-   **Clear Data Button**: Allows users to manually clear all entered data.

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