import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useListSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier,
  getListSuppliersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";

type Supplier = { id: number; name: string; contactPerson: string | null; phone: string | null; email: string | null; address: string | null; createdAt: string };
const EMPTY = { name: "", contactPerson: "", phone: "", email: "", address: "" };

function SupplierDialog({ open, onClose, supplier }: { open: boolean; onClose: () => void; supplier?: Supplier }) {
  const [form, setForm] = useState(EMPTY);
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isPending = createSupplier.isPending || updateSupplier.isPending;

  function handleOpenChange(v: boolean) {
    if (v) setForm({ name: supplier?.name ?? "", contactPerson: supplier?.contactPerson ?? "", phone: supplier?.phone ?? "", email: supplier?.email ?? "", address: supplier?.address ?? "" });
    else onClose();
  }
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  function handleSubmit() {
    if (!form.name.trim()) return;
    const data = { name: form.name, contactPerson: form.contactPerson || undefined, phone: form.phone || undefined, email: form.email || undefined, address: form.address || undefined };
    const onSuccess = () => { toast({ title: supplier ? "تم تعديل المورد" : "تمت إضافة المورد" }); queryClient.invalidateQueries({ queryKey: getListSuppliersQueryKey() }); onClose(); };
    const onError = () => toast({ title: "حدث خطأ", variant: "destructive" });
    if (supplier) updateSupplier.mutate({ id: supplier.id, data }, { onSuccess, onError });
    else createSupplier.mutate({ data }, { onSuccess, onError });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{supplier ? "تعديل المورد" : "إضافة مورد جديد"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="space-y-1"><Label>اسم الشركة *</Label><Input value={form.name} onChange={set("name")} placeholder="مثال: شركة النيل للدواء" data-testid="input-supplier-name" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>المسؤول</Label><Input value={form.contactPerson} onChange={set("contactPerson")} data-testid="input-supplier-contact" /></div>
            <div className="space-y-1"><Label>الهاتف</Label><Input value={form.phone} onChange={set("phone")} data-testid="input-supplier-phone" /></div>
          </div>
          <div className="space-y-1"><Label>البريد الإلكتروني</Label><Input value={form.email} onChange={set("email")} type="email" data-testid="input-supplier-email" /></div>
          <div className="space-y-1"><Label>العنوان</Label><Input value={form.address} onChange={set("address")} data-testid="input-supplier-address" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSubmit} disabled={isPending || !form.name.trim()} data-testid="button-save-supplier">{isPending ? "جاري الحفظ..." : "حفظ"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Suppliers() {
  const { data: suppliers, isLoading } = useListSuppliers();
  const deleteSupplier = useDeleteSupplier();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Supplier | undefined>(undefined);

  function handleEdit(s: Supplier) { setEditTarget(s); setDialogOpen(true); }
  function handleAdd() { setEditTarget(undefined); setDialogOpen(true); }
  function handleDelete(id: number) {
    if (!confirm("هل أنت متأكد من حذف هذا المورد؟")) return;
    deleteSupplier.mutate({ id }, {
      onSuccess: () => { toast({ title: "تم حذف المورد" }); queryClient.invalidateQueries({ queryKey: getListSuppliersQueryKey() }); },
      onError: () => toast({ title: "حدث خطأ", variant: "destructive" }),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold tracking-tight">Suppliers (الموردين)</h1><p className="text-muted-foreground">إدارة الموردين وشركات التوزيع.</p></div>
        <Button onClick={handleAdd} data-testid="button-add-supplier"><Plus className="mr-2 h-4 w-4" /> إضافة مورد</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم الشركة</TableHead><TableHead>المسؤول</TableHead><TableHead>الهاتف</TableHead><TableHead>البريد الإلكتروني</TableHead><TableHead>العنوان</TableHead><TableHead className="text-right">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={6} className="h-24 text-center">جاري التحميل...</TableCell></TableRow>
                : !suppliers?.length ? <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">لا يوجد موردون.</TableCell></TableRow>
                : suppliers.map((s) => (
                  <TableRow key={s.id} data-testid={`row-supplier-${s.id}`}>
                    <TableCell><div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground shrink-0" /><span className="font-medium">{s.name}</span></div></TableCell>
                    <TableCell>{s.contactPerson || "—"}</TableCell>
                    <TableCell>{s.phone || "—"}</TableCell>
                    <TableCell>{s.email || "—"}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{s.address || "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(s as Supplier)} data-testid={`button-edit-supplier-${s.id}`}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(s.id)} data-testid={`button-delete-supplier-${s.id}`}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <SupplierDialog open={dialogOpen} onClose={() => setDialogOpen(false)} supplier={editTarget} />
    </div>
  );
}
