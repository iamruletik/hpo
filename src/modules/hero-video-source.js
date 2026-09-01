// Picks the hero video encode.
//
// The source is chosen here rather than with <source media="...">. Chrome and
// Firefox ignore the media attribute on a <video> child and just take the first
// playable entry, so a markup-only ladder would hand phones the desktop file.
//
// H.264 only. There was an AV1 ladder in front of this, gated on canPlayType,
// and it cost more than it saved: the trace showed a phone fetching BOTH
// encodes for one element — 1229kB of AV1 plus 2742kB of H.264 — and the AV1
// stream repeatedly losing hardware decode mid-playback, which is far more
// expensive to fall back from than H.264 ever is. Every device that runs this
// site has a hardware H.264 decoder.
//
// Runs from preloader-entry.js, before initPreloader(), and that ordering is
// load-bearing: preloader.js gates the curtain on every hero <video> reaching
// readyState >= 2, and a video with no src never gets there — it fires no
// loadeddata, no canplay, no error, so the preloader would wait out its 5s cap
// on every load.
const HERO_VIDEO = '.hero-picture';

const BASE = 'https://storage.googleapis.com/radiance/hpo/';
const SMALL_QUERY = '(max-width: 900px)';

const SOURCES = {
  small: `${BASE}hero-768.mp4`,
  large: `${BASE}hero-1536-crf24.mp4`,
};

export function initHeroVideoSource() {
  const video = document.querySelector(HERO_VIDEO);
  if (!video) return;

  video.src = window.matchMedia(SMALL_QUERY).matches ? SOURCES.small : SOURCES.large;
}
