# Pharmacare Full

Pharmacare Full is a pnpm workspace for a pharmacy management system with an Express API, a Vite React frontend, shared API clients, validation schemas, and database utilities.

## Requirements

- Node.js 20 or newer
- pnpm
- Windows users can use `run.bat`

## Setup

```powershell
pnpm install
copy .env.example .env
```

Update `.env` before using real services. Development defaults are enough to run the local app.

## Run

```powershell
run.bat
```

The script starts:

- API: `http://localhost:4000`
- Web: `http://localhost:5173`

Useful script modes:

```powershell
run.bat --check
run.bat --test
run.bat --build
run.bat --help
```

## Manual Commands

```powershell
pnpm run typecheck
pnpm test
pnpm run build
```

## Environment

Important variables:

- `DATABASE_URL`: local database path or production database URL.
- `JWT_SECRET`: must be replaced in production.
- `CORS_ORIGIN`: comma-separated allowed frontend origins.
- `VITE_API_BASE_URL`: frontend API base URL.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`: required for real payments.
- `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`: required for real emails.

## Project Structure

```
├── artifacts/pharmacy/     # Vite React frontend (pharmacy dashboard)
├── artifacts/api-server/   # Express API server
├── artifacts/mockup-sandbox/ # Mockup / sandbox environment
├── api/                    # API route definitions
├── backend/                # Backend tooling
├── frontend/               # Frontend static assets
├── lib/db/                 # Database utilities (Drizzle ORM)
├── scripts/                # Build and seed scripts
├── package.json            # Root workspace config
├── pnpm-workspace.yaml     # pnpm workspace definition
├── DEPLOYMENT.md           # Deployment notes
├── README.md
└── run.bat                 # Windows startup script
```

## Production Notes

- Use a strong `JWT_SECRET`.
- Restrict `CORS_ORIGIN` to production domains.
- Configure Stripe webhooks at `/api/payment/webhook`.
- Run `pnpm run typecheck`, `pnpm test`, and `pnpm run build` before deployment.
- Keep `.env` files out of git.

## Deployment

### Frontend (Vite React)

The frontend lives in `artifacts/pharmacy/`.

- Build: `cd artifacts/pharmacy && pnpm run build`
- Output goes to `dist/public/`.
- Deploy `dist/public/` to any static host (Vercel, Netlify, S3, Cloudflare Pages, …).
- Set `BASE_PATH` env var if deploying to a subpath.

### Backend (Express API)

The API lives in `artifacts/api-server/`.

- Build: `cd artifacts/api-server && pnpm run build`
- The server exposes the API on the configured port.
- Deploy to a Node host (Railway, Render, Fly.io, a VPS, …).

### Environment

Set these in your production environment:

- `DATABASE_URL` — production database URL.
- `JWT_SECRET` — strong secret key.
- `CORS_ORIGIN` — production frontend URL(s).
- `VITE_API_BASE_URL` — frontend must point to the deployed API.
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` — for payments.
- `SENDGRID_API_KEY` / `SENDGRID_FROM_EMAIL` — for emails.

### Local Preview

```powershell
pnpm run build
cd artifacts/pharmacy && pnpm run serve
```

This serves the built frontend on `http://localhost:5173`.
