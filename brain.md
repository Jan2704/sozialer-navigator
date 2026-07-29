# 🧠 The Brain: Sozialer Navigator / Amtly (Project Intelligence)

> **Status**: Active Development — Security/Calculation/SEO/Design audit complete, awaiting merge ([PR #1](https://github.com/Jan2704/sozialer-navigator/pull/1))
> **Last Updated**: 2026-07-29
> **Focus**: Trust & correctness (privacy claims, calculation accuracy, admin security), then content/coverage growth

> ⚠️ **Read this before marking anything `[x]`**: earlier versions of this file marked several items "done" that did not exist in the code (GovernmentService schema, city landing pages, admin auth). A 2026-07-29 audit found and fixed real, live bugs that had gone unnoticed for months specifically *because* the docs said they were fine. **Verify against the actual code before checking a box — grep for it, don't trust the last entry.**

## 1. 🎯 Top Priority Missions
What we are working on *right now*.
- [x] **Free application flow**: Automated PDF generation + email-to-authority + confirmation, fully free (Stripe paywall removed 2026-07-29). **Product decision (2026-07-29, same day): entry point intentionally hidden again.** The code (`send-application.ts`, the `main`/`confirm` views in `authority-app.jsx`) stays in the repo for later — just unreachable from the UI. The only live send path right now is the self-service "Assistent" (user downloads the filled PDF and sends it themselves).
- [x] **Kinderzuschlag calculation bug**: Backend had single/couple income thresholds inverted (single parents wrongly told they didn't qualify) and a stale max amount. Fixed.
- [x] **Wohngeld calculation accuracy**: Backend (the *primary* live calculation path, not the JS fallback) used a crude heuristic that ignored Mietstufe entirely. Replaced with the real WoGG formula.
- [x] **Admin security**: `/admin/dashboard` and `/admin/feedback` had zero access control and a hardcoded Supabase key in the page source. Now behind real auth (env-secret password, signed session cookie).
- [ ] **Jobcenter/Wohngeldbehörde coverage**: Only **20 cities** have real authority contact data (`src/data/authorities.json`) against 400+ Land-/Stadtkreise in Germany. Outside those 20, the app falls back to "Amt nicht gefunden" — the free PDF still generates, but the "we find your exact office" promise doesn't hold nationally yet. This is a data-entry/partnership problem, not a code bug.
- [ ] **RDG legal review**: lower urgency now that automated sending is disabled (see above) — the live flow is "we fill your PDF, you send it," which is a much safer framing than the previously-live "we email it to the authority for you." Still worth a lawyer's confirmation before ever re-enabling the automated-send entry point.

## 2. 🗺️ Strategic Roadmap
### Phase 1: Core Foundation
- [x] **Smart Calculator**: Wohngeld/Bürgergeld/Kinderzuschlag/Kindergeld logic. Primary path is the Python backend (`backend/engine.py`, hosted on Render); the JS engine (`src/logic/benefit-engine.js`) is the offline fallback used only when the API is unreachable — **the two are separate implementations and can drift out of sync** (already found one real amount mismatch between them; check both when changing a rule).
- [x] **Design system**: Rebuilt 2026-07-29 — neutral warm-stone base + single accent (see §3 Key Colors). The "Law Firm Premium" navy/gold look is now scoped specifically to the legal-referral funnel inside `authority-app.jsx`, not the whole site.
- [ ] **Local SEO Architecture**: **Not built.** No `[citySlug]` pages exist anywhere in `src/pages`. `vercel.json` used to have a catch-all redirect apparently left over from a prior attempt at this, which was actively 301-redirecting real pages (`/kindergeld`, `/grundsicherung-im-alter`) to the homepage — removed 2026-07-29. If city pages get built, add their routes to `vercel.json`'s exceptions deliberately, don't rely on a blanket regex.
- [x] **Search Data**: Jobcenter/Wohngeldbehörde lookup lives in `authority-app.jsx` (client-side `findAuthorityInDB`, backed by `src/data/authorities.json` + `cities_2026.json`). `AuthoritySearch.astro` referenced in earlier versions of this doc was dead/unreferenced code — deleted 2026-07-29.

### Phase 2: Authority & Trust (GEO Focused)
- [x] **GEO-First Content**: `/lexikon` entries use direct Q&A structure.
- [x] **FAQPage schema**: Implemented and live (`src/components/seo/seo-schema.astro`, used on lexikon pages).
- [ ] **GovernmentService schema**: Code exists in `schema.astro` but is dead — it only renders when `type="city-service"` is passed, and nothing in the codebase passes that (there are no city pages to attach it to). Don't mark this done until it's actually wired to a real page.
- [ ] **Social Proof**: Homepage shows an animated "18.423 Haushalte haben bereits geprüft" counter — this is a static/animated placeholder number, not pulled from real data. Either wire it to a real count or stop animating it as if it were live.

### Phase 3: Monetization Ecosystem
- [x] **Partner API**: Lead transmission to legal/coaching partners (`/api/leads`) still active.
- ⚠️ **Revenue model gap**: The paid Antragsservice (5,99€, the only direct product revenue) was made fully free on 2026-07-29 per product decision. Remaining monetization is entirely third-party lead-gen (legal referral, AVGS coaching, CHECK24 affiliate) — lower-intent, lower-conversion than the removed direct channel. No replacement revenue mechanism has been designed yet.
- [ ] **User Accounts**: (Optional) Save calculations for later.

## 3. 🏗️ Tech Stack & Architecture
- **Framework**: [Astro 5](https://astro.build) (SSR, `@astrojs/vercel` adapter) + React islands for interactivity.
- **Backend**: Two separate calculation engines — see Phase 1 warning above. Python (`backend/`, Flask, hosted on Render **free tier**) is primary/live; note the free tier cold-starts after inactivity (up to ~30s), which the frontend now accounts for with a 40s timeout, but this is still a real UX cost on the first request of the day. Consider a paid tier or a keep-warm ping if conversion data shows it matters.
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com), tokens defined in `src/styles/global.css` `@theme` block (this is the actual source of truth in Tailwind v4 — `tailwind.config.mjs`'s `colors` section is kept in sync manually, don't let them drift).
  - **Key Colors** (rebuilt 2026-07-29): `brand-blue` `#D9622B` (single confident accent), `brand-indigo` `#B84D1C` (hover/deep), `brand-emerald` `#5B8467` (muted secondary/success), `brand-navy` `#1F2E24` (deep charcoal-green), `brand-gold` `#c5a67c` (unchanged — legal-referral sub-brand only). Surface: `surface-base` `#F2F0EA`, `text-primary` `#1B1A17`.
- **State Management**: React State (Local) + URL Params.
- **Data**: `src/data/*.json` (cities, authorities, rules).
- **Testing**: **None.** No test framework, no `*.test.*` files anywhere. A financial calculator with zero regression coverage is the main reason bugs like the Kinderzuschlag threshold inversion survived undetected — treat any change to `backend/engine.py`, `src/logic/benefit-engine.js`, or `src/logic/calculator-2026.js` as high-risk and manually verify against a known example before committing.

## 4. 🧠 Key Knowledge & Rules
### Design Philosophy
- **Main product** (calculator, results, homepage, nav/footer): warm, neutral, human-first — see §3 colors. Rebuilt 2026-07-29 to replace an earlier teal/sky "fintech dashboard" look that was inconsistently applied (tokens existed but many components hardcoded the old hex values directly).
- **Legal-referral funnel** (`authority-app.jsx`'s "Frist sicher starten" flow): deliberately distinct "Law Firm Premium" look — Deep Navy `#0a1628` & Gold `#c5a67c`. Keep this scoped; don't let it bleed into the main product or vice versa.
- **Narrative**: **"Recht statt Almosen"** (a right, not charity). Frame benefits as an entitlement.
- **Trust copy rule**: never claim something about data handling that isn't literally true in the code. Three separate false claims ("Daten verlassen nie deinen Browser", "alle Berechnungen laufen lokal", "Daten bleiben auf deinem Gerät und werden unwiderruflich gelöscht") were found and fixed 2026-07-29 — all directly contradicted by the fact that the primary calculation path sends data to a remote API and leads are stored in Supabase. Before writing trust/privacy copy, check what the code actually does.

### Data & Logic
- **Wohngeld 2026**: Formula lives in *two* places — `backend/engine.py` (`calculate_wohngeld`, primary/live, now Mietstufe-aware as of 2026-07-29) and `src/logic/calculator-2026.js` (`calculateExactWohngeld`, offline fallback). Rate tables (`backend/rules/wohngeld.json`) were synced between both 2026-07-29 but were **not** independently verified against the official 2026 WoGG tables — treat the exact numbers as "internally consistent," not "legally certified," until someone checks them against the source.
- **Mietstufen**: 1–7 scale determining rent caps. Now actually used by both engines (previously the backend ignored it).
- **Vermögen (assets)**: The wizard's Step 4 does *not* currently ask about assets/disability despite `hasHighAssets`/`hasDisability` state existing in `smart-calculator.jsx` — those fields are always `false`/default. The asset-threshold logic inside `benefit-engine.js` is also internally inconsistent across modules (mix of 40k/60k/10k thresholds gated by the same boolean). Low priority since it's currently unreachable, but don't wire up the UI question without also fixing the module logic.
- **Files**:
  - Primary calc: `backend/engine.py` + `backend/rules/*.json`
  - Offline fallback: `src/logic/benefit-engine.js`, `src/logic/calculator-2026.js`
  - Data: `src/data/authorities.json` (20 cities), `src/data/cities_2026.json` (109 cities, Mietstufe/PLZ)
  - Content: `src/pages/*.astro`, `src/content/lexikon/`, `src/content/ratgeber/`
  - ⚠️ Some `ratgeber/*.md` files have filenames that don't match their content (e.g. `buergergeld-oder-wohngeld.md` is actually an external-link stub about something else). Check the actual frontmatter `title`, not the filename, before linking to one.

## 5. 📂 Quick Links
- **[Context for AI](PROJECT_CONTEXT_FOR_NOTEBOOKLM.md)**: Deep dive into the project's purpose.
- **[Schema Strategy](SCHEMA_STRATEGY.md)**: How we talk to Google.
- [ ] **[GEO Strategy](../.gemini/antigravity/brain/300d78c5-6770-4f25-b26a-4a7e325bc080/geo_strategy.md)**: Blueprint for AI Search visibility.
- **[Verification](VERIFICATION_ARTIFACT.md)**: Testing protocols.
- **[PR #1](https://github.com/Jan2704/sozialer-navigator/pull/1)**: 2026-07-29 security/calculation/SEO/design audit — read this diff before touching auth, the Wohngeld formula, or the color tokens.

## 6. ⚠️ Known Open Risks (not code-fixable, need a human decision)
- **Legal**: lower priority now — see §1, automated sending is off.
- **Coverage**: Authority database covers 20/400+ Kreise. Expanding this is data entry, not engineering.
- **Business model**: no clear revenue path after the free pivot — owner's current lean is "free first, add a paid tier once there's traction," not decided in detail.
- **Content/SEO**: 6 ratgeber + 18 lexikon entries, no city pages. Competing for "Förderungen" search terms against official government calculators requires months of content investment, not a code change.
- **Multi-agent workflow**: Multiple AI sessions (Claude + Gemini/Antigravity per this file's own path references) commit directly to `main` without review. Consider routing changes through PRs going forward — this audit did, via [PR #1](https://github.com/Jan2704/sozialer-navigator/pull/1).

## 7. 📌 Owner Product Decisions (2026-07-29)
Explicit calls from the project owner — don't re-litigate these without asking:
- **Brand name**: still genuinely undecided (Amtly vs. Sozialer Navigator). Don't force a resolution; keep using "Amtly" in new copy since that's what's already predominant, but no big rebrand push.
- **Automated authority-send**: paused, not cancelled. Code stays, UI entry point hidden (see §1).
- **Revenue model**: deferred — likely free-first-then-paid-later, not designed in detail yet. Don't build monetization features speculatively.
- **Partnerships/Beziehungsarbeit** (Sozialverbände, Outplacement, etc.): deliberately deferred until SEO/organic traffic is bigger. Near-term focus stays on product + content, not outreach.
- **Budget/timeline**: adaptive — scales with whether the work is visibly paying off, no fixed roadmap dates. Don't commit to calendar deadlines on the owner's behalf.

---
*This file is the central nervous system of the project. Keep it updated — but only check a box after you've actually looked at the code, not the last time someone said it was done.*
