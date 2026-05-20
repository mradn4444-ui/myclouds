import { useEffect, useCallback } from 'react'
import { X, Download, FileText, Music, Film, File, Image as ImageIcon } from 'lucide-react'
import type { CanvasItem } from './CanvasWorkspace'

interface Props {
  item: CanvasItem | null
  onClose: () => void
}

function iconForMime(mime?: string) {
  if (!mime) return File
  if (mime.startsWith('image/')) return ImageIcon
  if (mime.startsWith('audio/')) return Music
  if (mime.startsWith('video/')) return Film
  if (mime.includes('pdf') || mime.includes('text')) return FileText
  return File
}

function formatMime(mime?: string) {
  if (!mime) return 'FICHIER'
  if (mime.startsWith('image/')) return mime.split('/')[1].toUpperCase()
  if (mime.startsWith('audio/')) return mime.split('/')[1].toUpperCase()
  if (mime.startsWith('video/')) return mime.split('/')[1].toUpperCase()
  if (mime.includes('pdf')) return 'PDF'
  return mime.split('/').pop()?.toUpperCase() ?? 'FICHIER'
}

export default function FilePreviewModal({ item, onClose }: Props) {
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (!item) return
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [item, handleKey])

  if (!item) return null

  const Icon = iconForMime(item.mimeType)
  const isImage = item.mimeType?.startsWith('image/')
  const isAudio = item.mimeType?.startsWith('audio/')
  const isVideo = item.mimeType?.startsWith('video/')
  const isPdf   = item.mimeType?.includes('pdf')

  return (
    <div
      className="modal-backdrop preview-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        className="preview-shell modal-shell"
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          width: isAudio ? '480px' : 'min(90vw, 900px)',
          maxHeight: '88vh',
          background: '#0a0a0a',
          border: '1px solid #1a1a1a',
          boxShadow: '0 40px 80px rgba(0,0,0,0.8)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid #111',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <Icon style={{ width: 14, height: 14, color: '#444', flexShrink: 0 }} />
            <span style={{
              fontFamily: 'ui-monospace, monospace',
              fontSize: '11px', color: '#888',
              letterSpacing: '0.04em',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {item.title}
            </span>
            <span style={{
              fontSize: '9px', color: '#2a2a2a',
              border: '1px solid #1a1a1a',
              padding: '1px 6px',
              fontFamily: 'ui-monospace, monospace',
              letterSpacing: '0.08em',
              flexShrink: 0,
            }}>
              {formatMime(item.mimeType)}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
            {item.fileUrl && (
              <a
                href={item.fileUrl}
                download={item.title}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '4px 10px',
                  background: '#fff', color: '#000',
                  fontFamily: 'ui-monospace, monospace',
                  fontSize: '9px', letterSpacing: '0.1em',
                  textDecoration: 'none',
                  fontWeight: 700,
                }}
              >
                <Download style={{ width: 10, height: 10 }} />
                TÉLÉCHARGER
              </a>
            )}
            <button
              onClick={onClose}
              style={{
                width: 28, height: 28,
                background: 'transparent',
                border: '1px solid #1a1a1a',
                color: '#444', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X style={{ width: 12, height: 12 }} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', position: 'relative', minHeight: 0 }}>
          {isImage && item.fileUrl && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '24px', minHeight: '320px',
            }}>
              <img
                src={item.fileUrl}
                alt={item.title}
                style={{
                  maxWidth: '100%', maxHeight: '70vh',
                  objectFit: 'contain',
                  filter: 'grayscale(100%) contrast(1.05)',
                }}
              />
            </div>
          )}

          {isAudio && item.fileUrl && (
            <div style={{
              padding: '40px 32px',
              display: 'flex', flexDirection: 'column', gap: '24px',
              alignItems: 'center',
            }}>
              <div style={{
                width: 80, height: 80,
                border: '1px solid #1a1a1a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Music style={{ width: 32, height: 32, color: '#333' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: '11px', color: '#666', letterSpacing: '0.06em' }}>
                  {item.title}
                </div>
              </div>
              <audio
                controls
                src={item.fileUrl}
                autoPlay
                style={{ width: '100%', filter: 'invert(1) hue-rotate(180deg)', opacity: 0.8 }}
              />
            </div>
          )}

          {isVideo && item.fileUrl && (
            <div style={{ background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <video
                src={item.fileUrl}
                controls
                autoPlay
                style={{
                  width: '100%', maxHeight: '70vh',
                  filter: 'grayscale(100%)',
                }}
              />
            </div>
          )}

          {isPdf && item.fileUrl && (
            <div style={{ height: '70vh', position: 'relative' }}>
              <embed
                src={item.fileUrl}
                type="application/pdf"
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          )}

          {!isImage && !isAudio && !isVideo && !isPdf && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '60px 32px', gap: '20px',
            }}>
              <div style={{
                width: 72, height: 72,
                border: '1px solid #1a1a1a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon style={{ width: 28, height: 28, color: '#333' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: '12px', color: '#555', letterSpacing: '0.04em' }}>
                  {item.title}
                </div>
                <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: '10px', color: '#2a2a2a', marginTop: '8px', letterSpacing: '0.08em' }}>
                  {formatMime(item.mimeType)}
                </div>
              </div>
              {item.fileUrl && (
                <a
                  href={item.fileUrl}
                  download={item.title}
                  style={{
                    padding: '8px 20px',
                    background: '#fff', color: '#000',
                    fontFamily: 'ui-monospace, monospace',
                    fontSize: '10px', letterSpacing: '0.1em',
                    textDecoration: 'none',
                    fontWeight: 700,
                  }}
                >
                  TÉLÉCHARGER
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
