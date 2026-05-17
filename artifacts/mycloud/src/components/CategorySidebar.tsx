import { useRef, useState } from 'react'
import { Plus, Layers, Pencil, Check, X, Camera, Trash2 } from 'lucide-react'

export type Category = {
  id: string
  name: string
  avatar?: string
}

type Props = {
  categories: Category[]
  activeId: string | null
  onSelect: (id: string | null) => void
  onAdd: () => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onAvatarChange: (id: string, url: string) => void
}

export default function CategorySidebar({ categories, activeId, onSelect, onAdd, onRename, onDelete, onAvatarChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const avatarTargetId = useRef<string | null>(null)

  const startEdit = (cat: Category) => { setEditingId(cat.id); setEditValue(cat.name) }
  const commitEdit = () => { if (editingId && editValue.trim()) onRename(editingId, editValue.trim()); setEditingId(null) }

  const handleAvatarClick = (id: string) => { avatarTargetId.current = id; avatarInputRef.current?.click() }
  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !avatarTargetId.current) return
    onAvatarChange(avatarTargetId.current, URL.createObjectURL(file))
    e.target.value = ''
  }

  return (
    <aside className="shrink-0 flex flex-col overflow-hidden" style={{ width: '192px', background: '#080808', borderRight: '1px solid #141414' }}>
      <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: '1px solid #141414' }}>
        <span style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.18em', color: '#333', fontFamily: 'ui-monospace, monospace' }}>
          ESPACES
        </span>
        <button
          onClick={onAdd}
          style={{ width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #1e1e1e', color: '#444', transition: 'all 0.15s' }}
          className="hover:border-neutral-600 hover:text-white"
          title="Nouvel espace"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />

      <div className="flex-1 overflow-y-auto py-2">
        {/* All */}
        <button
          onClick={() => onSelect(null)}
          className="sidebar-item w-full"
          data-active={activeId === null}
        >
          <div className="sidebar-item-icon">
            <Layers className="w-3 h-3" />
          </div>
          <span className="sidebar-item-label">Tout</span>
        </button>

        {categories.length > 0 && (
          <div className="mx-3 my-2" style={{ height: '1px', background: '#141414' }} />
        )}

        {categories.map((cat) => (
          <div
            key={cat.id}
            className="sidebar-item group"
            data-active={activeId === cat.id}
            onClick={() => editingId !== cat.id && onSelect(cat.id)}
          >
            <div
              className="sidebar-avatar shrink-0"
              onClick={(e) => { e.stopPropagation(); handleAvatarClick(cat.id) }}
              title="Changer la photo"
            >
              {cat.avatar ? (
                <img src={cat.avatar} alt={cat.name} className="w-full h-full object-cover" style={{ filter: 'grayscale(100%)' }} />
              ) : (
                <Camera className="w-2.5 h-2.5" style={{ color: '#333' }} />
              )}
            </div>

            {editingId === cat.id ? (
              <div className="flex items-center gap-1 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                <input
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingId(null) }}
                  className="flex-1 min-w-0 text-xs px-1.5 py-0.5 focus:outline-none"
                  style={{ background: '#141414', border: '1px solid #333', color: '#fff' }}
                />
                <button onClick={commitEdit} className="p-0.5" style={{ color: '#555' }}><Check className="w-3 h-3" /></button>
                <button onClick={() => setEditingId(null)} className="p-0.5" style={{ color: '#333' }}><X className="w-3 h-3" /></button>
              </div>
            ) : (
              <>
                <span className="sidebar-item-label flex-1 truncate">{cat.name}</span>
                <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); startEdit(cat) }}
                    className="p-0.5 transition-colors"
                    style={{ color: '#333' }}
                    onMouseOver={e => (e.currentTarget.style.color = '#888')}
                    onMouseOut={e => (e.currentTarget.style.color = '#333')}
                  >
                    <Pencil className="w-2.5 h-2.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(cat.id) }}
                    className="p-0.5 transition-colors"
                    style={{ color: '#333' }}
                    onMouseOver={e => (e.currentTarget.style.color = '#888')}
                    onMouseOut={e => (e.currentTarget.style.color = '#333')}
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </aside>
  )
}
