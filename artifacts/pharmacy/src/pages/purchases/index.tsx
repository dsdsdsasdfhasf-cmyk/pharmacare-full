import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useListPurchases, useGetPurchase, getGetPurchaseQueryKey, getListPurchasesQueryKey } from "@workspace/api-client-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Plus, Eye } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

const STATUS_LABELS: Record<string, string> = { received: "مستلم", pending: "قيد الانتظار", cancelled: "ملغى" };
const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive"> = { received: "default", pending: "secondary", cancelled: "destructive" };

function PurchaseDetailDialog({ purchaseId, onClose }: { purchaseId: number | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: purchase, isLoading } = useGetPurchase(purchaseId!, {
    query: { enabled: !!purchaseId, queryKey: getGetPurchaseQueryKey(purchaseId!) },
  });

  const statusMutation = useMutation({
    mutationFn: (newStatus: string) =>
      fetch(`/api/purchases/${purchaseId}/status`, {
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
      queryClient.invalidateQueries({ queryKey: getGetPurchaseQueryKey(purchaseId!) });
      queryClient.invalidateQueries({ queryKey: getListPurchasesQueryKey() });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  return (
    <Dialog open={!!purchaseId} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader><DialogTitle>تفاصيل أمر الشراء #{purchaseId}</DialogTitle></DialogHeader>
        {isLoading ? <div className="h-32 flex items-center justify-center text-muted-foreground">جاري التحميل...</div>
          : purchase ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">المورد:</span> <span className="font-medium">{purchase.supplierName}</span></div>
                <div><span className="text-muted-foreground">رقم الفاتورة:</span> <span className="font-medium">{purchase.invoiceNumber || "—"}</span></div>
                <div><span className="text-muted-foreground">التاريخ:</span> <span className="font-medium">{new Date(purchase.createdAt).toLocaleDateString("ar-EG")}</span></div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">الحالة:</span>
                  <Select
                    value={purchase.status}
                    onValueChange={(v) => statusMutation.mutate(v)}
                    disabled={statusMutation.isPending}
                  >
                    <SelectTrigger className="h-7 w-32 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="received">مستلم</SelectItem>
                      <SelectItem value="pending">قيد الانتظار</SelectItem>
                      <SelectItem value="cancelled">ملغى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {purchase.notes && <p className="text-sm text-muted-foreground bg-muted rounded p-2">{purchase.notes}</p>}
              <Table>
                <TableHeader>
                  <TableRow><TableHead>الدواء</TableHead><TableHead className="text-center">الكمية</TableHead><TableHead className="text-right">سعر الوحدة</TableHead><TableHead className="text-right">الإجمالي</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {purchase.items.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.medicineName}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right">{item.unitPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-bold">{item.totalPrice.toFixed(2)} ج.م</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-between text-base font-bold border-t pt-3">
                <span>الإجمالي الكلي:</span>
                <span className="text-primary">{purchase.totalAmount.toFixed(2)} ج.م</span>
              </div>
            </div>
          ) : null}
      </DialogContent>
    </Dialog>
  );
}

export default function Purchases() {
  const { data: purchases, isLoading } = useListPurchases();
  const [viewId, setViewId] = useState<number | null>(null);

  const totalSpent = purchases?.reduce((sum: any, p: any) => sum + p.totalAmount, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">المشتريات</h1>
          <p className="text-muted-foreground">إدارة أوامر الشراء من الموردين.</p>
        </div>
        <Button asChild data-testid="button-new-purchase">
          <Link href="/purchases/new"><Plus className="mr-2 h-4 w-4" /> أمر شراء جديد</Link>
        </Button>
      </div>

      {purchases && purchases.length > 0 && (
        <div className="text-sm text-muted-foreground">
          {purchases.length} أمر شراء — إجمالي الإنفاق: <span className="font-bold text-foreground">{totalSpent.toFixed(2)} ج.م</span>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>المورد</TableHead>
                <TableHead>رقم الفاتورة</TableHead>
                <TableHead>عدد الأصناف</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="text-right">الإجمالي</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="h-24 text-center">جاري التحميل...</TableCell></TableRow>
              ) : !purchases?.length ? (
                <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">لا توجد أوامر شراء.</TableCell></TableRow>
              ) : (
                purchases.map((p: any) => (
                  <TableRow key={p.id} data-testid={`row-purchase-${p.id}`} className={p.status === "cancelled" ? "opacity-60" : ""}>
                    <TableCell className="font-mono text-muted-foreground">#{p.id}</TableCell>
                    <TableCell className="font-medium">{p.supplierName}</TableCell>
                    <TableCell>{p.invoiceNumber || "—"}</TableCell>
                    <TableCell>{p.items.length} صنف</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(p.createdAt).toLocaleDateString("ar-EG")}</TableCell>
                    <TableCell><Badge variant={STATUS_VARIANTS[p.status]}>{STATUS_LABELS[p.status] || p.status}</Badge></TableCell>
                    <TableCell className="text-right font-bold text-primary">{p.totalAmount.toFixed(2)} ج.م</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => setViewId(p.id)} data-testid={`button-view-purchase-${p.id}`} title="عرض التفاصيل">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PurchaseDetailDialog purchaseId={viewId} onClose={() => setViewId(null)} />
    </div>
  );
}
