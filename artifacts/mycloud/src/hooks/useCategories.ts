import { useState, useCallback } from "react";
import { useApi } from "./useApi";

export interface Category {
  id: string;
  userId: string;
  name: string;
  color?: string;
  icon?: string;
  order?: number;
  createdAt?: Date;
}

export interface Folder {
  id: string;
  userId: string;
  categoryId: string;
  name: string;
  parentFolderId?: string | null;
  order?: number;
  createdAt?: Date;
}

export function useCategories() {
  const { api } = useApi();
  const [categories, setCategories] = useState<Category[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const [cats, flds] = await Promise.all([
        api<Category[]>("/categories/categories"),
        api<Folder[]>("/categories/folders"),
      ]);
      setCategories(cats);
      setFolders(flds);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  const createCategory = useCallback(
    async (name: string, color?: string, icon?: string) => {
      const cat = await api<Category>("/categories/categories", {
        method: "POST",
        body: JSON.stringify({ name, color, icon }),
      });
      setCategories((prev) => [...prev, cat]);
      return cat;
    },
    [api]
  );

  const updateCategory = useCallback(
    async (id: string, updates: Partial<Category>) => {
      const cat = await api<Category>(`/categories/categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
      setCategories((prev) => prev.map((c) => (c.id === id ? cat : c)));
      return cat;
    },
    [api]
  );

  const deleteCategory = useCallback(async (id: string) => {
    await api(`/categories/categories/${id}`, { method: "DELETE" });
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }, [api]);

  const createFolder = useCallback(
    async (categoryId: string, name: string, parentFolderId?: string) => {
      const folder = await api<Folder>("/categories/folders", {
        method: "POST",
        body: JSON.stringify({ categoryId, name, parentFolderId }),
      });
      setFolders((prev) => [...prev, folder]);
      return folder;
    },
    [api]
  );

  const deleteFolder = useCallback(async (id: string) => {
    await api(`/categories/folders/${id}`, { method: "DELETE" });
    setFolders((prev) => prev.filter((f) => f.id !== id));
  }, [api]);

  return {
    categories,
    folders,
    loading,
    loadCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    createFolder,
    deleteFolder,
  };
}
