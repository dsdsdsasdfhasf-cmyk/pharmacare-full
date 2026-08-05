import { Router } from "express";
import { db, client } from "@workspace/db";
import { purchasesTable, purchaseItemsTable, suppliersTable, medicinesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  CreatePurchaseBody,
  GetPurchaseParams,
} from "@workspace/api-zod";

const router = Router();

async function buildPurchaseResponse(purchase: typeof purchasesTable.$inferSelect) {
  const items = await db.select({
    item: purchaseItemsTable,
    medicineName: medicinesTable.name,
  })
    .from(purchaseItemsTable)
    .leftJoin(medicinesTable, eq(purchaseItemsTable.medicineId, medicinesTable.id))
    .where(eq(purchaseItemsTable.purchaseId, purchase.id));

  const [supplier] = await db.select({ name: suppliersTable.name }).from(suppliersTable).where(eq(suppliersTable.id, purchase.supplierId));

  return {
    id: purchase.id,
    supplierId: purchase.supplierId,
    supplierName: supplier?.name ?? "",
    invoiceNumber: purchase.invoiceNumber ?? null,
    totalAmount: Number(purchase.totalAmount),
    status: purchase.status,
    notes: purchase.notes ?? null,
    items: items.map(i => ({
      id: i.item.id,
      medicineId: i.item.medicineId,
      medicineName: i.medicineName ?? "",
      quantity: i.item.quantity,
      unitPrice: Number(i.item.unitPrice),
      totalPrice: Number(i.item.totalPrice),
      expiryDate: i.item.expiryDate ?? null,
    })),
    createdAt: purchase.createdAt.toISOString(),
  };
}

router.get("/purchases", async (_req, res) => {
  const purchases = await db.select().from(purchasesTable).orderBy(sql`${purchasesTable.createdAt} DESC`);
  const mapped = await Promise.all(purchases.map(buildPurchaseResponse));
  res.json(mapped);
});

router.post("/purchases", async (req, res) => {
  const body = CreatePurchaseBody.parse(req.body);
  let total = 0;
  for (const item of body.items) {
    total += item.unitPrice * item.quantity;
  }
  const [purchase] = await db.insert(purchasesTable).values({
    supplierId: body.supplierId,
    invoiceNumber: body.invoiceNumber,
    totalAmount: total,
    status: "received",
    notes: body.notes,
  }).returning();

  for (const item of body.items) {
    const totalPrice = item.unitPrice * item.quantity;
    await db.insert(purchaseItemsTable).values({
      purchaseId: purchase.id,
      medicineId: item.medicineId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: totalPrice,
      expiryDate: item.expiryDate,
    });
    await client.run(
      sql`UPDATE medicines SET quantity = quantity + ${item.quantity} WHERE id = ${item.medicineId}`
    );
  }

  res.status(201).json(await buildPurchaseResponse(purchase));
});

router.get("/purchases/:id", async (req, res) => {
  const { id } = GetPurchaseParams.parse({ id: Number(req.params.id) });
  const [purchase] = await db.select().from(purchasesTable).where(eq(purchasesTable.id, id));
  if (!purchase) return res.status(404).json({ error: "Purchase not found" });
  return res.json(await buildPurchaseResponse(purchase));
});

// PATCH /purchases/:id/status — تغيير حالة أمر الشراء
router.patch("/purchases/:id/status", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "invalid id" });

  const { status } = req.body as { status?: string };
  const allowed = ["received", "pending", "cancelled"];
  if (!status || !allowed.includes(status)) {
    return res.status(400).json({ error: "الحالة غير صالحة. الحالات المسموح بها: " + allowed.join(", ") });
  }

  const [purchase] = await db.select().from(purchasesTable).where(eq(purchasesTable.id, id));
  if (!purchase) return res.status(404).json({ error: "أمر الشراء غير موجود" });

  const [updated] = await db.update(purchasesTable)
    .set({ status })
    .where(eq(purchasesTable.id, id))
    .returning();

  return res.json(await buildPurchaseResponse(updated));
});

export default router;
