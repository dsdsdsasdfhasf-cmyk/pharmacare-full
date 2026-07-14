# PharmaCare — Deployment Guide

## Local development

```pwsh
pnpm --dir D:\pharmacare-full install
node D:\pharmacare-full\run.js
```

- API: http://localhost:8080
- Frontend: http://localhost:5000

`run.js` seeds the database (users + sample data) automatically if `pharmacy.db` is missing.

## Credentials (demo)

Seeded on first boot. Override with environment variables before any real use.

| Role       | Email                      | Password              |
|------------|---------------------------|-----------------------|
| Admin      | admin@pharmacare.app      | PharmaCare2024!Demo   |
| Pharmacist | pharmacist@pharmacare.app | PharmaCare2024!Staff  |

The login page shows these and lets you click to auto-fill.

Env overrides: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `PHARMACIST_EMAIL`, `PHARMACIST_PASSWORD`, `SESSION_SECRET`.

## Vercel deployment (frontend-only demo)

`vercel.json` is configured to deploy the frontend as a static SPA with demo mode on — no backend required:

1. Install deps with pnpm.
2. Build the frontend only (`artifacts/pharmacy/dist/public`).
3. Serve the SPA (all routes rewrite to `index.html`) with the bundled demo data.

Required project environment variable (already set to `true` in `vercel.json`):

- `VITE_DEMO_MODE=true`

To deploy:

```pwsh
# install the CLI (one time)
npm i -g vercel
# login (opens browser), then:
vercel --prod
```

The demo interceptor handles all `/api/*` calls in the browser, so no serverless function is needed.

### Important: database persistence

This app uses **SQLite via `better-sqlite3`**. On Vercel:

- The filesystem is **ephemeral** — the database lives in `/tmp/pharmacy.db` and is wiped on cold starts / redeploys.
- The app **self-seeds** tables + demo users + sample data on boot, so the UI is always populated, but **writes are not persisted** across invocations.
- For a real persistent deployment, migrate to **PostgreSQL** (e.g. Neon) and point `DATABASE_URL` at it.

### Demo mode (frontend only) — recommended for Vercel

The frontend includes an offline demo interceptor that simulates the entire backend in the browser. It is **enabled by default** (`main.tsx` installs it unless `VITE_DEMO_MODE` is set to `"false"`). All sample data (medicines, categories, suppliers, customers, sales, purchases) is bundled in `artifacts/pharmacy/src/demo-api.ts`, so the app is fully usable with **no backend at all**.

Notes:
- Demo data is in-memory; edits reset on page reload.
- The demo login accepts the credentials below for any password and always logs in as admin.
- Credentials shown on the login page and auto-filled on click:
  - `admin@pharmacare.app` / `PharmaCare2024!Demo`
  - `pharmacist@pharmacare.app` / `PharmaCare2024!Staff`

## Resetting local data

```pwsh
Remove-Item D:\pharmacare-full\pharmacy.db, D:\pharmacare-full\pharmacy.db-shm, D:\pharmacare-full\pharmacy.db-wal
$env:DATABASE_URL='D:\pharmacare-full\pharmacy.db'
node D:\pharmacare-full\lib\db\init_db_and_seed.js
node D:\pharmacare-full\lib\db\seed_sample_data.js
```
