import { Router } from "express";
import { db } from "@workspace/db";
import { prescriptionsTable, customersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreatePrescriptionBody,
  UpdatePrescriptionParams,
  UpdatePrescriptionBody,
  GetPrescriptionParams,
} from "@workspace/api-zod";

const router = Router();

async function mapPrescription(p: typeof prescriptionsTable.$inferSelect) {
  let customerName: string | null = null;
  if (p.customerId) {
    const [c] = await db.select({ name: customersTable.name }).from(customersTable).where(eq(customersTable.id, p.customerId));
    customerName = c?.name ?? null;
  }
  return {
    id: p.id,
    customerId: p.customerId ?? null,
    customerName,
    doctorName: p.doctorName,
    doctorSpecialty: p.doctorSpecialty ?? null,
    status: p.status,
    notes: p.notes ?? null,
    createdAt: p.createdAt.toISOString(),
  };
}

router.get("/prescriptions", async (_req, res) => {
  const prescriptions = await db.select().from(prescriptionsTable).orderBy(prescriptionsTable.createdAt);
  const mapped = await Promise.all(prescriptions.map(mapPrescription));
  res.json(mapped);
});

router.post("/prescriptions", async (req, res) => {
  const body = CreatePrescriptionBody.parse(req.body);
  const [prescription] = await db.insert(prescriptionsTable).values({
    customerId: body.customerId,
    doctorName: body.doctorName,
    doctorSpecialty: body.doctorSpecialty,
    notes: body.notes,
  }).returning();
  res.status(201).json(await mapPrescription(prescription));
});

router.get("/prescriptions/:id", async (req, res) => {
  const { id } = GetPrescriptionParams.parse({ id: Number(req.params.id) });
  const [prescription] = await db.select().from(prescriptionsTable).where(eq(prescriptionsTable.id, id));
  if (!prescription) return res.status(404).json({ error: "Prescription not found" });
  return res.json(await mapPrescription(prescription));
});

router.patch("/prescriptions/:id", async (req, res) => {
  const { id } = UpdatePrescriptionParams.parse({ id: Number(req.params.id) });
  const body = UpdatePrescriptionBody.parse(req.body);
  const [prescription] = await db.update(prescriptionsTable).set(body).where(eq(prescriptionsTable.id, id)).returning();
  if (!prescription) return res.status(404).json({ error: "Prescription not found" });
  return res.json(await mapPrescription(prescription));
});

export default router;
