# Catnap

This is the canonical Catnap checkout at /Users/priyadharshan.senthil/Desktop/Projects/CatNap. Edit the game here; do not update the older Developer Platform copy.

- Target GitHub Pages, including repository subpaths. Keep assets and service-worker URLs relative. No server routes or secret configuration.
- Keep gameplay free of ads, analytics, audio, vibration, and music. Hints and Find a cat use saved reward tokens, with free refills when empty. Never add paid or ad-gated assists.
- Preserve save compatibility. Do not replace boards under existing level IDs. Import merges achievements and keeps device-specific board branches.
- Run `npm test` and `npm run build` for changes to gameplay, saves, or deployment. Respect reduced motion and keyboard access.
- Consult the shared Workbench registry before launching a server; port 8820 is the intended Vite preview port. Never stop an unknown listener.

- Lives: start with 3; each rejected incorrect cat costs 1. Refill serially every 30 minutes up to 3. Persist countdowns across reloads, restarts, navigation, and backup imports. No paid or ad refill.
