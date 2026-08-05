import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { index } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { suppliersTable } from "./suppliers";
import { medicinesTable } from "./medicines";

export const purchasesTable = sqliteTable("purchases", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  supplierId: integer("supplier_id", { mode: "number" }).notNull().references(() => suppliersTable.id),
  invoiceNumber: text("invoice_number"),
  totalAmount: real("total_amount").notNull(),
  status: text("status").notNull().default("received"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  idxPurchasesSupplierId: index("idx_purchases_supplier_id").on(table.supplierId),
  idxPurchasesCreatedAt: index("idx_purchases_created_at").on(table.createdAt),
}));

export const purchaseItemsTable = sqliteTable("purchase_items", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  purchaseId: integer("purchase_id", { mode: "number" }).notNull().references(() => purchasesTable.id),
  medicineId: integer("medicine_id", { mode: "number" }).notNull().references(() => medicinesTable.id),
  quantity: integer("quantity", { mode: "number" }).notNull(),
  unitPrice: real("unit_price").notNull(),
  totalPrice: real("total_price").notNull(),
  expiryDate: text("expiry_date"),
}, (table) => ({
  idxPurchaseItemsPurchaseId: index("idx_purchase_items_purchase_id").on(table.purchaseId),
  idxPurchaseItemsMedicineId: index("idx_purchase_items_medicine_id").on(table.medicineId),
}));

export const insertPurchaseSchema = createInsertSchema(purchasesTable).omit({ id: true, createdAt: true });
export const insertPurchaseItemSchema = createInsertSchema(purchaseItemsTable).omit({ id: true });
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type InsertPurchaseItem = z.infer<typeof insertPurchaseItemSchema>;
export type Purchase = typeof purchasesTable.$inferSelect;
export type PurchaseItem = typeof purchaseItemsTable.$inferSelect;
