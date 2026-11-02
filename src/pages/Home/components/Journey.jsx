import { useEffect, useRef, useCallback } from 'react';
import './Journey.css';

// Easing functions
function clamp(v, min, max) { return v < min ? min : v > max ? max : v; }
function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function easeOut(t) { return 1 - (1 - t) * (1 - t) * (1 - t); }

const JOURNEY_STEPS = [
  {
    number: '01',
    title: 'APPLY',
    description: 'Complete the application using accurate details and save the reference shown after confirmed submission. Receipt does not mean approval.',
    align: 'left'
  },
  {
    number: '02',
    title: 'EVALUATION',
    description: 'The review stage considers applicant information, funding and the proposed location. Clarifications or relevant evidence may be needed before a decision.',
    align: 'right'
  },
  {
    number: '03',
    title: 'APPROVAL',
    description: 'Before committing, obtain the decision and review the written quotation, fees, inclusions, exclusions and agreement. Applying does not reserve a territory.',
    align: 'center'
  },
  {
    number: '04',
    title: 'ONBOARDING',
    description: 'If approved, coordinate the agreed site, permits, training, equipment and opening requirements. Application approval alone does not activate a branch account.',
    align: 'left'
  },
  {
    number: '05',
    title: 'LAUNCH',
    description: 'Open only after applicable requirements and agreed readiness checks are complete. Opening dates and business returns are not guaranteed.',
    align: 'final'
  }
];

const MAX_STAGE = JOURNEY_STEPS.length; // 0 = Main Title, 1..5 = Steps

const Journey = () => {
  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const titleRef = useRef(null);
  const stepsRef = useRef([]);
  const progressFillRef = useRef(null);
  const dotRefs = useRef([]);

  const isActive = useRef(false);
  const rafId = useRef(null);
  const targetStage = useRef(0);
  const currentStage = useRef(0);
  const isSettled = useRef(false);
  const syncOnEntry = useRef(true);

  const getSectionMetrics = useCallback(() => {
    const section = sectionRef.current;
    if (!section) return null;
    const rect = section.getBoundingClientRect();
    const vh = stageRef.current?.offsetHeight || window.innerHeight;
    const sectionTop = window.scrollY + rect.top;
    const totalScroll = Math.max(1, section.offsetHeight - vh);
    const rawP = clamp01(-rect.top / totalScroll);
    return { rect, vh, sectionTop, totalScroll, rawP };
  }, []);

  const onFrame = useCallback(() => {
    rafId.current = null;
    if (!isActive.current || !sectionRef.current) return;

    const metrics = getSectionMetrics();
    if (!metrics) return;

    // Always follow actual scroll, including an interrupted dot-button scroll.
    targetStage.current = clamp(Math.round(metrics.rawP * MAX_STAGE), 0, MAX_STAGE);
    if (syncOnEntry.current || metrics.rawP === 0 || metrics.rawP === 1) {
      currentStage.current = targetStage.current;
      syncOnEntry.current = false;
      isSettled.current = false;
    }

    // Smooth interpolation toward the target stage (adaptive speed)
    const diff = targetStage.current - currentStage.current;
    const absDiff = Math.abs(diff);
    if (absDiff > 0.001) {
      const speed = Math.min(0.4, 0.14 + absDiff * 0.08);
      currentStage.current += diff * speed;
      isSettled.current = false;
    } else {
      currentStage.current = targetStage.current;
      if (!isSettled.current) {
        isSettled.current = true;
      } else {
        rafId.current = null;
        return;
      }
    }

    const stage = currentStage.current;

    // 1. Main Title (Stage 0)
    if (titleRef.current) {
      const tDist = stage; // 0 when at title, >0 when advancing into steps
      const tVis = easeOut(clamp01(1 - tDist * 1.35));
      const tY = -clamp01(tDist) * 72;
      const tScale = 1 - clamp01(tDist) * 0.04;
      titleRef.current.style.opacity = tVis;
      titleRef.current.style.transform = `translate3d(0, ${tY}px, 0) scale(${tScale})`;
      titleRef.current.style.pointerEvents = tVis > 0.5 ? 'auto' : 'none';
    }

    // 2. Progress Line Fill (Stage 1 -> Stage 5 maps 0 -> 1)
    if (progressFillRef.current) {
      const lineP = clamp01((stage - 1) / (MAX_STAGE - 1));
      progressFillRef.current.style.transform = `scaleY(${lineP})`;
    }

    // 3. Steps Animation (Stages 1..5)
    stepsRef.current.forEach((el, i) => {
      if (!el) return;

      const stepStage = i + 1;
      const dist = stage - stepStage; // 0 = centered active step, <0 = upcoming, >0 = passed
      const absDist = Math.abs(dist);

      // Discrete step visibility: 1 at dist=0, 0 when |dist| >= 0.75
      const rawVis = clamp01(1 - absDist * 1.35);
      const opacity = easeOut(rawVis);
      const clampedDist = clamp(dist, -1, 1);

      const y = clampedDist * -56;
      const scale = 1 - Math.min(absDist, 1) * 0.04;

      el.style.opacity = opacity;
      el.style.transform = `translate3d(0, ${y}px, 0) scale(${scale})`;
      el.style.pointerEvents = opacity > 0.6 ? 'auto' : 'none';

      const imgWrapper = el.querySelector('.journey-step__visual');
      if (imgWrapper) {
        const imgY = clampedDist * 28;
        imgWrapper.style.transform = `translate3d(0, ${imgY}px, 0)`;
      }

      if (dotRefs.current[i]) {
        const dotActive = stage >= stepStage - 0.35;
        const dotCurrent = Math.abs(stage - stepStage) < 0.45;
        dotRefs.current[i].style.transform = dotActive
          ? `scale(${dotCurrent ? 1.15 : 1})`
          : 'scale(0)';
      }
    });

    if (!isSettled.current) {
      rafId.current = requestAnimationFrame(onFrame);
    } else {
      rafId.current = null;
    }
  }, [getSectionMetrics]);

  const scrollToStage = useCallback((stageIndex) => {
    const metrics = getSectionMetrics();
    if (!metrics) return;
    const clamped = clamp(stageIndex, 0, MAX_STAGE);
    targetStage.current = clamped;
    isSettled.current = false;

    const targetY = metrics.sectionTop + (clamped / MAX_STAGE) * metrics.totalScroll;
    window.scrollTo({ top: targetY, behavior: 'smooth' });

    if (!rafId.current && isActive.current) {
      rafId.current = requestAnimationFrame(onFrame);
    }
  }, [getSectionMetrics, onFrame]);

  // Restart rAF loop when user scrolls after settling
  const onScroll = useCallback(() => {
    if (!isActive.current || document.hidden) return;

    if (!rafId.current) {
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
      if (titleRef.current) {
        titleRef.current.style.opacity = '1';
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
    window.addEventListener('resize', onScroll, { passive: true });

    const onVisibility = () => {
      if (document.hidden) {
        if (rafId.current) {
          cancelAnimationFrame(rafId.current);
          rafId.current = null;
        }
      } else if (isActive.current) {
        isSettled.current = false;
        syncOnEntry.current = true;
        onScroll();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          isActive.current = true;
          isSettled.current = false;
          syncOnEntry.current = true;
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
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
      rafId.current = null;
      isActive.current = false;
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
          {JOURNEY_STEPS.map((step, i) => (
            <button
              type="button"
              className="journey-progress-dot"
              style={{ top: `${(i / (JOURNEY_STEPS.length - 1)) * 100}%` }}
              key={i}
              onClick={() => scrollToStage(i + 1)}
              aria-label={`Jump to step ${step.number}: ${step.title}`}
            >
              <span className="journey-progress-dot-inner" ref={el => dotRefs.current[i] = el} />
            </button>
          ))}
        </div>

        {/* Main Title */}
        <div className="journey-main-title" ref={titleRef}>
          <h2>
            YOUR JOURNEY
            <br />
            TO SUCCESS
            <span className="journey-pill journey-pill--1">APPLICATION REVIEW</span>
            <span className="journey-pill journey-pill--2">AGREED SUPPORT</span>
            <span className="journey-pill journey-pill--3">OPENING READINESS</span>
          </h2>
          <p>From application review to opening readiness</p>
          <div className="journey-scroll-hint" aria-hidden="true">
            <span className="journey-scroll-hint__line" />
            <span className="journey-scroll-hint__text">SCROLL STEP BY STEP</span>
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
                    <img
                      src={`/images/wc-siomai-${i + 1}.jpg`}
                      srcSet={`/images/responsive/wc-siomai-${i + 1}-300w.jpg 300w, /images/responsive/wc-siomai-${i + 1}-500w.jpg 500w, /images/responsive/wc-siomai-${i + 1}-800w.jpg 800w`}
                      sizes="(max-width: 768px) 90vw, 500px"
                      alt={step.title} loading="lazy"
                    />
                  </div>
                  <div className="journey-step__img-label" aria-hidden="true">SIOMAI STREET // PHASE {step.number}</div>
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
