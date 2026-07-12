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

## Styling

- Import tokens from `src/theme` (`theme.colors.*`, `theme.borders.*`, etc.).
- Do not add hex literals in components when a theme token exists.
- `applyWebThemeColors()` in `main.tsx` mirrors tokens to `--ui-*` CSS variables for CSS/Tailwind.
- `entityCardStyles`, `featureReadout`, and `mixerSwipeConfig` live in `presentation/` — web helpers, not domain.

## Dependencies

- Custom UI only — **no shadcn/ui**, no component library.
- Icons: `lucide-react`.
- State: `zustand` (saved mixes persist to localStorage).

## TypeScript

- `strict: true` in `tsconfig.json`.
- Vite build does **not** run `tsc`; run `npx tsc --noEmit` to typecheck.
- Use `type` for unions/derived types; `interface` for props and object contracts.

## Conventions

- Match existing naming and import style in the file you edit.
- Minimize diff scope — no drive-by refactors.
- Entity ingredient colors stay in `domain/mix/entities.ts` (domain data, not theme).
