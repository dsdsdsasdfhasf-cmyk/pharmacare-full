import { Router } from "express";
import { db } from "@workspace/db";
import {
  medicinesTable, salesTable, saleItemsTable,
  purchasesTable, purchaseItemsTable, customersTable,
  suppliersTable, categoriesTable, prescriptionsTable, usersTable,
} from "@workspace/db";

const router = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!req.session?.userId) return res.status(401).json({ error: "غير مسجل الدخول" });
  if (req.session?.role !== "admin") return res.status(403).json({ error: "غير مصرح" });
  next();
}

router.get("/backup", requireAdmin, async (_req, res) => {
  const [
    medicines, sales, saleItems, purchases, purchaseItems,
    customers, suppliers, categories, prescriptions, users,
  ] = await Promise.all([
    db.select().from(medicinesTable),
    db.select().from(salesTable),
    db.select().from(saleItemsTable),
    db.select().from(purchasesTable),
    db.select().from(purchaseItemsTable),
    db.select().from(customersTable),
    db.select().from(suppliersTable),
    db.select().from(categoriesTable),
    db.select().from(prescriptionsTable),
    db.select({
      id: usersTable.id,
      username: usersTable.username,
      name: usersTable.name,
      role: usersTable.role,
      createdAt: usersTable.createdAt,
    }).from(usersTable),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    version: "1.0",
    tables: {
      medicines: medicines.map(m => ({ ...m, sellingPrice: Number(m.sellingPrice), purchasePrice: Number(m.purchasePrice) })),
      sales: sales.map(s => ({ ...s, totalAmount: Number(s.totalAmount), discount: Number(s.discount ?? 0) })),
      saleItems: saleItems.map(i => ({ ...i, unitPrice: Number(i.unitPrice), totalPrice: Number(i.totalPrice) })),
      purchases: purchases.map(p => ({ ...p, totalAmount: Number(p.totalAmount) })),
      purchaseItems: purchaseItems.map(i => ({ ...i, unitPrice: Number(i.unitPrice), totalPrice: Number(i.totalPrice) })),
      customers,
      suppliers,
      categories,
      prescriptions,
      users,
    },
  };

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="pharmacare-backup-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json(payload);
});

export default router;
