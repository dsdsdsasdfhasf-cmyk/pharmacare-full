#!/usr/bin/env node

import Database from 'better-sqlite3';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath =
  process.env.DATABASE_URL ||
  (process.env.VERCEL ? '/tmp/pharmacy.db' : resolve(__dirname, '../../pharmacy.db'));
console.log(`Database path: ${dbPath}`);

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

// Sample categories
const sampleCategories = [
    { name: 'Antibiotics', description: 'Medications to treat bacterial infections' },
    { name: 'Pain Relievers', description: 'Medications to relieve pain' },
    { name: 'Antihistamines', description: 'Medications to treat allergies' },
    { name: 'Antacids', description: 'Medications to treat acid reflux' },
    { name: 'Vitamins', description: 'Vitamins and supplements' },
    { name: 'Cough Syrups', description: 'Liquid medications for cough relief' },
    { name: 'First Aid', description: 'Basic first aid supplies' },
    { name: 'Cardiovascular', description: 'Medications for heart and blood pressure' }
];

// Sample suppliers
const sampleSuppliers = [
    {
        name: 'PharmaCorp Solutions',
        contact_person: 'John Doe',
        phone: '+1-555-123-4567',
        email: 'sales@pharmacorp.com',
        address: '123 Health St, Medical City, MC 12345'
    },
    {
        name: 'MediLife Distributors',
        contact_person: 'Jane Smith',
        phone: '+1-555-987-6543',
        email: 'info@medilife.com',
        address: '456 Wellness Ave, Medical Town, MT 67890'
    },
    {
        name: 'VitaMax Health',
        contact_person: 'Alice Johnson',
        phone: '+1-555-456-7890',
        email: 'orders@vitahealth.com',
        address: '789 Vitality Blvd, Wellness City, WC 54321'
    }
];

// Sample medicines (with references to categories and suppliers)
const sampleMedicines = [
    {
        name: 'Amoxicillin 500mg',
        generic_name: 'Amoxicillin',
        barcode: '123456789012',
        category: 'Antibiotics',
        supplier: 'PharmaCorp Solutions',
        quantity: 150,
        min_quantity: 20,
        purchase_price: 5.5,
        selling_price: 7.99,
        expiry_date: '2027-12-31',
        location: 'Aisle 3, Shelf B',
        description: 'Broad-spectrum antibiotic for bacterial infections',
        requires_prescription: true
    },
    {
        name: 'Paracetamol 500mg',
        generic_name: 'Paracetamol',
        barcode: '123456789013',
        category: 'Pain Relievers',
        supplier: 'MediLife Distributors',
        quantity: 300,
        min_quantity: 50,
        purchase_price: 0.8,
        selling_price: 1.99,
        expiry_date: '2027-11-30',
        location: 'Aisle 1, Shelf A',
        description: 'Pain reliever and fever reducer',
        requires_prescription: false
    },
    {
        name: 'Cetirizine 10mg',
        generic_name: 'Cetirizine',
        barcode: '123456789014',
        category: 'Antihistamines',
        supplier: 'VitaMax Health',
        quantity: 200,
        min_quantity: 30,
        purchase_price: 2.5,
        selling_price: 4.99,
        expiry_date: '2027-10-31',
        location: 'Aisle 2, Shelf B',
        description: 'Antihistamine for allergy relief',
        requires_prescription: false
    },
    {
        name: 'Omeprazole 20mg',
        generic_name: 'Omeprazole',
        barcode: '123456789015',
        category: 'Antacids',
        supplier: 'PharmaCorp Solutions',
        quantity: 100,
        min_quantity: 15,
        purchase_price: 4.0,
        selling_price: 6.99,
        expiry_date: '2027-09-30',
        location: 'Aisle 4, Shelf A',
        description: 'Proton pump inhibitor for acid reflux',
        requires_prescription: true
    },
    {
        name: 'Vitamin D3 1000IU',
        generic_name: 'Cholecalciferol',
        barcode: '123456789016',
        category: 'Vitamins',
        supplier: 'MediLife Distributors',
        quantity: 180,
        min_quantity: 25,
        purchase_price: 3.2,
        selling_price: 5.49,
        expiry_date: '2028-03-31',
        location: 'Aisle 5, Shelf C',
        description: 'Vitamin D supplement for bone health',
        requires_prescription: false
    },
    {
        name: 'Dextromethorphan Cough Syrup',
        generic_name: 'Dextromethorphan',
        barcode: '123456789017',
        category: 'Cough Syrups',
        supplier: 'VitaMax Health',
        quantity: 120,
        min_quantity: 20,
        purchase_price: 2.0,
        selling_price: 3.99,
        expiry_date: '2027-08-31',
        location: 'Aisle 6, Shelf D',
        description: 'Cough suppressant syrup',
        requires_prescription: false
    },
    {
        name: 'Adrenaline Auto-Injector',
        generic_name: 'Epinephrine',
        barcode: '123456789018',
        category: 'First Aid',
        supplier: 'PharmaCorp Solutions',
        quantity: 50,
        min_quantity: 10,
        purchase_price: 25.0,
        selling_price: 39.99,
        expiry_date: '2027-06-30',
        location: 'Aisle 7, Security Cabinet',
        description: 'Emergency allergy treatment',
        requires_prescription: true
    },
    {
        name: 'Aspirin 81mg',
        generic_name: 'Aspirin',
        barcode: '123456789019',
        category: 'Cardiovascular',
        supplier: 'MediLife Distributors',
        quantity: 250,
        min_quantity: 40,
        purchase_price: 1.5,
        selling_price: 2.99,
        expiry_date: '2027-07-31',
        location: 'Aisle 8, Shelf B',
        description: 'Low-dose aspirin for heart health',
        requires_prescription: true
    }
];

// Seed categories
console.log('🔧 Seeding categories...');
sampleCategories.forEach(category => {
    db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)')
        .run(category.name, category.description);
});
console.log(`✅ Seeded ${sampleCategories.length} categories`);

// Get category IDs
const categoryIds = {};
sampleCategories.forEach(category => {
    const row = db.prepare('SELECT id FROM categories WHERE name = ?').get(category.name);
    categoryIds[category.name] = row.id;
});

// Seed suppliers
console.log('🔧 Seeding suppliers...');
sampleSuppliers.forEach(supplier => {
    db.prepare(`INSERT INTO suppliers 
               (name, contact_person, phone, email, address, created_at) 
               VALUES (?, ?, ?, ?, ?, unixepoch())`)
        .run(
            supplier.name,
            supplier.contact_person,
            supplier.phone,
            supplier.email,
            supplier.address
        );
});
console.log(`✅ Seeded ${sampleSuppliers.length} suppliers`);

// Get supplier IDs
const supplierIds = {};
sampleSuppliers.forEach(supplier => {
    const row = db.prepare('SELECT id FROM suppliers WHERE name = ?').get(supplier.name);
    supplierIds[supplier.name] = row.id;
});

// Seed medicines
console.log('🔧 Seeding medicines...');
const medicineIds = {};
sampleMedicines.forEach(medicine => {
    const categoryId = categoryIds[medicine.category];
    const supplierId = supplierIds[medicine.supplier];

    const info = db.prepare(`INSERT INTO medicines 
               (name, generic_name, barcode, category_id, supplier_id, quantity, min_quantity, 
                purchase_price, selling_price, expiry_date, location, description, 
                requires_prescription, created_at) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())`)
        .run(
            medicine.name,
            medicine.generic_name,
            medicine.barcode,
            categoryId,
            supplierId,
            medicine.quantity,
            medicine.min_quantity,
            medicine.purchase_price,
            medicine.selling_price,
            medicine.expiry_date,
            medicine.location,
            medicine.description,
            medicine.requires_prescription ? 1 : 0
        );
    medicineIds[medicine.name] = Number(info.lastInsertRowid);
});
console.log(`✅ Seeded ${sampleMedicines.length} medicines`);

// Seed a sample customer
console.log('🔧 Seeding customer...');
const customerInfo = db.prepare(
    `INSERT INTO customers (name, phone, email, address, date_of_birth, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, unixepoch())`
).run(
    'Mohamed Ali',
    '+1-555-111-2222',
    'mohamed@example.com',
    '12 Nile St',
    '1990-05-12',
    'Regular customer'
);
const customerId = Number(customerInfo.lastInsertRowid);
console.log('✅ Seeded 1 customer');

// Seed a sample prescription for the customer
console.log('🔧 Seeding prescription...');
const prescriptionInfo = db.prepare(
    `INSERT INTO prescriptions (customer_id, doctor_name, doctor_specialty, status, notes, created_at)
     VALUES (?, ?, ?, ?, ?, unixepoch())`
).run(
    customerId,
    'Dr. Hossam',
    'General Practice',
    'completed',
    'Take twice daily'
);
const prescriptionId = Number(prescriptionInfo.lastInsertRowid);
console.log('✅ Seeded 1 prescription');

// Seed a sample sale with line items
console.log('🔧 Seeding sale...');
const saleInfo = db.prepare(
    `INSERT INTO sales (customer_id, prescription_id, total_amount, discount, payment_method, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, unixepoch())`
).run(
    customerId,
    prescriptionId,
    15.97,
    0,
    'cash',
    'completed'
);
const saleId = Number(saleInfo.lastInsertRowid);
db.prepare(
    'INSERT INTO sale_items (sale_id, medicine_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)'
).run(saleId, medicineIds['Paracetamol 500mg'], 2, 1.99, 3.98);
db.prepare(
    'INSERT INTO sale_items (sale_id, medicine_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)'
).run(saleId, medicineIds['Cetirizine 10mg'], 2, 4.99, 9.98);
db.prepare(
    'INSERT INTO sale_items (sale_id, medicine_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)'
).run(saleId, medicineIds['Vitamin D3 1000IU'], 1, 2.01, 2.01);
console.log('✅ Seeded 1 sale with 3 items');

// Seed a sample purchase with line items
console.log('🔧 Seeding purchase...');
const purchaseInfo = db.prepare(
    `INSERT INTO purchases (supplier_id, invoice_number, total_amount, status, created_at)
     VALUES (?, ?, ?, ?, unixepoch())`
).run(
    supplierIds['MediLife Distributors'],
    'INV-2024-001',
    540.0,
    'received'
);
const purchaseId = Number(purchaseInfo.lastInsertRowid);
db.prepare(
    'INSERT INTO purchase_items (purchase_id, medicine_id, quantity, unit_price, total_price, expiry_date) VALUES (?, ?, ?, ?, ?, ?)'
).run(purchaseId, medicineIds['Paracetamol 500mg'], 100, 0.8, 80.0, '2027-11-30');
db.prepare(
    'INSERT INTO purchase_items (purchase_id, medicine_id, quantity, unit_price, total_price, expiry_date) VALUES (?, ?, ?, ?, ?, ?)'
).run(purchaseId, medicineIds['Cetirizine 10mg'], 100, 2.5, 250.0, '2027-10-31');
db.prepare(
    'INSERT INTO purchase_items (purchase_id, medicine_id, quantity, unit_price, total_price, expiry_date) VALUES (?, ?, ?, ?, ?, ?)'
).run(purchaseId, medicineIds['Vitamin D3 1000IU'], 100, 3.2, 320.0, '2028-03-31');
console.log('✅ Seeded 1 purchase with 3 items');

// Verify counts
const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;
const supplierCount = db.prepare('SELECT COUNT(*) as count FROM suppliers').get().count;
const medicineCount = db.prepare('SELECT COUNT(*) as count FROM medicines').get().count;
const customerCount = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;
const prescriptionCount = db.prepare('SELECT COUNT(*) as count FROM prescriptions').get().count;
const saleCount = db.prepare('SELECT COUNT(*) as count FROM sales').get().count;
const saleItemCount = db.prepare('SELECT COUNT(*) as count FROM sale_items').get().count;
const purchaseCount = db.prepare('SELECT COUNT(*) as count FROM purchases').get().count;
const purchaseItemCount = db.prepare('SELECT COUNT(*) as count FROM purchase_items').get().count;

console.log('\n--- Seeded Data Summary ---');
console.log(`Categories:    ${categoryCount}`);
console.log(`Suppliers:     ${supplierCount}`);
console.log(`Medicines:     ${medicineCount}`);
console.log(`Customers:     ${customerCount}`);
console.log(`Prescriptions: ${prescriptionCount}`);
console.log(`Sales:         ${saleCount}`);
console.log(`Sale items:    ${saleItemCount}`);
console.log(`Purchases:     ${purchaseCount}`);
console.log(`Purchase items:${purchaseItemCount}`);

db.close();
console.log('\n✨ Sample data seeded successfully!');
