// Fills the four .offer_item-icon boxes (#v-1 … #v-4), which Webflow ships
// empty, with looping video.
//
// One source list, not two. This replaced a Safari/Chrome split that served
// HEVC .mp4 to one and VP9 .webm to the other — the standard pattern for
// transparent video, since those are the only two codecs carrying an alpha
// channel in a browser. These encodes are plain H.264, single track, no alpha,
// so there is nothing left to branch on and every engine takes the same file.
//
// 256x256 at 30fps, ~460kB for all four. The set they replaced was 1000x1000 at
// 60fps and 2.2MB: 60M pixels/second of decode per icon against 7.5M now, four
// icons at once. That decode load is what produced the 200ms composites in the
// profile.
//
// No transform here. The old assets carried padding around the artwork and were
// scaled 1.6x to crop it back out, which meant the box painted at ~102 CSS px
// and needed 307 source px to stay sharp at DPR 3. These are framed tight, so
// the video paints at the box's own 4rem/64px — 192px at DPR 3, comfortably
// inside 256. Dropping the zoom is also what would make a 128px re-encode
// viable if the files ever need to get smaller again.
//
// Filenames are listed rather than generated, for two reasons. The bucket mixes
// singular and plural — icon_1, icons_2, icons_3, icon_4 — and the numbers do
// NOT match the slot they belong in: icon_4 is the second icon and icons_2 is
// the fourth. Array order is what counts; index 0 fills #v-1.
const BASE = 'https://storage.googleapis.com/radiance/hpo/new_offer_icons/';

const SOURCES = [
  `${BASE}icon_1.mp4`, // #v-1
  `${BASE}icon_4.mp4`, // #v-2
  `${BASE}icons_3.mp4`, // #v-3
  `${BASE}icons_2.mp4`, // #v-4
];

function configure(video, src) {
  video.src = src;
  video.autoplay = true;
  video.muted = true;
  video.loop = true;
  // Critical on iOS: set as a property before play, not just as an attribute.
  // Without it Safari refuses to play inline and goes fullscreen instead.
  video.playsInline = true;
}

export function initOfferIcons() {
  SOURCES.forEach((src, index) => {
    const element = document.getElementById(`v-${index + 1}`);
    if (!element) return;

    // The Designer may hand us either an empty div to fill or a video element
    // to point at, depending on how the box was authored.
    if (element.tagName.toLowerCase() === 'video') {
      configure(element, src);
      return;
    }

    element.replaceChildren();

    const video = document.createElement('video');
    configure(video, src);
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';
    video.style.display = 'block';

    element.append(video);
  });
}
