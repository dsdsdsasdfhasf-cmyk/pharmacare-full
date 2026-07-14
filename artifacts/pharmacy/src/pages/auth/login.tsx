import { useState } from "react";
import { useAuth } from "@/context/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pill, Lock, User, AlertCircle, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <Pill className="h-9 w-9" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">PharmaCare</h1>
          <p className="text-gray-500">نظام إدارة الصيدلية</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">تسجيل الدخول</CardTitle>
            <CardDescription>أدخل بياناتك للوصول إلى النظام</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">اسم المستخدم</Label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    className="pr-9 text-right"
                    placeholder="admin"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="pr-9 pl-9 text-right"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <div
                className="rounded-md border border-dashed border-primary/40 bg-primary/5 p-3 text-sm text-muted-foreground cursor-pointer hover:bg-primary/10 transition-colors"
                onClick={() => { setUsername("admin@pharmacare.app"); setPassword("PharmaCare2024!Demo"); }}
                title="انقر لملء بيانات التجربة"
              >
                <p className="font-medium text-primary mb-1">بيانات تجريبية (انقر للملء)</p>
                <p>البريد الإلكتروني: <span className="font-mono text-gray-700">admin@pharmacare.app</span></p>
                <p>كلمة المرور: <span className="font-mono text-gray-700">PharmaCare2024!Demo</span></p>
                <p className="mt-1 text-xs">أو الصيدلي: <span className="font-mono text-gray-700">pharmacist@pharmacare.app</span> / <span className="font-mono text-gray-700">PharmaCare2024!Staff</span></p>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
                {loading ? "جاري تسجيل الدخول..." : "دخول"}
              </Button>
            </form>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
