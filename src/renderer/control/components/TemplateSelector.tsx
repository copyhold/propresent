import { useAppStore } from '../store'

export function TemplateSelector() {
  const templates = useAppStore((s) => s.templates)
  const activeSong = useAppStore((s) => s.activeSong)
  const presentationState = useAppStore((s) => s.presentationState)
  const setTemplate = useAppStore((s) => s.setTemplate)

  const recommended = activeSong?.recommendedTemplates ?? []

  const sorted = [...templates].sort((a, b) => {
    const aRec = recommended.includes(a.name) || recommended.includes(a.id)
    const bRec = recommended.includes(b.name) || recommended.includes(b.id)
    if (aRec && !bRec) return -1
    if (!aRec && bRec) return 1
    return 0
  })

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '8px' }}>
      {sorted.map((t) => {
        const isActive = presentationState?.templateId === t.id
        const isRec = recommended.includes(t.name) || recommended.includes(t.id)

        return (
          <button
            key={t.id}
            onClick={() => setTemplate(t.id)}
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              border: isActive ? '2px solid #4a8fff' : '1px solid #444',
              background: isActive ? '#1a2a4a' : '#222',
              color: isRec ? '#fff' : '#aaa',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            {t.name}
            {isRec && ' ★'}
          </button>
        )
      })}
    </div>
  )
}
