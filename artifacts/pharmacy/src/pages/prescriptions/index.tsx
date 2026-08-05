import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  useListPrescriptions, useCreatePrescription, useUpdatePrescription,
  useListCustomers, getListPrescriptionsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, FileText } from "lucide-react";

type Prescription = { id: number; customerId: number | null; customerName: string | null; doctorName: string; doctorSpecialty: string | null; status: string; notes: string | null; createdAt: string };

const STATUS_LABELS: Record<string, string> = { pending: "قيد الانتظار", dispensed: "تم الصرف", cancelled: "ملغاة" };
const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = { pending: "default", dispensed: "secondary", cancelled: "destructive" };

function PrescriptionDialog({ open, onClose, prescription }: { open: boolean; onClose: () => void; prescription?: Prescription }) {
  const [form, setForm] = useState({ customerId: "", doctorName: "", doctorSpecialty: "", notes: "", status: "pending" });
  const createPrescription = useCreatePrescription();
  const updatePrescription = useUpdatePrescription();
  const { data: customers } = useListCustomers();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isPending = createPrescription.isPending || updatePrescription.isPending;

  function handleOpenChange(v: boolean) {
    if (v) setForm({ customerId: prescription?.customerId?.toString() ?? "", doctorName: prescription?.doctorName ?? "", doctorSpecialty: prescription?.doctorSpecialty ?? "", notes: prescription?.notes ?? "", status: prescription?.status ?? "pending" });
    else onClose();
  }
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  function handleSubmit() {
    if (!form.doctorName.trim()) return;
    const onSuccess = () => { toast({ title: prescription ? "تم تعديل الوصفة" : "تمت إضافة الوصفة" }); queryClient.invalidateQueries({ queryKey: getListPrescriptionsQueryKey() }); onClose(); };
    const onError = () => toast({ title: "حدث خطأ", variant: "destructive" });
    if (prescription) {
      updatePrescription.mutate({ id: prescription.id, data: { doctorName: form.doctorName, doctorSpecialty: form.doctorSpecialty || undefined, notes: form.notes || undefined, status: form.status as "pending" | "dispensed" | "cancelled" } }, { onSuccess, onError });
    } else {
      createPrescription.mutate({ data: { customerId: form.customerId ? Number(form.customerId) : undefined, doctorName: form.doctorName, doctorSpecialty: form.doctorSpecialty || undefined, notes: form.notes || undefined } }, { onSuccess, onError });
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{prescription ? "تعديل الوصفة الطبية" : "إضافة وصفة طبية"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="space-y-1">
            <Label>العميل</Label>
            <Select value={form.customerId} onValueChange={(v) => setForm(f => ({ ...f, customerId: v }))}>
              <SelectTrigger data-testid="select-prescription-customer"><SelectValue placeholder="اختر العميل (اختياري)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">بدون عميل</SelectItem>
                {customers?.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>اسم الطبيب *</Label><Input value={form.doctorName} onChange={set("doctorName")} placeholder="د. محمد أحمد" data-testid="input-prescription-doctor" /></div>
            <div className="space-y-1"><Label>التخصص</Label><Input value={form.doctorSpecialty} onChange={set("doctorSpecialty")} placeholder="طب عام" data-testid="input-prescription-specialty" /></div>
          </div>
          {prescription && (
            <div className="space-y-1">
              <Label>الحالة</Label>
              <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger data-testid="select-prescription-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">قيد الانتظار</SelectItem>
                  <SelectItem value="dispensed">تم الصرف</SelectItem>
                  <SelectItem value="cancelled">ملغاة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1"><Label>ملاحظات</Label><Textarea value={form.notes} onChange={set("notes")} rows={2} data-testid="input-prescription-notes" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSubmit} disabled={isPending || !form.doctorName.trim()} data-testid="button-save-prescription">{isPending ? "جاري الحفظ..." : "حفظ"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Prescriptions() {
  const { data: prescriptions, isLoading } = useListPrescriptions();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Prescription | undefined>(undefined);

  function handleEdit(rx: Prescription) { setEditTarget(rx); setDialogOpen(true); }
  function handleAdd() { setEditTarget(undefined); setDialogOpen(true); }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold tracking-tight">Prescriptions (الوصفات الطبية)</h1><p className="text-muted-foreground">إدارة الوصفات الطبية وحالاتها.</p></div>
        <Button onClick={handleAdd} data-testid="button-add-prescription"><Plus className="mr-2 h-4 w-4" /> إضافة وصفة</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead><TableHead>العميل</TableHead><TableHead>الطبيب</TableHead><TableHead>التخصص</TableHead><TableHead>الحالة</TableHead><TableHead>التاريخ</TableHead><TableHead className="text-right">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={7} className="h-24 text-center">جاري التحميل...</TableCell></TableRow>
                : !prescriptions?.length ? <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">لا توجد وصفات طبية.</TableCell></TableRow>
                : prescriptions.map((rx: any) => (
                  <TableRow key={rx.id} data-testid={`row-prescription-${rx.id}`}>
                    <TableCell className="text-muted-foreground font-mono">#{rx.id}</TableCell>
                    <TableCell>{rx.customerName || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="font-medium">{rx.doctorName}</TableCell>
                    <TableCell>{rx.doctorSpecialty || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[rx.status ?? ""] ?? "outline"}>{STATUS_LABELS[rx.status ?? ""] ?? rx.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{new Date(rx.createdAt).toLocaleDateString("ar-EG")}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(rx as Prescription)} data-testid={`button-edit-prescription-${rx.id}`}><Pencil className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <PrescriptionDialog open={dialogOpen} onClose={() => setDialogOpen(false)} prescription={editTarget} />
    </div>
  );
}
