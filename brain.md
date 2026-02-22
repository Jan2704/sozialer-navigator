# 🧠 The Brain: Sozialer Navigator (Project Intelligence)

> **Status**: Active Development
> **Last Updated**: 2026-02-09
> **Focus**: Jobcenter Search, Wohngeldbehörde Search & Lead Nurturing

## 1. 🎯 Top Priority Missions
What we are working on *right now*.
- [x] **Jobcenter Search Integration**: Parsing `master_daten_2026_improved.csv.txt` (used `cities_2026.json`) and building the lookup UI.
- [x] **Wohngeldbehörde Search Integration**: Implemented via `AuthoritySearch.astro` (handles both Jobcenter & Wohngeld).
- [x] **Partner Interface / API**: Implemented schema & integration (PartnerCTA).
- [x] **Lead Nurturing Webhook**: Implemented secure API (`/api/leads`) to send user data to the automation workflow.
- [x] **AVGS Monetization**: Refined funnel with "Recht statt Almosen" messaging & integrated into Results.

## 2. 🗺️ Strategic Roadmap
### Phase 1: Core Foundation (Current)
- [x] **Smart Calculator**: Logic for Wohngeld & Bürgergeld 2026 implemented.
- [x] **Premium UI**: "Pro-Card" design system, Apple-inspired aesthetics.
- [x] **Local SEO Architecture**: `[citySlug]` structure ready.
- [x] **Search Data**: Robust Jobcenter & Wohngeldbehörde database integration (via `AuthoritySearch`).

### Phase 2: Authority & Trust (GEO Focused)
- [x] **GEO-First Content**: Rewrite `/lexikon` intros as direct Q&A for AI.
- [x] **Schema.org Optimization**: [CRITICAL] Implement `GovernmentService` and `FAQPage` schema.
- [ ] **Social Proof**: Add trust badges and testimonials.

### Phase 3: Monetization Ecosystem
- [x] **Partner API**: Secure lead transmission to legal/coaching partners.
- [ ] **User Accounts**: (Optional) Save calculations for later.

## 3. 🏗️ Tech Stack & Architecture
- **Framework**: [Astro 5](https://astro.build) (Hybrid Rendering)
  - *Why*: SEO performance + React Islands for interactivity.
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com)
  - *Config*: `tailwind.config.mjs`
  - *Key Colors*: `brand-blue` (#0071e3), `brand-slate` (#1d1d1f)
- **State Management**: React State (Local) + URL Params (Shareability).
- **Backend Logic**:
  - Calculation: Client-side (`src/logic/calculator-2026.js`).
  - Data: CSV/JSON imports (`src/data/`).

## 4. 🧠 Key Knowledge & Rules
### Design Philosophy
- **"Law Firm Premium"**: Authoritative, trustworthy, and sophisticated.
- **Visuals**: Deep Navy (`#0a1628`) & Gold (`#c5a67c`). Marble & Glass textures.
- **AntiGravity System**: Centralized design tokens for consistency.
- **Narrative**: **"Recht statt Almosen"** (Right, not Charity). Frame benefits as an investment in the user's future.

### Data & Logic
- **Wohngeld 2026**: Strict adherence to the official WoGG formula.
- **Mietstufen**: 1-7 scale determining rent caps. Crucial for accuracy.
- **Files**:
  - Logic: `src/logic/calculator-2026.js`
  - UI Input: `src/logic/client-calculator.js`
  - Data: `src/data/wohngeldData.js` (Agencies & Rent Levels)
  - Content: `src/pages/*.astro`

## 5. 📂 Quick Links
- **[Context for AI](PROJECT_CONTEXT_FOR_NOTEBOOKLM.md)**: Deep dive into the project's purpose.
- **[Schema Strategy](SCHEMA_STRATEGY.md)**: How we talk to Google.
- [ ] **[GEO Strategy](../.gemini/antigravity/brain/300d78c5-6770-4f25-b26a-4a7e325bc080/geo_strategy.md)**: Blueprint for AI Search visibility.
- **[Verification](VERIFICATION_ARTIFACT.md)**: Testing protocols.

---
*This file is the central nervous system of the project. Keep it updated.*
