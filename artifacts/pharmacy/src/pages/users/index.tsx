import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth";
import { Users, Plus, Pencil, Trash2, KeyRound, ShieldCheck, User } from "lucide-react";

interface UserRecord {
  id: number;
  username: string;
  name: string;
  role: string;
  createdAt: string;
}

const EMPTY_FORM = { username: "", password: "", name: "", role: "pharmacist" };
const EMPTY_PW = { password: "", currentPassword: "" };

function UserDialog({
  open,
  onClose,
  user,
}: {
  open: boolean;
  onClose: () => void;
  user?: UserRecord;
}) {
  const isEdit = !!user;
  const [form, setForm] = useState(isEdit ? { username: user.username, name: user.name, role: user.role, password: "" } : EMPTY_FORM);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: me } = useAuth();

  const mutation = useMutation({
    mutationFn: async () => {
      const url = isEdit ? `/api/users/${user!.id}` : "/api/users";
      const method = isEdit ? "PATCH" : "POST";
      const body: Record<string, string> = { name: form.name, role: form.role };
      if (!isEdit) { body.username = form.username; body.password = form.password; }
      else if (form.password) body.password = form.password;
      const res = await fetch(url, { method, credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "خطأ"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: isEdit ? "تم التعديل" : "تم الإنشاء", description: isEdit ? `تم تحديث بيانات ${form.name}` : `تم إنشاء حساب ${form.username}` });
      onClose();
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "تعديل المستخدم" : "إضافة مستخدم جديد"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {!isEdit && (
            <div className="space-y-1.5">
              <Label>اسم المستخدم (للدخول)</Label>
              <Input value={form.username} onChange={set("username")} placeholder="مثال: pharmacist2" autoComplete="off" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>الاسم الكامل</Label>
            <Input value={form.name} onChange={set("name")} placeholder="مثال: أحمد محمد" />
          </div>
          <div className="space-y-1.5">
            <Label>الدور</Label>
            <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">مدير (Admin)</SelectItem>
                <SelectItem value="pharmacist">صيدلاني (Pharmacist)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{isEdit ? "كلمة مرور جديدة (اتركها فارغة للإبقاء)" : "كلمة المرور"}</Label>
            <Input type="password" value={form.password} onChange={set("password")} placeholder={isEdit ? "اتركها فارغة إذا لم ترد التغيير" : "6 أحرف على الأقل"} autoComplete="new-password" />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "جاري الحفظ..." : isEdit ? "حفظ التعديلات" : "إنشاء الحساب"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChangePasswordDialog({ open, onClose, user }: { open: boolean; onClose: () => void; user: UserRecord }) {
  const [form, setForm] = useState(EMPTY_PW);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: me } = useAuth();
  const isSelf = me?.id === user.id;

  const mutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, string> = { password: form.password };
      if (isSelf) body.currentPassword = form.currentPassword;
      const res = await fetch(`/api/users/${user.id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "خطأ"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "تم التغيير", description: "تم تغيير كلمة المرور بنجاح" });
      setForm(EMPTY_PW);
      onClose();
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent dir="rtl" className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" />تغيير كلمة مرور {user.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {isSelf && (
            <div className="space-y-1.5">
              <Label>كلمة المرور الحالية</Label>
              <Input type="password" value={form.currentPassword} onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))} autoComplete="current-password" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>كلمة المرور الجديدة</Label>
            <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="6 أحرف على الأقل" autoComplete="new-password" />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "جاري الحفظ..." : "تغيير كلمة المرور"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function UsersPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRecord | null>(null);
  const [pwUser, setPwUser] = useState<UserRecord | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserRecord | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: me } = useAuth();

  const { data: users, isLoading } = useQuery<UserRecord[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const r = await fetch("/api/users", { credentials: "include" });
      if (!r.ok) throw new Error("غير مصرح");
      return r.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "خطأ"); }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "تم الحذف", description: `تم حذف المستخدم بنجاح` });
      setDeleteUser(null);
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">إدارة المستخدمين</h1>
          <p className="text-muted-foreground mt-1">إضافة وتعديل وحذف حسابات النظام</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 ml-1" />
          مستخدم جديد
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5 text-primary" />
            المستخدمون ({users?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded animate-pulse" />)}
            </div>
          ) : !users || users.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">لا يوجد مستخدمون</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-right py-3 pr-2 font-medium">المستخدم</th>
                    <th className="text-right py-3 font-medium">اسم الدخول</th>
                    <th className="text-right py-3 font-medium">الدور</th>
                    <th className="text-right py-3 font-medium">تاريخ الإنشاء</th>
                    <th className="text-right py-3 font-medium">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 pr-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${u.role === "admin" ? "bg-primary" : "bg-emerald-500"}`}>
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium">{u.name}</div>
                            {me?.id === u.id && <div className="text-xs text-muted-foreground">حسابك الحالي</div>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 font-mono text-muted-foreground">{u.username}</td>
                      <td className="py-3">
                        {u.role === "admin" ? (
                          <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/10 gap-1">
                            <ShieldCheck className="h-3 w-3" />مدير
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 gap-1">
                            <User className="h-3 w-3" />صيدلاني
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" })}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" className="h-8 px-2 text-muted-foreground hover:text-foreground" onClick={() => setEditUser(u)} title="تعديل">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 px-2 text-muted-foreground hover:text-foreground" onClick={() => setPwUser(u)} title="تغيير كلمة المرور">
                            <KeyRound className="h-3.5 w-3.5" />
                          </Button>
                          {me?.id !== u.id && (
                            <Button size="sm" variant="ghost" className="h-8 px-2 text-muted-foreground hover:text-destructive" onClick={() => setDeleteUser(u)} title="حذف">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <UserDialog open={addOpen} onClose={() => setAddOpen(false)} />
      {editUser && <UserDialog open={!!editUser} onClose={() => setEditUser(null)} user={editUser} />}
      {pwUser && <ChangePasswordDialog open={!!pwUser} onClose={() => setPwUser(null)} user={pwUser} />}

      <AlertDialog open={!!deleteUser} onOpenChange={v => !v && setDeleteUser(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف حساب <strong>{deleteUser?.name}</strong>؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteUser && deleteMutation.mutate(deleteUser.id)}>
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
