# Song Detail View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a middle "song detail" column to the control window so operators can browse song metadata and text before presenting, and add explicit Fade Out / Fade In / End buttons to the presentation pane.

**Architecture:** 3-column CSS Grid (`18% 33% 1fr`). A new `selectedSong` state in the Zustand store tracks what's being browsed, independent of `activeSong` (currently presenting). A new `shell:openFile` IPC channel lets the renderer open `.md` files in the system editor via `shell.openPath`.

**Tech Stack:** Electron 31 · React 18 · TypeScript 5 · Tailwind CSS 4 · Zustand · electron-vite

## Global Constraints

- CSS Grid preferred over Flexbox for UI layouts; use Flex only when Grid is unsuitable
- Tailwind CSS 4 class syntax (no `bg-opacity-*`, use `bg-color/opacity` slash syntax)
- All IPC channel names defined in `src/shared/ipc/channels.ts` as string constants
- `window.electronAPI` types declared in `src/renderer/env.d.ts`
- TypeScript strict mode — no implicit `any`
- Run `npm run typecheck` to verify (from project root `/Users/Ilya.Novojilov/projects/propresent`)

---

### Task 1: IPC — shell:openFile

**Files:**
- Modify: `src/shared/ipc/channels.ts`
- Modify: `src/renderer/env.d.ts`
- Create: `src/main/ipc/shell.ts`
- Modify: `src/main/ipc/index.ts`
- Modify: `src/preload/control.ts`

**Interfaces:**
- Produces: `window.electronAPI.openFile(filePath)` available in renderer; `IPC.SHELL_OPEN_FILE` constant

- [ ] **Step 1: Add channel constant**

In `src/shared/ipc/channels.ts`, add `SHELL_OPEN_FILE` before the `DISPLAY_LIST` line:

```typescript
export const IPC = {
  SONGS_LIST: 'songs:list',
  SONGS_GET: 'songs:get',
  SONGS_RELOAD: 'songs:reload',

  TEMPLATES_LIST: 'templates:list',
  TEMPLATES_GET: 'templates:get',

  PRESENT_LOAD_SONG: 'present:loadSong',
  PRESENT_GOTO_SLIDE: 'present:gotoSlide',
  PRESENT_NEXT_SLIDE: 'present:nextSlide',
  PRESENT_PREV_SLIDE: 'present:prevSlide',
  PRESENT_SET_MODE: 'present:setMode',
  PRESENT_SET_TEMPLATE: 'present:setTemplate',
  PRESENT_CLEAR: 'present:clear',

  SHELL_OPEN_FILE: 'shell:openFile',

  DISPLAY_LIST: 'display:list',
  APP_GET_PATHS: 'app:getPaths',

  PRESENT_STATE_CHANGED: 'present:stateChanged',
  LIBRARY_CHANGED: 'library:changed',
  OUTPUT_RENDER: 'output:render',
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]
```

- [ ] **Step 2: Add `openFile` to the window type**

Replace the `electronAPI` block in `src/renderer/env.d.ts`:

```typescript
import type { PresentationState, OutputRenderPayload, LibraryChangedEvent } from '@shared/models/Presentation'

declare global {
  interface Window {
    electronAPI: {
      invoke?: (channel: string, ...args: unknown[]) => Promise<unknown>
      openFile?: (filePath: string) => Promise<string>
      onPresentationStateChanged?: (cb: (state: PresentationState) => void) => () => void
      onLibraryChanged?: (cb: (event: LibraryChangedEvent) => void) => () => void
      onOutputRender?: (cb: (payload: OutputRenderPayload) => void) => () => void
      onRender?: (cb: (payload: OutputRenderPayload) => void) => () => void
    }
  }
}

export {}
```

- [ ] **Step 3: Create shell IPC handler**

Create `src/main/ipc/shell.ts`:

```typescript
import { ipcMain, shell } from 'electron'
import { IPC } from '@shared/ipc/channels'

export function registerShellHandlers(): void {
  ipcMain.handle(IPC.SHELL_OPEN_FILE, (_event, filePath: string) => shell.openPath(filePath))
}
```

- [ ] **Step 4: Register the handler**

Replace `src/main/ipc/index.ts` with:

```typescript
import type { SongLibrary } from '../store/SongLibrary'
import type { TemplateLibrary } from '../store/TemplateLibrary'
import type { PresentationStore } from '../store/PresentationStore'
import { registerSongHandlers } from './songs'
import { registerTemplateHandlers } from './templates'
import { registerPresentationHandlers } from './presentation'
import { registerShellHandlers } from './shell'

export function registerAllHandlers(
  songs: SongLibrary,
  templates: TemplateLibrary,
  presentation: PresentationStore
): void {
  registerSongHandlers(songs)
  registerTemplateHandlers(templates)
  registerPresentationHandlers(presentation)
  registerShellHandlers()
}
```

- [ ] **Step 5: Expose `openFile` in the control preload**

Replace `src/preload/control.ts` with:

```typescript
import { contextBridge, ipcRenderer } from 'electron'
import type { PresentationState, OutputRenderPayload, LibraryChangedEvent } from '../shared/models/Presentation'
import { IPC } from '../shared/ipc/channels'

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),

  openFile: (filePath: string) => ipcRenderer.invoke(IPC.SHELL_OPEN_FILE, filePath),

  onPresentationStateChanged: (cb: (state: PresentationState) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, state: PresentationState) => cb(state)
    ipcRenderer.on(IPC.PRESENT_STATE_CHANGED, handler)
    return () => ipcRenderer.off(IPC.PRESENT_STATE_CHANGED, handler)
  },

  onLibraryChanged: (cb: (event: LibraryChangedEvent) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, event: LibraryChangedEvent) => cb(event)
    ipcRenderer.on(IPC.LIBRARY_CHANGED, handler)
    return () => ipcRenderer.off(IPC.LIBRARY_CHANGED, handler)
  },

  onOutputRender: (cb: (payload: OutputRenderPayload) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, payload: OutputRenderPayload) => cb(payload)
    ipcRenderer.on(IPC.OUTPUT_RENDER, handler)
    return () => ipcRenderer.off(IPC.OUTPUT_RENDER, handler)
  }
})
```

- [ ] **Step 6: Typecheck**

```bash
cd /Users/Ilya.Novojilov/projects/propresent && npm run typecheck
```

Expected: no errors related to `SHELL_OPEN_FILE` or `openFile`.

- [ ] **Step 7: Commit**

```bash
git add src/shared/ipc/channels.ts src/renderer/env.d.ts src/main/ipc/shell.ts src/main/ipc/index.ts src/preload/control.ts
git commit -m "feat: add shell:openFile IPC channel for opening .md files in system editor"
```

---

### Task 2: Zustand Store — selectedSong, selectSong, clearPresentation

**Files:**
- Modify: `src/renderer/control/store/index.ts`

**Interfaces:**
- Consumes: `IPC.PRESENT_CLEAR` from `@shared/ipc/channels`; `CompiledSong` from `@shared/models/Song`
- Produces:
  - `selectedSong: CompiledSong | null` — song shown in detail pane
  - `selectSong(id: string | null): void` — set selected song by id (renderer-only)
  - `clearPresentation(): Promise<void>` — clears active song and output

- [ ] **Step 1: Replace the store file**

Replace `src/renderer/control/store/index.ts` with:

```typescript
import { create } from 'zustand'
import type { CompiledSong } from '@shared/models/Song'
import type { Template } from '@shared/models/Template'
import type { PresentationState } from '@shared/models/Presentation'
import { IPC } from '@shared/ipc/channels'
import type { SectionType } from '@shared/models/Song'

interface AppState {
  songs: CompiledSong[]
  templates: Template[]
  presentationState: PresentationState | null
  activeSong: CompiledSong | null
  selectedSong: CompiledSong | null

  loadLibrary: () => Promise<void>
  loadSong: (id: string, templateId?: string) => Promise<void>
  nextSlide: () => Promise<void>
  prevSlide: () => Promise<void>
  gotoSlide: (index: number) => Promise<void>
  gotoSection: (key: string) => void
  setMode: (mode: 'live' | 'blank' | 'logo') => Promise<void>
  setTemplate: (templateId: string) => Promise<void>
  setPresentationState: (state: PresentationState) => void
  reloadLibrary: () => Promise<void>
  selectSong: (id: string | null) => void
  clearPresentation: () => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  songs: [],
  templates: [],
  presentationState: null,
  activeSong: null,
  selectedSong: null,

  loadLibrary: async () => {
    const [songs, templates] = await Promise.all([
      window.electronAPI.invoke!(IPC.SONGS_LIST) as Promise<CompiledSong[]>,
      window.electronAPI.invoke!(IPC.TEMPLATES_LIST) as Promise<Template[]>
    ])
    const { selectedSong } = get()
    const refreshedSelectedSong = selectedSong
      ? (songs.find((s) => s.id === selectedSong.id) ?? null)
      : null
    set({ songs, templates, selectedSong: refreshedSelectedSong })
  },

  reloadLibrary: async () => {
    await window.electronAPI.invoke!(IPC.SONGS_RELOAD)
    const songs = (await window.electronAPI.invoke!(IPC.SONGS_LIST)) as CompiledSong[]
    const { selectedSong } = get()
    const refreshedSelectedSong = selectedSong
      ? (songs.find((s) => s.id === selectedSong.id) ?? null)
      : null
    set({ songs, selectedSong: refreshedSelectedSong })
  },

  loadSong: async (id: string, templateId?: string) => {
    const state = (await window.electronAPI.invoke!(IPC.PRESENT_LOAD_SONG, {
      songId: id,
      templateId
    })) as PresentationState
    const songs = get().songs
    const activeSong = songs.find((s) => s.id === id) ?? null
    set({ presentationState: state, activeSong })
  },

  nextSlide: async () => {
    const state = (await window.electronAPI.invoke!(IPC.PRESENT_NEXT_SLIDE)) as PresentationState
    set({ presentationState: state })
  },

  prevSlide: async () => {
    const state = (await window.electronAPI.invoke!(IPC.PRESENT_PREV_SLIDE)) as PresentationState
    set({ presentationState: state })
  },

  gotoSlide: async (index: number) => {
    const state = (await window.electronAPI.invoke!(IPC.PRESENT_GOTO_SLIDE, index)) as PresentationState
    set({ presentationState: state })
  },

  gotoSection: (key: string) => {
    const { activeSong } = get()
    if (!activeSong) return

    const typeMap: Partial<Record<string, SectionType>> = { c: 'chorus', b: 'bridge' }
    const digit = parseInt(key, 10)

    let targetSection
    if (!isNaN(digit) && digit > 0) {
      targetSection = activeSong.sections.find((s) => s.type === 'verse' && s.number === digit)
    } else {
      const t = typeMap[key.toLowerCase()]
      if (t) targetSection = activeSong.sections.find((s) => s.type === t)
    }

    if (!targetSection) return

    let flatIndex = 0
    for (const sec of activeSong.sections) {
      if (sec === targetSection) break
      flatIndex += sec.slides.length
    }

    get().gotoSlide(flatIndex)
  },

  setMode: async (mode) => {
    const state = (await window.electronAPI.invoke!(IPC.PRESENT_SET_MODE, mode)) as PresentationState
    set({ presentationState: state })
  },

  setTemplate: async (templateId: string) => {
    const state = (await window.electronAPI.invoke!(IPC.PRESENT_SET_TEMPLATE, templateId)) as PresentationState
    set({ presentationState: state })
  },

  setPresentationState: (state: PresentationState) => {
    const { songs } = get()
    const activeSong = state.activeSongId ? (songs.find((s) => s.id === state.activeSongId) ?? null) : null
    set({ presentationState: state, activeSong })
  },

  selectSong: (id: string | null) => {
    const song = id ? (get().songs.find((s) => s.id === id) ?? null) : null
    set({ selectedSong: song })
  },

  clearPresentation: async () => {
    const state = (await window.electronAPI.invoke!(IPC.PRESENT_CLEAR)) as PresentationState
    set({ presentationState: state, activeSong: null })
  }
}))
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/Ilya.Novojilov/projects/propresent && npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/control/store/index.ts
git commit -m "feat: add selectedSong, selectSong, clearPresentation to control store"
```

---

### Task 3: SongDetailPane Component (new)

**Files:**
- Create: `src/renderer/control/components/SongDetailPane.tsx`

**Interfaces:**
- Consumes: `useAppStore` — reads `selectedSong`, `activeSong`; calls `loadSong`, `selectSong` (not used directly but available)
- Consumes: `window.electronAPI.openFile`

- [ ] **Step 1: Create the component**

Create `src/renderer/control/components/SongDetailPane.tsx`:

```tsx
import { useAppStore } from '../store'

export function SongDetailPane() {
  const selectedSong = useAppStore((s) => s.selectedSong)
  const activeSong = useAppStore((s) => s.activeSong)
  const loadSong = useAppStore((s) => s.loadSong)

  if (!selectedSong) {
    return (
      <div className="flex items-center justify-center h-full text-app-500 text-sm">
        Select a song to view details
      </div>
    )
  }

  const isPresenting = activeSong?.id === selectedSong.id
  const primaryLang = selectedSong.languages[0] ?? 'primary'
  const variants = selectedSong.languages.slice(1).map((lang, i) => ({
    lang,
    filePath: selectedSong.variantFilePaths[i]
  }))

  const openFile = (filePath: string) => {
    window.electronAPI.openFile?.(filePath)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header: Start Presenting button */}
      <div className="p-3 border-b border-app-700 shrink-0">
        <button
          onClick={() => loadSong(selectedSong.id)}
          disabled={isPresenting}
          className={`w-full py-2 px-4 rounded text-sm font-medium cursor-pointer transition-colors ${
            isPresenting
              ? 'bg-accent-dark border border-accent text-app-300 cursor-default'
              : 'bg-accent text-white hover:bg-accent/80'
          }`}
        >
          {isPresenting ? 'Presenting' : 'Start Presenting'}
        </button>
      </div>

      {/* Metadata */}
      <div className="p-3 border-b border-app-700 shrink-0 grid gap-2">
        {/* Title */}
        <div className="grid grid-cols-[auto_1fr] gap-2 items-start">
          <span className="text-[11px] text-app-400 pt-0.5">Title</span>
          <button
            onClick={() => openFile(selectedSong.filePath)}
            className="text-left text-sm text-accent hover:text-white transition-colors font-medium truncate cursor-pointer"
            title={selectedSong.filePath}
          >
            {selectedSong.title}
          </button>
        </div>

        {/* Templates */}
        {selectedSong.recommendedTemplates.length > 0 && (
          <div className="grid grid-cols-[auto_1fr] gap-2 items-start">
            <span className="text-[11px] text-app-400 pt-0.5">Templates</span>
            <span className="text-sm text-app-200">{selectedSong.recommendedTemplates.join(', ')}</span>
          </div>
        )}

        {/* Variants */}
        {variants.length > 0 && (
          <div className="grid grid-cols-[auto_1fr] gap-2 items-start">
            <span className="text-[11px] text-app-400 pt-0.5">Variants</span>
            <div className="grid gap-0.5">
              {variants.map(({ lang, filePath }) => (
                <button
                  key={lang}
                  onClick={() => openFile(filePath)}
                  className="text-left text-sm text-accent hover:text-white transition-colors cursor-pointer"
                  title={filePath}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Song text */}
      <div className="flex-1 overflow-y-auto p-3">
        {selectedSong.sections.map((section) => (
          <div key={section.name} className="mb-4">
            <div className="text-[11px] text-app-400 font-medium uppercase tracking-wider mb-2">
              {section.name}
            </div>
            {section.slides.map((slide, slideIdx) => (
              <div key={slide.id} className={`text-sm text-app-100 leading-relaxed ${slideIdx > 0 ? 'mt-3' : ''}`}>
                {(slide.lines[primaryLang] ?? []).map((line, lineIdx) => (
                  <div key={lineIdx}>{line}</div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/Ilya.Novojilov/projects/propresent && npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/control/components/SongDetailPane.tsx
git commit -m "feat: add SongDetailPane component"
```

---

### Task 4: Update SongList — click selects, dual highlights

**Files:**
- Modify: `src/renderer/control/components/SongList.tsx`

**Interfaces:**
- Consumes: `useAppStore` — reads `selectedSong`; calls `selectSong` (replaces `loadSong`)

- [ ] **Step 1: Replace SongList**

Replace `src/renderer/control/components/SongList.tsx` with:

```tsx
import { useState } from 'react'
import { useAppStore } from '../store'

export function SongList() {
  const songs = useAppStore((s) => s.songs)
  const selectSong = useAppStore((s) => s.selectSong)
  const selectedSong = useAppStore((s) => s.selectedSong)
  const presentationState = useAppStore((s) => s.presentationState)
  const [search, setSearch] = useState('')

  const filtered = songs.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full">
      <input
        type="text"
        placeholder="Search songs…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="p-2 m-2 rounded border border-app-600 bg-app-900 text-white"
      />
      <div className="flex-1 overflow-y-auto">
        {filtered.map((song) => {
          const isActive = presentationState?.activeSongId === song.id
          const isSelected = selectedSong?.id === song.id

          return (
            <div
              key={song.id}
              onClick={() => selectSong(song.id)}
              className={`py-2.5 px-3 cursor-pointer border-b border-app-700 text-white ${
                isActive ? 'bg-accent-song' : isSelected ? 'bg-app-800' : 'bg-transparent'
              }`}
            >
              <div className="font-medium">{song.title}</div>
              {song.mood.length > 0 && (
                <div className="text-[11px] text-app-300 mt-0.5">
                  {song.mood.join(', ')}
                </div>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="p-3 text-app-400 text-center">
            No songs found
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/Ilya.Novojilov/projects/propresent && npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/control/components/SongList.tsx
git commit -m "feat: song list click selects for detail pane instead of loading presentation"
```

---

### Task 5: App — 3-column layout + Fade/End buttons + bottom bar cleanup

**Files:**
- Modify: `src/renderer/control/App.tsx`

**Interfaces:**
- Consumes: `SongDetailPane` from `./components/SongDetailPane`
- Consumes: `useAppStore` — reads `presentationState`, `activeSong`; calls `setMode`, `clearPresentation`

- [ ] **Step 1: Replace App.tsx**

Replace `src/renderer/control/App.tsx` with:

```tsx
import { useEffect } from 'react'
import { useAppStore } from './store'
import { SongList } from './components/SongList'
import { SongDetailPane } from './components/SongDetailPane'
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
  const clearPresentation = useAppStore((s) => s.clearPresentation)
  const presentationState = useAppStore((s) => s.presentationState)
  const activeSong = useAppStore((s) => s.activeSong)

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

  const hasActive = activeSong !== null

  return (
    <div className="grid grid-cols-[18%_33%_1fr] grid-rows-[1fr] h-screen bg-app-950 text-white font-sans">
      {/* Column 1: Song list */}
      <div className="border-r border-app-700 overflow-hidden">
        <SongList />
      </div>

      {/* Column 2: Song detail */}
      <div className="border-r border-app-700 overflow-hidden">
        <SongDetailPane />
      </div>

      {/* Column 3: Presentation pane */}
      <div className="flex flex-col overflow-hidden">
        {/* Fade / End controls */}
        <div className="border-b border-app-700 p-2 flex gap-1.5 shrink-0">
          <button
            onClick={() => setMode('blank')}
            disabled={!hasActive}
            className={`px-3 py-1 rounded text-xs cursor-pointer text-white disabled:opacity-40 disabled:cursor-default ${
              presentationState?.outputMode === 'blank'
                ? 'border-2 border-accent bg-accent-dark'
                : 'border border-app-600 bg-app-800'
            }`}
          >
            Fade Out
          </button>
          <button
            onClick={() => setMode('live')}
            disabled={!hasActive}
            className={`px-3 py-1 rounded text-xs cursor-pointer text-white disabled:opacity-40 disabled:cursor-default ${
              presentationState?.outputMode === 'live'
                ? 'border-2 border-accent bg-accent-dark'
                : 'border border-app-600 bg-app-800'
            }`}
          >
            Fade In
          </button>
          <button
            onClick={() => clearPresentation()}
            disabled={!hasActive}
            className="px-3 py-1 rounded text-xs cursor-pointer text-white border border-app-600 bg-app-800 disabled:opacity-40 disabled:cursor-default ml-auto"
          >
            End
          </button>
        </div>

        {/* Template selector */}
        <div className="border-b border-app-700 shrink-0">
          <TemplateSelector />
        </div>

        {/* Slide navigator */}
        <div className="flex-1 overflow-hidden">
          <SlideNavigator />
        </div>

        {/* Bottom: preview + info */}
        <div className="border-t border-app-700 p-2 grid grid-cols-[auto_1fr] gap-3 h-[30%] shrink-0 overflow-hidden">
          <OutputPreview />
          <div className="grid grid-rows-[auto_auto] content-start gap-1.5 pt-1">
            <div className="text-[11px] text-app-400">
              Slide {(presentationState?.currentSlideIndex ?? 0) + 1} / {presentationState?.totalSlides ?? 0}
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
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/Ilya.Novojilov/projects/propresent && npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Run the app and verify**

```bash
cd /Users/Ilya.Novojilov/projects/propresent && npm run dev
```

Verify:
1. Three-column layout visible
2. Clicking a song shows its metadata + text in the middle pane; output unchanged
3. [Start Presenting] loads the song to the output; song item turns blue; button becomes "Presenting"
4. Clicking a different song updates the detail pane; the presenting song stays blue in the list
5. Title click opens the `.md` file in the system editor
6. Variant entries click opens variant `.md` files
7. [Fade Out] blanks output; [Fade In] restores it; active state highlights the active button
8. [End] clears output, both columns return to empty state, all three buttons grey out

- [ ] **Step 4: Commit**

```bash
git add src/renderer/control/App.tsx
git commit -m "feat: 3-column layout with song detail pane and Fade Out/Fade In/End controls"
```
