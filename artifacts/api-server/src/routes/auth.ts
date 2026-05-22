import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, usersTable, type User } from "@workspace/db";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../middlewares/auth";

const router = Router();

if (!process.env.JWT_SECRET) {
  console.warn(
    "[auth] JWT_SECRET env variable is not set. Using default for dev."
  );
}
const JWT_SECRET: string = process.env.JWT_SECRET ?? "dev-secret-change-me";
const JWT_EXPIRES = "30d";

function makeToken(user: User) {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

type OAuthProvider = "google" | "github";

const oauthConfig = {
  google: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    userUrl: "https://www.googleapis.com/oauth2/v2/userinfo",
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    scope: "openid email profile",
  },
  github: {
    authUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    userUrl: "https://api.github.com/user",
    emailsUrl: "https://api.github.com/user/emails",
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    scope: "read:user user:email",
  },
} satisfies Record<OAuthProvider, Record<string, string | undefined>>;

function appUrl() {
  return (process.env.FRONTEND_URL || process.env.PUBLIC_APP_URL || "http://localhost:8080").replace(/\/$/, "");
}

function callbackUrl(req: { protocol: string; get(name: string): string | undefined }, provider: OAuthProvider) {
  const apiBase = (process.env.API_PUBLIC_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
  return `${apiBase}/api/auth/oauth/${provider}/callback`;
}

function oauthState(provider: OAuthProvider) {
  return jwt.sign({ provider, nonce: nanoid() }, JWT_SECRET, { expiresIn: "10m" });
}

function verifyOAuthState(state: string, provider: OAuthProvider) {
  const payload = jwt.verify(state, JWT_SECRET) as { provider: OAuthProvider };
  return payload.provider === provider;
}

function normalizeEmail(email?: string | null) {
  return email?.toLowerCase().trim() || null;
}

function findOrCreateOAuthUser(email: string, provider: OAuthProvider): User {
  const existing = db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .get();

  if (existing) return existing;

  const user: User = {
    id: nanoid(),
    email,
    passwordHash: `oauth:${provider}:${nanoid()}`,
    nom: null,
    prenom: null,
    pseudo: null,
    age: null,
    aiStyle: null,
    workspaceBase: null,
    workspaceAccent: null,
    workspaceGlow: null,
    workspaceMotion: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  db.insert(usersTable).values(user).run();
  return user;
}

async function readJson<T>(response: Response): Promise<T> {
  const raw = await response.text();
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(`Invalid JSON from OAuth provider (${response.status})`);
  }
}

router.post("/register", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ error: "Email et mot de passe requis" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "Le mot de passe doit faire au moins 6 caractères" });
    return;
  }

  try {
    const existing = db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase().trim()))
      .get();

    if (existing) {
      res.status(409).json({ error: "Un compte avec cet email existe déjà" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user: User = {
      id: nanoid(),
      email: email.toLowerCase().trim(),
      passwordHash,
      nom: null,
      prenom: null,
      pseudo: null,
      age: null,
      aiStyle: null,
      workspaceBase: null,
      workspaceAccent: null,
      workspaceGlow: null,
      workspaceMotion: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    db.insert(usersTable).values(user).run();

    res.json({
      token: makeToken(user),
      user: { id: user.id, email: user.email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de l'inscription" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ error: "Email et mot de passe requis" });
    return;
  }

  try {
    const user = db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase().trim()))
      .get();

    if (!user) {
      res.status(401).json({ error: "Email ou mot de passe incorrect" });
      return;
    }

    if (user.passwordHash?.startsWith("oauth:")) {
      res.status(403).json({ error: "Compte OAuth détecté. Utilisez la connexion Google ou GitHub." });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      res.status(401).json({ error: "Email ou mot de passe incorrect" });
      return;
    }

    res.json({
      token: makeToken(user),
      user: { id: user.id, email: user.email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la connexion" });
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId as string;
    const user = db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .get();

    if (!user) {
      res.status(401).json({ error: "Utilisateur introuvable" });
      return;
    }

    res.json({ user: { id: user.id, email: user.email, pseudo: user.pseudo, nom: user.nom, prenom: user.prenom } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de vérifier la session" });
  }
});

router.get("/oauth/:provider", (req, res) => {
  const provider = req.params.provider as OAuthProvider;
  const config = oauthConfig[provider];

  if (!config) {
    res.status(404).json({ error: "Provider OAuth non supporte" });
    return;
  }

  if (!config.clientId || !config.clientSecret) {
    res.status(503).json({
      error: `OAuth ${provider} non configure`,
      requiredEnv: provider === "google"
        ? ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]
        : ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
    });
    return;
  }

  const url = new URL(config.authUrl!);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", callbackUrl(req, provider));
  url.searchParams.set("scope", config.scope!);
  url.searchParams.set("state", oauthState(provider));
  url.searchParams.set("response_type", "code");
  if (provider === "google") {
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "select_account");
  }

  res.redirect(url.toString());
});

router.get("/oauth/:provider/callback", async (req, res) => {
  const provider = req.params.provider as OAuthProvider;
  const config = oauthConfig[provider];
  const code = typeof req.query.code === "string" ? req.query.code : "";
  const state = typeof req.query.state === "string" ? req.query.state : "";

  try {
    if (!config) {
      res.status(404).json({ error: "Provider OAuth non supporte" });
      return;
    }
    if (!code || !state || !verifyOAuthState(state, provider)) {
      res.status(400).json({ error: "Callback OAuth invalide" });
      return;
    }
    if (!config.clientId || !config.clientSecret) {
      res.status(503).json({ error: `OAuth ${provider} non configure` });
      return;
    }

    const tokenResponse = await fetch(config.tokenUrl!, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: callbackUrl(req, provider),
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await readJson<{ access_token?: string; error?: string }>(tokenResponse);
    if (!tokenResponse.ok || !tokenData.access_token) {
      res.status(502).json({ error: tokenData.error || "Echange OAuth impossible" });
      return;
    }

    let email: string | null = null;
    if (provider === "google") {
      const userResponse = await fetch(config.userUrl!, {
        headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: "application/json" },
      });
      const profile = await readJson<{ email?: string }>(userResponse);
      email = normalizeEmail(profile.email);
    } else {
      const emailResponse = await fetch(oauthConfig.github.emailsUrl, {
        headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: "application/json" },
      });
      const emails = await readJson<{ email?: string; primary?: boolean; verified?: boolean }[]>(emailResponse);
      email = normalizeEmail(
        emails.find((item) => item.primary && item.verified)?.email ||
        emails.find((item) => item.verified)?.email,
      );
    }

    if (!email) {
      res.status(400).json({ error: "Aucun email verifie fourni par OAuth" });
      return;
    }

    const user = findOrCreateOAuthUser(email, provider);
    const token = makeToken(user);
    const redirect = new URL("/auth", appUrl());
    redirect.searchParams.set("token", token);
    res.redirect(redirect.toString());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur OAuth" });
  }
});

export default router;
