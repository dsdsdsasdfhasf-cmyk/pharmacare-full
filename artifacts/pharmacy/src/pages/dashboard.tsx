import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useGetDashboardSummary, useGetLowStockAlerts, useListSales } from "@workspace/api-client-react";
import {
  AreaChart, Area, BarChart, Bar,
  ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import {
  TrendingUp, Pill, AlertTriangle, Clock,
  ArrowLeft, DollarSign, Users, ArrowUpRight, ArrowDownRight,
} from "lucide-react";

type Period = "today" | "week" | "month" | "year";

const PERIOD_LABELS: Record<Period, string> = {
  today: "اليوم",
  week: "الأسبوع",
  month: "الشهر",
  year: "السنة",
};

function fmtMoney(v: number) { return `${v.toFixed(0)} ج.م`; }

const CustomTooltip = ({ active, payload, label, fmt }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/95 backdrop-blur border rounded-xl p-3 shadow-md flex flex-col gap-1 text-right text-xs">
        <p className="font-semibold text-muted-foreground">{label}</p>
        <p className="text-sm font-bold text-primary">
          {fmt(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

function fmtDateLabel(d: string, period: Period) {
  if (period === "today") return d; // already HH:00
  const dt = new Date(d);
  if (period === "year") return dt.toLocaleDateString("ar-EG", { month: "short", day: "numeric" });
  return dt.toLocaleDateString("ar-EG", { month: "short", day: "numeric" });
}

function StatCard({
  title, value, sub, icon: Icon, color, trend, trendLabel,
}: {
  title: string; value: string; sub?: string;
  icon: React.ElementType; color: string;
  trend?: number; trendLabel?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div className={`p-2.5 rounded-xl ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          {trend !== undefined && (
            <div className={`flex items-center gap-0.5 text-xs font-medium ${trend >= 0 ? "text-green-600" : "text-red-500"}`}>
              {trend >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {Math.abs(trend).toFixed(1)}%
            </div>
          )}
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold tracking-tight">{value}</div>
          <div className="text-sm text-muted-foreground mt-0.5">{title}</div>
          {sub && <div className="text-xs text-muted-foreground mt-0.5 opacity-70">{sub}</div>}
          {trendLabel && <div className="text-xs text-muted-foreground mt-0.5">{trendLabel}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [period, setPeriod] = useState<Period>("month");

  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: lowStock } = useGetLowStockAlerts();
  const { data: sales } = useListSales();

  const { data: chartData } = useQuery<{ date: string; revenue: number; salesCount: number }[]>({
    queryKey: ["/api/dashboard/sales-chart", period],
    queryFn: () => fetch(`/api/dashboard/sales-chart?period=${period}`, { credentials: "include" }).then(r => r.json()),
  });

  const { data: topMedicines } = useQuery<{ medicineId: number; medicineName: string; totalQuantity: number; totalRevenue: number }[]>({
    queryKey: ["/api/dashboard/top-medicines", period],
    queryFn: () => fetch(`/api/dashboard/top-medicines?period=${period}`, { credentials: "include" }).then(r => r.json()),
  });

  const periodRevenue = chartData?.reduce((s, r) => s + r.revenue, 0) ?? 0;
  const periodSalesCount = chartData?.reduce((s, r) => s + r.salesCount, 0) ?? 0;
  const recentSales = sales ?? [];
  const maxRevenue = Math.max(...(topMedicines?.map(m => m.totalRevenue) ?? [1]), 1);

  const PAYMENT_LABELS_AR: Record<string, string> = { cash: "نقدي", card: "بطاقة", insurance: "تأمين" };
  const COLORS = ["hsl(var(--primary))", "#10b981", "#6366f1"];
  const paymentData = sales ? Object.entries(
    sales.reduce((acc: Record<string, number>, s: any) => {
      acc[s.paymentMethod] = (acc[s.paymentMethod] || 0) + s.totalAmount;
      return acc;
    }, {})
  ).map(([name, value]) => ({
    name: PAYMENT_LABELS_AR[name] || name,
    value,
    rawName: name,
  })) : [];

  return (
    <div className="space-y-6" dir="rtl">

      {/* ── Header + period selector ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">لوحة القيادة</h1>
          <p className="text-muted-foreground mt-1">نظرة عامة على أداء الصيدلية</p>
        </div>
        <div className="flex gap-1 rounded-lg border bg-muted/40 p-1 w-fit self-start sm:self-auto">
          {(["today", "week", "month", "year"] as Period[]).map(p => (
            <Button
              key={p}
              variant={period === p ? "default" : "ghost"}
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => setPeriod(p)}
            >
              {PERIOD_LABELS[p]}
            </Button>
          ))}
        </div>
      </div>

      {/* ── Stat cards ── */}
      {loadingSummary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={`إيرادات ${PERIOD_LABELS[period]}`}
            value={`${periodRevenue.toFixed(2)} ج.م`}
            sub={`${periodSalesCount} فاتورة`}
            icon={DollarSign} color="bg-primary"
          />
          <StatCard
            title="إيرادات اليوم"
            value={`${summary.todayRevenue.toFixed(2)} ج.م`}
            sub={`${summary.todaySales} فاتورة اليوم`}
            icon={TrendingUp} color="bg-green-500"
          />
          <StatCard
            title="إجمالي الأدوية"
            value={String(summary.totalMedicines)}
            icon={Pill} color="bg-indigo-500"
          />
          <StatCard
            title="إجمالي العملاء"
            value={String(summary.totalCustomers)}
            icon={Users} color="bg-violet-500"
          />
        </div>
      )}

      {/* ── Alert banners ── */}
      {summary && (summary.lowStockCount > 0 || summary.expiringSoonCount > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {summary.lowStockCount > 0 && (
            <Card className="border-destructive/40 bg-destructive/5">
              <CardContent className="pt-4 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-destructive/10">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <div className="font-semibold text-destructive">{summary.lowStockCount} دواء نقص مخزونه</div>
                    <div className="text-xs text-muted-foreground">أقل من الحد الأدنى</div>
                  </div>
                </div>
                <Link href="/alerts">
                  <Badge variant="destructive" className="cursor-pointer gap-1">عرض <ArrowLeft className="h-3 w-3" /></Badge>
                </Link>
              </CardContent>
            </Card>
          )}
          {summary.expiringSoonCount > 0 && (
            <Card className="border-amber-400/40 bg-amber-50 dark:bg-amber-950/20">
              <CardContent className="pt-4 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-amber-700 dark:text-amber-400">{summary.expiringSoonCount} دواء قريب الانتهاء</div>
                    <div className="text-xs text-muted-foreground">خلال 3 أشهر</div>
                  </div>
                </div>
                <Link href="/reports">
                  <Badge className="cursor-pointer gap-1 bg-amber-500 hover:bg-amber-600">عرض <ArrowLeft className="h-3 w-3" /></Badge>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Revenue area chart + sales bar chart ── */}
      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">الإيرادات — {PERIOD_LABELS[period]}</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={d => fmtDateLabel(d, period)}
                    interval="preserveStartEnd" />
                  <YAxis tickLine={false} axisLine={false}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={fmtMoney} width={72} />
                  <Tooltip content={<CustomTooltip fmt={fmtMoney} />} />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2}
                    fillOpacity={1} fill="url(#gradRevenue)" dot={false} activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">لا توجد بيانات لهذه الفترة</div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">آخر الفواتير</CardTitle>
          </CardHeader>
          <CardContent>
            {recentSales.length > 0 ? (
              <div className="space-y-3">
                {recentSales.slice(0, 8).map((sale: any) => {
                  const dateLabel = sale.createdAt
                    ? new Date(sale.createdAt).toLocaleDateString("ar-EG", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "";
                  return (
                    <div key={sale.id} className="flex items-center justify-between text-sm">
                      <div className="min-w-0">
                        <div className="font-medium truncate">فاتورة #{sale.id}</div>
                        <div className="text-xs text-muted-foreground">{dateLabel}</div>
                      </div>
                      <div className="text-xs font-bold shrink-0 mr-2">
                        {fmtMoney(sale.totalAmount)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-[160px] flex items-center justify-center text-muted-foreground text-sm">لا توجد فواتير حديثة</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Daily sales bar + top medicines + payment methods ── */}
      <div className="grid gap-6 lg:grid-cols-10">
        <Card className="lg:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">عدد الفواتير — {PERIOD_LABELS[period]}</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={d => fmtDateLabel(d, period)}
                    interval="preserveStartEnd" />
                  <YAxis tickLine={false} axisLine={false}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    allowDecimals={false} width={30} />
                  <Tooltip content={<CustomTooltip fmt={(v: number) => `${v} فاتورة`} />} />
                  <Bar dataKey="salesCount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">لا توجد بيانات لهذه الفترة</div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">أفضل الأدوية — {PERIOD_LABELS[period]}</CardTitle>
            <Link href="/reports" className="flex items-center gap-1 text-xs text-primary hover:underline">
              التقارير <ArrowLeft className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {topMedicines && topMedicines.length > 0 ? topMedicines.slice(0, 7).map((med, i) => (
              <div key={med.medicineId} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-muted-foreground w-4 shrink-0">{i + 1}</span>
                    <span className="truncate font-medium">{med.medicineName}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 mr-2">
                    <span className="text-xs text-muted-foreground">{med.totalQuantity} وحدة</span>
                    <span className="text-xs font-bold">{fmtMoney(med.totalRevenue)}</span>
                  </div>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${(med.totalRevenue / maxRevenue) * 100}%` }}
                  />
                </div>
              </div>
            )) : (
              <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">لا توجد مبيعات في هذه الفترة</div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">طرق الدفع الأكثر استخداماً</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pt-2">
            {paymentData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie
                      data={paymentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {paymentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip fmt={fmtMoney} />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-1.5 mt-2 w-full text-xs">
                  {paymentData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-muted-foreground">{entry.name}</span>
                      </div>
                      <span className="font-bold">{fmtMoney(entry.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">لا توجد بيانات دفع</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Low stock grid ── */}
      {lowStock && lowStock.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              أدوية تحتاج إعادة تخزين ({lowStock.length})
            </CardTitle>
            <Link href="/alerts" className="flex items-center gap-1 text-sm text-primary hover:underline">
              عرض الكل <ArrowLeft className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {lowStock.slice(0, 6).map((med: any) => (
                <div key={med.id} className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{med.name}</p>
                    <p className="text-xs text-muted-foreground">الحد الأدنى: {med.minQuantity}</p>
                  </div>
                  <Badge className={`mr-2 shrink-0 ${med.quantity === 0 ? "bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/15" : "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100"}`}>
                    {med.quantity} وحدة
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
