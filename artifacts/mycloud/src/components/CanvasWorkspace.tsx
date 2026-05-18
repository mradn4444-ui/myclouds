import { useCallback, useEffect, useRef, useState } from 'react'
import { Rnd } from 'react-rnd'
import {
  FileText, Image as ImageIcon, Music, Film, File,
  StickyNote, Trash2, Upload, Sparkles, Settings, Eye, Globe, ExternalLink,
} from 'lucide-react'
import CategorySidebar, { type Category, type Folder } from './CategorySidebar'
import AIPanel from './AIPanel'
import SettingsPanel from './SettingsPanel'
import FilePreviewModal from './FilePreviewModal'
import SmartSuggest, { type OrganizeResult } from './SmartSuggest'
import PdfExport from './PdfExport'
import { useUserProfile } from '../hooks/useUserProfile'
import { useAuth } from '../hooks/useAuth'

export type CanvasItem = {
  id: string
  type: 'file' | 'note' | 'browser'
  title: string
  content?: string
  fileUrl?: string
  mimeType?: string
  url?: string
  x: number
  y: number
  width: number
  height: number
  categoryId?: string | null
  folderId?: string | null
}

function toEmbedUrl(raw: string): string {
  try {
    const url = new URL(raw.startsWith('http') ? raw : `https://${raw}`)
    // YouTube
    const ytMatch = url.hostname.match(/youtube\.com|youtu\.be/)
    if (ytMatch) {
      let videoId = url.searchParams.get('v')
      if (!videoId && url.hostname === 'youtu.be') videoId = url.pathname.slice(1)
      if (videoId) return `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`
    }
    return url.toString()
  } catch {
    return `https://${raw}`
  }
}

const STORAGE_KEY    = 'mycloud-canvas-v1'
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

function typeBadge(mime?: string): string {
  if (!mime) return 'FICHIER'
  if (mime.startsWith('image/')) return mime.split('/')[1]?.toUpperCase().slice(0, 4) ?? 'IMG'
  if (mime.startsWith('audio/')) return mime.split('/')[1]?.toUpperCase().slice(0, 4) ?? 'SON'
  if (mime.startsWith('video/')) return mime.split('/')[1]?.toUpperCase().slice(0, 4) ?? 'VID'
  if (mime.includes('pdf')) return 'PDF'
  return mime.split('/').pop()?.toUpperCase().slice(0, 4) ?? 'FILE'
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
  const [previewItem, setPreviewItem] = useState<CanvasItem | null>(null)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [smartFiles, setSmartFiles] = useState<CanvasItem[]>([])
  const [urlDialogOpen, setUrlDialogOpen] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)
  const loaded = useRef(false)
  const { profile, updateProfile } = useUserProfile()
  const { logout } = useAuth()

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

  const addBrowserCard = (rawUrl: string) => {
    if (!rawUrl.trim()) return
    const embedUrl = toEmbedUrl(rawUrl.trim())
    const label = rawUrl.includes('youtube') || rawUrl.includes('youtu.be') ? 'YouTube' : rawUrl.replace(/^https?:\/\//, '').split('/')[0]
    setItems(prev => [...prev, {
      id: crypto.randomUUID(), type: 'browser', title: label,
      url: embedUrl,
      x: 100 + prev.length * 20, y: 80 + prev.length * 14,
      width: 520, height: 340,
      categoryId: activeCategoryId, folderId: activeFolderId,
    }])
    setUrlInput('')
    setUrlDialogOpen(false)
  }

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
    const newItems: CanvasItem[] = []
    setItems(prev => {
      const next = [...prev]
      list.forEach((file, i) => {
        const isImage = file.type.startsWith('image/')
        const isPdf   = file.type.includes('pdf')
        const isAudio = file.type.startsWith('audio/')
        const item: CanvasItem = {
          id: crypto.randomUUID(), type: 'file', title: file.name,
          fileUrl: URL.createObjectURL(file), mimeType: file.type,
          x: 60 + ((prev.length + i) % 4) * 44,
          y: 60 + ((prev.length + i) % 3) * 54,
          width:  isImage ? 260 : isPdf ? 220 : isAudio ? 260 : 210,
          height: isImage ? 210 : isPdf ? 280 : isAudio ? 100 : 130,
          categoryId: activeCategoryId, folderId: activeFolderId,
        }
        next.push(item)
        newItems.push(item)
      })
      return next
    })
    if (list.length >= 2) {
      setTimeout(() => setSmartFiles(newItems), 300)
    }
  }, [activeCategoryId, activeFolderId])

  const handleSmartApply = (_action: string, result: OrganizeResult) => {
    if (result.action === 'folders' && result.folders?.length) {
      result.folders.forEach((name, i) => {
        if (!activeCategoryId) return
        const fId = crypto.randomUUID()
        setFolders(prev => [...prev, { id: fId, name, categoryId: activeCategoryId }])
        if (i === 0) setActiveFolderId(fId)
      })
    }
    if (result.action === 'summarize' || result.action === 'organize' || result.action === 'tags') {
      setItems(prev => [...prev, {
        id: crypto.randomUUID(), type: 'note', title: '✦ Suggestion IA',
        content: result.message,
        x: 80, y: 80, width: 280, height: 200,
        categoryId: activeCategoryId, folderId: activeFolderId,
      }])
    }
  }

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
            <button
              type="button"
              onClick={logout}
              title="Se déconnecter"
              style={{
                fontSize: '10px', color: '#2e2e2e', letterSpacing: '0.06em', marginRight: '8px',
                fontFamily: 'ui-monospace, monospace', background: 'none', border: 'none',
                cursor: 'pointer', padding: 0,
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#666')}
              onMouseLeave={e => (e.currentTarget.style.color = '#2e2e2e')}
            >
              {displayName.toUpperCase()}
            </button>
          )}

          <button type="button" onClick={() => fileInputRef.current?.click()} className="header-btn-primary">
            <Upload style={{ width: '12px', height: '12px' }} />
            <span>Fichier</span>
          </button>

          <button type="button" onClick={addNote} className="header-btn">
            <StickyNote style={{ width: '12px', height: '12px' }} />
            <span>Note</span>
          </button>

          <button
            type="button"
            onClick={() => { setUrlDialogOpen(o => !o); setTimeout(() => urlInputRef.current?.focus(), 80) }}
            className="header-btn"
            title="Ouvrir un site"
          >
            <Globe style={{ width: '12px', height: '12px' }} />
            <span>Web</span>
          </button>

          <PdfExport
            items={items}
            categories={categories}
            folders={folders}
            activeCategory={activeCategory}
            profile={profile}
          />

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
          <input
            ref={fileInputRef} type="file" multiple style={{ display: 'none' }}
            onChange={e => e.target.files && addFiles(e.target.files)}
          />

          {visibleItems.length === 0 && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: '12px', pointerEvents: 'none',
            }}>
              <div style={{
                width: 48, height: 48, border: '1px dashed #1a1a1a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Upload style={{ width: 16, height: 16, color: '#222' }} />
              </div>
              <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '10px', color: '#222', letterSpacing: '0.1em' }}>
                DÉPOSE DES FICHIERS ICI
              </span>
            </div>
          )}

          {visibleItems.map(item => {
            const Icon = item.type === 'note' ? StickyNote : item.type === 'browser' ? Globe : iconForMime(item.mimeType)
            const isImage = item.mimeType?.startsWith('image/')
            const isAudio = item.mimeType?.startsWith('audio/')
            const isVideo = item.mimeType?.startsWith('video/')
            const isPdf   = item.mimeType?.includes('pdf')
            const isHovered = hoveredCard === item.id

            return (
              <Rnd
                key={item.id}
                size={{ width: item.width, height: item.height }}
                position={{ x: item.x, y: item.y }}
                minWidth={150} minHeight={item.type === 'note' ? 100 : 80}
                bounds="parent"
                cancel=".no-drag"
                onDragStop={(_e, d) => updateItem(item.id, { x: d.x, y: d.y })}
                onResizeStop={(_e, _dir, ref, _delta, pos) =>
                  updateItem(item.id, { width: ref.offsetWidth, height: ref.offsetHeight, x: pos.x, y: pos.y })
                }
                style={{ zIndex: isHovered ? 20 : 10 }}
              >
                <div
                  className="canvas-card"
                  style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}
                  onMouseEnter={() => setHoveredCard(item.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  {/* Card header */}
                  <div className="canvas-card-header" style={{ cursor: 'move', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                      <Icon style={{ width: '11px', height: '11px', flexShrink: 0, color: '#444' }} />
                      <span style={{
                        fontSize: '10px', color: '#666', fontWeight: 500,
                        letterSpacing: '0.02em',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {item.title}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                      {item.type === 'file' && item.mimeType && (
                        <span style={{
                          fontSize: '8px', color: '#2a2a2a',
                          border: '1px solid #1c1c1c',
                          padding: '1px 5px',
                          fontFamily: 'ui-monospace, monospace',
                          letterSpacing: '0.06em',
                        }}>
                          {typeBadge(item.mimeType)}
                        </span>
                      )}
                      {item.type === 'file' && (
                        <button
                          type="button"
                          className="no-drag canvas-card-delete"
                          onClick={() => setPreviewItem(item)}
                          title="Aperçu"
                          style={{ color: isHovered ? '#555' : '#222' }}
                        >
                          <Eye style={{ width: '10px', height: '10px' }} />
                        </button>
                      )}
                      <button
                        type="button"
                        className="no-drag canvas-card-delete"
                        onClick={() => removeItem(item.id)}
                        aria-label="Supprimer"
                      >
                        <Trash2 style={{ width: '11px', height: '11px' }} />
                      </button>
                    </div>
                  </div>

                  {/* Card body */}
                  <div
                    className="no-drag"
                    style={{ flex: 1, overflow: 'hidden', minHeight: 0, position: 'relative' }}
                  >
                    {item.type === 'browser' && item.url ? (
                      <div style={{ width: '100%', height: '100%', position: 'relative', background: '#070707' }}>
                        <iframe
                          src={item.url}
                          title={item.title}
                          style={{ width: '100%', height: '100%', border: 'none', display: 'block', filter: 'grayscale(20%)' }}
                          sandbox="allow-scripts allow-same-origin allow-forms allow-presentation allow-popups"
                          referrerPolicy="no-referrer"
                          allowFullScreen
                        />
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            position: 'absolute', bottom: 6, right: 6,
                            background: '#000', border: '1px solid #1c1c1c',
                            padding: '3px 6px',
                            display: 'flex', alignItems: 'center', gap: '4px',
                            textDecoration: 'none',
                          }}
                          title="Ouvrir dans un onglet"
                        >
                          <ExternalLink style={{ width: 9, height: 9, color: '#555' }} />
                        </a>
                      </div>
                    ) : item.type === 'note' ? (
                      <textarea
                        value={item.content ?? ''}
                        onChange={e => updateItem(item.id, { content: e.target.value })}
                        placeholder="Écris ici…"
                        style={{
                          width: '100%', height: '100%',
                          background: 'transparent', color: '#666',
                          fontSize: '11px', resize: 'none', outline: 'none',
                          caretColor: '#fff', lineHeight: '1.65', border: 'none',
                          padding: '8px',
                          boxSizing: 'border-box',
                        }}
                      />
                    ) : isImage && item.fileUrl ? (
                      <div
                        style={{ width: '100%', height: '100%', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                        onClick={() => setPreviewItem(item)}
                      >
                        <img
                          src={item.fileUrl}
                          alt={item.title}
                          style={{
                            width: '100%', height: '100%',
                            objectFit: 'cover',
                            filter: 'grayscale(100%) contrast(1.05)',
                            transition: 'transform 0.3s ease',
                            transform: isHovered ? 'scale(1.03)' : 'scale(1)',
                          }}
                        />
                        {isHovered && (
                          <div style={{
                            position: 'absolute', inset: 0,
                            background: 'rgba(0,0,0,0.4)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Eye style={{ width: 20, height: 20, color: '#fff' }} />
                          </div>
                        )}
                      </div>
                    ) : isAudio && item.fileUrl ? (
                      <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '8px', height: '100%', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Music style={{ width: 14, height: 14, color: '#333' }} />
                          <span style={{ fontSize: '9px', color: '#333', fontFamily: 'ui-monospace, monospace' }}>AUDIO</span>
                        </div>
                        <audio
                          controls
                          src={item.fileUrl}
                          style={{ width: '100%', height: '28px', filter: 'invert(1) hue-rotate(180deg)', opacity: 0.7 }}
                        />
                      </div>
                    ) : isVideo && item.fileUrl ? (
                      <div
                        style={{ width: '100%', height: '100%', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                        onClick={() => setPreviewItem(item)}
                      >
                        <video
                          src={item.fileUrl}
                          style={{
                            width: '100%', height: '100%',
                            objectFit: 'cover',
                            filter: 'grayscale(100%)',
                            pointerEvents: 'none',
                          }}
                        />
                        {isHovered && (
                          <div style={{
                            position: 'absolute', inset: 0,
                            background: 'rgba(0,0,0,0.5)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Film style={{ width: 20, height: 20, color: '#fff' }} />
                          </div>
                        )}
                      </div>
                    ) : isPdf && item.fileUrl ? (
                      <div
                        style={{
                          width: '100%', height: '100%', cursor: 'pointer', position: 'relative',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          gap: '8px',
                        }}
                        onClick={() => setPreviewItem(item)}
                      >
                        <div style={{
                          width: 36, height: 44,
                          border: '1px solid #1c1c1c',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          position: 'relative',
                        }}>
                          <div style={{
                            position: 'absolute', top: 0, right: 0,
                            width: 0, height: 0,
                            borderLeft: '8px solid #111',
                            borderBottom: '8px solid #1c1c1c',
                          }} />
                          <FileText style={{ width: 14, height: 14, color: '#333', marginTop: '4px' }} />
                        </div>
                        <span style={{ fontSize: '9px', color: '#333', fontFamily: 'ui-monospace, monospace', letterSpacing: '0.1em' }}>
                          OUVRIR PDF
                        </span>
                        {isHovered && (
                          <div style={{
                            position: 'absolute', inset: 0,
                            background: 'rgba(255,255,255,0.02)',
                          }} />
                        )}
                      </div>
                    ) : (
                      <div style={{
                        width: '100%', height: '100%',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        gap: '6px', cursor: 'pointer',
                      }}
                        onClick={() => item.fileUrl && setPreviewItem(item)}
                      >
                        <Icon style={{ width: 20, height: 20, color: '#2a2a2a' }} />
                        <span style={{ fontSize: '9px', color: '#2a2a2a', fontFamily: 'ui-monospace, monospace', letterSpacing: '0.08em' }}>
                          {typeBadge(item.mimeType)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Rnd>
            )
          })}
        </div>
      </div>

      {urlDialogOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            paddingTop: '52px',
            pointerEvents: 'none',
          }}
        >
          <div
            className="url-dialog"
            style={{
              background: '#050505', border: '1px solid #1a1a1a',
              padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px',
              width: '420px', pointerEvents: 'all',
              boxShadow: '0 8px 40px rgba(0,0,0,0.9)',
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              fontSize: '9px', letterSpacing: '0.14em', color: '#555',
              fontFamily: 'ui-monospace, monospace',
            }}>
              <Globe style={{ width: 10, height: 10, color: '#444' }} />
              NAVIGATEUR INTÉGRÉ
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                ref={urlInputRef}
                type="text"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') addBrowserCard(urlInput)
                  if (e.key === 'Escape') { setUrlDialogOpen(false); setUrlInput('') }
                }}
                placeholder="https://... ou youtube.com/watch?v=..."
                style={{
                  flex: 1, background: '#0a0a0a', border: '1px solid #1a1a1a',
                  color: '#ccc', fontSize: '11px', padding: '7px 10px',
                  outline: 'none', fontFamily: 'ui-monospace, monospace',
                }}
              />
              <button
                type="button"
                onClick={() => addBrowserCard(urlInput)}
                style={{
                  background: '#fff', color: '#000', border: 'none',
                  padding: '7px 14px', fontSize: '10px', fontWeight: 600,
                  letterSpacing: '0.08em', cursor: 'pointer',
                  fontFamily: 'ui-monospace, monospace',
                }}
              >
                OUVRIR
              </button>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['youtube.com', 'wikipedia.org', 'github.com', 'excalidraw.com'].map(site => (
                <button
                  key={site}
                  type="button"
                  onClick={() => { setUrlInput(`https://${site}`); urlInputRef.current?.focus() }}
                  style={{
                    background: 'none', border: '1px solid #1a1a1a',
                    color: '#444', fontSize: '9px', padding: '3px 8px',
                    cursor: 'pointer', fontFamily: 'ui-monospace, monospace',
                    letterSpacing: '0.06em',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#888' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a1a1a'; e.currentTarget.style.color = '#444' }}
                >
                  {site}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <AIPanel
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        activeCategory={activeCategory}
        items={items}
        profile={profile}
        onOpenUrl={addBrowserCard}
      />
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        profile={profile}
        onSave={updateProfile}
      />
      <FilePreviewModal
        item={previewItem}
        onClose={() => setPreviewItem(null)}
      />

      {smartFiles.length >= 2 && (
        <SmartSuggest
          newFiles={smartFiles}
          allItems={items}
          categories={categories}
          onDismiss={() => setSmartFiles([])}
          onApply={(action, result) => { handleSmartApply(action, result); setSmartFiles([]) }}
        />
      )}
    </div>
  )
}
