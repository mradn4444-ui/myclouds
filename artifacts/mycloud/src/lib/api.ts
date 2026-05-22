export const AUTH_TOKEN_KEY = "mycloud-auth-token";

export type ApiErrorBody = {
  error?: string;
  message?: string;
};

export function getApiBase() {
  return import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "";
}

export function getApiUrl(endpoint: string) {
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${getApiBase()}/api${path}`;
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
        ? "Le serveur a renvoye une page HTML au lieu de JSON. Verifie que l'API tourne sur le port 8081."
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

  let response: Response;
  try {
    response = await fetch(getApiUrl(endpoint), {
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
