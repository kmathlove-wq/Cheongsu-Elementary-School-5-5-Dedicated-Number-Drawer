# Project Memory

- Browser cache busting is part of deployment correctness: when a JavaScript module changes, update the relevant import query chain and the `index.html` entry query so GitHub Pages clients load it.
- UI fixes reported as still broken require checking the actual geometry or event path, not only changing labels or nearby CSS.
- A pinball section that makes the map itself travel upward must replace a real gap in the main course. The full detour should remain inside that gap and continue from its water ascent into a dry descending route before rejoining the main course at matching width.
- Canvas animation changes need a frame-level runtime test in addition to syntax checks; drawing-only reference errors can freeze the first rendered frame while static smoke tests still pass.
- Guided pinball branches need disjoint entry ranges, gap-free junctions with near-vertical tangents, constant-width bodies where required, non-crossing centerlines, and route-length-normalized travel times; verify both routes, junction geometry, containment, effects, leader selection, and camera deltas frame by frame.
- `settings.js`'s `.app-mode-option` class is wired to a global click handler that overwrites `pendingDrawStyle` and re-runs `updateAppModeOptions()`. Giving any unrelated button (e.g. a merge-count picker) that same class silently corrupts draw-style state and hides `pinballMapSettings`; reuse only the CSS rule set (add the class to the selector list), never the class itself, for new buttons.
