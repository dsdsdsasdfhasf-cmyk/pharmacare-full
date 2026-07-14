#!/usr/bin/env node

import Database from 'better-sqlite3';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdir, stat } from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath =
  process.env.DATABASE_URL ||
  (process.env.VERCEL ? '/tmp/pharmacy.db' : resolve(__dirname, '../../pharmacy.db'));
console.log(`Database path: ${dbPath}`);

async function ensureDatabaseDirectoryExists(path) {
    const absolutePath = resolve(path);
    const directory = dirname(absolutePath);

    try {
        await stat(directory);
    } catch {
        await mkdir(directory, { recursive: true });
    }

    return absolutePath;
}

// SQL to create all tables
const tableSqls = [
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

// Seed initial users if empty. Credentials are environment-configurable for deployment.
async function seedUsers(db) {
    const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    if (existingUsers === 0) {
        const { scryptSync, randomBytes } = await import('node:crypto');
        const hashPassword = (password) => {
            const salt = randomBytes(16).toString('hex');
            const hash = scryptSync(password, salt, 64).toString('hex');
            return `${salt}:${hash}`;
        };

        const adminEmail = process.env.ADMIN_EMAIL || 'admin@pharmacare.app';
        const adminPassword = process.env.ADMIN_PASSWORD || 'PharmaCare2024!Demo';
        const pharmacistEmail = process.env.PHARMACIST_EMAIL || 'pharmacist@pharmacare.app';
        const pharmacistPassword = process.env.PHARMACIST_PASSWORD || 'PharmaCare2024!Staff';

        const adminHash = hashPassword(adminPassword);
        const pharmacistHash = hashPassword(pharmacistPassword);

        db.prepare('INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)')
            .run(adminEmail, adminHash, 'المدير العام', 'admin');
        db.prepare('INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)')
            .run(pharmacistEmail, pharmacistHash, 'الصيدلاني', 'pharmacist');

        console.log('✅ Seeded users:');
        console.log(`   Admin:      ${adminEmail} / ${adminPassword}`);
        console.log(`   Pharmacist: ${pharmacistEmail} / ${pharmacistPassword}`);
    } else {
        console.log('✅ Users already seeded');
    }
}

async function main() {
    await ensureDatabaseDirectoryExists(dbPath);
    const sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');

    try {
        console.log('🔧 Creating tables...');
        for (const sql of tableSqls) {
            sqlite.prepare(sql).run();
        }
        console.log('✅ Tables created');

        console.log('🔧 Seeding users...');
        await seedUsers(sqlite);

        console.log('✅ Database initialized');
        
        // Print user count
        const result = sqlite.prepare('SELECT COUNT(*) as count FROM users').get();
        console.log(`\nUsers table count: ${result.count}`);
        
        sqlite.close();
    } catch (error) {
        console.error('❌ Error:', error.message);
        sqlite.close();
        process.exit(1);
    }
}

main().catch(console.error);