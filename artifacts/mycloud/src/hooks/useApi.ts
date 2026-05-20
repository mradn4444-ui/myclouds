import { useCallback } from "react";
import { useAuth } from "./useAuth";
import { apiFetch } from "@/lib/api";

interface ApiOptions extends RequestInit {
  skipAuth?: boolean;
}

export function useApi() {
  const { token } = useAuth();

  const api = useCallback(
    async <T,>(endpoint: string, options?: ApiOptions): Promise<T> => {
      return apiFetch<T>(endpoint, options);
    },
    [token]
  );

  return { api, token };
}
