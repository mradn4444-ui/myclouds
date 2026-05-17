import { Router } from "express";
import Groq from "groq-sdk";

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

router.post("/ai/chat", async (req, res) => {
  const { messages, categoryName, categoryItems, mode, profile } = req.body as {
    messages: { role: "user" | "assistant"; content: string }[];
    categoryName?: string;
    categoryItems?: string[];
    mode?: "chat" | "help";
    profile?: {
      nom?: string;
      prenom?: string;
      pseudo?: string;
      age?: string;
      aiStyle?: string;
    };
  };

  if (!messages?.length) {
    res.status(400).json({ error: "messages requis" });
    return;
  }

  const lastUserMsg = messages[messages.length - 1]?.content ?? "";
  const needsSearch = /recherche|trouve|cherche|actualit|météo|weather|news|web|internet/i.test(lastUserMsg);

  let searchContext = "";
  if (needsSearch) {
    searchContext = await webSearch(lastUserMsg);
  }

  const contextParts: string[] = [
    "Tu es un assistant personnel intégré dans MyCloud, un espace de travail personnel.",
    "Tu réponds en français.",
  ];

  // User profile context
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
  if (mode === "help") {
    contextParts.push("Aide l'utilisateur à organiser et gérer le contenu de cette catégorie.");
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
        ...messages,
      ],
      max_tokens: 1024,
      stream: false,
    });

    const reply = completion.choices[0]?.message?.content ?? "Désolé, je n'ai pas pu répondre.";
    res.json({ reply, searchUsed: !!searchContext });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur IA" });
  }
});

export default router;
