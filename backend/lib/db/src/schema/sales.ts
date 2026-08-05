import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { index } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customersTable } from "./customers";
import { medicinesTable } from "./medicines";
import { prescriptionsTable } from "./prescriptions";

export const salesTable = sqliteTable("sales", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  customerId: integer("customer_id", { mode: "number" }).references(() => customersTable.id),
  prescriptionId: integer("prescription_id", { mode: "number" }).references(() => prescriptionsTable.id),
  totalAmount: real("total_amount").notNull(),
  discount: real("discount").notNull().default(0),
  paymentMethod: text("payment_method").notNull().default("cash"),
  status: text("status").notNull().default("completed"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  idxSalesCustomerId: index("idx_sales_customer_id").on(table.customerId),
  idxSalesPrescriptionId: index("idx_sales_prescription_id").on(table.prescriptionId),
  idxSalesStatus: index("idx_sales_status").on(table.status),
  idxSalesCreatedAt: index("idx_sales_created_at").on(table.createdAt),
}));

export const saleItemsTable = sqliteTable("sale_items", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  saleId: integer("sale_id", { mode: "number" }).notNull().references(() => salesTable.id),
  medicineId: integer("medicine_id", { mode: "number" }).notNull().references(() => medicinesTable.id),
  quantity: integer("quantity", { mode: "number" }).notNull(),
  unitPrice: real("unit_price").notNull(),
  totalPrice: real("total_price").notNull(),
}, (table) => ({
  idxSaleItemsSaleId: index("idx_sale_items_sale_id").on(table.saleId),
  idxSaleItemsMedicineId: index("idx_sale_items_medicine_id").on(table.medicineId),
}));

export const insertSaleSchema = createInsertSchema(salesTable).omit({ id: true, createdAt: true });
export const insertSaleItemSchema = createInsertSchema(saleItemsTable).omit({ id: true });
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type InsertSaleItem = z.infer<typeof insertSaleItemSchema>;
export type Sale = typeof salesTable.$inferSelect;
export type SaleItem = typeof saleItemsTable.$inferSelect;
