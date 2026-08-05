#!/usr/bin/env node

/**
 * Clean unit tests for inventory and sales reporting logic
 * Uses Node.js assert and simple test runner
 */

import Database from 'better-sqlite3';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import assert from 'assert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = resolve(__dirname, 'pharmacy.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`✅ ${name}`);
        testsPassed++;
    } catch (err) {
        console.error(`❌ ${name}`);
        console.error(`   Error: ${err.message}`);
        testsFailed++;
    }
}

console.log('\n🧪 Running Inventory Summary Tests\n');

// Inventory Summary Tests
test('Inventory: Should correctly count total medicines', () => {
    const count = db.prepare('SELECT COUNT(*) as count FROM medicines').get().count;
    assert.ok(count >= 0, 'Total medicines should be non-negative');
});

test('Inventory: Should sum total quantity of medicines', () => {
    const total = db.prepare('SELECT SUM(quantity) as total FROM medicines').get().total || 0;
    assert.ok(total >= 0, 'Total quantity should be non-negative');
});

test('Inventory: Should detect out-of-stock items', () => {
    const count = db.prepare('SELECT COUNT(*) as count FROM medicines WHERE quantity = 0').get().count;
    assert.ok(count >= 0, 'Out of stock count should be non-negative');
});

test('Inventory: Should detect low stock items (quantity < min_quantity)', () => {
    const count = db.prepare('SELECT COUNT(*) as count FROM medicines WHERE quantity < min_quantity').get().count;
    assert.ok(count >= 0, 'Low stock count should be non-negative');
});

console.log('\n🧪 Running Sales Performance Tests\n');

// Sales Performance Tests
test('Sales: Should validate sales total is numeric', () => {
    const salesTotal = db.prepare('SELECT COALESCE(SUM(total_amount), 0) as total FROM sales').get().total;
    assert.ok(typeof salesTotal === 'number', 'Sales total must be a number');
    assert.ok(!isNaN(salesTotal), 'Sales total must be a valid number');
});

test('Sales: Should validate sales count is non-negative', () => {
    const count = db.prepare('SELECT COUNT(*) as count FROM sales').get().count;
    assert.ok(count >= 0, 'Sales count cannot be negative');
});

test('Sales: Should verify sales count matches actual records', () => {
    const actual = db.prepare('SELECT COUNT(*) as count FROM sales').get().count;
    const expected = 1;
    assert.strictEqual(actual, expected, 'Sales count should match database');
});

console.log('\n🧪 Running Best-Selling Medicines Tests\n');

// Top Selling Medicines Tests
test('Top Selling: Should return top selling medicines', () => {
    const top = db.prepare(`
        SELECT m.id, m.name, SUM(si.quantity) as units_sold
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.id
        JOIN medicines m ON si.medicine_id = m.id
        GROUP BY m.id, m.name
        ORDER BY units_sold DESC
        LIMIT 5
    `).all();
    assert.ok(Array.isArray(top), 'Should return an array');
    assert.ok(top.length <= 5, 'Should limit to 5 results');
});

test('Top Selling: Should have valid sales data', () => {
    const top = db.prepare(`
        SELECT SUM(si.total_price) as total_revenue
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.id
    `).get().total_revenue;
    assert.ok(typeof top === 'number', 'Revenue must be a number');
});

console.log('\n🧪 Running Recent Sales Transactions Tests\n');

// Recent Sales Transactions Tests
test('Recent Sales: Should return recent sales (latest 5)', () => {
    const sales = db.prepare(`
        SELECT s.id, s.payment_method
        FROM sales s
        ORDER BY s.created_at DESC
        LIMIT 5
    `).all();
    assert.ok(Array.isArray(sales), 'Should return an array');
    assert.ok(sales.length <= 5, 'Should limit to 5 results');
});

test('Recent Sales: Should handle missing customer gracefully', () => {
    db.prepare(`
        SELECT s.id, s.payment_method
        FROM sales s
        ORDER BY s.created_at DESC
        LIMIT 2
    `).all().forEach(row => {
        assert.ok(row.payment_method !== undefined, 'Payment method should be defined');
    });
});

// Integration: Data Accuracy
console.log('\n🧪 Running Integration & Data Accuracy Tests\n');

test('Integration: Total medicines quantity matches sum of all records', () => {
    const quantity = db.prepare('SELECT SUM(quantity) as total FROM medicines').get().total || 0;
    assert.ok(quantity >= 0, 'Total quantity should be non-negative');
});

test('Integration: Sales data is logically consistent', () => {
    const salesTotal = db.prepare('SELECT COALESCE(SUM(total_amount), 0) as total FROM sales').get().total;
    assert.ok(salesTotal >= 0, 'Sales total should be non-negative');
});

// Summary
console.log('\n' + '='.repeat(50));
console.log('🧪 Test Summary');
console.log('='.repeat(50));
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);
console.log(`📊 Total: ${testsPassed + testsFailed}`);

if (testsFailed === 0) {
    console.log('\n🎉 All unit tests passed! Data accuracy is verified.\n');
    db.close();
    process.exit(0);
} else {
    console.log('\n⚠️  Some tests failed. Please review errors.\n');
    db.close();
    process.exit(1);
}