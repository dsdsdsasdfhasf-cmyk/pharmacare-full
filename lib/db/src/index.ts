import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import { mkdir, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { scryptSync, randomBytes } from "node:crypto";
import {
  usersTable,
  categoriesTable,
  suppliersTable,
  medicinesTable,
  customersTable,
  prescriptionsTable,
  salesTable,
  saleItemsTable,
  purchasesTable,
  purchaseItemsTable
} from "./schema";

const dbPath =
  process.env.DATABASE_URL ||
  (process.env.VERCEL
    ? "/tmp/pharmacy.db"
    : resolve(import.meta.dirname, "../../../pharmacy.db"));

// Ensure the directory exists before creating the database
async function ensureDatabaseDirectoryExists(path: string): Promise<string> {
  const absolutePath = resolve(path);
  const directory = dirname(absolutePath);
  
  try {
    await stat(directory);
  } catch {
    // Directory doesn't exist, create it
    await mkdir(directory, { recursive: true });
  }
  
  return absolutePath;
}

// Function to create all database tables
async function createDatabaseTables(db: Database.Database) {
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'pharmacist',
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`,
    
    `CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name)`,
    
    `CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact_person TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name)`,
    `CREATE INDEX IF NOT EXISTS idx_suppliers_email ON suppliers(email)`,
    
    `CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      date_of_birth TEXT,
      notes TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    
    `CREATE TABLE IF NOT EXISTS medicines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      generic_name TEXT NOT NULL,
      barcode TEXT,
      category_id INTEGER REFERENCES categories(id),
      supplier_id INTEGER REFERENCES suppliers(id),
      quantity INTEGER NOT NULL DEFAULT 0,
      min_quantity INTEGER NOT NULL DEFAULT 10,
      purchase_price REAL NOT NULL,
      selling_price REAL NOT NULL,
      expiry_date TEXT,
      location TEXT,
      description TEXT,
      requires_prescription INTEGER NOT NULL DEFAULT false,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE INDEX IF NOT EXISTS idx_medicines_category_id ON medicines(category_id)`,
    `CREATE INDEX IF NOT EXISTS idx_medicines_supplier_id ON medicines(supplier_id)`,
    `CREATE INDEX IF NOT EXISTS idx_medicines_expiry_date ON medicines(expiry_date)`,
    `CREATE INDEX IF NOT EXISTS idx_medicines_created_at ON medicines(created_at)`,
    
    `CREATE TABLE IF NOT EXISTS prescriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER REFERENCES customers(id),
      doctor_name TEXT NOT NULL,
      doctor_specialty TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE INDEX IF NOT EXISTS idx_prescriptions_customer_id ON prescriptions(customer_id)`,
    `CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions(status)`,
    `CREATE INDEX IF NOT EXISTS idx_prescriptions_created_at ON prescriptions(created_at)`,
    
    `CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER REFERENCES customers(id),
      prescription_id INTEGER REFERENCES prescriptions(id),
      total_amount REAL NOT NULL,
      discount REAL NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL DEFAULT 'cash',
      status TEXT NOT NULL DEFAULT 'completed',
      notes TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id)`,
    `CREATE INDEX IF NOT EXISTS idx_sales_prescription_id ON sales(prescription_id)`,
    `CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status)`,
    `CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at)`,
    
    `CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL REFERENCES sales(id),
      medicine_id INTEGER NOT NULL REFERENCES medicines(id),
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id)`,
    `CREATE INDEX IF NOT EXISTS idx_sale_items_medicine_id ON sale_items(medicine_id)`,
    
    `CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
      invoice_number TEXT,
      total_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'received',
      notes TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON purchases(supplier_id)`,
    `CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON purchases(created_at)`,
    
    `CREATE TABLE IF NOT EXISTS purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER NOT NULL REFERENCES purchases(id),
      medicine_id INTEGER NOT NULL REFERENCES medicines(id),
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
      expiry_date TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON purchase_items(purchase_id)`,
    `CREATE INDEX IF NOT EXISTS idx_purchase_items_medicine_id ON purchase_items(medicine_id)`
  ];

  for (const tableSql of tables) {
    try {
      db.prepare(tableSql).run();
    } catch (error) {
      console.error(`Error creating table: ${error}`);
    }
  }
}

// Function to seed initial admin user with secure, environment-configurable credentials.
async function seedInitialUsers(db: Database.Database) {
  function hashPassword(password: string): string {
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${hash}`;
  }

  try {
    const existingUsers = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };

    if (existingUsers.count === 0) {
      const adminEmail = process.env.ADMIN_EMAIL || "admin@pharmacare.app";
      const adminPassword = process.env.ADMIN_PASSWORD || "PharmaCare2024!Demo";
      const pharmacistEmail = process.env.PHARMACIST_EMAIL || "pharmacist@pharmacare.app";
      const pharmacistPassword = process.env.PHARMACIST_PASSWORD || "PharmaCare2024!Staff";

      const adminPasswordHash = hashPassword(adminPassword);
      const pharmacistPasswordHash = hashPassword(pharmacistPassword);

      db.prepare(`
        INSERT INTO users (username, password_hash, name, role) VALUES
        (?, ?, 'المدير العام', 'admin'),
        (?, ?, 'الصيدلاني', 'pharmacist')
      `).run(adminEmail, adminPasswordHash, pharmacistEmail, pharmacistPasswordHash);

      console.log("✓ Initial users seeded successfully");
      console.log(`  Admin login:      ${adminEmail} / ${adminPassword}`);
      console.log(`  Pharmacist login: ${pharmacistEmail} / ${pharmacistPassword}`);
      console.log(
        "  ⚠️  Override these with ADMIN_EMAIL / ADMIN_PASSWORD / PHARMACIST_EMAIL / PHARMACIST_PASSWORD env vars before production.",
      );
    }
  } catch (error) {
    console.error(`Error seeding users: ${error}`);
  }
}

// Seed realistic sample data so the app is usable immediately after deployment.
// Idempotent: only runs when the categories table is empty.
export async function seedSampleData(database: Database.Database = sqlite): Promise<void> {
  const alreadySeeded = database.prepare("SELECT COUNT(*) as count FROM categories").get() as { count: number };
  if (alreadySeeded.count > 0) {
    console.log("✓ Sample data already present, skipping seed");
    return;
  }

  try {
    const insertCategory = database.prepare("INSERT INTO categories (name, description) VALUES (?, ?)");
    const insertSupplier = database.prepare(
      "INSERT INTO suppliers (name, contact_person, phone, email, address) VALUES (?, ?, ?, ?, ?)",
    );
    const insertMedicine = database.prepare(
      `INSERT INTO medicines
       (name, generic_name, barcode, category_id, supplier_id, quantity, min_quantity,
        purchase_price, selling_price, expiry_date, location, description, requires_prescription)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const insertCustomer = database.prepare(
      "INSERT INTO customers (name, phone, email, address, date_of_birth, notes) VALUES (?, ?, ?, ?, ?, ?)",
    );
    const insertPrescription = database.prepare(
      "INSERT INTO prescriptions (customer_id, doctor_name, doctor_specialty, status, notes) VALUES (?, ?, ?, ?, ?)",
    );
    const insertSale = database.prepare(
      "INSERT INTO sales (customer_id, prescription_id, total_amount, discount, payment_method, status) VALUES (?, ?, ?, ?, ?, ?)",
    );
    const insertSaleItem = database.prepare(
      "INSERT INTO sale_items (sale_id, medicine_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)",
    );
    const insertPurchase = database.prepare(
      "INSERT INTO purchases (supplier_id, invoice_number, total_amount, status) VALUES (?, ?, ?, ?)",
    );
    const insertPurchaseItem = database.prepare(
      "INSERT INTO purchase_items (purchase_id, medicine_id, quantity, unit_price, total_price, expiry_date) VALUES (?, ?, ?, ?, ?, ?)",
    );

    const categories = [
      ["مضادات حيوية", "Antibiotics"],
      ["مسكنات ألم", "Pain relievers"],
      ["مضادات حساسية", "Antihistamines"],
      ["أدوية الحموضة", "Antacids"],
      ["فيتامينات", "Vitamins & supplements"],
      ["أدوية سعال", "Cough syrups"],
      ["إسعافات أولية", "First aid supplies"],
      ["أمراض القلب", "Cardiovascular"],
    ] as const;
    const categoryIds: number[] = [];
    for (const [name, description] of categories) {
      const info = insertCategory.run(name, description);
      categoryIds.push(Number(info.lastInsertRowid));
    }

    const suppliers = [
      ["PharmaCorp Solutions", "John Doe", "+1-555-123-4567", "sales@pharmacorp.com", "123 Health St, Medical City"],
      ["MediLife Distributors", "Jane Smith", "+1-555-987-6543", "info@medilife.com", "456 Wellness Ave, Medical Town"],
      ["VitaMax Health", "Alice Johnson", "+1-555-456-7890", "orders@vitahealth.com", "789 Vitality Blvd, Wellness City"],
    ] as const;
    const supplierIds: number[] = [];
    for (const s of suppliers) {
      const info = insertSupplier.run(s[0], s[1], s[2], s[3], s[4]);
      supplierIds.push(Number(info.lastInsertRowid));
    }

    const medicines = [
      ["Amoxicillin 500mg", "Amoxicillin", "123456789012", 0, 0, 150, 20, 5.5, 7.99, "2027-12-31", "Aisle 3, Shelf B", "Broad-spectrum antibiotic", 1],
      ["Paracetamol 500mg", "Paracetamol", "123456789013", 1, 1, 300, 50, 0.8, 1.99, "2027-11-30", "Aisle 1, Shelf A", "Pain reliever and fever reducer", 0],
      ["Cetirizine 10mg", "Cetirizine", "123456789014", 2, 2, 200, 30, 2.5, 4.99, "2027-10-31", "Aisle 2, Shelf B", "Antihistamine for allergies", 0],
      ["Omeprazole 20mg", "Omeprazole", "123456789015", 3, 0, 100, 15, 4.0, 6.99, "2027-09-30", "Aisle 4, Shelf A", "Proton pump inhibitor", 1],
      ["Vitamin D3 1000IU", "Cholecalciferol", "123456789016", 4, 1, 180, 25, 3.2, 5.49, "2028-03-31", "Aisle 5, Shelf C", "Vitamin D supplement", 0],
      ["Dextromethorphan Syrup", "Dextromethorphan", "123456789017", 5, 2, 120, 20, 2.0, 3.99, "2027-08-31", "Aisle 6, Shelf D", "Cough suppressant", 0],
      ["Adrenaline Auto-Injector", "Epinephrine", "123456789018", 6, 0, 50, 10, 25.0, 39.99, "2027-06-30", "Aisle 7, Cabinet", "Emergency allergy treatment", 1],
      ["Aspirin 81mg", "Aspirin", "123456789019", 7, 1, 250, 40, 1.5, 2.99, "2027-07-31", "Aisle 8, Shelf B", "Low-dose aspirin", 1],
    ] as const;
    const medicineIds: number[] = [];
    for (const m of medicines) {
      const info = insertMedicine.run(
        m[0], m[1], m[2], categoryIds[m[3]], supplierIds[m[4]], m[5], m[6],
        m[7], m[8], m[9], m[10], m[11], m[12],
      );
      medicineIds.push(Number(info.lastInsertRowid));
    }

    const customerId = Number(
      insertCustomer.run("Mohamed Ali", "+1-555-111-2222", "mohamed@example.com", "12 Nile St", "1990-05-12", "Regular customer").lastInsertRowid,
    );
    const prescriptionId = Number(
      insertPrescription.run(customerId, "Dr. Hossam", "General Practice", "completed", "Take twice daily").lastInsertRowid,
    );

    const saleId = Number(
      insertSale.run(customerId, prescriptionId, 15.97, 0, "cash", "completed").lastInsertRowid,
    );
    insertSaleItem.run(saleId, medicineIds[1], 2, 1.99, 3.98);
    insertSaleItem.run(saleId, medicineIds[2], 2, 4.99, 9.98);
    insertSaleItem.run(saleId, medicineIds[4], 1, 2.01, 2.01);

    const purchaseId = Number(
      insertPurchase.run(supplierIds[1], "INV-2024-001", 540.0, "received").lastInsertRowid,
    );
    insertPurchaseItem.run(purchaseId, medicineIds[1], 100, 0.8, 80.0, "2027-11-30");
    insertPurchaseItem.run(purchaseId, medicineIds[2], 100, 2.5, 250.0, "2027-10-31");
    insertPurchaseItem.run(purchaseId, medicineIds[4], 100, 3.2, 320.0, "2028-03-31");

    console.log("✓ Sample data seeded successfully");
  } catch (error) {
    console.error(`Error seeding sample data: ${error}`);
  }
}

// Initialize database
const resolvedDbPath = await ensureDatabaseDirectoryExists(dbPath);
const sqlite = new Database(resolvedDbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// Create tables if they don't exist
try {
  await createDatabaseTables(sqlite);
  await seedInitialUsers(sqlite);
  if (process.env.SEED_SAMPLE_DATA !== "false") {
    await seedSampleData(sqlite);
  }
} catch (error) {
  console.error(`Database initialization error: ${error}`);
}

export const db = drizzle(sqlite, { schema });
export const client = sqlite as any;

export * from "./schema";
