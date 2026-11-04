import { useEffect, useState } from 'react';
import { observeMotionVisibility } from '../utils/motionVisibility';

// Autoplay requires both a visible section/tab and permission for motion.
export default function useAutoMotion(elementRef) {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    const update = () => setActive(visible && !preference.matches);
    const stop = observeMotionVisibility([element], (_, next) => {
      visible = next;
      update();
    });
    preference.addEventListener('change', update);
    return () => {
      stop();
      preference.removeEventListener('change', update);
    };
  }, [elementRef]);
  return active;
}
