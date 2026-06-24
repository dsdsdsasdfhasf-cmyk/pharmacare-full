import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  useGetDashboardSummary, useGetSalesChart, useGetTopMedicines, useGetLowStockAlerts,
} from "@workspace/api-client-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import {
  TrendingUp, TrendingDown, Pill, AlertTriangle, Clock,
  ArrowLeft, DollarSign, Users, ShoppingCart, ArrowUpRight, ArrowDownRight,
} from "lucide-react";

const METHOD_LABEL: Record<string, string> = { cash: "نقدي", card: "بطاقة", insurance: "تأمين" };
const METHOD_COLOR: Record<string, string> = { cash: "#14b8a6", card: "#6366f1", insurance: "#f59e0b" };
const PIE_COLORS = ["#14b8a6", "#6366f1", "#f59e0b", "#ef4444"];

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

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("ar-EG", { month: "short", day: "numeric" });
}
function fmtMoney(v: number) { return `${v.toFixed(0)} ج.م`; }

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: chartData } = useGetSalesChart();
  const { data: topMedicines } = useGetTopMedicines();
  const { data: lowStock } = useGetLowStockAlerts();

  const { data: paymentBreakdown } = useQuery<{ method: string; count: number; total: number }[]>({
    queryKey: ["/api/dashboard/payment-breakdown"],
    queryFn: () => fetch("/api/dashboard/payment-breakdown", { credentials: "include" }).then(r => r.json()),
  });

  const { data: weekly } = useQuery<{
    thisWeek: { revenue: number; count: number };
    lastWeek: { revenue: number; count: number };
    changePercent: number;
  }>({
    queryKey: ["/api/dashboard/weekly-comparison"],
    queryFn: () => fetch("/api/dashboard/weekly-comparison", { credentials: "include" }).then(r => r.json()),
  });

  const pieData = paymentBreakdown?.map(p => ({
    name: METHOD_LABEL[p.method] ?? p.method,
    value: p.count,
    total: p.total,
    method: p.method,
  })) ?? [];

  const maxRevenue = Math.max(...(topMedicines?.map(m => m.totalRevenue) ?? [1]), 1);

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">لوحة القيادة</h1>
        <p className="text-muted-foreground mt-1">نظرة عامة على أداء الصيدلية</p>
      </div>

      {/* ── Stat cards ── */}
      {loadingSummary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="إيرادات اليوم"
            value={`${summary.todayRevenue.toFixed(2)} ج.م`}
            sub={`${summary.todaySales} فاتورة اليوم`}
            icon={DollarSign} color="bg-primary"
            trend={weekly?.changePercent}
            trendLabel="مقارنةً بالأسبوع الماضي"
          />
          <StatCard
            title="إيرادات الشهر"
            value={`${summary.monthRevenue.toFixed(2)} ج.م`}
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

      {/* ── Alert row ── */}
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

      {/* ── Main charts row ── */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Revenue area chart */}
        <Card className="lg:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">الإيرادات اليومية — آخر 30 يوم</CardTitle>
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
                    tickFormatter={fmtDate} interval="preserveStartEnd" />
                  <YAxis tickLine={false} axisLine={false}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={fmtMoney} width={70} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [fmtMoney(v), "الإيراد"]}
                    labelFormatter={fmtDate}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2}
                    fillOpacity={1} fill="url(#gradRevenue)" dot={false} activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">لا توجد بيانات بعد</div>
            )}
          </CardContent>
        </Card>

        {/* Payment breakdown pie */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">طرق الدفع — آخر 30 يوم</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <div className="space-y-3">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                      dataKey="value" paddingAngle={3}>
                      {pieData.map((entry) => (
                        <Cell key={entry.method} fill={METHOD_COLOR[entry.method] ?? PIE_COLORS[0]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "hsl(var(--border))" }}
                      formatter={(v: number, _n: string, p: { payload: typeof pieData[0] }) =>
                        [`${v} فاتورة • ${fmtMoney(p.payload.total)}`, p.payload.name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {pieData.map(d => (
                    <div key={d.method} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: METHOD_COLOR[d.method] ?? PIE_COLORS[0] }} />
                        <span>{d.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground text-xs">
                        <span>{d.value} فاتورة</span>
                        <span className="font-medium text-foreground">{fmtMoney(d.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">لا توجد مبيعات بعد</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Second row: daily bar chart + top medicines ── */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Daily sales count bar chart */}
        <Card className="lg:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">عدد الفواتير اليومية — آخر 30 يوم</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={fmtDate} interval="preserveStartEnd" />
                  <YAxis tickLine={false} axisLine={false}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    allowDecimals={false} width={30} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [v, "فاتورة"]}
                    labelFormatter={fmtDate}
                  />
                  <Bar dataKey="salesCount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">لا توجد بيانات بعد</div>
            )}
          </CardContent>
        </Card>

        {/* Top medicines */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">أفضل الأدوية مبيعاً</CardTitle>
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
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${(med.totalRevenue / maxRevenue) * 100}%` }}
                  />
                </div>
              </div>
            )) : (
              <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">لا توجد مبيعات بعد</div>
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
              {lowStock.slice(0, 6).map(med => (
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
