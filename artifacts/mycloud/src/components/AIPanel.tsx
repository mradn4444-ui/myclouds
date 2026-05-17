import { useEffect, useRef, useState } from 'react'
import { X, Send, Bot, Search, Loader2, Sparkles } from 'lucide-react'
import type { Category } from './CategorySidebar'
import type { CanvasItem } from './CanvasWorkspace'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

type Props = {
  open: boolean
  onClose: () => void
  activeCategory: Category | null
  items: CanvasItem[]
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

export default function AIPanel({ open, onClose, activeCategory, items }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchUsed, setSearchUsed] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
      if (messages.length === 0) {
        const greeting = activeCategory
          ? `Bonjour ! Je suis ton assistant pour la catégorie **${activeCategory.name}**. Comment puis-je t'aider ?`
          : "Bonjour ! Je suis ton assistant MyCloud. Pose-moi une question ou demande-moi de t'aider à organiser ton espace."
        setMessages([{ role: 'assistant', content: greeting }])
      }
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    setMessages([])
  }, [activeCategory?.id])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return

    const newMessages: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setSearchUsed(false)

    try {
      const res = await fetch(`${BASE}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          categoryName: activeCategory?.name,
          categoryItems: items
            .filter(it => !activeCategory || it.categoryId === activeCategory.id)
            .map(it => it.title),
          mode: 'chat',
        }),
      })
      const data = await res.json() as { reply: string; searchUsed: boolean }
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
      setSearchUsed(data.searchUsed)
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "Désolé, une erreur s'est produite." }])
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed right-0 top-0 h-full w-[320px] bg-neutral-950 border-l border-neutral-800 flex flex-col z-50 shadow-2xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white">Assistant IA</p>
            {activeCategory && (
              <p className="text-[10px] text-neutral-500">{activeCategory.name}</p>
            )}
          </div>
        </div>
        <button onClick={onClose} className="p-1 text-neutral-500 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-5 h-5 rounded-full bg-indigo-900 flex items-center justify-center shrink-0 mt-0.5 mr-2">
                <Bot className="w-3 h-3 text-indigo-300" />
              </div>
            )}
            <div
              className={`max-w-[240px] rounded-lg px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-white text-black rounded-br-none'
                  : 'bg-neutral-800 text-neutral-100 rounded-bl-none'
              }`}
            >
              {msg.content.replace(/\*\*(.*?)\*\*/g, '$1')}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="w-5 h-5 rounded-full bg-indigo-900 flex items-center justify-center shrink-0 mt-0.5 mr-2">
              <Bot className="w-3 h-3 text-indigo-300" />
            </div>
            <div className="bg-neutral-800 rounded-lg rounded-bl-none px-3 py-2">
              <Loader2 className="w-3.5 h-3.5 text-neutral-400 animate-spin" />
            </div>
          </div>
        )}

        {searchUsed && (
          <div className="flex items-center gap-1.5 text-[10px] text-neutral-500">
            <Search className="w-3 h-3" />
            Résultats web utilisés
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 border-t border-neutral-800 p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder="Pose une question..."
            rows={2}
            className="flex-1 bg-neutral-900 border border-neutral-700 text-white text-xs px-3 py-2 rounded-lg resize-none focus:outline-none focus:border-neutral-500 placeholder:text-neutral-600"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-[10px] text-neutral-600 mt-1.5">Entrée pour envoyer · Maj+Entrée pour nouvelle ligne</p>
      </div>
    </div>
  )
}
