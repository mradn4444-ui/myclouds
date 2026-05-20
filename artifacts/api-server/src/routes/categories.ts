import { Router } from "express";
import {
  db,
  categoriesTable,
  foldersTable,
  insertCategorySchema,
  insertFolderSchema,
  type Category,
  type Folder,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middlewares/auth";
import { nanoid } from "nanoid";

const router = Router();

// CATEGORIES
router.get("/categories", authMiddleware, (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const cats = db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.userId, userId))
      .all();
    res.json(cats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur" });
  }
});

router.post("/categories", authMiddleware, (req: AuthRequest, res) => {
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
      createdAt: new Date(),
    };

    db.insert(categoriesTable).values(newCat).run();
    res.status(201).json(newCat);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur" });
  }
});

router.patch("/categories/:id", authMiddleware, (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const userId = req.userId!;

    const existing = db
      .select()
      .from(categoriesTable)
      .where(and(eq(categoriesTable.id, id), eq(categoriesTable.userId, userId)))
      .get();

    if (!existing) return res.status(404).json({ error: "Non trouvé" });

    const updated = { ...existing, ...req.body };
    db.update(categoriesTable)
      .set(updated)
      .where(and(eq(categoriesTable.id, id), eq(categoriesTable.userId, userId)))
      .run();

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur" });
  }
});

router.delete("/categories/:id", authMiddleware, (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const userId = req.userId!;

    db.delete(categoriesTable)
      .where(and(eq(categoriesTable.id, id), eq(categoriesTable.userId, userId)))
      .run();

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur" });
  }
});

// FOLDERS
router.get("/folders", authMiddleware, (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const folders = db
      .select()
      .from(foldersTable)
      .where(eq(foldersTable.userId, userId))
      .all();
    res.json(folders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur" });
  }
});

router.post("/folders", authMiddleware, (req: AuthRequest, res) => {
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
      createdAt: new Date(),
    };

    db.insert(foldersTable).values(newFolder).run();
    res.status(201).json(newFolder);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur" });
  }
});

router.patch("/folders/:id", authMiddleware, (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const userId = req.userId!;

    const existing = db
      .select()
      .from(foldersTable)
      .where(and(eq(foldersTable.id, id), eq(foldersTable.userId, userId)))
      .get();

    if (!existing) return res.status(404).json({ error: "Non trouvé" });

    const updated = { ...existing, ...req.body };
    db.update(foldersTable)
      .set(updated)
      .where(and(eq(foldersTable.id, id), eq(foldersTable.userId, userId)))
      .run();

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur" });
  }
});

router.delete("/folders/:id", authMiddleware, (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const userId = req.userId!;

    db.delete(foldersTable)
      .where(and(eq(foldersTable.id, id), eq(foldersTable.userId, userId)))
      .run();

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur" });
  }
});

export default router;
