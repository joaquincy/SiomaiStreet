import { useEffect, useRef } from 'react';

/**
 * useScrollReveal
 *
 * Observes `.reveal` elements and adds `.revealed` when they enter the
 * viewport. Uses a MutationObserver to pick up dynamically rendered
 * elements (e.g. menu cards that appear after a category filter change)
 * so they don't stay invisible.
 *
 * Respects prefers-reduced-motion: when the user requests reduced motion
 * all `.reveal` elements are immediately made visible without animation.
 */
const useScrollReveal = () => {
  const observerRef = useRef(null);

  useEffect(() => {
    const prefersReducedMotion =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // If reduced motion is preferred, reveal everything immediately
    if (prefersReducedMotion) {
      const all = document.querySelectorAll('.reveal');
      all.forEach((el) => el.classList.add('revealed'));
      // Still observe new elements that appear later
      const mo = new MutationObserver((mutations) => {
        for (const m of mutations) {
          for (const node of m.addedNodes) {
            if (node.nodeType !== 1) continue;
            if (node.classList?.contains('reveal')) node.classList.add('revealed');
            node.querySelectorAll?.('.reveal')?.forEach((el) =>
              el.classList.add('revealed')
            );
          }
        }
      });
      mo.observe(document.body, { childList: true, subtree: true });
      return () => mo.disconnect();
    }

    // Standard reveal with IntersectionObserver
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target); // one-shot
          }
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );
    observerRef.current = observer;

    // Observe initial elements
    const observeAll = () => {
      document.querySelectorAll('.reveal:not(.revealed)').forEach((el) =>
        observer.observe(el)
      );
    };

    // Small delay for initial page render
    const timer = setTimeout(observeAll, 50);

    // MutationObserver picks up dynamically added .reveal elements
    // (e.g. after the user switches menu category)
    const mo = new MutationObserver((mutations) => {
      let hasNew = false;
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.classList?.contains('reveal') && !node.classList.contains('revealed')) {
            observer.observe(node);
            hasNew = true;
          }
          node.querySelectorAll?.('.reveal:not(.revealed)')?.forEach((el) => {
            observer.observe(el);
            hasNew = true;
          });
        }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      clearTimeout(timer);
      observer.disconnect();
      mo.disconnect();
    };
  }, []);
};

export default useScrollReveal;
