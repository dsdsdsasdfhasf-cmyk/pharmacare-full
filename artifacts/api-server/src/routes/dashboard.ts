import { Router } from "express";
import { db } from "@workspace/db";
import { salesTable, saleItemsTable, medicinesTable, customersTable } from "@workspace/db";
import { eq, gte, sql, lte, and } from "drizzle-orm";

const router = Router();

router.get("/dashboard/summary", async (_req, res) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const cutoff = thirtyDaysFromNow.toISOString().split("T")[0];

  const [todaySalesData] = await db
    .select({ count: sql<number>`count(*)::int`, revenue: sql<number>`coalesce(sum(total_amount), 0)` })
    .from(salesTable)
    .where(and(gte(salesTable.createdAt, todayStart), eq(salesTable.status, "completed")));

  const [monthData] = await db
    .select({ revenue: sql<number>`coalesce(sum(total_amount), 0)` })
    .from(salesTable)
    .where(and(gte(salesTable.createdAt, monthStart), eq(salesTable.status, "completed")));

  const [totalMedicines] = await db.select({ count: sql<number>`count(*)::int` }).from(medicinesTable);
  const [lowStock] = await db.select({ count: sql<number>`count(*)::int` }).from(medicinesTable).where(sql`quantity <= min_quantity`);
  const [expiringSoon] = await db.select({ count: sql<number>`count(*)::int` }).from(medicinesTable).where(
    and(
      sql`expiry_date is not null`,
      lte(medicinesTable.expiryDate, cutoff),
      gte(medicinesTable.expiryDate, new Date().toISOString().split("T")[0])
    )
  );
  const [totalCustomers] = await db.select({ count: sql<number>`count(*)::int` }).from(customersTable);

  res.json({
    todaySales: Number(todaySalesData?.count ?? 0),
    todayRevenue: Number(todaySalesData?.revenue ?? 0),
    totalMedicines: Number(totalMedicines?.count ?? 0),
    lowStockCount: Number(lowStock?.count ?? 0),
    expiringSoonCount: Number(expiringSoon?.count ?? 0),
    totalCustomers: Number(totalCustomers?.count ?? 0),
    monthRevenue: Number(monthData?.revenue ?? 0),
    totalSalesToday: Number(todaySalesData?.count ?? 0),
  });
});

router.get("/dashboard/sales-chart", async (_req, res) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const rows = await db
    .select({
      date: sql<string>`date(created_at)::text`,
      revenue: sql<number>`coalesce(sum(total_amount), 0)`,
      salesCount: sql<number>`count(*)::int`,
    })
    .from(salesTable)
    .where(gte(salesTable.createdAt, thirtyDaysAgo))
    .groupBy(sql`date(created_at)`)
    .orderBy(sql`date(created_at)`);

  res.json(rows.map(r => ({
    date: r.date,
    revenue: Number(r.revenue),
    salesCount: Number(r.salesCount),
  })));
});

router.get("/dashboard/top-medicines", async (_req, res) => {
  const rows = await db
    .select({
      medicineId: saleItemsTable.medicineId,
      medicineName: medicinesTable.name,
      totalQuantity: sql<number>`sum(${saleItemsTable.quantity})::int`,
      totalRevenue: sql<number>`sum(${saleItemsTable.totalPrice})`,
    })
    .from(saleItemsTable)
    .leftJoin(medicinesTable, eq(saleItemsTable.medicineId, medicinesTable.id))
    .groupBy(saleItemsTable.medicineId, medicinesTable.name)
    .orderBy(sql`sum(${saleItemsTable.totalPrice}) DESC`)
    .limit(10);

  res.json(rows.map(r => ({
    medicineId: r.medicineId,
    medicineName: r.medicineName ?? "",
    totalQuantity: Number(r.totalQuantity),
    totalRevenue: Number(r.totalRevenue),
  })));
});

router.get("/dashboard/recent-sales", async (_req, res) => {
  const sales = await db
    .select()
    .from(salesTable)
    .orderBy(sql`${salesTable.createdAt} DESC`)
    .limit(10);

  const mapped = await Promise.all(sales.map(async (sale) => {
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
      items: [],
      createdAt: sale.createdAt.toISOString(),
    };
  }));

  res.json(mapped);
});

router.get("/dashboard/low-stock", async (_req, res) => {
  const rows = await db
    .select()
    .from(medicinesTable)
    .where(sql`quantity <= min_quantity`)
    .orderBy(medicinesTable.quantity)
    .limit(20);

  res.json(rows.map(m => ({
    id: m.id,
    name: m.name,
    genericName: m.genericName,
    barcode: m.barcode ?? null,
    categoryId: m.categoryId ?? null,
    categoryName: null,
    supplierId: m.supplierId ?? null,
    supplierName: null,
    quantity: m.quantity,
    minQuantity: m.minQuantity,
    purchasePrice: Number(m.purchasePrice),
    sellingPrice: Number(m.sellingPrice),
    expiryDate: m.expiryDate ?? null,
    location: m.location ?? null,
    description: m.description ?? null,
    requiresPrescription: m.requiresPrescription,
    createdAt: m.createdAt.toISOString(),
  })));
});

export default router;
