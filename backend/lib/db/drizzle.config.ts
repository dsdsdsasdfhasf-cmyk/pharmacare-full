import { defineConfig } from "drizzle-kit";
import path from "path";

const dbPath = process.env.DATABASE_URL || path.resolve(import.meta.dirname, "../../pharmacy.db");

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  out: path.join(__dirname, "./migrations"),
  dialect: "sqlite",
  dbCredentials: {
    url: dbPath,
  },
  sql: {
    generate: true,
    push: true,
  },
});
