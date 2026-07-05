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

Open the URL shown in the terminal (typically `http://localhost:5173`).

## Scripts

| Command        | Description              |
| -------------- | ------------------------ |
| `npm run dev`  | Start development server |
| `npm run build`| Production build to `dist/` |

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

## GitHub

This repo is ready for an initial commit. `node_modules/` and `dist/` are ignored.

```bash
git add .
git commit -m "Initial commit: mobile batch mixer UI"
git branch -M main
git remote add origin https://github.com/<user>/<repo>.git
git push -u origin main
```

## Attributions

See [ATTRIBUTIONS.md](./ATTRIBUTIONS.md) for third-party licenses.
