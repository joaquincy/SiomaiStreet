import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function RouteScrollReset() {
  const { pathname, hash } = useLocation();

  useLayoutEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => { window.history.scrollRestoration = previous; };
  }, []);

  useLayoutEffect(() => {
    // Override the site's smooth scrolling so a new page never slides up
    // from the previous page's position. Query-only updates stay in place.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (!hash) return;

    let id;
    try { id = decodeURIComponent(hash.slice(1)); }
    catch { return; }

    const scrollToAnchor = () => {
      const target = document.getElementById(id);
      if (!target) return false;
      target.scrollIntoView({ block: 'start', behavior: 'instant' });
      return true;
    };
    if (scrollToAnchor()) return;

    // Lazy routes may still be showing their loading skeleton.
    const observer = new MutationObserver(() => {
      if (scrollToAnchor()) stop();
    });
    const stop = () => {
      observer.disconnect();
      window.clearTimeout(timeout);
    };
    const timeout = window.setTimeout(stop, 5000);
    observer.observe(document.getElementById('root'), { childList: true, subtree: true });
    return stop;
  }, [pathname, hash]);

  return null;
}
