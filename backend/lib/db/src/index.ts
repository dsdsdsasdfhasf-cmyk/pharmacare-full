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

const dbPath = process.env.DATABASE_URL || resolve(import.meta.dirname, "../../../pharmacy.db");

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

// Function to seed initial admin user
async function seedInitialUsers(db: Database.Database) {
  function hashPassword(password: string): string {
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${hash}`;
  }

  try {
    // Check if users table has any data
    const existingUsers = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
    
    if (existingUsers.count === 0) {
      const adminPasswordHash = hashPassword("admin123");
      const pharmacistPasswordHash = hashPassword("pharma123");
      
      db.prepare(`
        INSERT INTO users (username, password_hash, name, role) VALUES 
        ('admin', ?, 'المدير العام', 'admin'),
        ('pharmacist', ?, 'الصيدلاني', 'pharmacist')
      `).run(adminPasswordHash, pharmacistPasswordHash);
      
      console.log("✓ Initial users seeded successfully");
    }
  } catch (error) {
    console.error(`Error seeding users: ${error}`);
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
} catch (error) {
  console.error(`Database initialization error: ${error}`);
}

export const db = drizzle(sqlite, { schema });
export const client = sqlite as any;

export * from "./schema";
