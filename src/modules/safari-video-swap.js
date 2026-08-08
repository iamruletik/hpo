const SAFARI_VIDEOS = [
  'https://storage.googleapis.com/radiance/hpo/second_sec_icon_animation/safari/icon_01.mp4',
  'https://storage.googleapis.com/radiance/hpo/second_sec_icon_animation/safari/icon_02.mp4',
  'https://storage.googleapis.com/radiance/hpo/second_sec_icon_animation/safari/icon_03.mp4',
  'https://storage.googleapis.com/radiance/hpo/second_sec_icon_animation/safari/icon_04.mp4',
];

const GOOGLE_VIDEOS = [
  'https://storage.googleapis.com/radiance/hpo/second_sec_icon_animation/google/icon_01.webm',
  'https://storage.googleapis.com/radiance/hpo/second_sec_icon_animation/google/icon_02.webm',
  'https://storage.googleapis.com/radiance/hpo/second_sec_icon_animation/google/icon_03.webm',
  'https://storage.googleapis.com/radiance/hpo/second_sec_icon_animation/google/icon_04.webm',
];

export function initSafariVideoSwap() {
  // Chrome/Chromium also match "Safari" in their UA string, so both must be excluded.
  const isSafari =
    navigator.userAgent.includes('Safari') &&
    !navigator.userAgent.includes('Chrome') &&
    !navigator.userAgent.includes('Chromium');

  const videosToUse = isSafari ? SAFARI_VIDEOS : GOOGLE_VIDEOS;

  for (let i = 1; i <= 4; i++) {
    const element = document.getElementById(`v-${i}`);
    if (!element) continue;

    if (element.tagName.toLowerCase() === 'video') {
      element.src = videosToUse[i - 1];
      element.autoplay = true;
      element.muted = true;
      element.loop = true;
      element.playsInline = true; // critical for Safari on iOS
      continue;
    }

    element.innerHTML = '';

    const video = document.createElement('video');
    video.src = videosToUse[i - 1];
    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';
    video.style.display = 'block';
    video.style.transform = 'scale(1.6)';

    element.appendChild(video);
  }
}
