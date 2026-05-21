import { useState, useCallback, useEffect } from "react";
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

export interface ConversationContext {
  recentMessages: ConversationMessage[];
  summary: string;
  topics: string[];
  keyDecisions: string[];
}

export function useConversationMemory() {
  const { api } = useApi();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all conversations
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

  // Load conversation messages
  const loadMessages = useCallback(
    async (conversationId: string) => {
      setLoading(true);
      setError(null);
      try {
        const data = await api<ConversationMessage[]>(`/conversations/${conversationId}/messages`);
        setMessages(data);
        setCurrentConversationId(conversationId);
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load messages";
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [api]
  );

  // Create new conversation
  const createConversation = useCallback(
    async (title: string = "Nouvelle conversation", topic?: string) => {
      try {
        const conversation = await api<Conversation>("/conversations", {
          method: "POST",
          body: JSON.stringify({ title, topic }),
        });
        setConversations((prev) => [conversation, ...prev]);
        setCurrentConversationId(conversation.id);
        setMessages([]);
        return conversation;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create conversation";
        setError(message);
        throw err;
      }
    },
    [api]
  );

  // Add message to conversation
  const addMessage = useCallback(
    async (role: "user" | "assistant", content: string, metadata?: Record<string, any>) => {
      if (!currentConversationId) {
        setError("No conversation selected");
        return null;
      }

      try {
        const message = await api<ConversationMessage>(
          `/conversations/${currentConversationId}/messages`,
          {
            method: "POST",
            body: JSON.stringify({ role, content, metadata }),
          }
        );
        setMessages((prev) => [...prev, message]);

        // Update conversation in list
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === currentConversationId
              ? { ...conv, messageCount: (conv.messageCount || 0) + 1, updatedAt: Date.now() }
              : conv
          )
        );

        return message;
      } catch (err) {
        const message_error = err instanceof Error ? err.message : "Failed to add message";
        setError(message_error);
        throw err;
      }
    },
    [api, currentConversationId]
  );

  // Get conversation context (recent history summary)
  const getConversationContext = useCallback((): ConversationContext => {
    const recentMessages = messages.slice(-10);
    
    // Extract topics from messages
    const topicsSet = new Set<string>();
    const keyDecisions: string[] = [];
    
    messages.forEach((msg) => {
      const metadata = msg.metadata ? JSON.parse(msg.metadata) : {};
      if (metadata.topic) topicsSet.add(metadata.topic);
      if (metadata.decision) keyDecisions.push(metadata.decision);
    });

    const summary = recentMessages
      .filter((m) => m.role === "assistant")
      .map((m) => m.content.slice(0, 100))
      .join(" ")
      .slice(0, 200);

    return {
      recentMessages,
      summary,
      topics: Array.from(topicsSet),
      keyDecisions,
    };
  }, [messages]);

  // Update conversation title
  const updateConversationTitle = useCallback(
    async (conversationId: string, title: string) => {
      try {
        await api(`/conversations/${conversationId}`, {
          method: "PATCH",
          body: JSON.stringify({ title }),
        });
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === conversationId ? { ...conv, title } : conv
          )
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update conversation";
        setError(message);
        throw err;
      }
    },
    [api]
  );

  // Delete conversation
  const deleteConversation = useCallback(
    async (conversationId: string) => {
      try {
        await api(`/conversations/${conversationId}`, { method: "DELETE" });
        setConversations((prev) => prev.filter((c) => c.id !== conversationId));
        if (currentConversationId === conversationId) {
          setCurrentConversationId(null);
          setMessages([]);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete conversation";
        setError(message);
        throw err;
      }
    },
    [api, currentConversationId]
  );

  // Auto-load recent conversation on mount
  useEffect(() => {
    loadConversations().then((convs) => {
      if (convs.length > 0 && !currentConversationId) {
        setCurrentConversationId(convs[0].id);
      }
    });
  }, []);

  return {
    conversations,
    currentConversationId,
    messages,
    loading,
    error,
    loadConversations,
    loadMessages,
    createConversation,
    addMessage,
    getConversationContext,
    updateConversationTitle,
    deleteConversation,
    setCurrentConversationId,
  };
}
