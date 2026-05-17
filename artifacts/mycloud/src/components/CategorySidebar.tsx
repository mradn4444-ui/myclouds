import { useRef, useState } from 'react'
import { Plus, FolderOpen, Pencil, Check, X, Camera, Trash2 } from 'lucide-react'

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

export default function CategorySidebar({
  categories,
  activeId,
  onSelect,
  onAdd,
  onRename,
  onDelete,
  onAvatarChange,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const avatarTargetId = useRef<string | null>(null)

  const startEdit = (cat: Category) => {
    setEditingId(cat.id)
    setEditValue(cat.name)
  }

  const commitEdit = () => {
    if (editingId && editValue.trim()) {
      onRename(editingId, editValue.trim())
    }
    setEditingId(null)
  }

  const handleAvatarClick = (id: string) => {
    avatarTargetId.current = id
    avatarInputRef.current?.click()
  }

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !avatarTargetId.current) return
    const url = URL.createObjectURL(file)
    onAvatarChange(avatarTargetId.current, url)
    e.target.value = ''
  }

  return (
    <aside className="w-[200px] shrink-0 flex flex-col border-r border-neutral-800 bg-neutral-950 h-full overflow-hidden">
      <div className="flex items-center justify-between px-3 py-3 border-b border-neutral-800">
        <span className="text-[10px] font-semibold tracking-widest text-neutral-500 uppercase">Catégories</span>
        <button
          onClick={onAdd}
          className="p-1 rounded text-neutral-500 hover:text-white hover:bg-neutral-800 transition-colors"
          title="Nouvelle catégorie"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarFile}
      />

      <div className="flex-1 overflow-y-auto py-1">
        <button
          onClick={() => onSelect(null)}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
            activeId === null
              ? 'bg-white/5 text-white'
              : 'text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <FolderOpen className="w-3.5 h-3.5 shrink-0" />
          <span className="text-xs font-medium truncate">Tout</span>
        </button>

        {categories.map((cat) => (
          <div
            key={cat.id}
            className={`group relative flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors ${
              activeId === cat.id
                ? 'bg-white/5 text-white'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
            onClick={() => editingId !== cat.id && onSelect(cat.id)}
          >
            <div
              className="relative shrink-0 w-6 h-6 rounded-full overflow-hidden border border-neutral-700 bg-neutral-800 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
              onClick={(e) => { e.stopPropagation(); handleAvatarClick(cat.id) }}
              title="Changer la photo"
            >
              {cat.avatar ? (
                <img src={cat.avatar} alt={cat.name} className="w-full h-full object-cover" />
              ) : (
                <Camera className="w-3 h-3 text-neutral-500" />
              )}
            </div>

            {editingId === cat.id ? (
              <div className="flex items-center gap-1 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                <input
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitEdit()
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  className="flex-1 min-w-0 bg-neutral-800 border border-neutral-600 text-white text-xs px-1.5 py-0.5 rounded focus:outline-none focus:border-white"
                />
                <button onClick={commitEdit} className="p-0.5 text-green-400 hover:text-green-300">
                  <Check className="w-3 h-3" />
                </button>
                <button onClick={() => setEditingId(null)} className="p-0.5 text-neutral-500 hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <>
                <span className="flex-1 text-xs font-medium truncate">{cat.name}</span>
                <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); startEdit(cat) }}
                    className="p-0.5 text-neutral-500 hover:text-white"
                    title="Renommer"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(cat.id) }}
                    className="p-0.5 text-neutral-500 hover:text-red-400"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {categories.length === 0 && (
        <p className="text-[10px] text-neutral-600 text-center px-3 pb-4">
          Crée ta première catégorie avec +
        </p>
      )}
    </aside>
  )
}
