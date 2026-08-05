import { Router } from "express";
import { db } from "@workspace/db";
import { medicinesTable, categoriesTable, suppliersTable } from "@workspace/db";
import { eq, and, lte, sql } from "drizzle-orm";
import {
  CreateMedicineBody,
  UpdateMedicineParams,
  UpdateMedicineBody,
  DeleteMedicineParams,
  GetMedicineParams,
  ListMedicinesQueryParams,
} from "@workspace/api-zod";

const router = Router();

function mapMedicine(m: typeof medicinesTable.$inferSelect, categoryName?: string | null, supplierName?: string | null) {
  return {
    id: m.id,
    name: m.name,
    genericName: m.genericName,
    barcode: m.barcode ?? null,
    categoryId: m.categoryId ?? null,
    categoryName: categoryName ?? null,
    supplierId: m.supplierId ?? null,
    supplierName: supplierName ?? null,
    quantity: m.quantity,
    minQuantity: m.minQuantity,
    purchasePrice: Number(m.purchasePrice),
    sellingPrice: Number(m.sellingPrice),
    expiryDate: m.expiryDate ?? null,
    location: m.location ?? null,
    description: m.description ?? null,
    requiresPrescription: m.requiresPrescription,
    createdAt: m.createdAt.toISOString(),
  };
}

async function getMedicinesWithJoins(filters?: {
  categoryId?: number;
  lowStock?: boolean;
  expiringBefore?: string;
}) {
  const rows = await db
    .select({
      medicine: medicinesTable,
      categoryName: categoriesTable.name,
      supplierName: suppliersTable.name,
    })
    .from(medicinesTable)
    .leftJoin(categoriesTable, eq(medicinesTable.categoryId, categoriesTable.id))
    .leftJoin(suppliersTable, eq(medicinesTable.supplierId, suppliersTable.id));

  return rows
    .filter(r => {
      if (filters?.categoryId && r.medicine.categoryId !== filters.categoryId) return false;
      if (filters?.lowStock && r.medicine.quantity > r.medicine.minQuantity) return false;
      if (filters?.expiringBefore && r.medicine.expiryDate) {
        if (r.medicine.expiryDate > filters.expiringBefore) return false;
      }
      return true;
    })
    .map(r => mapMedicine(r.medicine, r.categoryName, r.supplierName));
}

router.get("/medicines", async (req, res) => {
  const query = ListMedicinesQueryParams.parse(req.query);
  let rows = await getMedicinesWithJoins({
    categoryId: query.categoryId,
    lowStock: query.lowStock,
  });
  if (query.search) {
    const search = query.search.toLowerCase();
    rows = rows.filter(m =>
      m.name.toLowerCase().includes(search) ||
      m.genericName.toLowerCase().includes(search) ||
      (m.barcode && m.barcode.includes(search))
    );
  }
  res.json(rows);
});

router.post("/medicines", async (req, res) => {
  const body = CreateMedicineBody.parse(req.body);
  const [medicine] = await db.insert(medicinesTable).values({
    name: body.name,
    genericName: body.genericName,
    barcode: body.barcode,
    categoryId: body.categoryId,
    supplierId: body.supplierId,
    quantity: body.quantity,
    minQuantity: body.minQuantity,
    purchasePrice: body.purchasePrice,
    sellingPrice: body.sellingPrice,
    expiryDate: body.expiryDate,
    location: body.location,
    description: body.description,
    requiresPrescription: body.requiresPrescription ?? false,
  }).returning();
  res.status(201).json(mapMedicine(medicine));
});

router.get("/medicines/expiring-soon", async (_req, res) => {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const cutoff = thirtyDaysFromNow.toISOString().split("T")[0];
  const rows = await getMedicinesWithJoins({ expiringBefore: cutoff });
  res.json(rows.filter(m => m.expiryDate !== null));
});

router.get("/medicines/:id", async (req, res) => {
  const { id } = GetMedicineParams.parse({ id: Number(req.params.id) });
  const [row] = await db
    .select({
      medicine: medicinesTable,
      categoryName: categoriesTable.name,
      supplierName: suppliersTable.name,
    })
    .from(medicinesTable)
    .leftJoin(categoriesTable, eq(medicinesTable.categoryId, categoriesTable.id))
    .leftJoin(suppliersTable, eq(medicinesTable.supplierId, suppliersTable.id))
    .where(eq(medicinesTable.id, id));
  if (!row) return res.status(404).json({ error: "Medicine not found" });
  return res.json(mapMedicine(row.medicine, row.categoryName, row.supplierName));
});

router.patch("/medicines/:id", async (req, res) => {
  const { id } = UpdateMedicineParams.parse({ id: Number(req.params.id) });
  const body = UpdateMedicineBody.parse(req.body);
  const updateData: Record<string, unknown> = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.genericName !== undefined) updateData.genericName = body.genericName;
  if (body.barcode !== undefined) updateData.barcode = body.barcode;
  if (body.categoryId !== undefined) updateData.categoryId = body.categoryId;
  if (body.supplierId !== undefined) updateData.supplierId = body.supplierId;
  if (body.quantity !== undefined) updateData.quantity = body.quantity;
  if (body.minQuantity !== undefined) updateData.minQuantity = body.minQuantity;
  if (body.purchasePrice !== undefined) updateData.purchasePrice = String(body.purchasePrice);
  if (body.sellingPrice !== undefined) updateData.sellingPrice = String(body.sellingPrice);
  if (body.expiryDate !== undefined) updateData.expiryDate = body.expiryDate;
  if (body.location !== undefined) updateData.location = body.location;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.requiresPrescription !== undefined) updateData.requiresPrescription = body.requiresPrescription;
  const [medicine] = await db.update(medicinesTable).set(updateData).where(eq(medicinesTable.id, id)).returning();
  if (!medicine) return res.status(404).json({ error: "Medicine not found" });
  return res.json(mapMedicine(medicine));
});

router.delete("/medicines/:id", async (req, res) => {
  const { id } = DeleteMedicineParams.parse({ id: Number(req.params.id) });
  await db.delete(medicinesTable).where(eq(medicinesTable.id, id));
  res.status(204).send();
});

export default router;
