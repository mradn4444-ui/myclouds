import { Router } from "express";
import { and, db, eq, itemsTable, insertItemSchema, type Item } from "@workspace/db";
import { authMiddleware, type AuthRequest } from "../middlewares/auth";
import { nanoid } from "nanoid";

const router = Router();

// GET /api/items - Lister tous les items de l'utilisateur
router.get("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const items = await db
      .select()
      .from(itemsTable)
      .where(eq(itemsTable.userId, userId));
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors du chargement des items" });
  }
});

// GET /api/items/:id - Récupérer un item spécifique
router.get("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const userId = req.userId!;
    const [item] = await db
      .select()
      .from(itemsTable)
      .where(and(eq(itemsTable.id, id), eq(itemsTable.userId, userId)))
      .limit(1);

    if (!item) return res.status(404).json({ error: "Item non trouvé" });
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur" });
  }
});

// POST /api/items - Créer un nouvel item
router.post("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const result = insertItemSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({ error: result.error.errors });
    }

    const newItem: Item = {
      id: nanoid(),
      userId,
      categoryId: result.data.categoryId ?? null,
      folderId: result.data.folderId ?? null,
      type: result.data.type,
      title: result.data.title,
      content: result.data.content ?? null,
      fileUrl: result.data.fileUrl ?? null,
      mimeType: result.data.mimeType ?? null,
      fileSize: result.data.fileSize ?? null,
      url: result.data.url ?? null,
      x: result.data.x ?? 0,
      y: result.data.y ?? 0,
      width: result.data.width ?? 400,
      height: result.data.height ?? 300,
      aiSummary: result.data.aiSummary ?? null,
      tags: result.data.tags ?? null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.insert(itemsTable).values(newItem);
    res.status(201).json(newItem);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la création" });
  }
});

// PATCH /api/items/:id - Mettre à jour un item
router.patch("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const userId = req.userId!;

    const [existing] = await db
      .select()
      .from(itemsTable)
      .where(and(eq(itemsTable.id, id), eq(itemsTable.userId, userId)))
      .limit(1);

    if (!existing) return res.status(404).json({ error: "Item non trouvé" });

    const updated = {
      ...existing,
      ...req.body,
      updatedAt: Date.now(),
    };

    await db.update(itemsTable)
      .set(updated)
      .where(and(eq(itemsTable.id, id), eq(itemsTable.userId, userId)));

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la mise à jour" });
  }
});

// DELETE /api/items/:id - Supprimer un item
router.delete("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const userId = req.userId!;

    await db.delete(itemsTable)
      .where(and(eq(itemsTable.id, id), eq(itemsTable.userId, userId)));

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la suppression" });
  }
});

export default router;
