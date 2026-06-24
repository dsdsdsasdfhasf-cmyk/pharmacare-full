import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Printer, X } from "lucide-react";

interface ReceiptItem {
  medicineName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ReceiptData {
  id: number;
  createdAt: string;
  paymentMethod: string;
  customerName: string | null;
  items: ReceiptItem[];
  discount: number;
  totalAmount: number;
}

const PAYMENT_AR: Record<string, string> = { cash: "نقدي", card: "بطاقة بنكية", insurance: "تأمين طبي" };

interface Props {
  receipt: ReceiptData | null;
  onClose: () => void;
}

export function ReceiptModal({ receipt, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    const content = printRef.current;
    if (!content) return;
    const win = window.open("", "_blank", "width=400,height=600");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8" />
        <title>إيصال بيع #${receipt?.id}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; font-size: 13px; color: #000; direction: rtl; }
          .receipt { width: 80mm; margin: 0 auto; padding: 8px; }
          .header { text-align: center; margin-bottom: 10px; border-bottom: 2px dashed #000; padding-bottom: 8px; }
          .header h1 { font-size: 20px; font-weight: bold; letter-spacing: 1px; }
          .header p { font-size: 11px; margin-top: 2px; }
          .info { margin: 8px 0; font-size: 11px; }
          .info div { display: flex; justify-content: space-between; margin-bottom: 2px; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { text-align: right; font-weight: bold; padding: 2px 0; border-bottom: 1px solid #000; }
          td { padding: 3px 0; vertical-align: top; }
          td:last-child { text-align: left; white-space: nowrap; }
          .totals { margin-top: 8px; font-size: 12px; }
          .totals div { display: flex; justify-content: space-between; padding: 1px 0; }
          .totals .grand { font-size: 15px; font-weight: bold; border-top: 2px solid #000; padding-top: 4px; margin-top: 4px; }
          .footer { text-align: center; font-size: 10px; margin-top: 10px; border-top: 1px dashed #000; padding-top: 6px; }
          @media print { body { -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        ${content.innerHTML}
        <script>window.onload = () => { window.print(); window.close(); }<\/script>
      </body>
      </html>
    `);
    win.document.close();
  }

  if (!receipt) return null;
  const subtotal = receipt.items.reduce((s, i) => s + i.totalPrice, 0);

  return (
    <Dialog open={!!receipt} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-right">إيصال البيع</DialogTitle>
        </DialogHeader>

        {/* Printable receipt */}
        <div ref={printRef} className="receipt" dir="rtl">
          <div className="header" style={{ textAlign: "center", borderBottom: "2px dashed #000", paddingBottom: 8, marginBottom: 10 }}>
            <div style={{ fontSize: 20, fontWeight: "bold" }}>💊 PharmaCare</div>
            <div style={{ fontSize: 11, marginTop: 2 }}>نظام إدارة الصيدلية</div>
            <div style={{ fontSize: 10 }}>هاتف: 01000000000</div>
          </div>

          <div className="info" style={{ fontSize: 11, margin: "8px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>رقم الفاتورة:</span>
              <strong>#{receipt.id}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>التاريخ:</span>
              <span>{new Date(receipt.createdAt).toLocaleString("ar-EG")}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>طريقة الدفع:</span>
              <span>{PAYMENT_AR[receipt.paymentMethod] || receipt.paymentMethod}</span>
            </div>
            {receipt.customerName && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>العميل:</span>
                <span>{receipt.customerName}</span>
              </div>
            )}
          </div>

          <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />

          <table style={{ width: "100%", fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "right", paddingBottom: 2, borderBottom: "1px solid #000" }}>الصنف</th>
                <th style={{ textAlign: "center", paddingBottom: 2, borderBottom: "1px solid #000" }}>ك</th>
                <th style={{ textAlign: "left", paddingBottom: 2, borderBottom: "1px solid #000" }}>المجموع</th>
              </tr>
            </thead>
            <tbody>
              {receipt.items.map((item, i) => (
                <tr key={i}>
                  <td style={{ verticalAlign: "top", paddingTop: 3 }}>
                    <div style={{ fontSize: 12 }}>{item.medicineName}</div>
                    <div style={{ fontSize: 10, color: "#555" }}>{item.unitPrice.toFixed(2)} × {item.quantity}</div>
                  </td>
                  <td style={{ textAlign: "center", verticalAlign: "top", paddingTop: 3 }}>{item.quantity}</td>
                  <td style={{ textAlign: "left", verticalAlign: "top", paddingTop: 3, whiteSpace: "nowrap" }}>{item.totalPrice.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />

          <div className="totals" style={{ fontSize: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "1px 0" }}>
              <span>المجموع الفرعي:</span>
              <span>{subtotal.toFixed(2)} ج.م</span>
            </div>
            {receipt.discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "1px 0", color: "#c00" }}>
                <span>خصم:</span>
                <span>- {receipt.discount.toFixed(2)} ج.م</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: "bold", borderTop: "2px solid #000", paddingTop: 4, marginTop: 4 }}>
              <span>الإجمالي:</span>
              <span>{receipt.totalAmount.toFixed(2)} ج.م</span>
            </div>
          </div>

          <div style={{ textAlign: "center", fontSize: 10, marginTop: 10, borderTop: "1px dashed #000", paddingTop: 6 }}>
            <div>شكراً لزيارتكم — صحة وعافية</div>
            <div style={{ marginTop: 2 }}>PharmaCare © {new Date().getFullYear()}</div>
          </div>
        </div>

        <Separator />
        <div className="flex justify-between gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            <X className="h-4 w-4 ml-1" />
            إغلاق
          </Button>
          <Button onClick={handlePrint} className="flex-1">
            <Printer className="h-4 w-4 ml-1" />
            طباعة الإيصال
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
