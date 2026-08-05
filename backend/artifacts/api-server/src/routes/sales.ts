import { Router } from "express";
import { db, client } from "@workspace/db";
import { salesTable, saleItemsTable, customersTable, medicinesTable } from "@workspace/db";
import { eq, gte, lte, and, sql } from "drizzle-orm";
import {
  CreateSaleBody,
  GetSaleParams,
  ListSalesQueryParams,
} from "@workspace/api-zod";

const router = Router();

async function buildSaleResponse(sale: typeof salesTable.$inferSelect) {
  const items = await db.select({
    item: saleItemsTable,
    medicineName: medicinesTable.name,
  })
    .from(saleItemsTable)
    .leftJoin(medicinesTable, eq(saleItemsTable.medicineId, medicinesTable.id))
    .where(eq(saleItemsTable.saleId, sale.id));

  let customerName: string | null = null;
  if (sale.customerId) {
    const [c] = await db.select({ name: customersTable.name }).from(customersTable).where(eq(customersTable.id, sale.customerId));
    customerName = c?.name ?? null;
  }

  return {
    id: sale.id,
    customerId: sale.customerId ?? null,
    customerName,
    prescriptionId: sale.prescriptionId ?? null,
    totalAmount: Number(sale.totalAmount),
    discount: Number(sale.discount),
    paymentMethod: sale.paymentMethod,
    status: sale.status,
    notes: sale.notes ?? null,
    items: items.map(i => ({
      id: i.item.id,
      medicineId: i.item.medicineId,
      medicineName: i.medicineName ?? "",
      quantity: i.item.quantity,
      unitPrice: Number(i.item.unitPrice),
      totalPrice: Number(i.item.totalPrice),
    })),
    createdAt: sale.createdAt.toISOString(),
  };
}

router.get("/sales", async (req, res) => {
  const query = ListSalesQueryParams.parse(req.query);
  const conditions = [];
  if (query.startDate) conditions.push(gte(salesTable.createdAt, new Date(query.startDate)));
  if (query.endDate) conditions.push(lte(salesTable.createdAt, new Date(query.endDate)));
  const sales = conditions.length > 0
    ? await db.select().from(salesTable).where(and(...conditions)).orderBy(sql`${salesTable.createdAt} DESC`)
    : await db.select().from(salesTable).orderBy(sql`${salesTable.createdAt} DESC`);
  const mapped = await Promise.all(sales.map(buildSaleResponse));
  res.json(mapped);
});

router.post("/sales", async (req, res) => {
  const body = CreateSaleBody.parse(req.body);
  let total = 0;
  const itemsToInsert: Array<{ medicineId: number; quantity: number; unitPrice: number; totalPrice: number }> = [];
  for (const item of body.items) {
    const itemTotal = item.unitPrice * item.quantity;
    total += itemTotal;
    itemsToInsert.push({ medicineId: item.medicineId, quantity: item.quantity, unitPrice: item.unitPrice, totalPrice: itemTotal });
  }
  const finalTotal = total - (body.discount ?? 0);
  const [sale] = await db.insert(salesTable).values({
    customerId: body.customerId,
    prescriptionId: body.prescriptionId,
    totalAmount: finalTotal,
    discount: body.discount ?? 0,
    paymentMethod: body.paymentMethod,
    status: "completed",
    notes: body.notes,
  }).returning();

  await db.insert(saleItemsTable).values(itemsToInsert.map(i => ({
    saleId: sale.id,
    medicineId: i.medicineId,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    totalPrice: i.totalPrice,
  })));

  for (const item of itemsToInsert) {
    await client.run(sql`UPDATE medicines SET quantity = quantity - ${item.quantity} WHERE id = ${item.medicineId}`);
  }

  res.status(201).json(await buildSaleResponse(sale));
});

router.get("/sales/:id", async (req, res) => {
  const { id } = GetSaleParams.parse({ id: Number(req.params.id) });
  const [sale] = await db.select().from(salesTable).where(eq(salesTable.id, id));
  if (!sale) return res.status(404).json({ error: "Sale not found" });
  return res.json(await buildSaleResponse(sale));
});

// PATCH /sales/:id/status — تغيير حالة البيعة
router.patch("/sales/:id/status", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "invalid id" });

  const { status } = req.body as { status?: string };
  const allowed = ["completed", "pending", "refunded"];
  if (!status || !allowed.includes(status)) {
    return res.status(400).json({ error: "الحالة غير صالحة. الحالات المسموح بها: " + allowed.join(", ") });
  }

  const [sale] = await db.select().from(salesTable).where(eq(salesTable.id, id));
  if (!sale) return res.status(404).json({ error: "البيعة غير موجودة" });

  // إذا كانت الحالة الجديدة "مسترجع" نُعيد المخزون
  if (status === "refunded" && sale.status !== "refunded") {
    const items = await db.select().from(saleItemsTable).where(eq(saleItemsTable.saleId, id));
    for (const item of items) {
      await client.run(sql`UPDATE medicines SET quantity = quantity + ${item.quantity} WHERE id = ${item.medicineId}`);
    }
  }
  // إذا كانت الحالة السابقة "مسترجع" والجديدة "مكتمل" نخصم من المخزون
  if (sale.status === "refunded" && status === "completed") {
    const items = await db.select().from(saleItemsTable).where(eq(saleItemsTable.saleId, id));
    for (const item of items) {
      await client.run(sql`UPDATE medicines SET quantity = quantity - ${item.quantity} WHERE id = ${item.medicineId}`);
    }
  }

  const [updated] = await db.update(salesTable)
    .set({ status })
    .where(eq(salesTable.id, id))
    .returning();

  return res.json(await buildSaleResponse(updated));
});

// POST /sales/:id/refund — استرجاع بيعة وإعادة المخزون
router.post("/sales/:id/refund", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "invalid id" });

  const [sale] = await db.select().from(salesTable).where(eq(salesTable.id, id));
  if (!sale) return res.status(404).json({ error: "البيعة غير موجودة" });
  if (sale.status === "refunded") return res.status(400).json({ error: "تم استرجاع هذه البيعة مسبقاً" });

  const items = await db.select().from(saleItemsTable).where(eq(saleItemsTable.saleId, id));

  // Restore inventory
  for (const item of items) {
    await client.run(sql`UPDATE medicines SET quantity = quantity + ${item.quantity} WHERE id = ${item.medicineId}`);
  }

  const [updated] = await db.update(salesTable)
    .set({ status: "refunded" })
    .where(eq(salesTable.id, id))
    .returning();

  return res.json(await buildSaleResponse(updated));
});

export default router;
