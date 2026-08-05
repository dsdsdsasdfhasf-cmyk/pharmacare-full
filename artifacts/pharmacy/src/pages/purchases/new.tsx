import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useListSuppliers, useListMedicines, useCreatePurchase, getListPurchasesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Plus, Trash2, Search, ArrowLeft } from "lucide-react";

type CartItem = { medicineId: number; medicineName: string; quantity: number; unitPrice: number; expiryDate: string };

export default function NewPurchase() {
  const [supplierId, setSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [medSearch, setMedSearch] = useState("");

  const { data: suppliers } = useListSuppliers();
  const { data: medicines } = useListMedicines({ search: medSearch || undefined });
  const createPurchase = useCreatePurchase();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  function addMedicine(med: { id: number; name: string; purchasePrice: number }) {
    setCart(prev => {
      const existing = prev.find(i => i.medicineId === med.id);
      if (existing) return prev.map(i => i.medicineId === med.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { medicineId: med.id, medicineName: med.name, quantity: 1, unitPrice: med.purchasePrice, expiryDate: "" }];
    });
    setMedSearch("");
  }

  function updateItem(idx: number, field: keyof CartItem, value: string | number) {
    setCart(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  function removeItem(idx: number) { setCart(prev => prev.filter((_, i) => i !== idx)); }

  const totalAmount = cart.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

  function handleSubmit() {
    if (!supplierId || cart.length === 0) { toast({ title: "يجب اختيار المورد وإضافة أصناف", variant: "destructive" }); return; }
    createPurchase.mutate({
      data: {
        supplierId: Number(supplierId),
        invoiceNumber: invoiceNumber || undefined,
        notes: notes || undefined,
        items: cart.map(i => ({ medicineId: i.medicineId, quantity: i.quantity, unitPrice: i.unitPrice, expiryDate: i.expiryDate || undefined })),
      }
    }, {
      onSuccess: () => {
        toast({ title: "تم إنشاء أمر الشراء بنجاح وتم تحديث المخزون" });
        queryClient.invalidateQueries({ queryKey: getListPurchasesQueryKey() });
        setLocation("/purchases");
      },
      onError: () => toast({ title: "حدث خطأ أثناء حفظ أمر الشراء", variant: "destructive" }),
    });
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/purchases")} data-testid="button-back-purchases"><ArrowLeft className="h-4 w-4" /></Button>
        <div><h1 className="text-3xl font-bold tracking-tight">New Purchase Order (أمر شراء جديد)</h1><p className="text-muted-foreground">أضف أصنافاً من المورد وسيتم تحديث المخزون تلقائياً.</p></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1 md:col-span-1">
          <Label>المورد *</Label>
          <Select value={supplierId} onValueChange={setSupplierId}>
            <SelectTrigger data-testid="select-purchase-supplier"><SelectValue placeholder="اختر المورد" /></SelectTrigger>
            <SelectContent>{suppliers?.map((s: any) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>رقم الفاتورة</Label>
          <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="INV-001" data-testid="input-invoice-number" />
        </div>
        <div className="space-y-1">
          <Label>ملاحظات</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} data-testid="input-purchase-notes" />
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>البحث عن الأدوية وإضافتها</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={medSearch} onChange={(e) => setMedSearch(e.target.value)} className="pl-9" placeholder="ابحث عن دواء لإضافته..." data-testid="input-medicine-search-purchase" />
          </div>
          {medSearch && medicines && medicines.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              {medicines.slice(0, 6).map((m: any) => (
                <button key={m.id} onClick={() => addMedicine(m)} className="w-full flex items-center justify-between px-4 py-2 hover:bg-muted text-left border-b last:border-0" data-testid={`button-add-medicine-purchase-${m.id}`}>
                  <div><span className="font-medium">{m.name}</span><span className="text-sm text-muted-foreground ml-2">{m.genericName}</span></div>
                  <div className="text-sm text-primary font-medium">{m.purchasePrice.toFixed(2)} ج.م</div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {cart.length > 0 && (
        <Card>
          <CardHeader><CardTitle>أصناف أمر الشراء</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow><TableHead>الدواء</TableHead><TableHead className="w-24">الكمية</TableHead><TableHead className="w-32">سعر الوحدة</TableHead><TableHead className="w-36">تاريخ الانتهاء</TableHead><TableHead className="text-right w-28">الإجمالي</TableHead><TableHead className="w-12"></TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {cart.map((item, idx) => (
                  <TableRow key={item.medicineId}>
                    <TableCell className="font-medium">{item.medicineName}</TableCell>
                    <TableCell><Input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 1)} className="h-8 w-20" data-testid={`input-qty-${idx}`} /></TableCell>
                    <TableCell><Input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)} className="h-8 w-28" data-testid={`input-price-${idx}`} /></TableCell>
                    <TableCell><Input type="date" value={item.expiryDate} onChange={(e) => updateItem(idx, "expiryDate", e.target.value)} className="h-8" data-testid={`input-expiry-${idx}`} /></TableCell>
                    <TableCell className="text-right font-bold">{(item.quantity * item.unitPrice).toFixed(2)} ج.م</TableCell>
                    <TableCell><Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeItem(idx)} data-testid={`button-remove-item-${idx}`}><Trash2 className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-end items-center gap-4 p-4 border-t">
              <span className="text-muted-foreground">الإجمالي الكلي:</span>
              <span className="text-2xl font-bold text-primary">{totalAmount.toFixed(2)} ج.م</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setLocation("/purchases")}>إلغاء</Button>
        <Button onClick={handleSubmit} disabled={createPurchase.isPending || !supplierId || cart.length === 0} data-testid="button-submit-purchase">
          {createPurchase.isPending ? "جاري الحفظ..." : "حفظ أمر الشراء"}
        </Button>
      </div>
    </div>
  );
}
