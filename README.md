# TSNC texture comparison

A static React + Vite website using [react-compare-slider](https://github.com/nerdyman/react-compare-slider). Compare synchronized 360° video captures across 10 datasets, with independent left and right selections:

| Capture configuration | Website label |
| --- | --- |
| `bc1` | BC1 |
| `neural` | TSNC L1 |
| `neural_mse` | TSNC MSE |
| `uncompressed` | Uncompressed |

## Run locally

Use Node.js 22.12+ (or a current supported version).

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Select a dataset from the scrollable thumbnail strip, choose each method, then press play. Drag the divider or focus it and use arrow keys. Playback controls affect both videos. Switching a dataset or method resets playback to the first frame. At the end both videos pause and return to the beginning. The URL preserves the dataset and methods for sharing.

## Static build

```sh
npm run build
npm run preview
```

Publish the contents of `dist/` to any static host. Relative asset URLs support both a domain root and a GitHub Pages repository subdirectory. There is no backend or runtime API. Videos are loaded only for the active comparison; thumbnails are lazy loaded. Fonts use Google Fonts with local fallback fonts.

## Connect to GitHub later

The local repository uses `main`; no remote is configured. Create an empty GitHub repository, then run:

```sh
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

In that repository, open **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**. The included workflow builds and deploys on pushes to `main`; you can also run it manually from the Actions tab after enabling Pages.

## Capture assets

`public/media/` contains the 40 original MP4 files (about 208 MiB total) and 10 generated WebP posters, also used as thumbnails, and is tracked in Git. Individual videos are under 7 MiB, so Git LFS is not needed for this collection. The original `captures/` folder, including all raw PNG frames and logs, is excluded from Git and from the deployed site. The label “Uncompressed” identifies the source rendering configuration; the displayed capture itself is an encoded MP4.

The committed `src/datasets.json` maps all datasets to their media. To regenerate assets after updating your local captures:

```sh
npm run prepare:media
npm run build
git add public/media src/datasets.json
git commit -m "Update comparison captures"
```

The preparation script reads each capture manifest, verifies that all four methods have matching dimensions, frame rate and duration, copies the original videos, and makes thumbnails from uncompressed first frames. `captures/` is needed only for regeneration, not for builds or deployment. Removed datasets' old media should be removed from `public/media/` when replacing the collection.

## Validation

```sh
npm run build
npm test
```

Browser tests use installed Microsoft Edge (`channel: 'msedge'`) and check every dataset/method, actual decoded video dimensions, synchronization, scrubbing, swapping, fullscreen, replay reset, mobile layout and keyboard interaction. On a machine without Edge, change the Playwright channel to an installed browser, or remove it and run `npx playwright install chromium`.
