export function initNavProgress() {
  const bar = document.querySelector('.nav-progress-bar');
  if (!bar) return;

  bar.style.width = '100%';
  bar.style.maxWidth = '0%';
  bar.style.willChange = 'max-width';

  let frameRequested = false;

  function updateProgress() {
    frameRequested = false;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable <= 0 ? 0 : Math.min(Math.max(scrollTop / scrollable, 0), 1);
    bar.style.maxWidth = `${progress * 100}%`;
  }

  window.addEventListener(
    'scroll',
    () => {
      if (frameRequested) return;
      frameRequested = true;
      requestAnimationFrame(updateProgress);
    },
    { passive: true }
  );

  window.addEventListener('resize', updateProgress);
  updateProgress();
}
