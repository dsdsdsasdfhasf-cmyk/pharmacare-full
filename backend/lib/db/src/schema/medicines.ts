import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { index } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { categoriesTable } from "./categories";
import { suppliersTable } from "./suppliers";

export const medicinesTable = sqliteTable("medicines", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  genericName: text("generic_name").notNull(),
  barcode: text("barcode"),
  categoryId: integer("category_id", { mode: "number" }).references(() => categoriesTable.id),
  supplierId: integer("supplier_id", { mode: "number" }).references(() => suppliersTable.id),
  quantity: integer("quantity", { mode: "number" }).notNull().default(0),
  minQuantity: integer("min_quantity", { mode: "number" }).notNull().default(10),
  purchasePrice: real("purchase_price").notNull(),
  sellingPrice: real("selling_price").notNull(),
  expiryDate: text("expiry_date"),
  location: text("location"),
  description: text("description"),
  requiresPrescription: integer("requires_prescription", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  idxMedicinesCategoryId: index("idx_medicines_category_id").on(table.categoryId),
  idxMedicinesSupplierId: index("idx_medicines_supplier_id").on(table.supplierId),
  idxMedicinesExpiryDate: index("idx_medicines_expiry_date").on(table.expiryDate),
  idxMedicinesCreatedAt: index("idx_medicines_created_at").on(table.createdAt),
}));

export const insertMedicineSchema = createInsertSchema(medicinesTable).omit({ id: true, createdAt: true });
export type InsertMedicine = z.infer<typeof insertMedicineSchema>;
export type Medicine = typeof medicinesTable.$inferSelect;
