# README images

The main README uses two images made from the actual in-app SVG artwork:

- `catnap-banner.png` (1400 × 460): the Catnap wordmark and Mochi at the window. Use at the top of the README.
- `catnap-companions.png` (1400 × 260): the six real companion designs. Use as a small closing illustration, or omit it for an even shorter README.

The matching SVG files remain editable. `node tools/build-readme-art.cjs` rebuilds the vectors from `app/Cat.tsx` and `lib/palette.ts`. The PNGs are committed-ready assets and require no rendering dependency to view.

The most useful next images would be **real app captures**:

1. **Gameplay:** a partly solved 7×7 board, with several region-colored cats and a few X marks. Show the full board and assist controls. Save as `gameplay.png`.
2. **Journey:** the top of a chapter map with earned stars, the current-position cat, and a gift. Save as `journey.png`.
3. **Optional iPhone view:** a narrow gameplay capture demonstrating the touch controls. Save as `mobile.png`.

Keep captures free of browser chrome, notifications, usernames, and unrelated windows. Use actual gameplay rather than generated UI mockups. Demo progress is fine if labeled as a demonstration. Two side-by-side gameplay/journey captures are enough; an oversized gallery would make the README long again.

No gameplay or journey screenshot has been fabricated here. Automated browser capture is blocked by this Mac's process permissions, as recorded in `../verification.md`.
