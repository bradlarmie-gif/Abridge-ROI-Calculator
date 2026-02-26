# Abridge ROI Studio

## Overview
Abridge ROI Studio is a client-side single-page web application designed to calculate the return on investment (ROI) for implementing Abridge in various healthcare settings. It enables users to select a care setting, choose ROI levers, input practice-specific assumptions, and receive real-time financial impact calculations. The application provides comprehensive ROI modeling, including specialized flows for prospects switching from other ambient AI solutions or human scribes, and performance analysis for existing Abridge customers. Its core purpose is to provide defensible ROI estimates for Abridge's AI documentation tool, supporting Abridge's business vision for market penetration and customer value demonstration.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The application supports distinct user journeys: an "Explore Path" for new prospects, an "Assess Path" for evaluating current documentation approaches (ambient AI, human scribes, or nursing), an "Expand Path" for existing Abridge customers, and a "Measure Path" for partners to build a value story from deployment data.

### UI/UX Decisions
The application adheres to Material Design principles, utilizing Inter and JetBrains Mono fonts, Abridge's brand color palette (Abridge Cadmium Red #EA2C00), and full mobile responsiveness. Premium UX enhancements include smooth page transitions with framer-motion, staggered entrance animations, input debouncing, and sticky right panels for contextual calculations.

### Technical Implementations
-   **Frontend Framework**: React 18 with TypeScript.
-   **Build Tool**: Vite.
-   **Styling**: Tailwind CSS, custom design tokens, and shadcn/ui built on Radix UI primitives.
-   **State Management**: Primarily React's `useState` hooks.
-   **Data Management**: TanStack React Query for future API integrations.
-   **Security & Privacy**: Client-side processing, automatic session clearing, input security, content security policy, data sanitization, privacy-preserving analytics, and a clear data button.
-   **Deep Linking**: Supports direct navigation to methodology pages and pre-selection of care settings for the Explore flow.

### Feature Specifications
-   **Measure Path**: A 5-page partner report flow (`Your Data`, `What Changed`, `The Value`, `The Opportunity Ahead`, `Your Story`) allowing partners to configure, visualize, and expand Abridge's value based on deployment data. Includes editable targets for expansion and PDF export.
-   **Assess Path — Ambient AI Assessment**: A 5-screen premium narrative flow (`Baseline`, `Domains`, `Score`, `Gap Analysis`, `Summary`) designed to assess ambient AI documentation maturity across Capacity, Revenue, Workforce, and Risk domains. Features dynamic scoring, gap analysis, 3-year projections, and PDF export.
-   **Assess Path — Nursing Edition**: A domain-based assessment mirroring the ambient AI pattern. 5-step flow: `Your Nursing Program` (baseline inputs: staffed beds, nurse FTEs, bed occupancy) → `Pressure Points` (4 domains cycling internally: Workforce Stability, Labor Cost, Nurse Experience, Care Quality — each with 4-level cards, conditional inputs, and estimated impact sidebar) → `Assessment` (score out of 100, domain breakdown) → `Priorities` (top 2-3 priority pathways ranked by pressure level) → `Next Steps` (working session CTA + PDF export). Scoring: Level 1=6pts, Level 2=12pts, Level 3=19pts, Level 4=25pts per domain. Files in `client/src/pages/switch/nursing/`.
-   **Learn Methodology Section**: A restructured section providing modular methodology pages for each care setting with a consistent 5-section structure (Context, Value Mechanisms, Assumptions, Honest Limits, Validation Path) and interactive elements.

### System Design Choices
-   **Calculation Engines**: Two primary engines: one for driver-level calculations and another for narrative flow pillar calculations.
-   **Confidence Haircuts**: Applied at the display layer based on data mode (benchmark, estimated, measured) for transparent ROI presentation.
-   **Consolidated Benchmarks**: A single source of truth for key metrics like utilization, time savings, and denial prevention.
-   **S-curve Adoption Model**: 3-year projections utilize a compounding adoption curve for realistic modeling.
-   **Care Setting Support**: Tailored drivers, defaults, and terminology for Outpatient, Emergency Department, Inpatient, and Nursing settings.
-   **Component-Driven UI**: Utilizes reusable components like `PathwayCard` for progressive disclosure and maintainability.
-   **Configuration-driven**: ROI levers and properties are externally managed for flexibility.
-   **Pure Functions**: Encapsulated ROI calculation logic ensures reliability.

## External Dependencies

-   **UI/Charting Libraries**:
    -   Radix UI: For accessible, unstyled components.
    -   Recharts: For interactive data visualization.
    -   Lucide React: For icons.
    -   react-pdf: For generating PDF exports.
-   **Fonts**:
    -   Google Fonts: Inter, JetBrains Mono.