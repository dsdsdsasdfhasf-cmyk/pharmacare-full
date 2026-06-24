import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, DollarSign, Package, AlertTriangle, Search, Download, FileDown } from "lucide-react";
import { useListMedicines } from "@workspace/api-client-react";
import { exportProfitLossPDF, exportExpiringPDF } from "@/lib/pdf-export";

interface ProfitLoss {
  totalRevenue: number;
  totalCost: number;
  profit: number;
  profitMargin: number;
  totalSales: number;
  totalItems: number;
}

interface MedicineProfitRow {
  medicineId: number;
  medicineName: string;
  genericName: string;
  totalQuantitySold: number;
  totalRevenue: number;
  totalCost: number;
  profit: number;
}

interface ExpiringMedicine {
  id: number;
  name: string;
  genericName: string;
  quantity: number;
  expiryDate: string;
  sellingPrice: number;
  purchasePrice: number;
  potentialLoss: number;
}

interface MovementData {
  medicine: { id: number; name: string; genericName: string; quantity: number; sellingPrice: number; purchasePrice: number };
  sales: Array<{ saleId: number; quantity: number; unitPrice: number; totalPrice: number; createdAt: string; status: string }>;
  totalSold: number;
  totalRevenue: number;
}

function StatCard({ title, value, sub, icon: Icon, color }: { title: string; value: string; sub?: string; icon: React.ElementType; color: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-sm font-medium text-foreground">{title}</div>
          {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

function daysUntilExpiry(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function exportCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const csv = [keys.join(","), ...data.map(r => keys.map(k => JSON.stringify(r[k] ?? "")).join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const [period, setPeriod] = useState("month");
  const [expiryDays, setExpiryDays] = useState("30");
  const [movementSearch, setMovementSearch] = useState("");
  const [selectedMedicineId, setSelectedMedicineId] = useState<number | null>(null);

  const { data: profitLoss } = useQuery<ProfitLoss>({
    queryKey: ["/api/reports/profit-loss", period],
    queryFn: () => fetch(`/api/reports/profit-loss?period=${period}`, { credentials: "include" }).then(r => r.json()),
  });

  const { data: profitByMedicine } = useQuery<MedicineProfitRow[]>({
    queryKey: ["/api/reports/profit-by-medicine"],
    queryFn: () => fetch("/api/reports/profit-by-medicine", { credentials: "include" }).then(r => r.json()),
  });

  const { data: expiring } = useQuery<ExpiringMedicine[]>({
    queryKey: ["/api/reports/expiring", expiryDays],
    queryFn: () => fetch(`/api/reports/expiring?days=${expiryDays}`, { credentials: "include" }).then(r => r.json()),
  });

  const { data: medicines } = useListMedicines({ search: movementSearch || undefined });

  const { data: movement } = useQuery<MovementData>({
    queryKey: ["/api/reports/medicine-movement", selectedMedicineId],
    queryFn: () => fetch(`/api/reports/medicine-movement/${selectedMedicineId}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!selectedMedicineId,
  });

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">التقارير</h1>
        <p className="text-muted-foreground">تقارير مالية ومخزون متقدمة</p>
      </div>

      <Tabs defaultValue="profit">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profit">الأرباح والخسائر</TabsTrigger>
          <TabsTrigger value="expiring">الأدوية المنتهية الصلاحية</TabsTrigger>
          <TabsTrigger value="movement">حركة الدواء</TabsTrigger>
        </TabsList>

        {/* ─── Profit/Loss Tab ─── */}
        <TabsContent value="profit" className="space-y-6 mt-4">
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-sm font-medium text-muted-foreground">الفترة:</span>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">اليوم</SelectItem>
                <SelectItem value="week">آخر 7 أيام</SelectItem>
                <SelectItem value="month">هذا الشهر</SelectItem>
                <SelectItem value="all">الكل</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard title="إجمالي الإيرادات" value={`${(profitLoss?.totalRevenue ?? 0).toFixed(2)} ج.م`} icon={DollarSign} color="bg-blue-500" />
            <StatCard title="إجمالي التكلفة" value={`${(profitLoss?.totalCost ?? 0).toFixed(2)} ج.م`} icon={TrendingDown} color="bg-orange-500" />
            <StatCard
              title="صافي الربح"
              value={`${(profitLoss?.profit ?? 0).toFixed(2)} ج.م`}
              sub={`هامش الربح: ${(profitLoss?.profitMargin ?? 0).toFixed(1)}%`}
              icon={TrendingUp}
              color={(profitLoss?.profit ?? 0) >= 0 ? "bg-green-500" : "bg-red-500"}
            />
            <StatCard title="عدد الفواتير" value={String(profitLoss?.totalSales ?? 0)} icon={Package} color="bg-purple-500" />
            <StatCard title="الأصناف المباعة" value={String(profitLoss?.totalItems ?? 0)} icon={Package} color="bg-teal-500" />
          </div>

          {profitByMedicine && profitByMedicine.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
                <CardTitle>الأرباح حسب الدواء (أعلى 20)</CardTitle>
                <div className="flex gap-2 flex-wrap">
                  {profitLoss && (
                    <Button size="sm" variant="default" onClick={() => exportProfitLossPDF(profitLoss, profitByMedicine ?? [], period)}>
                      <FileDown className="h-4 w-4 ml-1" />
                      PDF
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => exportCSV(profitByMedicine as unknown as Record<string, unknown>[], "profit-by-medicine.csv")}>
                    <Download className="h-4 w-4 ml-1" />
                    CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الدواء</TableHead>
                      <TableHead className="text-center">الكمية المباعة</TableHead>
                      <TableHead className="text-right">الإيرادات</TableHead>
                      <TableHead className="text-right">التكلفة</TableHead>
                      <TableHead className="text-right">الربح</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profitByMedicine.map(r => (
                      <TableRow key={r.medicineId}>
                        <TableCell>
                          <div className="font-medium">{r.medicineName}</div>
                          <div className="text-xs text-muted-foreground">{r.genericName}</div>
                        </TableCell>
                        <TableCell className="text-center">{r.totalQuantitySold}</TableCell>
                        <TableCell className="text-right">{r.totalRevenue.toFixed(2)} ج.م</TableCell>
                        <TableCell className="text-right">{r.totalCost.toFixed(2)} ج.م</TableCell>
                        <TableCell className="text-right">
                          <span className={r.profit >= 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                            {r.profit >= 0 ? "+" : ""}{r.profit.toFixed(2)} ج.م
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── Expiring Tab ─── */}
        <TabsContent value="expiring" className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-sm font-medium text-muted-foreground">انتهاء الصلاحية خلال:</span>
            <Select value={expiryDays} onValueChange={setExpiryDays}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 أيام</SelectItem>
                <SelectItem value="14">14 يوم</SelectItem>
                <SelectItem value="30">30 يوم</SelectItem>
                <SelectItem value="60">60 يوم</SelectItem>
                <SelectItem value="90">90 يوم</SelectItem>
              </SelectContent>
            </Select>
            {expiring && (
              <Button size="sm" variant="default" onClick={() => exportExpiringPDF(expiring, expiryDays)}>
                <FileDown className="h-4 w-4 ml-1" />
                PDF
              </Button>
            )}
            {expiring && (
              <Button size="sm" variant="outline" onClick={() => exportCSV(expiring as unknown as Record<string, unknown>[], "expiring-medicines.csv")}>
                <Download className="h-4 w-4 ml-1" />
                CSV
              </Button>
            )}
            {expiring && (
              <Badge variant="destructive" className="mr-2">
                {expiring.length} دواء
              </Badge>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الدواء</TableHead>
                    <TableHead className="text-center">الكمية</TableHead>
                    <TableHead className="text-center">تاريخ الانتهاء</TableHead>
                    <TableHead className="text-center">يبقى</TableHead>
                    <TableHead className="text-right">الخسارة المحتملة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!expiring?.length ? (
                    <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">لا توجد أدوية ستنتهي صلاحيتها في هذه الفترة</TableCell></TableRow>
                  ) : expiring.map(m => {
                    const days = daysUntilExpiry(m.expiryDate);
                    return (
                      <TableRow key={m.id}>
                        <TableCell>
                          <div className="font-medium">{m.name}</div>
                          <div className="text-xs text-muted-foreground">{m.genericName}</div>
                        </TableCell>
                        <TableCell className="text-center">{m.quantity}</TableCell>
                        <TableCell className="text-center">{new Date(m.expiryDate).toLocaleDateString("ar-EG")}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={days <= 7 ? "destructive" : days <= 30 ? "secondary" : "outline"}>
                            {days} يوم
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-destructive font-bold">
                          {m.potentialLoss.toFixed(2)} ج.م
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Medicine Movement Tab ─── */}
        <TabsContent value="movement" className="space-y-4 mt-4">
          <div className="flex gap-3 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ابحث عن دواء..."
                className="pr-9"
                value={movementSearch}
                onChange={e => setMovementSearch(e.target.value)}
              />
            </div>
          </div>

          {movementSearch && medicines && medicines.length > 0 && !movement && (
            <Card>
              <CardContent className="p-2">
                {medicines.slice(0, 8).map(m => (
                  <button
                    key={m.id}
                    className="w-full text-right px-3 py-2 hover:bg-muted rounded-md transition-colors"
                    onClick={() => { setSelectedMedicineId(m.id); setMovementSearch(""); }}
                  >
                    <div className="font-medium text-sm">{m.name}</div>
                    <div className="text-xs text-muted-foreground">{m.genericName}</div>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}

          {movement && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-lg font-bold">{movement.medicine.name}</h3>
                  <p className="text-sm text-muted-foreground">{movement.medicine.genericName}</p>
                </div>
                <div className="flex gap-3 flex-wrap">
                  <Badge variant="outline">المخزون الحالي: {movement.medicine.quantity}</Badge>
                  <Badge variant="outline">إجمالي المبيعات: {movement.totalSold}</Badge>
                  <Badge variant="outline">إجمالي الإيرادات: {movement.totalRevenue.toFixed(2)} ج.م</Badge>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedMedicineId(null)}>
                    بحث جديد
                  </Button>
                </div>
              </div>

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>رقم الفاتورة</TableHead>
                        <TableHead className="text-center">الكمية</TableHead>
                        <TableHead className="text-right">سعر الوحدة</TableHead>
                        <TableHead className="text-right">الإجمالي</TableHead>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>الحالة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!movement.sales.length ? (
                        <TableRow><TableCell colSpan={6} className="h-16 text-center text-muted-foreground">لا توجد مبيعات لهذا الدواء</TableCell></TableRow>
                      ) : movement.sales.map((s, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono">#{s.saleId}</TableCell>
                          <TableCell className="text-center">{s.quantity}</TableCell>
                          <TableCell className="text-right">{s.unitPrice.toFixed(2)} ج.م</TableCell>
                          <TableCell className="text-right font-medium">{s.totalPrice.toFixed(2)} ج.م</TableCell>
                          <TableCell className="text-muted-foreground">{new Date(s.createdAt).toLocaleDateString("ar-EG")}</TableCell>
                          <TableCell>
                            <Badge variant={s.status === "refunded" ? "destructive" : "default"}>
                              {s.status === "refunded" ? "مسترجع" : "مكتمل"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {!selectedMedicineId && !movementSearch && (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
              <AlertTriangle className="h-8 w-8 opacity-40" />
              <p>ابحث عن دواء لعرض حركته</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
