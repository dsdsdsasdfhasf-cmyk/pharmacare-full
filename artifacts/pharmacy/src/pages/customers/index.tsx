import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  useListCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer,
  getListCustomersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Search, User } from "lucide-react";

type Customer = { id: number; name: string; phone: string | null; email: string | null; address: string | null; dateOfBirth: string | null; notes: string | null; totalPurchases: number; createdAt: string };
const EMPTY = { name: "", phone: "", email: "", address: "", dateOfBirth: "", notes: "" };

function CustomerDialog({ open, onClose, customer }: { open: boolean; onClose: () => void; customer?: Customer }) {
  const [form, setForm] = useState(EMPTY);
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isPending = createCustomer.isPending || updateCustomer.isPending;

  function handleOpenChange(v: boolean) {
    if (v) setForm({ name: customer?.name ?? "", phone: customer?.phone ?? "", email: customer?.email ?? "", address: customer?.address ?? "", dateOfBirth: customer?.dateOfBirth ?? "", notes: customer?.notes ?? "" });
    else onClose();
  }
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  function handleSubmit() {
    if (!form.name.trim()) return;
    const data = { name: form.name, phone: form.phone || undefined, email: form.email || undefined, address: form.address || undefined, dateOfBirth: form.dateOfBirth || undefined, notes: form.notes || undefined };
    const onSuccess = () => { toast({ title: customer ? "تم تعديل العميل" : "تمت إضافة العميل" }); queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() }); onClose(); };
    const onError = () => toast({ title: "حدث خطأ", variant: "destructive" });
    if (customer) updateCustomer.mutate({ id: customer.id, data }, { onSuccess, onError });
    else createCustomer.mutate({ data }, { onSuccess, onError });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{customer ? "تعديل العميل" : "إضافة عميل جديد"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="space-y-1"><Label>الاسم الكامل *</Label><Input value={form.name} onChange={set("name")} placeholder="مثال: محمد أحمد" data-testid="input-customer-name" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>الهاتف</Label><Input value={form.phone} onChange={set("phone")} data-testid="input-customer-phone" /></div>
            <div className="space-y-1"><Label>تاريخ الميلاد</Label><Input value={form.dateOfBirth} onChange={set("dateOfBirth")} type="date" data-testid="input-customer-dob" /></div>
          </div>
          <div className="space-y-1"><Label>البريد الإلكتروني</Label><Input value={form.email} onChange={set("email")} type="email" data-testid="input-customer-email" /></div>
          <div className="space-y-1"><Label>العنوان</Label><Input value={form.address} onChange={set("address")} data-testid="input-customer-address" /></div>
          <div className="space-y-1"><Label>ملاحظات</Label><Textarea value={form.notes} onChange={set("notes")} rows={2} data-testid="input-customer-notes" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSubmit} disabled={isPending || !form.name.trim()} data-testid="button-save-customer">{isPending ? "جاري الحفظ..." : "حفظ"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Customers() {
  const [search, setSearch] = useState("");
  const { data: customers, isLoading } = useListCustomers({ search: search || undefined });
  const deleteCustomer = useDeleteCustomer();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Customer | undefined>(undefined);

  function handleEdit(c: Customer) { setEditTarget(c); setDialogOpen(true); }
  function handleAdd() { setEditTarget(undefined); setDialogOpen(true); }
  function handleDelete(id: number) {
    if (!confirm("هل أنت متأكد من حذف هذا العميل؟")) return;
    deleteCustomer.mutate({ id }, {
      onSuccess: () => { toast({ title: "تم حذف العميل" }); queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() }); },
      onError: () => toast({ title: "حدث خطأ", variant: "destructive" }),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div><h1 className="text-3xl font-bold tracking-tight">Customers (العملاء)</h1><p className="text-muted-foreground">إدارة سجلات العملاء.</p></div>
        <Button onClick={handleAdd} data-testid="button-add-customer"><Plus className="mr-2 h-4 w-4" /> إضافة عميل</Button>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="بحث باسم أو هاتف..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} data-testid="input-search-customer" />
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead><TableHead>الهاتف</TableHead><TableHead>العنوان</TableHead><TableHead>إجمالي المشتريات</TableHead><TableHead>تاريخ الانضمام</TableHead><TableHead className="text-right">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={6} className="h-24 text-center">جاري التحميل...</TableCell></TableRow>
                : !customers?.length ? <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">لا يوجد عملاء.</TableCell></TableRow>
                : customers.map((c: any) => (
                  <TableRow key={c.id} data-testid={`row-customer-${c.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground shrink-0" /><span className="font-medium">{c.name}</span></div>
                    </TableCell>
                    <TableCell>{c.phone || "—"}</TableCell>
                    <TableCell className="max-w-[180px] truncate">{c.address || "—"}</TableCell>
                    <TableCell className="font-medium text-primary">{Number(c.totalPurchases || 0).toFixed(2)} ج.م</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(c.createdAt).toLocaleDateString("ar-EG")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(c as Customer)} data-testid={`button-edit-customer-${c.id}`}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(c.id)} data-testid={`button-delete-customer-${c.id}`}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <CustomerDialog open={dialogOpen} onClose={() => setDialogOpen(false)} customer={editTarget} />
    </div>
  );
}
