#!/usr/bin/env node

import Database from 'better-sqlite3';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdir, stat } from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = resolve(__dirname, '../../pharmacy.db');
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
    `CREATE INDEX IF NOT EXISTS idx_medicines_expiry_date ON medicines(expiry_date)`
];

// Seed initial users if empty
async function seedUsers(db) {
    const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    if (existingUsers === 0) {
        const { scryptSync, randomBytes } = await import('node:crypto');
        const hashPassword = (password) => {
            const salt = randomBytes(16).toString('hex');
            const hash = scryptSync(password, salt, 64).toString('hex');
            return `${salt}:${hash}`;
        };

        const adminHash = hashPassword('admin123');
        const pharmacistHash = hashPassword('pharma123');

        db.prepare('INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)')
            .run('admin', adminHash, 'المدير العام', 'admin');
        db.prepare('INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)')
            .run('pharmacist', pharmacistHash, 'الصيدلاني', 'pharmacist');

        console.log('✅ Seeded users: admin, pharmacist');
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