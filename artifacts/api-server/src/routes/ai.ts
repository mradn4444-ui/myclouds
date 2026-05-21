import { Router } from "express";
import Groq from "groq-sdk";
import { nanoid } from "nanoid";
import { eq, and } from "drizzle-orm";
import { db, conversationMessagesTable, conversationsTable } from "@workspace/db";
import { authMiddleware, type AuthRequest } from "../middlewares/auth";

const router = Router();
const groq = new Groq({ apiKey: process.env["GROQ_API_KEY"] });

async function webSearch(query: string): Promise<string> {
  const key = process.env["SERPAPI_KEY"];
  if (!key) return "Recherche web non disponible.";
  try {
    const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${key}&num=5&hl=fr&gl=fr`;
    const res = await fetch(url);
    const data = await res.json() as { organic_results?: { title: string; snippet: string }[] };
    if (!data.organic_results?.length) return "Aucun résultat trouvé.";
    return data.organic_results.slice(0, 4).map((r, i) =>
      `[${i + 1}] ${r.title}\n${r.snippet}`
    ).join("\n\n");
  } catch {
    return "Erreur lors de la recherche.";
  }
}

// POST /api/ai/chat - Chat contextuel avec IA et mémoire de conversation
router.post("/chat", authMiddleware, async (req: AuthRequest, res) => {
  const { messages, categoryName, categoryItems, mode, profile, conversationId } = req.body as {
    messages: { role: "user" | "assistant"; content: string }[];
    categoryName?: string;
    categoryItems?: string[];
    mode?: "chat" | "help" | "analyze" | "organize" | "transcribe" | "structure";
    profile?: {
      nom?: string;
      prenom?: string;
      pseudo?: string;
      age?: string;
      aiStyle?: string;
    };
    conversationId?: string;
  };

  if (!messages?.length) {
    res.status(400).json({ error: "messages requis" });
    return;
  }

  const userId = req.userId as string;
  let activeConversationId = conversationId;
  let conversation: typeof conversationsTable.$inferSelect | null = null;
  let conversationMessages: typeof messages = messages;

  if (!activeConversationId) {
    const firstUserMessage = messages.find((message) => message.role === "user")?.content ?? "Nouvelle conversation";
    activeConversationId = nanoid();
    conversation = {
      id: activeConversationId,
      userId,
      title: firstUserMessage.slice(0, 48),
      topic: categoryName ?? null,
      summary: null,
      messageCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      archivedAt: null,
    };
    db.insert(conversationsTable).values(conversation).run();
  }

  // Si conversationId fourni, charger l'historique
  if (activeConversationId) {
    try {
      const convRecord = await db
        .select()
        .from(conversationsTable)
        .where(and(eq(conversationsTable.id, activeConversationId), eq(conversationsTable.userId, userId)))
        .limit(1);

      if (convRecord.length) {
        conversation = convRecord[0];

        // Charger les messages précédents de la conversation
        const prevMessages = await db
          .select()
          .from(conversationMessagesTable)
          .where(and(eq(conversationMessagesTable.conversationId, activeConversationId), eq(conversationMessagesTable.userId, userId)))
          .orderBy(conversationMessagesTable.createdAt);

        // Inclure les derniers 10 messages de contexte + les nouveaux messages
        const contextMessages = prevMessages.slice(-10).map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

        conversationMessages = [...contextMessages, ...messages];
      }
    } catch (err) {
      console.error("Error loading conversation:", err);
    }
  }

  const lastUserMsg = messages[messages.length - 1]?.content ?? "";
  const needsSearch = /recherche|trouve|cherche|actualit|météo|weather|news|web|internet/i.test(lastUserMsg);

  let searchContext = "";
  if (needsSearch) {
    searchContext = await webSearch(lastUserMsg);
  }

  const contextParts: string[] = [
    "Tu es un assistant personnel intégré dans MyCloud, un espace de travail personnel intelligent.",
    "Tu réponds en français et de manière concise et utile.",
  ];

  // Mode spécifique
  if (mode === "organize") {
    contextParts.push("Tu aides à organiser le contenu. Sois concis et pratique.");
  } else if (mode === "analyze") {
    contextParts.push("Tu analyses des documents ou du contenu. Fournir insights détaillés.");
  } else if (mode === "structure") {
    contextParts.push("Tu proposes une structure pour organiser le contenu. Sois clair et logique.");
  } else if (mode === "transcribe") {
    contextParts.push("Tu aides à retranscrire et résumer du contenu vocal.");
  }

  // Contexte du profil utilisateur
  if (profile) {
    const nameParts: string[] = [];
    if (profile.prenom) nameParts.push(profile.prenom);
    if (profile.nom) nameParts.push(profile.nom);
    if (nameParts.length) contextParts.push(`L'utilisateur s'appelle ${nameParts.join(" ")}.`);
    if (profile.pseudo) contextParts.push(`Son pseudo est ${profile.pseudo}.`);
    if (profile.age) contextParts.push(`Il a ${profile.age} ans.`);
    if (profile.aiStyle?.trim()) {
      contextParts.push(`\nSTYLE DE COMMUNICATION OBLIGATOIRE :\n${profile.aiStyle.trim()}\nRespecte ce style dans TOUTES tes réponses.`);
    }
  }

  if (categoryName) {
    contextParts.push(`L'utilisateur est dans la catégorie "${categoryName}".`);
  }
  if (categoryItems?.length) {
    contextParts.push(`Contenu de la catégorie : ${categoryItems.join(", ")}.`);
  }
  if (searchContext) {
    contextParts.push(`\nRésultats de recherche web :\n${searchContext}`);
  }

  const systemPrompt = contextParts.join("\n");

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationMessages,
      ],
      max_tokens: 2048,
      stream: false,
    });

    const reply = completion.choices[0]?.message?.content ?? "Désolé, je n'ai pas pu répondre.";

    // Sauvegarder les messages dans la conversation si conversationId fourni
    if (activeConversationId && conversation) {
      try {
        // Sauvegarder le message utilisateur
        const userMsg = messages[messages.length - 1];
        db.insert(conversationMessagesTable).values({
          id: nanoid(),
          conversationId: activeConversationId,
          userId,
          role: userMsg.role,
          content: userMsg.content,
          createdAt: Date.now(),
        }).run();

        // Sauvegarder la réponse de l'IA
        db.insert(conversationMessagesTable).values({
          id: nanoid(),
          conversationId: activeConversationId,
          userId,
          role: "assistant",
          content: reply,
          createdAt: Date.now(),
        }).run();

        // Mettre à jour la conversation
        await db
          .update(conversationsTable)
          .set({
            messageCount: (conversation.messageCount || 0) + 2,
            updatedAt: Date.now(),
          })
          .where(and(eq(conversationsTable.id, activeConversationId), eq(conversationsTable.userId, userId)))
          .run();
      } catch (err) {
        console.error("Error saving conversation messages:", err);
      }
    }

    res.json({ reply, searchUsed: !!searchContext, conversationId: activeConversationId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur IA" });
  }
});

// POST /api/ai/organize - Organiser automatiquement des éléments ou une idée
router.post("/organize", authMiddleware, async (req: AuthRequest, res) => {
  const { items, existingCategories, idea, title } = req.body as {
    items?: { name: string; type: string }[];
    existingCategories?: string[];
    idea?: string;
    title?: string;
  };

  if (!items?.length && !idea) {
    res.status(400).json({ error: "items ou idea requis" });
    return;
  }

  let prompt = "";
  
  if (idea) {
    // Organizing an idea
    prompt = `
Tu es un expert en gestion de projets et organisation.
Idée: "${idea}"

Crée une structure complète pour cette idée:
1. Titre du projet
2. Résumé (2-3 lignes)
3. Sections principales (4-5 sections)
4. Tâches prioritaires (5-7 tâches avec priorité)
5. Dossiers à créer (4-5 noms de dossiers)
6. Tags pertinents (5-7 tags)

Réponds en JSON pur sans commentaires. Format exact:
{
  "title": "...",
  "summary": "...",
  "sections": ["section1", "section2", ...],
  "tasks": [{"title": "task", "priority": "high|medium|low"}, ...],
  "folders": ["folder1", "folder2", ...],
  "tags": ["tag1", "tag2", ...]
}
`;
  } else {
    // Organizing items
    prompt = `
Tu es un expert en organisation de contenu.
Fichiers: ${items!.map(i => `${i.name} (${i.type})`).join(", ")}
${existingCategories?.length ? `Catégories existantes: ${existingCategories.join(", ")}` : ""}

Propose une organisation intelligente:
1. Groupes logiques
2. Noms de dossiers
3. Tags pertinents
4. Structure recommandée

Réponds en JSON structuré:
{
  "groups": [{"name": "...", "items": [...], "folder": "..."}],
  "folders": ["folder1", "folder2", ...],
  "tags": ["tag1", "tag2", ...],
  "structure": "..."
}
`;
  }

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1024,
      stream: false,
    });

    const reply = completion.choices[0]?.message?.content ?? "";
    
    // Try to parse as JSON
    try {
      const jsonMatch = reply.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        res.json({ 
          structure: parsed,
          raw: reply 
        });
      } else {
        res.json({ suggestion: reply });
      }
    } catch {
      res.json({ suggestion: reply });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur IA" });
  }
});

// POST /api/ai/summarize - Résumer du contenu
router.post("/summarize", authMiddleware, async (req: AuthRequest, res) => {
  const { text, type } = req.body as { text: string; type?: string };

  if (!text) {
    res.status(400).json({ error: "text requis" });
    return;
  }

  const prompt = `
Résume ce contenu de manière concise et utile${type ? ` (type: ${type})` : ""}:

${text}

Résumé (max 150 mots):
`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 512,
      stream: false,
    });

    const summary = completion.choices[0]?.message?.content ?? "";
    res.json({ summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur" });
  }
});

// POST /api/ai/structure - Générer une structure document
router.post("/structure", authMiddleware, async (req: AuthRequest, res) => {
  const { content, title } = req.body as { content: string; title?: string };

  if (!content) {
    res.status(400).json({ error: "content requis" });
    return;
  }

  const prompt = `
Crée une structure claire et organisée pour ce contenu${title ? ` (Titre: ${title})` : ""}:

${content}

Propose:
1. Vue d'ensemble
2. Sections principales
3. Points clés
4. Structure recommandée en markdown

Sois visuel et clair.
`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2048,
      stream: false,
    });

    const structure = completion.choices[0]?.message?.content ?? "";
    res.json({ structure });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur" });
  }
});

// POST /api/ai/generate-tags - Générer des tags intelligents
router.post("/generate-tags", authMiddleware, async (req: AuthRequest, res) => {
  const { text, limit = 5 } = req.body as { text: string; limit?: number };

  if (!text) {
    res.status(400).json({ error: "text requis" });
    return;
  }

  const prompt = `
Génère ${limit} tags pertinents et concis pour ce contenu:

${text}

Format: liste JSON d'objets {tag, category, relevance}
`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 512,
      stream: false,
    });

    const response = completion.choices[0]?.message?.content ?? "";
    res.json({ tags: response });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur" });
  }
});

// POST /api/ai/detect-projects - Détecter automatiquement les projets
router.post("/detect-projects", authMiddleware, async (req: AuthRequest, res) => {
  const { itemNames, descriptions } = req.body as { itemNames: string[]; descriptions?: string[] };

  if (!itemNames?.length) {
    res.status(400).json({ error: "itemNames requis" });
    return;
  }

  const prompt = `
Tu es un expert en détection de projets.
Utilisateur a ces items:
${itemNames.map((name, i) => `- ${name}${descriptions?.[i] ? ` : ${descriptions[i]}` : ""}`).join("\n")}

Identifie les projets potentiels et groupe-les logiquement.
Réponds en JSON:
{
  "projects": [
    { "name": "...", "items": [...], "description": "..." }
  ]
}
`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1024,
      stream: false,
    });

    const response = completion.choices[0]?.message?.content ?? "";
    res.json({ projects: response });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur" });
  }
});

// POST /api/ai/detect-tasks - Détecter automatiquement les tâches
router.post("/detect-tasks", authMiddleware, async (req: AuthRequest, res) => {
  const { text } = req.body as { text: string };

  if (!text) {
    res.status(400).json({ error: "text requis" });
    return;
  }

  const prompt = `
Extrait les tâches de ce contenu:
${text}

Format JSON:
{
  "tasks": [
    { "title": "...", "priority": "high|medium|low", "dueDate": "...", "completed": false }
  ]
}
`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1024,
      stream: false,
    });

    const response = completion.choices[0]?.message?.content ?? "";
    res.json({ tasks: response });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur" });
  }
});

// POST /api/ai/improve-text - Améliorer du texte
router.post("/improve-text", authMiddleware, async (req: AuthRequest, res) => {
  const { text, style = "professional" } = req.body as { text: string; style?: string };

  if (!text) {
    res.status(400).json({ error: "text requis" });
    return;
  }

  const prompt = `
Améliore ce texte pour un style ${style}:
${text}

Rends-le plus clair, concis et impactant. Garde le sens original.
`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1024,
      stream: false,
    });

    const improved = completion.choices[0]?.message?.content ?? "";
    res.json({ improved });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur" });
  }
});

// POST /api/ai/explain-visual - Créer une explication visuelle
router.post("/explain-visual", authMiddleware, async (req: AuthRequest, res) => {
  const { title, description } = req.body as { title: string; description?: string };

  if (!title) {
    res.status(400).json({ error: "title requis" });
    return;
  }

  const prompt = `
Crée une explication visuelle/schéma en ASCII art ou Markdown pour:
${title}
${description ? `\nDescription: ${description}` : ""}

Sois clair et minimaliste.
`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1024,
      stream: false,
    });

    const visual = completion.choices[0]?.message?.content ?? "";
    res.json({ visual });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur" });
  }
});

export default router;
