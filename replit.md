# Abridge ROI Studio

## Overview

Abridge ROI Studio is a single-page web application designed to calculate the return on investment (ROI) for implementing Abridge (an AI documentation tool) in various healthcare care settings (Outpatient, Emergency Department, Nursing, Inpatient). The application empowers healthcare organizations to make data-driven decisions about adopting AI for documentation, streamlining operations, and improving financial outcomes. It allows users to select a care setting, choose ROI levers, input practice-specific assumptions, and receive real-time financial impact calculations, including ROI multiple, total annual benefit, investment costs, and net value created. The application operates entirely client-side, providing a responsive and interactive experience with a two-panel layout: inputs on the left and results (KPIs, waterfall charts, lever tables) on the right.

The project's ambition is to provide comprehensive ROI modeling across all major healthcare settings, including specialized flows for prospects switching from other ambient AI solutions or human scribes, and performance analysis for existing Abridge customers.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Core Application Flow
The application guides users through multi-step processes:
-   **Explore Path**: A 4-step sales-led flow (Care Setting → Strategic Priorities → Model Builder → Summary) for new prospects across Outpatient, Emergency Department, Inpatient, and Nursing care settings.
-   **Switch Path (Ambient AI)**: A streamlined 3-page flow (after Solution Selection) for prospects switching from other ambient AI solutions. Pages: Setup (provider range chips, utilization/efficiency sliders with Abridge benchmarks, live gap visualization showing YOU vs ABRIDGE) → Analysis (annual gap hero with monthly/daily breakdown, Value Breakdown tab with expandable driver cards, Over Time tab with 3-year chart and cost of waiting) → Conclusion (situation summary, context about benchmarks, 3-year value highlight, CTAs). Uses slider-based inputs with real-time gap calculations.
-   **Switch Path (Human Scribes)**: A 5-step cost-focused flow for prospects switching from human scribes to Abridge. Pages: Setup (organization info, scribe coverage, hourly costs) → Coverage Reality (current vs full coverage visualization) → Hidden Costs (turnover/training, management overhead) → Full Picture (total investment summary with breakdown) → Comparison (3-year side-by-side scribes vs Abridge with savings). Uses editable inline inputs and real-time calculations with coral (#E85D3F) CTAs and emerald for positive savings values.
-   **Expand Path**: A 5-step performance analysis flow for current Abridge customers (Setting Selection → Deployment Setup → Performance Dashboard → ROI Story → Journey Expansion).
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
-   **UI/UX**: Adheres to Material Design principles for enterprise data applications. Uses Inter and JetBrains Mono fonts. Color palette includes Abridge Red, muted grays, and greens for financial indicators. Responsive design using Tailwind's breakpoints.

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