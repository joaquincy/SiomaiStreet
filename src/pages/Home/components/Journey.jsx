import { useEffect, useRef, useCallback } from 'react';
import './Journey.css';

// Easing functions
function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function easeOut(t) { return 1 - (1 - t) * (1 - t) * (1 - t); }
function lerp(a, b, t) { return a + (b - a) * t; }

const JOURNEY_STEPS = [
  {
    number: '01',
    title: 'APPLY',
    description: 'Submit your franchise application online with your personal details and preferred location. Our team will review it within 24 hours.',
    align: 'left'
  },
  {
    number: '02',
    title: 'EVALUATION',
    description: 'Our franchise team evaluates your application and schedules a consultation to discuss the opportunity, packages, and answer your questions.',
    align: 'right'
  },
  {
    number: '03',
    title: 'APPROVAL',
    description: 'Choose your franchise package, sign the agreement, and make your investment. Welcome to the Siomai Street family!',
    align: 'center'
  },
  {
    number: '04',
    title: 'ONBOARDING',
    description: 'Complete our comprehensive training program covering food prep, operations, and customer service. We\'ll help you set up your store.',
    align: 'left'
  },
  {
    number: '05',
    title: 'LAUNCH',
    description: 'Open your doors with a grand launch! With our marketing support and loyal customer base, watch your business thrive from day one.',
    align: 'final'
  }
];

const Journey = () => {
  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const titleRef = useRef(null);
  const stepsRef = useRef([]);
  const progressFillRef = useRef(null);
  const dotRefs = useRef([]);

  const isActive = useRef(false);
  const rafId = useRef(null);
  const targetP = useRef(0);
  const currentP = useRef(0);
  const isSettled = useRef(false);

  const onFrame = useCallback(() => {
    if (!isActive.current || !sectionRef.current) return;

    // Batched layout reads
    const rect = sectionRef.current.getBoundingClientRect();
    const sectionH = sectionRef.current.offsetHeight;
    const vh = window.innerHeight;
    const scrolled = -rect.top;
    const total = sectionH - vh;
    targetP.current = clamp01(scrolled / total);

    // Smooth interpolation
    const diff = targetP.current - currentP.current;
    if (Math.abs(diff) > 0.0005) {
      currentP.current += diff * 0.1;
      isSettled.current = false;
    } else {
      currentP.current = targetP.current;
      if (!isSettled.current) {
        isSettled.current = true;
        // Apply final frame values, then stop
      } else {
        return; // Already settled, don't loop
      }
    }

    const p = currentP.current;

    // 1. Title Animation (0.0 -> 0.15)
    if (titleRef.current) {
      let tOpacity = 1;
      let tTransform = 0;
      if (p > 0.05) {
        const tFade = clamp01((p - 0.05) / 0.1);
        tOpacity = 1 - easeOut(tFade);
        tTransform = easeOut(tFade) * -100; // Move up as it fades out
      }
      titleRef.current.style.opacity = tOpacity;
      titleRef.current.style.transform = `translate3d(0, ${tTransform}px, 0) scale(${1 + (1 - tOpacity) * 0.05})`;
    }

    // 2. Progress Line Fill
    if (progressFillRef.current) {
      const lineP = clamp01((p - 0.15) / 0.85);
      progressFillRef.current.style.transform = `scaleY(${lineP})`;
    }

    // 3. Steps Animation
    stepsRef.current.forEach((el, i) => {
      if (!el) return;

      const start = 0.15 + i * 0.17;
      const end = start + 0.15;

      let opacity = 0;
      let progress = 0;

      if (p < start - 0.04) {
        opacity = 0;
        progress = -1;
      } else if (p < start) {
        const t = (p - (start - 0.04)) / 0.04;
        opacity = easeOut(t);
        progress = -1 + easeOut(t);
      } else if (p <= end) {
        opacity = 1;
        progress = 0;
      } else if (p < end + 0.04) {
        const t = (p - end) / 0.04;
        opacity = 1 - easeOut(t);
        progress = easeOut(t);
      } else {
        opacity = 0;
        progress = 1;
      }

      el.style.opacity = opacity;

      const y = progress * -80;
      const scale = progress < 0 ? lerp(0.95, 1, progress + 1) : lerp(1, 1.05, progress);

      el.style.transform = `translate3d(0, ${y}px, 0) scale(${scale})`;

      const imgWrapper = el.querySelector('.journey-step__visual');
      if (imgWrapper) {
        const imgY = progress * 40;
        imgWrapper.style.transform = `translate3d(0, ${imgY}px, 0)`;
      }

      if (dotRefs.current[i]) {
        const dotActive = p >= (start - 0.02);
        dotRefs.current[i].style.transform = dotActive ? 'scale(1)' : 'scale(0)';
      }
    });

    if (!isSettled.current) {
      rafId.current = requestAnimationFrame(onFrame);
    } else {
      rafId.current = null;
    }
  }, []);

  // Restart rAF loop when user scrolls after settling
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
      // Show all steps statically
      if (titleRef.current) {
        titleRef.current.style.opacity = '0';
      }
      if (progressFillRef.current) {
        progressFillRef.current.style.transform = 'scaleY(1)';
      }
      stepsRef.current.forEach((el) => {
        if (el) {
          el.style.opacity = '1';
          el.style.transform = 'none';
        }
      });
      dotRefs.current.forEach((el) => {
        if (el) el.style.transform = 'scale(1)';
      });
      return;
    }

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
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [onFrame, onScroll]);

  return (
    <section className="journey-section" id="journey" ref={sectionRef}>
      {/* Decorative background shapes */}
      <div className="journey-deco journey-deco--circle-1" aria-hidden="true" />
      <div className="journey-deco journey-deco--circle-2" aria-hidden="true" />

      <div className="journey-sticky" ref={stageRef}>

        {/* Progress Line */}
        <div className="journey-progress-line">
          <div className="journey-progress-fill" ref={progressFillRef} />
          {JOURNEY_STEPS.map((_, i) => (
            <div className="journey-progress-dot" style={{ top: `${(i / 4) * 100}%` }} key={i}>
              <div className="journey-progress-dot-inner" ref={el => dotRefs.current[i] = el} />
            </div>
          ))}
        </div>

        {/* Main Title */}
        <div className="journey-main-title" ref={titleRef}>
          <h2>
            YOUR JOURNEY
            <br />
            TO SUCCESS
            <span className="journey-pill journey-pill--1">EASY PROCESS</span>
            <span className="journey-pill journey-pill--2">FULL SUPPORT</span>
            <span className="journey-pill journey-pill--3">FAST ROI</span>
          </h2>
          <p>Five simple steps from application to opening day</p>
          <div className="journey-scroll-hint" aria-hidden="true">
            <span className="journey-scroll-hint__line" />
            <span className="journey-scroll-hint__text">SCROLL</span>
          </div>
        </div>

        {/* Steps */}
        {JOURNEY_STEPS.map((step, i) => (
          <div
            key={i}
            className={`journey-step journey-step--${step.align}`}
            ref={el => stepsRef.current[i] = el}
          >
            <div className="journey-step__bg-number">{step.number}</div>

            <div className="journey-step__inner">
              <div className="journey-step__content">
                <div className="journey-step__accent" aria-hidden="true" />
                <div className="journey-step__eyebrow">
                  <span className="journey-step__eyebrow-num">{step.number}</span>
                  STEP {step.number}
                </div>
                <h3 className="journey-step__title">{step.title}</h3>
                <div className="journey-step__rule" aria-hidden="true" />
                <p className="journey-step__desc">{step.description}</p>
              </div>

              {step.align !== 'final' && (
                <div className="journey-step__visual">
                  <div className="journey-step__img-wrapper">
                    <img src={`/images/wc-siomai-${i + 1}.jpg`} alt={step.title} loading="lazy" />
                  </div>
                  <div className="journey-step__img-label" aria-hidden="true">SIOMAI STREET</div>
                </div>
              )}
            </div>
          </div>
        ))}

      </div>
    </section>
  );
};

export default Journey;
