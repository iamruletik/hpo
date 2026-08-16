# Safari / WebKit gotchas — working reference

**Compiled:** August 2026
**Current release:** Safari 26.6 (July 2026)
**Scope:** things that actually still break in 2026. Anything fixed before Safari 18 is omitted.

## Read this first

1. Most "Safari bug" advice online is stale. A large share of it was fixed between Safari 15 and 18. Don't paste `-webkit-` prefixes reflexively — check Feature Flags in Develop menu first.
2. "Safari" is four targets, not one:
   - macOS Safari 26.x
   - iOS Safari 26.x
   - In-app `WKWebView` (Instagram, Telegram, LinkedIn browsers) — different feature set, no reliable service worker
   - Users pinned to Safari 18.x — Safari 26.6 only ships to macOS Sonoma and later
3. The simulator does not reproduce compositing, memory, or browser-chrome bugs. Test on a real device.
4. Version cadence: Safari 26.0 (Sep 2025), 26.4 (Mar 2026), 26.5 (May 2026, 63 bug fixes), 26.6 (Jul 2026).

---

## 1. iOS 26 "Liquid Glass" / browser chrome

The single biggest new source of breakage. Apple made browser chrome sample the page's CSS and shipped **zero documentation** for it. `theme-color` is now ignored entirely.

**The tinting algorithm (reverse-engineered by the community):** Safari scans `position: fixed` and `position: sticky` elements near the viewport edges (~4px top, ~3px bottom, 80% viewport width) and reads two properties off *the element itself*: `background-color` and `backdrop-filter`.

**Not sampled:** `position: absolute` children, pseudo-elements, `theme-color`, root background images/video, normal flow content.
**Sampled anyway:** elements at `opacity: 0`, elements with `pointer-events: none`.

| Problem | Fix |
|---|---|
| Glassmorphism fixed header tints the status bar | Fixed parent stays transparent. Move `background-color` + `backdrop-filter` onto a `position:absolute; inset:0` child |
| Hidden modal backdrop tints the bottom toolbar dark | Use `display: none` when closed, not `opacity: 0`. Set `display:block` then add the opacity class in the next rAF |
| White/black bar behind bottom toolbar | `viewport-fit=cover` in the meta tag + explicit `background-color` on `html`. Transparent root falls back to white |
| Fullscreen media page shows fallback color behind status bar | Scroll runway: make body taller, offset the app with `margin-top`, auto-scroll to that offset on load. Safari only composites real pixels at non-zero scroll |
| Overlay open + software keyboard = sharp unblurred page in the accessory-bar gap | Native layer outside your compositing context. Only fix: `filter: blur()` on the source content. `brightness()` and `opacity` do not carry through |
| `body { overflow: hidden }` makes chrome states worse | Lock the app shell (`height:100dvh; overflow:hidden`), keep `html` scrollable |

Minimal shape:

```css
:root {
  --chrome-bg: #a8aca0;
  --top-bleed: 62px;
  --bottom-bleed: 136px;
}

html {
  min-height: 100%;
  overflow-y: scroll;
  overscroll-behavior: none;
  background-color: var(--chrome-bg);
}

body {
  min-height: calc(100dvh + var(--top-bleed));
  margin: 0;
  background-color: var(--chrome-bg);
}

.app { height: 100dvh; margin-top: var(--top-bleed); overflow: hidden; }

.stage {
  height: calc(100dvh + var(--top-bleed) + var(--bottom-bleed));
  margin-top: calc(-1 * var(--top-bleed));
}
```

```js
// run once after layout mounts on mobile
const offset = parseFloat(
  getComputedStyle(document.documentElement).getPropertyValue('--top-bleed')
) || 0;
if (matchMedia('(max-width: 760px)').matches && scrollY < offset) {
  scrollTo({ top: offset, behavior: 'instant' });
}
```

WebKit bug #302272 (dup of #300965) — closed as **by design**. Not getting fixed.

---

## 2. Viewport & units

| Problem | Fix |
|---|---|
| `100vh` includes the collapsed toolbar | `100svh` / `100dvh` (Safari 15.4+) |
| `100dvh` jitters during address-bar animation | `svh` for layout, JS for the delta. Never animate against `dvh` |
| Keyboard open → `position:fixed` floats mid-screen | `visualViewport` `resize`/`scroll` listeners. Layout viewport doesn't shrink on iOS |
| `env(safe-area-inset-*)` returns 0 | Requires `viewport-fit=cover` |
| Text auto-inflates in landscape | `-webkit-text-size-adjust: 100%` |
| Overlay scrollbars change effective width vs Chrome | `scrollbar-gutter: stable`. Don't measure assuming a 15px bar |

---

## 3. Layout & CSS

| Problem | Fix |
|---|---|
| Children escape `border-radius` during transform/animation | `isolation: isolate` on parent, or `-webkit-mask-image: radial-gradient(#fff, #000)` |
| `position:fixed` acts absolute inside ancestor with `transform`/`filter`/`backdrop-filter` | Spec-correct, but Safari adds extra breakage. Portal to `body` |
| `position: sticky` in `thead` / `tr` | Still unresolved. Apply sticky to `th`/`td` |
| Sticky inside flex/grid silently dead | Parent needs `overflow: visible` + resolvable height up the ancestor chain |
| `mix-blend-mode` kills GPU accel of the subtree | Isolate in its own stacking context, or bake the blend into a texture |
| Flex children overflow instead of shrinking | Explicit `min-height: 0` / `min-width: 0` |
| Tailwind v4 `color-mix()` fallbacks render wrong in nested `@supports` | Known WebKit bug. Tailwind ships an intermediate `& { }` rule — just update |
| Anchor positioning misbehaves | Shipped Safari 26; real-world fixes only landed in 26.5 (3+ anchor chains, unitless zero fallback, viewport units in MQ). Feature-detect |
| `ic` unit / `zoom` wrong at page zoom | Fixed in 26.6 |

---

## 4. SVG

| Problem | Fix |
|---|---|
| Inline SVG collapses or fills 100% in a flex container | Always set `viewBox` **and** explicit `width`/`height` attributes, then `width:100%; height:auto` in CSS |
| CSS-animated SVG children rotate around the wrong origin | `transform-box: fill-box`. Safari defaults to `view-box` |
| `transform-origin: 50%` differs from Chrome | `fill-box` + percentages, or absolute user units |
| External `<use href="sprite.svg#id">` doesn't load | Inline the sprite, or fetch + inject |
| SVG in `<img>` can't be styled or animated | Inline it, or pass params via query string on a data URI |
| `mask` ignored | Keep `-webkit-mask` for Safari ≤17 |
| `feGaussianBlur` and SVG filters tank framerate | Rasterize at build time, or use CSS `filter: blur()` (fast path) |
| Gradient interpolation differs | `color-interpolation` for SVG gradients only shipped in 26.5 |

---

## 5. Rendering & performance

| Problem | Fix |
|---|---|
| `backdrop-filter` over scrolling content destroys FPS | Repaints every frame. Use a static blurred snapshot layer, or shrink the blurred area |
| `filter: blur()` cost scales with backing-store area | Blur a downscaled element and `transform: scale()` it up. Radius >20px fullscreen is a non-starter on iPhone |
| Flicker / z-fighting on 3D transforms | `backface-visibility: hidden` + `transform: translateZ(0)` on the animated element only |
| `will-change` everywhere → tab reload | Each promoted layer allocates GPU memory. iOS kills tabs around 1–1.5 GB. Add on interaction, remove after |
| Large `box-shadow` blur radius jank | Pre-blurred pseudo-element or an image |
| "A problem repeatedly occurred" | Memory, essentially always. Audit the Layers pane in Web Inspector |

---

## 6. Scroll & touch

| Problem | Fix |
|---|---|
| Body scroll-lock leaks to the page | `overscroll-behavior: none` on `html` + `position:fixed; top:-Ypx` on body, restore on close |
| ScrollTrigger positions shift when toolbar collapses | `ScrollTrigger.normalizeScroll(true)` + `ScrollTrigger.config({ ignoreMobileResize: true })` |
| Rubber-band overscroll fights pinned sections | `overscroll-behavior-y: none`. Can't fully disable at document level on iOS |
| `:hover` sticks after tap | `@media (hover: hover) and (pointer: fine)` |
| `touch-action: none` breaks back-swipe | Scope to the canvas/carousel element only |
| Lenis / smooth-scroll stutters on iOS | Momentum is off-main-thread; you can't beat it. Disable smooth scroll on touch |
| Scroll-driven animations glitch | Shipped 26.0, multiple fixes in 26.5. Test against 26.0 devices |

---

## 7. Forms

| Problem | Fix |
|---|---|
| Page zooms when an input is focused | `font-size: 16px` minimum on inputs. No exceptions |
| Autofill forces yellow/blue background | `box-shadow: inset 0 0 0 1000px <color>` on `:-webkit-autofill`. `background-color` is ignored |
| `<select>`, `date`, `time` refuse to style | `appearance: none` gets you partway. The picker is native and unstylable — custom widget or accept it |
| `input[type=search]` native clear button | `::-webkit-search-cancel-button { display: none }` |
| `<button>` inherits native chrome | `appearance: none; font: inherit` in the reset |

---

## 8. Media

| Problem | Fix |
|---|---|
| Video won't autoplay | Needs `muted` + `playsinline` + `autoplay`. Low Power Mode blocks it regardless — always ship a poster |
| Video goes fullscreen instead of inline | `playsinline` attribute, not CSS |
| Several simultaneous videos stall | Limited hardware decode sessions on iPhone. Serialize, or use image formats for decorative loops |
| MSE missing on iPhone | Managed Media Source since Safari 17.1. Below that, HLS only |
| `MediaRecorder` output isn't WebM | Safari emits MP4/H.264. Branch your mimeType detection |
| AV1 plays on Mac but not iPhone | Hardware-gated: M3+ Macs, M4 iPad Pro, iPhone 15 Pro / 16 families only. **No software decoder exists.** Always ship HEVC or H.264 fallback |
| Web Audio silent | `AudioContext` starts suspended — `resume()` inside a user gesture. Silent switch mutes it unless a `<audio>` element is also playing |
| Sample rate isn't 48k | iOS reports hardware rate; Bluetooth can drop it to 16k. Read `ctx.sampleRate`, never assume |

---

## 9. WebGL / Canvas / GPU

| Problem | Fix |
|---|---|
| `WebGL: context lost` on load | Recurring and real — broad reports across iOS 18.2–18.4 (iPad 9, iPhone SE/XR/11) with no abnormal memory beforehand; iOS 18.7.2 broke all WebGL content outright. **Always** implement `webglcontextlost` / `webglcontextrestored` and re-upload resources |
| Context lost on backgrounding the tab | Same handler. Textures do not survive a tab switch |
| Canvas allocation fails silently | Hard total-canvas-memory cap on iOS (WebKit #195325). Cap DPR at 2, dispose offscreen canvases explicitly |
| Resizing a WebGL canvas leaks memory | Long-standing iOS-only leak (WebKit #219780). Debounce resize, reuse one canvas |
| Compressed textures don't load | iOS has ASTC/PVRTC, not S3TC/DXT. Ship KTX2 + Basis and let the transcoder pick |
| No GPU timing | `EXT_disjoint_timer_query` absent. Use the Timelines panel |
| Shader compiles in Chrome, fails in Safari | ANGLE→Metal is stricter: no implicit int/float casts, no non-constant loop bounds, explicit `highp` in fragment shaders |
| `toDataURL()` returns blank | `preserveDrawingBuffer: true`, or read back in the same frame as the draw |
| Too many contexts | Safari drops the oldest past ~8–16. One shared renderer with scissored views |
| WebGPU unreliable | Shipped in Safari 26, but device-lost failures documented under Emscripten/WASM on macOS and iOS 26. Keep the WebGL path |

---

## 10. JS, storage, lifecycle

| Problem | Fix |
|---|---|
| `new Date("2026-01-01 10:00")` → Invalid Date | ISO with `T` and offset, or a parser |
| localStorage / IndexedDB wiped after 7 days | ITP deletes script-writable storage for sites without user interaction. Server-side state, or an installed PWA |
| Third-party cookies dead, `SameSite=None` unreliable | Same-origin proxy, or CHIPS partitioned cookies |
| `beforeunload` doesn't fire | `pagehide` + `visibilitychange` |
| SPA breaks on back-navigation | Aggressive bfcache. Handle `pageshow` with `event.persisted` |
| `performance.now()` low-resolution | Clamped for security. Average over many frames |
| Web Push absent on iOS | Only after Add to Home Screen |
| Service worker cache evicted | Unused registrations get cleaned. 26.6 fixed registrations with missing scripts blocking re-registration |
| No Web Bluetooth / USB / Serial | Not shipping. Design around it |

---

## 11. Process notes

- Develop → Feature Flags tells you whether something is off by default vs genuinely missing.
- File at bugs.webkit.org. It does move: 26.5 alone shipped 63 fixes across SVG, WebRTC, editing, anchor positioning.
- Responsive Design Mode ≠ a real device. Budget for a physical iPhone in the test matrix.

## Sources

- WebKit features for Safari 26.5 — https://webkit.org/blog/17938/webkit-features-for-safari-26-5/
- WebKit features for Safari 26.6 — https://webkit.org/blog/18178/webkit-features-for-safari-26-6/
- Safari 26 Liquid Glass tinting (Pavel Larionov) — https://1ar.io/updates/safari-26-liquid-glass-web/
- Community tinting test suite — https://github.com/andesco/safari-color-tinting
- Ben Frain on iOS 26 tinting with `dialog`/`popover` — https://benfrain.com/ios26-safari-theme-color-tab-tinting-with-fixed-position-elements/
- WebKit Bugzilla #219780 (canvas resize leak), #195325 (canvas memory cap), #302272 (tinting, closed by-design)
- model-viewer #5100 — WebGL broken in iOS 18.7.2
