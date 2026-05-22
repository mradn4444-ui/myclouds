export const AUTH_TOKEN_KEY = "mycloud-auth-token";

export type ApiErrorBody = {
  error?: string;
  message?: string;
};

function localApiBase() {
  if (typeof window === "undefined") return "";

  const { hostname, protocol } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0") {
    return "http://localhost:8081";
  }

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    return `${protocol}//${hostname}:8081`;
  }

  return "";
}

export function getApiBase() {
  return import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || localApiBase();
}

export function getApiConfigError() {
  if (getApiBase()) return null;
  if (!import.meta.env.PROD) return null;

  return "Configuration API manquante: ajoute VITE_API_BASE_URL dans Netlify avec l'URL de ton API deployee.";
}

export function getApiUrl(endpoint: string) {
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const base = getApiBase();

  const configError = getApiConfigError();
  if (configError) throw new Error(configError);

  return `${base}/api${path}`;
}

export function getOptionalApiUrl(endpoint: string) {
  return getApiConfigError() ? null : getApiUrl(endpoint);
}

export function getAuthedAssetUrl(pathOrUrl?: string | null) {
  if (!pathOrUrl) return "";

  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const base = pathOrUrl.startsWith("/api/")
    ? `${getApiBase()}${pathOrUrl}`
    : pathOrUrl;

  if (!token || !base.startsWith("/api/") && !base.includes("/api/")) {
    return base;
  }

  const url = new URL(base, window.location.origin);
  if (!url.searchParams.has("access_token")) {
    url.searchParams.set("access_token", token);
  }

  return base.startsWith("http")
    ? url.toString()
    : url.pathname + url.search + url.hash;
}

export async function parseJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const raw = await response.text();

  try {
    return (raw ? JSON.parse(raw) : {}) as T;
  } catch {
    if (!contentType.includes("application/json")) {
      const preview = raw.trim().slice(0, 160);
      const isHtml = preview.startsWith("<!DOCTYPE") || preview.startsWith("<html");
      const hint = isHtml
        ? `Le front a recu une page HTML au lieu de l'API JSON (${response.url}). En local, ouvre l'app via le serveur Vite ou lance l'API sur 8081. Sur Netlify, configure VITE_API_BASE_URL vers l'API deployee.`
        : `Le serveur n'a pas renvoye de JSON valide (${response.status} ${response.statusText || "reponse inconnue"}).`;
      throw new Error(preview ? `${hint} Apercu: ${preview}` : hint);
    }
    throw new Error("Reponse JSON invalide.");
  }
}

export async function apiFetch<T>(endpoint: string, options?: RequestInit & { skipAuth?: boolean }) {
  const { skipAuth = false, headers = {}, ...rest } = options ?? {};
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  };

  if (!skipAuth && token) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  let url: string;
  try {
    url = getApiUrl(endpoint);
  } catch (err) {
    throw err instanceof Error ? err : new Error("Configuration API invalide.");
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      headers: finalHeaders,
    });
  } catch {
    throw new Error("Impossible de joindre le serveur API. Verifie que l'API MyCloud tourne sur http://localhost:8081.");
  }

  const data = await parseJsonResponse<T & ApiErrorBody>(response);
  if (!response.ok) {
    throw new Error(data.error || data.message || `Erreur HTTP ${response.status}`);
  }

  return data as T;
}
