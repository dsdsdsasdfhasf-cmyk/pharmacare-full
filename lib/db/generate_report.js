#!/usr/bin/env node

import Database from 'better-sqlite3';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { format } from 'date-fns';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = resolve(__dirname, '../../pharmacy.db');
console.log(`🔧 Generating report from database: ${dbPath}\n`);

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

// Helper function to format currency
const formatCurrency = (value) => `$${value.toFixed(2)}`;

// Get total medicines with low stock (quantity below min_quantity)
function getLowStockMedicines(db) {
    return db.prepare(`
        SELECT m.id, m.name, m.generic_name, m.quantity, m.min_quantity, s.name as supplier
        FROM medicines m
        LEFT JOIN suppliers s ON m.supplier_id = s.id
        WHERE m.quantity < m.min_quantity
    `).all();
}

// Get inventory summary
function getInventorySummary(db) {
    const totalMedicines = db.prepare('SELECT COUNT(*) as count FROM medicines').get().count;
    const totalQuantity = db.prepare('SELECT SUM(quantity) as total FROM medicines').get().total || 0;
    const totalOutOfStock = db.prepare('SELECT COUNT(*) as count FROM medicines WHERE quantity = 0').get().count;
    const totalLowStock = getLowStockMedicines(db).length;
    
    return { totalMedicines, totalQuantity, totalOutOfStock, totalLowStock };
}

// Get recent sales summary (last 30 days)
function getRecentSalesSummary(db) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const salesTotal = db.prepare(`
        SELECT COALESCE(SUM(total_amount), 0) as total
        FROM sales
        WHERE created_at >= unixepoch('${format(thirtyDaysAgo, 'yyyy-MM-dd')}')
    `).get().total;
        
    const salesCount = db.prepare(`
        SELECT COUNT(*) as count
        FROM sales
        WHERE created_at >= unixepoch('${format(thirtyDaysAgo, 'yyyy-MM-dd')}')
    `).get().count;
        
    return { salesTotal, salesCount };
}

// Get top 5 best-selling medicines
function getTopSellingMedicines(db) {
    return db.prepare(`
        SELECT 
            m.id, 
            m.name, 
            m.generic_name,
            SUM(si.quantity) as units_sold,
            SUM(si.total_price) as total_revenue
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.id
        JOIN medicines m ON si.medicine_id = m.id
        WHERE s.created_at >= unixepoch('2026-06-03')
        GROUP BY m.id, m.name, m.generic_name
        ORDER BY units_sold DESC
        LIMIT 5
    `).all();
}

// Get recent sale transactions (last 5)
function getRecentSales(db) {
    return db.prepare(`
        SELECT s.id, s.created_at, s.total_amount, s.payment_method, c.name as customer
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        ORDER BY s.created_at DESC
        LIMIT 5
    `).all().map(sale => {
        return {
            ...sale,
            created_at: format(new Date(sale.created_at * 1000), 'yyyy-MM-dd HH:mm')
        };
    });
}

// Main report generation
console.log('='.repeat(60));
console.log('📊 PHARMACARE INVENTORY & SALES REPORT');
console.log('='.repeat(60));

console.log('\n📦 INVENTORY SUMMARY');
console.log('-'.repeat(60));

const inventory = getInventorySummary(db);
console.log(`Total Medicines: ${inventory.totalMedicines}`);
console.log(`Total Stock Quantity: ${inventory.totalQuantity}`);
console.log(`Out of Stock: ${inventory.totalOutOfStock}`);
console.log(`Low Stock: ${inventory.totalLowStock} (below minimum threshold)`);

console.log('\n🚨 LOW STOCK ITEMS');
console.log('-'.repeat(60));
const lowStock = getLowStockMedicines(db);
if (lowStock.length > 0) {
    console.log('ID | Medicine Name | Available | Minimum | Supplier');
    console.log('-'.repeat(60));
    lowStock.forEach(med => {
        console.log(`${med.id.toString().padEnd(3)} | ${med.name.padEnd(20)} | ${med.quantity.toString().padEnd(9)} | ${med.min_quantity.toString().padEnd(7)} | ${med.supplier || 'N/A'}`);
    });
} else {
    console.log('✅ No items currently low in stock!');
}

console.log('\n📈 LAST 30 DAYS SALES PERFORMANCE');
console.log('-'.repeat(60));

const salesSummary = getRecentSalesSummary(db);
console.log(`Total Sales Transactions: ${salesSummary.salesCount}`);
console.log(`Total Revenue: ${formatCurrency(salesSummary.salesTotal)}`);

console.log('\n🏆 TOP 5 BEST-SELLING MEDICINES (Last 30 Days)');
console.log('-'.repeat(60));
const topMedicines = getTopSellingMedicines(db);
if (topMedicines.length > 0) {
    console.log('ID | Name                | Units Sold | Revenue       ');
    console.log('-'.repeat(60));
    topMedicines.forEach(med => {
        console.log(`${med.id.toString().padEnd(3)} | ${med.name.padEnd(19)} | ${med.units_sold.toString().padEnd(9)} | ${formatCurrency(med.total_revenue)}`);
    });
} else {
    console.log('No sales data available for the last 30 days.');
}

console.log('\n📋 RECENT SALE TRANSACTIONS (Last 5)');
console.log('-'.repeat(60));
const recentSales = getRecentSales(db);
if (recentSales.length > 0) {
    console.log('ID | Date/Time         | Amount      | Payment | Customer ');
    console.log('-'.repeat(60));
    recentSales.forEach(sale => {
        console.log(`${sale.id.toString().padEnd(3)} | ${sale.created_at.padEnd(18)} | ${formatCurrency(sale.total_amount).padEnd(12)} | ${sale.payment_method.padEnd(7)} | ${sale.customer || 'N/A'}`);
    });
} else {
    console.log('No recent sales transactions found.');
}

console.log('\n' + '='.repeat(60));
console.log('📌 RECOMMENDATIONS');
console.log('-'.repeat(60));
if (lowStock.length > 0) {
    console.log('⚠️  Restock the following items ASAP:');
    lowStock.forEach(med => console.log(`   • ${med.name} (currently ${med.quantity}, min ${med.min_quantity})`));
}
if (inventory.totalOutOfStock > 0) {
    console.log(`📦 ${inventory.totalOutOfStock} medicines are out of stock and need to be reordered.`);
}
if (salesSummary.salesCount > 0 && salesSummary.salesTotal > 0) {
    console.log(`💰 Good performance! ${formatCurrency(salesSummary.salesTotal)} in revenue in the last 30 days.`);
} else {
    console.log('📊 Monitor sales performance closely; recent sales data is limited.');
}

console.log('\n✅ Report generated successfully!');

db.close();