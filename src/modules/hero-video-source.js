// Picks the hero video encode.
//
// The source is chosen here rather than with <source media="...">. Chrome and
// Firefox ignore the media attribute on a <video> child and just take the first
// playable entry, so a markup-only ladder would hand phones the desktop file.
//
// Runs from preloader-entry.js, before initPreloader(), and that ordering is
// load-bearing: preloader.js gates the curtain on every hero <video> reaching
// readyState >= 2, and a video with no src never gets there — it fires no
// loadeddata, no canplay, no error, so the preloader would wait out its 5s cap
// on every load.
const HERO_VIDEO = '.hero-picture';

export function initHeroVideoSource() {
  const video = document.querySelector(HERO_VIDEO);
  if (!video) return;

  const base = 'https://storage.googleapis.com/radiance/hpo/';
  const small = window.matchMedia('(max-width: 900px)').matches;
  const av1 = base + (small ? 'hero-768-av1.mp4' : 'hero-1536-av1.mp4');
  const h264 = base + (small ? 'hero-768.mp4' : 'hero-1536-crf24.mp4');

  // Safari only decodes AV1 where there is hardware for it (M3+, A17 Pro+) and
  // has no software fallback, so most Macs land on H.264. canPlayType reports
  // that honestly; the error handler covers anything that lies.
  const canAv1 = video.canPlayType('video/mp4; codecs="av01.0.08M.08"') !== '';

  video.addEventListener(
    'error',
    () => {
      if (video.src !== h264) video.src = h264;
    },
    { once: true }
  );

  video.src = canAv1 ? av1 : h264;
}
