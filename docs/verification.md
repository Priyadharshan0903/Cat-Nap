# Verification

Verified on November 2, 2026.

- A fresh extracted source package passes `npm ci`, all tests, TypeScript checks, the production build, interface integration checks, and offline-package checks using only its locked dependencies.
- 145 automated tests cover the complete puzzle pack, hint validity, daily transformations, completion merging, malformed imports, and localStorage/IndexedDB restoration, single/double tap semantics, reward entitlements, refill merging, legacy compatibility, and star upgrades.
- The built React interface passes DOM integration checks for single/double tapping with one-step undo, distinct region-colored cats, persistent token use, free refills, three-star replays without duplicate gifts, chapter map navigation, legacy solved-board restoration, and hint application, undo after a hint, manual marking, region-number preferences, winning a level, reload restoration, cat selection, daily play, pause/resume, all 120 levels, JSON export, merge import, and rejecting invalid imports.
- The generated service worker passes a simulated offline check under `https://example.github.io/catnap/`: cached HTML and JavaScript work with the network unavailable, repository-relative manifest and icon paths resolve, and activation preserves other applications' caches. This is a service-worker harness, not a real browser's offline verification.
- The production site returns HTTP 200 from the existing local server under `/catnap/game/dist/`, matching a repository-subpath deployment.
- The frontend design source check reports no failures. Its warnings concern actual numbered levels, the real cat unlock mechanic, and the companion label; see design.md.

Visual QA remains unverified. Both the installed Chrome and a temporary headless Chromium were attempted. macOS prevents the browser from registering its MachPortRendezvousServer (`bootstrap_check_in ... Permission denied`), including after an escalation request. No screenshots or real iPhone/Safari tests were produced. The DOM checks do not verify pixel layout, touch feel, real animation performance, or browser-specific PWA installation/offline behavior.

Before relying on the deployed game, open it on Mac and iPhone and check the board layout, a hint, Find a cat, refresh restoration, export/import, and offline reopening after installation. The GitHub repository destination and Pages publication have not been configured on a remote account.
