import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, MessageSquare, Pencil, Plus, Send, Sparkles, Trash2, X } from "lucide-react";
import { useAI } from "../hooks/useAI";
import { type Conversation, type ConversationMessage, useConversationMessages, useConversations } from "../hooks/useConversations";

interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

function toPanelMessage(message: ConversationMessage): AIMessage {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    timestamp: message.createdAt,
  };
}

function fallbackTitle(text: string) {
  const title = text.trim().replace(/\s+/g, " ").slice(0, 42);
  return title || "Nouvelle conversation";
}

export function FloatingAIButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string>();
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { chat, loading } = useAI();
  const {
    conversations,
    loading: conversationsLoading,
    loadConversations,
    createConversation,
    updateConversation,
    deleteConversation,
  } = useConversations();
  const { loadMessages } = useConversationMessages(activeConversationId);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId),
    [activeConversationId, conversations],
  );

  useEffect(() => {
    loadConversations().then((loaded) => {
      if (!activeConversationId && loaded[0]) {
        setActiveConversationId(loaded[0].id);
      }
    });
  }, [loadConversations]);

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    loadMessages(activeConversationId).then((loaded) => {
      setMessages(loaded.map(toPanelMessage));
    });
  }, [activeConversationId, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleNewChat = async () => {
    const conversation = await createConversation();
    setActiveConversationId(conversation.id);
    setMessages([]);
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setActiveConversationId(conversation.id);
    setRenamingId(null);
  };

  const handleStartRename = (conversation: Conversation) => {
    setRenamingId(conversation.id);
    setDraftTitle(conversation.title);
  };

  const handleSaveRename = async () => {
    if (!renamingId || !draftTitle.trim()) return;
    await updateConversation(renamingId, { title: draftTitle.trim() });
    setRenamingId(null);
  };

  const handleDelete = async (id: string) => {
    await deleteConversation(id);
    if (activeConversationId === id) {
      const remaining = conversations.filter((conversation) => conversation.id !== id);
      setActiveConversationId(remaining[0]?.id);
      setMessages([]);
    }
  };

  const handleSendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    let conversationId = activeConversationId;
    if (!conversationId) {
      const conversation = await createConversation(fallbackTitle(text));
      conversationId = conversation.id;
      setActiveConversationId(conversation.id);
    } else if (activeConversation?.title === "Nouvelle conversation" && messages.length === 0) {
      await updateConversation(conversationId, { title: fallbackTitle(text) });
    }

    const userMessage: AIMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const response = await chat([{ role: "user", content: text }], { mode: "chat", conversationId });
      const assistantMessage: AIMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.reply,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      await loadConversations();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur IA";
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: `Impossible de contacter l'IA. ${message}`,
          timestamp: Date.now(),
        },
      ]);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen((value) => !value)}
        className={`floating-ai-trigger${isOpen ? " is-open" : ""}`}
        aria-label={isOpen ? "Fermer l'assistant IA" : "Ouvrir l'assistant IA"}
      >
        {isOpen ? <X size={22} /> : <Sparkles size={22} />}
      </button>

      {isOpen && (
        <div className="floating-ai-panel">
          <aside className="floating-ai-sidebar">
            <div className="floating-ai-sidebar-head">
              <span>Conversations</span>
              <button onClick={handleNewChat} className="floating-ai-icon-btn" title="Nouveau chat">
                <Plus size={14} />
              </button>
            </div>

            <div className="floating-ai-conversation-list">
              {conversationsLoading && (
                <div className="floating-ai-empty">Chargement...</div>
              )}
              {!conversationsLoading && conversations.length === 0 && (
                <button className="floating-ai-empty floating-ai-empty-action" onClick={handleNewChat}>
                  Creer le premier chat
                </button>
              )}
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`floating-ai-conversation${conversation.id === activeConversationId ? " active" : ""}`}
                >
                  {renamingId === conversation.id ? (
                    <input
                      className="floating-ai-rename"
                      value={draftTitle}
                      autoFocus
                      onChange={(event) => setDraftTitle(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void handleSaveRename();
                        if (event.key === "Escape") setRenamingId(null);
                      }}
                    />
                  ) : (
                    <button onClick={() => handleSelectConversation(conversation)} className="floating-ai-conversation-main">
                      <MessageSquare size={13} />
                      <span>{conversation.title}</span>
                    </button>
                  )}

                  <div className="floating-ai-conversation-actions">
                    {renamingId === conversation.id ? (
                      <button onClick={handleSaveRename} className="floating-ai-icon-btn" title="Valider">
                        <Check size={12} />
                      </button>
                    ) : (
                      <button onClick={() => handleStartRename(conversation)} className="floating-ai-icon-btn" title="Renommer">
                        <Pencil size={12} />
                      </button>
                    )}
                    <button onClick={() => handleDelete(conversation.id)} className="floating-ai-icon-btn" title="Supprimer">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <section className="floating-ai-chat">
            <header className="floating-ai-header">
              <div>
                <p>Assistant IA</p>
                <span>{activeConversation?.title ?? "Memoire personnelle"}</span>
              </div>
            </header>

            <div className="floating-ai-thread">
              {messages.length === 0 ? (
                <div className="floating-ai-empty">
                  <Sparkles size={18} />
                  <span>Choisis un chat ou commence une nouvelle memoire.</span>
                </div>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className={`floating-ai-message ${message.role}`}>
                    {message.content}
                  </div>
                ))
              )}

              {loading && (
                <div className="floating-ai-message assistant loading">
                  <Loader2 size={14} />
                  <span>IA reflechit...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="floating-ai-inputbar">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSendMessage();
                  }
                }}
                placeholder="Demander, retrouver, organiser..."
                disabled={loading}
                rows={2}
              />
              <button
                onClick={handleSendMessage}
                disabled={loading || !input.trim()}
                className={input.trim() && !loading ? "enabled" : ""}
                title="Envoyer"
              >
                {loading ? <Loader2 size={16} /> : <Send size={16} />}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
