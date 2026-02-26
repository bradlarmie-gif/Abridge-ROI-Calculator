# Abridge ROI Studio

## Overview
Abridge ROI Studio is a client-side single-page web application designed to calculate the return on investment (ROI) for implementing Abridge in various healthcare settings. It enables users to select a care setting, choose ROI levers, input practice-specific assumptions, and receive real-time financial impact calculations. The application provides comprehensive ROI modeling, including specialized flows for prospects switching from other ambient AI solutions or human scribes, and performance analysis for existing Abridge customers. Its core purpose is to provide defensible ROI estimates for Abridge's AI documentation tool.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The application supports distinct user journeys: an "Explore Path" for new prospects, a "Switch Path" for those migrating from other solutions (ambient AI or human scribes), an "Expand Path" for existing Abridge customers, and a "Measure Path" for partners to build a value story from deployment data.

### Measure Path (5-Page Partner Report)
The Measure path follows a 5-page narrative flow:
1. **Your Data** (MeasureDataEntry): Edit/Presentation modes. Edit mode has Partner Profile (org name, care setting, providers on Abridge, total providers), before/after metrics (time, closure, after-hours, wRVU), and Value Model configuration (time allocation percentages, financial rates). Presentation mode shows a clean summary.
2. **What Changed** (MeasureTransformation): Before/after comparison cards with animated bars, per-provider stats, utilization headroom expansion seed.
3. **The Value** (MeasureAllocate): Hero value display, time waterfall with footnotes (potential value with toggle, patient capacity, provider wellbeing), documentation quality section, per-provider/per-encounter metrics. "Potential Value" (formerly "Operational Savings") can be toggled on/off via `potentialValueEnabled` flag; when disabled, it's excluded from totals and shown with opacity/strikethrough. Toggle state persists to Story page and PDF export.
4. **The Opportunity Ahead** (MeasureOpportunity): Two-layer expansion model with **editable targets** - Deepen (default 80% adoption, user-editable) + Expand (default current + 50 providers, user-editable). InlineEdit component with click-to-edit UX, real-time recalculation, dark stat cards, dark Combined Opportunity panel. Targets stored in `state.expansionTargets` and flow to Story page and PDF.
5. **Your Story** (MeasureStory): Per-provider hero section, narrative callout, detailed results table, Deepen/Expand "What's Next" cards (reflecting custom targets), PDF export, methodology accordion.

Key calculation: `calculateExpansionResults()` in measureCalculator.ts accepts optional `targetAdoption` and `targetProviders` params (defaults 85% and totalProviders for backward compatibility). Computes Deepen, Expand, and combined opportunity values with per-provider economics.

### Switch Path (6-Screen Ambient AI Assessment)
The Switch path is a 6-screen premium narrative flow for assessing ambient AI documentation maturity:
1. **Provocation** (Screen1Provocation): Full-screen thesis framing with CTA
2. **Baseline** (Screen2Baseline): Providers, encounters, utilization number input (with 45% industry / 76% observed avg benchmark pills), advanced toggle for revenuePerVisit ($200 default), providerRate ($150 default), and CMS wRVU conversion factor ($33 default), dark sidebar with documented encounters calculation (230 working days)
3. **Domains** (Screen4Domains): 4-domain assessment (Capacity, Revenue, Workforce, Risk) with 4 activation levels each. Number inputs (no sliders), BenchmarkContext pills (gray, never pre-filled), FormulaDisplay (small italic mono text below every calculated output), persistent domain progress sidebar, "Not yet measured" for unmeasured domains, per-card disclaimer. Per-domain per-level inputs matching spec.
4. **Score** (Screen3Score): Documentation Intelligence Score using SCORE_MAP {1:6, 2:12, 3:19, 4:25} per domain (total /100). "How Your Score Is Built" card with clickable domain rows (X/25 per domain) that navigate back to Domains. Dynamic assessment narrative with 5-tier headlines (0-30 early stages, 31-50 emerging awareness, 51-70 actively managing, 71-85 strategically managed, 86-100 best in class) and domain-specific insight lines naming the lowest-scoring domain. "How is this calculated?" expandable methodology text. Sidebar shows maturity band reference points (25/50/75/100) instead of industry benchmarks. No Domain Value Summary (moved to Gap page). Disclaimer below navigation.
5. **Gap Analysis** (Screen5Gap): "THE COST OF STANDING STILL" page with three cards: (1) Your Deployment Reality — comparison table (You vs Benchmark) for utilization, time saved, documented encounters, hours recovered; (2) What Each Level Is Worth — domain-specific next-level narratives with formulas and low/high estimate ranges showing what one step forward unlocks; (3) 3-Year Projection chart (dashed gray "Current trajectory" vs solid red "With strategic action") using low-end estimates for strategic line. Dark sidebar shows Value at a Glance (monthly/weekly/daily), With Strategic Action (projected annual + gap), Cost of Waiting (monthly/6mo/12mo), and Domain Values. Strategic partner tone — shows data, doesn't prescribe actions.
6. **Summary** (Screen6Invitation): Hero section with score + measured value, domain performance table, invitation card, PDF export. All values respect hasValue flags.

Key UX rules: "Not yet measured" replaces $0 for unset inputs; totals only sum domains with hasValue=true; number inputs (no sliders); benchmarks as gray context text using observational language (no product claims); all inputs/card selections persist across domain navigation; domain progress sidebar always visible; per-card and global disclaimers present.

**Revenue Domain Levels:** Revenue Cycle Unaware → Anecdotal Revenue Signal (multi-select checkbox signals) → Impact Measured (choose metric type: wRVU/collections/revenue%/denial rate) → Revenue Cycle Integration (integration checkboxes + attributed revenue $). Level 3 formulas: wRVU×encounters×$33 CMS conversion (editable in baseline advanced), collections×encounters, encounters×rev/visit×%. Denial rate is qualitative-only (shows percentage, no dollar conversion).

**Workforce Domain Levels:** Pajama Time Reduced (hrs/wk after-hours reduction, hours headline) → Burden Measured and Validated (min/day savings using 230 working days + clinician survey radio with conditional findings checkboxes) → Retention Risk Quantified (turnover rate × providers × replacement cost, no attribution multiplier) → Labor Spend Structurally Reduced (agency/locum monthly × 12, no overtime input). L1/L2 show hours as headline metric; dollar burden-equivalent stored for downstream aggregation.

**Capacity Domain Levels:** Time Saved, Not Deployed → Measured, Not Redesigned → Access Redesigned (additional patients/mo + optional "providers with redesigned schedules" field defaulting to total providers) → Capacity Modeled into Workforce Planning (planning checkboxes + FTE avoided).

**Risk Domain Levels:** Better Notes, Same Infrastructure (no inputs, narrative only) → Active Quality Monitoring (radio: not_yet/spot_checks/systematic with conditional quality attribute checkboxes; no pre-selection) → Downstream Systems Connected (workflow checkboxes + optional hours input; checkboxes work independently, hours labeled "If known") → Documentation as Strategic Data Asset (strategic integration checkboxes + optional $ value; "Clinical documentation review" replaces malpractice language).

**Legal Language Standards:** All benchmark text uses observational framing ("Organizations at this stage have reported X") — no causal claims. Turnover L3 shows total exposure with narrative framing ("administrative burden is a contributing factor") — no 25% multiplier applied. Per-card disclaimer: "Estimates based on your inputs. Individual results vary." Global disclaimer on Screen6 includes no-guarantee language.

### Calculation Architecture
-   **Two calculation engines**: Classic SwitchPath.tsx (driver-level calculations) and computePillars.ts (narrative flow pillar calculations)
-   **Confidence haircuts**: Applied once at display layer based on dataMode — benchmark=55%, estimated=70%, measured=85%. No internal realization multipliers in engine calculations.
-   **Consolidated benchmarks**: Single source of truth in switchGapCalculator.ts — utilization 76%, timeSavings 4 min, denialPrevention 45%, hccImprovement 15%
-   **S-curve adoption model**: 3-year projections use compounding adoption curve (25%/55%/85%/100%/108% at months 3/6/12/24/36) instead of flat ramp multipliers
-   **Comprehensive Care Setting Support**: Tailored drivers, defaults, and terminology for Outpatient, Emergency Department, Inpatient, and Nursing settings.
-   **Expandable Math Breakdowns**: "See the math" functionality provides step-by-step calculations.
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
-   **UI/UX**: Adheres to Material Design principles, using Inter and JetBrains Mono fonts, Abridge's brand color palette (Abridge Cadmium Red #EA2C00), and full mobile responsiveness.

### Premium UX Enhancements
-   **Animations**: Smooth page transitions using framer-motion, staggered entrance animations, and accordion animations.
-   **Navigation**: Scroll-to-top on navigation and keyboard navigation support.
-   **Input Handling**: Input debouncing for delayed processing.
-   **Sticky Right Panels**: Dark-styled sticky right panels show running totals and contextual calculations on Explore path pages.
-   **Summary Page Design**: Features a premium restructured layout with Hero Section, Value Breakdown, Scaling Journey (Recharts chart), Investment Summary, and Actions Section.

### Security & Privacy
-   **Session Management**: Automatic session clearing on tab close.
-   **Privacy Features**: Client-side processing, input security, content security policy, data sanitization, privacy-preserving analytics, and a clear data button.

### Learn Methodology Section
A completely restructured section provides modular methodology pages for each care setting. It features a consistent 5-section structure (Context, Value Mechanisms, Assumptions, Honest Limits, Validation Path) and interactive elements like PDF export and hover tooltips.

### Deep Linking
The app supports deep linking for direct navigation:
-   **Methodology pages**: `/learn/outpatient`, `/learn/ed`, `/learn/inpatient`, `/learn/nursing` - Opens the corresponding methodology page directly
-   **Explore flow**: `/?explore=outpatient`, `/?explore=ed`, `/?explore=inpatient`, `/?explore=nursing` - Starts the Explore wizard with care setting pre-selected at the practice phase
-   **CTA integration**: "Build a Model" buttons on methodology pages use explore deep links to provide seamless navigation

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
-   **react-pdf**: Used for PDF exports.