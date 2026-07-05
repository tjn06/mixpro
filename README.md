# Mobile Input Range Slider

Mobile batch-mixing UI built with React and Vite. Swipe vertically to adjust mix amounts (total, resin, hardener, filler, thickener), with recipe ratios, bucket fill estimation, save/undo, and lock mode.

Based on the [Figma design](https://www.figma.com/design/gIjHJzP81waDbN9irg40a0/Mobile-Input-Range-Slider).

## Stack

- React 18
- Vite 6
- Tailwind CSS 4
- TypeScript / TSX

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:5173/mixmate/` after starting the dev server.

## Scripts

| Command        | Description              |
| -------------- | ------------------------ |
| `npm run dev`  | Start development server at `/mixmate/` |
| `npm run build`| Production build to `dist/` |
| `npm run preview` | Preview production build locally |

## GitHub Pages

The app is configured for a project repo named **`mixmate`**:

- Vite `base` is `/mixmate/` (see `vite.config.ts`)
- Live URL: `https://<username>.github.io/mixmate/`

### One-time GitHub setup

1. Create the repo as `mixmate` on GitHub.
2. Push this project to the `main` branch.
3. In the repo: **Settings → Pages → Build and deployment → Source**: choose **GitHub Actions**.

Pushes to `main` run `.github/workflows/deploy.yml`, which builds and deploys `dist/`.

### Local URLs

- Dev: `http://localhost:5173/mixmate/`
- Preview after build: `npm run build && npm run preview` → `http://localhost:4173/mixmate/`

## Project structure

```
src/
  app/
    BatchMixer.tsx      # Main mixer UI and swipe editor
    components/         # Header, bucket, buttons, shadcn/ui
    recipe*.ts          # Recipe model and ratio math
    bucket*.ts          # Bucket capacity and fill limits
    mixVolume.ts        # Volume estimation
  styles/               # Global CSS and fonts
```

## Initial commit

This repo is ready for an initial commit. `node_modules/` and `dist/` are ignored.

```bash
git add .
git commit -m "Initial commit: mobile batch mixer UI"
git branch -M main
git remote add origin https://github.com/<user>/mixmate.git
git push -u origin main
```

## Attributions

See [ATTRIBUTIONS.md](./ATTRIBUTIONS.md) for third-party licenses.
