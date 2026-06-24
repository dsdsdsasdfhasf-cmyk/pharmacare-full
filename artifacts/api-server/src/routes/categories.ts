import { Router } from "express";
import { db } from "@workspace/db";
import { categoriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateCategoryBody,
  UpdateCategoryParams,
  UpdateCategoryBody,
  DeleteCategoryParams,
  GetCategoryParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/categories", async (_req, res) => {
  const categories = await db.select().from(categoriesTable).orderBy(categoriesTable.name);
  res.json(categories.map(c => ({
    id: c.id,
    name: c.name,
    description: c.description ?? null,
    createdAt: c.createdAt.toISOString(),
  })));
});

router.post("/categories", async (req, res) => {
  const body = CreateCategoryBody.parse(req.body);
  const [category] = await db.insert(categoriesTable).values({
    name: body.name,
    description: body.description,
  }).returning();
  res.status(201).json({
    id: category.id,
    name: category.name,
    description: category.description ?? null,
    createdAt: category.createdAt.toISOString(),
  });
});

router.get("/categories/:id", async (req, res) => {
  const { id } = GetCategoryParams.parse({ id: Number(req.params.id) });
  const [category] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, id));
  if (!category) return res.status(404).json({ error: "Category not found" });
  res.json({
    id: category.id,
    name: category.name,
    description: category.description ?? null,
    createdAt: category.createdAt.toISOString(),
  });
});

router.patch("/categories/:id", async (req, res) => {
  const { id } = UpdateCategoryParams.parse({ id: Number(req.params.id) });
  const body = UpdateCategoryBody.parse(req.body);
  const [category] = await db.update(categoriesTable).set(body).where(eq(categoriesTable.id, id)).returning();
  if (!category) return res.status(404).json({ error: "Category not found" });
  res.json({
    id: category.id,
    name: category.name,
    description: category.description ?? null,
    createdAt: category.createdAt.toISOString(),
  });
});

router.delete("/categories/:id", async (req, res) => {
  const { id } = DeleteCategoryParams.parse({ id: Number(req.params.id) });
  await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
  res.status(204).send();
});

export default router;
