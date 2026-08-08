# Webflow reference snapshot (re-fetched)

Source: https://hpo-trial.webflow.io/ (re-downloaded 2026-08-08, mid-migration)

Superseded the original snapshot — the user has been deleting each custom-code
block from Webflow's embed panel as we migrate it into `src/`, so the old
snapshot no longer reflects the live page.

## State at time of this fetch
Custom code panel is now fully cleared: **zero** GSAP, SplitType, or
`iamruletik.github.io/hpo/*` references remain in the page. No dev/prod
bundle embed has been added back yet either. The two `<style>` blocks and two
inline `<script type="text/javascript">` blocks that remain are Webflow's own
boilerplate (empty style placeholders, WebFont.load config, the
touch-detection snippet) — not custom code, nothing to port from them.

Practical effect: as of this snapshot, the live site has none of its custom
animations/interactions running — everything is pending the `<script>`/`<link>`
embed tags from the project README being added back to Webflow.

## Contents
- `index.html` — current page markup
- `css/hpo-trial.webflow.shared.css` — Webflow's base/reset styles (new hash: f85ab2690)
- `js/webflow.js`, `js/webflow.schunk.js` — Webflow's runtime bundle (new hashes)
- `images/` — all 55 page images, unchanged from first fetch
