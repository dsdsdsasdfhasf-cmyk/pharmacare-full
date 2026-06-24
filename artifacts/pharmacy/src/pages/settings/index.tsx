import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Database, Download, FileJson, FileSpreadsheet,
  CheckCircle2, Clock, HardDrive, ShieldCheck,
} from "lucide-react";
import * as XLSX from "xlsx";

interface BackupData {
  exportedAt: string;
  version: string;
  tables: {
    medicines: object[];
    sales: object[];
    saleItems: object[];
    purchases: object[];
    purchaseItems: object[];
    customers: object[];
    suppliers: object[];
    categories: object[];
    prescriptions: object[];
    users: object[];
  };
}

async function fetchBackup(): Promise<BackupData> {
  const res = await fetch("/api/backup", { credentials: "include" });
  if (!res.ok) throw new Error("فشل تحميل البيانات");
  return res.json();
}

function downloadJson(data: BackupData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pharmacare-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadExcel(data: BackupData) {
  const wb = XLSX.utils.book_new();

  const sheetConfig: { key: keyof BackupData["tables"]; label: string }[] = [
    { key: "medicines",      label: "الأدوية" },
    { key: "sales",          label: "المبيعات" },
    { key: "saleItems",      label: "بنود المبيعات" },
    { key: "purchases",      label: "المشتريات" },
    { key: "purchaseItems",  label: "بنود المشتريات" },
    { key: "customers",      label: "العملاء" },
    { key: "suppliers",      label: "الموردون" },
    { key: "categories",     label: "الفئات" },
    { key: "prescriptions",  label: "الوصفات" },
    { key: "users",          label: "المستخدمون" },
  ];

  for (const { key, label } of sheetConfig) {
    const rows = data.tables[key];
    if (rows.length === 0) continue;
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, label);
  }

  XLSX.writeFile(wb, `pharmacare-backup-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

const TABLE_LABELS: Record<string, string> = {
  medicines: "الأدوية", sales: "المبيعات", saleItems: "بنود المبيعات",
  purchases: "المشتريات", purchaseItems: "بنود المشتريات",
  customers: "العملاء", suppliers: "الموردون", categories: "الفئات",
  prescriptions: "الوصفات", users: "المستخدمون",
};

export default function Settings() {
  const { toast } = useToast();
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [loadingJson, setLoadingJson] = useState(false);
  const [loadingExcel, setLoadingExcel] = useState(false);

  const { data: preview } = useQuery<BackupData>({
    queryKey: ["/api/backup/preview"],
    queryFn: fetchBackup,
    staleTime: 60_000,
  });

  async function handleDownload(format: "json" | "excel") {
    const setter = format === "json" ? setLoadingJson : setLoadingExcel;
    setter(true);
    try {
      const data = await fetchBackup();
      if (format === "json") downloadJson(data);
      else downloadExcel(data);
      const now = new Date().toLocaleString("ar-EG");
      setLastBackup(now);
      toast({ title: "تم التصدير", description: `تم حفظ الملف بتنسيق ${format === "json" ? "JSON" : "Excel"}` });
    } catch {
      toast({ title: "خطأ", description: "فشل التصدير — تحقق من اتصالك", variant: "destructive" });
    } finally {
      setter(false);
    }
  }

  const totalRecords = preview
    ? Object.values(preview.tables).reduce((s, t) => s + t.length, 0)
    : null;

  return (
    <div className="space-y-6 max-w-2xl" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">الإعدادات والنسخ الاحتياطي</h1>
        <p className="text-muted-foreground mt-1">تصدير بيانات النظام كنسخة احتياطية كاملة</p>
      </div>

      {/* Stats */}
      {preview && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-semibold text-sm">البيانات الحالية</div>
                <div className="text-xs text-muted-foreground">{totalRecords?.toLocaleString("ar-EG")} سجل في {Object.keys(preview.tables).length} جداول</div>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(preview.tables).map(([key, rows]) => (
                <div key={key} className="flex items-center justify-between bg-background rounded-md px-3 py-1.5 text-sm">
                  <span className="text-muted-foreground truncate">{TABLE_LABELS[key] ?? key}</span>
                  <Badge variant="secondary" className="text-xs shrink-0 mr-1">{rows.length}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Export options */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Download className="h-4 w-4" />
          خيارات التصدير
        </h2>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileJson className="h-5 w-5 text-amber-500" />
              تصدير JSON
            </CardTitle>
            <CardDescription className="text-xs">
              ملف JSON كامل يحتوي على جميع البيانات — مناسب لاستيراده مستقبلاً أو للمطورين
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button
              onClick={() => handleDownload("json")}
              disabled={loadingJson}
              variant="outline"
              className="w-full gap-2"
            >
              <FileJson className="h-4 w-4 text-amber-500" />
              {loadingJson ? "جاري التحضير..." : "تنزيل JSON"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-green-600" />
              تصدير Excel
            </CardTitle>
            <CardDescription className="text-xs">
              ملف Excel بشيتات منفصلة لكل جدول — مناسب للمراجعة والطباعة
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button
              onClick={() => handleDownload("excel")}
              disabled={loadingExcel}
              className="w-full gap-2 bg-green-600 hover:bg-green-700"
            >
              <FileSpreadsheet className="h-4 w-4" />
              {loadingExcel ? "جاري التحضير..." : "تنزيل Excel"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Last backup info */}
      <Card className="border-dashed">
        <CardContent className="pt-5 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">آخر نسخة احتياطية في هذه الجلسة:</span>
          </div>
          {lastBackup ? (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>{lastBackup}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>لم يتم إجراء نسخة احتياطية بعد في هذه الجلسة</span>
            </div>
          )}
          <Separator />
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
            <span>النسخة الاحتياطية تشمل جميع البيانات — الأدوية، المبيعات، المشتريات، العملاء، الموردين، الوصفات، والمستخدمين (بدون كلمات المرور)</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
