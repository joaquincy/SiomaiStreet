// One observer can manage a group of sections. No scroll listeners or layout reads.
export function observeMotionVisibility(elements, onChange, options = {}) {
  const page = document;
  const visibility = new Map(Array.from(elements, element => [element, false]));
  const lastState = new Map();
  let disposed = false;

  const update = (element) => {
    if (disposed) return;
    const active = visibility.get(element) && !page.hidden;
    if (lastState.get(element) !== active) {
      lastState.set(element, active);
      onChange(element, active);
    }
  };
  const updateAll = () => visibility.forEach((_, element) => update(element));
  const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
    if (disposed) return;
    for (const entry of entries) {
      if (!visibility.has(entry.target)) continue;
      visibility.set(entry.target, entry.isIntersecting);
      update(entry.target);
    }
  }, options);

  visibility.forEach((_, element) => {
    if (observer) observer.observe(element);
    else visibility.set(element, true); // Keep content usable on older browsers.
  });
  updateAll();
  page.addEventListener('visibilitychange', updateAll);

  return () => {
    disposed = true;
    observer?.disconnect();
    page.removeEventListener('visibilitychange', updateAll);
  };
}
