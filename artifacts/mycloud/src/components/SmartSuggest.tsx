import { useEffect, useState } from 'react'
import { Sparkles, X, FolderPlus, FileText, List, LayoutGrid, Loader2 } from 'lucide-react'
import type { CanvasItem } from './CanvasWorkspace'
import type { Category, Folder } from './CategorySidebar'

interface Props {
  newFiles: CanvasItem[]
  allItems: CanvasItem[]
  categories: Category[]
  onDismiss: () => void
  onApply: (action: OrganizeAction, result: OrganizeResult) => void
}

export type OrganizeAction = 'organize' | 'summarize' | 'folders' | 'tags'

export interface OrganizeResult {
  action: OrganizeAction
  summary?: string
  folders?: string[]
  categorySuggestion?: string
  message: string
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

const ACTIONS = [
  { id: 'organize' as const, icon: LayoutGrid, label: 'Organiser', desc: 'Trier par type' },
  { id: 'summarize' as const, icon: FileText,   label: 'Résumer',   desc: 'Résumé rapide' },
  { id: 'folders' as const,  icon: FolderPlus,  label: 'Dossiers',  desc: 'Créer des dossiers' },
  { id: 'tags' as const,     icon: List,         label: 'Structurer', desc: 'Ajouter structure' },
]

export default function SmartSuggest({ newFiles, allItems, categories, onDismiss, onApply }: Props) {
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeAction, setActiveAction] = useState<OrganizeAction | null>(null)
  const [result, setResult] = useState<OrganizeResult | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 400)
    return () => clearTimeout(t)
  }, [])

  const handleAction = async (action: OrganizeAction) => {
    if (loading) return
    setActiveAction(action)
    setLoading(true)
    setResult(null)

    const fileNames = newFiles.map(f => f.title).join(', ')
    const existingCats = categories.map(c => c.name).join(', ')

    const prompt = action === 'organize'
      ? `J'ai ajouté ces fichiers: ${fileNames}. Propose une organisation courte par type (image, doc, audio...). Réponds avec des suggestions concises, pas plus de 3-4 lignes.`
      : action === 'summarize'
      ? `J'ai ajouté ces fichiers: ${fileNames}. Donne un résumé en 2-3 lignes de ce que contient cet ensemble.`
      : action === 'folders'
      ? `J'ai ajouté ces fichiers: ${fileNames}. Propose 2-3 noms de dossiers logiques pour les organiser. Format: juste les noms, séparés par des virgules.`
      : `J'ai ajouté ces fichiers: ${fileNames}${existingCats ? ` dans un espace qui contient déjà: ${existingCats}` : ''}. Propose une structure en 2-3 lignes.`

    try {
      const res = await fetch(`${BASE}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          mode: 'help',
        }),
      })
      const data = await res.json() as { reply: string }
      const r: OrganizeResult = {
        action,
        message: data.reply,
        folders: action === 'folders'
          ? data.reply.split(/[,\n]/).map(s => s.trim()).filter(Boolean).slice(0, 4)
          : undefined,
      }
      setResult(r)
    } catch {
      setResult({ action, message: "Impossible de contacter l'IA pour le moment." })
    } finally {
      setLoading(false)
    }
  }

  const handleApply = () => {
    if (!result) return
    onApply(activeAction!, result)
    handleDismiss()
  }

  const handleDismiss = () => {
    setVisible(false)
    setTimeout(onDismiss, 300)
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: `translateX(-50%) translateY(${visible ? '0' : '120px'})`,
        opacity: visible ? 1 : 0,
        transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease',
        zIndex: 200,
        width: 'min(480px, 90vw)',
      }}
    >
      <div style={{
        background: '#0c0c0c',
        border: '1px solid #222',
        boxShadow: '0 24px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid #141414',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: 20, height: 20,
              border: '1px solid #333',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sparkles style={{ width: 10, height: 10, color: '#fff' }} />
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#ccc', fontWeight: 600, letterSpacing: '0.02em' }}>
                {newFiles.length === 1
                  ? `"${newFiles[0].title}" ajouté`
                  : `${newFiles.length} fichiers ajoutés`}
              </span>
              <span style={{ fontSize: '9px', color: '#333', display: 'block', letterSpacing: '0.08em', fontFamily: 'ui-monospace, monospace' }}>
                VEUX-TU QUE J'ORGANISE ÇA ?
              </span>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            style={{
              width: 24, height: 24, background: 'transparent',
              border: '1px solid #1a1a1a', color: '#444', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X style={{ width: 10, height: 10 }} />
          </button>
        </div>

        {/* Action buttons */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
          gap: '1px', background: '#141414',
          borderBottom: result ? '1px solid #141414' : undefined,
        }}>
          {ACTIONS.map(({ id, icon: Icon, label, desc }) => (
            <button
              key={id}
              onClick={() => handleAction(id)}
              disabled={loading}
              style={{
                padding: '12px 8px',
                background: activeAction === id ? '#111' : '#0c0c0c',
                border: 'none',
                borderBottom: activeAction === id ? '1px solid #fff' : '1px solid transparent',
                color: activeAction === id ? '#fff' : '#555',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (activeAction !== id) e.currentTarget.style.background = '#111' }}
              onMouseLeave={e => { if (activeAction !== id) e.currentTarget.style.background = '#0c0c0c' }}
            >
              <Icon style={{ width: 13, height: 13 }} />
              <span style={{ fontSize: '9px', letterSpacing: '0.08em', fontFamily: 'ui-monospace, monospace' }}>{label}</span>
              <span style={{ fontSize: '8px', color: '#333', letterSpacing: '0.04em' }}>{desc}</span>
            </button>
          ))}
        </div>

        {/* Result area */}
        {(loading || result) && (
          <div style={{ padding: '14px 16px' }}>
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Loader2 style={{ width: 12, height: 12, color: '#444', animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '10px', color: '#444', letterSpacing: '0.06em', fontFamily: 'ui-monospace, monospace' }}>
                  ANALYSE EN COURS…
                </span>
              </div>
            )}

            {result && !loading && (
              <>
                <p style={{
                  fontSize: '11px', color: '#888', lineHeight: '1.65',
                  whiteSpace: 'pre-wrap', marginBottom: '12px',
                }}>
                  {result.message}
                </p>

                {result.folders && result.folders.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                    {result.folders.map(f => (
                      <span key={f} style={{
                        fontSize: '9px', color: '#666',
                        border: '1px solid #222', padding: '3px 8px',
                        fontFamily: 'ui-monospace, monospace', letterSpacing: '0.06em',
                      }}>
                        {f}
                      </span>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={handleDismiss}
                    style={{
                      padding: '6px 14px',
                      background: 'transparent', border: '1px solid #1a1a1a',
                      color: '#444', fontSize: '9px',
                      fontFamily: 'ui-monospace, monospace', letterSpacing: '0.08em',
                      cursor: 'pointer',
                    }}
                  >
                    IGNORER
                  </button>
                  <button
                    onClick={handleApply}
                    style={{
                      padding: '6px 14px',
                      background: '#fff', border: 'none',
                      color: '#000', fontSize: '9px',
                      fontFamily: 'ui-monospace, monospace', letterSpacing: '0.08em',
                      fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    APPLIQUER
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
