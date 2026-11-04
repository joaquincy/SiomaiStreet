import { useEffect, useRef, useCallback, useState } from 'react';
import { getSrcSet } from '../../../utils/responsiveImage';
import './WhyChoose.css';
import './WhyChooseMobile.css';

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function ease(p, start, end) { return clamp01((p - start) / (end - start)); }
// Zero velocity and acceleration at both ends avoids abrupt phase changes.
function easeOut(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
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
  const [compact, setCompact] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches);
  const [slide, setSlide] = useState(0);
  const compactRef = useRef(compact);
  const swipe = useRef(null);
  const reducedRef = useRef(false);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const update = () => { compactRef.current = media.matches; setCompact(media.matches); };
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
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
  const visualProgress = useRef(null);
  const lastFrameTime = useRef(null);
  const metricsRef = useRef(null);
  const metricsDirty = useRef(true);
  const lastPaint = useRef({ progress: null, overlap: null });

  // Whether the marquee carousel is in its "running" phase (p > 0.82)
  const marqueeRunning = useRef(false);

  const onFrame = useCallback((timestamp = performance.now()) => {
    rafId.current = null;
    if (!isActive.current || document.hidden || !sectionRef.current || !stageRef.current) return;

    // 1. Calculate normalized scroll progress (0–1) — batched reads
    // The running marquee changes only its track transform. Re-read geometry
    // when scrolling/resizing changes it, not on every idle carousel frame.
    if (metricsDirty.current || !metricsRef.current) {
      metricsRef.current = {
        scrolled: -sectionRef.current.getBoundingClientRect().top,
        sectionH: sectionRef.current.offsetHeight,
        vh: Math.max(1, stageRef.current.offsetHeight),
      };
      metricsDirty.current = false;
    }
    const { scrolled, sectionH, vh } = metricsRef.current;
    // Exactly 100vh is reserved at the end for the curtain overlap reveal
    const animDistance = Math.max(1, sectionH - (compactRef.current ? 2.5 : 2) * vh);
    const target = clamp01(scrolled / animDistance);
    const dt = lastFrameTime.current === null ? 1000 / 60 : Math.min(50, Math.max(0, timestamp - lastFrameTime.current));
    lastFrameTime.current = timestamp;
    // Brief time-based damping absorbs wheel steps without changing scroll geometry.
    // Snap on re-entry, large jumps and at the curtain boundary to prevent stale frames.
    if (visualProgress.current === null || target === 0 || target === 1 || Math.abs(target - visualProgress.current) > .4) {
      visualProgress.current = target;
    } else {
      visualProgress.current += (target - visualProgress.current) * (1 - Math.exp(-dt / 85));
      if (Math.abs(target - visualProgress.current) < .0001) visualProgress.current = target;
    }
    const p = visualProgress.current;
    const scrollChanging = p !== target;
    const travel = compactRef.current ? 0.22 : 1;

    // ── CURTAIN OVERLAP & UNFOCUS EFFECT ──
    // Journey (with margin-top: -100vh) scrolls up over WhyChoose while
    // WhyChoose remains pinned at top: 0.
    const rawOverlap = clamp01((scrolled - (sectionH - 2 * vh)) / vh);
    // The next section fully covers the carousel at the end of the curtain.
    marqueeRunning.current = p > 0.82 && !compactRef.current && rawOverlap < 1;
    // Smoothstep easing (3x^2 - 2x^3) for zero-derivative gradual start
    const overlapRatio = rawOverlap * rawOverlap * (3 - 2 * rawOverlap);

    if (lastPaint.current.overlap !== rawOverlap) {
      lastPaint.current.overlap = rawOverlap;
      if (rawOverlap > 0.001) {
        // Refined 3D depth recession: scale down ~7.5% and drift back into the distance
        const coverScale = (1 - overlapRatio * 0.075).toFixed(4);
        const coverY = (-overlapRatio * 28).toFixed(1);
        const coverBlur = (overlapRatio * 3.8).toFixed(2);
        const coverDim = (1 - overlapRatio * 0.18).toFixed(3);
        const coverOpacity = (1 - overlapRatio * 0.22).toFixed(3);

        stageRef.current.style.filter = `blur(${coverBlur}px) brightness(${coverDim})`;
        stageRef.current.style.transform = `scale(${coverScale}) translate3d(0, ${coverY}px, 0)`;
        stageRef.current.style.opacity = coverOpacity;
      } else {
        stageRef.current.style.filter = '';
        stageRef.current.style.transform = '';
        stageRef.current.style.opacity = '';
      }
    }

    // Keep settled titles, dots and clip paths out of the continuous marquee loop.
    if (lastPaint.current.progress !== p) {
      lastPaint.current.progress = p;
      // ── TITLE FADE ──
      const titleFade = 1 - easeOut(ease(p, 0.48, 0.82));

      // ── PHASE 1: Typography assembly (0.00–0.35) + PHASE 3: Title breakaway (0.45–0.80) ──

      // Line 1: "WHY SHOULD"
      if (lineRefs.current[0]) {
        const tA = easeOut(ease(p, 0.0, 0.32));
        const xA = lerp(-55 * travel, 0, tA);
        const yA = lerp(-15, 0, tA);
        const tB = easeOut(ease(p, 0.48, 0.82));
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
        const xA = lerp(60 * travel, 0, tA);
        const yA = lerp(10, 0, tA);
        const tB = easeOut(ease(p, 0.50, 0.84));
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
        const tB = easeOut(ease(p, 0.52, 0.86));
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
        const bx = lerp(-80 * travel, 0, tb);
        const br = lerp(-4, 0, tb);
        blockRefs.current[0].style.transform = `translate3d(${bx}px, 0, 0) rotate(${br}deg)`;
        blockRefs.current[0].style.opacity = clamp01(lerp(0, 1, tb)) * blockFade;
      }

      if (blockRefs.current[1]) {
        const tb = easeOut(ease(p, 0.06, 0.33));
        const bx = lerp(50 * travel, 0, tb);
        const by = lerp(-40 * travel, 0, tb);
        const br = lerp(3, 0, tb);
        blockRefs.current[1].style.transform = `translate3d(${bx}px, ${by}px, 0) rotate(${br}deg)`;
        blockRefs.current[1].style.opacity = clamp01(lerp(0, 1, tb)) * blockFade;
      }

      if (blockRefs.current[2]) {
        const tb = easeOut(ease(p, 0.10, 0.36));
        const bx = lerp(40 * travel, 0, tb);
        const by = lerp(50 * travel, 0, tb);
        const br = lerp(2, 0, tb);
        blockRefs.current[2].style.transform = `translate3d(${bx}px, ${by}px, 0) rotate(${br}deg)`;
        blockRefs.current[2].style.opacity = clamp01(lerp(0, 1, tb)) * blockFade;
      }

      // ── IMAGE STRIP ──
      if (imgStripRef.current) {
        const tStrip = easeOut(ease(p, 0.48, 0.88));
        const stripScale = lerp(0.78, 1, tStrip);
        imgStripRef.current.style.transform =
          `translate(-50%, -50%) scale(${stripScale})`;
        imgStripRef.current.style.opacity = easeOut(ease(p, 0.48, 0.68));
        imgStripRef.current.style.pointerEvents = p > 0.82 ? 'auto' : 'none';
      }

      // Animate container clip-path (from tiny sliver to full concave panorama)
      if (imgStripRef.current) {
        const tClip = easeOut(ease(p, 0.48, 0.88));
        // Re-use pre-allocated arrays to avoid GC pressure
        for (let i = 0; i < 5; i++) {
          _polyTop[i][0] = lerp(START_POLY.top[i][0], TARGET_POLY.top[i][0], tClip);
          _polyTop[i][1] = lerp(START_POLY.top[i][1], TARGET_POLY.top[i][1], tClip);
          _polyBot[i][0] = lerp(START_POLY.bottom[i][0], TARGET_POLY.bottom[i][0], tClip);
          _polyBot[i][1] = lerp(START_POLY.bottom[i][1], TARGET_POLY.bottom[i][1], tClip);
        }

        const polyString = `polygon(${_polyTop.map(pt => `${pt[0]}% ${pt[1]}%`).join(', ')}, ${_polyBot.map(pt => `${pt[0]}% ${pt[1]}%`).join(', ')})`;
        imgStripRef.current.style.clipPath = compactRef.current ? `inset(${lerp(44, 0, tClip)}% round var(--radius-xl))` : polyString;
      }

      // Handle carousel Nav visibility
      if (navRef.current) {
        const tNav = easeOut(ease(p, 0.85, 0.95));
        navRef.current.style.opacity = tNav;
        navRef.current.style.transform = `translate(-50%, ${lerp(20, 0, tNav)}px)`;
        navRef.current.style.pointerEvents = p > 0.9 ? 'auto' : 'none';
        navRef.current.inert = p <= 0.9;
      }

      // ── DECORATIVE: Dots parallax + fade during image reveal ──
      const dotFade = 1 - easeOut(ease(p, 0.55, 0.75));
      dotRefs.current.forEach((el, i) => {
        if (!el) return;
        const speed = [0.6, -0.4, 0.5, -0.3, 0.4, 0.7, -0.5, 0.3, -0.6][i] || 0.5;
        el.style.transform = `translate3d(0, ${p * speed * -40}px, 0)`;
        el.style.opacity = dotFade;
      });
    }

    // Continuous Marquee Logic — uses cached halfWidth (no layout read per frame)
    if (marqueeRunning.current && trackRef.current) {
      marqueeOffset.current -= marqueeSpeed.current * (dt / (1000 / 60)) * easeOut(ease(p, .82, .96));

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
      if (marqueeSpeed.current > 1.5) marqueeSpeed.current *= Math.pow(0.95, dt / (1000 / 60));
      if (marqueeSpeed.current < -1.5) marqueeSpeed.current *= 0.95;
      if (Math.abs(marqueeSpeed.current - 1.5) < 0.1) marqueeSpeed.current = 1.5;
    }

    // Decide whether to keep looping:
    // - If the marquee is running, we always need frames (it's continuous motion)
    // - Otherwise, stop when settled
    if (marqueeRunning.current || scrollChanging) {
      rafId.current = requestAnimationFrame(onFrame);

    } else {

      rafId.current = null;
    }
  }, []);

  // Kick the rAF loop when the user scrolls (restarts after settling)
  const onScroll = useCallback(() => {
    metricsDirty.current = true;
    if (isActive.current && !document.hidden && rafId.current === null) {

      rafId.current = requestAnimationFrame(onFrame);
    }
  }, [onFrame]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    metricsDirty.current = true;
    lastPaint.current = { progress: null, overlap: null };

    // Respect reduced-motion preference
    const prefersReducedMotion =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    reducedRef.current = prefersReducedMotion;
    if (prefersReducedMotion) {
      // Show the fully-revealed panorama state
      if (imgStripRef.current) {
        imgStripRef.current.style.opacity = '1';
        imgStripRef.current.style.transform = 'translate(-50%, -50%) scale(1)';
        imgStripRef.current.style.pointerEvents = 'auto';
        const polyString = `polygon(${TARGET_POLY.top.map(pt => `${pt[0]}% ${pt[1]}%`).join(', ')}, ${TARGET_POLY.bottom.map(pt => `${pt[0]}% ${pt[1]}%`).join(', ')})`;
        imgStripRef.current.style.clipPath = compactRef.current ? 'inset(0 round var(--radius-xl))' : polyString;
      }
      if (navRef.current) {
        navRef.current.style.opacity = '1';
        navRef.current.style.transform = 'translate(-50%, 0)';
        navRef.current.style.pointerEvents = 'auto';
        navRef.current.inert = false;
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
        onScroll();
      }
    };
    // Delay slightly to ensure images have loaded and track has width
    const cacheTimer = setTimeout(cacheHalfWidth, 200);
    window.addEventListener('resize', cacheHalfWidth, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    const resizeObserver = new ResizeObserver(cacheHalfWidth);
    resizeObserver.observe(section);
    if (stageRef.current) resizeObserver.observe(stageRef.current);
    if (trackRef.current) resizeObserver.observe(trackRef.current);

    // Pause when tab is hidden
    const onVisibility = () => {
      if (document.hidden) {
        if (rafId.current) {
          cancelAnimationFrame(rafId.current);
          rafId.current = null;
        }
      } else if (isActive.current) {
        visualProgress.current = null;
        lastFrameTime.current = null;
        onScroll();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          isActive.current = true;
          metricsDirty.current = true;
          visualProgress.current = null;
          lastFrameTime.current = null;
          // Cancel before synchronizing so only one loop owns the next frame.
          if (rafId.current !== null) cancelAnimationFrame(rafId.current);
          onFrame();
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
      resizeObserver.disconnect();
      clearTimeout(cacheTimer);
      window.removeEventListener('resize', cacheHalfWidth);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
      rafId.current = null;
      isActive.current = false;
      visualProgress.current = null;
      lastFrameTime.current = null;
    };
  }, [onFrame, onScroll, compact]);

  const changeSlide = direction => {
    if (compact) setSlide(previous => (previous + direction + FOOD_IMAGES.length) % FOOD_IMAGES.length);
    else if (reducedRef.current && trackRef.current) {
      const step = trackRef.current.firstElementChild?.getBoundingClientRect().width || 0;
      const half = trackRef.current.scrollWidth / 2;
      if (half) marqueeOffset.current = -(((-marqueeOffset.current + direction * step) % half + half) % half);
      trackRef.current.style.transform = `translate3d(${marqueeOffset.current}px, 0, 0)`;
    } else { marqueeSpeed.current = direction * 20; onScroll(); }
  };

  useEffect(() => {
    marqueeOffset.current = 0;
    if (trackRef.current) trackRef.current.style.transform = '';
    if (navRef.current && !reducedRef.current) navRef.current.inert = true;
    onScroll();
  }, [compact, onScroll]);

  return (
    <section className="wc-section" data-compact={compact} id="why-choose" ref={sectionRef}>
      <div className="wc-section__sticky">
        <div className="wc-stage" ref={stageRef}>

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

          {/* ─── TYPOGRAPHY + PHOTO PLACEHOLDER BLOCKS ─── */}
          <div className="wc-title" aria-label="Why Should You Choose Siomai Street?">
            {/* Row 1: "Why Should" on left, Image on right */}
            <div className="wc-title__row wc-title__row--1">
              <span
                className="wc-title__line wc-title__line--1"
                ref={el => { lineRefs.current[0] = el; }}
                style={{ opacity: 0.3 }}
              >
                Why Should
              </span>
              <div
                className="wc-block wc-block--1"
                aria-hidden="true"
                ref={el => { blockRefs.current[0] = el; }}
                style={{ opacity: 0 }}
              >
                <img
                  src={FOOD_IMAGES[0].src}
                  srcSet={getSrcSet(FOOD_IMAGES[0].src, [300, 500])}
                  sizes="(max-width: 768px) 96px, 280px"
                  alt={FOOD_IMAGES[0].alt}
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </div>

            {/* Row 2: Image on left, "You Choose" on right */}
            <div className="wc-title__row wc-title__row--2">
              <div
                className="wc-block wc-block--2"
                aria-hidden="true"
                ref={el => { blockRefs.current[1] = el; }}
                style={{ opacity: 0 }}
              >
                <img
                  src={FOOD_IMAGES[3].src}
                  srcSet={getSrcSet(FOOD_IMAGES[3].src, [300, 500])}
                  sizes="(max-width: 768px) 96px, 350px"
                  alt={FOOD_IMAGES[3].alt}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <span
                className="wc-title__line wc-title__line--2"
                ref={el => { lineRefs.current[1] = el; }}
                style={{ opacity: 0.25 }}
              >
                You Choose
              </span>
            </div>

            {/* Row 3: "Siomai Street?" on left, Image on right */}
            <div className="wc-title__row wc-title__row--3">
              <span
                className="wc-title__line wc-title__line--3"
                ref={el => { lineRefs.current[2] = el; }}
                style={{ opacity: 0.2 }}
              >
                <span className="wc-title__accent">Siomai</span> Street?
              </span>
              <div
                className="wc-block wc-block--3"
                aria-hidden="true"
                ref={el => { blockRefs.current[2] = el; }}
                style={{ opacity: 0 }}
              >
                <img
                  src={FOOD_IMAGES[5].src}
                  srcSet={getSrcSet(FOOD_IMAGES[5].src, [300, 500])}
                  sizes="(max-width: 768px) 96px, 180px"
                  alt={FOOD_IMAGES[5].alt}
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════
              CAROUSEL IMAGES — emerge from within the title
              ═══════════════════════════════════════ */}
          <div className="wc-images" ref={imgStripRef} style={{ opacity: 0 }}
            role="region" aria-label="Siomai photo carousel" aria-roledescription="carousel"
            onPointerDown={event => { if (compact && event.isPrimary) swipe.current = { x: event.clientX, y: event.clientY }; }}
            onPointerCancel={() => { swipe.current = null; }}
            onPointerUp={event => {
              const start = swipe.current; swipe.current = null;
              if (!start || !compact) return;
              const x = event.clientX - start.x, y = event.clientY - start.y;
              if (Math.abs(x) > 40 && Math.abs(x) > Math.abs(y) * 1.5) changeSlide(x < 0 ? 1 : -1);
            }}>
            <div className="wc-images__track" ref={trackRef}>
              {(compact ? [FOOD_IMAGES[slide]] : CAROUSEL_IMAGES).map((img, i) => (
                <div key={compact ? slide : i} className="wc-img-panel" aria-hidden={!compact && i >= FOOD_IMAGES.length ? true : undefined}>
                  <img
                    src={img.src}
                    srcSet={getSrcSet(img.src, [300, 500, 800])}
                    sizes="(max-width: 768px) calc(100vw - 32px), (max-width: 1440px) 24vw, 420px"
                    alt={img.alt}
                    loading="lazy"
                    decoding="async"
                    draggable="false"
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
              type="button"
              onClick={() => changeSlide(-1)}
              aria-label="Previous photo"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            {compact && <span className="wc-carousel-count" role="status" aria-live="polite">{slide + 1} / {FOOD_IMAGES.length}</span>}
            <button
              className="wc-nav-btn wc-nav-btn--next"
              type="button"
              onClick={() => changeSlide(1)}
              aria-label="Next photo"
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
