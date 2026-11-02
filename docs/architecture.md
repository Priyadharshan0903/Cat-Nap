# Architecture

One repository, one statically deployed application. React + TypeScript runs entirely on the device; Vite creates the GitHub Pages bundle. Motion animates placement and short celebrations. Single taps save an X immediately; a second tap within 330ms on the same cell promotes the original pre-gesture board into a cat placement. The pair occupies one undo step. Keyboard C/X controls remain explicit. SVG cats and room artwork are original code-native assets. Manrope is bundled for offline use.

The puzzle engine has no React or storage dependencies. An exact row-by-row solver verifies uniqueness; a separate deduction engine applies singles and shared exclusions across rows, columns, regions, and no-touch neighborhoods. Only boards fully solvable by that deduction engine enter the pack. Hints repair contradictory placements or accidental marks before offering the next placement. The default game shows rule conflicts but permits experimentation, with unlimited undo and assistance.

Levels are immutable data identified by stable IDs. The current 120-board pack goes from 5×5 to 9×9. Difficulty labels currently correspond to size. Daily boards deterministically transform validated pack boards using the device-local date.

Progress is a versioned JSON-compatible document. Games are keyed by level and device ID, with monotonic per-device revisions. Merge unions achievements, retains earliest completion and fastest time, and preserves separate board branches. The newest updated branch resumes by default; users can choose an alternative in Settings. Timestamps order independent-device branches; clock skew can affect the default choice but cannot delete the other branch.

A synchronous localStorage journal records each move before returning from the interaction. A serialized Dexie write records an independent IndexedDB copy. Startup validates and merges the copies. Saving status reflects successful persistence to at least one store. A service worker versions the complete compiled release, keeping offline HTML and assets consistent. Data is never stored in the service-worker cache; releasing an update preserves saves.

The application never sends progress to a server. Export/import is an explicit manual transfer. No accounts, backend services, runtime secrets, trackers, or APIs are needed. Browser/origin boundaries apply: different browsers, local preview versus production, and some installed iPhone web apps have independent storage. Export before changing origins.

Future automatic sync could be added behind the storage layer, with authentication and conflict handling. GitHub Pages itself cannot provide that backend. It is intentionally outside this version's scope.

The v1 save schema now accepts optional reward, star, and attempt-assistance fields. Legacy saves remain readable. Completion entitlements are derived from the union of completed puzzle IDs, so replays and duplicate imports cannot mint rewards. Spending/refill counters merge by per-device maxima and sum across devices. Starter credit is one constant shared across merged saves. Attempt hint receipts avoid charging again for an already revealed deduction. Star upgrades happen only on a real solve transition, never on a timer save or when opening an already solved legacy board.

The chapter map uses a scaled SVG route with real HTML level buttons, stars from saved completion records, the selected cat marking the current puzzle, and chapter gifts computed from the same completion data as the wallet. All regular levels remain open. Region coats are deterministic and distinct for all nine possible region IDs; companion selection remains independent.
