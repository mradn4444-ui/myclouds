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

export async function parseJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const raw = await response.text();

  if (!contentType.includes("application/json")) {
    const hint = raw.trim().startsWith("<!DOCTYPE") || raw.trim().startsWith("<html")
      ? "Le serveur a renvoye une page HTML au lieu de JSON. Verifie l'URL API ou le proxy."
      : "Le serveur n'a pas renvoye de JSON valide.";
    throw new Error(hint);
  }

  try {
    return (raw ? JSON.parse(raw) : {}) as T;
  } catch {
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

  const response = await fetch(getApiUrl(endpoint), {
    ...rest,
    headers: finalHeaders,
  });

  const data = await parseJsonResponse<T & ApiErrorBody>(response);
  if (!response.ok) {
    throw new Error(data.error || data.message || `Erreur HTTP ${response.status}`);
  }

  return data as T;
}
