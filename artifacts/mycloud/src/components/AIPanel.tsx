import { useEffect, useRef, useState } from 'react'
import { X, Send, Bot, Search, Loader2, Sparkles } from 'lucide-react'
import type { Category } from './CategorySidebar'
import type { CanvasItem } from './CanvasWorkspace'
import type { UserProfile } from '../hooks/useUserProfile'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

type Props = {
  open: boolean
  onClose: () => void
  activeCategory: Category | null
  items: CanvasItem[]
  profile: UserProfile
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

export default function AIPanel({ open, onClose, activeCategory, items, profile }: Props) {
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
        const name = profile.pseudo || profile.prenom || null
        const greeting = activeCategory
          ? `${name ? `Salut ${name} !` : 'Salut !'} Je suis dans la catégorie **${activeCategory.name}** avec toi. Comment je peux t'aider ?`
          : `${name ? `Salut ${name} !` : 'Salut !'} Je suis ton assistant MyCloud. Pose-moi n'importe quelle question.`
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
          profile,
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
    <div className="fixed right-0 top-0 h-full flex flex-col z-50" style={{ width: '300px', background: '#080808', borderLeft: '1px solid #141414' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 shrink-0" style={{ borderBottom: '1px solid #141414' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 flex items-center justify-center" style={{ border: '1px solid #222' }}>
            <Sparkles className="w-3 h-3" style={{ color: '#fff' }} />
          </div>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#ccc', letterSpacing: '0.04em' }}>Assistant IA</p>
            {activeCategory && (
              <p style={{ fontSize: '9px', color: '#333', letterSpacing: '0.08em', fontFamily: 'ui-monospace, monospace' }}>{activeCategory.name.toUpperCase()}</p>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #1a1a1a', color: '#444' }}
          className="hover:border-neutral-600 hover:text-white transition-all"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-5 h-5 shrink-0 mt-0.5 flex items-center justify-center" style={{ border: '1px solid #222' }}>
                <Bot className="w-2.5 h-2.5" style={{ color: '#555' }} />
              </div>
            )}
            <div
              style={{
                maxWidth: '210px',
                padding: '8px 12px',
                fontSize: '11px',
                lineHeight: '1.65',
                whiteSpace: 'pre-wrap',
                ...(msg.role === 'user'
                  ? { background: '#fff', color: '#000' }
                  : { background: '#111', color: '#bbb', border: '1px solid #1a1a1a' }),
              }}
            >
              {msg.content.replace(/\*\*(.*?)\*\*/g, '$1')}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2 justify-start">
            <div className="w-5 h-5 shrink-0 mt-0.5 flex items-center justify-center" style={{ border: '1px solid #222' }}>
              <Bot className="w-2.5 h-2.5" style={{ color: '#555' }} />
            </div>
            <div style={{ background: '#111', border: '1px solid #1a1a1a', padding: '8px 12px' }}>
              <Loader2 className="w-3 h-3 animate-spin" style={{ color: '#444' }} />
            </div>
          </div>
        )}

        {searchUsed && (
          <div className="flex items-center gap-1.5" style={{ fontSize: '9px', color: '#333', letterSpacing: '0.08em' }}>
            <Search className="w-2.5 h-2.5" />
            RECHERCHE WEB
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 p-3" style={{ borderTop: '1px solid #141414' }}>
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Message…"
            rows={2}
            className="flex-1 text-xs resize-none focus:outline-none"
            style={{
              background: '#0e0e0e',
              border: '1px solid #1e1e1e',
              color: '#ccc',
              padding: '8px 10px',
              lineHeight: '1.5',
              caretColor: '#fff',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#333' }}
            onBlur={e => { e.currentTarget.style.borderColor = '#1e1e1e' }}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            style={{
              width: '32px', height: '32px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: input.trim() && !loading ? '#fff' : '#111',
              border: '1px solid #222',
              color: input.trim() && !loading ? '#000' : '#333',
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
          >
            <Send className="w-3 h-3" />
          </button>
        </div>
        <p style={{ fontSize: '9px', color: '#282828', marginTop: '6px', letterSpacing: '0.06em' }}>
          ↵ ENVOYER · ⇧↵ NOUVELLE LIGNE
        </p>
      </div>
    </div>
  )
}
