import { Lightbulb, Copy, Check } from 'lucide-react'
import { useState } from 'react'

type Props = {
  content: string
  title?: string
}

// Detect diagram types in content
function detectDiagramType(content: string): 'ascii' | 'flow' | 'chart' | 'tree' | 'table' | 'text' {
  const hasBox = /[┌┐└┘─│├┤┬┴┼]|[\[\]]+/.test(content)
  const hasArrow = /[\-\>←→↑↓]|[\-]{2,}\>|[<\-]{2,}/.test(content)
  const hasTree = /[├├└─]|[\s]{2,}[\|├└]/.test(content)
  const hasTable = /\|[\s\S]*?\|/.test(content)

  if (hasTree) return 'tree'
  if (hasArrow) return 'flow'
  if (hasBox) return 'ascii'
  if (hasTable) return 'table'
  return 'text'
}

// Parse content into sections
function parseExplanation(content: string): { type: string; content: string }[] {
  const sections: { type: string; content: string }[] = []
  const blocks = content.split(/\n{2,}/).filter(Boolean)

  blocks.forEach(block => {
    const type = detectDiagramType(block)
    sections.push({ type, content: block })
  })

  return sections
}

// Render visual section with appropriate styling
function VisualSection({ section, index }: { section: { type: string; content: string }; index: number }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(section.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const baseStyle = {
    padding: '14px 12px',
    borderRadius: '8px',
    fontSize: '11px',
    lineHeight: '1.7',
    whiteSpace: 'pre' as const,
    fontFamily: 'ui-monospace, monospace',
    letterSpacing: '0.04em',
    marginBottom: '12px',
    position: 'relative' as const,
  }

  const styleByType = {
    ascii: {
      ...baseStyle,
      background: 'rgba(139, 231, 255, 0.05)',
      border: '1px solid rgba(139, 231, 255, 0.15)',
      color: '#8be7ff',
      overflow: 'auto' as const,
      maxHeight: '280px',
    },
    flow: {
      ...baseStyle,
      background: 'rgba(255, 193, 7, 0.05)',
      border: '1px solid rgba(255, 193, 7, 0.15)',
      color: '#ffc107',
      overflow: 'auto' as const,
      maxHeight: '280px',
    },
    tree: {
      ...baseStyle,
      background: 'rgba(76, 175, 80, 0.05)',
      border: '1px solid rgba(76, 175, 80, 0.15)',
      color: '#4caf50',
      overflow: 'auto' as const,
      maxHeight: '280px',
    },
    chart: {
      ...baseStyle,
      background: 'rgba(156, 39, 176, 0.05)',
      border: '1px solid rgba(156, 39, 176, 0.15)',
      color: '#9c27b0',
      overflow: 'auto' as const,
      maxHeight: '280px',
    },
    table: {
      ...baseStyle,
      background: 'rgba(33, 150, 243, 0.05)',
      border: '1px solid rgba(33, 150, 243, 0.15)',
      color: '#2196f3',
      overflow: 'auto' as const,
      maxHeight: '280px',
    },
    text: {
      ...baseStyle,
      background: 'rgba(255, 255, 255, 0.03)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      color: 'rgba(255, 255, 255, 0.76)',
    },
  }

  const style = styleByType[section.type as keyof typeof styleByType] || styleByType.text

  return (
    <div key={index} style={{ position: 'relative', marginBottom: '12px' }}>
      <div
        style={{
          ...style,
          paddingRight: '40px',
        }}
      >
        {section.content}
      </div>
      {['ascii', 'flow', 'tree', 'chart', 'table'].includes(section.type) && (
        <button
          onClick={handleCopy}
          title="Copy diagram"
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '6px',
            color: 'rgba(255, 255, 255, 0.6)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'
            e.currentTarget.style.color = '#fff'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'
          }}
        >
          {copied ? (
            <Check className="w-3 h-3" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </button>
      )}
    </div>
  )
}

export default function VisualExplanation({ content, title }: Props) {
  const sections = parseExplanation(content)
  const hasVisuals = sections.some(s => ['ascii', 'flow', 'tree', 'chart', 'table'].includes(s.type))

  return (
    <div
      style={{
        borderRadius: '12px',
        border: '1px solid rgba(139, 231, 255, 0.1)',
        background: 'rgba(139, 231, 255, 0.02)',
        padding: '16px',
        marginBottom: '12px',
      }}
    >
      {(title || hasVisuals) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Lightbulb className="w-4 h-4" style={{ color: '#8be7ff', flexShrink: 0 }} />
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#8be7ff', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {title || 'Visual Explanation'}
          </span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {sections.map((section, idx) => (
          <VisualSection key={idx} section={section} index={idx} />
        ))}
      </div>
    </div>
  )
}
