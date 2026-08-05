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

// Function to create tables if they don't exist
function createDatabaseTables(db) {
    const tableSqls = [
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
        `CREATE TABLE IF NOT EXISTS sale_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sale_id INTEGER NOT NULL REFERENCES sales(id),
            medicine_id INTEGER NOT NULL REFERENCES medicines(id),
            quantity INTEGER NOT NULL,
            unit_price REAL NOT NULL,
            total_price REAL NOT NULL
        )`
    ];

    for (const sql of tableSqls) {
        db.prepare(sql).run();
    }
}

// Helper function to check if a medicine exists and get its ID
function getMedicineId(db, barcode) {
    const result = db.prepare('SELECT id FROM medicines WHERE barcode = ?').get(barcode);
    return result?.id;
}

// Helper function to insert a customer if not exists
function insertCustomerIfNotExists(db, customer) {
    const existingCustomer = db.prepare('SELECT id FROM customers WHERE phone = ? OR email = ?')
        .get(customer.phone, customer.email);

    if (existingCustomer) {
        return existingCustomer.id;
    }

    const customerId = db.prepare('INSERT INTO customers (name, phone, email, address, date_of_birth, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, unixepoch())')
        .run(customer.name, customer.phone, customer.email, customer.address, customer.dob, customer.notes)
        .lastInsertRowid;

    console.log(`🔧 Created customer: ${customer.name}`);
    return customerId;
}

// Helper function to insert a prescription
function insertPrescription(db, prescription) {
    const prescriptionId = db.prepare('INSERT INTO prescriptions (customer_id, doctor_name, doctor_specialty, status, notes, created_at) VALUES (?, ?, ?, ?, ?, unixepoch())')
        .run(prescription.customer_id, prescription.doctor_name, prescription.doctor_specialty, prescription.status, prescription.notes)
        .lastInsertRowid;

    console.log(`🔧 Created prescription for customer ID: ${prescription.customer_id}`);
    return prescriptionId;
}

// Helper function to insert a sale record
function insertSale(db, sale) {
    const saleId = db.prepare('INSERT INTO sales (customer_id, prescription_id, total_amount, discount, payment_method, status, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch())')
        .run(sale.customer_id, sale.prescription_id, sale.total_amount, sale.discount, sale.payment_method, sale.status, sale.notes)
        .lastInsertRowid;

    console.log(`🔧 Created sale record with ID: ${saleId}`);
    return saleId;
}

// Helper function to insert a sale item
function insertSaleItem(db, saleItem) {
    db.prepare('INSERT INTO sale_items (sale_id, medicine_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)')
        .run(saleItem.sale_id, saleItem.medicine_id, saleItem.quantity, saleItem.unit_price, saleItem.total_price);
    console.log(`🔧 Added sale item: ${saleItem.quantity}x Medicine ID ${saleItem.medicine_id}`);
}


async function main() {
    await ensureDatabaseDirectoryExists(dbPath);
    const db = new Database(dbPath);
    try {
        db.pragma('foreign_keys = ON');
        createDatabaseTables(db);

        // Sample customer
        const customer = {
            name: 'John Doe',
            phone: '+1-555-111-2222',
            email: 'john.doe@example.com',
            address: '123 Main St, Medical Town, MT 67891',
            dob: '1985-05-15',
            notes: 'Chronic allergy sufferer'
        };

        // Sample prescription
        const prescription = {
            customer_id: null,
            doctor_name: 'Dr. Smith',
            doctor_specialty: 'General Practitioner',
            status: 'completed',
            notes: 'Amoxicillin for strep throat'
        };

        // Sample sale
        const sale = {
            customer_id: null,
            prescription_id: null,
            total_amount: 0,
            discount: 5.00,
            payment_method: 'cash',
            status: 'completed',
            notes: 'Payment received in cash'
        };

        // Sale items (medicines with barcodes)
        const saleMedicines = [
            { barcode: '123456789012', quantity: 2, unit_price: 7.99 }, // Amoxicillin 500mg
            { barcode: '123456789014', quantity: 1, unit_price: 4.99 }  // Cetirizine 10mg
        ];
        const saleItems = [];

        console.log('🔧 Simulating a sale transaction...');

        // Step 1: Insert customer
        const customerId = insertCustomerIfNotExists(db, customer);
        sale.customer_id = customerId;
        prescription.customer_id = customerId;

        // Step 2: Insert prescription
        const prescriptionId = insertPrescription(db, prescription);
        sale.prescription_id = prescriptionId;

        // Step 3: Calculate total and create sale
        saleMedicines.forEach(item => {
            const medicineId = getMedicineId(db, item.barcode);
            if (!medicineId) {
                console.error(`❌ Medicine with barcode ${item.barcode} not found!`);
                process.exit(1);
            }
            const totalPrice = item.quantity * item.unit_price;
            saleItems.push({ sale_id: null, medicine_id: medicineId, quantity: item.quantity, unit_price: item.unit_price, total_price: totalPrice });
            sale.total_amount += totalPrice;
        });

        // Round total and discount to 2 decimal places
        sale.total_amount = parseFloat(sale.total_amount.toFixed(2));

        // Step 4: Insert sale record
        const insertResult = insertSale(db, sale);
        saleItems.forEach(item => item.sale_id = insertResult);

        // Step 5: Add sale items
        console.log('🔧 Adding sale items...');
        saleItems.forEach(item => insertSaleItem(db, item));

        // Final receipt simulation
        console.log('\n--- Sale Receipt ---');
        console.log(`Customer: ${customer.name}`);
        console.log(`Prescription: ${prescription.notes}`);
        console.log(`Payment Method: ${sale.payment_method.toUpperCase()}`);
        console.log(`Subtotal: $${(sale.total_amount + sale.discount).toFixed(2)}`);
        console.log(`Discount: $${sale.discount.toFixed(2)}`);
        console.log(`Total Paid: $${sale.total_amount.toFixed(2)}`);
        console.log('\nItems:');
        const value = saleItems.map(item => `${item.quantity}x Medicine ID ${item.medicine_id} - $${item.total_price.toFixed(2)}`).join('\n');
        console.log(value);

        // Verify data
        const customerCount = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;
        const prescriptionCount = db.prepare('SELECT COUNT(*) as count FROM prescriptions').get().count;
        const saleCount = db.prepare('SELECT COUNT(*) as count FROM sales').get().count;
        const saleItemCount = db.prepare('SELECT COUNT(*) as count FROM sale_items').get().count;

        console.log('\n--- Database Status After Sale ---');
        console.log(`Customers: ${customerCount}`);
        console.log(`Prescriptions: ${prescriptionCount}`);
        console.log(`Sales: ${saleCount}`);
        console.log(`Sale Items: ${saleItemCount}`);
        
    } catch (error) {
        console.error('❌ Error during sale simulation:', error.message);
        process.exit(1);
    } finally {
        db.close();
    }

    console.log('\n✨ Sale simulation completed successfully!');
}

main().catch(console.error);