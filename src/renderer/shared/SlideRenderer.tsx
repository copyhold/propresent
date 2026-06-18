import type { OutputRenderPayload } from '@shared/models/Presentation'
import { Background } from './Background'
import { SlidePart } from './SlidePart'

interface Props {
  payload: OutputRenderPayload
}

export function SlideRenderer({ payload }: Props) {
  const { slide, template, songTitle, songCopyright, state } = payload

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: '#000'
  }

  if (state.outputMode !== 'live' || !slide) {
    return <div style={containerStyle}><Background background={{ type: 'color', color: '#000' }} /></div>
  }

  return (
    <div style={containerStyle}>
      <Background background={template.background} />
      {template.parts.map((part) => {
        let lines: string[] = []

        switch (part.role) {
          case 'primary':
            lines = slide.slide.lines['primary'] ?? []
            break
          case 'translation':
            lines = part.languageCode ? (slide.slide.lines[part.languageCode] ?? []) : []
            break
          case 'title':
            lines = [songTitle]
            break
          case 'copyright':
            lines = songCopyright ? [songCopyright] : []
            break
          case 'section-label':
            lines = [slide.sectionName]
            break
          case 'custom':
            lines = part.staticText ? [part.staticText] : []
            break
        }

        if (part.hideWhenEmpty && lines.every((l) => !l.trim())) return null

        return <SlidePart key={part.id} part={part} lines={lines} />
      })}
    </div>
  )
}
