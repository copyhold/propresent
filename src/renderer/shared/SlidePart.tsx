import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { TemplatePart } from '@shared/models/Template'

const RTL_LANGS = new Set(['he', 'ar', 'fa', 'ur'])

interface Props {
  part: TemplatePart
  lines: string[]
}

export function SlidePart({ part, lines }: Props) {
  const { geometry, style, verticalAlign = 'top', languageCode } = part
  const isRtl = languageCode ? RTL_LANGS.has(languageCode) : false

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${geometry.left}%`,
    top: `${geometry.top}%`,
    width: `${geometry.width}%`,
    height: `${geometry.height}%`,
    display: 'flex',
    flexDirection: 'column',
    justifyContent:
      verticalAlign === 'middle' ? 'center' : verticalAlign === 'bottom' ? 'flex-end' : 'flex-start',
    overflow: 'hidden',
    direction: isRtl ? 'rtl' : 'ltr',
    fontFamily: style.fontFamily,
    fontSize: style.fontSize ? `${style.fontSize}px` : undefined,
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    color: style.color,
    textAlign: style.textAlign,
    lineHeight: style.lineHeight,
    letterSpacing: style.letterSpacing ? `${style.letterSpacing}px` : undefined,
    textShadow: style.textShadow,
    textTransform: style.textTransform
  }

  const markdown = lines.join('\n')

  return (
    <div style={containerStyle}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <span style={{ display: 'block' }}>{children}</span>,
          h1: ({ children }) => <span style={{ display: 'block' }}>{children}</span>,
          h2: ({ children }) => <span style={{ display: 'block' }}>{children}</span>,
          h3: ({ children }) => <span style={{ display: 'block' }}>{children}</span>
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  )
}
