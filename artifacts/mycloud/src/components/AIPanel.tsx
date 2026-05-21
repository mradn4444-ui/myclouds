import { useEffect, useRef, useState } from 'react'
import { X, Send, Bot, Search, Loader2, Sparkles, Mic, MicOff, Volume2, VolumeX, Globe } from 'lucide-react'
import type { Category } from './CategorySidebar'
import type { CanvasItem } from './CanvasWorkspace'
import type { UserProfile } from '../hooks/useUserProfile'
import { useVoice, speak, stopSpeaking } from '../hooks/useVoice'
import { useAuth } from '../hooks/useAuth'
import { getApiUrl, parseJsonResponse } from '../lib/api'
import VisualExplanation from './VisualExplanation'

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

function extractUrls(text: string): string[] {
  const re = /https?:\/\/[^\s"')>]+/g
  return Array.from(new Set(text.match(re) ?? []))
}

function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>
    }
    return <span key={index}>{part}</span>
  })
}

function isVisualContent(block: string): boolean {
  const hasBox = /[┌┐└┘─│├┤┬┴┼]|[\[\]]{2,}/.test(block)
  const hasArrow = /[\-\>←→↑↓]|[\-]{2,}\>|[<\-]{2,}/.test(block)
  const hasTree = /[├└─]|[\s]{2,}[\|├└]/.test(block)
  const hasTable = /\|[\s\S]*?\|/.test(block)
  const hasMultilineFormatting = block.split('\n').length > 3 && (hasBox || hasArrow || hasTree || hasTable)
  return hasMultilineFormatting
}

function renderAssistantContent(content: string) {
  const blocks = content.trim().split(/\n{2,}/).filter(Boolean)
  if (!blocks.length) return null

  return (
    <div className="ai-rich-content">
      {blocks.map((block, blockIndex) => {
        // Check if this is visual content
        if (isVisualContent(block)) {
          return (
            <VisualExplanation
              key={blockIndex}
              content={block}
              title="Visual Structure"
            />
          )
        }

        const lines = block.split('\n').map(line => line.trim()).filter(Boolean)
        const heading = lines.length === 1 ? lines[0].match(/^#{1,3}\s+(.+)$/) : null
        const bulletLines = lines.filter(line => /^[-*]\s+/.test(line))
        const numberedLines = lines.filter(line => /^\d+[.)]\s+/.test(line))
        const tableLines = lines.filter(line => line.includes('|'))

        if (heading) {
          return <h4 key={blockIndex}>{renderInline(heading[1])}</h4>
        }

        if (tableLines.length >= 2 && tableLines.length === lines.length) {
          const rows = tableLines
            .filter(line => !/^[-|\s]+$/.test(line))
            .map(line => line.split('|').map(cell => cell.trim()).filter(Boolean))
          return (
            <div className="ai-table-wrap" key={blockIndex}>
              <table>
                <tbody>
                  {rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex}>{renderInline(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }

        if (bulletLines.length === lines.length) {
          return (
            <ul key={blockIndex}>
              {bulletLines.map((line, lineIndex) => (
                <li key={lineIndex}>{renderInline(line.replace(/^[-*]\s+/, ''))}</li>
              ))}
            </ul>
          )
        }

        if (numberedLines.length === lines.length) {
          return (
            <ol key={blockIndex}>
              {numberedLines.map((line, lineIndex) => (
                <li key={lineIndex}>{renderInline(line.replace(/^\d+[.)]\s+/, ''))}</li>
              ))}
            </ol>
          )
        }

        return <p key={blockIndex}>{renderInline(lines.join('\n'))}</p>
      })}
    </div>
  )


const quickActionPrompts = [
  { label: 'Organiser mon idée', prompt: 'Organise cette idée comme un projet structuré avec sections, tâches, résumé et checklist.' },
  { label: 'Générer un document propre', prompt: 'Génère un document organisé, clair, avec sections et points clés.' },
  { label: 'Créer un visuel simple', prompt: 'Propose un petit schéma ou une explication visuelle pour cette idée.' },
  { label: 'Faire un résumé actionnable', prompt: 'Résume cette idée et propose une liste de tâches immédiates.' },
]

function selectChatMode(text: string) {
  if (/organis|structure|plan|projet|tâche|checklist|document/i.test(text)) return 'organize'
  if (/visual|schéma|schema|diagramme|graphe/i.test(text)) return 'structure'
  if (/résum|resume|summary|synthèse|synthese/i.test(text)) return 'help'
  return 'chat'
}

export default function AIPanel({ open, onClose, activeCategory, items, profile, onOpenUrl }: Props) {
  const { token } = useAuth()
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
      const res = await fetch(getApiUrl('/ai/chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: newMessages,
          categoryName: activeCategory?.name,
          categoryItems: items
            .filter(it => !activeCategory || it.categoryId === activeCategory.id)
            .map(it => it.title),
          mode: selectChatMode(text),
          profile,
        }),
      })
      const data = await parseJsonResponse<{ reply?: string; searchUsed?: boolean; error?: string }>(res)
      const reply = data.reply
      if (!res.ok || !reply) {
        throw new Error(data.error ?? 'Erreur IA')
      }
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      setSearchUsed(!!data.searchUsed)
      if (voiceEnabled) {
        setSpeaking(true)
        speak(reply)
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
      className="ai-panel fixed right-0 top-0 h-full flex flex-col z-50"
      style={{ width: '300px', background: '#080808', borderLeft: '1px solid #141414' }}
    >
      {/* Header */}
      <div className="ai-panel-header flex items-center justify-between px-4 py-4 shrink-0" style={{ borderBottom: '1px solid #141414' }}>
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
        <div className="voice-listening" style={{
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
      <div className="ai-thread flex-1 overflow-y-auto px-3 py-4" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.map((msg, i) => (
          <div key={i} className={`ai-message-row ai-message-row-${msg.role}`} style={{ display: 'flex', gap: '8px', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {msg.role === 'assistant' && (
              <div
                className="ai-avatar w-5 h-5 shrink-0 mt-0.5 flex items-center justify-center"
                style={{ border: '1px solid #222', flexShrink: 0, alignSelf: 'flex-start', marginTop: '2px' }}
              >
                <Bot className="w-2.5 h-2.5" style={{ color: '#555' }} />
              </div>
            )}
            <div className="ai-message-stack" style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '220px' }}>
              <div
                className={`ai-bubble ai-bubble-${msg.role}`}
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
                {msg.role === 'assistant' ? renderAssistantContent(msg.content) : msg.content}
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
          <div className="ai-message-row ai-message-row-assistant" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-start' }}>
            <div className="ai-avatar w-5 h-5 shrink-0 flex items-center justify-center" style={{ border: '1px solid #222' }}>
              <Bot className="w-2.5 h-2.5" style={{ color: '#555' }} />
            </div>
            <div className="ai-bubble ai-loading-bubble" style={{ background: '#111', border: '1px solid #1a1a1a', padding: '8px 12px', display: 'flex', gap: '4px', alignItems: 'center' }}>
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
      <div className="ai-composer shrink-0 p-3" style={{ borderTop: '1px solid #141414' }}>
        <div className="ai-quick-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
          {quickActionPrompts.map((action) => (
            <button
              key={action.label}
              type="button"
              className="ai-quick-action"
              onClick={() => sendMessage(action.prompt)}
              disabled={loading}
              style={{
                flex: '1 1 130px',
                minWidth: '120px',
                padding: '8px 10px',
                borderRadius: '14px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)',
                color: '#ccc',
                fontSize: '10px',
                cursor: 'pointer',
                transition: 'transform 0.22s ease, border-color 0.22s ease, background 0.22s ease',
                textAlign: 'center',
              }}
            >
              {action.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
          <textarea
            className="ai-textarea"
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
