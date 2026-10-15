import { useState, useEffect, useRef, useCallback } from 'react';
import './SuccessStories.css';

const STORIES = [
  {
    name: 'Maria Santos',
    location: 'Quezon City Branch',
    initials: 'MS',
    quote: 'I started with just the Cart Package and within 6 months, I upgraded to a full Kiosk. The support from Siomai Street was incredible — they were with me every step of the way.',
    result: 'ROI in just 3 months',
  },
  {
    name: 'Juan Dela Cruz',
    location: 'Makati Branch',
    initials: 'JD',
    quote: 'As a first-time business owner, I was nervous. But the training program gave me all the confidence I needed. Now I own 3 branches and planning to open more!',
    result: 'Now owns 3 branches',
  },
  {
    name: 'Angela Reyes',
    location: 'Cebu Branch',
    initials: 'AR',
    quote: 'The best decision I ever made was investing in a Siomai Street franchise. The brand recognition alone brings in customers — I barely need to advertise!',
    result: 'Earning 6 figures monthly',
  },
];

const SuccessStories = () => {
  const [active, setActive] = useState(0);
  const [animating, setAnimating] = useState(false);
  const sectionRef = useRef(null);
  const intervalRef = useRef(null);
  const innerTimeoutRef = useRef(null);
  const isVisible = useRef(false);

  const goTo = useCallback((idx) => {
    if (idx === active || animating) return;
    setAnimating(true);
    // Short delay for exit animation, then switch
    innerTimeoutRef.current = setTimeout(() => {
      setActive(idx);
      setAnimating(false);
    }, 280);
  }, [active, animating]);

  // Auto-advance: pauses when offscreen, tab hidden, or reduced-motion
  useEffect(() => {
    const prefersReducedMotion =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || !isVisible.current) return;

    intervalRef.current = setInterval(() => {
      setAnimating(true);
      innerTimeoutRef.current = setTimeout(() => {
        setActive(prev => (prev + 1) % STORIES.length);
        setAnimating(false);
      }, 280);
    }, 7000);

    return () => {
      clearInterval(intervalRef.current);
      if (innerTimeoutRef.current) clearTimeout(innerTimeoutRef.current);
    };
  }, [active]); // re-create interval after each slide change to reset timer

  // IntersectionObserver to pause autoplay when section is offscreen
  // + visibilitychange for tab hidden
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible.current = entry.isIntersecting;
        if (entry.isIntersecting) {
          section.classList.add('ss-visible');
        }
        // Force re-render to toggle the interval
        setActive((prev) => prev);
      },
      { threshold: 0.12 }
    );
    observer.observe(section);

    const onVisibility = () => {
      if (document.hidden) {
        clearInterval(intervalRef.current);
        if (innerTimeoutRef.current) clearTimeout(innerTimeoutRef.current);
      } else {
        // Trigger re-render to restart interval
        setActive((prev) => prev);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(intervalRef.current);
      if (innerTimeoutRef.current) clearTimeout(innerTimeoutRef.current);
    };
  }, []);

  const story = STORIES[active];

  return (
    <section className="ss" id="success-stories" ref={sectionRef}>

      {/* Background image — existing storefront */}
      <div className="ss__bg">
        <img
          src="/images/franchise-store.png"
          alt=""
          className="ss__bg-img"
          loading="lazy"
          width="876"
          height="600"
        />
        <div className="ss__bg-overlay" />
      </div>

      {/* Content */}
      <div className="ss__inner">

        {/* Left column — Header + Navigation */}
        <div className="ss__left">
          <div className="ss__tag-wrap">
            <span className="ss__tag">
              <span className="ss__tag-dot" />
              Franchisee Stories
            </span>
          </div>

          <h2 className="ss__heading">
            <span className="ss__heading-l1">Success</span>
            <span className="ss__heading-l2">Stories<span className="ss__heading-period">.</span></span>
          </h2>

          <p className="ss__sub">
            Hear from the people who took the first step with Siomai Street.
          </p>

          {/* Story Selector */}
          <nav className="ss__nav" aria-label="Select a story">
            {STORIES.map((s, i) => (
              <button
                key={i}
                className={`ss__nav-btn ${i === active ? 'ss__nav-btn--active' : ''}`}
                onClick={() => goTo(i)}
                aria-current={i === active ? 'true' : undefined}
              >
                <span className="ss__nav-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="ss__nav-name">{s.name}</span>
                <span className="ss__nav-loc">{s.location}</span>
                {/* Progress bar for active */}
                {i === active && <span className="ss__nav-progress" />}
              </button>
            ))}
          </nav>
        </div>

        {/* Right column — Featured Quote */}
        <div className="ss__right">
          <div className={`ss__quote-wrap ${animating ? 'ss__quote-wrap--exit' : ''}`}>
            {/* Large quote mark */}
            <span className="ss__quote-mark" aria-hidden="true">"</span>

            <blockquote className="ss__quote">
              {story.quote}
            </blockquote>

            <div className="ss__attribution">
              <div className="ss__avatar">{story.initials}</div>
              <div className="ss__attr-text">
                <span className="ss__attr-name">{story.name}</span>
                <span className="ss__attr-loc">{story.location}</span>
              </div>
            </div>

            <div className="ss__result">
              <span className="ss__result-label">Result</span>
              <span className="ss__result-value">{story.result}</span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default SuccessStories;
