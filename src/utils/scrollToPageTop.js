// A bounded journey on this long homepage. User input always takes priority.
export function scrollToPageTop(view, onFinish) {
  const start = view.scrollY;
  const duration = Math.min(1800, 650 + Math.sqrt(start) * 7);
  const preference = view.matchMedia('(prefers-reduced-motion: reduce)');
  let frame, started, finished = false;
  const keys = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Escape', 'Tab']);
  const cleanup = () => {
    view.cancelAnimationFrame(frame);
    for (const event of ['wheel', 'touchstart', 'pointerdown']) view.removeEventListener(event, cancel);
    view.removeEventListener('keydown', keydown);
    preference.removeEventListener('change', motionChanged);
  };
  const finish = reached => { if (finished) return; finished = true; cleanup(); onFinish(reached); };
  const cancel = () => finish(false);
  const keydown = event => { if (keys.has(event.key)) cancel(); };
  const motionChanged = event => { if (event.matches) { view.scrollTo({ top: 0, behavior: 'instant' }); finish(true); } };
  const tick = time => {
    if (finished) return;
    started ??= time;
    const progress = Math.min(1, (time - started) / duration);
    const eased = progress < .5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
    view.scrollTo({ top: Math.max(0, start * (1 - eased)), behavior: 'instant' });
    if (progress === 1) finish(true);
    else frame = view.requestAnimationFrame(tick);
  };
  if (preference.matches || start <= 1) {
    view.scrollTo({ top: 0, behavior: 'instant' });
    finish(true);
  } else {
    for (const event of ['wheel', 'touchstart', 'pointerdown']) view.addEventListener(event, cancel, { passive: true });
    view.addEventListener('keydown', keydown);
    preference.addEventListener('change', motionChanged);
    frame = view.requestAnimationFrame(tick);
  }
  // Unmount cancellation must not call React state setters.
  return () => { finished = true; cleanup(); };
}
