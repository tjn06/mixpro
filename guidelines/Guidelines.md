# MIXpro — project guidelines

Concise rules for working in this codebase after the React/Vite refactor.

## Architecture

- **`src/app/`** — application shell, domain logic, UI components, hooks.
- **`src/theme/`** — design tokens (colors, borders, surfaces, chrome). Source of truth for styling.
- **`src/styles/`** — global CSS, layout, Tailwind entry. Web rendering layer only.

Domain code is plain TypeScript (no React). Keep it in `src/app/domain/` so it stays portable.

## Folder layout (`src/app/`)

```
App.tsx, BatchMixer.tsx     # entry + main screen orchestrator
components/
  batch-totals/             # totals screen UI
  mixer/                    # mixer cards, bucket, swipe, overlays
  sheets/                   # bottom sheets (save, load, input)
  shared/                   # header, long-press, icons
domain/
  recipe/                   # types + ratio math
  mix/                      # ingredient params + volume
  bucket/                   # bucket sizing + limits
  batch-totals/             # report text + share helpers
saved-mixes/                # types, store, display helpers
presentation/               # web-only styling wrappers over theme
hooks/
```

Navigation is in-memory screen state in `BatchMixer.tsx` — no router yet.

## Styling & theme

### Import rules (app code)

- Import from **`src/app/ui/tokens.ts`** — not `theme.colors`, `theme.borders`, or `theme.surfaces` directly.
- **Runtime colors** (must follow light/dark + contrast): use `cv`, `themeColorVar()`, or `recipeMetaVar`.
- **Layout/constants only** (heights, opacities, transitions, math): use `componentTokens`.
- Do not add hex literals in components when a token or CSS var exists.

`npm run lint:tokens` enforces this in `src/app/` (see `scripts/check-theme-tokens.mjs`). Run it when touching UI colors or styles.

### Appearance (4 modes)

Settings + `applyThemeAppearance()` in `main.tsx` support:

| | Default | High contrast |
|--|---------|---------------|
| **Dark** | `semantic.ts` + legacy bridge | `themePalettes.ts` → `darkHighContrastPalette` |
| **Light** | `themePalettes.ts` → `lightDefaultPalette` | `themePalettes.ts` → `lightHighContrastPalette` |

To tweak colors: edit **`src/theme/themePalettes.ts`** (light + HC) or **`src/theme/semantic.ts`** (dark default). Primitives live in `primitives.ts`.

### Token layers (`src/theme/`)

```
primitives → semantic → components → CSS vars (cv) → applyThemeAppearance()
```

- **`componentCssVars.ts`** — `cv` references (`var(--semantic-*)`, `var(--component-*)`).
- **`cssVars.ts`** — legacy `--ui-*` keys + `themeColorVar()`.
- **`themePaletteBuilder.ts`** — shared wiring from palette objects to CSS var entries.
- Feature-specific scheme vars: `mixerCssVars.ts`, `batchTotalsCssVars.ts`.

### CSS

- Prefer `var(--semantic-*)`, `var(--component-*)`, or `var(--ui-*)` in CSS — not hardcoded `rgba()` when a var exists.
- `entityCardStyles`, `featureReadout`, and `mixerSwipeConfig` live in `presentation/` — web helpers, not domain.

### Fonts

Loaded in `fonts.css`. Do **not** rely on Tailwind/browser `ui-sans-serif` / system defaults.

| Role | Family | Token / class |
|------|--------|----------------|
| UI chrome, labels, buttons | **Outfit** | `--font-ui` (default on `body` / `.app-frame`) |
| Numeric readouts | **DM Mono** | `--font-readout`, `.app-frame--mixer`, `.app-readout` |

Calculator sets `.app-frame--mixer` so values inherit mono; Outfit is set explicitly on chrome. Destination / Settings inherit Outfit from `.app-frame`.

### Typography scales

Four independent systems — do not mix roles.

| System | Role | Spec |
|--------|------|------|
| **1. Navigation bar** | Where you are | Title `--text-header-title` (~17px), weight **600**. Icons ~22–24px. Not a page heading. |
| **2. Navigation drawer** | Primary destinations | Items `--text-nav-item` (16px), weight **500**. Section labels `--text-page-section` (13px). Layout: `--nav-item-h` 56 / `--nav-item-pad-x` 20. |
| **3. Page content** | Hierarchy inside the scroll body | Heading `--text-page-title` (24–26) via `.destination-page__heading` when needed · Body 16 · Secondary 14 · Section 13 · Caption 12 |
| **4. Calculator** | Dense instrument UI | Keep `--text-ui-*`, recipe/card/lock/swipe/totals/share tokens (labels ~11px) |

`--text-page-title` is **content-only**. Never use it on `AppHeader`. Never remap `--text-ui-*` globally to enlarge destinations.

## Dependencies

- Custom UI only — **no shadcn/ui**, no component library.
- Icons: `lucide-react`.
- State: `zustand` (saved mixes persist to localStorage).

## TypeScript & checks

- `strict: true` in `tsconfig.json`.
- Vite build does **not** run `tsc`; run `npx tsc --noEmit` to typecheck.
- Run `npm run lint:tokens` before committing UI/theme changes.
- Use `type` for unions/derived types; `interface` for props and object contracts.

## Conventions

- Match existing naming and import style in the file you edit.
- Minimize diff scope — no drive-by refactors.
- Entity ingredient colors stay in `domain/mix/entities.ts` (domain data, not theme).
