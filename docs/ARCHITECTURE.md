# ProPresent — Architecture

## Overview

ProPresent is a desktop lyrics presentation application built with Electron. It reads song files from a watched folder and presents them on multiple screens. The app has no built-in song editor — songs are plain Markdown files managed outside the app.

---

## Technology Stack

| Layer | Choice | Reason |
|---|---|---|
| Desktop shell | **Electron** | Reliable multi-monitor APIs (`screen.getAllDisplays()`), mature ecosystem |
| Renderer framework | **React + TypeScript** | Strong Electron ecosystem, good tooling |
| Build system | **electron-vite** | Fast HMR, handles main/preload/renderer split natively |
| State management | **Zustand** | Low boilerplate, TypeScript-native (control window only) |
| File validation | **Zod** | Runtime schema validation for song/template JSON |
| File watching | **chokidar** | Reliable cross-platform folder watching |
| Output rendering | **CSS/HTML inline styles** | Handles RTL (Hebrew/Arabic), DevTools-debuggable, no text-measurement code |

---

## Window Architecture

```
Monitor 1 ─── Control Window (BrowserWindow)
               renderer-control React app
               Full song library + slide navigator + template picker

Monitor 2 ─── Output Window 1 (BrowserWindow, fullscreen)
               renderer-output React app
               Passive: only renders what main process sends

Monitor 3 ─── Output Window 2 (BrowserWindow, fullscreen, optional)
               Same renderer-output React app
               Can mirror output 1 or show a different template
```

Windows are positioned at creation time using `display.bounds.x / y` from `screen.getAllDisplays()`. On single-monitor setups (dev mode), the output window opens on the primary display.

---

## Process Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Main Process (Node.js)                │
│                                                         │
│  SongLibrary ──── chokidar watcher                      │
│  TemplateLibrary ─ reads .template.json files           │
│  PresentationStore ─ owns live session state            │
│                                                         │
│  IPC handlers: songs:*, templates:*, present:*          │
└──────────────┬──────────────────────────┬───────────────┘
               │ invoke (request/reply)    │ send (broadcast)
               │                          │
┌──────────────▼──────────┐   ┌───────────▼───────────────┐
│   Control Renderer      │   │   Output Renderer(s)       │
│   React + Zustand       │   │   Stateless paint surface  │
│   Song list             │   │   Receives OutputRender-   │
│   Slide navigator       │   │   Payload, renders to DOM  │
│   Template quick-select │   │                           │
└─────────────────────────┘   └───────────────────────────┘
```

**Key principle:** Unidirectional data flow. Control window sends commands via `ipcRenderer.invoke`. Main process updates state and broadcasts `output:render` (fully resolved slide + template) to output windows. Output windows never invoke IPC — they only paint.

---

## Package Structure

```
propresent/
├── package.json                    # workspace root
├── electron-vite.config.ts
├── tsconfig.base.json
│
├── packages/
│   ├── shared/                     # zero-dependency types + Zod schemas
│   │   └── src/
│   │       ├── models/
│   │       │   ├── Song.ts         # CompiledSong, CompiledSection, CompiledSlide
│   │       │   ├── Template.ts     # Template, TemplatePart, TextStyle, SlideBackground
│   │       │   └── Presentation.ts # PresentationState, OutputRenderPayload
│   │       └── ipc/
│   │           └── channels.ts     # IPC channel names + payload types
│   │
│   ├── main/                       # Electron main process
│   │   └── src/
│   │       ├── index.ts            # app entry, creates windows
│   │       ├── windows.ts          # display-aware BrowserWindow factory
│   │       ├── parser/
│   │       │   ├── songParser.ts   # .md file → RawSong (pure function)
│   │       │   └── songCompiler.ts # RawSong + variants → CompiledSong (pure function)
│   │       ├── store/
│   │       │   ├── SongLibrary.ts  # chokidar watcher + compiled song cache
│   │       │   ├── TemplateLibrary.ts
│   │       │   └── PresentationStore.ts  # live session state + resolve logic
│   │       └── preload/
│   │           ├── control.ts      # contextBridge for control window
│   │           └── output.ts       # contextBridge for output window (onRender only)
│   │
│   ├── renderer-control/           # Control window app
│   │   └── src/
│   │       ├── App.tsx
│   │       ├── store/index.ts      # Zustand store
│   │       └── components/
│   │           ├── SongList/
│   │           ├── SlideNavigator/
│   │           ├── TemplateSelector/
│   │           └── OutputPreview/  # live miniature preview of current slide
│   │
│   └── renderer-output/            # Output window app (used for both monitors 2 & 3)
│       └── src/
│           ├── App.tsx
│           └── components/
│               ├── SlideRenderer/  # renders ResolvedSlide + Template → DOM
│               └── SlidePart/      # one absolutely-positioned text block
│
└── docs/                           # this directory
```

---

## Data Models

### CompiledSong (`packages/shared/src/models/Song.ts`)

```ts
interface CompiledSong {
  id: string                     // derived from filename stem
  filePath: string               // absolute path to main .md file
  title: string                  // from main file header
  titleTranslations: Record<string, string>  // langCode → title from variant headers
  mood: string[]
  recommendedTemplates: string[] // from Template: field
  languages: string[]            // ['primary', ...variant langCodes in order]
  sections: CompiledSection[]
}

type SectionType = 'verse' | 'chorus' | 'bridge' | 'pre-chorus' | 'intro' | 'outro' | 'custom'

interface CompiledSection {
  name: string        // raw display name, e.g. "Verse 1", "Chorus"
  type: SectionType   // parsed from name; 'custom' if unrecognised
  number?: number     // ordinal for numbered sections (Verse 1 → 1, Verse 2 → 2)
  slides: CompiledSlide[]
}

interface CompiledSlide {
  id: string                          // `${sectionName}-${index}`
  lines: Record<string, string[]>     // langCode → lines; 'primary' for main file
}
```

`type` and `number` are set by the parser, not stored in the file — they are derived from the section name. See [SONG_FORMAT.md](./SONG_FORMAT.md#section-types-and-keyboard-shortcuts) for the full name→type mapping.

### PresentationState (`packages/shared/src/models/Presentation.ts`)

```ts
interface PresentationState {
  activeSongId: string | null
  currentSlideIndex: number          // flat index across all sections' slides
  templateId: string
  outputMode: 'live' | 'blank' | 'logo'
  output2Mode: 'mirror' | 'custom' | 'off'
  output2TemplateId?: string
}
```

Navigation (arrows, keyboard shortcuts, slide grid clicks) all resolve to a flat `currentSlideIndex` change via `present:gotoSlide`. No other state changes.

---

## Keyboard Navigation

Keyboard shortcuts in the control window allow jumping directly to a section without clicking through slides. They resolve to a `present:gotoSlide` call — **no new IPC channels, no data model changes**.

| Key | Action |
|---|---|
| `1`, `2`, `3` … | Jump to Verse 1, Verse 2, Verse 3 … (first slide of that section) |
| `c` | Jump to Chorus |
| `b` | Jump to Bridge |
| `→` / `Space` | Next slide |
| `←` | Previous slide |
| `Escape` | Blank output |

### Resolution logic (control renderer)

```ts
function resolveKey(key: string, song: CompiledSong): number | null {
  const digit = parseInt(key)
  if (!isNaN(digit)) {
    const target = song.sections.find(s => s.type === 'verse' && s.number === digit)
    return target ? flatIndexOfSection(song, target) : null
  }
  const typeMap: Record<string, SectionType> = { c: 'chorus', b: 'bridge' }
  const target = song.sections.find(s => s.type === typeMap[key])
  return target ? flatIndexOfSection(song, target) : null
}

// On match:
ipcRenderer.invoke('present:gotoSlide', resolveKey(key, activeSong))
```

`flatIndexOfSection` sums the slide counts of all sections before the target section.

---

## IPC Contract

All channel names and payload types are defined in `packages/shared/src/ipc/channels.ts`.

### Control → Main (invoke)

| Channel | Input | Output |
|---|---|---|
| `songs:list` | — | `CompiledSong[]` |
| `songs:get` | `id: string` | `CompiledSong` |
| `songs:reload` | — | `void` |
| `templates:list` | — | `Template[]` |
| `templates:get` | `id: string` | `Template` |
| `present:loadSong` | `{ songId, templateId? }` | `PresentationState` |
| `present:gotoSlide` | `index: number` | `PresentationState` |
| `present:nextSlide` | — | `PresentationState` |
| `present:prevSlide` | — | `PresentationState` |
| `present:setMode` | `'live' \| 'blank' \| 'logo'` | `PresentationState` |
| `present:setTemplate` | `templateId: string` | `PresentationState` |
| `present:clear` | — | `PresentationState` |
| `display:list` | — | `Electron.Display[]` |

### Main → Renderers (send / broadcast)

| Channel | Receivers | Payload |
|---|---|---|
| `present:stateChanged` | control | `PresentationState` |
| `library:changed` | control | `{ type, id, action }` |
| `output:render` | output1, output2 | `OutputRenderPayload` |

---

## State Flow: Slide Change

```
1. User presses → in control window
2. control calls ipcRenderer.invoke('present:nextSlide')
3. Main: PresentationStore.nextSlide() → increments currentSlideIndex
4. Main: resolves OutputRenderPayload (looks up song + template, builds content map)
5. Main: sends 'output:render' to output1 and output2 webContents
6. Main: sends 'present:stateChanged' to control webContents
7. Output renderer receives payload → React re-renders SlideRenderer
8. Control renderer receives state → updates slide navigator highlight
```

---

## File Watching Flow

```
1. chokidar detects .md file added/changed in songs dir
2. songParser reads and parses the file header + content
3. If file is a variant: reverse-index lookup finds parent song ID
4. songCompiler merges main file + all variants → CompiledSong
5. SongLibrary updates cache
6. Main broadcasts 'library:changed' to control window
7. Control window Zustand store reloads song list
```
