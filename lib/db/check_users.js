#!/usr/bin/env node

import Database from 'better-sqlite3';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = resolve(__dirname, '../../pharmacy.db');
console.log(`Database file: ${dbPath}`);

const db = new Database(dbPath);

try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all().map(row => row.name);
    console.log('Tables:', tables);

    if (tables.includes('users')) {
        const result = db.prepare('SELECT COUNT(*) as count FROM users').get();
        console.log(`Users table count: ${result.count}`);

        if (result.count > 0) {
            const users = db.prepare('SELECT username, name, role FROM users').all();
            console.log('\nSeeded Users:');
            users.forEach(user => console.log(`- ${user.username}: ${user.name} (${user.role})`));
        } else {
            console.log('\nNo users seeded. Run the database initialization script to seed users.');
        }
    } else {
        console.log('Users table not found.');
    }
} finally {
    db.close();
}