import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { index } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customersTable } from "./customers";

export const prescriptionsTable = sqliteTable("prescriptions", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  customerId: integer("customer_id", { mode: "number" }).references(() => customersTable.id),
  doctorName: text("doctor_name").notNull(),
  doctorSpecialty: text("doctor_specialty"),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  idxPrescriptionsCustomerId: index("idx_prescriptions_customer_id").on(table.customerId),
  idxPrescriptionsStatus: index("idx_prescriptions_status").on(table.status),
  idxPrescriptionsCreatedAt: index("idx_prescriptions_created_at").on(table.createdAt),
}));

export const insertPrescriptionSchema = createInsertSchema(prescriptionsTable).omit({ id: true, createdAt: true });
export type InsertPrescription = z.infer<typeof insertPrescriptionSchema>;
export type Prescription = typeof prescriptionsTable.$inferSelect;
