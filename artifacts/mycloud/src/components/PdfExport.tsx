import { useState } from 'react'
import { FileDown, Loader2 } from 'lucide-react'
import type { CanvasItem } from './CanvasWorkspace'
import type { Category, Folder } from './CategorySidebar'
import type { UserProfile } from '../hooks/useUserProfile'

interface Props {
  items: CanvasItem[]
  categories: Category[]
  folders: Folder[]
  activeCategory: Category | null
  profile: UserProfile
}

function mimeLabel(mime?: string): string {
  if (!mime) return 'FICHIER'
  if (mime.startsWith('image/')) return 'IMAGE'
  if (mime.startsWith('audio/')) return 'AUDIO'
  if (mime.startsWith('video/')) return 'VIDÉO'
  if (mime.includes('pdf')) return 'PDF'
  if (mime.includes('word') || mime.includes('document')) return 'DOC'
  if (mime.includes('sheet') || mime.includes('excel')) return 'TABLEUR'
  return 'FICHIER'
}

export default function PdfExport({ items, categories, folders, activeCategory, profile }: Props) {
  const [loading, setLoading] = useState(false)

  const generate = async () => {
    setLoading(true)
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      const W = 210
      const MARGIN = 18
      const CONTENT_W = W - MARGIN * 2

      let y = MARGIN

      const checkPage = (needed: number) => {
        if (y + needed > 285) {
          doc.addPage()
          y = MARGIN
        }
      }

      // ── HEADER ──────────────────────────────────────────────────────────────
      doc.setFillColor(0, 0, 0)
      doc.rect(0, 0, W, 28, 'F')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(16)
      doc.setTextColor(255, 255, 255)
      doc.text('MYCLOUD', MARGIN, 17)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(120, 120, 120)
      const now = new Date()
      const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
      doc.text(`EXPORT PDF  •  ${dateStr}`, W - MARGIN, 17, { align: 'right' })

      y = 38

      // ── WORKSPACE TITLE ──────────────────────────────────────────────────────
      const spaceTitle = activeCategory
        ? activeCategory.name.toUpperCase()
        : 'ESPACE PRINCIPAL'

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(22)
      doc.setTextColor(10, 10, 10)
      doc.text(spaceTitle, MARGIN, y)
      y += 6

      if (profile.pseudo || profile.prenom) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(140, 140, 140)
        const name = [profile.prenom, profile.pseudo].filter(Boolean).join(' · ')
        doc.text(name.toUpperCase(), MARGIN, y)
        y += 5
      }

      // thin rule
      doc.setDrawColor(220, 220, 220)
      doc.setLineWidth(0.3)
      doc.line(MARGIN, y + 2, W - MARGIN, y + 2)
      y += 10

      // ── STATS BAR ────────────────────────────────────────────────────────────
      const scopedItems = activeCategory
        ? items.filter(it => it.categoryId === activeCategory.id)
        : items

      const files  = scopedItems.filter(it => it.type === 'file')
      const notes  = scopedItems.filter(it => it.type === 'note')
      const browsers = scopedItems.filter(it => it.type === 'browser')

      const stats = [
        { label: 'FICHIERS',  value: String(files.length) },
        { label: 'NOTES',     value: String(notes.length) },
        { label: 'SITES WEB', value: String(browsers.length) },
        { label: 'TOTAL',     value: String(scopedItems.length) },
      ]

      const cellW = CONTENT_W / stats.length
      stats.forEach(({ label, value }, i) => {
        const cx = MARGIN + i * cellW
        doc.setFillColor(248, 248, 248)
        doc.rect(cx, y, cellW - 2, 16, 'F')

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(14)
        doc.setTextColor(10, 10, 10)
        doc.text(value, cx + (cellW - 2) / 2, y + 7, { align: 'center' })

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(6)
        doc.setTextColor(160, 160, 160)
        doc.text(label, cx + (cellW - 2) / 2, y + 12.5, { align: 'center' })
      })
      y += 24

      // ── FOLDERS ──────────────────────────────────────────────────────────────
      const scopedFolders = activeCategory
        ? folders.filter(f => f.categoryId === activeCategory.id)
        : folders

      if (scopedFolders.length > 0) {
        checkPage(12)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(80, 80, 80)
        doc.text('DOSSIERS', MARGIN, y)
        y += 5

        const cols = 3
        const fW = (CONTENT_W - (cols - 1) * 3) / cols

        scopedFolders.forEach((folder, i) => {
          const col = i % cols
          const row = Math.floor(i / cols)
          if (i > 0 && col === 0) checkPage(10)

          const fx = MARGIN + col * (fW + 3)
          const fy = y + row * 10

          doc.setFillColor(240, 240, 240)
          doc.rect(fx, fy, fW, 8, 'F')
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(8)
          doc.setTextColor(30, 30, 30)

          const folderItems = scopedItems.filter(it => it.folderId === folder.id)
          const nameText = folder.name
          const countText = ` (${folderItems.length})`

          doc.text(nameText, fx + 4, fy + 5.5)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(7)
          doc.setTextColor(140, 140, 140)
          doc.text(countText, fx + 4 + doc.getStringUnitWidth(nameText) * 8 / doc.internal.scaleFactor, fy + 5.5)
        })

        y += Math.ceil(scopedFolders.length / cols) * 10 + 8
      }

      // ── NOTES ────────────────────────────────────────────────────────────────
      if (notes.length > 0) {
        checkPage(14)
        doc.setFillColor(0, 0, 0)
        doc.rect(MARGIN, y, CONTENT_W, 8, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(255, 255, 255)
        doc.text('NOTES', MARGIN + 4, y + 5.5)
        y += 12

        notes.forEach(note => {
          const rawText = note.content || ''
          const lines = doc.splitTextToSize(rawText || '(vide)', CONTENT_W - 16)
          const boxH = Math.min(lines.length * 4.5 + 12, 60)

          checkPage(boxH + 4)

          doc.setDrawColor(210, 210, 210)
          doc.setLineWidth(0.3)
          doc.rect(MARGIN, y, CONTENT_W, boxH, 'S')

          // left accent
          doc.setDrawColor(0, 0, 0)
          doc.setLineWidth(1.5)
          doc.line(MARGIN, y, MARGIN, y + boxH)

          doc.setFont('helvetica', 'bold')
          doc.setFontSize(8)
          doc.setTextColor(20, 20, 20)
          doc.text(note.title, MARGIN + 6, y + 6)

          doc.setFont('helvetica', 'normal')
          doc.setFontSize(8)
          doc.setTextColor(80, 80, 80)
          const maxLines = Math.floor((boxH - 12) / 4.5)
          doc.text(lines.slice(0, maxLines), MARGIN + 6, y + 11)

          y += boxH + 4
        })
        y += 4
      }

      // ── FILES ────────────────────────────────────────────────────────────────
      if (files.length > 0) {
        checkPage(14)
        doc.setFillColor(0, 0, 0)
        doc.rect(MARGIN, y, CONTENT_W, 8, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(255, 255, 255)
        doc.text('FICHIERS', MARGIN + 4, y + 5.5)
        y += 12

        files.forEach((file, idx) => {
          checkPage(12)
          const isEven = idx % 2 === 0
          if (isEven) doc.setFillColor(252, 252, 252)
          else doc.setFillColor(246, 246, 246)
          doc.rect(MARGIN, y, CONTENT_W, 9, 'F')

          // index
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(7)
          doc.setTextColor(180, 180, 180)
          doc.text(String(idx + 1).padStart(2, '0'), MARGIN + 3, y + 6)

          // type badge
          const badge = mimeLabel(file.mimeType)
          doc.setFillColor(0, 0, 0)
          doc.rect(MARGIN + 10, y + 2, 14, 5, 'F')
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(5.5)
          doc.setTextColor(255, 255, 255)
          doc.text(badge, MARGIN + 17, y + 5.8, { align: 'center' })

          // name
          const name = file.title.length > 48 ? file.title.slice(0, 45) + '…' : file.title
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(8)
          doc.setTextColor(30, 30, 30)
          doc.text(name, MARGIN + 28, y + 6)

          // folder
          if (file.folderId) {
            const folder = folders.find(f => f.id === file.folderId)
            if (folder) {
              doc.setFont('helvetica', 'normal')
              doc.setFontSize(6.5)
              doc.setTextColor(160, 160, 160)
              doc.text(`/ ${folder.name}`, W - MARGIN - 2, y + 6, { align: 'right' })
            }
          }

          y += 9
        })
        y += 6
      }

      // ── WEB CARDS ────────────────────────────────────────────────────────────
      if (browsers.length > 0) {
        checkPage(14)
        doc.setFillColor(0, 0, 0)
        doc.rect(MARGIN, y, CONTENT_W, 8, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(255, 255, 255)
        doc.text('SITES WEB', MARGIN + 4, y + 5.5)
        y += 12

        browsers.forEach(b => {
          checkPage(10)
          doc.setDrawColor(210, 210, 210)
          doc.setLineWidth(0.3)
          doc.rect(MARGIN, y, CONTENT_W, 8, 'S')
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(8)
          doc.setTextColor(20, 20, 20)
          doc.text(b.title, MARGIN + 4, y + 5.5)
          if (b.url) {
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(7)
            doc.setTextColor(120, 120, 120)
            const shortUrl = b.url.replace(/^https?:\/\//, '').slice(0, 60)
            doc.text(shortUrl, W - MARGIN - 2, y + 5.5, { align: 'right' })
          }
          y += 9
        })
        y += 4
      }

      // ── FOOTER ───────────────────────────────────────────────────────────────
      const pageCount = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages()
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p)
        doc.setDrawColor(220, 220, 220)
        doc.setLineWidth(0.2)
        doc.line(MARGIN, 290, W - MARGIN, 290)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(180, 180, 180)
        doc.text('MYCLOUD', MARGIN, 295)
        doc.text(`${p} / ${pageCount}`, W - MARGIN, 295, { align: 'right' })
      }

      const safeName = (activeCategory?.name ?? 'espace').toLowerCase().replace(/\s+/g, '-')
      doc.save(`mycloud-${safeName}-${now.toISOString().slice(0, 10)}.pdf`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={generate}
      disabled={loading}
      className="header-btn"
      title="Exporter en PDF"
      style={{ opacity: loading ? 0.6 : 1 }}
    >
      {loading
        ? <Loader2 style={{ width: '12px', height: '12px', animation: 'spin 1s linear infinite' }} />
        : <FileDown style={{ width: '12px', height: '12px' }} />}
      <span>PDF</span>
    </button>
  )
}
