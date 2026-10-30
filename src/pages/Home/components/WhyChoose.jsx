import { useEffect, useRef, useCallback } from 'react';
import { getSrcSet } from '../../../utils/responsiveImage';
import './WhyChoose.css';

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function ease(p, start, end) { return clamp01((p - start) / (end - start)); }
function easeOut(t) { return 1 - (1 - t) * (1 - t) * (1 - t); }
function lerp(a, b, t) { return a + (b - a) * t; }

const FOOD_IMAGES = [
  { src: '/images/wc-siomai-1.jpg', alt: 'Classic Pork Siomai' },
  { src: '/images/wc-siomai-2.jpg', alt: 'Signature Siomai' },
  { src: '/images/wc-siomai-3.jpg', alt: 'Steamed Fresh' },
  { src: '/images/wc-siomai-4.jpg', alt: 'Shrimp Siomai' },
  { src: '/images/wc-siomai-5.jpg', alt: 'Top Down Basket' },
  { src: '/images/wc-siomai-6.jpg', alt: 'Soy Sauce Dip' },
  { src: '/images/wc-siomai-7.jpg', alt: 'Rustic Plate' },
  { src: '/images/wc-siomai-8.jpg', alt: 'Dim Sum Feast' },
];

const CAROUSEL_IMAGES = [...FOOD_IMAGES, ...FOOD_IMAGES]; // Duplicate for infinite loop

// 10-point polygon for the container to create a curved panoramic view
const TARGET_POLY = {
  top: [[0, 0], [25, 6], [50, 10], [75, 6], [100, 0]],
  bottom: [[100, 100], [75, 94], [50, 90], [25, 94], [0, 100]]
};

const START_POLY = {
  top: [[45, 45], [47.5, 45], [50, 45], [52.5, 45], [55, 45]],
  bottom: [[55, 55], [52.5, 55], [50, 55], [47.5, 55], [45, 55]]
};

// Pre-allocate polygon arrays to avoid per-frame allocation
const _polyTop = START_POLY.top.map(() => [0, 0]);
const _polyBot = START_POLY.bottom.map(() => [0, 0]);

const WhyChoose = () => {
  const sectionRef = useRef(null);
  const stageRef = useRef(null);

  // Typography line refs
  const lineRefs = useRef([]);

  // Red block refs
  const blockRefs = useRef([]);

  // Decorative dots
  const dotRefs = useRef([]);

  // Image strip + panels
  const imgStripRef = useRef(null);
  const trackRef = useRef(null);
  const navRef = useRef(null);

  const marqueeOffset = useRef(0);
  const marqueeSpeed = useRef(1.5); // Pixels per frame
  const cachedHalfWidth = useRef(0); // Cached scrollWidth/2 — no layout read per frame

  // Animation state
  const isActive = useRef(false);
  const rafId = useRef(null);
  const targetP = useRef(0);
  const currentP = useRef(0);
  const isSettled = useRef(false);

  // Whether the marquee carousel is in its "running" phase (p > 0.82)
  const marqueeRunning = useRef(false);

  const onFrame = useCallback(() => {
    if (!isActive.current || !sectionRef.current || !stageRef.current) return;

    // 1. Calculate normalized scroll progress (0–1) — batched reads
    const rect = sectionRef.current.getBoundingClientRect();
    const sectionH = sectionRef.current.offsetHeight;
    const vh = window.innerHeight;
    const scrolled = -rect.top;
    const total = sectionH - vh;
    targetP.current = clamp01(scrolled / total);

    // 2. Lerp for smoothness
    const diff = targetP.current - currentP.current;
    const scrollChanging = Math.abs(diff) > 0.0005;
    if (scrollChanging) {
      currentP.current += diff * 0.09;
      isSettled.current = false;
    } else {
      currentP.current = targetP.current;
    }

    const p = currentP.current;
    marqueeRunning.current = p > 0.82;

    // ── TITLE FADE ──
    const titleFade = 1 - easeOut(ease(p, 0.50, 0.78));

    // ── PHASE 1: Typography assembly (0.00–0.35) + PHASE 3: Title breakaway (0.45–0.80) ──

    // Line 1: "WHY SHOULD"
    if (lineRefs.current[0]) {
      const tA = easeOut(ease(p, 0.0, 0.32));
      const xA = lerp(-55, 0, tA);
      const yA = lerp(-15, 0, tA);
      const tB = easeOut(ease(p, 0.45, 0.78));
      const xB = lerp(0, -180, tB);
      const yB = lerp(0, -100, tB);
      const rB = lerp(0, -6, tB);
      lineRefs.current[0].style.transform =
        `translate3d(${xA + xB}px, ${yA + yB}px, 0) rotate(${rB}deg)`;
      lineRefs.current[0].style.opacity = clamp01(lerp(0.3, 1, tA)) * titleFade;
    }

    // Line 2: "YOU CHOOSE"
    if (lineRefs.current[1]) {
      const tA = easeOut(ease(p, 0.05, 0.36));
      const xA = lerp(60, 0, tA);
      const yA = lerp(10, 0, tA);
      const tB = easeOut(ease(p, 0.47, 0.80));
      const xB = lerp(0, 160, tB);
      const yB = lerp(0, -80, tB);
      const rB = lerp(0, 5, tB);
      lineRefs.current[1].style.transform =
        `translate3d(${xA + xB}px, ${yA + yB}px, 0) rotate(${rB}deg)`;
      lineRefs.current[1].style.opacity = clamp01(lerp(0.25, 1, tA)) * titleFade;
    }

    // Line 3: "SIOMAI STREET?"
    if (lineRefs.current[2]) {
      const tA = easeOut(ease(p, 0.08, 0.38));
      const yA = lerp(40, 0, tA);
      const tB = easeOut(ease(p, 0.49, 0.82));
      const xB = lerp(0, 60, tB);
      const yB = lerp(0, 120, tB);
      const rB = lerp(0, 3, tB);
      lineRefs.current[2].style.transform =
        `translate3d(${xB}px, ${yA + yB}px, 0) rotate(${rB}deg)`;
      lineRefs.current[2].style.opacity = clamp01(lerp(0.2, 1, tA)) * titleFade;
    }

    // ── RED BLOCKS ──
    const blockFade = 1 - easeOut(ease(p, 0.42, 0.60));

    if (blockRefs.current[0]) {
      const tb = easeOut(ease(p, 0.03, 0.30));
      const bx = lerp(-80, 0, tb);
      const br = lerp(-4, 0, tb);
      blockRefs.current[0].style.transform = `translate3d(${bx}px, 0, 0) rotate(${br}deg)`;
      blockRefs.current[0].style.opacity = clamp01(lerp(0, 1, tb)) * blockFade;
    }

    if (blockRefs.current[1]) {
      const tb = easeOut(ease(p, 0.06, 0.33));
      const bx = lerp(50, 0, tb);
      const by = lerp(-40, 0, tb);
      const br = lerp(3, 0, tb);
      blockRefs.current[1].style.transform = `translate3d(${bx}px, ${by}px, 0) rotate(${br}deg)`;
      blockRefs.current[1].style.opacity = clamp01(lerp(0, 1, tb)) * blockFade;
    }

    if (blockRefs.current[2]) {
      const tb = easeOut(ease(p, 0.10, 0.36));
      const bx = lerp(40, 0, tb);
      const by = lerp(50, 0, tb);
      const br = lerp(2, 0, tb);
      blockRefs.current[2].style.transform = `translate3d(${bx}px, ${by}px, 0) rotate(${br}deg)`;
      blockRefs.current[2].style.opacity = clamp01(lerp(0, 1, tb)) * blockFade;
    }

    // ── IMAGE STRIP ──
    if (imgStripRef.current) {
      const tStrip = easeOut(ease(p, 0.40, 0.85));
      const stripScale = lerp(0.08, 1, tStrip);
      imgStripRef.current.style.transform =
        `translate(-50%, -50%) scale(${stripScale})`;
      imgStripRef.current.style.opacity = clamp01(ease(p, 0.38, 0.52));
      imgStripRef.current.style.pointerEvents = p > 0.82 ? 'auto' : 'none';
    }

    // Animate container clip-path (from tiny sliver to full concave panorama)
    if (imgStripRef.current) {
      const tClip = easeOut(ease(p, 0.42, 0.82));
      // Re-use pre-allocated arrays to avoid GC pressure
      for (let i = 0; i < 5; i++) {
        _polyTop[i][0] = lerp(START_POLY.top[i][0], TARGET_POLY.top[i][0], tClip);
        _polyTop[i][1] = lerp(START_POLY.top[i][1], TARGET_POLY.top[i][1], tClip);
        _polyBot[i][0] = lerp(START_POLY.bottom[i][0], TARGET_POLY.bottom[i][0], tClip);
        _polyBot[i][1] = lerp(START_POLY.bottom[i][1], TARGET_POLY.bottom[i][1], tClip);
      }

      const polyString = `polygon(${_polyTop.map(pt => `${pt[0]}% ${pt[1]}%`).join(', ')}, ${_polyBot.map(pt => `${pt[0]}% ${pt[1]}%`).join(', ')})`;
      imgStripRef.current.style.clipPath = polyString;
    }

    // Handle carousel Nav visibility
    if (navRef.current) {
      const tNav = easeOut(ease(p, 0.85, 0.95));
      navRef.current.style.opacity = tNav;
      navRef.current.style.transform = `translate(-50%, ${lerp(20, 0, tNav)}px)`;
      navRef.current.style.pointerEvents = p > 0.9 ? 'auto' : 'none';
    }

    // Continuous Marquee Logic — uses cached halfWidth (no layout read per frame)
    if (marqueeRunning.current && trackRef.current) {
      marqueeOffset.current -= marqueeSpeed.current;

      const hw = cachedHalfWidth.current;
      if (hw > 0) {
        if (marqueeOffset.current <= -hw) {
          marqueeOffset.current += hw;
        } else if (marqueeOffset.current > 0) {
          marqueeOffset.current -= hw;
        }
      }

      trackRef.current.style.transform = `translate3d(${marqueeOffset.current}px, 0, 0)`;

      // Friction for manual speed changes via buttons
      if (marqueeSpeed.current > 1.5) marqueeSpeed.current *= 0.95;
      if (marqueeSpeed.current < -1.5) marqueeSpeed.current *= 0.95;
      if (Math.abs(marqueeSpeed.current - 1.5) < 0.1) marqueeSpeed.current = 1.5;
    }

    // ── DECORATIVE: Dots parallax + fade during image reveal ──
    const dotFade = 1 - easeOut(ease(p, 0.55, 0.75));
    dotRefs.current.forEach((el, i) => {
      if (!el) return;
      const speed = [0.6, -0.4, 0.5, -0.3, 0.4, 0.7, -0.5, 0.3, -0.6][i] || 0.5;
      el.style.transform = `translate3d(0, ${p * speed * -40}px, 0)`;
      el.style.opacity = dotFade;
    });

    // Decide whether to keep looping:
    // - If the marquee is running, we always need frames (it's continuous motion)
    // - Otherwise, stop when settled
    if (marqueeRunning.current) {
      rafId.current = requestAnimationFrame(onFrame);
    } else if (scrollChanging) {
      rafId.current = requestAnimationFrame(onFrame);
    } else {
      isSettled.current = true;
      rafId.current = null;
    }
  }, []);

  // Kick the rAF loop when the user scrolls (restarts after settling)
  const onScroll = useCallback(() => {
    if (isActive.current && !rafId.current) {
      isSettled.current = false;
      rafId.current = requestAnimationFrame(onFrame);
    }
  }, [onFrame]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    // Respect reduced-motion preference
    const prefersReducedMotion =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      // Show the fully-revealed panorama state
      if (imgStripRef.current) {
        imgStripRef.current.style.opacity = '1';
        imgStripRef.current.style.transform = 'translate(-50%, -50%) scale(1)';
        imgStripRef.current.style.pointerEvents = 'auto';
        const polyString = `polygon(${TARGET_POLY.top.map(pt => `${pt[0]}% ${pt[1]}%`).join(', ')}, ${TARGET_POLY.bottom.map(pt => `${pt[0]}% ${pt[1]}%`).join(', ')})`;
        imgStripRef.current.style.clipPath = polyString;
      }
      if (navRef.current) {
        navRef.current.style.opacity = '1';
        navRef.current.style.transform = 'translate(-50%, 0)';
        navRef.current.style.pointerEvents = 'auto';
      }
      // Hide title elements (they'd be gone at p=1)
      lineRefs.current.forEach(el => { if (el) el.style.opacity = '0'; });
      blockRefs.current.forEach(el => { if (el) el.style.opacity = '0'; });
      dotRefs.current.forEach(el => { if (el) el.style.opacity = '0'; });
      return;
    }

    // Cache scrollWidth on mount and resize (avoid layout read in animation loop)
    const cacheHalfWidth = () => {
      if (trackRef.current) {
        cachedHalfWidth.current = trackRef.current.scrollWidth / 2;
      }
    };
    // Delay slightly to ensure images have loaded and track has width
    const cacheTimer = setTimeout(cacheHalfWidth, 200);
    window.addEventListener('resize', cacheHalfWidth, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });

    // Pause when tab is hidden
    const onVisibility = () => {
      if (document.hidden) {
        if (rafId.current) {
          cancelAnimationFrame(rafId.current);
          rafId.current = null;
        }
      } else if (isActive.current) {
        isSettled.current = false;
        rafId.current = requestAnimationFrame(onFrame);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          isActive.current = true;
          isSettled.current = false;
          rafId.current = requestAnimationFrame(onFrame);
        } else {
          isActive.current = false;
          if (rafId.current) {
            cancelAnimationFrame(rafId.current);
            rafId.current = null;
          }
        }
      },
      { rootMargin: '200px 0px 200px 0px', threshold: 0 }
    );
    observer.observe(section);

    return () => {
      observer.disconnect();
      clearTimeout(cacheTimer);
      window.removeEventListener('resize', cacheHalfWidth);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [onFrame, onScroll]);

  return (
    <section className="wc-section" id="why-choose" ref={sectionRef}>
      <div className="wc-section__sticky" ref={stageRef}>
        <div className="wc-stage">

          {/* ─── Decorative crosshairs ─── */}
          <div className="wc-crosshair wc-crosshair--tl" aria-hidden="true" />
          <div className="wc-crosshair wc-crosshair--br" aria-hidden="true" />

          {/* ─── Decorative dots ─── */}
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
            <div
              key={i}
              className={`wc-dot wc-dot--${i}`}
              aria-hidden="true"
              ref={el => { dotRefs.current[i - 1] = el; }}
            />
          ))}

          {/* ─── TYPOGRAPHY + RED BLOCKS ─── */}
          <div className="wc-title" aria-label="Why Should You Choose Siomai Street?">
            <span
              className="wc-title__line wc-title__line--1"
              ref={el => { lineRefs.current[0] = el; }}
              style={{ opacity: 0.3 }}
            >
              Why Should
            </span>
            <span
              className="wc-title__line wc-title__line--2"
              ref={el => { lineRefs.current[1] = el; }}
              style={{ opacity: 0.25 }}
            >
              You Choose
            </span>
            <span
              className="wc-title__line wc-title__line--3"
              ref={el => { lineRefs.current[2] = el; }}
              style={{ opacity: 0.2 }}
            >
              <span className="wc-title__accent">Siomai</span> Street?
            </span>

            {/* Red blocks inside title */}
            <div
              className="wc-block wc-block--1"
              aria-hidden="true"
              ref={el => { blockRefs.current[0] = el; }}
              style={{ opacity: 0 }}
            />
            <div
              className="wc-block wc-block--2"
              aria-hidden="true"
              ref={el => { blockRefs.current[1] = el; }}
              style={{ opacity: 0 }}
            />
            <div
              className="wc-block wc-block--3"
              aria-hidden="true"
              ref={el => { blockRefs.current[2] = el; }}
              style={{ opacity: 0 }}
            />
          </div>

          {/* ═══════════════════════════════════════
              CAROUSEL IMAGES — emerge from within the title
              ═══════════════════════════════════════ */}
          <div className="wc-images" ref={imgStripRef} style={{ opacity: 0 }}>
            <div className="wc-images__track" ref={trackRef}>
              {CAROUSEL_IMAGES.map((img, i) => (
                <div key={i} className="wc-img-panel">
                  <img
                    src={img.src}
                    srcSet={getSrcSet(img.src, [300, 500, 800])}
                    sizes="(max-width: 768px) 260px, (max-width: 1440px) 24vw, 420px"
                    alt={img.alt}
                    loading="lazy"
                  />
                  <div className="wc-img-panel__overlay">
                    <span className="wc-img-panel__label">{img.alt}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ═══════════════════════════════════════
              CAROUSEL NAVIGATION ARROWS
              ═══════════════════════════════════════ */}
          <div className="wc-carousel-nav" ref={navRef} style={{ opacity: 0 }}>
            <button
              className="wc-nav-btn wc-nav-btn--prev"
              onPointerDown={() => { marqueeSpeed.current = -20; }}
              aria-label="Scroll left"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              className="wc-nav-btn wc-nav-btn--next"
              onPointerDown={() => { marqueeSpeed.current = 20; }}
              aria-label="Scroll right"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>

        </div>
      </div>
    </section>
  );
};

export default WhyChoose;
