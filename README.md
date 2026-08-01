# Sozialer Navigator

A German social-benefits guidance site: an interactive calculator for Wohngeld and Bürgergeld 2026, a Jobcenter/Wohngeldbehörde authority search, and an application (Antrag) flow that lets users submit their forms for free or via a paid, assisted PDF package.

## Tech Stack

- **[Astro 5](https://astro.build)** — hybrid rendering (static content + server endpoints), deployed on Vercel (`@astrojs/vercel`)
- **React** — interactive islands (calculator, authority search, chat widget, PDF tools)
- **Tailwind CSS v4** — styling, configured in `tailwind.config.mjs`
- **Supabase** — data/auth backend
- **Stripe** — paid PDF package checkout
- **Resend** — transactional email
- **pdf-lib / html2pdf.js** — PDF generation and filling
- A separate **Python backend** (`backend/`) with its own PDF-generation/rules engine

## Project Structure

```text
/
├── src/
│   ├── pages/            # Astro routes (index, lexikon, ratgeber, kindergeld, admin, ...)
│   │   └── api/           # Server endpoints: leads, checkout, chat, send-application,
│   │                       #   webhooks/, cron/
│   ├── components/        # Astro + React components (calculator, authority search,
│   │                       #   PDF template, results, nav, footer, ...)
│   ├── logic/              # Benefit calculation logic (calculator-2026.js, benefit-engine.js, ...)
│   ├── data/               # Static datasets: authorities, cities, benefits, FAQs, Wohngeld data
│   ├── layouts/, styles/, lib/, utils/, content/
├── backend/                # Python service: PDF generation & rules engine (main.py, engine.py)
├── public/                 # Static assets (images, downloadable forms, icons)
├── supabase/               # Supabase config/migrations
└── package.json
```

## Commands

All commands are run from the root of the project:

| Command           | Action                                       |
| :----------------- | :-------------------------------------------- |
| `npm install`       | Installs dependencies                         |
| `npm run dev`       | Starts local dev server at `localhost:4321`    |
| `npm run build`     | Builds the production site to `./dist/`        |
| `npm run preview`   | Previews the build locally, before deploying   |
| `npm run astro ...` | Runs Astro CLI commands (e.g. `astro check`)   |

The `backend/` Python service has its own dependencies — see `backend/requirements.txt`.

## Learn More

For project context beyond this README — purpose, roadmap, design philosophy, and calculation/data rules — see [`brain.md`](./brain.md), the project's living documentation. For Astro-specific questions, see the [Astro docs](https://docs.astro.build).
