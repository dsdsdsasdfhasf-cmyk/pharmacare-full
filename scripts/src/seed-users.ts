import { db, client, usersTable } from "@workspace/db";
import { scryptSync, randomBytes } from "node:crypto";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function seedUsers() {
  const users = [
    { username: "admin", password: "admin123", name: "المدير العام", role: "admin" },
    { username: "pharmacist", password: "pharma123", name: "الصيدلاني", role: "pharmacist" },
  ];

  for (const u of users) {
    const existing = await db.select().from(usersTable).limit(1);
    if (existing.length === 0 || true) {
      try {
        await db.insert(usersTable).values({
          username: u.username,
          passwordHash: hashPassword(u.password),
          name: u.name,
          role: u.role,
        }).onConflictDoNothing();
        console.log(`✓ User ${u.username} seeded`);
      } catch {
        console.log(`  User ${u.username} already exists`);
      }
    }
  }

  client.close();
  process.exit(0);
}

seedUsers().catch(console.error);
