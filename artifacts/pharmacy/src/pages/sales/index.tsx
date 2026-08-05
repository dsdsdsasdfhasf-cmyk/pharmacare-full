import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useListSales, useGetSale, getGetSaleQueryKey, getListSalesQueryKey } from "@workspace/api-client-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, Eye, Calendar, RotateCcw, Printer, FileSpreadsheet, FileText } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useToast } from "@/hooks/use-toast";
import { ReceiptModal, type ReceiptData } from "@/components/receipt";

const PAYMENT_LABELS: Record<string, string> = { cash: "نقدي", card: "بطاقة", insurance: "تأمين" };
const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive"> = { completed: "default", refunded: "destructive", pending: "secondary" };
const STATUS_LABELS: Record<string, string> = { completed: "مكتمل", refunded: "مسترجع", pending: "معلق" };

function SaleDetailDialog({ saleId, onClose, onPrint, onRefundRequest }: {
  saleId: number | null;
  onClose: () => void;
  onPrint: (sale: ReceiptData) => void;
  onRefundRequest: (saleId: number) => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: sale, isLoading } = useGetSale(saleId!, {
    query: { enabled: !!saleId, queryKey: getGetSaleQueryKey(saleId!) },
  });

  const statusMutation = useMutation({
    mutationFn: (newStatus: string) =>
      fetch(`/api/sales/${saleId}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      }).then(async r => {
        if (!r.ok) { const err = await r.json().catch(() => ({})); throw new Error(err.error || "فشل تغيير الحالة"); }
        return r.json();
      }),
    onSuccess: () => {
      toast({ title: "تم تغيير الحالة بنجاح" });
      queryClient.invalidateQueries({ queryKey: getGetSaleQueryKey(saleId!) });
      queryClient.invalidateQueries({ queryKey: getListSalesQueryKey() });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  return (
    <Dialog open={!!saleId} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader><DialogTitle>تفاصيل الفاتورة #{saleId}</DialogTitle></DialogHeader>
        {isLoading ? (
          <div className="h-32 flex items-center justify-center text-muted-foreground">جاري التحميل...</div>
        ) : sale ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">العميل:</span> <span className="font-medium">{sale.customerName || "بدون عميل"}</span></div>
              <div><span className="text-muted-foreground">طريقة الدفع:</span> <span className="font-medium">{PAYMENT_LABELS[sale.paymentMethod] || sale.paymentMethod}</span></div>
              <div><span className="text-muted-foreground">التاريخ:</span> <span className="font-medium">{new Date(sale.createdAt).toLocaleString("ar-EG")}</span></div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">الحالة:</span>
                <Select
                  value={sale.status}
                  onValueChange={(v) => statusMutation.mutate(v)}
                  disabled={statusMutation.isPending}
                >
                  <SelectTrigger className="h-7 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">مكتمل</SelectItem>
                    <SelectItem value="pending">معلق</SelectItem>
                    <SelectItem value="refunded">مسترجع</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الدواء</TableHead>
                  <TableHead className="text-center">الكمية</TableHead>
                  <TableHead className="text-right">السعر</TableHead>
                  <TableHead className="text-right">الإجمالي</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sale.items.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.medicineName}</TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right">{item.unitPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-medium">{item.totalPrice.toFixed(2)} ج.م</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="border-t pt-3 space-y-1 text-sm">
              {(sale.discount ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الخصم:</span>
                  <span className="text-destructive">- {(sale.discount ?? 0).toFixed(2)} ج.م</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold">
                <span>الإجمالي:</span>
                <span className="text-primary">{(sale.totalAmount ?? 0).toFixed(2)} ج.م</span>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 gap-2" onClick={() => onPrint({
                id: sale.id,
                createdAt: sale.createdAt,
                paymentMethod: sale.paymentMethod,
                customerName: sale.customerName ?? null,
                items: sale.items,
                discount: sale.discount ?? 0,
                totalAmount: sale.totalAmount ?? 0,
              })}>
                <Printer className="h-4 w-4" />
                طباعة الإيصال
              </Button>
              {sale.status === "completed" && (
                <Button variant="destructive" className="flex-1 gap-2" onClick={() => { onClose(); onRefundRequest(sale.id); }}>
                  <RotateCcw className="h-4 w-4" />
                  استرجاع
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export default function Sales() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [viewSaleId, setViewSaleId] = useState<number | null>(null);
  const [refundSaleId, setRefundSaleId] = useState<number | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const { data: sales, isLoading } = useListSales({ startDate: startDate || undefined, endDate: endDate || undefined });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const refundMutation = useMutation({
    mutationFn: (id: number) => fetch(`/api/sales/${id}/refund`, {
      method: "POST",
      credentials: "include",
    }).then(async r => {
      if (!r.ok) { const err = await r.json().catch(() => ({})); throw new Error(err.error || "فشل الاسترجاع"); }
      return r.json();
    }),
    onSuccess: () => {
      toast({ title: "تم استرجاع البيعة وإعادة الكمية للمخزون" });
      queryClient.invalidateQueries({ queryKey: getListSalesQueryKey() });
      setRefundSaleId(null);
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
      setRefundSaleId(null);
    },
  });

  const totalRevenue = sales?.filter((s: any) => s.status === "completed").reduce((sum: any, s: any) => sum + s.totalAmount, 0) ?? 0;
  const refundedCount = sales?.filter((s: any) => s.status === "refunded").length ?? 0;

  function handleExportExcel() {
    if (!sales) return;
    const dataToExport = sales.map((s: any) => ({
      "رقم الفاتورة": s.id,
      "اسم العميل": s.customerName || "بدون عميل",
      "الوصفة الطبية": s.prescriptionId ? "نعم" : "لا",
      "طريقة الدفع": PAYMENT_LABELS[s.paymentMethod] || s.paymentMethod,
      "الحالة": STATUS_LABELS[s.status] || s.status,
      "إجمالي المبلغ": s.totalAmount,
      "الخصم": s.discount,
      "التاريخ": new Date(s.createdAt).toLocaleString("ar-EG"),
      "ملاحظات": s.notes || "—",
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "المبيعات");
    XLSX.writeFile(wb, `sales-export-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function handleExportPDF() {
    if (!sales) return;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    
    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("PharmaCare — تقرير المبيعات والفواتير", doc.internal.pageSize.width / 2, 15, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`تاريخ التصدير: ${new Date().toLocaleDateString("ar-EG")}`, 14, 22);

    autoTable(doc, {
      startY: 25,
      head: [["رقم الفاتورة", "العميل", "طريقة الدفع", "الحالة", "إجمالي المبلغ", "الخصم", "التاريخ"]],
      body: sales.map((s: any) => [
        `#${s.id}`,
        s.customerName || "بدون عميل",
        PAYMENT_LABELS[s.paymentMethod] || s.paymentMethod,
        STATUS_LABELS[s.status] || s.status,
        `${s.totalAmount.toFixed(2)} ج.م`,
        `${s.discount.toFixed(2)} ج.م`,
        new Date(s.createdAt).toLocaleString("ar-EG"),
      ]),
      styles: { font: "helvetica", halign: "right", fontSize: 9 },
      headStyles: { fillColor: [20, 140, 120], textColor: 255 },
      margin: { left: 14, right: 14 },
    });

    doc.save(`sales-report-${Date.now()}.pdf`);
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">سجل المبيعات</h1>
          <p className="text-muted-foreground mt-1">عرض وإدارة فواتير المبيعات وعمليات الاسترجاع.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={isLoading || !sales?.length}>
            <FileSpreadsheet className="h-4 w-4 ml-1.5 text-green-600" /> تصدير Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={isLoading || !sales?.length}>
            <FileText className="h-4 w-4 ml-1.5 text-red-500" /> تصدير PDF
          </Button>
          <Link href="/sales/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> فاتورة جديدة
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" data-testid="input-start-date" />
          <span className="text-muted-foreground">إلى</span>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" data-testid="input-end-date" />
        </div>
        {(startDate || endDate) && (
          <Button variant="ghost" size="sm" onClick={() => { setStartDate(""); setEndDate(""); }}>مسح الفلتر</Button>
        )}
        {sales && (
          <div className="flex gap-3 text-sm text-muted-foreground">
            <span>{sales.length} فاتورة — إيرادات: <span className="font-bold text-foreground">{totalRevenue.toFixed(2)} ج.م</span></span>
            {refundedCount > 0 && <span className="text-destructive">{refundedCount} مسترجع</span>}
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead>الأصناف</TableHead>
                <TableHead>طريقة الدفع</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead className="text-right">الإجمالي</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="h-24 text-center">جاري التحميل...</TableCell></TableRow>
              ) : !sales?.length ? (
                <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">لا توجد مبيعات.</TableCell></TableRow>
              ) : sales.map((s: any) => (
                <TableRow key={s.id} data-testid={`row-sale-${s.id}`} className={s.status === "refunded" ? "opacity-60" : ""}>
                  <TableCell className="font-mono text-muted-foreground">#{s.id}</TableCell>
                  <TableCell>{s.customerName || <span className="text-muted-foreground">بدون عميل</span>}</TableCell>
                  <TableCell>{s.items.length} صنف</TableCell>
                  <TableCell>{PAYMENT_LABELS[s.paymentMethod] || s.paymentMethod}</TableCell>
                  <TableCell><Badge variant={STATUS_VARIANTS[s.status]}>{STATUS_LABELS[s.status] || s.status}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{new Date(s.createdAt).toLocaleDateString("ar-EG")}</TableCell>
                  <TableCell className="text-right font-bold text-primary">{s.totalAmount.toFixed(2)} ج.م</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewSaleId(s.id)} data-testid={`button-view-sale-${s.id}`} title="عرض التفاصيل">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {s.status === "completed" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setRefundSaleId(s.id)} title="استرجاع">
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <SaleDetailDialog
        saleId={viewSaleId}
        onClose={() => setViewSaleId(null)}
        onPrint={setReceipt}
        onRefundRequest={setRefundSaleId}
      />

      <AlertDialog open={!!refundSaleId} onOpenChange={v => { if (!v) setRefundSaleId(null); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد استرجاع البيعة #{refundSaleId}</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم إلغاء البيعة وإعادة الكميات المباعة إلى المخزون. هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => refundSaleId && refundMutation.mutate(refundSaleId)}
              disabled={refundMutation.isPending}
            >
              {refundMutation.isPending ? "جاري الاسترجاع..." : "نعم، استرجاع"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}
