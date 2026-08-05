import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Plus, Pencil, Trash2, Search, AlertTriangle, Clock,
  FileSpreadsheet, FileText,
} from "lucide-react";
import {
  useListMedicines, useCreateMedicine, useUpdateMedicine, useDeleteMedicine,
  useListCategories, useListSuppliers,
  getListMedicinesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Medicine = {
  id: number; name: string; genericName: string; barcode: string | null;
  categoryId: number | null; categoryName: string | null;
  supplierId: number | null; supplierName: string | null;
  quantity: number; minQuantity: number;
  purchasePrice: number; sellingPrice: number;
  expiryDate: string | null; location: string | null; description: string | null;
  requiresPrescription: boolean; createdAt: string;
};

const EMPTY_FORM = {
  name: "", genericName: "", barcode: "", categoryId: "", supplierId: "",
  quantity: "0", minQuantity: "10", purchasePrice: "0", sellingPrice: "0",
  expiryDate: "", location: "", description: "", requiresPrescription: false,
};

function MedicineDialog({ open, onClose, medicine }: { open: boolean; onClose: () => void; medicine?: Medicine }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const createMedicine = useCreateMedicine();
  const updateMedicine = useUpdateMedicine();
  const { data: categories } = useListCategories();
  const { data: suppliers } = useListSuppliers();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isPending = createMedicine.isPending || updateMedicine.isPending;

  function handleOpenChange(v: boolean) {
    if (v) {
      setForm({
        name: medicine?.name ?? "", genericName: medicine?.genericName ?? "",
        barcode: medicine?.barcode ?? "", categoryId: medicine?.categoryId?.toString() ?? "",
        supplierId: medicine?.supplierId?.toString() ?? "",
        quantity: medicine?.quantity?.toString() ?? "0",
        minQuantity: medicine?.minQuantity?.toString() ?? "10",
        purchasePrice: medicine?.purchasePrice?.toString() ?? "0",
        sellingPrice: medicine?.sellingPrice?.toString() ?? "0",
        expiryDate: medicine?.expiryDate ?? "", location: medicine?.location ?? "",
        description: medicine?.description ?? "",
        requiresPrescription: medicine?.requiresPrescription ?? false,
      });
    } else {
      onClose();
    }
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  function handleSubmit() {
    if (!form.name.trim() || !form.genericName.trim()) return;
    const data = {
      name: form.name,
      genericName: form.genericName,
      barcode: form.barcode || undefined,
      categoryId: form.categoryId ? Number(form.categoryId) : undefined,
      supplierId: form.supplierId ? Number(form.supplierId) : undefined,
      quantity: parseInt(form.quantity) || 0,
      minQuantity: parseInt(form.minQuantity) || 10,
      purchasePrice: parseFloat(form.purchasePrice) || 0,
      sellingPrice: parseFloat(form.sellingPrice) || 0,
      expiryDate: form.expiryDate || undefined,
      location: form.location || undefined,
      description: form.description || undefined,
      requiresPrescription: form.requiresPrescription,
    };
    const onSuccess = () => {
      toast({ title: medicine ? "تم تعديل الدواء" : "تمت إضافة الدواء" });
      queryClient.invalidateQueries({ queryKey: getListMedicinesQueryKey() });
      onClose();
    };
    const onError = () => toast({ title: "حدث خطأ", variant: "destructive" });
    if (medicine) updateMedicine.mutate({ id: medicine.id, data }, { onSuccess, onError });
    else createMedicine.mutate({ data }, { onSuccess, onError });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{medicine ? "تعديل الدواء" : "إضافة دواء جديد"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>اسم الدواء التجاري *</Label>
              <Input value={form.name} onChange={set("name")} placeholder="بروفين 400" data-testid="input-medicine-name" />
            </div>
            <div className="space-y-1">
              <Label>الاسم العلمي *</Label>
              <Input value={form.genericName} onChange={set("genericName")} placeholder="إيبوبروفين" data-testid="input-medicine-generic" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>الباركود</Label>
              <Input value={form.barcode} onChange={set("barcode")} placeholder="6223000001" data-testid="input-medicine-barcode" />
            </div>
            <div className="space-y-1">
              <Label>الموقع في الصيدلية</Label>
              <Input value={form.location} onChange={set("location")} placeholder="رف A1" data-testid="input-medicine-location" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>الفئة</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm(f => ({ ...f, categoryId: v }))}>
                <SelectTrigger data-testid="select-medicine-category">
                  <SelectValue placeholder="اختر الفئة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون فئة</SelectItem>
                  {categories?.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>المورد</Label>
              <Select value={form.supplierId} onValueChange={(v) => setForm(f => ({ ...f, supplierId: v }))}>
                <SelectTrigger data-testid="select-medicine-supplier">
                  <SelectValue placeholder="اختر المورد" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون مورد</SelectItem>
                  {suppliers?.map((s: any) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label>الكمية</Label>
              <Input type="number" min="0" value={form.quantity} onChange={set("quantity")} data-testid="input-medicine-quantity" />
            </div>
            <div className="space-y-1">
              <Label>الحد الأدنى</Label>
              <Input type="number" min="0" value={form.minQuantity} onChange={set("minQuantity")} data-testid="input-medicine-min-quantity" />
            </div>
            <div className="space-y-1">
              <Label>سعر الشراء</Label>
              <Input type="number" min="0" step="0.01" value={form.purchasePrice} onChange={set("purchasePrice")} data-testid="input-medicine-purchase-price" />
            </div>
            <div className="space-y-1">
              <Label>سعر البيع</Label>
              <Input type="number" min="0" step="0.01" value={form.sellingPrice} onChange={set("sellingPrice")} data-testid="input-medicine-selling-price" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>تاريخ انتهاء الصلاحية</Label>
              <Input type="date" value={form.expiryDate} onChange={set("expiryDate")} data-testid="input-medicine-expiry" />
            </div>
            <div className="space-y-1">
              <Label>وصف</Label>
              <Input value={form.description} onChange={set("description")} data-testid="input-medicine-description" />
            </div>
          </div>
          <div className="flex items-center gap-3 py-1">
            <Switch
              id="requires-prescription"
              checked={form.requiresPrescription}
              onCheckedChange={(v) => setForm(f => ({ ...f, requiresPrescription: v }))}
              data-testid="switch-requires-prescription"
            />
            <Label htmlFor="requires-prescription">يستلزم وصفة طبية</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSubmit} disabled={isPending || !form.name.trim() || !form.genericName.trim()} data-testid="button-save-medicine">
            {isPending ? "جاري الحفظ..." : "حفظ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function isExpiringSoon(dateStr: string | null) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + 30);
  return d <= cutoff;
}

export default function Medicines() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Medicine | undefined>(undefined);

  const { data: medicines, isLoading } = useListMedicines({
    search: searchTerm || undefined,
    lowStock: filterLowStock || undefined,
  });
  const deleteMedicine = useDeleteMedicine();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  function handleEdit(m: Medicine) { setEditTarget(m); setDialogOpen(true); }
  function handleAdd() { setEditTarget(undefined); setDialogOpen(true); }

  function handleDelete(id: number, name: string) {
    if (!confirm(`هل أنت متأكد من حذف "${name}"؟`)) return;
    deleteMedicine.mutate({ id }, {
      onSuccess: () => { toast({ title: "تم حذف الدواء" }); queryClient.invalidateQueries({ queryKey: getListMedicinesQueryKey() }); },
      onError: () => toast({ title: "حدث خطأ أثناء الحذف", variant: "destructive" }),
    });
  }

  function handleExportExcel() {
    if (!medicines) return;
    const dataToExport = medicines.map((m: any) => ({
      "اسم الدواء": m.name,
      "الاسم العلمي": m.genericName,
      "الباركود": m.barcode || "—",
      "الفئة": m.categoryName || "—",
      "المورد": m.supplierName || "—",
      "الكمية الحالية": m.quantity,
      "الحد الأدنى": m.minQuantity,
      "سعر الشراء": m.purchasePrice,
      "سعر البيع": m.sellingPrice,
      "تاريخ الانتهاء": m.expiryDate || "—",
      "موقع التخزين": m.location || "—",
      "يستلزم وصفة": m.requiresPrescription ? "نعم" : "لا",
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الأدوية");
    XLSX.writeFile(wb, `medicines-export-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function handleExportPDF() {
    if (!medicines) return;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    
    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("PharmaCare — تقرير مخزون الأدوية", doc.internal.pageSize.width / 2, 15, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`تاريخ التصدير: ${new Date().toLocaleDateString("ar-EG")}`, 14, 22);

    autoTable(doc, {
      startY: 25,
      head: [["اسم الدواء", "الاسم العلمي", "الباركود", "الفئة", "الكمية", "سعر الشراء", "سعر البيع", "تاريخ الانتهاء"]],
      body: medicines.map((m: any) => [
        m.name,
        m.genericName,
        m.barcode || "—",
        m.categoryName || "—",
        String(m.quantity),
        `${m.purchasePrice.toFixed(2)} ج.م`,
        `${m.sellingPrice.toFixed(2)} ج.م`,
        m.expiryDate || "—",
      ]),
      styles: { font: "helvetica", halign: "right", fontSize: 9 },
      headStyles: { fillColor: [20, 140, 120], textColor: 255 },
      margin: { left: 14, right: 14 },
    });

    doc.save(`medicines-inventory-${Date.now()}.pdf`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Medicines (الأدوية)</h1>
          <p className="text-muted-foreground">إدارة مخزون الأدوية ومستويات المخزون.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={isLoading || !medicines?.length}>
            <FileSpreadsheet className="h-4 w-4 ml-1.5 text-green-600" /> تصدير Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={isLoading || !medicines?.length}>
            <FileText className="h-4 w-4 ml-1.5 text-red-500" /> تصدير PDF
          </Button>
          <Button onClick={handleAdd} data-testid="button-add-medicine">
            <Plus className="mr-2 h-4 w-4" /> إضافة دواء
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو الباركود..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="input-search-medicine"
          />
        </div>
        <Button
          variant={filterLowStock ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterLowStock(v => !v)}
          data-testid="button-filter-low-stock"
        >
          <AlertTriangle className="mr-2 h-4 w-4" /> نقص المخزون فقط
        </Button>
        {medicines && (
          <span className="text-sm text-muted-foreground">{medicines.length} دواء</span>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الدواء</TableHead>
                <TableHead>الفئة</TableHead>
                <TableHead>المخزون</TableHead>
                <TableHead>سعر الشراء</TableHead>
                <TableHead>سعر البيع</TableHead>
                <TableHead>تاريخ الانتهاء</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="text-right">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="h-24 text-center">جاري التحميل...</TableCell></TableRow>
              ) : !medicines?.length ? (
                <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">لا توجد أدوية.</TableCell></TableRow>
              ) : (
                medicines.map((med: any) => {
                  const isLow = med.quantity <= med.minQuantity;
                  const expiring = isExpiringSoon(med.expiryDate ?? null);
                  return (
                    <TableRow key={med.id} data-testid={`row-medicine-${med.id}`}>
                      <TableCell>
                        <div className="font-medium">{med.name}</div>
                        <div className="text-xs text-muted-foreground">{med.genericName}</div>
                        {med.requiresPrescription && <span className="text-xs text-amber-600 font-medium">يستلزم وصفة</span>}
                      </TableCell>
                      <TableCell>{med.categoryName || "—"}</TableCell>
                      <TableCell>
                        <div className={`font-bold ${isLow ? "text-destructive" : ""}`}>{med.quantity}</div>
                        <div className="text-xs text-muted-foreground">حد أدنى: {med.minQuantity}</div>
                      </TableCell>
                      <TableCell>{med.purchasePrice.toFixed(2)} ج.م</TableCell>
                      <TableCell className="font-medium text-primary">{med.sellingPrice.toFixed(2)} ج.م</TableCell>
                      <TableCell>
                        {med.expiryDate ? (
                          <div className={`flex items-center gap-1 text-sm ${expiring ? "text-amber-600" : ""}`}>
                            {expiring && <Clock className="h-3 w-3" />}
                            {med.expiryDate}
                          </div>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {isLow ? <Badge variant="destructive">نقص مخزون</Badge> : <Badge variant="secondary">متوفر</Badge>}
                          {expiring && <Badge variant="outline" className="text-amber-600 border-amber-400">ينتهي قريباً</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(med as Medicine)} data-testid={`button-edit-medicine-${med.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(med.id, med.name)} data-testid={`button-delete-medicine-${med.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <MedicineDialog open={dialogOpen} onClose={() => setDialogOpen(false)} medicine={editTarget} />
    </div>
  );
}
