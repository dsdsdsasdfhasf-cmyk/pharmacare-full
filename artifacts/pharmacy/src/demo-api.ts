// Offline demo API. Installed only when VITE_DEMO_MODE=true (see main.tsx).
// Simulates the backend so the whole UI is usable without a running server.
// All writes are in-memory and reset on page reload.

const demoUser = { id: 1, username: "admin@pharmacare.app", name: "مدير العرض التجريبي", role: "admin" as const };

const categories = [
  { id: 1, name: "مضادات حيوية", description: "Antibiotics", createdAt: "2024-01-01T00:00:00.000Z" },
  { id: 2, name: "مسكنات ألم", description: "Pain relievers", createdAt: "2024-01-01T00:00:00.000Z" },
  { id: 3, name: "مضادات حساسية", description: "Antihistamines", createdAt: "2024-01-01T00:00:00.000Z" },
  { id: 4, name: "أدوية الحموضة", description: "Antacids", createdAt: "2024-01-01T00:00:00.000Z" },
  { id: 5, name: "فيتامينات", description: "Vitamins & supplements", createdAt: "2024-01-01T00:00:00.000Z" },
  { id: 6, name: "أدوية سعال", description: "Cough syrups", createdAt: "2024-01-01T00:00:00.000Z" },
  { id: 7, name: "إسعافات أولية", description: "First aid supplies", createdAt: "2024-01-01T00:00:00.000Z" },
  { id: 8, name: "أمراض القلب", description: "Cardiovascular", createdAt: "2024-01-01T00:00:00.000Z" },
];

const suppliers = [
  { id: 1, name: "PharmaCorp Solutions", contactPerson: "John Doe", phone: "+1-555-123-4567", email: "sales@pharmacorp.com", address: "123 Health St, Medical City", createdAt: "2024-01-01T00:00:00.000Z" },
  { id: 2, name: "MediLife Distributors", contactPerson: "Jane Smith", phone: "+1-555-987-6543", email: "info@medilife.com", address: "456 Wellness Ave, Medical Town", createdAt: "2024-01-01T00:00:00.000Z" },
  { id: 3, name: "VitaMax Health", contactPerson: "Alice Johnson", phone: "+1-555-456-7890", email: "orders@vitahealth.com", address: "789 Vitality Blvd, Wellness City", createdAt: "2024-01-01T00:00:00.000Z" },
];

type Medicine = {
  id: number; name: string; genericName: string; barcode: string | null; categoryId: number | null;
  supplierId: number | null; quantity: number; minQuantity: number; purchasePrice: number;
  sellingPrice: number; expiryDate: string | null; location: string | null; description: string | null;
  requiresPrescription: boolean; createdAt: string;
};

let medId = 8;
const medicines: Medicine[] = [
  { id: 1, name: "Amoxicillin 500mg", genericName: "Amoxicillin", barcode: "123456789012", categoryId: 1, supplierId: 1, quantity: 150, minQuantity: 20, purchasePrice: 5.5, sellingPrice: 7.99, expiryDate: "2027-12-31", location: "Aisle 3, Shelf B", description: "Broad-spectrum antibiotic", requiresPrescription: true, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: 2, name: "Paracetamol 500mg", genericName: "Paracetamol", barcode: "123456789013", categoryId: 2, supplierId: 2, quantity: 300, minQuantity: 50, purchasePrice: 0.8, sellingPrice: 1.99, expiryDate: "2027-11-30", location: "Aisle 1, Shelf A", description: "Pain reliever and fever reducer", requiresPrescription: false, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: 3, name: "Cetirizine 10mg", genericName: "Cetirizine", barcode: "123456789014", categoryId: 3, supplierId: 3, quantity: 200, minQuantity: 30, purchasePrice: 2.5, sellingPrice: 4.99, expiryDate: "2027-10-31", location: "Aisle 2, Shelf B", description: "Antihistamine for allergies", requiresPrescription: false, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: 4, name: "Omeprazole 20mg", genericName: "Omeprazole", barcode: "123456789015", categoryId: 4, supplierId: 1, quantity: 8, minQuantity: 15, purchasePrice: 4.0, sellingPrice: 6.99, expiryDate: "2027-09-30", location: "Aisle 4, Shelf A", description: "Proton pump inhibitor", requiresPrescription: true, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: 5, name: "Vitamin D3 1000IU", genericName: "Cholecalciferol", barcode: "123456789016", categoryId: 5, supplierId: 2, quantity: 180, minQuantity: 25, purchasePrice: 3.2, sellingPrice: 5.49, expiryDate: "2028-03-31", location: "Aisle 5, Shelf C", description: "Vitamin D supplement", requiresPrescription: false, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: 6, name: "Dextromethorphan Syrup", genericName: "Dextromethorphan", barcode: "123456789017", categoryId: 6, supplierId: 3, quantity: 120, minQuantity: 20, purchasePrice: 2.0, sellingPrice: 3.99, expiryDate: "2027-08-31", location: "Aisle 6, Shelf D", description: "Cough suppressant", requiresPrescription: false, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: 7, name: "Adrenaline Auto-Injector", genericName: "Epinephrine", barcode: "123456789018", categoryId: 7, supplierId: 1, quantity: 50, minQuantity: 10, purchasePrice: 25.0, sellingPrice: 39.99, expiryDate: "2027-06-30", location: "Aisle 7, Cabinet", description: "Emergency allergy treatment", requiresPrescription: true, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: 8, name: "Aspirin 81mg", genericName: "Aspirin", barcode: "123456789019", categoryId: 8, supplierId: 2, quantity: 250, minQuantity: 40, purchasePrice: 1.5, sellingPrice: 2.99, expiryDate: "2027-07-31", location: "Aisle 8, Shelf B", description: "Low-dose aspirin", requiresPrescription: true, createdAt: "2024-01-01T00:00:00.000Z" },
];

const customers = [
  { id: 1, name: "Mohamed Ali", phone: "+1-555-111-2222", email: "mohamed@example.com", address: "12 Nile St", dateOfBirth: "1990-05-12", notes: "Regular customer", totalPurchases: 15.97, createdAt: "2024-02-01T00:00:00.000Z" },
];

const sales = [
  { id: 1, customerId: 1, customerName: "Mohamed Ali", prescriptionId: null, totalAmount: 15.97, discount: 0, paymentMethod: "cash", status: "completed", notes: null, items: [
    { id: 1, saleId: 1, medicineId: 2, quantity: 2, unitPrice: 1.99, totalPrice: 3.98 },
    { id: 2, saleId: 1, medicineId: 3, quantity: 2, unitPrice: 4.99, totalPrice: 9.98 },
    { id: 3, saleId: 1, medicineId: 5, quantity: 1, unitPrice: 2.01, totalPrice: 2.01 },
  ], createdAt: "2024-06-01T10:15:00.000Z" },
];

const purchases = [
  { id: 1, supplierId: 2, invoiceNumber: "INV-2024-001", totalAmount: 540.0, status: "received", notes: null, items: [
    { id: 1, purchaseId: 1, medicineId: 2, quantity: 100, unitPrice: 0.8, totalPrice: 80.0, expiryDate: "2027-11-30" },
    { id: 2, purchaseId: 1, medicineId: 3, quantity: 100, unitPrice: 2.5, totalPrice: 250.0, expiryDate: "2027-10-31" },
    { id: 3, purchaseId: 1, medicineId: 5, quantity: 100, unitPrice: 3.2, totalPrice: 320.0, expiryDate: "2028-03-31" },
  ], createdAt: "2024-05-20T09:00:00.000Z" },
];

function mapMedicine(m: Medicine) {
  const cat = categories.find(c => c.id === m.categoryId);
  const sup = suppliers.find(s => s.id === m.supplierId);
  return {
    id: m.id, name: m.name, genericName: m.genericName, barcode: m.barcode,
    categoryId: m.categoryId ?? null, categoryName: cat?.name ?? null,
    supplierId: m.supplierId ?? null, supplierName: sup?.name ?? null,
    quantity: m.quantity, minQuantity: m.minQuantity,
    purchasePrice: m.purchasePrice, sellingPrice: m.sellingPrice,
    expiryDate: m.expiryDate, location: m.location ?? null, description: m.description ?? null,
    requiresPrescription: m.requiresPrescription, createdAt: m.createdAt,
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function installDemoApi() {
  if (import.meta.env.VITE_API_BASE_URL || typeof window === "undefined") return;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const url = new URL(raw, window.location.origin);
    if (!url.pathname.startsWith("/api/")) return originalFetch(input, init);

    const path = url.pathname;
    const method = (init?.method || "GET").toUpperCase();

    // --- Auth ---
    if (path === "/api/auth/login") {
      return json({ ...demoUser, username: "admin@pharmacare.app" });
    }
    if (path === "/api/auth/me") return json(demoUser);
    if (path === "/api/auth/logout") return json({ success: true });

    // --- Medicines ---
    if (path === "/api/medicines" && method === "GET") {
      let rows = medicines.map(mapMedicine);
      const search = url.searchParams.get("search");
      if (search) {
        const s = search.toLowerCase();
        rows = rows.filter(m => m.name.toLowerCase().includes(s) || m.genericName.toLowerCase().includes(s) || (m.barcode && m.barcode.includes(s)));
      }
      const categoryId = url.searchParams.get("categoryId");
      if (categoryId) rows = rows.filter(m => String(m.categoryId) === categoryId);
      const lowStock = url.searchParams.get("lowStock");
      if (lowStock === "true") rows = rows.filter(m => m.quantity <= m.minQuantity);
      return json(rows);
    }
    if (path === "/api/medicines/expiring-soon" && method === "GET") {
      const soon = medicines.filter(m => m.expiryDate).map(mapMedicine);
      return json(soon);
    }
    if (path.startsWith("/api/medicines/") && method === "GET") {
      const id = Number(path.split("/").pop());
      const m = medicines.find(x => x.id === id);
      return m ? json(mapMedicine(m)) : json({ error: "Medicine not found" }, 404);
    }
    if (path === "/api/medicines" && method === "POST") {
      const b = JSON.parse(init?.body as string);
      const m: Medicine = {
        id: ++medId, name: b.name, genericName: b.genericName, barcode: b.barcode ?? null,
        categoryId: b.categoryId ?? null, supplierId: b.supplierId ?? null,
        quantity: b.quantity ?? 0, minQuantity: b.minQuantity ?? 10,
        purchasePrice: Number(b.purchasePrice), sellingPrice: Number(b.sellingPrice),
        expiryDate: b.expiryDate ?? null, location: b.location ?? null, description: b.description ?? null,
        requiresPrescription: Boolean(b.requiresPrescription), createdAt: new Date().toISOString(),
      };
      medicines.push(m);
      return json(mapMedicine(m), 201);
    }
    if (path.startsWith("/api/medicines/") && method === "PATCH") {
      const id = Number(path.split("/").pop());
      const m = medicines.find(x => x.id === id);
      if (!m) return json({ error: "Medicine not found" }, 404);
      const b = JSON.parse(init?.body as string);
      Object.assign(m, b);
      return json(mapMedicine(m));
    }
    if (path.startsWith("/api/medicines/") && method === "DELETE") {
      const id = Number(path.split("/").pop());
      const i = medicines.findIndex(x => x.id === id);
      if (i >= 0) medicines.splice(i, 1);
      return new Response(null, { status: 204 });
    }

    // --- Categories ---
    if (path === "/api/categories") {
      if (method === "POST") {
        const b = JSON.parse(init?.body as string);
        const c = { id: categories.length + 1, name: b.name, description: b.description ?? null, createdAt: new Date().toISOString() };
        categories.push(c);
        return json(c, 201);
      }
      return json(categories.map(c => ({ ...c, createdAt: c.createdAt })));
    }

    // --- Suppliers ---
    if (path === "/api/suppliers") {
      if (method === "POST") {
        const b = JSON.parse(init?.body as string);
        const s = { id: suppliers.length + 1, name: b.name, contactPerson: b.contactPerson ?? null, phone: b.phone ?? null, email: b.email ?? null, address: b.address ?? null, createdAt: new Date().toISOString() };
        suppliers.push(s);
        return json(s, 201);
      }
      return json(suppliers);
    }

    // --- Customers ---
    if (path === "/api/customers") {
      if (method === "POST") {
        const b = JSON.parse(init?.body as string);
        const c = { id: customers.length + 1, name: b.name, phone: b.phone ?? null, email: b.email ?? null, address: b.address ?? null, dateOfBirth: b.dateOfBirth ?? null, notes: b.notes ?? null, totalPurchases: 0, createdAt: new Date().toISOString() };
        customers.push(c);
        return json(c, 201);
      }
      return json(customers);
    }

    // --- Sales ---
    if (path === "/api/sales") {
      if (method === "POST") {
        const b = JSON.parse(init?.body as string);
        const s = { id: sales.length + 1, customerId: b.customerId ?? null, customerName: b.customerName ?? null, prescriptionId: b.prescriptionId ?? null, totalAmount: Number(b.totalAmount), discount: Number(b.discount ?? 0), paymentMethod: b.paymentMethod ?? "cash", status: "completed", notes: b.notes ?? null, items: [], createdAt: new Date().toISOString() };
        sales.unshift(s);
        return json(s, 201);
      }
      return json(sales);
    }
    if (path.startsWith("/api/sales/") && method === "GET") {
      const id = Number(path.split("/").pop());
      const s = sales.find(x => x.id === id);
      return s ? json(s) : json({ error: "Sale not found" }, 404);
    }

    // --- Purchases ---
    if (path === "/api/purchases") {
      if (method === "POST") {
        const b = JSON.parse(init?.body as string);
        const p = { id: purchases.length + 1, supplierId: b.supplierId, invoiceNumber: b.invoiceNumber ?? null, totalAmount: Number(b.totalAmount), status: "received", notes: b.notes ?? null, items: [], createdAt: new Date().toISOString() };
        purchases.unshift(p);
        return json(p, 201);
      }
      return json(purchases);
    }

    // --- Dashboard ---
    if (path === "/api/dashboard/summary") {
      const totalMedicines = medicines.length;
      const lowStockCount = medicines.filter(m => m.quantity <= m.minQuantity).length;
      const now = new Date();
      const cutoff = new Date(now.getTime() + 30 * 86400000).toISOString().split("T")[0];
      const today = now.toISOString().split("T")[0];
      const expiringSoonCount = medicines.filter(m => m.expiryDate && m.expiryDate >= today && m.expiryDate <= cutoff).length;
      return json({ todaySales: 1, todayRevenue: 15.97, totalMedicines, lowStockCount, expiringSoonCount, totalCustomers: customers.length, monthRevenue: 15.97, totalSalesToday: 1 });
    }
    if (path === "/api/dashboard/sales-chart") return json([{ date: "2024-06-01", revenue: 15.97, salesCount: 1 }]);
    if (path === "/api/dashboard/top-medicines") return json([
      { medicineId: 3, medicineName: "Cetirizine 10mg", totalQuantity: 2, totalRevenue: 9.98 },
      { medicineId: 2, medicineName: "Paracetamol 500mg", totalQuantity: 2, totalRevenue: 3.98 },
      { medicineId: 5, medicineName: "Vitamin D3 1000IU", totalQuantity: 1, totalRevenue: 2.01 },
    ]);
    if (path === "/api/dashboard/recent-sales") return json(sales);
    if (path === "/api/dashboard/low-stock") return json(medicines.filter(m => m.quantity <= m.minQuantity).map(mapMedicine));
    if (path === "/api/dashboard/payment-breakdown") return json([{ method: "cash", count: 1, total: 15.97 }]);
    if (path === "/api/dashboard/weekly-comparison") return json({ thisWeek: { revenue: 15.97, count: 1 }, lastWeek: { revenue: 0, count: 0 }, changePercent: 100 });

    // --- Reports ---
    if (path === "/api/reports/profit-loss") {
      const revenue = 15.97; const cost = 11.96;
      return json({ totalRevenue: revenue, totalCost: cost, profit: revenue - cost, profitMargin: ((revenue - cost) / revenue) * 100, totalSales: 1, totalItems: 5 });
    }
    if (path === "/api/reports/profit-by-medicine") return json([
      { medicineId: 3, medicineName: "Cetirizine 10mg", genericName: "Cetirizine", totalQuantitySold: 2, totalRevenue: 9.98, totalCost: 5.0, profit: 4.98 },
      { medicineId: 2, medicineName: "Paracetamol 500mg", genericName: "Paracetamol", totalQuantitySold: 2, totalRevenue: 3.98, totalCost: 1.6, profit: 2.38 },
      { medicineId: 5, medicineName: "Vitamin D3 1000IU", genericName: "Cholecalciferol", totalQuantitySold: 1, totalRevenue: 2.01, totalCost: 3.2, profit: -1.19 },
    ]);
    if (path === "/api/reports/expiring") {
      const soon = medicines.filter(m => m.expiryDate && m.expiryDate <= "2027-12-31").map(m => ({ id: m.id, name: m.name, genericName: m.genericName, quantity: m.quantity, expiryDate: m.expiryDate, sellingPrice: m.sellingPrice, purchasePrice: m.purchasePrice, potentialLoss: m.purchasePrice * m.quantity }));
      return json(soon);
    }

    // --- Backup ---
    if (path === "/api/backup/preview") return json({ medicines: medicines.length, categories: categories.length, suppliers: suppliers.length, customers: customers.length, sales: sales.length, purchases: purchases.length });
    if (path === "/api/backup") return json({ version: 1, exportedAt: new Date().toISOString(), tables: {} });

    // Default: accept writes, return empty for unknown GETs
    if (method !== "GET") return json({ success: true, id: Date.now() });
    return json([]);
  };
}
