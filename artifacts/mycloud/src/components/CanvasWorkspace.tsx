import { useCallback, useEffect, useRef, useState } from 'react'
import { Rnd } from 'react-rnd'
import {
  FileText, Image as ImageIcon, Music, Film, File,
  StickyNote, Trash2, Upload, Sparkles, Settings,
} from 'lucide-react'
import CategorySidebar, { type Category, type Folder } from './CategorySidebar'
import AIPanel from './AIPanel'
import SettingsPanel from './SettingsPanel'
import { useUserProfile } from '../hooks/useUserProfile'

export type CanvasItem = {
  id: string
  type: 'file' | 'note'
  title: string
  content?: string
  fileUrl?: string
  mimeType?: string
  x: number
  y: number
  width: number
  height: number
  categoryId?: string | null
  folderId?: string | null
}

const STORAGE_KEY   = 'mycloud-canvas-v1'
const CATEGORIES_KEY = 'mycloud-categories-v1'
const FOLDERS_KEY    = 'mycloud-folders-v1'

function iconForMime(mime?: string) {
  if (!mime) return File
  if (mime.startsWith('image/')) return ImageIcon
  if (mime.startsWith('audio/')) return Music
  if (mime.startsWith('video/')) return Film
  if (mime.includes('pdf') || mime.includes('text')) return FileText
  return File
}

export default function CanvasWorkspace() {
  const [items, setItems]             = useState<CanvasItem[]>([])
  const [categories, setCategories]   = useState<Category[]>([])
  const [folders, setFolders]         = useState<Folder[]>([])
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [activeFolderId, setActiveFolderId]       = useState<string | null>(null)
  const [dragOver, setDragOver]       = useState(false)
  const [aiOpen, setAiOpen]           = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const loaded = useRef(false)
  const { profile, updateProfile } = useUserProfile()

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);    if (raw) setItems(JSON.parse(raw))
      const rawCats = localStorage.getItem(CATEGORIES_KEY); if (rawCats) setCategories(JSON.parse(rawCats))
      const rawFols = localStorage.getItem(FOLDERS_KEY);    if (rawFols) setFolders(JSON.parse(rawFols))
    } catch { /* ignore */ }
    loaded.current = true
  }, [])

  useEffect(() => { if (loaded.current) localStorage.setItem(STORAGE_KEY, JSON.stringify(items)) }, [items])
  useEffect(() => { if (loaded.current) localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories)) }, [categories])
  useEffect(() => { if (loaded.current) localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders)) }, [folders])

  const handleCategorySelect = (id: string | null) => {
    setActiveCategoryId(id)
    setActiveFolderId(null)
  }

  const activeCategory = categories.find(c => c.id === activeCategoryId) ?? null
  const activeFolder   = folders.find(f => f.id === activeFolderId) ?? null

  const visibleItems = items.filter(it => {
    if (activeCategoryId && it.categoryId !== activeCategoryId) return false
    if (activeFolderId  && it.folderId   !== activeFolderId)   return false
    return true
  })

  const addNote = () => {
    setItems(prev => [...prev, {
      id: crypto.randomUUID(), type: 'note', title: 'Note', content: '',
      x: 80 + prev.length * 24, y: 80 + prev.length * 24,
      width: 240, height: 180,
      categoryId: activeCategoryId, folderId: activeFolderId,
    }])
  }

  const addFiles = useCallback((files: FileList | File[]) => {
    const list = Array.from(files)
    setItems(prev => {
      const next = [...prev]
      list.forEach((file, i) => {
        next.push({
          id: crypto.randomUUID(), type: 'file', title: file.name,
          fileUrl: URL.createObjectURL(file), mimeType: file.type,
          x: 60 + ((prev.length + i) % 4) * 44,
          y: 60 + ((prev.length + i) % 3) * 54,
          width: file.type.startsWith('image/') ? 260 : 210,
          height: file.type.startsWith('image/') ? 210 : 130,
          categoryId: activeCategoryId, folderId: activeFolderId,
        })
      })
      return next
    })
  }, [activeCategoryId, activeFolderId])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
  }

  const updateItem = (id: string, patch: Partial<CanvasItem>) =>
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it))

  const removeItem = (id: string) => setItems(prev => {
    const item = prev.find(i => i.id === id)
    if (item?.fileUrl?.startsWith('blob:')) URL.revokeObjectURL(item.fileUrl)
    return prev.filter(i => i.id !== id)
  })

  const addCategory = () => {
    const c: Category = { id: crypto.randomUUID(), name: `Espace ${categories.length + 1}` }
    setCategories(prev => [...prev, c])
    handleCategorySelect(c.id)
  }

  const addFolder = () => {
    if (!activeCategoryId) return
    const f: Folder = { id: crypto.randomUUID(), name: `Dossier ${folders.filter(f => f.categoryId === activeCategoryId).length + 1}`, categoryId: activeCategoryId }
    setFolders(prev => [...prev, f])
    setActiveFolderId(f.id)
  }

  const breadcrumb = [
    activeCategory?.name,
    activeFolder?.name,
  ].filter(Boolean).join(' / ')

  const displayName = profile.pseudo || profile.prenom || null

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#060606', position: 'relative' }}>
      {/* Dot grid */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'radial-gradient(circle, #181818 1px, transparent 1px)',
        backgroundSize: '30px 30px',
      }} />

      {/* Header */}
      <header style={{
        position: 'relative', zIndex: 40, flexShrink: 0,
        height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px',
        background: 'rgba(6,6,6,0.96)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid #111',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontFamily: 'ui-monospace, monospace', letterSpacing: '0.24em', fontSize: '12px', fontWeight: 700, color: '#fff' }}>
            MYCLOUD
          </span>
          {breadcrumb && (
            <span style={{
              fontSize: '10px', letterSpacing: '0.08em', color: '#2a2a2a',
              fontFamily: 'ui-monospace, monospace',
            }}>
              / {breadcrumb.toUpperCase()}
            </span>
          )}
          {!breadcrumb && (
            <span style={{
              fontSize: '9px', letterSpacing: '0.14em', color: '#1e1e1e',
              border: '1px solid #161616', padding: '2px 8px',
              fontFamily: 'ui-monospace, monospace',
            }}>
              LOCAL
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {displayName && (
            <span style={{ fontSize: '10px', color: '#2e2e2e', letterSpacing: '0.06em', marginRight: '8px', fontFamily: 'ui-monospace, monospace' }}>
              {displayName.toUpperCase()}
            </span>
          )}

          <button type="button" onClick={() => fileInputRef.current?.click()} className="header-btn-primary">
            <Upload style={{ width: '12px', height: '12px' }} />
            <span>Fichier</span>
          </button>

          <button type="button" onClick={addNote} className="header-btn">
            <StickyNote style={{ width: '12px', height: '12px' }} />
            <span>Note</span>
          </button>

          <div style={{ width: '1px', height: '16px', background: '#161616', margin: '0 4px' }} />

          <button
            type="button"
            onClick={() => { setAiOpen(o => !o); setSettingsOpen(false) }}
            className={`header-btn-icon${aiOpen ? ' active' : ''}`}
            title="Assistant IA"
          >
            <Sparkles style={{ width: '13px', height: '13px' }} />
          </button>

          <button
            type="button"
            onClick={() => { setSettingsOpen(o => !o); setAiOpen(false) }}
            className={`header-btn-icon${settingsOpen ? ' active' : ''}`}
            title="Paramètres"
          >
            <Settings style={{ width: '13px', height: '13px' }} />
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative', zIndex: 10 }}>
        <CategorySidebar
          categories={categories}
          folders={folders}
          activeId={activeCategoryId}
          activeFolderId={activeFolderId}
          onSelect={handleCategorySelect}
          onFolderSelect={setActiveFolderId}
          onAdd={addCategory}
          onAddFolder={addFolder}
          onRename={(id, name) => setCategories(prev => prev.map(c => c.id === id ? { ...c, name } : c))}
          onRenameFolder={(id, name) => setFolders(prev => prev.map(f => f.id === id ? { ...f, name } : f))}
          onDelete={(id) => { setCategories(prev => prev.filter(c => c.id !== id)); if (activeCategoryId === id) handleCategorySelect(null) }}
          onDeleteFolder={(id) => { setFolders(prev => prev.filter(f => f.id !== id)); if (activeFolderId === id) setActiveFolderId(null) }}
          onAvatarChange={(id, url) => setCategories(prev => prev.map(c => c.id === id ? { ...c, avatar: url } : c))}
        />

        {/* Canvas */}
        <div
          style={{
            flex: 1, position: 'relative', overflow: 'hidden',
            outline: dragOver ? '2px solid #ffffff15' : 'none',
            outlineOffset: '-3px',
          }}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={e => e.target.files && addFiles(e.target.files)} />

          {visibleItems.map(item => {
            const Icon = item.type === 'note' ? StickyNote : iconForMime(item.mimeType)
            return (
              <Rnd
                key={item.id}
                size={{ width: item.width, height: item.height }}
                position={{ x: item.x, y: item.y }}
                minWidth={150} minHeight={100}
                bounds="parent"
                onDragStop={(_e, d) => updateItem(item.id, { x: d.x, y: d.y })}
                onResizeStop={(_e, _dir, ref, _delta, pos) =>
                  updateItem(item.id, { width: ref.offsetWidth, height: ref.offsetHeight, x: pos.x, y: pos.y })
                }
                style={{ zIndex: 10 }}
              >
                <div className="canvas-card" style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
                  <div className="canvas-card-header" style={{ cursor: 'move' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                      <Icon style={{ width: '11px', height: '11px', flexShrink: 0, color: '#444' }} />
                      <span style={{ fontSize: '11px', color: '#888', fontWeight: 500, letterSpacing: '0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.title}
                      </span>
                    </div>
                    <button type="button" onClick={() => removeItem(item.id)} className="canvas-card-delete" aria-label="Supprimer">
                      <Trash2 style={{ width: '11px', height: '11px' }} />
                    </button>
                  </div>

                  <div style={{ flex: 1, padding: '8px', overflow: 'hidden', minHeight: 0 }}>
                    {item.type === 'note' ? (
                      <textarea
                        value={item.content ?? ''}
                        onChange={e => updateItem(item.id, { content: e.target.value })}
                        placeholder="Écris ici…"
                        style={{ width: '100%', height: '100%', background: 'transparent', color: '#666', fontSize: '11px', resize: 'none', outline: 'none', caretColor: '#fff', lineHeight: '1.65', border: 'none' }}
                      />
                    ) : item.mimeType?.startsWith('image/') && item.fileUrl ? (
                      <img src={item.fileUrl} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(100%) contrast(1.05)' }} />
                    ) : item.mimeType?.startsWith('audio/') && item.fileUrl ? (
                      <audio controls src={item.fileUrl} style={{ width: '100%', marginTop: '8px', filter: 'invert(1)' }} />
                    ) : item.mimeType?.startsWith('video/') && item.fileUrl ? (
                      <video src={item.fileUrl} controls style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'grayscale(100%)' }} />
                    ) : (
                      <p style={{ fontSize: '10px', color: '#333' }}>{item.mimeType || 'fichier'}</p>
                    )}
                  </div>
                </div>
              </Rnd>
            )
          })}
        </div>
      </div>

      <AIPanel open={aiOpen} onClose={() => setAiOpen(false)} activeCategory={activeCategory} items={items} profile={profile} />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} profile={profile} onSave={updateProfile} />
    </div>
  )
}
