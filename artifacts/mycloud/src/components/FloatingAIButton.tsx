import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  FileText,
  Image as ImageIcon,
  LayoutGrid,
  ListChecks,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useAI } from "../hooks/useAI";
import { type Conversation, type ConversationMessage, useConversationMessages, useConversations } from "../hooks/useConversations";
import { useItems } from "../hooks/useItems";
import AIResponseContent from "./AIResponseContent";

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

const quickActions = [
  {
    label: "Organiser",
    icon: LayoutGrid,
    prompt: "Organise cette idee en espace de travail clair avec dossiers, notes, taches et prochaines actions : ",
  },
  {
    label: "Image",
    icon: ImageIcon,
    prompt: "Cree une image premium et futuriste pour : ",
  },
  {
    label: "Document",
    icon: FileText,
    prompt: "Genere un document structure, propre et facile a lire sur : ",
  },
  {
    label: "Checklist",
    icon: ListChecks,
    prompt: "Transforme cette idee en checklist actionnable : ",
  },
];

function wantsImage(text: string): boolean {
  return /\b(image|images|illustration|visuel|visuelle|dessin|affiche|poster|logo|photo|cover|banniere|wallpaper)\b/i.test(text)
    && /\b(cree|creer|cr[eéè]e|cr[eéè]er|genere|g[eé]n[eè]re|dessine|fabrique|imagine|make|create|generate)\b/i.test(text);
}

export function FloatingAIButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string>();
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { chat, generateImage, loading } = useAI();
  const { createItem } = useItems();
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
      const response = wantsImage(text)
        ? await generateImage(text, { conversationId })
        : await chat([{ role: "user", content: text }], { mode: "chat", conversationId });

      if (response.conversationId && response.conversationId !== conversationId) {
        setActiveConversationId(response.conversationId);
      }

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

  const handleSaveImage = async (image: { title: string; imageUrl: string; content: string }) => {
    await createItem({
      type: "file",
      title: image.title,
      fileUrl: image.imageUrl,
      mimeType: "image/svg+xml",
      fileSize: image.imageUrl.length,
      x: 140 + Math.round(Math.random() * 160),
      y: 120 + Math.round(Math.random() * 120),
      width: 420,
      height: 280,
      aiSummary: image.content,
      tags: JSON.stringify(["ai-image", "visual"]),
    });
    window.dispatchEvent(new CustomEvent("mycloud:item-created"));
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
                    {message.role === "assistant" ? (
                      <AIResponseContent content={message.content} onSaveImage={handleSaveImage} />
                    ) : (
                      message.content
                    )}
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

            <div className="floating-ai-quick-actions" aria-label="Actions IA rapides">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => setInput(action.prompt)}
                    disabled={loading}
                    title={action.label}
                  >
                    <Icon size={14} />
                    <span>{action.label}</span>
                  </button>
                );
              })}
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
                placeholder="Demander, organiser, creer une image..."
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
