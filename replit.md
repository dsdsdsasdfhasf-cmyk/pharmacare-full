# PharmaCare — نظام إدارة الصيدلية

نظام متكامل لإدارة الصيدلية يشمل POS ومخزون وتقارير ومستخدمين.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000 → mapped via proxy)
- `pnpm --filter @workspace/pharmacy run dev` — run the React frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + express-session
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React 19 + Vite + shadcn/ui + wouter + React Query

## Where things live

- `artifacts/pharmacy/src` — React frontend (pages, components, context)
- `artifacts/api-server/src` — Express API (routes, middleware)
- `lib/db/src/schema` — Drizzle schema (medicines, sales, purchases, users…)
- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth for CRUD hooks)
- `artifacts/api-server/src/routes/auth.ts` — login/logout/me (session-based)
- `artifacts/api-server/src/routes/reports.ts` — profit-loss, expiring, medicine-movement

## Architecture decisions

- Auth: express-session + Node built-in `crypto.scryptSync` (no bcryptjs). Password stored as `salt:hash`.
- New endpoints (auth, reports, refund) are NOT in the OpenAPI spec — they're called with direct fetch() in React Query.
- Reports and auth endpoints require `credentials: "include"` in all fetch calls.
- Session middleware must be BEFORE the route handlers in app.ts.
- Role-based UI: admin sees all pages; pharmacist sees POS + medicines + sales + prescriptions + customers only.

## Product

- **Login** — admin@pharmacare.app / PharmaCare2024!Demo · pharmacist@pharmacare.app / PharmaCare2024!Staff (override via ADMIN_EMAIL/ADMIN_PASSWORD/PHARMACIST_EMAIL/PHARMACIST_PASSWORD env vars)
- **Dashboard** — revenue stats, low-stock alerts, top medicines, recent sales
- **POS** — barcode scanner support, cart, receipt printing after checkout
- **Medicines** — full CRUD + category/supplier links + expiry tracking
- **Sales** — list with date filter, view detail, print receipt, refund (restores inventory)
- **Purchases** — purchase orders from suppliers
- **Prescriptions** — manage doctor prescriptions
- **Customers / Suppliers / Categories** — full CRUD
- **Reports** — profit/loss by period, profit by medicine, expiring medicines, medicine movement history
- **Notifications** — bell in header shows low-stock + expiring within 14 days

## User preferences

- Arabic UI throughout (RTL)
- Egyptian Pound (ج.م) as currency
- Preserve existing file structure and patterns

## Gotchas

- Always seed users after DB push: `psql $DATABASE_URL -f scripts/seed-users.sql`
- Session SECRET is in env: `SESSION_SECRET`
- `cors({ credentials: true, origin: true })` is required for session cookies to work from browser
- Do NOT add leaf workspace packages to root tsconfig.json references

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
