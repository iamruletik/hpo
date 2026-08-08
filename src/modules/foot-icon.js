import { gsap, ScrollTrigger } from '../core/gsap.js';

export function initFootIcon() {
  const animations = gsap.utils.toArray('[data-foot-animation]');
  if (!animations.length) return;

  const userAgent = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/i.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/i.test(userAgent) && !/Chrome|Chromium|CriOS|Edg|EdgiOS|OPR|FxiOS/i.test(userAgent);
  const useMP4 = isSafari || isIOS;

  const videoSources = {
    reveal: useMP4
      ? 'https://storage.googleapis.com/radiance/hpo/icon_anim_foot.mp4'
      : 'https://storage.googleapis.com/radiance/hpo/icon_anim_foot.webm',
    loop: useMP4
      ? 'https://storage.googleapis.com/radiance/hpo/icon_anim_foot-loop.mp4'
      : 'https://storage.googleapis.com/radiance/hpo/icon_anim_foot-loop.webm',
  };

  animations.forEach((wrapper) => {
    const revealVideo = wrapper.querySelector('.foot-icon-video.is-reveal');
    const loopVideo = wrapper.querySelector('.foot-icon-video.is-loop');
    if (!revealVideo || !loopVideo) return;

    let hasStarted = false;
    let hasSwitchedToLoop = false;
    let scrollTrigger;

    function showVideo(activeVideo, inactiveVideo) {
      gsap.set(activeVideo, { autoAlpha: 1 });
      gsap.set(inactiveVideo, { autoAlpha: 0 });
    }

    function switchToLoop() {
      if (hasSwitchedToLoop) return;
      hasSwitchedToLoop = true;

      function playLoop() {
        loopVideo.currentTime = 0;
        const playPromise = loopVideo.play();

        if (playPromise) {
          playPromise
            .then(() => {
              showVideo(loopVideo, revealVideo);
              revealVideo.pause();
            })
            .catch(() => showVideo(loopVideo, revealVideo));
        } else {
          showVideo(loopVideo, revealVideo);
          revealVideo.pause();
        }
      }

      if (loopVideo.readyState >= 2) {
        playLoop();
      } else {
        loopVideo.addEventListener('canplay', playLoop, { once: true });
        loopVideo.load();
      }
    }

    function startAnimation() {
      if (hasStarted) return;
      hasStarted = true;

      // ScrollTrigger isn't needed after the first run — also prevents the
      // reveal animation from replaying.
      scrollTrigger?.kill();

      revealVideo.src = videoSources.reveal;
      loopVideo.src = videoSources.loop;
      revealVideo.loop = false;
      loopVideo.loop = true;

      revealVideo.load();
      // Loop starts loading alongside reveal so the handoff has no blank frame.
      loopVideo.load();

      showVideo(revealVideo, loopVideo);
      revealVideo.currentTime = 0;

      const playPromise = revealVideo.play();
      if (playPromise) {
        playPromise.catch((error) => console.warn('Reveal video failed to start:', error));
      }
    }

    revealVideo.addEventListener('ended', switchToLoop);

    // Safari fallback: switch just before the end in case 'ended' fires late.
    revealVideo.addEventListener('timeupdate', () => {
      if (hasSwitchedToLoop || !Number.isFinite(revealVideo.duration) || revealVideo.duration <= 0) return;
      const remaining = revealVideo.duration - revealVideo.currentTime;
      if (remaining <= 0.04) switchToLoop();
    });

    scrollTrigger = ScrollTrigger.create({
      trigger: wrapper,
      start: 'top 85%',
      onEnter: startAnimation,
      onEnterBack: startAnimation,
      invalidateOnRefresh: true,
    });
  });
}
