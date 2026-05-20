import { useState, useCallback } from "react";
import { useApi } from "./useApi";

export interface CanvasItem {
  id: string;
  type: "file" | "note" | "browser";
  title: string;
  content?: string;
  fileUrl?: string;
  mimeType?: string;
  url?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  categoryId?: string | null;
  folderId?: string | null;
  aiSummary?: string;
  tags?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export function useItems() {
  const { api } = useApi();
  const [items, setItems] = useState<CanvasItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<CanvasItem[]>("/items");
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [api]);

  const createItem = useCallback(
    async (item: Omit<CanvasItem, "id" | "createdAt" | "updatedAt">) => {
      try {
        const newItem = await api<CanvasItem>("/items", {
          method: "POST",
          body: JSON.stringify(item),
        });
        setItems((prev) => [...prev, newItem]);
        return newItem;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur";
        setError(message);
        throw err;
      }
    },
    [api]
  );

  const updateItem = useCallback(
    async (id: string, updates: Partial<CanvasItem>) => {
      try {
        const updated = await api<CanvasItem>(`/items/${id}`, {
          method: "PATCH",
          body: JSON.stringify(updates),
        });
        setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
        return updated;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur";
        setError(message);
        throw err;
      }
    },
    [api]
  );

  const deleteItem = useCallback(
    async (id: string) => {
      try {
        await api(`/items/${id}`, { method: "DELETE" });
        setItems((prev) => prev.filter((i) => i.id !== id));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur";
        setError(message);
        throw err;
      }
    },
    [api]
  );

  return { items, loading, error, loadItems, createItem, updateItem, deleteItem };
}
