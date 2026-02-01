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
-   **Defensible Pathway Toggle System**: ROI drivers include togglable value pathways with real-time recalculation, structured with "Your Gap" and "How This Creates Value" sections.
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