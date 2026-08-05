const Database = require('better-sqlite3');
const db = new Database('pharmacy.db');

try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all();
    console.log('Tables:', tables.map(t => t.name));

    const tableNames = tables.map(t => t.name);
    tableNames.forEach(table => {
        const rows = db.prepare(`SELECT COUNT(*) as count FROM "${table}"`).get();
        console.log(`${table} rows:`, rows.count);
    });
} finally {
    db.close();
}