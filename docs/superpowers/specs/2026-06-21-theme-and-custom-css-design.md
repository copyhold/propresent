# Theme & Custom CSS — Design Spec

**Date:** 2026-06-21  
**Status:** Approved

## Summary

Wire up the already-persisted `AppConfig` fields (`theme`, `controlCss`, `presentationCss`) so they actually affect the running app. Theme applies only to the control window. The output (presentation) window receives only CSS injection.

---

## Architecture

### Config change propagation

After `CONFIG_SAVE` completes in the main process, it broadcasts a `CONFIG_CHANGED` IPC event (with the full merged `AppConfig`) to **all** `BrowserWindow` instances via `BrowserWindow.getAllWindows()`. Both windows subscribe and re-apply their respective concerns.

### Dark / light mode (control window only)

- **Dark = default.** The existing `@theme` values in `global.css` are dark (`#111`, `#1a1a1a`, …). No class change is needed for dark mode.
- **Light = `html.light` class.** A `html.light { }` override block in `@layer base` swaps the `app-*` CSS custom properties to inverted light values.
- **Tailwind `dark:` variant** is configured so future `dark:` utility classes work: `@custom-variant dark (&:where(.dark, .dark *))`.

Class management rules (applied to `document.documentElement`):

| Setting  | Classes on `<html>`         |
|----------|-----------------------------|
| `dark`   | `dark` (no `light`)         |
| `light`  | `light` (no `dark`)         |
| `system` | follows `prefers-color-scheme`; live-updates via `matchMedia` change listener |

### Custom CSS injection

A tiny shared helper `injectCss(id, css)` finds or creates a `<style id="…">` tag in `<head>` and replaces its content. Called with:
- `'control-custom-css'` + `config.controlCss` — in the control window
- `'presentation-custom-css'` + `config.presentationCss` — in the output window

---

## Files Changed

| File | Change |
|------|--------|
| `src/renderer/global.css` | Add `@custom-variant dark`; add `html.light { }` overrides in `@layer base` |
| `src/shared/ipc/channels.ts` | Add `CONFIG_CHANGED: 'config:changed'` |
| `src/main/ipc/config.ts` | Broadcast `CONFIG_CHANGED` to all windows after save |
| `src/preload/index.ts` | Add `onConfigChanged(cb)` listener |
| `src/renderer/env.d.ts` | Add `onConfigChanged` type |
| `src/renderer/shared/injectCss.ts` | New: `injectCss(id, css)` utility |
| `src/renderer/control/App.tsx` | On mount + config change: apply theme class, inject `controlCss`; listen for OS scheme changes when `system` |
| `src/renderer/output/App.tsx` | On mount + config change: inject `presentationCss` only |

---

## Light Theme Color Values

Semantic inversion of the dark scale:

| Token        | Dark     | Light    |
|--------------|----------|----------|
| `app-950`    | `#111`   | `#ffffff` |
| `app-900`    | `#1a1a1a`| `#f5f5f5` |
| `app-800`    | `#222`   | `#eeeeee` |
| `app-700`    | `#2a2a2a`| `#e0e0e0` |
| `app-600`    | `#444`   | `#cccccc` |
| `app-500`    | `#555`   | `#aaaaaa` |
| `app-400`    | `#666`   | `#888888` |
| `app-300`    | `#888`   | `#555555` |
| `app-200`    | `#aaa`   | `#333333` |
| `app-100`    | `#ccc`   | `#111111` |
| `accent-dark`| `#1a2a4a`| `#dce8ff` |
| `accent-song`| `#2a4a7f`| `#b8d0ff` |

`accent` (`#4a8fff`) is unchanged in both modes.

---

## Out of Scope

- No theme applied to the output/presentation window
- No FOUC prevention (Electron hides windows until ready; any flash is imperceptible)
- No per-song or per-template CSS overrides
