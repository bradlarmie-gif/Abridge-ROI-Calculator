# Abridge ROI Studio

## Overview
Abridge ROI Studio is a client-side single-page web application designed to calculate the return on investment (ROI) for implementing Abridge in various healthcare settings. It enables users to select a care setting, choose ROI levers, input practice-specific assumptions, and receive real-time financial impact calculations. The application provides comprehensive ROI modeling, including specialized flows for prospects switching from other ambient AI solutions or human scribes, and performance analysis for existing Abridge customers. Its core purpose is to provide defensible ROI estimates for Abridge's AI documentation tool.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The application supports distinct user journeys: an "Explore Path" for new prospects, a "Switch Path" for those migrating from other solutions (ambient AI or human scribes), and an "Expand Path" for existing Abridge customers to document their value story.

### Technical Implementations
-   **Comprehensive Care Setting Support**: Tailored drivers, defaults, and terminology for Outpatient, Emergency Department, Inpatient, and Nursing settings, including specific time allocation categories and documentation drivers. ROI calculations incorporate conservative realization rates.
-   **ROI Calculation Logic**: Includes formulas for "Today's ROI" and "Full Scale ROI" which accounts for expansion and utilization improvements.
-   **Simplified Wellbeing Retention Model**: A threshold-based approach for calculating retention lift.
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