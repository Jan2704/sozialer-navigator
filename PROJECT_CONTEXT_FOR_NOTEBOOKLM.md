# Sozialer Navigator (2026) - Project Context & Documentation

> **Purpose of this document**: Upload this file to NotebookLM to give the AI a complete understanding of the project's architecture, business logic, design system, and goals.

## 1. Project Overview
**Name**: Sozialer Navigator
**Core Value Proposition**: A privacy-first, fast, and authoritative calculator for "Wohngeld" (Housing Benefit) and "Bürgergeld" (Citizens' Allowance) in Germany for the year 2026.
**Key Features**:
- **Smart Calculator**: Determines eligibility and estimated amount in < 60 seconds.
- **Local SEO Hubs**: Dynamic pages for specific cities (e.g., `/berlin/wohngeld`) with localized rent limits (Mietstufen).
- **Authoritative Source Strategy**: Heavy use of Schema.org (JSON-LD) to signal trust to search engines.
- **Lead Generation**: Conversions for AVGS (Job Coaching) and Legal Help (Widerspruch).

## 2. Technology Stack
The project is a **modern static/hybrid web application** built for performance and SEO.

- **Framework**: [Astro 5](https://astro.build) (SSG + Islands Architecture)
- **UI & Styling**: 
  - [Tailwind CSS v4](https://tailwindcss.com) (Utility-first)
  - **Design Tokens**: Standardized in `tailwind.config.mjs` (e.g., `brand.blue`, `brand.slate`).
  - **Icons**: Lucide Icons.
  - **Animations**: GSAP (GreenSock) & Framer Motion.
- **Interactivity**: React (via Astro Islands `client:load`).
- **Data Visualization**: Chart.js (for "Income vs. Rent" ratio).
- **Backend/API**: 
  - Mostly client-side logic for calculation.
  - Lead submission endpoint: `https://sozialer-navigator-api.onrender.com/api/v4/analyze` (External).

## 3. Directory Structure
```text
/
├── public/                 # Static assets (fonts, icons)
├── src/
│   ├── components/         # Reusable UI (ResultsSection, SmartCalculator)
│   ├── layouts/            # Page shells (Layout.astro)
│   ├── logic/              # CORE BUSINESS LOGIC
│   │   ├── calculator-2026.js  # The official WoGG 2026 formula & Rent Limits
│   │   └── client-calculator.js # Input handling & state management
│   ├── pages/              # Routing
│   │   ├── index.astro     # Homepage (Calculator + Landing)
│   │   ├── [citySlug]/     # Dynamic City Pages (Local SEO)
│   │   └── wohngeld/       # Informational hubs
│   └── styles/             # Global CSS
├── tailwind.config.mjs     # Design System Configuration
└── SCHEMA_STRATEGY.md      # SEO & JSON-LD Documentation
```

## 4. Business Logic: The "Wohngeld" Calculator
The core logic resides in `src/logic/calculator-2026.js`. It implements the **WoGG 2026 (Wohngeldgesetz)** formula.

### Core Formula
The calculation follows the official formula:
`1.15 * (M - (a + b*M + c*Y)*Y)`
- **M**: Eligible Rent (Rounded, capped by "Mietstufe").
- **Y**: Monthly Income (Netto equivalent).
- **a, b, c**: Coefficients determined by household size (Table in `WOGG_COEFFS`).

### Key Concepts
1.  **Mietstufen (Rent Levels)**: Every city in Germany has a level from 1 (cheapest) to 7 (most expensive). This determines the maximum rent subsidy (M_limit).
    - Example: A 2-person household in Level 7 gets a higher limit than in Level 1.
2.  **Comparison Logic**: The system calculates both **Wohngeld** and **Bürgergeld** and recommends the "Best Option" (`calculateBestOption` function).
    - Priority: Wohngeld (Priority benefit).
    - Exception: If Bürgergeld offers significantly more security (Total Need > Disposable with Wohngeld), it is shown.

## 5. Design System & Aesthetics
The project follows a "Premium Trust" aesthetic, inspired by modern fintech and Apple design.

- **Colors**:
  - `brand-blue`: `#0071e3` (Primary Action)
  - `brand-slate`: `#1d1d1f` (Headings, Trust)
  - Backgrounds: Heavy use of `slate-50` and `white`.
- **Components**:
  - **"Pro-Card"**: White cards with soft shadows (`box-shadow: 0 20px 40px -10px ...`) and rounded corners (`rounded-2xl` or `3rem`).
  - **Isolate**: Use of `isolate` and `z-index` for layered background blurs.
- **Typography**: `Inter` (Google Font).

## 6. SEO & Schema Strategy
Refer to `SCHEMA_STRATEGY.md` for details.
- **Goal**: Google "Authoritative Source".
- **Implementation**: `src/components/seo/SchemaOrg.astro` injects JSON-LD.
- **Types Used**:
  - `Organization` (Publisher)
  - `SoftwareApplication` (The Calculator)
  - `GovernmentService` (For City Pages, linking Local Office to City).
  - `FAQPage` (Rich Snippets).

## 7. Workflow for Changes
1.  **Content**: Edit `src/pages/*.astro` files.
2.  **Logic**: Edit `src/logic/calculator-2026.js` (Server/Core) or `client-calculator.js` (UI State).
3.  **Styling**: Use Tailwind classes. Only touch `global.css` for animations/resets.
4.  **Deployment**: Vercel (Auto-builds on push).
