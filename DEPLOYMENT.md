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

## Vercel deployment

A root `vercel.json` is configured to:

1. Install deps with pnpm.
2. Build the API serverless bundle (`artifacts/api-server/dist/serverless.mjs`).
3. Build the frontend (`artifacts/pharmacy/dist/public`).
4. Serve the SPA and route `/api/*` to the serverless function in `api/index.mjs`.

Set these in the Vercel project (or via `vercel env`):

- `SESSION_SECRET` (required, any random string)
- `ADMIN_EMAIL` / `ADMIN_PASSWORD`
- `PHARMACIST_EMAIL` / `PHARMACIST_PASSWORD`
- `SEED_SAMPLE_DATA=true` (default)
- `VERCEL=1` (set automatically by Vercel)

### Important: database persistence

This app uses **SQLite via `better-sqlite3`**. On Vercel:

- The filesystem is **ephemeral** — the database lives in `/tmp/pharmacy.db` and is wiped on cold starts / redeploys.
- The app **self-seeds** tables + demo users + sample data on boot, so the UI is always populated, but **writes are not persisted** across invocations.
- For a real persistent deployment, migrate to **PostgreSQL** (e.g. Neon) and point `DATABASE_URL` at it.

### Demo mode (frontend only)

The frontend includes an optional offline demo interceptor, disabled by default. Enable it with `VITE_DEMO_MODE=true` if you want the UI usable without a backend.

## Resetting local data

```pwsh
Remove-Item D:\pharmacare-full\pharmacy.db, D:\pharmacare-full\pharmacy.db-shm, D:\pharmacare-full\pharmacy.db-wal
$env:DATABASE_URL='D:\pharmacare-full\pharmacy.db'
node D:\pharmacare-full\lib\db\init_db_and_seed.js
node D:\pharmacare-full\lib\db\seed_sample_data.js
```
