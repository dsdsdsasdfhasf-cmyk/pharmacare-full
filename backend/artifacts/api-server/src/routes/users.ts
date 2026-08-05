import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

const router = Router();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  try {
    const hashBuf = Buffer.from(hash, "hex");
    const supplied = scryptSync(password, salt, 64);
    return hashBuf.length === supplied.length && timingSafeEqual(hashBuf, supplied);
  } catch {
    return false;
  }
}

function requireAdmin(req: any, res: any, next: any) {
  if (!req.session?.userId) return res.status(401).json({ error: "غير مسجل الدخول" });
  if (req.session?.role !== "admin") return res.status(403).json({ error: "غير مصرح لك بهذا الإجراء" });
  next();
}

router.get("/users", requireAdmin, async (_req, res) => {
  const users = await db
    .select({ id: usersTable.id, username: usersTable.username, name: usersTable.name, role: usersTable.role, createdAt: usersTable.createdAt })
    .from(usersTable)
    .orderBy(usersTable.createdAt);
  res.json(users);
});

router.post("/users", requireAdmin, async (req, res) => {
  const { username, password, name, role } = req.body as {
    username?: string; password?: string; name?: string; role?: string;
  };
  if (!username || !password || !name || !role) {
    return res.status(400).json({ error: "جميع الحقول مطلوبة" });
  }
  if (!["admin", "pharmacist"].includes(role)) {
    return res.status(400).json({ error: "الدور يجب أن يكون admin أو pharmacist" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
  }
  try {
    const [user] = await db.insert(usersTable).values({
      username,
      passwordHash: hashPassword(password),
      name,
      role,
    }).returning({ id: usersTable.id, username: usersTable.username, name: usersTable.name, role: usersTable.role, createdAt: usersTable.createdAt });
    return res.status(201).json(user);
  } catch (err: any) {
    if (err?.code === "23505") return res.status(409).json({ error: "اسم المستخدم موجود بالفعل" });
    throw err;
  }
});

router.patch("/users/:id", requireAdmin, async (req: any, res) => {
  const id = Number(req.params.id);
  const { name, role, password, currentPassword } = req.body as {
    name?: string; role?: string; password?: string; currentPassword?: string;
  };

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!existing) return res.status(404).json({ error: "المستخدم غير موجود" });

  const updates: Record<string, unknown> = {};

  if (name) updates.name = name;
  if (role && ["admin", "pharmacist"].includes(role)) updates.role = role;

  if (password) {
    if (password.length < 6) return res.status(400).json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
    if (id === req.session.userId) {
      if (!currentPassword || !verifyPassword(currentPassword, existing.passwordHash)) {
        return res.status(400).json({ error: "كلمة المرور الحالية غير صحيحة" });
      }
    }
    updates.passwordHash = hashPassword(password);
  }

  if (Object.keys(updates).length === 0) return res.status(400).json({ error: "لا توجد بيانات للتحديث" });

  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id))
    .returning({ id: usersTable.id, username: usersTable.username, name: usersTable.name, role: usersTable.role, createdAt: usersTable.createdAt });

  return res.json(updated);
});

router.delete("/users/:id", requireAdmin, async (req: any, res) => {
  const id = Number(req.params.id);
  if (id === req.session.userId) return res.status(400).json({ error: "لا يمكنك حذف حسابك الخاص" });
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!existing) return res.status(404).json({ error: "المستخدم غير موجود" });
  await db.delete(usersTable).where(eq(usersTable.id, id));
  return res.status(204).send();
});

export default router;
