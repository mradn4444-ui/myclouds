import { useCallback, useEffect, useRef, useState } from 'react'
import { Rnd } from 'react-rnd'
import {
  FileText, Image as ImageIcon, Music, Film, File,
  StickyNote, Trash2, Upload, Sparkles, Settings,
} from 'lucide-react'
import CategorySidebar, { type Category } from './CategorySidebar'
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
}

const STORAGE_KEY = 'mycloud-canvas-v1'
const CATEGORIES_KEY = 'mycloud-categories-v1'

function iconForMime(mime?: string) {
  if (!mime) return File
  if (mime.startsWith('image/')) return ImageIcon
  if (mime.startsWith('audio/')) return Music
  if (mime.startsWith('video/')) return Film
  if (mime.includes('pdf') || mime.includes('text')) return FileText
  return File
}

export default function CanvasWorkspace() {
  const [items, setItems] = useState<CanvasItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const loaded = useRef(false)
  const { profile, updateProfile } = useUserProfile()

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setItems(JSON.parse(raw))
      const rawCats = localStorage.getItem(CATEGORIES_KEY)
      if (rawCats) setCategories(JSON.parse(rawCats))
    } catch { /* ignore */ }
    loaded.current = true
  }, [])

  useEffect(() => {
    if (!loaded.current) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  useEffect(() => {
    if (!loaded.current) return
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories))
  }, [categories])

  const activeCategory = categories.find(c => c.id === activeCategoryId) ?? null
  const visibleItems = activeCategoryId
    ? items.filter(it => it.categoryId === activeCategoryId)
    : items

  const addNote = () => {
    setItems(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: 'note',
        title: 'Note',
        content: '',
        x: 80 + prev.length * 24,
        y: 120 + prev.length * 24,
        width: 240,
        height: 180,
        categoryId: activeCategoryId,
      },
    ])
  }

  const addFiles = useCallback((files: FileList | File[]) => {
    const list = Array.from(files)
    setItems(prev => {
      const next = [...prev]
      list.forEach((file, i) => {
        next.push({
          id: crypto.randomUUID(),
          type: 'file',
          title: file.name,
          fileUrl: URL.createObjectURL(file),
          mimeType: file.type,
          x: 60 + ((prev.length + i) % 4) * 44,
          y: 80 + ((prev.length + i) % 3) * 54,
          width: file.type.startsWith('image/') ? 260 : 210,
          height: file.type.startsWith('image/') ? 210 : 130,
          categoryId: activeCategoryId,
        })
      })
      return next
    })
  }, [activeCategoryId])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
  }

  const updateItem = (id: string, patch: Partial<CanvasItem>) =>
    setItems(prev => prev.map(it => (it.id === id ? { ...it, ...patch } : it)))

  const removeItem = (id: string) => {
    setItems(prev => {
      const item = prev.find(i => i.id === id)
      if (item?.fileUrl?.startsWith('blob:')) URL.revokeObjectURL(item.fileUrl)
      return prev.filter(i => i.id !== id)
    })
  }

  const addCategory = () => {
    const newCat: Category = { id: crypto.randomUUID(), name: `Catégorie ${categories.length + 1}` }
    setCategories(prev => [...prev, newCat])
    setActiveCategoryId(newCat.id)
  }

  const displayName = profile.pseudo || profile.prenom || null

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#080808' }}>
      {/* Dot grid */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle, #2a2a2a 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }} />

      {/* Header */}
      <header className="relative shrink-0 z-40 border-b" style={{ borderColor: '#1a1a1a', background: 'rgba(8,8,8,0.95)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center justify-between px-5 h-13" style={{ height: '52px' }}>
          <div className="flex items-center gap-3">
            <span style={{ fontFamily: 'ui-monospace, monospace', letterSpacing: '0.22em', fontSize: '13px', fontWeight: 700, color: '#fff' }}>
              MYCLOUD
            </span>
            <span style={{
              fontSize: '9px', letterSpacing: '0.12em', color: '#3a3a3a',
              border: '1px solid #1e1e1e', padding: '2px 8px', fontFamily: 'ui-monospace, monospace',
            }}>
              {activeCategory ? activeCategory.name.toUpperCase() : 'LOCAL'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {displayName && (
              <span style={{ fontSize: '10px', color: '#3a3a3a', letterSpacing: '0.06em', marginRight: '6px' }}>
                {displayName}
              </span>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="header-btn-primary"
            >
              <Upload className="w-3 h-3" />
              <span>Fichier</span>
            </button>

            <button type="button" onClick={addNote} className="header-btn">
              <StickyNote className="w-3 h-3" />
              <span>Note</span>
            </button>

            <div className="w-px h-4 mx-1" style={{ background: '#1e1e1e' }} />

            <button
              type="button"
              onClick={() => { setAiOpen(o => !o); setSettingsOpen(false) }}
              className={`header-btn-icon ${aiOpen ? 'active' : ''}`}
              title="Assistant IA"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => { setSettingsOpen(o => !o); setAiOpen(false) }}
              className={`header-btn-icon ${settingsOpen ? 'active' : ''}`}
              title="Paramètres"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative z-10">
        <CategorySidebar
          categories={categories}
          activeId={activeCategoryId}
          onSelect={setActiveCategoryId}
          onAdd={addCategory}
          onRename={(id, name) => setCategories(prev => prev.map(c => c.id === id ? { ...c, name } : c))}
          onDelete={(id) => { setCategories(prev => prev.filter(c => c.id !== id)); if (activeCategoryId === id) setActiveCategoryId(null) }}
          onAvatarChange={(id, url) => setCategories(prev => prev.map(c => c.id === id ? { ...c, avatar: url } : c))}
        />

        <div
          className="flex-1 relative overflow-hidden"
          style={{ outline: dragOver ? '2px solid #ffffff22' : 'none', outlineOffset: '-2px' }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />

          {visibleItems.map((item) => {
            const Icon = item.type === 'note' ? StickyNote : iconForMime(item.mimeType)
            return (
              <Rnd
                key={item.id}
                size={{ width: item.width, height: item.height }}
                position={{ x: item.x, y: item.y }}
                minWidth={150}
                minHeight={100}
                bounds="parent"
                onDragStop={(_e, d) => updateItem(item.id, { x: d.x, y: d.y })}
                onResizeStop={(_e, _dir, ref, _delta, pos) =>
                  updateItem(item.id, { width: ref.offsetWidth, height: ref.offsetHeight, x: pos.x, y: pos.y })
                }
                className="!z-10"
              >
                <div className="canvas-card h-full w-full flex flex-col">
                  <div className="canvas-card-header cursor-move">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Icon className="w-3 h-3 shrink-0" style={{ color: '#555' }} />
                      <span className="text-[11px] truncate font-medium" style={{ color: '#ccc', letterSpacing: '0.02em' }}>
                        {item.title}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="canvas-card-delete"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-hidden min-h-0" style={{ padding: '8px' }}>
                    {item.type === 'note' ? (
                      <textarea
                        value={item.content ?? ''}
                        onChange={(e) => updateItem(item.id, { content: e.target.value })}
                        placeholder="Écris ici…"
                        className="w-full h-full bg-transparent text-xs resize-none focus:outline-none"
                        style={{ color: '#aaa', caretColor: '#fff', lineHeight: '1.6' }}
                      />
                    ) : item.mimeType?.startsWith('image/') && item.fileUrl ? (
                      <img src={item.fileUrl} alt={item.title} className="w-full h-full object-cover" style={{ filter: 'grayscale(100%) contrast(1.05)' }} />
                    ) : item.mimeType?.startsWith('audio/') && item.fileUrl ? (
                      <audio controls src={item.fileUrl} className="w-full mt-2" style={{ filter: 'invert(1)' }} />
                    ) : item.mimeType?.startsWith('video/') && item.fileUrl ? (
                      <video src={item.fileUrl} controls className="w-full h-full object-contain" style={{ filter: 'grayscale(100%)' }} />
                    ) : (
                      <p className="text-[10px]" style={{ color: '#444' }}>{item.mimeType || 'fichier'}</p>
                    )}
                  </div>
                </div>
              </Rnd>
            )
          })}
        </div>
      </div>

      <AIPanel
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        activeCategory={activeCategory}
        items={items}
        profile={profile}
      />

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        profile={profile}
        onSave={updateProfile}
      />
    </div>
  )
}
