import { Router } from "express";
import { db } from "@workspace/db";
import { saleItemsTable, salesTable, medicinesTable } from "@workspace/db";
import { eq, sql, and, lte, gte } from "drizzle-orm";

const router = Router();

// GET /reports/profit-loss — إجمالي الإيرادات والتكلفة والأرباح
router.get("/reports/profit-loss", async (req, res) => {
  const { period } = req.query as { period?: string };

  const now = new Date();
  let since: Date | null = null;

  if (period === "today") {
    since = new Date(now); since.setHours(0, 0, 0, 0);
  } else if (period === "week") {
    since = new Date(now); since.setDate(now.getDate() - 7);
  } else if (period === "month") {
    since = new Date(now); since.setDate(1); since.setHours(0, 0, 0, 0);
  }

  const conditions = [eq(salesTable.status, "completed")];
  if (since) conditions.push(gte(salesTable.createdAt, since));

  const rows = await db
    .select({
      totalRevenue: sql<number>`coalesce(sum(${saleItemsTable.totalPrice}), 0)`,
      totalCost: sql<number>`coalesce(sum(${medicinesTable.purchasePrice} * ${saleItemsTable.quantity}), 0)`,
      totalSales: sql<number>`count(distinct ${salesTable.id})`,
      totalItems: sql<number>`sum(${saleItemsTable.quantity})`,
    })
    .from(saleItemsTable)
    .leftJoin(salesTable, eq(saleItemsTable.saleId, salesTable.id))
    .leftJoin(medicinesTable, eq(saleItemsTable.medicineId, medicinesTable.id))
    .where(and(...conditions));

  const [row] = rows;
  const revenue = Number(row?.totalRevenue ?? 0);
  const cost = Number(row?.totalCost ?? 0);

  res.json({
    totalRevenue: revenue,
    totalCost: cost,
    profit: revenue - cost,
    profitMargin: revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0,
    totalSales: Number(row?.totalSales ?? 0),
    totalItems: Number(row?.totalItems ?? 0),
  });
});

// GET /reports/profit-by-medicine — أرباح حسب كل دواء
router.get("/reports/profit-by-medicine", async (_req, res) => {
  const rows = await db
    .select({
      medicineId: saleItemsTable.medicineId,
      medicineName: medicinesTable.name,
      genericName: medicinesTable.genericName,
      totalQuantitySold: sql<number>`sum(${saleItemsTable.quantity})`,
      totalRevenue: sql<number>`sum(${saleItemsTable.totalPrice})`,
      totalCost: sql<number>`sum(${medicinesTable.purchasePrice} * ${saleItemsTable.quantity})`,
    })
    .from(saleItemsTable)
    .leftJoin(salesTable, eq(saleItemsTable.saleId, salesTable.id))
    .leftJoin(medicinesTable, eq(saleItemsTable.medicineId, medicinesTable.id))
    .where(eq(salesTable.status, "completed"))
    .groupBy(saleItemsTable.medicineId, medicinesTable.name, medicinesTable.genericName, medicinesTable.purchasePrice)
    .orderBy(sql`sum(${saleItemsTable.totalPrice}) DESC`)
    .limit(20);

  res.json(rows.map(r => ({
    medicineId: r.medicineId,
    medicineName: r.medicineName ?? "",
    genericName: r.genericName ?? "",
    totalQuantitySold: Number(r.totalQuantitySold ?? 0),
    totalRevenue: Number(r.totalRevenue ?? 0),
    totalCost: Number(r.totalCost ?? 0),
    profit: Number(r.totalRevenue ?? 0) - Number(r.totalCost ?? 0),
  })));
});

// GET /reports/expiring — الأدوية التي ستنتهي صلاحيتها
router.get("/reports/expiring", async (req, res) => {
  const { days = "90" } = req.query as { days?: string };
  const numDays = parseInt(days) || 90;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + numDays);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  const todayStr = new Date().toISOString().split("T")[0];

  const rows = await db
    .select()
    .from(medicinesTable)
    .where(
      and(
        sql`${medicinesTable.expiryDate} IS NOT NULL`,
        lte(medicinesTable.expiryDate, cutoffStr),
        gte(medicinesTable.expiryDate, todayStr),
      )
    )
    .orderBy(medicinesTable.expiryDate);

  res.json(rows.map(m => ({
    id: m.id,
    name: m.name,
    genericName: m.genericName,
    quantity: m.quantity,
    expiryDate: m.expiryDate,
    sellingPrice: Number(m.sellingPrice),
    purchasePrice: Number(m.purchasePrice),
    potentialLoss: Number(m.purchasePrice) * m.quantity,
  })));
});

// GET /reports/medicine-movement/:id — حركة دواء معين
router.get("/reports/medicine-movement/:id", async (req, res) => {
  const medicineId = parseInt(req.params.id);
  if (isNaN(medicineId)) return res.status(400).json({ error: "invalid id" });

  const [medicine] = await db.select().from(medicinesTable).where(eq(medicinesTable.id, medicineId));
  if (!medicine) return res.status(404).json({ error: "دواء غير موجود" });

  const sales = await db
    .select({
      saleId: saleItemsTable.saleId,
      quantity: saleItemsTable.quantity,
      unitPrice: saleItemsTable.unitPrice,
      totalPrice: saleItemsTable.totalPrice,
      createdAt: salesTable.createdAt,
      status: salesTable.status,
    })
    .from(saleItemsTable)
    .leftJoin(salesTable, eq(saleItemsTable.saleId, salesTable.id))
    .where(eq(saleItemsTable.medicineId, medicineId))
    .orderBy(sql`${salesTable.createdAt} DESC`)
    .limit(50);

  return res.json({
    medicine: {
      id: medicine.id,
      name: medicine.name,
      genericName: medicine.genericName,
      quantity: medicine.quantity,
      sellingPrice: Number(medicine.sellingPrice),
      purchasePrice: Number(medicine.purchasePrice),
    },
    sales: sales.map(s => ({
      saleId: s.saleId,
      quantity: s.quantity,
      unitPrice: Number(s.unitPrice),
      totalPrice: Number(s.totalPrice),
      createdAt: s.createdAt?.toISOString() ?? "",
      status: s.status ?? "completed",
    })),
    totalSold: sales.reduce((sum, s) => sum + s.quantity, 0),
    totalRevenue: sales.reduce((sum, s) => sum + Number(s.totalPrice), 0),
  });
});

export default router;
