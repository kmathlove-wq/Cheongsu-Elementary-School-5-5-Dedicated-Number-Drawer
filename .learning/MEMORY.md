# Project Memory

- Browser cache busting is part of deployment correctness: when a JavaScript module changes, update the relevant import query chain and the `index.html` entry query so GitHub Pages clients load it.
- UI fixes reported as still broken require checking the actual geometry or event path, not only changing labels or nearby CSS.
- A pinball section that is meant to make the map itself travel upward must replace a real gap in the descending main course, not be drawn over that course. Its post-turn ascent should stay non-crossing and use reverse camera tracking.
- Canvas animation changes need a frame-level runtime test in addition to syntax checks; drawing-only reference errors can freeze the first rendered frame while static smoke tests still pass.
