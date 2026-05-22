import { useState, useCallback } from "react";
import { useApi } from "./useApi";

export function useAI() {
  const { api } = useApi();
  const [loading, setLoading] = useState(false);

  const chat = useCallback(
    async (
      messages: { role: "user" | "assistant"; content: string }[],
      options?: { categoryName?: string; categoryItems?: string[]; mode?: string; profile?: any; conversationId?: string }
    ) => {
      setLoading(true);
      try {
        const response = await api<{ reply: string; searchUsed: boolean; conversationId?: string }>("/ai/chat", {
          method: "POST",
          body: JSON.stringify({ messages, ...options }),
        });
        return response;
      } finally {
        setLoading(false);
      }
    },
    [api]
  );

  const generateImage = useCallback(
    async (prompt: string, options?: { conversationId?: string }) => {
      setLoading(true);
      try {
        const response = await api<{
          title: string;
          description: string;
          imageUrl: string;
          reply: string;
          conversationId?: string;
        }>("/ai/image", {
          method: "POST",
          body: JSON.stringify({ prompt, ...options }),
        });
        return response;
      } finally {
        setLoading(false);
      }
    },
    [api]
  );

  const organize = useCallback(
    async (
      items: { name: string; type: string }[] = [],
      existingCategories?: string[],
      idea?: string,
    ) => {
      setLoading(true);
      try {
        const response = await api<{ suggestion?: string; structure?: unknown; raw?: string }>("/ai/organize", {
          method: "POST",
          body: JSON.stringify({ items, existingCategories, idea }),
        });
        return response;
      } finally {
        setLoading(false);
      }
    },
    [api]
  );

  const summarize = useCallback(
    async (text: string, type?: string) => {
      setLoading(true);
      try {
        const response = await api<{ summary: string }>("/ai/summarize", {
          method: "POST",
          body: JSON.stringify({ text, type }),
        });
        return response.summary;
      } finally {
        setLoading(false);
      }
    },
    [api]
  );

  const generateStructure = useCallback(
    async (content: string, title?: string) => {
      setLoading(true);
      try {
        const response = await api<{ structure: string }>("/ai/structure", {
          method: "POST",
          body: JSON.stringify({ content, title }),
        });
        return response.structure;
      } finally {
        setLoading(false);
      }
    },
    [api]
  );

  const generateTags = useCallback(
    async (text: string, limit?: number) => {
      setLoading(true);
      try {
        const response = await api<{ tags: string }>("/ai/generate-tags", {
          method: "POST",
          body: JSON.stringify({ text, limit }),
        });
        return response.tags;
      } finally {
        setLoading(false);
      }
    },
    [api]
  );

  const detectProjects = useCallback(
    async (itemNames: string[], descriptions?: string[]) => {
      setLoading(true);
      try {
        const response = await api<{ projects: string }>("/ai/detect-projects", {
          method: "POST",
          body: JSON.stringify({ itemNames, descriptions }),
        });
        return response.projects;
      } finally {
        setLoading(false);
      }
    },
    [api]
  );

  const detectTasks = useCallback(
    async (text: string) => {
      setLoading(true);
      try {
        const response = await api<{ tasks: string }>("/ai/detect-tasks", {
          method: "POST",
          body: JSON.stringify({ text }),
        });
        return response.tasks;
      } finally {
        setLoading(false);
      }
    },
    [api]
  );

  const improveText = useCallback(
    async (text: string, style?: string) => {
      setLoading(true);
      try {
        const response = await api<{ improved: string }>("/ai/improve-text", {
          method: "POST",
          body: JSON.stringify({ text, style }),
        });
        return response.improved;
      } finally {
        setLoading(false);
      }
    },
    [api]
  );

  const explainVisual = useCallback(
    async (title: string, description?: string) => {
      setLoading(true);
      try {
        const response = await api<{ visual: string }>("/ai/explain-visual", {
          method: "POST",
          body: JSON.stringify({ title, description }),
        });
        return response.visual;
      } finally {
        setLoading(false);
      }
    },
    [api]
  );

  return {
    chat,
    generateImage,
    organize,
    summarize,
    generateStructure,
    generateTags,
    detectProjects,
    detectTasks,
    improveText,
    explainVisual,
    loading,
  };
}
