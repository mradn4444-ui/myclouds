import { useCallback, useEffect, useRef, useState } from 'react'
import { Rnd } from 'react-rnd'
import {
  FileText, Image as ImageIcon, Music, Film, File,
  StickyNote, Trash2, Upload, Settings, Eye, Globe, ExternalLink,
  ZoomIn, ZoomOut, LocateFixed,
} from 'lucide-react'
import CategorySidebar, { type Category, type Folder } from './CategorySidebar'
import SettingsPanel from './SettingsPanel'
import FilePreviewModal from './FilePreviewModal'
import PdfExport from './PdfExport'
import { useUserProfile } from '../hooks/useUserProfile'
import { useAuth } from '../hooks/useAuth'
import { useItems, type CanvasItem } from '../hooks/useItems'
import { useCategories } from '../hooks/useCategories'
import { useFileUpload } from '../hooks/useFileUpload'
import { getAuthedAssetUrl } from '../lib/api'

export type { CanvasItem } from '../hooks/useItems'

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

const CANVAS_WIDTH = 4200
const CANVAS_HEIGHT = 2800
const MIN_ZOOM = 0.35
const MAX_ZOOM = 2.25

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function safeColor(value: string | undefined, fallback: string) {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback
}

export default function CanvasWorkspace() {
  // Hooks pour la persistance DB
  const { items, loading: itemsLoading, error: itemsError, loadItems, createItem, updateItem: updateItemDB, deleteItem: deleteItemDB } = useItems()
  const { categories, folders, loading: catsLoading, loadCategories, createCategory, updateCategory, deleteCategory, createFolder, updateFolder, deleteFolder } = useCategories()
  const { upload, uploading: uploadingFile } = useFileUpload()

  // État local
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [previewItem, setPreviewItem] = useState<CanvasItem | null>(null)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [urlDialogOpen, setUrlDialogOpen] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef(1)
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const pinchRef = useRef<{ distance: number; zoom: number; worldX: number; worldY: number; centerX: number; centerY: number } | null>(null)
  const { profile, updateProfile, previewProfile } = useUserProfile()
  const { user, logout } = useAuth()

  // Charger les données au montage
  useEffect(() => {
    loadItems()
    loadCategories()
  }, [loadItems, loadCategories])

  useEffect(() => {
    const syncCreatedItem = () => {
      loadItems()
    }
    window.addEventListener('mycloud:item-created', syncCreatedItem)
    return () => window.removeEventListener('mycloud:item-created', syncCreatedItem)
  }, [loadItems])

  useEffect(() => {
    zoomRef.current = zoom
  }, [zoom])

  useEffect(() => {
    if (!user?.id) return
    const key = `mycloud-welcome:${user.id}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
    setShowWelcome(true)
    const timer = window.setTimeout(() => setShowWelcome(false), 4200)
    return () => window.clearTimeout(timer)
  }, [user?.id])

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

  const addBrowserCard = async (rawUrl: string) => {
    if (!rawUrl.trim()) return
    const embedUrl = toEmbedUrl(rawUrl.trim())
    const label = rawUrl.includes('youtube') || rawUrl.includes('youtu.be') ? 'YouTube' : rawUrl.replace(/^https?:\/\//, '').split('/')[0]
    try {
      await createItem({
        type: 'browser',
        title: label,
        url: embedUrl,
        x: 100 + items.length * 20,
        y: 80 + items.length * 14,
        width: 520,
        height: 340,
        categoryId: activeCategoryId,
        folderId: activeFolderId,
      })
      setUrlInput('')
      setUrlDialogOpen(false)
    } catch (err) {
      console.error(err)
    }
  }

  const addNote = async () => {
    try {
      await createItem({
        type: 'note',
        title: 'Note',
        content: '',
        x: 80 + items.length * 24,
        y: 80 + items.length * 24,
        width: 240,
        height: 180,
        categoryId: activeCategoryId,
        folderId: activeFolderId,
      })
    } catch (err) {
      console.error(err)
    }
  }

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files)

      for (let i = 0; i < list.length; i++) {
        const file = list[i];
        try {
          const response = await upload(file, activeCategoryId || undefined, activeFolderId || undefined)
          const isImage = file.type.startsWith('image/')
          const isPdf = file.type.includes('pdf')
          const isAudio = file.type.startsWith('audio/')

          const layout = {
            x: 60 + ((items.length + i) % 4) * 44,
            y: 60 + ((items.length + i) % 3) * 54,
            width: isImage ? 260 : isPdf ? 220 : isAudio ? 260 : 210,
            height: isImage ? 210 : isPdf ? 280 : isAudio ? 100 : 130,
            categoryId: activeCategoryId,
            folderId: activeFolderId,
          }

          await updateItemDB(response.item.id, layout)
        } catch (err) {
          console.error('Upload failed:', err)
        }
      }

      await loadItems()
    },
    [activeCategoryId, activeFolderId, items.length, loadItems, updateItemDB, upload]
  )

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
  }

  const updateItem = (id: string, patch: Partial<CanvasItem>) => {
    updateItemDB(id, patch).catch(console.error)
  }

  const removeItem = (id: string) => {
    deleteItemDB(id).catch(console.error)
  }

  const addCategory = async () => {
    try {
      const c = await createCategory(`Espace ${categories.length + 1}`)
      handleCategorySelect(c.id)
    } catch (err) {
      console.error(err)
    }
  }

  const addFolder = async () => {
    if (!activeCategoryId) return
    try {
      const f = await createFolder(
        activeCategoryId,
        `Dossier ${folders.filter(f => f.categoryId === activeCategoryId).length + 1}`
      )
      setActiveFolderId(f.id)
    } catch (err) {
      console.error(err)
    }
  }

  const breadcrumb = [
    activeCategory?.name,
    activeFolder?.name,
  ].filter(Boolean).join(' / ')

  const displayName = profile.pseudo || profile.prenom || null
  const workspaceBase = safeColor(profile.workspaceBase, '#060606')
  const workspaceAccent = safeColor(profile.workspaceAccent, '#8be7ff')
  const workspaceGlow = safeColor(profile.workspaceGlow, '#b7a6ff')
  const workspaceMotion = profile.workspaceMotion || 'calm'

  const zoomAt = useCallback((nextZoom: number, clientX?: number, clientY?: number) => {
    const canvas = canvasRef.current
    const rect = canvas?.getBoundingClientRect()
    const targetZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM)

    if (!rect || clientX === undefined || clientY === undefined) {
      setZoom(targetZoom)
      return
    }

    const screenX = clientX - rect.left
    const screenY = clientY - rect.top
    setPan(currentPan => {
      const currentZoom = zoomRef.current
      const worldX = (screenX - currentPan.x) / currentZoom
      const worldY = (screenY - currentPan.y) / currentZoom
      return {
        x: screenX - worldX * targetZoom,
        y: screenY - worldY * targetZoom,
      }
    })
    setZoom(targetZoom)
  }, [])

  const resetView = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (e.shiftKey) {
      setPan(current => ({ x: current.x - e.deltaY, y: current.y - e.deltaX }))
      return
    }
    const factor = Math.exp(-e.deltaY * 0.0016)
    zoomAt(zoomRef.current * factor, e.clientX, e.clientY)
  }

  const canPanFromTarget = (target: EventTarget | null) => {
    const element = target as HTMLElement | null
    return Boolean(element?.classList.contains('workspace-canvas') || element?.classList.contains('canvas-stage-bg'))
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canPanFromTarget(e.target)) return
    panStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
    setIsPanning(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = panStartRef.current
    if (!start) return
    setPan({ x: start.panX + e.clientX - start.x, y: start.panY + e.clientY - start.y })
  }

  const stopPanning = (e?: React.PointerEvent<HTMLDivElement>) => {
    panStartRef.current = null
    setIsPanning(false)
    if (e?.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 2) return
    const rect = e.currentTarget.getBoundingClientRect()
    const first = e.touches[0]
    const second = e.touches[1]
    const centerX = (first.clientX + second.clientX) / 2 - rect.left
    const centerY = (first.clientY + second.clientY) / 2 - rect.top
    const distance = Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY)
    pinchRef.current = {
      distance,
      zoom: zoomRef.current,
      centerX,
      centerY,
      worldX: (centerX - pan.x) / zoomRef.current,
      worldY: (centerY - pan.y) / zoomRef.current,
    }
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const start = pinchRef.current
    if (!start || e.touches.length !== 2) return
    e.preventDefault()
    const first = e.touches[0]
    const second = e.touches[1]
    const nextZoom = clamp(start.zoom * Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY) / start.distance, MIN_ZOOM, MAX_ZOOM)
    setZoom(nextZoom)
    setPan({
      x: start.centerX - start.worldX * nextZoom,
      y: start.centerY - start.worldY * nextZoom,
    })
  }

  const handleTouchEnd = () => {
    pinchRef.current = null
  }

  return (
    <div
      className="mycloud-shell"
      data-motion={workspaceMotion}
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: workspaceBase,
        position: 'relative',
        '--workspace-base': workspaceBase,
        '--workspace-accent': workspaceAccent,
        '--workspace-glow': workspaceGlow,
      } as React.CSSProperties}
    >
      <div className="ambient-grid" />
      <div className="workspace-ambient-orbit" />
      <div className="workspace-ambient-glow workspace-ambient-glow-a" />
      <div className="workspace-ambient-glow workspace-ambient-glow-b" />

      {/* Header */}
      <header className="mycloud-header" style={{
        position: 'relative', zIndex: 40, flexShrink: 0,
        height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px',
        background: 'rgba(6,6,6,0.96)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid #111',
      }}>
        <div className="brand-cluster" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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

        <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {displayName && (
            <button
              type="button"
              onClick={logout}
              title="Se déconnecter"
              className="user-pill"
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
            onClick={() => setSettingsOpen(o => !o)}
            className={`header-btn-icon${settingsOpen ? ' active' : ''}`}
            title="Paramètres"
          >
            <Settings style={{ width: '13px', height: '13px' }} />
          </button>
        </div>
      </header>

      <div className="workspace-layout" style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative', zIndex: 10 }}>
        <CategorySidebar
          categories={categories}
          folders={folders}
          activeId={activeCategoryId}
          activeFolderId={activeFolderId}
          onSelect={handleCategorySelect}
          onFolderSelect={setActiveFolderId}
          onAdd={addCategory}
          onAddFolder={addFolder}
          onRename={(id, name) => updateCategory(id, { name }).catch(console.error)}
          onRenameFolder={(id, name) => updateFolder(id, { name }).catch(console.error)}
          onDelete={(id) => { deleteCategory(id).catch(console.error); if (activeCategoryId === id) handleCategorySelect(null) }}
          onDeleteFolder={(id) => { deleteFolder(id).catch(console.error); if (activeFolderId === id) setActiveFolderId(null) }}
          onAvatarChange={() => {}} // TODO: implement avatar
        />

        {/* Canvas */}
        <div
          ref={canvasRef}
          className={`workspace-canvas${dragOver ? ' is-drag-over' : ''}${isPanning ? ' is-panning' : ''}`}
          style={{
            flex: 1, position: 'relative', overflow: 'hidden',
            outline: dragOver ? '2px solid #ffffff15' : 'none',
            outlineOffset: '-3px',
            touchAction: 'none',
          }}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopPanning}
          onPointerCancel={stopPanning}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <input
            ref={fileInputRef} type="file" multiple style={{ display: 'none' }}
            onChange={e => e.target.files && addFiles(e.target.files)}
          />

          {visibleItems.length === 0 && (
            <div className="empty-state" style={{
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

          <div
            className="zoom-dock"
            aria-label="Controle du zoom"
          >
            <button type="button" onClick={() => zoomAt(zoom * 1.16)} title="Zoom avant">
              <ZoomIn size={14} />
            </button>
            <button type="button" onClick={resetView} title="Recentrer">
              <LocateFixed size={14} />
              <span>{Math.round(zoom * 100)}%</span>
            </button>
            <button type="button" onClick={() => zoomAt(zoom / 1.16)} title="Zoom arriere">
              <ZoomOut size={14} />
            </button>
          </div>

          <div
            className="canvas-stage"
            style={{
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
              transition: isPanning ? 'none' : 'transform 0.16s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div className="canvas-stage-bg" />
            {visibleItems.map(item => {
            const Icon = item.type === 'note' ? StickyNote : item.type === 'browser' ? Globe : iconForMime(item.mimeType)
            const isImage = item.mimeType?.startsWith('image/')
            const isAudio = item.mimeType?.startsWith('audio/')
            const isVideo = item.mimeType?.startsWith('video/')
            const isPdf   = item.mimeType?.includes('pdf')
            const isHovered = hoveredCard === item.id
            const fileUrl = getAuthedAssetUrl(item.fileUrl)

            return (
              <Rnd
                key={item.id}
                scale={zoom}
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
                  className={`canvas-card canvas-card-${item.type}`}
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
                    className="no-drag canvas-card-body"
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
                          className="inline-open-link"
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
                        className="card-note-input"
                        value={item.content ?? ''}
                        onChange={e => updateItem(item.id, { content: e.target.value })}
                        onPointerDown={e => e.stopPropagation()}
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
                    ) : isImage && fileUrl ? (
                      <div
                        style={{ width: '100%', height: '100%', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                        onClick={() => setPreviewItem(item)}
                      >
                        <img
                          src={fileUrl}
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
                          <div className="media-hover-overlay" style={{
                            position: 'absolute', inset: 0,
                            background: 'rgba(0,0,0,0.4)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Eye style={{ width: 20, height: 20, color: '#fff' }} />
                          </div>
                        )}
                      </div>
                    ) : isAudio && fileUrl ? (
                      <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '8px', height: '100%', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Music style={{ width: 14, height: 14, color: '#333' }} />
                          <span style={{ fontSize: '9px', color: '#333', fontFamily: 'ui-monospace, monospace' }}>AUDIO</span>
                        </div>
                        <audio
                          controls
                          src={fileUrl}
                          style={{ width: '100%', height: '28px', filter: 'invert(1) hue-rotate(180deg)', opacity: 0.7 }}
                        />
                      </div>
                    ) : isVideo && fileUrl ? (
                      <div
                        style={{ width: '100%', height: '100%', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                        onClick={() => setPreviewItem(item)}
                      >
                        <video
                          src={fileUrl}
                          style={{
                            width: '100%', height: '100%',
                            objectFit: 'cover',
                            filter: 'grayscale(100%)',
                            pointerEvents: 'none',
                          }}
                        />
                        {isHovered && (
                          <div className="media-hover-overlay" style={{
                            position: 'absolute', inset: 0,
                            background: 'rgba(0,0,0,0.5)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Film style={{ width: 20, height: 20, color: '#fff' }} />
                          </div>
                        )}
                      </div>
                    ) : isPdf && fileUrl ? (
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
                      <div className="file-placeholder" style={{
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

      {showWelcome && (
        <div className="workspace-welcome-toast">
          <span>Welcome back{displayName ? `, ${displayName}` : ''}</span>
          <strong>Ready to organize your ideas?</strong>
        </div>
      )}

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        profile={profile}
        onSave={updateProfile}
        onPreview={previewProfile}
      />
      <FilePreviewModal
        item={previewItem}
        onClose={() => setPreviewItem(null)}
      />

    </div>
  )
}
