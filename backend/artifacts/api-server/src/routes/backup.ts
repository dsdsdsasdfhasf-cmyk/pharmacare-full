import { Router } from "express";
import { db, client } from "@workspace/db";
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

router.post("/backup/restore", requireAdmin, async (req, res) => {
  const { tables } = req.body as { tables?: any };
  if (!tables) return res.status(400).json({ error: "البيانات غير صالحة" });

  try {
    // Disable foreign keys temporarily
    client.pragma("foreign_keys = OFF");

    // Perform deletions in correct order
    await db.delete(saleItemsTable);
    await db.delete(salesTable);
    await db.delete(purchaseItemsTable);
    await db.delete(purchasesTable);
    await db.delete(medicinesTable);
    await db.delete(prescriptionsTable);
    await db.delete(customersTable);
    await db.delete(suppliersTable);
    await db.delete(categoriesTable);
    await db.delete(usersTable);

    // Insert categories
    if (tables.categories?.length > 0) {
      await db.insert(categoriesTable).values(tables.categories.map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        createdAt: c.createdAt ? new Date(c.createdAt) : undefined,
      })));
    }

    // Insert suppliers
    if (tables.suppliers?.length > 0) {
      await db.insert(suppliersTable).values(tables.suppliers.map((s: any) => ({
        id: s.id,
        name: s.name,
        contactPerson: s.contactPerson || s.contact_person,
        phone: s.phone,
        email: s.email,
        address: s.address,
        createdAt: s.createdAt ? new Date(s.createdAt) : undefined,
      })));
    }

    // Insert customers
    if (tables.customers?.length > 0) {
      await db.insert(customersTable).values(tables.customers.map((c: any) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        address: c.address,
        dateOfBirth: c.dateOfBirth || c.date_of_birth,
        notes: c.notes,
        createdAt: c.createdAt ? new Date(c.createdAt) : undefined,
      })));
    }

    // Insert medicines
    if (tables.medicines?.length > 0) {
      await db.insert(medicinesTable).values(tables.medicines.map((m: any) => ({
        id: m.id,
        name: m.name,
        genericName: m.genericName || m.generic_name,
        barcode: m.barcode,
        categoryId: m.categoryId || m.category_id,
        supplierId: m.supplierId || m.supplier_id,
        quantity: m.quantity,
        minQuantity: m.minQuantity || m.min_quantity,
        purchasePrice: Number(m.purchasePrice || m.purchase_price),
        sellingPrice: Number(m.sellingPrice || m.selling_price),
        expiryDate: m.expiryDate || m.expiry_date,
        location: m.location,
        description: m.description,
        requiresPrescription: m.requiresPrescription || m.requires_prescription,
        createdAt: m.createdAt ? new Date(m.createdAt) : undefined,
      })));
    }

    // Insert prescriptions
    if (tables.prescriptions?.length > 0) {
      await db.insert(prescriptionsTable).values(tables.prescriptions.map((p: any) => ({
        id: p.id,
        customerId: p.customerId || p.customer_id,
        doctorName: p.doctorName || p.doctor_name,
        doctorSpecialty: p.doctorSpecialty || p.doctor_specialty,
        status: p.status,
        notes: p.notes,
        createdAt: p.createdAt ? new Date(p.createdAt) : undefined,
      })));
    }

    // Insert sales
    if (tables.sales?.length > 0) {
      await db.insert(salesTable).values(tables.sales.map((s: any) => ({
        id: s.id,
        customerId: s.customerId || s.customer_id,
        prescriptionId: s.prescriptionId || s.prescription_id,
        totalAmount: Number(s.totalAmount || s.total_amount),
        discount: Number(s.discount ?? 0),
        paymentMethod: s.paymentMethod || s.payment_method,
        status: s.status,
        notes: s.notes,
        createdAt: s.createdAt ? new Date(s.createdAt) : undefined,
      })));
    }

    // Insert saleItems
    if (tables.saleItems?.length > 0) {
      await db.insert(saleItemsTable).values(tables.saleItems.map((i: any) => ({
        id: i.id,
        saleId: i.saleId || i.sale_id,
        medicineId: i.medicineId || i.medicine_id,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice || i.unit_price),
        totalPrice: Number(i.totalPrice || i.total_price),
      })));
    }

    // Insert purchases
    if (tables.purchases?.length > 0) {
      await db.insert(purchasesTable).values(tables.purchases.map((p: any) => ({
        id: p.id,
        supplierId: p.supplierId || p.supplier_id,
        invoiceNumber: p.invoiceNumber || p.invoice_number,
        totalAmount: Number(p.totalAmount || p.total_amount),
        status: p.status,
        notes: p.notes,
        createdAt: p.createdAt ? new Date(p.createdAt) : undefined,
      })));
    }

    // Insert purchaseItems
    if (tables.purchaseItems?.length > 0) {
      await db.insert(purchaseItemsTable).values(tables.purchaseItems.map((i: any) => ({
        id: i.id,
        purchaseId: i.purchaseId || i.purchase_id,
        medicineId: i.medicineId || i.medicine_id,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice || i.unit_price),
        totalPrice: Number(i.totalPrice || i.total_price),
        expiryDate: i.expiryDate || i.expiry_date,
      })));
    }

    // Insert users
    if (tables.users?.length > 0) {
      // NOTE: users in backup might contain passwordHash, but check for both formats
      await db.insert(usersTable).values(tables.users.map((u: any) => ({
        id: u.id,
        username: u.username,
        passwordHash: u.passwordHash || u.password_hash,
        name: u.name,
        role: u.role,
        createdAt: u.createdAt ? new Date(u.createdAt) : undefined,
      })));
    }

    // Turn foreign keys back on
    client.pragma("foreign_keys = ON");

    return res.json({ success: true, message: "تمت استعادة قاعدة البيانات بنجاح" });
  } catch (error: any) {
    client.pragma("foreign_keys = ON");
    console.error("Restore error:", error);
    return res.status(500).json({ error: `فشل استرجاع قاعدة البيانات: ${error.message}` });
  }
});

export default router;

