import type { OutputRenderPayload } from '@shared/models/Presentation'

declare global {
  interface Window {
    electronAPI: {
      onRender: (cb: (payload: OutputRenderPayload) => void) => () => void
    }
  }
}

export {}
