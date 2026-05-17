'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Rnd } from 'react-rnd'
import {
  FileText,
  Image as ImageIcon,
  Music,
  Film,
  File,
  StickyNote,
  Trash2,
  Upload,
} from 'lucide-react'

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
}

const STORAGE_KEY = 'mycloud-canvas-v1'

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
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const loaded = useRef(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setItems(JSON.parse(raw))
    } catch {
      /* ignore */
    }
    loaded.current = true
  }, [])

  useEffect(() => {
    if (!loaded.current) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const addNote = () => {
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: 'note',
        title: 'Note',
        content: '',
        x: 80 + prev.length * 24,
        y: 120 + prev.length * 24,
        width: 220,
        height: 160,
      },
    ])
  }

  const addFiles = useCallback((files: FileList | File[]) => {
    const list = Array.from(files)
    setItems((prev) => {
      const next = [...prev]
      list.forEach((file, i) => {
        next.push({
          id: crypto.randomUUID(),
          type: 'file',
          title: file.name,
          fileUrl: URL.createObjectURL(file),
          mimeType: file.type,
          x: 60 + ((prev.length + i) % 4) * 40,
          y: 80 + ((prev.length + i) % 3) * 50,
          width: file.type.startsWith('image/') ? 240 : 200,
          height: file.type.startsWith('image/') ? 200 : 120,
        })
      })
      return next
    })
  }, [])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
  }

  const updateItem = (id: string, patch: Partial<CanvasItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  }

  const removeItem = (id: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.id === id)
      if (item?.fileUrl?.startsWith('blob:')) URL.revokeObjectURL(item.fileUrl)
      return prev.filter((i) => i.id !== id)
    })
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden canvas-grid">
      <header className="shrink-0 border-b border-neutral-800 bg-black/90 backdrop-blur z-50">
        <div className="flex items-center justify-between px-4 h-12">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold tracking-[0.2em] uppercase text-white">
              MyCloud
            </span>
            <span className="text-[10px] text-neutral-500 border border-neutral-800 px-2 py-0.5">
              mode local
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-xs border border-white text-white px-3 py-1.5 hover:bg-white hover:text-black transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Fichier
            </button>
            <button
              type="button"
              onClick={addNote}
              className="flex items-center gap-1.5 text-xs border border-neutral-600 text-neutral-300 px-3 py-1.5 hover:border-white hover:text-white transition-colors"
            >
              <StickyNote className="w-3.5 h-3.5" />
              Note
            </button>
          </div>
        </div>
      </header>

      <div
        className={`flex-1 relative overflow-hidden ${dragOver ? 'ring-2 ring-inset ring-white' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
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

        {items.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center border border-dashed border-neutral-700 px-12 py-10 max-w-sm">
              <Upload className="w-8 h-8 mx-auto text-neutral-500 mb-3" />
              <p className="text-sm text-white font-medium">Dépose tes fichiers ici</p>
              <p className="text-xs text-neutral-500 mt-2">
                Glisse-dépose · déplace · redimensionne
              </p>
            </div>
          </div>
        )}

        {items.map((item) => {
          const Icon = item.type === 'note' ? StickyNote : iconForMime(item.mimeType)
          return (
            <Rnd
              key={item.id}
              size={{ width: item.width, height: item.height }}
              position={{ x: item.x, y: item.y }}
              minWidth={140}
              minHeight={90}
              bounds="parent"
              onDragStop={(_e, d) => updateItem(item.id, { x: d.x, y: d.y })}
              onResizeStop={(_e, _dir, ref, _delta, pos) =>
                updateItem(item.id, {
                  width: ref.offsetWidth,
                  height: ref.offsetHeight,
                  x: pos.x,
                  y: pos.y,
                })
              }
              className="!z-10"
            >
              <div className="h-full w-full border border-neutral-700 bg-black flex flex-col shadow-[4px_4px_0_0_#ffffff]">
                <div className="flex items-center justify-between gap-2 px-2 py-1.5 border-b border-neutral-800 bg-neutral-950 cursor-move">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Icon className="w-3.5 h-3.5 shrink-0 text-white" />
                    <span className="text-[11px] text-white truncate font-medium">
                      {item.title}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="p-0.5 text-neutral-500 hover:text-white"
                    aria-label="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex-1 p-2 overflow-hidden min-h-0">
                  {item.type === 'note' ? (
                    <textarea
                      value={item.content ?? ''}
                      onChange={(e) => updateItem(item.id, { content: e.target.value })}
                      placeholder="Écris ici..."
                      className="w-full h-full bg-transparent text-xs text-neutral-200 placeholder:text-neutral-600 resize-none focus:outline-none"
                    />
                  ) : item.mimeType?.startsWith('image/') && item.fileUrl ? (
                    <img
                      src={item.fileUrl}
                      alt={item.title}
                      className="w-full h-full object-cover grayscale"
                    />
                  ) : item.mimeType?.startsWith('audio/') && item.fileUrl ? (
                    <audio controls src={item.fileUrl} className="w-full mt-2 invert" />
                  ) : item.mimeType?.startsWith('video/') && item.fileUrl ? (
                    <video
                      src={item.fileUrl}
                      controls
                      className="w-full h-full object-contain grayscale"
                    />
                  ) : (
                    <p className="text-[10px] text-neutral-500 leading-relaxed">
                      {item.mimeType || 'fichier'}
                    </p>
                  )}
                </div>
              </div>
            </Rnd>
          )
        })}
      </div>
    </div>
  )
}
