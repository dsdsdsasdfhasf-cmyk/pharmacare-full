import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { scryptSync, timingSafeEqual } from "node:crypto";

const router = Router();

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

router.post("/auth/login", async (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) {
    return res.status(400).json({ error: "اسم المستخدم وكلمة المرور مطلوبان" });
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username));
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
  }

  req.session.userId = user.id;
  req.session.role = user.role;
  req.session.name = user.name;
  req.session.username = user.username;

  return res.json({ id: user.id, username: user.username, name: user.name, role: user.role });
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

router.get("/auth/me", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "غير مسجل الدخول" });
  const [user] = await db.select({ id: usersTable.id, username: usersTable.username, name: usersTable.name, role: usersTable.role })
    .from(usersTable).where(eq(usersTable.id, req.session.userId));
  if (!user) return res.status(401).json({ error: "المستخدم غير موجود" });
  return res.json(user);
});

export default router;
