import { Router } from "express";
import Groq from "groq-sdk";
import { nanoid } from "nanoid";
import { eq, and } from "drizzle-orm";
import { db, conversationMessagesTable, conversationsTable } from "@workspace/db";
import { authMiddleware, type AuthRequest } from "../middlewares/auth";

const router = Router();
const groq = new Groq({ apiKey: process.env["GROQ_API_KEY"] });

type ImageSpec = {
  title: string;
  description: string;
  palette: string[];
  shapes: string[];
  mood: string;
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

function colorOrFallback(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const color = value.trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
}

function detectUserLanguage(text: string): string {
  const value = text.toLowerCase();
  if (/\b(en anglais|in english|answer in english|respond in english)\b/.test(value)) return "English";
  if (/\b(en francais|en français|in french|reponds en francais|réponds en français)\b/.test(value)) return "French";
  if (/\b(en espanol|en español|in spanish)\b/.test(value)) return "Spanish";

  const hasFrench = /[àâçéèêëîïôùûüÿœ]|(?:^|\s)(je|tu|vous|nous|le|la|les|des|une|avec|pour|dans|bonjour|merci|cr[eéè]e|genere|g[eé]n[eè]re|organise|tache|tâche|idee|idée)(?:\s|$)/i.test(text);
  const hasEnglish = /(?:^|\s)(the|and|you|your|please|create|make|generate|image|task|note|workspace|explain|summarize|project|hello|thanks)(?:\s|$)/i.test(text);
  const hasSpanish = /[¿¡ñáéíóú]|(?:^|\s)(hola|gracias|crear|genera|imagen|tarea|proyecto|explica)(?:\s|$)/i.test(text);

  if (hasFrench && !hasEnglish) return "French";
  if (hasSpanish && !hasEnglish && !hasFrench) return "Spanish";
  if (hasEnglish && !hasFrench) return "English";
  return "French";
}

function languageInstruction(language: string): string {
  return `Use ${language} for every user-facing word you generate. Mirror the user's latest language. Do not switch language unless the user explicitly asks. Technical code/API names may stay as-is.`;
}

function localizedLabel(language: string, labels: Record<string, string>): string {
  return labels[language] ?? labels.French;
}

function fallbackImageSpec(prompt: string, language = "French"): ImageSpec {
  return {
    title: prompt.trim().slice(0, 44) || "Image MyCloud",
    description: localizedLabel(language, {
      French: "Image generee depuis ta demande, sous forme de visuel vectoriel propre et utile.",
      English: "Image generated from your idea as a clean, useful vector visual.",
      Spanish: "Imagen generada a partir de tu idea como visual vectorial limpio y util.",
    }),
    palette: ["#8be7ff", "#b7a6ff", "#101217", "#ffffff"],
    shapes: ["orbital workspace", "floating cards", "soft grid", "light trail"],
    mood: "premium futuristic clean",
  };
}

async function makeImageSpec(prompt: string, language: string): Promise<ImageSpec> {
  if (!process.env["GROQ_API_KEY"]) return fallbackImageSpec(prompt, language);

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            `Return only JSON for a useful visual aid, not a random decorative image. No markdown. Keys: title, description, palette (4 hex colors), shapes (4 short visual elements), mood. ${languageInstruction(language)}`,
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 450,
      stream: false,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallbackImageSpec(prompt, language);

    const parsed = JSON.parse(jsonMatch[0]) as Partial<ImageSpec>;
    const fallback = fallbackImageSpec(prompt, language);
    return {
      title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim().slice(0, 64) : fallback.title,
      description: typeof parsed.description === "string" && parsed.description.trim() ? parsed.description.trim().slice(0, 220) : fallback.description,
      palette: Array.isArray(parsed.palette) ? parsed.palette.slice(0, 4).map((color, index) => colorOrFallback(String(color), fallback.palette[index] ?? "#ffffff")) : fallback.palette,
      shapes: Array.isArray(parsed.shapes) ? parsed.shapes.slice(0, 4).map(String) : fallback.shapes,
      mood: typeof parsed.mood === "string" ? parsed.mood.slice(0, 80) : fallback.mood,
    };
  } catch {
    return fallbackImageSpec(prompt, language);
  }
}

function renderGeneratedSvg(prompt: string, spec: ImageSpec): string {
  const seed = hashString(prompt);
  const [accent, violet, dark, light] = [
    colorOrFallback(spec.palette[0], "#8be7ff"),
    colorOrFallback(spec.palette[1], "#b7a6ff"),
    colorOrFallback(spec.palette[2], "#101217"),
    colorOrFallback(spec.palette[3], "#ffffff"),
  ];
  const offset = seed % 160;
  const secondOffset = (seed >> 3) % 120;
  const title = escapeXml(spec.title);
  const mood = escapeXml(spec.mood);
  const shapeText = escapeXml(spec.shapes.slice(0, 3).join(" / "));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="832" viewBox="0 0 1280 832">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${dark}"/>
      <stop offset="0.52" stop-color="#050608"/>
      <stop offset="1" stop-color="#11131a"/>
    </linearGradient>
    <radialGradient id="glowA" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="${accent}" stop-opacity="0.9"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowB" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="${violet}" stop-opacity="0.75"/>
      <stop offset="1" stop-color="${violet}" stop-opacity="0"/>
    </radialGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="22"/></filter>
  </defs>
  <rect width="1280" height="832" fill="url(#bg)"/>
  <path d="M0 132 H1280 M0 292 H1280 M0 452 H1280 M0 612 H1280 M180 0 V832 M420 0 V832 M660 0 V832 M900 0 V832 M1140 0 V832" stroke="${light}" stroke-opacity="0.045"/>
  <circle cx="${260 + offset}" cy="230" r="220" fill="url(#glowA)" filter="url(#blur)" opacity="0.7"/>
  <circle cx="${930 - secondOffset}" cy="560" r="260" fill="url(#glowB)" filter="url(#blur)" opacity="0.55"/>
  <g transform="translate(210 150)" fill="none" stroke="${accent}" stroke-opacity="0.58">
    <ellipse cx="420" cy="260" rx="330" ry="132" transform="rotate(-12 420 260)"/>
    <ellipse cx="420" cy="260" rx="250" ry="92" transform="rotate(16 420 260)"/>
    <path d="M80 270 C260 120 520 110 770 250 S990 455 1110 330" stroke-width="3"/>
  </g>
  <g>
    <rect x="190" y="226" width="260" height="150" rx="14" fill="${light}" fill-opacity="0.06" stroke="${light}" stroke-opacity="0.14"/>
    <rect x="510" y="162" width="310" height="190" rx="16" fill="${accent}" fill-opacity="0.10" stroke="${accent}" stroke-opacity="0.28"/>
    <rect x="780" y="360" width="300" height="178" rx="16" fill="${violet}" fill-opacity="0.10" stroke="${violet}" stroke-opacity="0.26"/>
    <rect x="350" y="474" width="320" height="160" rx="16" fill="${light}" fill-opacity="0.055" stroke="${light}" stroke-opacity="0.13"/>
  </g>
  <g fill="${light}">
    <text x="92" y="98" font-family="Inter, Arial, sans-serif" font-size="22" letter-spacing="8" opacity="0.46">MYCLOUD IMAGE</text>
    <text x="92" y="704" font-family="Inter, Arial, sans-serif" font-size="54" font-weight="700">${title}</text>
    <text x="96" y="754" font-family="Inter, Arial, sans-serif" font-size="20" opacity="0.58">${mood}</text>
    <text x="96" y="786" font-family="Inter, Arial, sans-serif" font-size="18" opacity="0.42">${shapeText}</text>
  </g>
</svg>`;
}

function searchLocale(language: string) {
  if (language === "English") return { hl: "en", gl: "us" };
  if (language === "Spanish") return { hl: "es", gl: "es" };
  return { hl: "fr", gl: "fr" };
}

async function webSearch(query: string, language = "French"): Promise<string> {
  const key = process.env["SERPAPI_KEY"];
  if (!key) return "Recherche web non disponible.";
  try {
    const locale = searchLocale(language);
    const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${key}&num=5&hl=${locale.hl}&gl=${locale.gl}`;
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
  const providedConversationId = Boolean(conversationId);
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
      } else if (providedConversationId) {
        res.status(404).json({ error: "Conversation introuvable" });
        return;
      }
    } catch (err) {
      console.error("Error loading conversation:", err);
      if (providedConversationId) {
        res.status(500).json({ error: "Impossible de charger la conversation" });
        return;
      }
    }
  }

  const lastUserMsg = messages[messages.length - 1]?.content ?? "";
  const language = detectUserLanguage(lastUserMsg);
  const needsSearch = /recherche|trouve|cherche|actualit|météo|weather|news|web|internet/i.test(lastUserMsg);

  let searchContext = "";
  if (needsSearch) {
    searchContext = await webSearch(lastUserMsg, language);
  }

  const contextParts: string[] = [
    languageInstruction(language),
    "Reponds avec des blocs concis, structures et visuels.",
    "Transforme les idees naturelles en notes, projets, taches, checklists, plans et documents organises sans demander a l'utilisateur de structurer lui-meme.",
    "Privilegie les titres courts, listes, tableaux compacts, cartes textuelles et mini schemas ASCII quand cela clarifie l'idee.",
    "Evite les gros paragraphes. Si la demande est vague, propose une structure exploitable et des prochaines actions.",
    "Tu es un assistant personnel intégré dans MyCloud, un espace de travail personnel intelligent.",
    "Respect the detected language rule above for every answer.",
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

// POST /api/ai/image - Generer une image visuelle dans une conversation
router.post("/image", authMiddleware, async (req: AuthRequest, res) => {
  const { prompt, conversationId } = req.body as {
    prompt?: string;
    conversationId?: string;
  };

  if (!prompt?.trim()) {
    res.status(400).json({ error: "prompt requis" });
    return;
  }

  const userId = req.userId as string;
  let activeConversationId = conversationId;
  let conversation: typeof conversationsTable.$inferSelect | null = null;

  try {
    if (activeConversationId) {
      const convRecord = await db
        .select()
        .from(conversationsTable)
        .where(and(eq(conversationsTable.id, activeConversationId), eq(conversationsTable.userId, userId)))
        .limit(1);

      if (!convRecord.length) {
        res.status(404).json({ error: "Conversation introuvable" });
        return;
      }

      conversation = convRecord[0];
    } else {
      activeConversationId = nanoid();
      conversation = {
        id: activeConversationId,
        userId,
        title: `Image: ${prompt.trim().slice(0, 40)}`,
        topic: "image",
        summary: null,
        messageCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        archivedAt: null,
      };
      db.insert(conversationsTable).values(conversation).run();
    }

    const language = detectUserLanguage(prompt);
    const spec = await makeImageSpec(prompt, language);
    const svg = renderGeneratedSvg(prompt, spec);
    const imageUrl = `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
    const reply = [
      `## ${spec.title}`,
      "",
      `![${spec.title}](${imageUrl})`,
      "",
      spec.description,
      "",
      localizedLabel(language, {
        French: "Utilise ce visuel comme carte d'explication, support de projet ou image de note. Tu peux le sauvegarder dans MyClouds.",
        English: "Use this visual as an explanation card, project aid, or note image. You can save it into MyClouds.",
        Spanish: "Usa este visual como tarjeta explicativa, apoyo de proyecto o imagen de nota. Puedes guardarlo en MyClouds.",
      }),
      "",
      `${localizedLabel(language, { French: "Demande", English: "Prompt", Spanish: "Solicitud" })}: ${prompt.trim()}`,
    ].join("\n");

    db.insert(conversationMessagesTable).values({
      id: nanoid(),
      conversationId: activeConversationId,
      userId,
      role: "user",
      content: prompt.trim(),
      createdAt: Date.now(),
    }).run();

    db.insert(conversationMessagesTable).values({
      id: nanoid(),
      conversationId: activeConversationId,
      userId,
      role: "assistant",
      content: reply,
      metadata: JSON.stringify({ type: "generated-image", title: spec.title }),
      createdAt: Date.now(),
    }).run();

    await db
      .update(conversationsTable)
      .set({
        messageCount: (conversation?.messageCount || 0) + 2,
        updatedAt: Date.now(),
      })
      .where(and(eq(conversationsTable.id, activeConversationId), eq(conversationsTable.userId, userId)))
      .run();

    res.json({
      title: spec.title,
      description: spec.description,
      imageUrl,
      reply,
      conversationId: activeConversationId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur generation image" });
  }
});

// POST /api/ai/organize - Organiser automatiquement des elements ou une idee
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

  const language = detectUserLanguage(idea || items?.map(item => item.name).join(" ") || "");
  let prompt = "";
  
  if (idea) {
    // Organizing an idea
    prompt = `
${languageInstruction(language)}
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
${languageInstruction(language)}
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

  const language = detectUserLanguage(text);
  const prompt = `
${languageInstruction(language)}
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

  const language = detectUserLanguage(content);
  const prompt = `
${languageInstruction(language)}
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

  const language = detectUserLanguage(text);
  const prompt = `
${languageInstruction(language)}
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

  const language = detectUserLanguage([...itemNames, ...(descriptions ?? [])].join(" "));
  const prompt = `
${languageInstruction(language)}
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

  const language = detectUserLanguage(text);
  const prompt = `
${languageInstruction(language)}
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

  const language = detectUserLanguage(text);
  const prompt = `
${languageInstruction(language)}
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

  const language = detectUserLanguage(`${title} ${description ?? ""}`);
  const prompt = `
${languageInstruction(language)}
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
