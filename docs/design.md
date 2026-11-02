# Design decisions

Direction: Pastel consumer, seed 189953084, from the frontend design skill. Adapted to a puzzle interface rather than a finance dashboard. No direction redraws.

The screen's question is “Where does the next cat belong?” The colored territory board is the largest element. The companion window and original cat drawings give the product its face. Warm paper, forest ink, bundled Manrope, flat surfaces, and rounded controls support the quiet experience. Color distinguishes regions and cats rather than decorating statistics. The desktop grid is 220 + 480 + 220 + 2×48 = 1016px, inside 18px side padding; the responsive layout gives the board priority and folds navigation to the bottom on iPhone.

The palette budget is deliberately relaxed for puzzle data: distinct region colors are part of the rules. Optional region numbers provide another way to identify regions. Stage numbers and chapter numbers are real level identifiers. “Unlock” describes the actual cat progression mechanic, not marketing copy. The companion label supplies context for the illustrated cat. These account for the source style inspector's warnings. The two shadows belong only to the floating toast and modal dialog, where the style permits them.

Motion is feedback: spring placement, X marks, hint highlighting, and a short completion celebration. There is no waiting for an animation to finish before the next move. System reduced-motion preferences and the in-game gentler-motion setting are honored. Audio, haptics, and music are absent.

The level selector answers “What can I play next?” All levels are available. The cat collection answers “Who keeps me company?” Settings answers “How do I make this comfortable and keep my progress?” All figures come from actual local progress; there are no sample achievements or fabricated metrics.

The v1.1 update preserves the original board, typography, palette, and window companion. The tool switch is replaced by a quiet single/double tap guide. Each region now supplies a richer matching coat color to its cat. Journey opens a winding dotted route with pastel level nodes, earned stars, a current-position cat, small plant drawings, and a useful gift at each chapter’s end. Connections and stage numbers are actual map data; the current-position outline is a selected-state indicator. The map adapts the supplied screenshot’s wayfinding concept while retaining Catnap’s established visual identity. Reward pockets show real saved balances; all refills stay free.
