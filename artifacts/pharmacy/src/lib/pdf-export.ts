import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const PHARMACY_NAME = "PharmaCare — نظام إدارة الصيدلية";
const CURRENCY = "ج.م";

function arabicDate(date = new Date()) {
  return date.toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
}

function addHeader(doc: jsPDF, title: string, subtitle?: string) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(PHARMACY_NAME, doc.internal.pageSize.width / 2, 18, { align: "center" });

  doc.setFontSize(13);
  doc.text(title, doc.internal.pageSize.width / 2, 27, { align: "center" });

  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(subtitle, doc.internal.pageSize.width / 2, 34, { align: "center" });
    doc.setTextColor(0);
  }

  doc.setDrawColor(180);
  doc.line(14, 39, doc.internal.pageSize.width - 14, 39);
  return 44;
}

function addFooter(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    const w = doc.internal.pageSize.width;
    const h = doc.internal.pageSize.height;
    doc.text(`صفحة ${i} / ${pages}`, w / 2, h - 8, { align: "center" });
    doc.text(`تاريخ الطباعة: ${arabicDate()}`, 14, h - 8);
    doc.setTextColor(0);
  }
}

// ─── Profit/Loss Report ───────────────────────────────────────────────────────
interface ProfitLoss {
  totalRevenue: number; totalCost: number; profit: number;
  profitMargin: number; totalSales: number; totalItems: number;
}
interface MedicineProfitRow {
  medicineName: string; genericName: string;
  totalQuantitySold: number; totalRevenue: number; totalCost: number; profit: number;
}

export function exportProfitLossPDF(
  profitLoss: ProfitLoss,
  byMedicine: MedicineProfitRow[],
  period: string,
) {
  const periodLabel: Record<string, string> = {
    today: "اليوم", week: "آخر 7 أيام", month: "هذا الشهر", all: "الكل",
  };
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const startY = addHeader(doc, "تقرير الأرباح والخسائر", `الفترة: ${periodLabel[period] ?? period}`);

  // Summary boxes
  const summaryData = [
    ["إجمالي الإيرادات", `${profitLoss.totalRevenue.toFixed(2)} ${CURRENCY}`],
    ["إجمالي التكلفة", `${profitLoss.totalCost.toFixed(2)} ${CURRENCY}`],
    ["صافي الربح", `${profitLoss.profit.toFixed(2)} ${CURRENCY}`],
    ["هامش الربح", `${profitLoss.profitMargin.toFixed(1)}%`],
    ["عدد الفواتير", String(profitLoss.totalSales)],
    ["الأصناف المباعة", String(profitLoss.totalItems)],
  ];

  autoTable(doc, {
    startY,
    head: [["البيان", "القيمة"]],
    body: summaryData,
    styles: { font: "helvetica", halign: "right", fontSize: 11 },
    headStyles: { fillColor: [20, 140, 120], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 250, 248] },
    columnStyles: { 1: { fontStyle: "bold" } },
    margin: { left: 14, right: 14 },
  });

  if (byMedicine.length > 0) {
    const afterSummary = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("الأرباح حسب الدواء (أعلى 20)", doc.internal.pageSize.width - 14, afterSummary, { align: "right" });

    autoTable(doc, {
      startY: afterSummary + 5,
      head: [["الدواء", "الاسم العلمي", "الكمية", "الإيرادات", "التكلفة", "الربح"]],
      body: byMedicine.map(r => [
        r.medicineName,
        r.genericName,
        String(r.totalQuantitySold),
        `${r.totalRevenue.toFixed(2)} ${CURRENCY}`,
        `${r.totalCost.toFixed(2)} ${CURRENCY}`,
        `${r.profit >= 0 ? "+" : ""}${r.profit.toFixed(2)} ${CURRENCY}`,
      ]),
      styles: { font: "helvetica", halign: "right", fontSize: 9 },
      headStyles: { fillColor: [20, 140, 120], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 250, 248] },
      didParseCell(data) {
        if (data.column.index === 5 && data.section === "body") {
          const val = parseFloat(String(data.cell.raw).replace("+", ""));
          data.cell.styles.textColor = val >= 0 ? [0, 130, 80] : [200, 0, 0];
          data.cell.styles.fontStyle = "bold";
        }
      },
      margin: { left: 14, right: 14 },
    });
  }

  addFooter(doc);
  doc.save(`profit-loss-${period}-${Date.now()}.pdf`);
}

// ─── Expiring Medicines Report ───────────────────────────────────────────────
interface ExpiringMedicine {
  name: string; genericName: string; quantity: number;
  expiryDate: string; potentialLoss: number;
}

export function exportExpiringPDF(medicines: ExpiringMedicine[], days: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const startY = addHeader(doc, "تقرير الأدوية منتهية الصلاحية", `الأدوية التي ستنتهي خلال ${days} يوم`);

  const now = Date.now();
  autoTable(doc, {
    startY,
    head: [["الدواء", "الاسم العلمي", "الكمية", "تاريخ الانتهاء", "الأيام المتبقية", "الخسارة المحتملة"]],
    body: medicines.map(m => {
      const daysLeft = Math.ceil((new Date(m.expiryDate).getTime() - now) / 86400000);
      return [
        m.name,
        m.genericName,
        String(m.quantity),
        new Date(m.expiryDate).toLocaleDateString("ar-EG"),
        `${daysLeft} يوم`,
        `${m.potentialLoss.toFixed(2)} ${CURRENCY}`,
      ];
    }),
    styles: { font: "helvetica", halign: "right", fontSize: 9 },
    headStyles: { fillColor: [200, 60, 60], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [254, 248, 248] },
    didParseCell(data) {
      if (data.column.index === 4 && data.section === "body") {
        const val = parseInt(String(data.cell.raw));
        if (val <= 7) data.cell.styles.textColor = [200, 0, 0];
        else if (val <= 30) data.cell.styles.textColor = [200, 120, 0];
      }
    },
    foot: medicines.length > 0 ? [[
      "الإجمالي", "", String(medicines.reduce((s, m) => s + m.quantity, 0)),
      "", "",
      `${medicines.reduce((s, m) => s + m.potentialLoss, 0).toFixed(2)} ${CURRENCY}`,
    ]] : undefined,
    footStyles: { fillColor: [240, 240, 240], fontStyle: "bold", textColor: 0 },
    margin: { left: 14, right: 14 },
  });

  addFooter(doc);
  doc.save(`expiring-medicines-${days}days-${Date.now()}.pdf`);
}
