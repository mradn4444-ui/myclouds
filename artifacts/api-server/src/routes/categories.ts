import { Router } from "express";
import {
  db,
  categoriesTable,
  foldersTable,
  insertCategorySchema,
  insertFolderSchema,
  type Category,
  type Folder,
  and,
  eq,
} from "@workspace/db";
import { authMiddleware, type AuthRequest } from "../middlewares/auth";
import { nanoid } from "nanoid";

const router = Router();

// CATEGORIES
router.get("/categories", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const cats = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.userId, userId));
    res.json(cats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur" });
  }
});

router.post("/categories", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const result = insertCategorySchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({ error: result.error.errors });
    }

    const newCat: Category = {
      id: nanoid(),
      userId,
      name: result.data.name,
      color: result.data.color ?? null,
      icon: result.data.icon ?? null,
      order: result.data.order ?? 0,
      createdAt: Date.now(),
    };

    await db.insert(categoriesTable).values(newCat);
    res.status(201).json(newCat);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur" });
  }
});

router.patch("/categories/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const userId = req.userId!;

    const [existing] = await db
      .select()
      .from(categoriesTable)
      .where(and(eq(categoriesTable.id, id), eq(categoriesTable.userId, userId)))
      .limit(1);

    if (!existing) return res.status(404).json({ error: "Non trouvé" });

    const updated = { ...existing, ...req.body };
    await db.update(categoriesTable)
      .set(updated)
      .where(and(eq(categoriesTable.id, id), eq(categoriesTable.userId, userId)));

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur" });
  }
});

router.delete("/categories/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const userId = req.userId!;

    await db.delete(categoriesTable)
      .where(and(eq(categoriesTable.id, id), eq(categoriesTable.userId, userId)));

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur" });
  }
});

// FOLDERS
router.get("/folders", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const folders = await db
      .select()
      .from(foldersTable)
      .where(eq(foldersTable.userId, userId));
    res.json(folders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur" });
  }
});

router.post("/folders", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const result = insertFolderSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({ error: result.error.errors });
    }

    const newFolder: Folder = {
      id: nanoid(),
      userId,
      categoryId: result.data.categoryId,
      name: result.data.name,
      parentFolderId: result.data.parentFolderId ?? null,
      order: result.data.order ?? 0,
      createdAt: Date.now(),
    };

    await db.insert(foldersTable).values(newFolder);
    res.status(201).json(newFolder);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur" });
  }
});

router.patch("/folders/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const userId = req.userId!;

    const [existing] = await db
      .select()
      .from(foldersTable)
      .where(and(eq(foldersTable.id, id), eq(foldersTable.userId, userId)))
      .limit(1);

    if (!existing) return res.status(404).json({ error: "Non trouvé" });

    const updated = { ...existing, ...req.body };
    await db.update(foldersTable)
      .set(updated)
      .where(and(eq(foldersTable.id, id), eq(foldersTable.userId, userId)));

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur" });
  }
});

router.delete("/folders/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const userId = req.userId!;

    await db.delete(foldersTable)
      .where(and(eq(foldersTable.id, id), eq(foldersTable.userId, userId)));

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur" });
  }
});

export default router;
