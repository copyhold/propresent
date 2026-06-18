import { useAppStore } from '../store'

export function SlideNavigator() {
  const activeSong = useAppStore((s) => s.activeSong)
  const presentationState = useAppStore((s) => s.presentationState)
  const gotoSlide = useAppStore((s) => s.gotoSlide)

  if (!activeSong) {
    return (
      <div style={{ padding: '16px', color: '#666', textAlign: 'center' }}>
        Select a song to start
      </div>
    )
  }

  let flatIndex = 0

  return (
    <div style={{ overflowY: 'auto', height: '100%', padding: '8px' }}>
      {activeSong.sections.map((section) => {
        const sectionStart = flatIndex
        flatIndex += section.slides.length

        return (
          <div key={section.name} style={{ marginBottom: '12px' }}>
            <div
              style={{
                fontSize: '11px',
                textTransform: 'uppercase',
                color: '#888',
                marginBottom: '4px',
                letterSpacing: '0.05em'
              }}
            >
              {section.name}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {section.slides.map((slide, idx) => {
                const fi = sectionStart + idx
                const isActive = presentationState?.currentSlideIndex === fi
                const primaryLines = slide.lines['primary'] ?? []

                return (
                  <div
                    key={slide.id}
                    onClick={() => gotoSlide(fi)}
                    title={primaryLines.join('\n')}
                    style={{
                      width: '80px',
                      height: '48px',
                      padding: '4px',
                      borderRadius: '4px',
                      border: isActive ? '2px solid #4a8fff' : '1px solid #333',
                      background: isActive ? '#1a2a4a' : '#1a1a1a',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      fontSize: '9px',
                      lineHeight: 1.3,
                      color: '#ccc'
                    }}
                  >
                    {primaryLines.slice(0, 3).join('\n')}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
