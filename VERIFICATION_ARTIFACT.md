# Verification Artifact - Sozialer Navigator 2026
## Tasks Completed

1.  **Conditional Authorities (Map)**
    - Updated `src/data/authorities.json` to include **Jobcenter** and **Wohngeldbehörden** data for Berlin (Spandau/Mitte).
    - Updated `src/utils/getAuthority.ts` to filter authorities based on `type` ('wohngeld' | 'jobcenter').
    - Updated `src/components/MapView.tsx` to:
        - Listen to `benefit-calculation-completed` event.
        - Switch map filters automatically based on result (Bürgergeld -> Jobcenter, Wohngeld -> Wohngeldstelle).
        - Apply "Apple-like" glassmorphism styles.
        - Moved from Home View to **Results View** (before Recommendations).

2.  **Calculation Logic Updates**
    - Updated `src/logic/calculator-2026.js` to:
        - Return integer amounts (removed cents).
        - Implement strict priority: Wohngeld is only chosen if `Income + Wohngeld >= Needs`. Otherwise, **Bürgergeld** is returned.
        - Implicitly handles "Arbeitssuchend" (low income) by prioritizing Bürgergeld if needs aren't met.
    - Updated `src/pages/index.astro` script to format displayed result numbers as Integers (`Math.round`).

3.  **Refactoring**
    - Refactored `src/pages/index.astro` to use `Nav.astro` and `Footer.astro` components instead of inline HTML.
    - Updated `Nav.astro` and `Footer.astro` to support the SPA navigation (`window.showView`) instead of page reloads.
    
4.  **404 Error Fixes (Lexikon)**
    - Implemented robust `slugify` utility in `src/utils/slugify.ts` to handle German umlauts (e.g. "Vermögen" -> "vermoegen").
    - Updated `src/pages/lexikon/[...slug].astro` to use `slugify` for related terms links.
    - Created missing lexicon entries: `regelsatz.md` and `wohngeld-plus.md`.

## Verification Steps (Manual)

1.  **Open Application**: Run `npm run dev` and open in browser.
2.  **Test Case 1: Wohngeld**
    - Input: Berlin (13581), Income: 2000€, Rent: 600€, 1 Person.
    - Expected Result: "Wohngeld", Integer Amount (e.g. 150€).
    - Map: Should appear in Results view, showing "Amt für Soziales Spandau (Wohngeld)".
3.  **Test Case 2: Bürgergeld (Jobcenter)**
    - Input: Berlin (13581), Income: 0€, Rent: 500€, 1 Person.
    - Expected Result: "Bürgergeld", Integer Amount (e.g. 1063€).
    - Map: Should appear in Results view, switched to "Jobcenter" mode, showing "Jobcenter Berlin Spandau".
    - "Result Date" and "Mietstufe" should be displayed correctly.
4.  **Navigation**: Click "Über uns" or "Wohngeld" in Nav/Footer. It should swap views without reload.

## Code Quality
- **Typescript**: `getAuthority.ts` and `MapView.tsx` are strongly typed.
- **Components**: UI components extracted (`Nav`, `Footer`).
- **Styling**: Tailwind + Glassmorphism used consistently.
