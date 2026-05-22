import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { db, filesTable, insertFileSchema, itemsTable, type Item } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middlewares/auth";
import { nanoid } from "nanoid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "..", "..", "..", "data", "uploads");

// Créer le dossier s'il n'existe pas
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${nanoid()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

const router = Router();

// POST /api/files/upload - Upload un fichier et crée un item
router.post("/upload", authMiddleware, upload.single("file"), (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Fichier manquant" });
    }

    const userId = req.userId!;
    const { categoryId, folderId, title } = req.body;

    const itemId = nanoid();
    const fileId = nanoid();
    const fileName = title || req.file.originalname;

    // Créer l'item
    const newItem: Item = {
      id: itemId,
      userId,
      categoryId: categoryId || null,
      folderId: folderId || null,
      type: "file",
      title: fileName,
      fileUrl: `/api/files/download/${fileId}`,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      x: 0,
      y: 0,
      width: 400,
      height: 300,
      content: null,
      url: null,
      aiSummary: null,
      tags: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    db.insert(itemsTable).values(newItem).run();

    // Enregistrer les métadonnées du fichier
    const fileRecord = {
      id: fileId,
      userId,
      itemId,
      originalName: req.file.originalname,
      storagePath: req.file.path,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      fileHash: null,
    };

    db.insert(filesTable).values(fileRecord).run();

    res.status(201).json({
      item: newItem,
      file: fileRecord,
      downloadUrl: `/api/files/download/${fileId}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de l'upload" });
  }
});

// GET /api/files/download/:id - Télécharger un fichier
router.get("/download/:id", authMiddleware, (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const userId = req.userId!;

    const file = db
      .select()
      .from(filesTable)
      .where(and(eq(filesTable.id, id), eq(filesTable.userId, userId)))
      .get();

    if (!file) {
      return res.status(404).json({ error: "Fichier non trouvé" });
    }

    if (!fs.existsSync(file.storagePath)) {
      return res.status(404).json({ error: "Fichier supprimé" });
    }

    res.setHeader("Content-Type", file.mimeType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(file.originalName)}"`,
    );
    res.sendFile(file.storagePath);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur" });
  }
});

// DELETE /api/files/:id - Supprimer un fichier
router.delete("/:id", authMiddleware, (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const userId = req.userId!;

    const file = db
      .select()
      .from(filesTable)
      .where(and(eq(filesTable.id, id), eq(filesTable.userId, userId)))
      .get();

    if (!file) {
      return res.status(404).json({ error: "Fichier non trouvé" });
    }

    // Supprimer le fichier physique
    if (fs.existsSync(file.storagePath)) {
      fs.unlinkSync(file.storagePath);
    }

    // Supprimer les enregistrements DB
    db.delete(filesTable).where(eq(filesTable.id, id)).run();
    db.delete(itemsTable).where(eq(itemsTable.id, file.itemId)).run();

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur" });
  }
});

export default router;
