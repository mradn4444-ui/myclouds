import { useEffect, useRef, useState } from 'react'
import { X, Send, Bot, Search, Loader2, Sparkles, Mic, MicOff, Volume2, VolumeX, Globe } from 'lucide-react'
import type { Category } from './CategorySidebar'
import type { CanvasItem } from './CanvasWorkspace'
import type { UserProfile } from '../hooks/useUserProfile'
import { useVoice, speak, stopSpeaking } from '../hooks/useVoice'

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
  onOpenUrl?: (url: string) => void
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

function extractUrls(text: string): string[] {
  const re = /https?:\/\/[^\s"')>]+/g
  return Array.from(new Set(text.match(re) ?? []))
}

export default function AIPanel({ open, onClose, activeCategory, items, profile, onOpenUrl }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchUsed, setSearchUsed] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return
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
      if (voiceEnabled) {
        setSpeaking(true)
        speak(data.reply)
        const checkDone = setInterval(() => {
          if (!window.speechSynthesis?.speaking) {
            setSpeaking(false)
            clearInterval(checkDone)
          }
        }, 300)
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "Désolé, une erreur s'est produite." }])
    } finally {
      setLoading(false)
    }
  }

  const { listening, supported: micSupported, toggle: toggleMic } = useVoice({
    onResult: (transcript) => {
      setInput(transcript)
      sendMessage(transcript)
    },
  })

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
    } else {
      stopSpeaking()
      setSpeaking(false)
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    setMessages([])
    stopSpeaking()
    setSpeaking(false)
  }, [activeCategory?.id])

  const handleToggleVoice = () => {
    if (voiceEnabled) {
      stopSpeaking()
      setSpeaking(false)
    }
    setVoiceEnabled(v => !v)
  }

  const handleStopSpeaking = () => {
    stopSpeaking()
    setSpeaking(false)
  }

  if (!open) return null

  return (
    <div
      className="fixed right-0 top-0 h-full flex flex-col z-50"
      style={{ width: '300px', background: '#080808', borderLeft: '1px solid #141414' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 shrink-0" style={{ borderBottom: '1px solid #141414' }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-5 h-5 flex items-center justify-center"
            style={{ border: '1px solid #222', position: 'relative' }}
          >
            <Sparkles className="w-3 h-3" style={{ color: '#fff' }} />
          </div>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#ccc', letterSpacing: '0.04em' }}>
              Assistant IA
            </p>
            {activeCategory && (
              <p style={{ fontSize: '9px', color: '#333', letterSpacing: '0.08em', fontFamily: 'ui-monospace, monospace' }}>
                {activeCategory.name.toUpperCase()}
              </p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* Voice output toggle */}
          <button
            onClick={speaking ? handleStopSpeaking : handleToggleVoice}
            title={voiceEnabled ? 'Désactiver la voix IA' : 'Activer la voix IA'}
            style={{
              width: '24px', height: '24px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1px solid ${voiceEnabled ? '#fff' : '#1a1a1a'}`,
              color: voiceEnabled ? '#fff' : '#333',
              background: 'transparent',
              cursor: 'pointer',
              transition: 'all 0.15s',
              position: 'relative',
            }}
          >
            {speaking ? (
              <VolumeX className="w-3 h-3" />
            ) : voiceEnabled ? (
              <Volume2 className="w-3 h-3" />
            ) : (
              <VolumeX className="w-3 h-3" />
            )}
            {speaking && (
              <span style={{
                position: 'absolute', top: -2, right: -2,
                width: 6, height: 6, borderRadius: '50%',
                background: '#fff',
                animation: 'ai-pulse 1s ease-in-out infinite',
              }} />
            )}
          </button>

          <button
            onClick={onClose}
            style={{
              width: '24px', height: '24px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid #1a1a1a', color: '#444',
              background: 'transparent', cursor: 'pointer',
            }}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Listening indicator */}
      {listening && (
        <div style={{
          padding: '8px 16px',
          background: '#0d0d0d',
          borderBottom: '1px solid #141414',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <div className="voice-bars">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="voice-bar" style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
          <span style={{ fontSize: '9px', color: '#555', fontFamily: 'ui-monospace, monospace', letterSpacing: '0.1em' }}>
            ÉCOUTE EN COURS…
          </span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', gap: '8px', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {msg.role === 'assistant' && (
              <div
                className="w-5 h-5 shrink-0 mt-0.5 flex items-center justify-center"
                style={{ border: '1px solid #222', flexShrink: 0, alignSelf: 'flex-start', marginTop: '2px' }}
              >
                <Bot className="w-2.5 h-2.5" style={{ color: '#555' }} />
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '220px' }}>
              <div
                style={{
                  padding: '8px 12px',
                  fontSize: '11px',
                  lineHeight: '1.65',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  ...(msg.role === 'user'
                    ? { background: '#fff', color: '#000' }
                    : { background: '#111', color: '#bbb', border: '1px solid #1a1a1a' }),
                }}
              >
                {msg.content.replace(/\*\*(.*?)\*\*/g, '$1')}
              </div>
              {msg.role === 'assistant' && onOpenUrl && extractUrls(msg.content).map(url => (
                <button
                  key={url}
                  onClick={() => { onOpenUrl(url); onClose() }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '4px 8px', background: 'transparent',
                    border: '1px solid #1e1e1e', color: '#444',
                    fontSize: '9px', cursor: 'pointer', textAlign: 'left',
                    fontFamily: 'ui-monospace, monospace', letterSpacing: '0.06em',
                    maxWidth: '100%', overflow: 'hidden',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#888' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e1e1e'; e.currentTarget.style.color = '#444' }}
                  title={url}
                >
                  <Globe style={{ width: 8, height: 8, flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {url.replace(/^https?:\/\//, '').slice(0, 32)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-start' }}>
            <div className="w-5 h-5 shrink-0 flex items-center justify-center" style={{ border: '1px solid #222' }}>
              <Bot className="w-2.5 h-2.5" style={{ color: '#555' }} />
            </div>
            <div style={{ background: '#111', border: '1px solid #1a1a1a', padding: '8px 12px', display: 'flex', gap: '4px', alignItems: 'center' }}>
              <span className="ai-dot" style={{ animationDelay: '0s' }} />
              <span className="ai-dot" style={{ animationDelay: '0.15s' }} />
              <span className="ai-dot" style={{ animationDelay: '0.3s' }} />
            </div>
          </div>
        )}

        {searchUsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '9px', color: '#333', letterSpacing: '0.08em' }}>
            <Search className="w-2.5 h-2.5" />
            RECHERCHE WEB
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 p-3" style={{ borderTop: '1px solid #141414' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
            placeholder={listening ? 'Parle maintenant…' : 'Message…'}
            rows={2}
            style={{
              flex: 1,
              background: '#0e0e0e',
              border: `1px solid ${listening ? '#444' : '#1e1e1e'}`,
              color: '#ccc',
              padding: '8px 10px',
              fontSize: '11px',
              lineHeight: '1.5',
              resize: 'none',
              outline: 'none',
              caretColor: '#fff',
              transition: 'border-color 0.2s',
              fontFamily: 'inherit',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#333' }}
            onBlur={e => { if (!listening) e.currentTarget.style.borderColor = '#1e1e1e' }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {/* Mic button */}
            {micSupported && (
              <button
                onClick={toggleMic}
                title={listening ? 'Arrêter le micro' : 'Parler à l\'IA'}
                style={{
                  width: '32px', height: '32px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: listening ? '#fff' : 'transparent',
                  border: `1px solid ${listening ? '#fff' : '#222'}`,
                  color: listening ? '#000' : '#444',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  position: 'relative',
                  flexShrink: 0,
                }}
              >
                {listening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                {listening && (
                  <span style={{
                    position: 'absolute', inset: -3,
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: 0,
                    animation: 'mic-ring 1.2s ease-out infinite',
                  }} />
                )}
              </button>
            )}

            {/* Send button */}
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              style={{
                width: '32px', height: '32px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: input.trim() && !loading ? '#fff' : '#111',
                border: '1px solid #222',
                color: input.trim() && !loading ? '#000' : '#333',
                transition: 'all 0.15s',
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                flexShrink: 0,
              }}
            >
              <Send className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
          <p style={{ fontSize: '9px', color: '#282828', letterSpacing: '0.06em' }}>
            ↵ ENVOYER · ⇧↵ LIGNE
          </p>
          {micSupported && (
            <button
              onClick={handleToggleVoice}
              style={{
                fontSize: '9px',
                color: voiceEnabled ? '#888' : '#282828',
                letterSpacing: '0.06em',
                background: 'none', border: 'none',
                cursor: 'pointer',
                fontFamily: 'ui-monospace, monospace',
                padding: 0,
              }}
            >
              VOIX {voiceEnabled ? 'ON' : 'OFF'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
