import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetDashboardSummary, useGetSalesChart, useGetTopMedicines, useGetLowStockAlerts } from "@workspace/api-client-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Pill, AlertTriangle, TrendingUp, Clock, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: chartData, isLoading: loadingChart } = useGetSalesChart();
  const { data: topMedicines, isLoading: loadingTop } = useGetTopMedicines();
  const { data: lowStock, isLoading: loadingLowStock } = useGetLowStockAlerts();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard (لوحة القيادة)</h1>
        <p className="text-muted-foreground">Overview of your pharmacy performance and alerts.</p>
      </div>

      {loadingSummary ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : summary ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Revenue (إيرادات اليوم)</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.todayRevenue.toFixed(2)} EGP</div>
              <p className="text-xs text-muted-foreground mt-1">{summary.todaySales} sales today</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Medicines (إجمالي الأدوية)</CardTitle>
              <Pill className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalMedicines}</div>
              <p className="text-xs text-muted-foreground mt-1">Items in inventory</p>
            </CardContent>
          </Card>

          <Card className={summary.lowStockCount > 0 ? "border-destructive/50 bg-destructive/5" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Alerts (تنبيهات نقص المخزون)</CardTitle>
              <AlertTriangle className={`h-4 w-4 ${summary.lowStockCount > 0 ? "text-destructive" : "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.lowStockCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Items below minimum quantity</p>
            </CardContent>
          </Card>

          <Card className={summary.expiringSoonCount > 0 ? "border-amber-500/50 bg-amber-500/5" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expiring Soon (قريباً انتهاء الصلاحية)</CardTitle>
              <Clock className={`h-4 w-4 ${summary.expiringSoonCount > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.expiringSoonCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Items expiring in 3 months</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {lowStock && lowStock.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              أدوية تحتاج إعادة تخزين ({lowStock.length})
            </CardTitle>
            <Link href="/alerts" className="flex items-center gap-1 text-sm text-primary hover:underline">
              عرض الكل
              <ArrowLeft className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {lowStock.slice(0, 6).map((med) => (
                <div
                  key={med.id}
                  className="flex items-center justify-between rounded-lg border bg-card px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{med.name}</p>
                    <p className="text-xs text-muted-foreground">
                      الحد الأدنى: {med.minQuantity}
                    </p>
                  </div>
                  <Badge
                    className={`ml-2 shrink-0 ${
                      med.quantity === 0
                        ? "bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/15"
                        : "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100"
                    }`}
                  >
                    {med.quantity} وحدة
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-7">
        <Card className="md:col-span-4">
          <CardHeader>
            <CardTitle>Sales Revenue (إيرادات المبيعات) - Last 30 Days</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingChart ? (
              <div className="h-[300px] bg-muted rounded-xl animate-pulse" />
            ) : chartData && chartData.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(val) => `${val}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                      labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '4px' }}
                      formatter={(value: number) => [`${value.toFixed(2)} EGP`, 'Revenue']}
                      labelFormatter={(label) => new Date(label).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Top Medicines (أفضل الأدوية)</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTop ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}
              </div>
            ) : topMedicines && topMedicines.length > 0 ? (
              <div className="space-y-4">
                {topMedicines.map((item, index) => (
                  <div key={item.medicineId} className="flex items-center">
                    <div className="w-8 text-center text-sm font-bold text-muted-foreground">{index + 1}</div>
                    <div className="ml-2 space-y-1 flex-1">
                      <p className="text-sm font-medium leading-none">{item.medicineName}</p>
                      <p className="text-xs text-muted-foreground">{item.totalQuantity} units sold</p>
                    </div>
                    <div className="font-medium text-sm">{item.totalRevenue.toFixed(2)} EGP</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
