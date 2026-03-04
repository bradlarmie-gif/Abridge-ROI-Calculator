# Abridge ROI Studio

## Overview
Abridge ROI Studio is a client-side single-page web application designed to calculate the return on investment (ROI) for implementing Abridge in various healthcare settings. It enables users to select a care setting, choose ROI levers, input practice-specific assumptions, and receive real-time financial impact calculations. The application provides comprehensive ROI modeling, including specialized flows for prospects switching from other ambient AI solutions or human scribes, and performance analysis for existing Abridge customers. Its core purpose is to provide defensible ROI estimates for Abridge's AI documentation tool, supporting Abridge's business vision for market penetration and customer value demonstration.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The application supports distinct user journeys: an "Explore Path" for new prospects, an "Assess Path" for evaluating current documentation approaches, an "Expand Path" for existing Abridge customers, and a "Measure Path" for partners to build a value story from deployment data.

### UI/UX Decisions
The application adheres to Material Design principles, utilizing Inter and JetBrains Mono fonts, Abridge's brand color palette (Abridge Cadmium Red #EA2C00), and full mobile responsiveness. Premium UX enhancements include smooth page transitions, staggered entrance animations, input debouncing, and sticky right panels for contextual calculations.

### Technical Implementations
-   **Frontend Framework**: React 18 with TypeScript.
-   **Build Tool**: Vite.
-   **Styling**: Tailwind CSS, custom design tokens, and shadcn/ui built on Radix UI primitives.
-   **State Management**: Primarily React's `useState` hooks.
-   **Data Management**: TanStack React Query for future API integrations.
-   **Security & Privacy**: Client-side processing, automatic session clearing, input security, content security policy, data sanitization, privacy-preserving analytics, and a clear data button.
-   **Deep Linking**: Supports direct navigation to methodology pages and pre-selection of care settings for the Explore flow.
-   **Mobile Responsiveness**: Tiered responsive design system:
    -   Global `useIsMobile` hook at 820px breakpoint (captures iPad portrait).
    -   UnifiedHeader: compact "X / Y" step counter on phones <480px, progress dots on 480px+, full breadcrumb on tablets/desktop.
    -   Global CSS safety: `overflow-x: hidden` on html/body, `-webkit-text-size-adjust: 100%`, 16px minimum input font to prevent iOS zoom-on-focus, `safe-area-inset-bottom` padding, `viewport-fit=cover`.
    -   Explore flow: all 7 steps polished for 320px–1920px+ (responsive grids, touch targets, label/value collision prevention via gap + flex-shrink-0 patterns, stacking sidebars on mobile).
    -   Custom Tailwind breakpoints: `min-[400px]`, `min-[480px]`, `min-[820px]` alongside standard `sm`/`md`/`lg`.
    -   Minimum text size: 12px (no `text-[10px]` or `text-[11px]` in codebase). Touch targets: 44px minimum for primary actions, 40px for secondary buttons.
    -   `prefers-reduced-motion` support for splash screen animations.
-   **Performance**: Gzip compression via `compression` middleware on Express server.

### Feature Specifications
-   **Measure Path**: A 5-page partner report flow allowing partners to configure, visualize, and expand Abridge's value based on deployment data, including PDF export. All dollar values are annualized using `12 / monthsOnAbridge` factor so partial-year deployments display annual run-rate. Core calculator uses `totalEncounters` (not `abridgeEncounters`) and `monthsOnAbridge × 4.33` for weekly normalization.
-   **Assess Path — Ambient AI Assessment**: A 5-screen narrative flow (Baseline → Domains → Score → Gap Analysis → Summary) to assess ambient AI documentation maturity across Capacity, Revenue, Workforce, and Quality domains. PDF export is a streamlined 5-page report (plus cover). Features the "Ambient Value Maturity Score" (renamed from Documentation Intelligence Score), dynamic scoring with anti-flash animation (starts near final value), gap analysis with cumulative value chart starting at current measured value, user-input-driven capacity estimates, and PDF export. Each domain has 4 maturity levels with level-specific formulas:
    -   **Capacity**: C-L1 time recovered with cost-of-waiting; C-L2 quantified hours with opportunity range and leadership radio; C-L3 schedule redesign revenue with cost-of-waiting; C-L4 FTEs avoided × annualCostPerFte ($350K default).
    -   **Revenue**: R-L1 auto-computed denial exposure (4%) + wRVU opportunity (0.10 × $33); R-L2 investigation areas with projected dollar ranges; R-L3 before/after denial rate → dollar value, wRVU delta, collections delta, revenue %; R-L4 recognized revenue with integrations.
    -   **Workforce**: W-L1 after-hours reduction with burnout proxy (15%/hr risk); W-L2 combined after-hours + in-clinic value with burden score; W-L3 turnover exposure × doc burden share with protected value; W-L4 agency reduction with months sustained and cumulative savings.
    -   **Quality** (internal key: `risk`): Q-L1 auto-computed denial + HCC + quality exposure; Q-L2 monitoring with chart gap rate → dollar value; Q-L3 per-workflow delta inputs (CDI, denial, quality, prior auth, HCC/RAF, abstraction); Q-L4 executive owner + strategic integrations.
    -   **Sidebar**: costOfWaiting field rendered in red (#EA2C00) box for applicable levels.
-   **Assess Path — Nursing Edition**: A 6-screen strategic alignment tool for nursing leadership, focusing on priorities like Nurse Retention and Staffing Costs, with real-time sidebar impact calculations and PDF export.
-   **Learn Methodology Section**: Restructured section providing modular methodology pages for each care setting with a consistent 5-section structure and interactive elements.
-   **Multi-Setting Proforma Builder**: Allows users to layer multiple care settings (Outpatient, ED, Inpatient, Nursing) into a combined financial model. Features include:
    -   ProformaHub for managing settings and inline editing assumptions.
    -   ProformaView with stacked area ramp charts (layers: Doc Quality, Capacity & Efficiency, Retention), 3-year P&L, card-based pricing (per-unit/month, annual flat license, and per-encounter toggle per care setting), editable retention phasing, and Quarters/Years toggle.
    -   Payback line computed directly from `summary.paybackMonth` + contract start date for accurate calendar quarter positioning (not from grouped display data).
    -   Annual IRR calculation using total-cost-basis approach: Period 0 = -(implementation fees + total subscription), Periods 1-N = gross annual value. Newton-Raphson with MIRR fallback, capped at 200% for display.
    -   Value-to-Cost as the primary hero metric.
    -   PDF "Showing Our Math" export that reconstructs per-driver formula strings.
    -   Per-year provider allocation for flexible ramp modeling.
    -   Driver Onset Timing (immediate, delayed, phased) for realistic cash flow projections.
    -   Proforma Hero Benchmarks showing "Typical" ranges for key metrics (VtC 3–7x, Payback 4–12 mo, ROI 200–600%) without judgmental annotations.
    -   Promoted Sensitivity Analysis for value-realization-only scenarios (70%/100%/130%).
    -   "Annual Value at Scale" hero metric using run-rate value (last 12 months of cash flows) instead of raw unscaled base value, for CFO defensibility.
    -   Elevated ProformaHub as a deal design workspace with Gantt component and deal snapshot panel.
    -   Scenario Comparison for saving and comparing up to 3 named scenarios with side-by-side metrics, overlay charts, pricing row showing deal structure, and pricing tags on scenario tabs.
    -   Mobile/tablet responsive: isMobile breakpoint at 820px (captures iPad portrait), touch-optimized scenario tabs, smooth iOS scrolling on financial tables, stacking card layouts on narrow screens.

### PDF Value Consistency
-   **Single Source of Truth**: All financial values in PDF exports are derived from the `sum(drivers array)` to prevent divergence.
-   **Driver Array Alignment**: The driver array includes all drivers contributing to time and documentation value, with matching conditions and formulas per care setting.
-   **Clinician Retention**: Unified calculation for outpatient, ED, and inpatient settings.
-   **Care-Setting-Specific Exclusions**: Inpatient denials are excluded, and cost reduction drivers are included for all non-nursing settings.

### System Design Choices
-   **Calculation Engines**: Two primary engines for driver-level and narrative flow pillar calculations.
-   **Confidence Haircuts**: Applied at the display layer based on data mode (benchmark, estimated, measured).
-   **Consolidated Benchmarks**: Single source of truth for key metrics.
-   **Variable Contract Terms**: Proforma supports 1–6 year contract terms via "2-Year" / "3-Year" / "Custom" selector. All calculations, charts, tables, and PDF exports auto-extend to match the chosen term. Provider ramp uses Y1/Y2/Y3 structure with Y3 as steady state for years 4+. Retention phasing Year 3 value applies as steady state for longer contracts (labeled "Y3+").
-   **S-curve Adoption Model**: Projections use a sigmoid adoption curve for realistic modeling.
-   **Care Setting Support**: Tailored drivers, defaults, and terminology for Outpatient, Emergency Department, Inpatient, and Nursing. Inpatient includes: DRG Accuracy, Obs/IP Status Defense (denial rate × claim value × doc contribution × 35% realization), CDI Query Reduction (Doc Quality step), CDI Capacity Extension (Value Drivers step: FTEs × salary × query time % × reduction %), Rounding Efficiency (qualitative), Cost Reduction (optional), and Clinician Wellbeing/Retention. Nursing includes potential-value drivers: HAPI Prevention, Falls Prevention, HAC Penalty Avoidance (CMS 1% Medicare penalty for bottom-quartile hospitals, 75% documentation attribution), and qualitative HCAHPS.
-   **Component-Driven UI**: Utilizes reusable components.
-   **Configuration-driven**: ROI levers and properties are externally managed.
-   **Pure Functions**: Encapsulated ROI calculation logic.
-   **Qualitative Driver Handling**: Adapts display and PDF exports for qualitative drivers to avoid misleading "$0" values.

## External Dependencies

-   **UI/Charting Libraries**:
    -   Radix UI: For accessible, unstyled components.
    -   Recharts: For interactive data visualization.
    -   Lucide React: For icons.
    -   react-pdf: For generating PDF exports.
-   **Fonts**:
    -   Google Fonts: Inter, JetBrains Mono.