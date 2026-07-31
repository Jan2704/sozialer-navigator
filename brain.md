# 🧠 The Brain: Sozialer Navigator (Project Intelligence)

> **Status**: Active Development (Kostenloser Antrags-Flow & Render Backend Stabilisierung)
> **Last Updated**: 2026-07-31 (dev-loop iteration 6)
> **Focus**: Kostenloser Antragsversand, Rendert-Backend Stabilität, Multi-KI Handoff

## 1. 🎯 Top Priority Missions
What we are working on *right now*.
- [x] **Jobcenter Search Integration**: Parsing `master_daten_2026_improved.csv.txt` (used `cities_2026.json`) and building the lookup UI.
- [x] **Wohngeldbehörde Search Integration**: Implemented via `AuthoritySearch.astro` (handles both Jobcenter & Wohngeld).
- [x] **Partner Interface / API**: Implemented schema & integration (PartnerCTA).
- [x] **Lead Nurturing Webhook**: Implemented secure API (`/api/leads`) to send user data to the automation workflow.
- [x] **AVGS Monetization**: Refined funnel with "Recht statt Almosen" messaging & integrated into Results.
- [x] **Content Hygiene Fix (2026-07-29)**: Found & fixed a leaked `// TODO: Faktencheck...` comment that was embedded inside a live, user-facing FAQ answer string on `/kindergeld/` (rendered on-page AND in FAQPage JSON-LD schema). Trimmed to the fact-checked, deadline/portal-name-free part of the sentence. Also removed a stale `// TODO: Verify logo path` comment in `src/components/seo/schema.astro` after confirming `public/logo.png` exists and the schema URL is correct. Verified via `npm run build` + independent subagent review.

## 2. 🗺️ Strategic Roadmap
### Phase 1: Core Foundation (Current)
- [x] **Smart Calculator**: Logic for Wohngeld & Bürgergeld 2026 implemented.
- [x] **Premium UI**: "Pro-Card" design system, Apple-inspired aesthetics.
- [x] **Local SEO Architecture**: `[citySlug]` structure ready.
- [x] **Search Data**: Robust Jobcenter & Wohngeldbehörde database integration (via `AuthoritySearch`).

### Phase 2: Authority & Trust (GEO Focused)
- [x] **GEO-First Content**: Rewrite `/lexikon` intros as direct Q&A for AI.
- [x] **Schema.org Optimization**: [CRITICAL] Implement `GovernmentService` and `FAQPage` schema.
- [x] **Social Proof (Trust Badges)**: `<TrustBadges />` (factual claims: kostenlos, DSGVO, Made in Germany, SSL) is now rendered on `index.astro` between the mission section and FAQ.
- [ ] **Social Proof (Testimonials)**: `src/components/testimonials.astro` exists but is intentionally **not** wired in — it contains fabricated named customer quotes (Thomas W., Sabine K., Michael R.) with no real source. Owner decision (2026-07-29): do not publish as-is; needs either real customer testimonials or anonymized/generic placeholders before going live (risk: irreführende Werbung / UWG).
- [x] **Repo hygiene follow-up (2026-07-31)**: removed the remaining stray root-level dev-scratch scripts flagged on 2026-07-29 — `test_bat.bat`, `test_lead.js`, `verify_all_cities.js`, `verify_fix.js` — plus two more of the identical category found during this pass, `test_stripe.js` and `test_fictitious_person.js` (manual localhost-only smoke scripts, unreferenced by app code/build/docs). Added `*.bat`, `/test_*.js`, `/verify_*.js` to `.gitignore` to prevent recurrence (root-anchored, doesn't touch `src/`). Verified via `git grep` (no references anywhere outside brain.md's own note) + `npm run build` + independent subagent review. Not in scope for this pass (deliberately left alone, different risk profile): `backend/` (Python service + `__pycache__`), root `.cjs`/PDF-extraction utility scripts, and generated `*.pdf`/`*.json` sample files — these look like they could still be in active use and warrant a dedicated look rather than a drive-by deletion.
- [x] **Repo hygiene follow-up 2 (2026-07-31, dev-loop iteration 2)**: did the deferred "dedicated look" at the root-level `.cjs`/PDF-extraction scripts and generated sample files. Confirmed dead (zero references in `package.json`, `src/`, `public/`, `vercel.json`, `backend/`, or any config — checked via repo-wide `git grep`) and removed: `add_fields.js`, `add_missing_cities.cjs`, `audit_cities.cjs`, `download_real_pdfs.js`, `extract_missing_cities.cjs`, `generate_plz_lookup.cjs`, `generate_test_pdf.js`, `get-pdf-fields.ts`, `get_real_fields.js`, `read_pdf_fields.cjs` (one-off PDF-field/city-data utilities, several hardcoding the original developer's personal Windows path `c:/Users/Jan-r/OneDrive/...`; `generate_plz_lookup.cjs`'s intended output `src/data/plz-lookup.js` was never even committed, confirming it was never adopted). Also removed the empty (0-byte) duplicate root `engine.py` — **not** the real `backend/engine.py` (15KB, live Render service), which was left untouched and verified present after the change. Also removed `full_status.json` / `temp_nlm_status.json` (stale status blobs from an unrelated external notebook/AI tool) and the generated sample PDFs `Erika_Mustermann_Bürgergeld_Antrag.pdf`, `Erika_Mustermann_Wohngeld_Antrag.pdf`, `Filled_TEST_Buergergeld.pdf` (test output, not the live `public/forms/*.pdf` templates, which were confirmed untouched and still referenced by `authority-app.jsx`/`trust-pdf-generator.jsx`). Added `/*_status.json` to `.gitignore` (root-anchored). Verified via `npm run build` (clean, dist output complete) + independent subagent review (PASS, no issues) before committing. Backend and `public/forms/` explicitly out of scope and confirmed untouched.
- [x] **Repo hygiene follow-up 3 (2026-07-31, dev-loop iteration 5)**: deleted the two dead calculator files flagged as a follow-up in iteration 4 — `src/logic/client-calculator.js` (585-line unused alternate calculator/UI-state module, same "log request URL before fetch" pattern noted in the iteration-4 privacy fix, but never imported anywhere) and `src/logic/calculator.ts` (0-byte empty file). Re-verified independently via repo-wide `git grep` (not just `src/`) before deleting: zero imports/references in `src/`, `backend/`, `package.json`, or any config — the only other place either filename appeared was `PROJECT_CONTEXT_FOR_NOTEBOOKLM.md`, which described `client-calculator.js` as "UI Input" in the architecture docs; updated that doc's file-tree listing and workflow section to drop the reference, and removed the equivalent stale "UI Input" line from this file's Tech Stack section. `src/logic/` now contains only the two live files: `benefit-engine.js` and `calculator-2026.js`. Verified via `npm run build` (clean) + independent subagent review (PASS, no issues, confirmed dead via its own repo-wide grep) before committing. (`npm install` in this session's fresh container regenerated `package-lock.json` with cosmetic `"peer": true` diffs from a newer local npm version — unrelated to this change, reverted rather than committed.)
- [x] **Repo hygiene follow-up 4 (2026-07-31, dev-loop iteration 6)**: removed 17 orphaned dead files under `src/` found via a fresh sweep (`brain.md` had no other open, actionable `- [ ]` items left besides the two deliberately-parked ones below). Confirmed zero references via repo-wide `git grep` for each: `capsule-nav.astro` (unused "kelvin-*" themed nav from an earlier design iteration, superseded by the current brand-navy/gold system — not the same component as the live design), `application-pdf-template.jsx` (superseded by live `trust-pdf-generator.jsx`), `benefit-recommendations.astro`, `bestandskunden-section.astro`, `city-map.jsx` (superseded by `authority-search.astro`/`authority-app.jsx`), `city-schemas.astro` (distinct from the live `seo/schema.astro` & `seo/seo-schema.astro`), `lead-magnet.astro` (distinct from the live `lead-modal.astro`), `notice-check-quiz.tsx`, `risk-teaser.astro`, `seo/local-business-schema.astro`, `step-calculator.jsx` (superseded by the live `smart-calculator.jsx`), `step-card.astro`, `welcome.astro`+`welcome.jsx` (unmodified Astro-starter-template pair, never wired into any page — the two files only reference each other), `layouts/dashboard-layout.astro` (the live `admin/dashboard.astro` actually uses `layouts/layout.astro`), and `assets/astro.svg`+`background.svg` (only ever used by the deleted `welcome.astro`). Verified via `npm run build` (clean, no missing-module errors) + independent subagent review (PASS) before committing. Not touched (deliberately out of scope, generic boilerplate not specific to this project): the root `README.md` still describes the default Astro-starter folder structure (`Welcome.astro`, `astro.svg`) rather than the real project layout — cosmetic doc staleness, not a functional issue, worth a dedicated pass if the team wants a project-specific README. (`npm install` in this session's fresh container again regenerated `package-lock.json` with cosmetic npm-version diffs, same as iteration 5 — reverted rather than committed.)
- [x] **Bugfix pass 3 (2026-07-31, dev-loop iteration 3)**: fixed two small independent bugs found via a targeted scan (broken internal links + stray TODOs). (1) `src/pages/404.astro`: the "Zum Rechner" button linked to `/#wohngeldrechner`, an anchor id that doesn't exist anywhere in the codebase — it now scrolled to nothing. Fixed to `/#calculator`, the actual id used on the homepage's calculator section. (2) `brain.md` Quick Links: removed a dead `- [ ]` link pointing to `../.gemini/antigravity/brain/.../geo_strategy.md`, a path that doesn't exist anywhere on disk — a stale local-session artifact from a different AI tool, not a repo file, so there was nothing to point it to instead. Left the `/kinderzuschlag/` TODO in `src/pages/kindergeld/index.astro:251` alone — it's a placeholder comment for a page that hasn't been built yet, not a bug; building that page would be a new feature, out of scope for a bugfix pass. Verified via `npm run build` (clean) + independent subagent review (PASS, no issues) before committing.
- [x] **Privacy fix: debug console.log leaking user PII (2026-07-31, dev-loop iteration 4)**: found via a targeted repo scan that `src/components/smart-calculator.jsx` (the homepage calculator, mounted `client:load`) and `src/components/results-section.astro` were logging live user data to the browser console in production. Removed: the fetch payload/response logs in `smart-calculator.jsx` (income, rent, household composition sent to the backend, plus the full API response), and three logs in `results-section.astro` (script init, `showView()` calls, and the `benefit-calculation-completed` event handler logging the full result object incl. calculated benefit amounts). Purely diagnostic — no variables were declared only for the log calls, no side effects removed, confirmed no runtime/behavior change. Verified via `npm run build` (clean) + independent subagent review (PASS, no issues) before committing. **Follow-up noted, not fixed this pass**: `src/logic/client-calculator.js` has the same "log request URL before fetch" pattern at line ~436, but a repo-wide `git grep` found zero imports/references to that file anywhere in `src/` — it appears to be dead code (an unused alternate calculator path), so the log isn't reaching production; left alone rather than editing dead code, but worth deleting the whole file in a future repo-hygiene pass alongside the also-confirmed-empty `src/logic/calculator.ts` (0 references, empty file).

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
  - Data: `src/data/wohngeldData.js` (Agencies & Rent Levels)
  - Content: `src/pages/*.astro`

## 5. 📂 Quick Links
- **[Context for AI](PROJECT_CONTEXT_FOR_NOTEBOOKLM.md)**: Deep dive into the project's purpose.
- **[Schema Strategy](SCHEMA_STRATEGY.md)**: How we talk to Google.
- **[Verification](VERIFICATION_ARTIFACT.md)**: Testing protocols.

---
*This file is the central nervous system of the project. Keep it updated.*
