# Template Format

Templates are JSON files stored in the templates folder. They define the visual layout and styling of a presentation slide.

---

## Template File: `<name>.template.json`

```json
{
  "id": "two-language",
  "name": "Two Language",
  "description": "Primary text on top, translation below",
  "designResolution": { "width": 1920, "height": 1080 },
  "background": {
    "type": "color",
    "color": "#000000"
  },
  "parts": [
    {
      "id": "primary-text",
      "role": "primary",
      "geometry": { "left": 5, "top": 20, "width": 90, "height": 35 },
      "style": {
        "fontFamily": "Arial, sans-serif",
        "fontSize": 64,
        "fontWeight": "bold",
        "color": "#ffffff",
        "textAlign": "center",
        "lineHeight": 1.3
      },
      "verticalAlign": "middle",
      "hideWhenEmpty": false
    },
    {
      "id": "translation-ru",
      "role": "translation",
      "languageCode": "ru",
      "geometry": { "left": 5, "top": 58, "width": 90, "height": 28 },
      "style": {
        "fontFamily": "Arial, sans-serif",
        "fontSize": 42,
        "color": "#cccccc",
        "textAlign": "center",
        "lineHeight": 1.3
      },
      "verticalAlign": "top",
      "hideWhenEmpty": true
    },
    {
      "id": "song-title",
      "role": "title",
      "geometry": { "left": 5, "top": 88, "width": 60, "height": 8 },
      "style": {
        "fontFamily": "Arial, sans-serif",
        "fontSize": 24,
        "color": "#888888",
        "textAlign": "left"
      },
      "verticalAlign": "middle",
      "hideWhenEmpty": true
    },
    {
      "id": "copyright",
      "role": "copyright",
      "geometry": { "left": 65, "top": 88, "width": 30, "height": 8 },
      "style": {
        "fontFamily": "Arial, sans-serif",
        "fontSize": 18,
        "color": "#666666",
        "textAlign": "right"
      },
      "verticalAlign": "middle",
      "hideWhenEmpty": true
    }
  ]
}
```

---

## Schema Reference

### Template

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique identifier; matches filename stem |
| `name` | `string` | Display name in the UI |
| `description` | `string?` | Optional description |
| `designResolution` | `{ width, height }` | Resolution the template was designed for (geometry is %-based, so this is informational only) |
| `background` | `SlideBackground` | Slide background |
| `parts` | `TemplatePart[]` | All text/content regions |
| `sectionOverrides` | `Record<string, TemplatePart[]>?` | Part overrides for specific section types (e.g. chorus could use a different color) |

### SlideBackground

```json
{ "type": "color", "color": "#000000" }
{ "type": "gradient", "gradient": "linear-gradient(to bottom, #1a1a2e, #16213e)" }
{ "type": "image", "imageUrl": "backgrounds/cross.jpg", "opacity": 0.5 }
```

| Field | Type | Description |
|---|---|---|
| `type` | `'color' \| 'gradient' \| 'image' \| 'video'` | Background type |
| `color` | `string?` | CSS color value |
| `gradient` | `string?` | CSS gradient string |
| `imageUrl` | `string?` | Path relative to template file location |
| `videoUrl` | `string?` | Path relative to template file location |
| `opacity` | `number?` | 0–1, used as overlay opacity on image/video |

### TemplatePart

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique within this template |
| `role` | `PartRole` | What content this part shows (see below) |
| `languageCode` | `string?` | For `role: 'translation'` — which variant to pull from (must match a key in the song's `Variants`) |
| `staticText` | `string?` | For `role: 'custom'` — fixed text, not from the song |
| `geometry` | `PartGeometry` | Position and size as percentages |
| `style` | `TextStyle` | Typography |
| `verticalAlign` | `'top' \| 'middle' \| 'bottom'` | Vertical alignment within the part's box |
| `hideWhenEmpty` | `boolean?` | Hide this part if there's no content for it (default: false) |

### PartRole

| Role | Content source |
|---|---|
| `primary` | Lines from the main song file (first language) |
| `translation` | Lines from the variant file identified by `languageCode` |
| `title` | Song title; if `languageCode` is set, uses the variant file's `Title` |
| `copyright` | Song copyright from metadata |
| `section-label` | Name of the current section (e.g. "Verse 1", "Chorus") |
| `custom` | Static text from `staticText` field |

### PartGeometry

All values are **percentages of the output window dimensions** (0–100). This makes templates resolution-independent.

```json
{ "left": 5, "top": 20, "width": 90, "height": 35 }
```

At 1920×1080: left = 96px, top = 216px, width = 1728px, height = 378px.  
At 2560×1440: left = 128px, top = 288px, width = 2304px, height = 504px. Same layout, larger.

### TextStyle

All fields are optional. Unset fields inherit from the browser default.

| Field | Type | Example |
|---|---|---|
| `fontFamily` | `string` | `"Arial, sans-serif"` |
| `fontSize` | `number` | `64` (px) |
| `fontWeight` | `'normal' \| 'bold' \| number` | `700` |
| `fontStyle` | `'normal' \| 'italic'` | `"italic"` |
| `color` | `string` | `"#ffffff"` |
| `textAlign` | `'left' \| 'center' \| 'right'` | `"center"` |
| `lineHeight` | `number` | `1.4` (multiplier) |
| `letterSpacing` | `number` | `2` (px) |
| `textShadow` | `string` | `"2px 2px 4px rgba(0,0,0,0.8)"` |
| `textTransform` | `'none' \| 'uppercase' \| 'lowercase' \| 'capitalize'` | `"uppercase"` |

---

## Section Overrides

Use `sectionOverrides` to apply different styling for specific section types without creating a whole new template. The override merges with the base part — only specified fields are overridden.

```json
{
  "sectionOverrides": {
    "Chorus": [
      {
        "id": "primary-text",
        "style": { "color": "#ffd700", "fontSize": 72 }
      }
    ]
  }
}
```

The section name in `sectionOverrides` matches the section header in the song file (e.g. `[Chorus]` → key is `"Chorus"`).

---

## RTL Languages

The renderer automatically applies `direction: rtl` to parts where `languageCode` is a known RTL language (`he`, `ar`, `fa`, `ur`). No template configuration needed.

---

## Rendering

Each `TemplatePart` renders as an absolutely-positioned `div` inside a `100vw × 100vh` container. Inline styles are applied directly from `TextStyle` (not Tailwind — values are dynamic from JSON).

```
┌─────────────────────────────────────────────────────┐  100vw × 100vh
│                    Background                        │
│                                                      │
│   ┌──────────────────────────────────────────────┐   │  primary-text
│   │         Amazing grace, how sweet             │   │  top: 20%, height: 35%
│   │           the sound that saved               │   │
│   └──────────────────────────────────────────────┘   │
│   ┌──────────────────────────────────────────────┐   │  translation-ru
│   │       Удивительная благодать, как сладок     │   │  top: 58%, height: 28%
│   └──────────────────────────────────────────────┘   │
│   ┌──────────────────────┐  ┌───────────────────┐    │  title + copyright
│   │ Amazing Grace        │  │    Public domain  │    │  top: 88%, height: 8%
│   └──────────────────────┘  └───────────────────┘    │
└─────────────────────────────────────────────────────┘
```
