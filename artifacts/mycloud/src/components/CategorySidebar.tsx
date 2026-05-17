import { useRef, useState } from 'react'
import { Plus, Layers, Pencil, Check, X, Camera, Trash2, Folder as FolderIcon, ChevronLeft } from 'lucide-react'

export type Category = {
  id: string
  name: string
  avatar?: string
}

export type Folder = {
  id: string
  name: string
  categoryId: string
}

type Props = {
  categories: Category[]
  folders: Folder[]
  activeId: string | null
  activeFolderId: string | null
  onSelect: (id: string | null) => void
  onFolderSelect: (id: string | null) => void
  onAdd: () => void
  onAddFolder: () => void
  onRename: (id: string, name: string) => void
  onRenameFolder: (id: string, name: string) => void
  onDelete: (id: string) => void
  onDeleteFolder: (id: string) => void
  onAvatarChange: (id: string, url: string) => void
}

function EditableRow({
  label,
  onRename,
  onDelete,
  active,
  onClick,
  icon,
}: {
  label: string
  onRename: (name: string) => void
  onDelete: () => void
  active: boolean
  onClick: () => void
  icon: React.ReactNode
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(label)

  const commit = () => {
    if (val.trim()) onRename(val.trim())
    setEditing(false)
  }

  return (
    <div
      className="sidebar-item group"
      data-active={active}
      onClick={() => !editing && onClick()}
      style={{ cursor: 'pointer' }}
    >
      <div className="sidebar-item-icon">{icon}</div>
      {editing ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: 0 }} onClick={e => e.stopPropagation()}>
          <input
            autoFocus
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
            style={{
              flex: 1, minWidth: 0,
              background: '#141414', border: '1px solid #333',
              color: '#fff', fontSize: '11px',
              padding: '2px 6px', outline: 'none',
            }}
          />
          <button onClick={commit} style={{ padding: '2px', color: '#444', background: 'none', border: 'none', cursor: 'pointer' }}><Check style={{ width: '11px', height: '11px' }} /></button>
          <button onClick={() => setEditing(false)} style={{ padding: '2px', color: '#2e2e2e', background: 'none', border: 'none', cursor: 'pointer' }}><X style={{ width: '11px', height: '11px' }} /></button>
        </div>
      ) : (
        <>
          <span className="sidebar-item-label" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
          <div className="group-action" style={{ display: 'none', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
            <button
              onClick={e => { e.stopPropagation(); setVal(label); setEditing(true) }}
              style={{ padding: '2px', color: '#2a2a2a', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.1s' }}
              onMouseOver={e => { e.currentTarget.style.color = '#777' }}
              onMouseOut={e => { e.currentTarget.style.color = '#2a2a2a' }}
            >
              <Pencil style={{ width: '10px', height: '10px' }} />
            </button>
            <button
              onClick={e => { e.stopPropagation(); onDelete() }}
              style={{ padding: '2px', color: '#2a2a2a', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.1s' }}
              onMouseOver={e => { e.currentTarget.style.color = '#777' }}
              onMouseOut={e => { e.currentTarget.style.color = '#2a2a2a' }}
            >
              <Trash2 style={{ width: '10px', height: '10px' }} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default function CategorySidebar({
  categories, folders, activeId, activeFolderId,
  onSelect, onFolderSelect, onAdd, onAddFolder,
  onRename, onRenameFolder, onDelete, onDeleteFolder, onAvatarChange,
}: Props) {
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const avatarTargetId = useRef<string | null>(null)

  const handleAvatarClick = (id: string) => { avatarTargetId.current = id; avatarInputRef.current?.click() }
  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !avatarTargetId.current) return
    onAvatarChange(avatarTargetId.current, URL.createObjectURL(file))
    e.target.value = ''
  }

  const activeFolders = activeId ? folders.filter(f => f.categoryId === activeId) : []
  const activeCategory = categories.find(c => c.id === activeId)

  return (
    <aside style={{
      width: '192px', flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      background: '#070707', borderRight: '1px solid #111',
    }}>
      <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarFile} />

      {/* ESPACES header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 12px 10px',
        borderBottom: '1px solid #111',
      }}>
        <span style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.18em', color: '#2a2a2a', fontFamily: 'ui-monospace, monospace' }}>
          ESPACES
        </span>
        <button
          onClick={onAdd}
          style={{
            width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'none', border: '1px solid #1a1a1a', color: '#333', cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseOver={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#aaa' }}
          onMouseOut={e => { e.currentTarget.style.borderColor = '#1a1a1a'; e.currentTarget.style.color = '#333' }}
          title="Nouvel espace"
        >
          <Plus style={{ width: '11px', height: '11px' }} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
        {/* ALL */}
        <button
          onClick={() => { onSelect(null); onFolderSelect(null) }}
          className="sidebar-item"
          data-active={activeId === null}
          style={{ width: '100%' }}
        >
          <div className="sidebar-item-icon"><Layers style={{ width: '11px', height: '11px' }} /></div>
          <span className="sidebar-item-label">Tout</span>
        </button>

        {/* Categories */}
        {categories.map(cat => (
          <div
            key={cat.id}
            className="sidebar-item group"
            data-active={activeId === cat.id}
            onClick={() => { onSelect(cat.id); onFolderSelect(null) }}
            style={{ cursor: 'pointer' }}
          >
            <div
              className="sidebar-avatar"
              onClick={e => { e.stopPropagation(); handleAvatarClick(cat.id) }}
              title="Photo"
            >
              {cat.avatar
                ? <img src={cat.avatar} alt={cat.name} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(100%)' }} />
                : <Camera style={{ width: '10px', height: '10px', color: '#2a2a2a' }} />
              }
            </div>
            <span className="sidebar-item-label" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</span>
            <div className="group-action" style={{ display: 'none', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
              <button
                onClick={e => { e.stopPropagation(); onDelete(cat.id) }}
                style={{ padding: '2px', color: '#2a2a2a', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.1s' }}
                onMouseOver={e => { e.currentTarget.style.color = '#777' }}
                onMouseOut={e => { e.currentTarget.style.color = '#2a2a2a' }}
              >
                <Trash2 style={{ width: '10px', height: '10px' }} />
              </button>
            </div>
          </div>
        ))}

        {/* FOLDERS section — only when a category is active */}
        {activeId && (
          <>
            <div style={{ margin: '10px 12px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.18em', color: '#1e1e1e', fontFamily: 'ui-monospace, monospace' }}>
                DOSSIERS
              </span>
              <button
                onClick={onAddFolder}
                style={{
                  width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'none', border: '1px solid #181818', color: '#282828', cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseOver={e => { e.currentTarget.style.borderColor = '#2e2e2e'; e.currentTarget.style.color = '#777' }}
                onMouseOut={e => { e.currentTarget.style.borderColor = '#181818'; e.currentTarget.style.color = '#282828' }}
                title="Nouveau dossier"
              >
                <Plus style={{ width: '10px', height: '10px' }} />
              </button>
            </div>

            {/* All files in category (no folder) */}
            <button
              onClick={() => onFolderSelect(null)}
              className="sidebar-item"
              data-active={activeId !== null && activeFolderId === null}
              style={{ width: '100%', paddingLeft: '14px' }}
            >
              <div className="sidebar-item-icon"><Layers style={{ width: '10px', height: '10px' }} /></div>
              <span className="sidebar-item-label" style={{ fontSize: '10px' }}>Tous les fichiers</span>
            </button>

            {activeFolders.map(folder => (
              <EditableRow
                key={folder.id}
                label={folder.name}
                active={activeFolderId === folder.id}
                onClick={() => onFolderSelect(folder.id)}
                onRename={name => onRenameFolder(folder.id, name)}
                onDelete={() => onDeleteFolder(folder.id)}
                icon={<FolderIcon style={{ width: '11px', height: '11px' }} />}
              />
            ))}

            {activeFolders.length === 0 && (
              <p style={{ fontSize: '9px', color: '#1c1c1c', padding: '4px 14px 8px', letterSpacing: '0.04em' }}>
                Aucun dossier
              </p>
            )}
          </>
        )}
      </div>

      <style>{`
        .sidebar-item:hover .group-action { display: flex !important; }
        .group-action { display: none; }
      `}</style>
    </aside>
  )
}
