import { Router } from "express";
import { db } from "@workspace/db";
import { suppliersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateSupplierBody,
  UpdateSupplierParams,
  UpdateSupplierBody,
  DeleteSupplierParams,
  GetSupplierParams,
} from "@workspace/api-zod";

const router = Router();

function mapSupplier(s: typeof suppliersTable.$inferSelect) {
  return {
    id: s.id,
    name: s.name,
    contactPerson: s.contactPerson ?? null,
    phone: s.phone ?? null,
    email: s.email ?? null,
    address: s.address ?? null,
    createdAt: s.createdAt.toISOString(),
  };
}

router.get("/suppliers", async (_req, res) => {
  const suppliers = await db.select().from(suppliersTable).orderBy(suppliersTable.name);
  res.json(suppliers.map(mapSupplier));
});

router.post("/suppliers", async (req, res) => {
  const body = CreateSupplierBody.parse(req.body);
  const [supplier] = await db.insert(suppliersTable).values(body).returning();
  res.status(201).json(mapSupplier(supplier));
});

router.get("/suppliers/:id", async (req, res) => {
  const { id } = GetSupplierParams.parse({ id: Number(req.params.id) });
  const [supplier] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, id));
  if (!supplier) return res.status(404).json({ error: "Supplier not found" });
  res.json(mapSupplier(supplier));
});

router.patch("/suppliers/:id", async (req, res) => {
  const { id } = UpdateSupplierParams.parse({ id: Number(req.params.id) });
  const body = UpdateSupplierBody.parse(req.body);
  const [supplier] = await db.update(suppliersTable).set(body).where(eq(suppliersTable.id, id)).returning();
  if (!supplier) return res.status(404).json({ error: "Supplier not found" });
  res.json(mapSupplier(supplier));
});

router.delete("/suppliers/:id", async (req, res) => {
  const { id } = DeleteSupplierParams.parse({ id: Number(req.params.id) });
  await db.delete(suppliersTable).where(eq(suppliersTable.id, id));
  res.status(204).send();
});

export default router;
