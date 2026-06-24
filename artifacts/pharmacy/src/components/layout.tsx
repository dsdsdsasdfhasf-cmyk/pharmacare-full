import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, Pill, ShoppingCart, Truck, Users, UserSquare,
  FileText, Tags, Menu, Stethoscope, BarChart2, Bell, LogOut, ChevronDown, AlertTriangle, BellRing, UserCog, Settings
} from "lucide-react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { Badge } from "./ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { useAuth } from "@/context/auth";

interface LayoutProps {
  children: React.ReactNode;
}

const ADMIN_NAV = [
  { href: "/", label: "لوحة القيادة", icon: LayoutDashboard, exact: true },
  { href: "/sales/new", label: "POS – نقطة البيع", icon: ShoppingCart, exact: true },
  { href: "/medicines", label: "الأدوية", icon: Pill },
  { href: "/sales", label: "المبيعات", icon: FileText, exact: true },
  { href: "/purchases", label: "المشتريات", icon: Truck },
  { href: "/prescriptions", label: "الوصفات الطبية", icon: Stethoscope },
  { href: "/customers", label: "العملاء", icon: Users },
  { href: "/suppliers", label: "الموردين", icon: UserSquare },
  { href: "/categories", label: "الفئات", icon: Tags },
  { href: "/reports", label: "التقارير", icon: BarChart2 },
  { href: "/alerts", label: "تنبيهات المخزون", icon: BellRing },
  { href: "/users", label: "المستخدمون", icon: UserCog },
  { href: "/settings", label: "الإعدادات والنسخ الاحتياطي", icon: Settings },
];

const PHARMACIST_NAV = [
  { href: "/", label: "لوحة القيادة", icon: LayoutDashboard, exact: true },
  { href: "/sales/new", label: "POS – نقطة البيع", icon: ShoppingCart, exact: true },
  { href: "/medicines", label: "الأدوية", icon: Pill },
  { href: "/sales", label: "المبيعات", icon: FileText, exact: true },
  { href: "/prescriptions", label: "الوصفات الطبية", icon: Stethoscope },
  { href: "/customers", label: "العملاء", icon: Users },
  { href: "/alerts", label: "تنبيهات المخزون", icon: BellRing },
];

interface Notification {
  id: string;
  type: "low_stock" | "expiring";
  message: string;
  severity: "warning" | "critical";
}

function NotificationsBell() {
  const { data: lowStock } = useQuery<{ id: number; name: string; quantity: number; minQuantity: number }[]>({
    queryKey: ["/api/dashboard/low-stock"],
    queryFn: () => fetch("/api/dashboard/low-stock", { credentials: "include" }).then(r => r.json()),
    refetchInterval: 60000,
  });

  const { data: expiring } = useQuery<{ id: number; name: string; expiryDate: string; quantity: number }[]>({
    queryKey: ["/api/reports/expiring", "14"],
    queryFn: () => fetch("/api/reports/expiring?days=14", { credentials: "include" }).then(r => r.json()),
    refetchInterval: 60000,
  });

  const notifications: Notification[] = [
    ...(lowStock || []).map(m => ({
      id: `ls-${m.id}`,
      type: "low_stock" as const,
      message: `${m.name} — المخزون: ${m.quantity} (الحد الأدنى: ${m.minQuantity})`,
      severity: (m.quantity === 0 ? "critical" : "warning") as "critical" | "warning",
    })),
    ...(expiring || []).map(m => ({
      id: `exp-${m.id}`,
      type: "expiring" as const,
      message: `${m.name} — تنتهي: ${new Date(m.expiryDate).toLocaleDateString("ar-EG")}`,
      severity: "warning" as const,
    })),
  ];

  const count = notifications.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative shrink-0" title="الإشعارات">
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0" dir="rtl">
        <div className="p-3 border-b font-semibold text-sm flex items-center gap-2">
          <Bell className="h-4 w-4" />
          الإشعارات
          {count > 0 && <Badge variant="destructive" className="mr-auto">{count}</Badge>}
        </div>
        <div className="max-h-72 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">لا توجد إشعارات</div>
          ) : notifications.map(n => (
            <div key={n.id} className={`flex items-start gap-2 p-3 border-b last:border-b-0 text-sm ${n.severity === "critical" ? "bg-destructive/5" : ""}`}>
              <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${n.severity === "critical" ? "text-destructive" : "text-yellow-500"}`} />
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-0.5">
                  {n.type === "low_stock" ? "نقص مخزون" : "انتهاء صلاحية"}
                </div>
                <div>{n.message}</div>
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const navItems = user?.role === "admin" ? ADMIN_NAV : PHARMACIST_NAV;

  const NavLinks = ({ onItemClick }: { onItemClick?: () => void }) => (
    <nav className="space-y-0.5" dir="rtl">
      {navItems.map((item) => {
        const active = item.exact
          ? location === item.href
          : location === item.href || location.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link key={item.href} href={item.href} onClick={onItemClick}>
            <div className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition-colors cursor-pointer text-sm font-medium ${active ? "bg-primary text-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}>
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </div>
          </Link>
        );
      })}
    </nav>
  );

  async function handleLogout() {
    setLoggingOut(true);
    try { await logout(); } finally { setLoggingOut(false); }
  }

  return (
    <div className="min-h-screen bg-background flex w-full" dir="ltr">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border h-screen sticky top-0">
        <div className="px-4 py-3 border-b border-sidebar-border shrink-0">
          <div className="flex items-center gap-2 text-sidebar-primary-foreground">
            <div className="bg-primary p-1.5 rounded-lg shrink-0">
              <Pill className="h-5 w-5" />
            </div>
            <h1 className="font-bold text-base tracking-tight">
              PharmaCare
              <span className="block text-xs font-normal opacity-70 text-sidebar-foreground">نظام إدارة الصيدلية</span>
            </h1>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <NavLinks />
        </div>
        {/* User section at bottom of sidebar */}
        {user && (
          <div className="p-3 border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-sidebar-accent transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    {user.name.charAt(0)}
                  </div>
                  <div className="flex-1 text-right min-w-0">
                    <div className="text-sm font-medium text-sidebar-foreground truncate">{user.name}</div>
                    <div className="text-xs text-muted-foreground">{user.role === "admin" ? "مدير" : "صيدلاني"}</div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5 text-sm font-medium">{user.name}</div>
                <div className="px-2 pb-1.5 text-xs text-muted-foreground">{user.role === "admin" ? "مدير النظام" : "صيدلاني"}</div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive gap-2" disabled={loggingOut}>
                  <LogOut className="h-4 w-4" />
                  {loggingOut ? "جاري الخروج..." : "تسجيل الخروج"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        {/* Top header — mobile + desktop notifications/user */}
        <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4 sticky top-0 z-10">
          {/* Mobile: hamburger */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 bg-sidebar border-r-sidebar-border">
              <div className="p-4 border-b border-sidebar-border">
                <div className="flex items-center gap-2">
                  <div className="bg-primary p-1.5 rounded-lg text-primary-foreground"><Pill className="h-6 w-6" /></div>
                  <h1 className="font-bold text-lg text-sidebar-primary-foreground">PharmaCare</h1>
                </div>
              </div>
              <div className="p-3"><NavLinks /></div>
              {user && (
                <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-sidebar-border">
                  <button
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-md"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    تسجيل الخروج
                  </button>
                </div>
              )}
            </SheetContent>
          </Sheet>

          <div className="font-semibold md:hidden">PharmaCare</div>

          {/* Desktop: page title placeholder */}
          <div className="hidden md:block" />

          {/* Right side: notifications + user */}
          <div className="flex items-center gap-2">
            <NotificationsBell />
            {user && (
              <div className="hidden md:flex items-center gap-1 text-sm text-muted-foreground">
                <span>{user.name}</span>
                <Badge variant="outline" className="text-xs">{user.role === "admin" ? "مدير" : "صيدلاني"}</Badge>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
