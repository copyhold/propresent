import { useEffect } from 'react'
import { useAppStore } from './store'
import { SongList } from './components/SongList'
import { SlideNavigator } from './components/SlideNavigator'
import { TemplateSelector } from './components/TemplateSelector'
import { OutputPreview } from './components/OutputPreview'
import type { PresentationState, LibraryChangedEvent } from '@shared/models/Presentation'

export function App() {
  const loadLibrary = useAppStore((s) => s.loadLibrary)
  const setPresentationState = useAppStore((s) => s.setPresentationState)
  const nextSlide = useAppStore((s) => s.nextSlide)
  const prevSlide = useAppStore((s) => s.prevSlide)
  const setMode = useAppStore((s) => s.setMode)
  const gotoSection = useAppStore((s) => s.gotoSection)
  const presentationState = useAppStore((s) => s.presentationState)

  useEffect(() => {
    loadLibrary()

    const unsubState = window.electronAPI.onPresentationStateChanged!((state: PresentationState) => {
      setPresentationState(state)
    })

    const unsubLibrary = window.electronAPI.onLibraryChanged!((_event: LibraryChangedEvent) => {
      loadLibrary()
    })

    return () => {
      unsubState()
      unsubLibrary()
    }
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return

      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          e.preventDefault()
          nextSlide()
          break
        case 'ArrowLeft':
          e.preventDefault()
          prevSlide()
          break
        case 'Escape':
          setMode('blank')
          break
        default:
          gotoSection(e.key)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [nextSlide, prevSlide, setMode, gotoSection])

  return (
    <div className="grid grid-cols-[25%_1fr] grid-rows-[1fr] h-screen bg-app-950 text-white font-sans">
      {/* Left: song list */}
      <div className="border-r border-app-700 overflow-hidden">
        <SongList />
      </div>

      {/* Right: main area */}
      <div className="flex flex-col overflow-hidden">
        {/* Template selector */}
        <div className="border-b border-app-700">
          <TemplateSelector />
        </div>

        {/* Slide navigator */}
        <div className="flex-1 overflow-hidden">
          <SlideNavigator />
        </div>

        {/* Bottom: preview + controls */}
        <div className="border-t border-app-700 p-2 grid grid-cols-[auto_1fr] gap-3 h-[30%] shrink-0 overflow-hidden">
          <OutputPreview />
          <div className="grid grid-rows-[auto_auto_auto] content-start gap-1.5 pt-1">
            <div className="text-[11px] text-app-400">
              Slide {(presentationState?.currentSlideIndex ?? 0) + 1} / {presentationState?.totalSlides ?? 0}
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => setMode('live')}
                className={`px-3 py-1 rounded text-xs cursor-pointer text-white ${
                  presentationState?.outputMode === 'live'
                    ? 'border-2 border-accent bg-accent-dark'
                    : 'border border-app-600 bg-app-800'
                }`}
              >
                Live
              </button>
              <button
                onClick={() => setMode('blank')}
                className={`px-3 py-1 rounded text-xs cursor-pointer text-white ${
                  presentationState?.outputMode === 'blank'
                    ? 'border-2 border-accent bg-accent-dark'
                    : 'border border-app-600 bg-app-800'
                }`}
              >
                Blank
              </button>
            </div>
            <div className="text-[10px] text-app-500 mt-1">
              ← → Space to navigate · 1/2/c/b for sections · Esc to blank
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
