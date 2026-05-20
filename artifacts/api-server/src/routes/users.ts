import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authMiddleware, type AuthRequest } from "../middlewares/auth";

const router = Router();

// GET /api/users/profile - Récupérer le profil de l'utilisateur
router.get("/profile", authMiddleware, (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const user = db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .get();

    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    // Ne pas renvoyer le mot de passe
    const { passwordHash, ...profile } = user;
    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur" });
  }
});

// PATCH /api/users/profile - Mettre à jour le profil
router.patch("/profile", authMiddleware, (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { nom, prenom, pseudo, age, aiStyle } = req.body;

    const existing = db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .get();

    if (!existing) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    const updated = {
      ...existing,
      nom: nom !== undefined ? nom : existing.nom,
      prenom: prenom !== undefined ? prenom : existing.prenom,
      pseudo: pseudo !== undefined ? pseudo : existing.pseudo,
      age: age !== undefined ? age : existing.age,
      aiStyle: aiStyle !== undefined ? aiStyle : existing.aiStyle,
      updatedAt: new Date(),
    };

    db.update(usersTable).set(updated).where(eq(usersTable.id, userId)).run();

    const { passwordHash, ...profile } = updated;
    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur" });
  }
});

export default router;
