# Development and deployment

For an overview of the game, see [the README](../README.md).

## Run locally

Use Node.js 24 (minimum 22.13).

```sh
npm ci
npm run dev
```

Open the URL printed by Vite (normally http://127.0.0.1:8820). Check the shared Workbench catalog and the actual listener before starting another server. `npm run build` produces `dist/`; `npm run preview` serves that production build on the same port. Do not run dev and preview together.

## Deploy to GitHub Pages

1. Push the **contents of this repository folder**, including `.github/`, to the `main` branch of your GitHub repository. Do not include `node_modules/` or `dist/`.
2. In the repository, open **Settings → Pages → Build and deployment → Source** and select **GitHub Actions**.
3. Open **Actions → Deploy Catnap to GitHub Pages** and run it, or push a new commit to `main`.
4. Open the URL returned by the deployment job.

The workflow installs locked dependencies, runs logic, persistence, interface and offline-package checks, builds the game, and deploys `dist/`. Assets, the manifest, and the service worker use relative paths, so both `username.github.io/` and `username.github.io/repository-name/` work without changing the app's base URL. No environment variables or secrets are required.

For local Git initialized on a `codex/` branch, push to your chosen remote's `main` branch when ready. No GitHub repository has been created or published automatically.

## Install and play offline

Open the deployed site online once. The footer says **Ready for offline play** after the service worker installs and precaches the game, levels, artwork, and fonts. On iPhone, use Safari's Share → Add to Home Screen. On Mac, use your browser's install option.

A new release waits until existing Catnap tabs close before activating. This avoids mixing two versions or interrupting a move. Browser data remains across normal refreshes, browser closes, and device restarts. Private browsing, clearing website data, storage pressure, or deleting a browser profile can remove local data; keep an exported backup.

## Saves and transfers

Each move immediately writes a small JSON journal in `localStorage`, then updates an independent IndexedDB copy through Dexie. On startup the game validates and merges both copies, favoring the newest revision for each board. Completed levels never disappear when importing an older backup. Each device keeps its own board branch, so manual transfers preserve alternatives.

Use **Settings → Export save**, transfer the JSON file with AirDrop, iCloud Drive, or another method, then choose **Import save** on the other device. Saves are local to the browser and origin; there is **no automatic cloud sync**. An installed iPhone web app and Safari can have separate storage, so use export/import if changing where you play. Preview and production origins also have separate saves.

After an import, the backup’s last puzzle opens so the transfer is visible. Existing local boards are kept as alternatives, and a continued foreign board receives its own local copy. The latest updated board for a level resumes by default. Alternate saved boards for the current puzzle are available in Settings when present. Import rejects malformed saves, unknown levels, and out-of-range cells. Clearing or restarting a board retains achievements.

## Controls

- **Single tap** to mark an X, and tap the X again to clear it. **Double tap** to place a cat, or double tap an existing cat to clear it. Cats take the color of their region; the selected companion stays beside the board.
- **Drag** across cells to paint Xs. Existing cats and Xs stay in place; one Undo restores the whole stroke. Turn off **Drag to mark Xs** in Settings to scroll over the board on touchscreens.
- Choose **Garden**, **Seaside**, **Night**, or **Device** in Settings. Device follows system light/dark changes. Theme and drag preferences are included in backups.
- Right-click marks an X. Arrow keys move focus; C places a cat, X marks a square, Delete clears it.
- **Hint** explains an exclusion, focuses the relevant rows, columns, or colors, and dims unrelated cells. You can optionally mark the excluded squares X; it never places a cat. Opening a new hint uses one token; reopening the same hint on the same board is free, including after reload. Applying it is optional. General observation hints without an action are free.
- **Find a cat** places a correct cat; if an earlier cat makes the board unsolvable, it first helps remove that cat.
- Open **Journey** or **All 120 levels** for the winding chapter map. Every level is open. There are no lives, paid assists, or waiting periods.
- Three cats are available immediately; Olive, Peaches, and Cloud arrive after 8, 24, and 48 distinct puzzles.

## Useful gifts and stars

Start with **10 hint tokens and 5 Find a cat tokens**. Each new puzzle earns **1 hint**; every 5 distinct completed puzzles earns **2 cat assists**. Completing a whole chapter adds **3 hints and 1 cat assist**. Gifts are added automatically; no claim button is needed. Daily puzzles count toward the five-puzzle gift too.

When a pocket runs out, a free refill offers **3 hints** or **1 cat assist**, with no ads, payment, or waiting. Actionable hints are charged when first revealed, and cat assists when they place a cat. A misplaced-cat correction from Find a cat is free. Undo does not refund assistance; restarting begins a new star attempt without refunding spent tokens.

Earn **1 star** for completing a puzzle, **2** without Find a cat, and **3** without either assist. Replays can improve best stars without repeating first-clear gifts. The map’s 360-star total covers the 120 regular levels. Existing v1 saves remain valid: previous completions receive their completion gifts, while old untracked star ratings show one confirmed completion star until replayed.

Token spending and free refills use mergeable, device-specific counters. Importing the same or an older backup cannot repeatedly mint gifts, reset spending, or duplicate a refill. If independent offline devices overspend a shared starter balance before manual transfer, a free refill reconciles that deficit and adds the advertised amount.

## Validate

```sh
npm test
npm run build
npm run test:ui
```

Tests verify all 120 puzzles have connected regions, exactly one solution, and a complete deduction path; they also cover daily transformations, hint corrections, backup merging, malformed imports, and persistence through the JSON journal and IndexedDB. Difficulty currently follows board size; it is not an independently calibrated human difficulty score.

`npm run levels:generate` deterministically regenerates the reviewed pack; this can take a few minutes. Do not regenerate casually: changing a level's contents under an existing ID would invalidate existing saves. Publish changed boards under new IDs or provide an explicit migration.

The daily puzzle selects and transforms a board from the validated pack using the device's local calendar date. It works offline and may reuse an arrangement; it is not a server-supplied unique daily puzzle service.

## Source map

- `app/Game.tsx`, `app/Modal.tsx`, `app/JourneyMap.tsx`: interface, direct gestures, chapter map, and accessible dialogs.
- `lib/coaching.ts`, `lib/backup.ts`: exclusion-based teaching hints, validated file transfer, and browser download support.
- `lib/gestures.ts`, `lib/palette.ts`, `lib/rewards.ts`: tap interpretation, region cat colors, reward economy, and star criteria.
- `app/Cat.tsx`, `app/globals.css`: original SVG cats, window scene, responsive visuals, and animation.
- `lib/puzzle.ts`, `lib/levels.json`, `lib/catalog.ts`: rules, solver, deductions, level pack, daily selection.
- `lib/progress.ts`, `lib/storage.ts`, `lib/use-progress.ts`: save schema, validation, merging, and persistence.
- `tools/build-offline.mjs`: versioned offline cache generation.
- `.github/workflows/deploy.yml`: GitHub Pages build and deployment.

See `docs/architecture.md`, `docs/design.md`, and `docs/verification.md` for implementation decisions and verification limits.
