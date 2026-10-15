import { useEffect, useRef, useCallback } from 'react';
import './AboutUs.css';


function quadBezier(p0, p1, p2, t) {
  const mt = 1 - t;
  return mt * mt * p0 + 2 * mt * t * p1 + t * t * p2;
}

// Clamp helper
function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

// Smooth step: maps progress p to 0..1 within range [start, start + 1/rate]
function fade(p, start, rate) {
  return clamp01((p - start) * rate);
}

const AboutUs = () => {
  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const siomaiRef = useRef(null);

  // Cached element refs for direct DOM manipulation (no React re-renders)
  const titleRef = useRef(null);
  const storefrontRef = useRef(null);
  const cardRef = useRef(null);
  const subtitleRef = useRef(null);
  const meetRef = useRef(null);
  const descRefs = useRef([]);
  const editorialRef = useRef(null);
  const accentRefs = useRef([]);
  const yearRef = useRef(null);
  const bgRedRef = useRef(null); // Cached — was querySelector per frame before

  const isActive = useRef(false);
  const rafId = useRef(null);
  const targetP = useRef(0);
  const currentP = useRef(0);
  const isSettled = useRef(false);

  const pathConfig = useRef({
    start: { x: 16, y: 48, scale: 0.8, rotate: -8 },
    mid: { x: 32, y: 30, scale: 1.0, rotate: 10 },
    end: { x: 48, y: 32, scale: 1.18, rotate: 0 },
  });

  // Applies all transforms for a given progress value (write-only, no reads)
  const applyFrame = useCallback((p) => {
    // Background red — scaleY shrink
    if (bgRedRef.current) bgRedRef.current.style.transform = `scaleY(${1 - p * 0.35})`;

    // Title — slide up-left and fade
    if (titleRef.current) {
      const moveT = Math.max(0, p - 0.08);
      titleRef.current.style.transform = `translate3d(${moveT * -120}px, ${moveT * -60}px, 0)`;
      titleRef.current.style.opacity = Math.max(0, 1 - moveT * 2.5);
    }

    // Storefront — subtle parallax
    if (storefrontRef.current) {
      storefrontRef.current.style.transform =
        `translate3d(${p * 18}px, ${p * -20}px, 0) scale(${1 + p * 0.03}) rotate(${p * 1}deg)`;
    }

    // Siomai — bezier arc
    if (siomaiRef.current) {
      const { start, mid, end } = pathConfig.current;
      const t = clamp01((p - 0.10) / 0.55);
      siomaiRef.current.style.transform =
        `translate3d(${quadBezier(start.x, mid.x, end.x, t)}%, ${quadBezier(start.y, mid.y, end.y, t)}%, 0) ` +
        `scale(${quadBezier(start.scale, mid.scale, end.scale, t)}) ` +
        `rotate(${quadBezier(start.rotate, mid.rotate, end.rotate, t)}deg)`;
    }

    // Chef card — fade in right before description (30-50%)
    if (cardRef.current) {
      const cardShow = fade(p, 0.30, 5);
      cardRef.current.style.transform = `translate3d(0, ${(1 - cardShow) * 35}px, 0) rotate(-3deg)`;
      cardRef.current.style.opacity = cardShow;
    }

    // Subtitle "THE MAN BEHIND THE SIOMAI" — fade in at 22-30%
    if (subtitleRef.current) {
      const subP = fade(p, 0.20, 4);
      subtitleRef.current.style.transform = `translate3d(0, ${(1 - subP) * 15}px, 0)`;
      subtitleRef.current.style.opacity = subP;
    }

    // Meet Chef Spencer — fade in at 28-38%
    if (meetRef.current) {
      const meetP = fade(p, 0.26, 3.5);
      meetRef.current.style.transform = `translate3d(0, ${(1 - meetP) * 20}px, 0)`;
      meetRef.current.style.opacity = meetP;
    }

    // Description lines — staggered fade at 35%, 42%, 49%
    descRefs.current.forEach((el, i) => {
      if (!el) return;
      const dP = fade(p, 0.33 + i * 0.07, 5);
      el.style.transform = `translate3d(0, ${(1 - dP) * 25}px, 0)`;
      el.style.opacity = dP;
    });

    // Editorial line — grows
    if (editorialRef.current) {
      const lineH = clamp01(p * 2);
      editorialRef.current.style.height = `${lineH * 55}%`;
    }

    // Accent dots
    accentRefs.current.forEach((el, i) => {
      if (!el) return;
      const aP = fade(p, 0.14 + i * 0.04, 3);
      const offsets = [
        { x: 130, y: -70 }, { x: 160, y: -40 },
        { x: 100, y: -90 }, { x: 190, y: -55 },
      ];
      const o = offsets[i] || { x: 100, y: -50 };
      el.style.transform = `translate3d(${aP * o.x}px, ${aP * o.y}px, 0)`;
      el.style.opacity = aP;
    });

    // Year stamp — fade out
    if (yearRef.current) {
      yearRef.current.style.opacity = Math.max(0, 1 - p * 2);
    }
  }, []);

  const onFrame = useCallback(() => {
    if (!isActive.current || !sectionRef.current || !stageRef.current) return;

    // 1. Read scroll position (single layout read, batched before writes)
    const rect = sectionRef.current.getBoundingClientRect();
    const total = sectionRef.current.offsetHeight - window.innerHeight;
    targetP.current = clamp01(-rect.top / total);

    // 2. Lerp for buttery smoothness
    const diff = targetP.current - currentP.current;
    if (Math.abs(diff) > 0.0001) {
      currentP.current += diff * 0.10;
      isSettled.current = false;
    } else {
      currentP.current = targetP.current;
      // If we've converged, apply final frame and stop the loop
      if (!isSettled.current) {
        isSettled.current = true;
        applyFrame(currentP.current);
      }
      // Don't schedule another frame — we're at rest
      rafId.current = null;
      return;
    }

    // 3. Apply all transforms in one batch (write-only, no reads after this)
    applyFrame(currentP.current);

    rafId.current = requestAnimationFrame(onFrame);
  }, [applyFrame]);

  // Kick the rAF loop when the user scrolls (so it restarts after settling)
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
      // Set everything to its final resting state
      applyFrame(0);
      return;
    }

    const updatePath = () => {
      const w = window.innerWidth;
      if (w <= 480) {
        pathConfig.current = {
          start: { x: 12, y: 48, scale: 0.65, rotate: -5 },
          mid: { x: 25, y: 34, scale: 0.82, rotate: 7 },
          end: { x: 32, y: 38, scale: 0.95, rotate: 0 },
        };
      } else if (w <= 768) {
        pathConfig.current = {
          start: { x: 14, y: 48, scale: 0.7, rotate: -6 },
          mid: { x: 30, y: 32, scale: 0.88, rotate: 9 },
          end: { x: 40, y: 35, scale: 1.05, rotate: 0 },
        };
      } else if (w <= 1024) {
        pathConfig.current = {
          start: { x: 14, y: 48, scale: 0.75, rotate: -7 },
          mid: { x: 32, y: 30, scale: 0.95, rotate: 10 },
          end: { x: 46, y: 33, scale: 1.12, rotate: 0 },
        };
      } else {
        pathConfig.current = {
          start: { x: 16, y: 48, scale: 0.8, rotate: -8 },
          mid: { x: 32, y: 30, scale: 1.0, rotate: 10 },
          end: { x: 48, y: 32, scale: 1.18, rotate: 0 },
        };
      }
    };

    updatePath();
    window.addEventListener('resize', updatePath, { passive: true });
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
      window.removeEventListener('resize', updatePath);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [onFrame, onScroll, applyFrame]);

  return (
    <section className="chef-section" id="about" ref={sectionRef}>
      <div className="chef-stage" ref={stageRef}>

        {/* LAYER 1 — Background */}
        <div className="chef-bg">
          <div className="chef-bg-red" ref={bgRedRef} />
          <div className="chef-bg-black" />
          <div className="chef-bg-edge" />
        </div>
        <div className="chef-noise" aria-hidden="true" />

        {/* LAYER 2 — Large typography */}
        <div className="chef-title-group" ref={titleRef}>
          <span className="chef-title-once">Once Upon A</span>
          <span className="chef-title-siomai">Siomai</span>
        </div>

        {/* LAYER 3 — Storefront (upper-right) */}
        <div className="chef-storefront" ref={storefrontRef}>
          <img
            src="/images/siomai front.png"
            alt="Siomai Street storefront illustration"
            width="820"
            height="600"
            loading="lazy"
            draggable="false"
          />
        </div>

        {/* Food trail accents */}
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`chef-accent chef-accent--${i + 1}`}
            aria-hidden="true"
            ref={el => { accentRefs.current[i] = el; }}
          />
        ))}

        {/* LAYER 4 — Siomai */}
        <div className="chef-siomai" ref={siomaiRef}>
          <img
            src="/images/siomai 1.png"
            alt="Siomai Street signature siomai"
            width="400"
            height="440"
            loading="lazy"
            draggable="false"
          />
        </div>

        {/* LAYER 5 — Chef card */}
        <div className="chef-card" ref={cardRef} style={{ opacity: 0 }}>
          <div className="chef-card-inner">
            <div className="chef-card-photo">
              <p className="chef-card-photo-label">
                Picture ni Sir<br />
                Spencer na<br />
                pang Chef
              </p>
            </div>
            <div className="chef-card-body">
              <span className="chef-card-subtitle">The Founder</span>
              <span className="chef-card-name">Chef Spencer</span>
              <button className="chef-card-btn" type="button">
                Meet Chef Spencer
              </button>
            </div>
          </div>
        </div>

        {/* LAYER 6 — Text reveals (LEFT COLUMN) */}
        <div className="chef-text-col">
          <div className="chef-subtitle-reveal" ref={subtitleRef} style={{ opacity: 0 }}>
            <span className="chef-subtitle-text">The man behind the siomai</span>
          </div>

          <div className="chef-meet" ref={meetRef} style={{ opacity: 0 }}>
            <h2 className="chef-meet-name">Meet Chef Spencer</h2>
            <div className="chef-meet-line" aria-hidden="true" />
            <p className="chef-meet-desc">
              The visionary founder who turned a humble street-food dream
              into the Philippines' most beloved siomai brand.
            </p>
          </div>
        </div>

        {/* LAYER 7 — Description text (RIGHT COLUMN) */}
        <div className="chef-desc-group">
          {['Description', 'of Sir', 'Spencer'].map((text, i) => (
            <span
              key={text}
              className="chef-desc-line"
              style={{ opacity: 0 }}
              ref={el => { descRefs.current[i] = el; }}
            >
              {text}
            </span>
          ))}
        </div>

        {/* Decorative editorial line */}
        <div className="chef-editorial-line" aria-hidden="true" ref={editorialRef} />

        <span className="chef-year-stamp" aria-hidden="true" ref={yearRef}>
          Est. 2015 · Siomai Street
        </span>

      </div>
    </section>
  );
};

export default AboutUs;
