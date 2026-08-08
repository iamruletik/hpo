# Older Webflow snapshot (separate site)

Source: https://hpo-trial-e7ecbeff6e2fddb4101aa7254cec4.webflow.io/
(downloaded 2026-08-08)

## Important
This is a **different Webflow site/project entirely** — `data-wf-site`
is `6a6333317095a4826ddaceaf`, not `69d50584fecafe4b63f705ad` (the main
`hpo-trial.webflow.io` site we've been working from). Not just an older
page state of the same project — a separate Webflow project, likely the
other dev's version or an earlier staging clone.

Zero references to `iamruletik.github.io` anywhere in this page — this
version never used the GitHub Pages hosting pattern at all. Everything is
self-contained: **19 inline `<style>` blocks and 27 inline `<script>`
blocks**, all still embedded directly (nothing pulled from an external repo).
Also still loads GSAP + all plugins + split-type straight from Webflow's/
unpkg's CDN (unlike the main site, which now has none of that).

Substantially larger and less cleaned-up than the main site's snapshot —
this is the bulk of what's still unaudited.

## Contents
- `index.html` — full page markup (10,703 lines, 372KB — much larger than
  the main site's current 71-line cleaned-up version)
- `css/hpo-trial-old.webflow.shared.css` — this site's own Webflow base CSS
- `js/webflow.js`, `js/webflow.schunk.js` — this site's Webflow runtime bundle
- `images/` — 57 images (2 more than the main site's 55 — worth checking
  what's different when we get to it)
