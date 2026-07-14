# MIXpro

Mobile batch-mixing UI built with React and Vite. Swipe vertically to adjust mix amounts (total, resin, hardener, filler, thickener), with recipe ratios, bucket fill estimation, saved mixes, batch totals, and lock mode.

## Stack

- React 18
- Vite 6
- Tailwind CSS 4
- TypeScript (strict)
- Zustand (saved mixes, persisted to localStorage)
- Lucide React (icons)
- date-fns (saved-mix timestamps)

Custom UI only — no component library.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:5173/mixpro/](http://localhost:5173/mixpro/) after starting the dev server.

## Scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Start development server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint:tokens` | Theme guardrail — blocks legacy `theme.colors` and compile-time color tokens in `src/app` (use `cv` / `themeColorVar()` instead) |
| `npx tsc --noEmit` | Typecheck (not run automatically by Vite build) |

Run `npm run lint:tokens` when adding or changing UI colors/styles in `src/app/`. See [guidelines/Guidelines.md](./guidelines/Guidelines.md#styling--theme).

Vite `base` is `/mixpro/` (see `vite.config.ts`).

## GitHub Pages

Deploy via GitHub Actions (`.github/workflows/deploy.yml`) on push to `main`.

1. In the repo: **Settings → Pages → Build and deployment → Source** → **GitHub Actions**.
2. Ensure the Vite `base` in `vite.config.ts` matches your Pages URL path (e.g. `/mixpro/` for `https://<user>.github.io/mixpro/`).

Local URLs:

- Dev: `http://localhost:5173/mixpro/`
- Preview: `npm run build && npm run preview` → check terminal for the preview URL

## Project structure

```
src/
  main.tsx                 # Entry; applies web theme CSS vars
  app/
    App.tsx                # Root component
    BatchMixer.tsx         # Main screen orchestrator
    components/
      batch-totals/        # Totals screen + share bar
      mixer/               # Cards, bucket, swipe, overlays
      sheets/              # Save/load/input bottom sheets
      shared/              # Header, long-press, icons
    domain/
      recipe/              # Recipe types + ratio math
      mix/                 # Ingredient params + volume
      bucket/              # Bucket sizing + limits
      batch-totals/        # Report text + share helpers
    saved-mixes/           # Types, store, display helpers
    presentation/          # Web styling wrappers over theme
    hooks/
  theme/                   # Design tokens, palettes, runtime appearance (see Guidelines)
  styles/                  # Global CSS, layout, Tailwind
  app/ui/tokens.ts         # App import point for cv, themeColorVar, componentTokens
```

See [guidelines/Guidelines.md](./guidelines/Guidelines.md) for architecture, theme rules, and coding conventions.

## Attributions

See [ATTRIBUTIONS.md](./ATTRIBUTIONS.md) for third-party licenses.
