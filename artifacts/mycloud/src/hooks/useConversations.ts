import { useState, useCallback } from "react";
import { useApi } from "./useApi";

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  summary?: string;
  topic?: string;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
  archivedAt?: number;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  userId: string;
  role: "user" | "assistant";
  content: string;
  tokens?: number;
  metadata?: string;
  createdAt: number;
}

export function useConversations() {
  const { api } = useApi();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all conversations for current user
  const loadConversations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<Conversation[]>("/conversations");
      setConversations(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load conversations";
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [api]);

  // Create new conversation
  const createConversation = useCallback(
    async (title: string = "Nouvelle conversation", topic?: string) => {
      try {
        const conversation = await api<Conversation>("/conversations", {
          method: "POST",
          body: JSON.stringify({ title, topic }),
        });
        setConversations((prev) => [conversation, ...prev]);
        return conversation;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create conversation";
        setError(message);
        throw err;
      }
    },
    [api]
  );

  // Update conversation (title, topic, summary)
  const updateConversation = useCallback(
    async (id: string, updates: { title?: string; topic?: string; summary?: string }) => {
      try {
        const updated = await api<Conversation>(`/conversations/${id}`, {
          method: "PATCH",
          body: JSON.stringify(updates),
        });
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? updated : c))
        );
        return updated;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update conversation";
        setError(message);
        throw err;
      }
    },
    [api]
  );

  // Archive conversation
  const archiveConversation = useCallback(
    async (id: string) => {
      try {
        await api(`/conversations/${id}/archive`, {
          method: "POST",
        });
        setConversations((prev) =>
          prev.filter((c) => c.id !== id)
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to archive conversation";
        setError(message);
        throw err;
      }
    },
    [api]
  );

  // Delete conversation
  const deleteConversation = useCallback(
    async (id: string) => {
      try {
        await api(`/conversations/${id}`, {
          method: "DELETE",
        });
        setConversations((prev) =>
          prev.filter((c) => c.id !== id)
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete conversation";
        setError(message);
        throw err;
      }
    },
    [api]
  );

  return {
    conversations,
    loading,
    error,
    loadConversations,
    createConversation,
    updateConversation,
    archiveConversation,
    deleteConversation,
  };
}

export function useConversationMessages(conversationId?: string) {
  const { api } = useApi();
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load messages from conversation
  const loadMessages = useCallback(async (convId?: string) => {
    const id = convId || conversationId;
    if (!id) return [];

    setLoading(true);
    setError(null);
    try {
      const data = await api<ConversationMessage[]>(`/conversations/${id}/messages`);
      setMessages(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load messages";
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [api, conversationId]);

  // Add message to conversation
  const addMessage = useCallback(
    async (role: "user" | "assistant", content: string, metadata?: Record<string, any>) => {
      if (!conversationId) {
        setError("No conversation selected");
        return null;
      }

      try {
        const message = await api<ConversationMessage>(
          `/conversations/${conversationId}/messages`,
          {
            method: "POST",
            body: JSON.stringify({ role, content, metadata }),
          }
        );
        setMessages((prev) => [...prev, message]);
        return message;
      } catch (err) {
        const message_error = err instanceof Error ? err.message : "Failed to add message";
        setError(message_error);
        throw err;
      }
    },
    [api, conversationId]
  );

  return {
    messages,
    loading,
    error,
    loadMessages,
    addMessage,
  };
}
