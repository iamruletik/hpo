# hpo — custom code repo for the Webflow-hosted site

Not the site itself. Layout/DOM lives in Webflow's editor at
https://hpo-trial.webflow.io/ — a static copy for reference is in
`backup/reference/webflow-site/`. To check real markup/CSS, curl the live
site instead of guessing.

## Stack

- Build: Vite, ES module output (`npm run build` → `dist/main.js` +
  `dist/3d.js` as the two files you embed, plus their shared dependency
  chunks `dist/vendor-gsap.js`/`dist/gsap.js`, and `dist/main.css`)
- Animation: GSAP 3.15 (ScrollTrigger, Draggable, InertiaPlugin, DrawSVGPlugin,
  ScrollToPlugin, MorphSVGPlugin — all free, bundled in the `gsap` package)
- 3D: `three` (footer scene — glass-material shader, GLTF model, EXR HDRI)
- Smooth scroll: `lenis`
- Text splitting: `split-type`

## Structure

- `src/core/` — shared infra (gsap plugin registration, lenis init, theme
  overlap helpers). Mirrors the pattern of extracting cross-cutting setup
  once, everything else imports from here.
- `src/main.js` — main entry point, wires up everything except the footer's
  3D scene
- `src/3d.js` — separate entry point, calls the footer scene's own init.
  Kept out of `main.js` because it pulls in `three` (~850KB) — a second,
  independent `<script>` tag in Webflow, loaded right after `main.js`'s.
  GSAP ends up a shared chunk (`vendor-gsap.js`) since both entries depend
  on it; the browser fetches it automatically via each entry's own `import`,
  no separate embed needed for it.
- `src/style.css` — entry stylesheet
- `backup/` — the original pre-Vite `script/`, `style/`, and the downloaded
  Webflow reference copy. Being migrated into `src/` one module at a time.

## Dev workflow

1. `npm run dev` — starts Vite at `http://localhost:5173`
2. In Webflow's page/site custom code (or a temporary embed), point both
   script tags at the local dev server so you can test against the real
   live page:
   ```html
   <script type="module" src="http://localhost:5173/src/main.js"></script>
   <script type="module" src="http://localhost:5173/src/3d.js"></script>
   ```
   CSS is injected automatically by Vite in dev — no separate `<link>` needed.
3. Edit files in `src/`, changes hot-reload on the live Webflow page.
4. When done, swap the embeds back to the production tags below and push.

## Production

Pushing to `main` triggers `.github/workflows/static.yml`, which runs
`npm ci && npm run build` and deploys `dist/` to GitHub Pages. Filenames are
fixed (not hashed), so the embed URLs never change:

```html
<link rel="stylesheet" href="https://iamruletik.github.io/hpo/main.css">
<script type="module" src="https://iamruletik.github.io/hpo/main.js"></script>
<script type="module" src="https://iamruletik.github.io/hpo/3d.js"></script>
```

Both are ES modules now (`type="module"`, same as dev) — modules are deferred
by spec, so the DOM is already parsed before either runs; no
`DOMContentLoaded` guards needed. `3d.js` should come after `main.js` in
source order, matching the dev tags above.
