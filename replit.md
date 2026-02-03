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
-   **Comprehensive Care Setting Support**: Tailored drivers, defaults, and terminology for Outpatient, Emergency Department, Inpatient, and Nursing settings. This includes specific time allocation categories and documentation drivers for each setting (e.g., ED-specific throughput calculations, Nursing-specific staffing efficiency and care quality metrics).
-   **Defensible Math with Realization Rates**: All ROI calculations incorporate conservative realization rates for defensible estimates across all benefit categories (e.g., Patient Access, Locum Reduction, wRVU, HCC, Denials, Wellbeing).
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