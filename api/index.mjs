// Vercel serverless function entry point.
// Imports the bundled Express app produced by artifacts/api-server/build.mjs.
//
// IMPORTANT: This project uses SQLite (better-sqlite3). On Vercel, the filesystem
// is ephemeral and serverless functions are stateless — the database resets on every
// cold start. The app seeds itself on boot (see lib/db/src/index.ts), so demo data
// reappears, but writes are NOT persisted across function invocations.
// For a persistent deployment, migrate to Postgres (e.g. Neon) and set DATABASE_URL.
//
// The bundled serverless entry already opens the DB from DATABASE_URL (or /tmp/pharmacy.db
// when VERCEL=1), creates tables, and seeds users + sample data on first import.

const { createRequire } = await import("node:module");
const require = createRequire(import.meta.url);

// better-sqlite3 is a native module; ensure it resolves from the workspace install.
const serverless = await import(
  new URL("../artifacts/api-server/dist/serverless.mjs", import.meta.url).href
);

const handler = serverless.default;

export default async function (req, res) {
  // Ensure a writable DB path on Vercel.
  if (process.env.VERCEL && !process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "/tmp/pharmacy.db";
  }
  return handler(req, res);
}
