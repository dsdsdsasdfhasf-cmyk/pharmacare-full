const { Document, Packer, Paragraph, TextRun, AlignmentType } = require("docx");
const fs = require("fs");
const path = require("path");

function createHeading(text, level, color = "148c78") {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 240, after: 120 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: level === 1 ? 32 : level === 2 ? 26 : 22,
        color,
        font: "Segoe UI",
      }),
    ],
  });
}

function createParagraph(text, isBold = false, size = 22, color = "1f2937") {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after: 120 },
    children: [
      new TextRun({
        text,
        bold: isBold,
        size,
        color,
        font: "Segoe UI",
      }),
    ],
  });
}

function createBulletPoint(text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after: 60 },
    children: [
      new TextRun({
        text: "• " + text,
        size: 22,
        font: "Segoe UI",
      }),
    ],
  });
}

const doc = new Document({
  sections: [
    {
      properties: {},
      children: [
        // Cover Page
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 1500, after: 200 },
          children: [
            new TextRun({
              text: "PHARMACARE",
              bold: true,
              size: 56,
              color: "148c78",
              font: "Segoe UI",
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 800 },
          children: [
            new TextRun({
              text: "Integrated & Smart Pharmacy Management System",
              bold: true,
              size: 28,
              color: "10b981",
              font: "Segoe UI",
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 2000 },
          children: [
            new TextRun({
              text: "Project Documentation, Installation Guide & Feature Walkthrough",
              size: 24,
              color: "4b5563",
              font: "Segoe UI",
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [
            new TextRun({
              text: `Date: ${new Date().toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' })}`,
              size: 22,
              font: "Segoe UI",
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [
            new TextRun({
              text: "Author: AI Coding Assistant (Antigravity)",
              size: 22,
              font: "Segoe UI",
            }),
          ],
        }),
        
        // Page Break
        new Paragraph({ text: "", pageBreakBefore: true }),

        createHeading("1. Project Introduction", 1),
        createParagraph("PharmaCare is a modern, intuitive, and highly automated pharmacy management application designed to streamline daily pharmacy operations, track sales and purchases, and accurately monitor inventory levels. Built using a modern monorepo setup, it ensures speed, reliability, and modularity."),

        createHeading("Core System Features:", 2),
        createBulletPoint("Dashboard: Provides real-time insights into key performance indicators, including today's revenues, invoice count, critical low-stock items, and active customer counts."),
        createBulletPoint("POS (Point of Sale): Features an interactive cashier desk with barcode scanner detection, instant database lookup, and prescription requirement alerts."),
        createBulletPoint("Management Modules: Complete CRUD functionalities for Medicines, Customers, Suppliers, Categories, Prescriptions, and Purchases."),
        createBulletPoint("Stock Alerts: An automated background engine notification system for expiring and low-stock items."),

        createHeading("2. Technical Stack & Architecture", 1),
        createParagraph("The architecture utilizes best-in-class programming models to guarantee robust stability and responsive UI performance:"),
        createBulletPoint("Database Layer: SQLite running in WAL mode, mapped via Drizzle ORM for lightning-fast and type-safe database queries."),
        createBulletPoint("Backend Layer (API): Express REST APIs structured in modular routes managing separate data operations."),
        createBulletPoint("Frontend Layer (UI): React application built on Vite, styled with Tailwind CSS, utilizing component designs inspired by Shadcn UI."),
        createBulletPoint("State Caching: TanStack React Query, ensuring smooth client-side data updates without layout freezing."),

        createHeading("Core Repository Directory Layout:", 2),
        createBulletPoint("lib/db: Configures Drizzle schemas, migrations, configurations, and database seeding scripts."),
        createBulletPoint("artifacts/api-server: Launches the Express server and exposes REST endpoints for sales, settings, and databases."),
        createBulletPoint("artifacts/pharmacy: Represents the web frontend SPA housing client page views."),

        createHeading("3. Accomplished Technical Fixes & Enhancements", 1),
        createParagraph("During our pair programming session, we successfully resolved several technical problems and delivered premium user features:"),
        
        createHeading("A) Resolved Windows Execution & Startup Crashes:", 3),
        createParagraph("The application originally crashed due to Batch script parser issues when directory paths contained spaces or parenthesis (e.g. 'New folder (2)'). We rewrote the launcher into a programmatic Node.js runner (run.js) that installs dependencies, compiles packages, and runs processes concurrently without syntax crashes."),

        createHeading("B) Unified SQLite Database Path Mapping:", 3),
        createParagraph("Previously, multiple database files were created in separate directories. We consolidated connection endpoints to reference a single root database file (pharmacy.db), resolving configuration drift across Drizzle environments."),

        createHeading("C) Optimized POS Barcode Scanner Lookup:", 3),
        createParagraph("Improved the barcode reader logic to issue direct API database fetches. Scanned barcodes are now resolved instantly regardless of active search input filters applied on the frontend list."),

        createHeading("D) JSON Backup Restore (New Feature):", 3),
        createParagraph("Implemented a secure uploader in Settings that allows users to upload a JSON backup. The API temporarily suspends SQLite foreign keys, drops old tables in order, inserts the backup data, re-enables constraints, and invalidates client-side React Query caches automatically."),

        createHeading("E) Excel & PDF Export Capabilities (New Feature):", 3),
        createParagraph("Added instant Excel (.xlsx) and PDF download exports on the Medicines and Sales lists using SheetJS (XLSX) and custom jsPDF tables."),

        createHeading("F) High-Fidelity Dashboard Analytics (New Feature):", 3),
        createParagraph("Refactored Area & Bar charts with styled custom Tooltips and gradient area stops. Added a Payment Methods donut chart displaying revenue splits among Cash, Card, and Insurance."),

        createHeading("4. Operational & Run Guide", 1),
        createParagraph("To execute the project locally, complete the following steps:"),
        createBulletPoint("Run the run.bat file in the root workspace directory."),
        createBulletPoint("The script automatically inspects dependencies, checks if SQLite is initialized (seeding it if missing), builds shared libraries, and launches the backend and frontend simultaneously."),
      ],
    },
  ],
});

const downloadsPath = path.join("C:", "Users", "makah", "Downloads");
if (!fs.existsSync(downloadsPath)) {
  fs.mkdirSync(downloadsPath, { recursive: true });
}
const outputFile = path.join(downloadsPath, "PharmaCare_Documentation.docx");

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(outputFile, buffer);
  console.log(`Document generated successfully at: ${outputFile}`);
}).catch((err) => {
  console.error("Error generating document:", err);
  process.exit(1);
});
