import { useState } from 'react'
import { X, Sparkles, CheckCircle2, FileText, ListChecks, FolderPlus, Loader2 } from 'lucide-react'

type OrganizeStep = 'input' | 'analyzing' | 'result'

interface OrganizeResult {
  title: string
  summary: string
  structure: {
    sections: string[]
    tasks: Array<{ title: string; priority: 'high' | 'medium' | 'low' }>
    tags: string[]
  }
  actions: {
    createFolders: string[]
    createDocument: boolean
    createTasks: boolean
  }
}

type Props = {
  open: boolean
  onClose: () => void
  onApply: (result: OrganizeResult) => Promise<void>
  onGenerateDocument?: (title: string, content: string) => Promise<void>
}

export default function SmartOrganizeModal({ open, onClose, onApply, onGenerateDocument }: Props) {
  const [step, setStep] = useState<OrganizeStep>('input')
  const [input, setInput] = useState('')
  const [result, setResult] = useState<OrganizeResult | null>(null)
  const [applying, setApplying] = useState(false)

  const handleAnalyze = async () => {
    if (!input.trim()) return
    setStep('analyzing')
    
    try {
      const res = await fetch('/api/ai/structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('mycloud-auth-token')}` },
        body: JSON.stringify({ content: input, title: input.slice(0, 50) }),
      })
      
      if (!res.ok) throw new Error('Failed to analyze')
      
      const data = await res.json()
      
      const mockResult: OrganizeResult = {
        title: input.slice(0, 50),
        summary: data.structure?.slice(0, 200) || input.slice(0, 200),
        structure: {
          sections: [
            'Overview',
            'Key Points',
            'Implementation Plan',
            'Timeline',
          ],
          tasks: [
            { title: 'Define scope and objectives', priority: 'high' },
            { title: 'Research and planning', priority: 'high' },
            { title: 'Development setup', priority: 'medium' },
            { title: 'Testing and iteration', priority: 'medium' },
            { title: 'Documentation', priority: 'low' },
          ],
          tags: ['project', 'planning', 'development'],
        },
        actions: {
          createFolders: ['Research', 'Development', 'Documentation', 'Assets'],
          createDocument: true,
          createTasks: true,
        },
      }
      
      setResult(mockResult)
      setStep('result')
    } catch (err) {
      console.error(err)
      setStep('input')
    }
  }

  const handleApply = async () => {
    if (!result) return
    setApplying(true)
    try {
      await onApply(result)
      setInput('')
      setResult(null)
      setStep('input')
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setApplying(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="modal-backdrop fixed inset-0 z-[1000]"
      onClick={onClose}
      style={{
        background: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(18px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        className="modal-shell"
        onClick={e => e.stopPropagation()}
        style={{
          background: 'rgba(8, 9, 12, 0.88)',
          border: '1px solid rgba(255, 255, 255, 0.105)',
          borderRadius: '26px',
          padding: '28px',
          maxWidth: '620px',
          width: '100%',
          boxShadow: '0 32px 90px rgba(0, 0, 0, 0.32)',
          backdropFilter: 'blur(24px)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles className="w-5 h-5" style={{ color: '#8be7ff' }} />
            <h2 style={{ margin: 0, color: '#fff', fontSize: '1.2rem', fontWeight: 700 }}>Organiser une idée</h2>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.03)',
              color: '#888',
              cursor: 'pointer',
              borderRadius: '8px',
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        {step === 'input' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.68)', fontSize: '0.95rem', lineHeight: 1.6 }}>
              Décrivez votre idée naturellement. L'IA créera automatiquement une structure de projet, des tâches, des dossiers et un document organisé.
            </p>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Je veux créer une app de productivité avec un tableau de bord futuriste et des notifications intelligentes..."
              style={{
                width: '100%',
                minHeight: '140px',
                padding: '12px 14px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.09)',
                background: 'rgba(255,255,255,0.035)',
                color: '#fff',
                fontSize: '0.95rem',
                lineHeight: 1.6,
                outline: 'none',
                caretColor: '#8be7ff',
                resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={onClose}
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent',
                  color: '#aaa',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleAnalyze}
                disabled={!input.trim()}
                style={{
                  padding: '10px 22px',
                  borderRadius: '8px',
                  border: 'none',
                  background: input.trim() ? '#8be7ff' : '#333',
                  color: input.trim() ? '#000' : '#666',
                  cursor: input.trim() ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                  transition: 'all 0.2s ease',
                }}
              >
                Analyser
              </button>
            </div>
          </div>
        )}

        {step === 'analyzing' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '40px 0' }}>
            <Loader2 className="w-8 h-8" style={{ color: '#8be7ff', animation: 'rotate-slow 2s linear infinite' }} />
            <p style={{ color: 'rgba(255, 255, 255, 0.68)', textAlign: 'center' }}>L'IA analyse votre idée et crée une structure…</p>
          </div>
        )}

        {step === 'result' && result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Title and Summary */}
            <div>
              <p style={{ margin: '0 0 8px 0', color: '#8be7ff', fontSize: '0.82rem', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                Titre proposé
              </p>
              <h3 style={{ margin: '0 0 12px 0', color: '#fff', fontSize: '1.15rem' }}>{result.title}</h3>
              <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.68)', lineHeight: 1.6 }}>{result.summary}</p>
            </div>

            {/* Structure Preview */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px' }}>
              <p style={{ margin: '0 0 12px 0', color: '#8be7ff', fontSize: '0.82rem', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                Structure proposée
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <p style={{ margin: '0 0 8px 0', color: '#ccc', fontSize: '0.85rem', fontWeight: 600 }}>Sections</p>
                  <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {result.structure.sections.map((s, i) => (
                      <li key={i} style={{ color: 'rgba(255,255,255,0.68)', fontSize: '0.9rem' }}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p style={{ margin: '0 0 8px 0', color: '#ccc', fontSize: '0.85rem', fontWeight: 600 }}>Dossiers</p>
                  <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {result.actions.createFolders.map((f, i) => (
                      <li key={i} style={{ color: 'rgba(255,255,255,0.68)', fontSize: '0.9rem' }}>{f}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Tasks Preview */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px' }}>
              <p style={{ margin: '0 0 12px 0', color: '#8be7ff', fontSize: '0.82rem', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                Tâches suggérées
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {result.structure.tasks.slice(0, 3).map((task, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)' }}>
                    <div style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: task.priority === 'high' ? '#ff6b6b' : task.priority === 'medium' ? '#ffd93d' : '#6bcf7f',
                    }} />
                    <span style={{ color: 'rgba(255,255,255,0.76)', fontSize: '0.9rem' }}>{task.title}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px' }}>
              <button
                onClick={() => { setStep('input'); setInput(''); setResult(null) }}
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent',
                  color: '#aaa',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                Recommencer
              </button>
              <button
                onClick={handleApply}
                disabled={applying}
                style={{
                  padding: '10px 22px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#8be7ff',
                  color: '#000',
                  cursor: 'pointer',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  opacity: applying ? 0.7 : 1,
                }}
              >
                {applying ? <Loader2 className="w-4 h-4" style={{ animation: 'rotate-slow 1s linear infinite' }} /> : <CheckCircle2 className="w-4 h-4" />}
                Appliquer
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes rotate-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
