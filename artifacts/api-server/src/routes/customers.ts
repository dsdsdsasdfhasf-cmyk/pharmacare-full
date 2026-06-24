import { Router } from "express";
import { db } from "@workspace/db";
import { customersTable, salesTable } from "@workspace/db";
import { eq, ilike, or, sum } from "drizzle-orm";
import {
  CreateCustomerBody,
  UpdateCustomerParams,
  UpdateCustomerBody,
  DeleteCustomerParams,
  GetCustomerParams,
  GetCustomerSalesParams,
  ListCustomersQueryParams,
} from "@workspace/api-zod";

const router = Router();

function mapCustomer(c: typeof customersTable.$inferSelect, totalPurchases = 0) {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone ?? null,
    email: c.email ?? null,
    address: c.address ?? null,
    dateOfBirth: c.dateOfBirth ?? null,
    notes: c.notes ?? null,
    totalPurchases,
    createdAt: c.createdAt.toISOString(),
  };
}

router.get("/customers", async (req, res) => {
  const query = ListCustomersQueryParams.parse(req.query);
  let customers;
  if (query.search) {
    customers = await db.select().from(customersTable).where(
      or(
        ilike(customersTable.name, `%${query.search}%`),
        ilike(customersTable.phone, `%${query.search}%`),
      )
    ).orderBy(customersTable.name);
  } else {
    customers = await db.select().from(customersTable).orderBy(customersTable.name);
  }
  res.json(customers.map(c => mapCustomer(c)));
});

router.post("/customers", async (req, res) => {
  const body = CreateCustomerBody.parse(req.body);
  const [customer] = await db.insert(customersTable).values(body).returning();
  res.status(201).json(mapCustomer(customer));
});

router.get("/customers/:id", async (req, res) => {
  const { id } = GetCustomerParams.parse({ id: Number(req.params.id) });
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, id));
  if (!customer) return res.status(404).json({ error: "Customer not found" });
  const [totals] = await db.select({ total: sum(salesTable.totalAmount) }).from(salesTable).where(eq(salesTable.customerId, id));
  res.json(mapCustomer(customer, Number(totals?.total ?? 0)));
});

router.patch("/customers/:id", async (req, res) => {
  const { id } = UpdateCustomerParams.parse({ id: Number(req.params.id) });
  const body = UpdateCustomerBody.parse(req.body);
  const [customer] = await db.update(customersTable).set(body).where(eq(customersTable.id, id)).returning();
  if (!customer) return res.status(404).json({ error: "Customer not found" });
  res.json(mapCustomer(customer));
});

router.delete("/customers/:id", async (req, res) => {
  const { id } = DeleteCustomerParams.parse({ id: Number(req.params.id) });
  await db.delete(customersTable).where(eq(customersTable.id, id));
  res.status(204).send();
});

router.get("/customers/:id/sales", async (req, res) => {
  const { id } = GetCustomerSalesParams.parse({ id: Number(req.params.id) });
  const sales = await db.select().from(salesTable).where(eq(salesTable.customerId, id)).orderBy(salesTable.createdAt);
  res.json(sales.map(s => ({
    id: s.id,
    customerId: s.customerId ?? null,
    customerName: null,
    prescriptionId: s.prescriptionId ?? null,
    totalAmount: Number(s.totalAmount),
    discount: Number(s.discount),
    paymentMethod: s.paymentMethod,
    status: s.status,
    notes: s.notes ?? null,
    items: [],
    createdAt: s.createdAt.toISOString(),
  })));
});

export default router;
