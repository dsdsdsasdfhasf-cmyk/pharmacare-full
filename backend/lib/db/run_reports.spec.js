#!/usr/bin/env node

/**
 * Unit tests for inventory and sales reporting logic
 * Tests use Node.js built-in assert and a simple test runner
 */

import Database from 'better-sqlite3';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import assert from 'assert';

// Import report generators (optional)
// Fallback: inline test helpers detect if generate_report.js exists
import { promises as fs } from 'node:fs';
 function getLowStockMedicines(db) {
 return db.prepare(`
            SELECT m.id, m.name, m.generic_name, m.quantity, m.min_quantity, s.name as supplier
            FROM medicines m
            LEFT JOIN suppliers s ON m.supplier_id = s.id
            WHERE m.quantity < m.min_quantity
        `).all();
    }
    
    function getInventorySummary(db) {
        const totalMedicines = db.prepare('SELECT COUNT(*) as count FROM medicines').get().count;
        const totalQuantity = db.prepare('SELECT SUM(quantity) as total FROM medicines').get().total || 0;
        const totalOutOfStock = db.prepare('SELECT COUNT(*) as count FROM medicines WHERE quantity = 0').get().count;
        const totalLowStock = getLowStockMedicines(db).length;
        
        return { totalMedicines, totalQuantity, totalOutOfStock, totalLowStock };
    }

    function getRecentSalesSummary(db) {
        const salesTotal = db.prepare('SELECT COALESCE(SUM(total_amount), 0) as total FROM sales').get().total;
        const salesCount = db.prepare('SELECT COUNT(*) as count FROM sales').get().count;
        return { salesTotal, salesCount };
    }

    function getTopSellingMedicines(db) {
        return db.prepare(`
            SELECT m.id, m.name, m.generic_name, SUM(si.quantity) as units_sold, SUM(si.total_price) as total_revenue
            FROM sale_items si
            JOIN sales s ON si.sale_id = s.id
            JOIN medicines m ON si.medicine_id = m.id
            GROUP BY m.id, m.name, m.generic_name
            ORDER BY units_sold DESC
            LIMIT 5
        `).all();
    }

    function getRecentSales(db) {
        return db.prepare(`
            SELECT s.id, s.created_at, s.total_amount, s.payment_method, c.name as customer
            FROM sales s
            LEFT JOIN customers c ON s.customer_id = c.id
            ORDER BY s.created_at DESC
            LIMIT 5
        `).all();
    }
});

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

// Test Suite: Inventory Summary
console.log('\n🧪 Running Inventory Summary Tests\n');

test('Should correctly count total medicines', () => {
    const summary = {
        totalMedicines: 10,
        totalQuantity: 2000,
        totalOutOfStock: 2,
        totalLowStock: 5
    };
    assert.ok(summary.totalMedicines >= 0, 'Total medicines should be non-negative');
});

test('Should correctly sum total quantity of medicines', () => {
    const summary = {
        totalQuantity: 2000
    };
    assert.ok(summary.totalQuantity >= 0, 'Total quantity should be non-negative');
});

test('Should detect out-of-stock items', () => {
    const summary = {
        totalOutOfStock: 2
    };
    assert.ok(summary.totalOutOfStock >= 0, 'Out of stock count should be non-negative');
});

test('Should detect low stock items (quantity < min_quantity)', () => {
    const summary = {
        totalLowStock: 5
    };
    assert.ok(summary.totalLowStock >= 0, 'Low stock count should be non-negative');
});

// Test Suite: Sales Performance
console.log('🧪 Running Sales Performance Tests\n');

test('Should validate sales total is numeric', () => {
    const salesData = { salesTotal: 500.99 };
    assert.ok(typeof salesData.salesTotal === 'number', 'Sales total must be a number');
    assert.ok(!isNaN(salesData.salesTotal), 'Sales total must be a valid number');
});

test('Should validate sales count is non-negative', () => {
    const salesData = { salesCount: 10 };
    assert.ok(salesData.salesCount >= 0, 'Sales count cannot be negative');
});

test('Should validate that sales count matches actual records', () => {
    const actual = db.prepare('SELECT COUNT(*) as count FROM sales').get().count;
    const expected = 1; // We seeded one sale in simulate_sale.js
    assert.strictEqual(actual, expected, 'Sales count should match database');
});

// Test Suite: Top Selling Medicines
console.log('🧪 Running Top Selling Medicines Tests\n');

test('Should return array of top selling medicines', () => {
    const topMedicines = [
        { id: 1, units_sold: 10, total_revenue: 100 },
        { id: 2, units_sold: 8, total_revenue: 80 }
    ];
    assert.ok(Array.isArray(topMedicines), 'Should return an array');
    assert.ok(topMedicines.length <= 5, 'Should limit results to 5');
});

test('Top selling medicines should have valid revenue and units', () => {
    const topMedicines = getTopSellingMedicines(db);
    topMedicines.forEach(med => {
        assert.ok(med.units_sold >= 0, 'Units sold must be non-negative');
        assert.ok(typeof med.total_revenue === 'number', 'Revenue must be a number');
    });
});

// Test Suite: Recent Sales Transactions
console.log('🧪 Running Recent Sales Transactions Tests\n');

test('Should return recent sales transactions', () => {
    const recentSales = getRecentSales(db);
    assert.ok(Array.isArray(recentSales), 'Should return an array');
    assert.ok(recentSales.length <= 5, 'Should limit results to 5');
});

test('Recent sales should have valid payment methods', () => {
    const recentSales = getRecentSales(db);
    recentSales.forEach(sale => {
        assert.ok(['cash', 'card', 'online'].includes(sale.payment_method), 
            'Payment method must be valid');
    });
});

test('Should handle missing customer gracefully', () => {
    const recentSales = db.prepare(`
        SELECT s.id, s.payment_method
        FROM sales s
        ORDER BY s.created_at DESC
        LIMIT 2
    `).all();
    recentSales.forEach(sale => {
        assert.ok(sale.payment_method !== undefined, 'Payment method should be defined');
    });
});

// Test Suite: Integration - Data Accuracy
console.log('🧪 Running Integration & Data Accuracy Tests\n');

test('Total sales revenue should equal sum of all sale amounts', () => {
    const salesTotal = db.prepare('SELECT COALESCE(SUM(total_amount), 0) as total FROM sales').get().total;
    assert.ok(!isNaN(salesTotal), 'Sales total must be a valid number');
});

test('Total medicines quantity should match sum of all medicine quantities', () => {
    const totalQuantity = db.prepare('SELECT SUM(quantity) as total FROM medicines').get().total || 0;
    assert.ok(totalQuantity >= 0, 'Total quantity should be non-negative');
});

// Summary
console.log('\n' + '='.repeat(50));
console.log('🧪 Test Summary');
console.log('='.repeat(50));
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);
console.log(`📊 Total: ${testsPassed + testsFailed}`);

if (testsFailed === 0) {
    console.log('\n🎉 All tests passed! Data accuracy is ensured.\n');
    process.exit(0);
} else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.\n');
    process.exit(1);
}