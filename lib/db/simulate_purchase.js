#!/usr/bin/env node

import Database from 'better-sqlite3';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdir, stat } from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = resolve(__dirname, '../../pharmacy.db');
console.log(`Database path: ${dbPath}`);

// Ensure the directory exists before creating the database
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

// Helper function to update medicine quantity
function updateMedicineQuantity(db, medicineId, quantityChange) {
    const update = db.prepare('UPDATE medicines SET quantity = quantity + ? WHERE id = ?');
    update.run(quantityChange, medicineId);
}

// Helper function to get a supplier ID by name
function getSupplierId(db, supplierName) {
    const result = db.prepare('SELECT id FROM suppliers WHERE name = ?').get(supplierName);
    return result?.id;
}

// Helper function to get a medicine ID by barcode
function getMedicineIdByBarcode(db, barcode) {
    const result = db.prepare('SELECT id, quantity FROM medicines WHERE barcode = ?').get(barcode);
    return result;
}

// Function to ensure purchases and purchase_items tables exist
function ensurePurchaseTables(db) {
    db.prepare(`
        CREATE TABLE IF NOT EXISTS purchases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
            invoice_number TEXT,
            total_amount REAL NOT NULL,
            status TEXT NOT NULL DEFAULT 'received',
            notes TEXT,
            created_at INTEGER NOT NULL DEFAULT (unixepoch())
        )
    `).run();
    
    db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON purchases(supplier_id)
    `).run();
    
    db.prepare(`
        CREATE TABLE IF NOT EXISTS purchase_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            purchase_id INTEGER NOT NULL REFERENCES purchases(id),
            medicine_id INTEGER NOT NULL REFERENCES medicines(id),
            quantity INTEGER NOT NULL,
            unit_price REAL NOT NULL,
            total_price REAL NOT NULL,
            expiry_date TEXT
        )
    `).run();
    
    db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON purchase_items(purchase_id)
    `).run();
    
    db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_purchase_items_medicine_id ON purchase_items(medicine_id)
    `).run();
}

// Helper function to insert a purchase record
function insertPurchase(db, purchase) {
    const purchaseId = db.prepare(`
        INSERT INTO purchases (supplier_id, invoice_number, total_amount, status, notes, created_at)
        VALUES (?, ?, ?, ?, ?, unixepoch())
    `).run(purchase.supplier_id, purchase.invoice_number, purchase.total_amount, purchase.status, purchase.notes).lastInsertRowid;

    console.log(`🔧 Created purchase record with ID: ${purchaseId}`);
    return purchaseId;
}

// Helper function to insert a purchase item
function insertPurchaseItem(db, item) {
    db.prepare(`
        INSERT INTO purchase_items (purchase_id, medicine_id, quantity, unit_price, total_price, expiry_date)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(
        item.purchase_id,
        item.medicine_id,
        item.quantity,
        item.unit_price,
        item.total_price,
        item.expiry_date
    );
    console.log(`🔧 Added purchase item: ${item.quantity}x Medicine ID ${item.medicine_id}`);
    updateMedicineQuantity(db, item.medicine_id, item.quantity);
    console.log(`📊 Updated medicine inventory: Medicine ID ${item.medicine_id} quantity +${item.quantity}`);
}

async function main() {
    await ensureDatabaseDirectoryExists(dbPath);
    const db = new Database(dbPath);
    try {
        db.pragma('foreign_keys = ON');
        ensurePurchaseTables(db);

        // Sample supplier
        const supplierName = 'PharmaCorp Solutions';
        const supplierId = getSupplierId(db, supplierName);
        if (!supplierId) {
            console.error('❌ Supplier not found!');
            process.exit(1);
        }

        // Sample purchase
        const invoiceNumber = `INV-${Date.now()}`;
        const purchaseNotes = 'Restock: Antibiotics and Antihistamines';

        const purchaseMedicines = [
            { barcode: '123456789012', quantity: 50, unit_price: 5.5 }, // Amoxicillin 500mg
            { barcode: '123456789014', quantity: 75, unit_price: 2.5 }  // Cetirizine 10mg
        ];

        let totalAmount = 0;
        const purchaseItems = [];

        purchaseMedicines.forEach(item => {
            const medicine = getMedicineIdByBarcode(db, item.barcode);
            if (!medicine) {
                console.error(`❌ Medicine with barcode ${item.barcode} not found!`);
                process.exit(1);
            }
            const totalPrice = item.quantity * item.unit_price;
            purchaseItems.push({
                purchase_id: null,
                medicine_id: medicine.id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total_price: totalPrice,
                expiry_date: null // Adjust if applicable
            });
            totalAmount += totalPrice;
        });
        totalAmount = parseFloat(totalAmount.toFixed(2));

        console.log('🔧 Simulating a purchase transaction...');

        // Step 1: Insert purchase record
        const purchaseRecord = {
            supplier_id: supplierId,
            invoice_number: invoiceNumber,
            total_amount: totalAmount,
            status: 'received',
            notes: purchaseNotes
        };
        const purchaseId = insertPurchase(db, purchaseRecord);
        purchaseItems.forEach(item => item.purchase_id = purchaseId);

        // Step 2: Add purchase items and update inventory
        console.log('🔧 Adding purchase items and updating inventory...');
        purchaseItems.forEach(item => insertPurchaseItem(db, item));

        // Final receipt simulation
        console.log('\n--- Purchase Receipt ---');
        console.log(`Supplier: ${supplierName}`);
        console.log(`Invoice: ${invoiceNumber}`);
        console.log(`Total Amount: $${totalAmount.toFixed(2)}`);
        console.log('\nItems:');
        const value = purchaseItems.map(item => `${item.quantity}x Medicine ID ${item.medicine_id} — $${item.total_price.toFixed(2)}`).join('\n');
        console.log(value);

        // Verify inventory updates
        const med1Qty = db.prepare('SELECT quantity FROM medicines WHERE id = 1').get().quantity;
        const med3Qty = db.prepare('SELECT quantity FROM medicines WHERE id = 3').get().quantity;

        console.log('\n--- Updated Inventory ---');
        console.log(`Amoxicillin 500mg (ID: 1) Quantity: ${med1Qty}`);
        console.log(`Cetirizine 10mg (ID: 3) Quantity: ${med3Qty}`);

        // Verify data
        const supplierCount = db.prepare('SELECT COUNT(*) as count FROM suppliers').get().count;
        const purchaseCount = db.prepare('SELECT COUNT(*) as count FROM purchases').get().count;
        const purchaseItemCount = db.prepare('SELECT COUNT(*) as count FROM purchase_items').get().count;

        console.log('\n--- Database Status After Purchase ---');
        console.log(`Suppliers: ${supplierCount}`);
        console.log(`Purchases: ${purchaseCount}`);
        console.log(`Purchase Items: ${purchaseItemCount}`);

    } catch (error) {
        console.error('❌ Error during purchase simulation:', error.message);
        process.exit(1);
    } finally {
        db.close();
    }

    console.log('\n✨ Purchase simulation completed successfully!');
}

main().catch(console.error);