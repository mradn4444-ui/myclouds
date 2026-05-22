import VisualExplanation from './VisualExplanation'
import { Download, Save } from 'lucide-react'

type Props = {
  content: string
  onSaveImage?: (image: { title: string; imageUrl: string; content: string }) => Promise<void> | void
}

function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>
    }
    return <span key={index}>{part}</span>
  })
}

function isVisualContent(block: string): boolean {
  const hasBoxDrawing = /[\u2500-\u257f]/.test(block)
  const hasArrow = /[\u2190-\u21ff]|--?>|<--?/.test(block)
  const hasTable = /\|[\s\S]*?\|/.test(block)
  const hasTree = /(^|\n)\s*[-|+`]{1,3}\s+/m.test(block)
  return block.split('\n').length > 3 && (hasBoxDrawing || hasArrow || hasTable || hasTree)
}

function downloadImage(title: string, imageUrl: string) {
  const link = document.createElement('a')
  link.href = imageUrl
  link.download = `${title.trim().replace(/[^a-z0-9-]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'mycloud-image'}.svg`
  document.body.appendChild(link)
  link.click()
  link.remove()
}

export default function AIResponseContent({ content, onSaveImage }: Props) {
  const blocks = content.trim().split(/\n{2,}/).filter(Boolean)
  if (!blocks.length) return null

  return (
    <div className="ai-rich-content">
      {blocks.map((block, blockIndex) => {
        const generatedImage = block.match(/^!\[([^\]]*)\]\((data:image\/[^)]+)\)$/)

        if (generatedImage) {
          const title = generatedImage[1] || 'Image IA'
          const imageUrl = generatedImage[2]
          return (
            <figure className="ai-generated-figure" key={blockIndex}>
              <img src={imageUrl} alt={title} />
              <figcaption>
                <span>{title}</span>
                <span className="ai-generated-actions">
                  <button type="button" onClick={() => downloadImage(title, imageUrl)} title="Telecharger">
                    <Download size={12} />
                    Telecharger
                  </button>
                  {onSaveImage && (
                    <button type="button" onClick={() => onSaveImage({ title, imageUrl, content })} title="Sauvegarder dans MyClouds">
                      <Save size={12} />
                      Sauvegarder
                    </button>
                  )}
                </span>
              </figcaption>
            </figure>
          )
        }

        if (isVisualContent(block)) {
          return (
            <VisualExplanation
              key={blockIndex}
              content={block}
              title="Visual Structure"
            />
          )
        }

        const lines = block.split('\n').map(line => line.trim()).filter(Boolean)
        const heading = lines.length === 1 ? lines[0].match(/^#{1,3}\s+(.+)$/) : null
        const bulletLines = lines.filter(line => /^[-*]\s+/.test(line))
        const numberedLines = lines.filter(line => /^\d+[.)]\s+/.test(line))
        const tableLines = lines.filter(line => line.includes('|'))

        if (heading) {
          return <h4 key={blockIndex}>{renderInline(heading[1])}</h4>
        }

        if (tableLines.length >= 2 && tableLines.length === lines.length) {
          const rows = tableLines
            .filter(line => !/^[-|\s]+$/.test(line))
            .map(line => line.split('|').map(cell => cell.trim()).filter(Boolean))

          return (
            <div className="ai-table-wrap" key={blockIndex}>
              <table>
                <tbody>
                  {rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex}>{renderInline(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }

        if (bulletLines.length === lines.length) {
          return (
            <ul key={blockIndex}>
              {bulletLines.map((line, lineIndex) => (
                <li key={lineIndex}>{renderInline(line.replace(/^[-*]\s+/, ''))}</li>
              ))}
            </ul>
          )
        }

        if (numberedLines.length === lines.length) {
          return (
            <ol key={blockIndex}>
              {numberedLines.map((line, lineIndex) => (
                <li key={lineIndex}>{renderInline(line.replace(/^\d+[.)]\s+/, ''))}</li>
              ))}
            </ol>
          )
        }

        return <p key={blockIndex}>{renderInline(lines.join('\n'))}</p>
      })}
    </div>
  )
}
