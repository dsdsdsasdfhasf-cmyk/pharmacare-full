#!/usr/bin/env node

import Database from 'better-sqlite3';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = resolve(__dirname, './pharmacy.db');
console.log(`Database file: ${dbPath}`);

const db = new Database(dbPath);

try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all().map(row => row.name);
    console.log('Tables:', tables);

    console.log('\n--- Record Counts per Table ---');
    tables.forEach(table => {
        try {
            const count = db.prepare(`SELECT COUNT(*) as count FROM "${table}"`).get().count;
            console.log(`${table}: ${count} records`);
        } catch (error) {
            console.error(`Error counting ${table}:`, error.message);
        }
    });
} finally {
    db.close();
}
