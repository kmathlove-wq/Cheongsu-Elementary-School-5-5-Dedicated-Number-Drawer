# Project Memory

- Browser cache busting is part of deployment correctness: when a JavaScript module changes, update the relevant import query chain and the `index.html` entry query so GitHub Pages clients load it.
- UI fixes reported as still broken require checking the actual geometry or event path, not only changing labels or nearby CSS.
- Wide pinball detours that move upward need non-crossing, monotonic path geometry and faster reverse camera tracking; otherwise the walls can overlap or the camera can show an empty course while balls move above it.
