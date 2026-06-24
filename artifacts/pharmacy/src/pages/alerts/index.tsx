import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Clock, Pencil, Check, X, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LowStockMedicine {
  id: number;
  name: string;
  genericName: string | null;
  quantity: number;
  minQuantity: number;
  location: string | null;
  sellingPrice: number;
}

interface ExpiringMedicine {
  id: number;
  name: string;
  genericName: string | null;
  quantity: number;
  expiryDate: string;
  location: string | null;
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function ThresholdEditor({
  medicine,
  onClose,
}: {
  medicine: LowStockMedicine;
  onClose: () => void;
}) {
  const [value, setValue] = useState(String(medicine.minQuantity));
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (minQty: number) => {
      const res = await fetch(`/api/medicines/${medicine.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minQuantity: minQty }),
      });
      if (!res.ok) throw new Error("فشل التحديث");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/low-stock"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      toast({ title: "تم التحديث", description: `تم تحديث الحد الأدنى لـ ${medicine.name}` });
      onClose();
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل تحديث الحد الأدنى", variant: "destructive" });
    },
  });

  return (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        min="0"
        className="h-7 w-20 text-sm"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") mutation.mutate(parseInt(value) || 0);
          if (e.key === "Escape") onClose();
        }}
        autoFocus
      />
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 text-green-600"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate(parseInt(value) || 0)}
      >
        <Check className="h-3.5 w-3.5" />
      </Button>
      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={onClose}>
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export default function AlertsPage() {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expiryDays, setExpiryDays] = useState(30);

  const { data: lowStock, isLoading: loadingLow, refetch: refetchLow } = useQuery<LowStockMedicine[]>({
    queryKey: ["/api/dashboard/low-stock"],
    queryFn: () => fetch("/api/dashboard/low-stock", { credentials: "include" }).then((r) => r.json()),
    refetchInterval: 60000,
  });

  const { data: expiring, isLoading: loadingExp, refetch: refetchExp } = useQuery<ExpiringMedicine[]>({
    queryKey: ["/api/reports/expiring", expiryDays],
    queryFn: () =>
      fetch(`/api/reports/expiring?days=${expiryDays}`, { credentials: "include" }).then((r) => r.json()),
    refetchInterval: 60000,
  });

  const outOfStock = (lowStock || []).filter((m) => m.quantity === 0);
  const belowMin = (lowStock || []).filter((m) => m.quantity > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          تنبيهات المخزون (Stock Alerts)
        </h1>
        <p className="text-muted-foreground">
          متابعة الأدوية ناقصة المخزون ومنتهية الصلاحية مع إمكانية ضبط حد التنبيه
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className={outOfStock.length > 0 ? "border-destructive/60 bg-destructive/5" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">نفاد المخزون</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${outOfStock.length > 0 ? "text-destructive" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{outOfStock.length}</div>
            <p className="text-xs text-muted-foreground mt-1">دواء نفد مخزونه بالكامل</p>
          </CardContent>
        </Card>

        <Card className={belowMin.length > 0 ? "border-amber-500/60 bg-amber-500/5" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">أقل من الحد الأدنى</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${belowMin.length > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{belowMin.length}</div>
            <p className="text-xs text-muted-foreground mt-1">دواء أقل من الحد المقرر</p>
          </CardContent>
        </Card>

        <Card className={expiring && expiring.length > 0 ? "border-orange-400/60 bg-orange-400/5" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">قريب الانتهاء</CardTitle>
            <Clock className={`h-4 w-4 ${expiring && expiring.length > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{expiring?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">خلال {expiryDays} يوم</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            أدوية ناقصة المخزون
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => refetchLow()}>
            <RefreshCw className="h-4 w-4 ml-1" />
            تحديث
          </Button>
        </CardHeader>
        <CardContent>
          {loadingLow ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : !lowStock || lowStock.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">لا توجد أدوية ناقصة المخزون حالياً</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-right py-2 pr-2 font-medium">الدواء</th>
                    <th className="text-right py-2 font-medium">الموقع</th>
                    <th className="text-right py-2 font-medium">المخزون الحالي</th>
                    <th className="text-right py-2 font-medium">الحد الأدنى</th>
                    <th className="text-right py-2 font-medium">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lowStock.map((med) => (
                    <tr key={med.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 pr-2">
                        <div className="font-medium">{med.name}</div>
                        {med.genericName && (
                          <div className="text-xs text-muted-foreground">{med.genericName}</div>
                        )}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {med.location || "—"}
                      </td>
                      <td className="py-3">
                        <span
                          className={`font-bold text-base ${
                            med.quantity === 0 ? "text-destructive" : "text-amber-600"
                          }`}
                        >
                          {med.quantity}
                        </span>
                      </td>
                      <td className="py-3">
                        {editingId === med.id ? (
                          <ThresholdEditor
                            medicine={med}
                            onClose={() => setEditingId(null)}
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <span>{med.minQuantity}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-50 hover:opacity-100"
                              onClick={() => setEditingId(med.id)}
                              title="تعديل الحد الأدنى"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </td>
                      <td className="py-3">
                        {med.quantity === 0 ? (
                          <Badge variant="destructive">نفد المخزون</Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-300">
                            أقل من الحد
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            أدوية قريبة الانتهاء
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">عرض خلال</span>
            <div className="flex gap-1">
              {[14, 30, 60, 90].map((d) => (
                <Button
                  key={d}
                  size="sm"
                  variant={expiryDays === d ? "default" : "outline"}
                  className="h-7 px-2 text-xs"
                  onClick={() => setExpiryDays(d)}
                >
                  {d}د
                </Button>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={() => refetchExp()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingExp ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : !expiring || expiring.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">لا توجد أدوية تنتهي خلال {expiryDays} يوم</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-right py-2 pr-2 font-medium">الدواء</th>
                    <th className="text-right py-2 font-medium">الموقع</th>
                    <th className="text-right py-2 font-medium">الكمية المتبقية</th>
                    <th className="text-right py-2 font-medium">تاريخ الانتهاء</th>
                    <th className="text-right py-2 font-medium">الأيام المتبقية</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {expiring.map((med) => {
                    const days = daysUntil(med.expiryDate);
                    return (
                      <tr key={med.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 pr-2">
                          <div className="font-medium">{med.name}</div>
                          {med.genericName && (
                            <div className="text-xs text-muted-foreground">{med.genericName}</div>
                          )}
                        </td>
                        <td className="py-3 text-muted-foreground">{med.location || "—"}</td>
                        <td className="py-3 font-medium">{med.quantity}</td>
                        <td className="py-3">
                          {new Date(med.expiryDate).toLocaleDateString("ar-EG", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </td>
                        <td className="py-3">
                          <Badge
                            className={
                              days <= 7
                                ? "bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/10"
                                : days <= 14
                                ? "bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-100"
                                : "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100"
                            }
                          >
                            {days <= 0 ? "منتهي!" : `${days} يوم`}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
