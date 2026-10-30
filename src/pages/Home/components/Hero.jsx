import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getSrcSet } from '../../../utils/responsiveImage';
import './Hero.css';

const bestSellers = [
  {
    name: 'Siomai Rice Meal',
    shortName: 'RICE MEAL',
    category: 'STREET COMBO',
    tag: 'BESTSELLER',
    price: '₱65',
    image: '/images/27980247527.png',
    isCutout: true,
  },
  {
    name: 'Classic Pork Siomai',
    shortName: 'PORK SIOMAI',
    category: 'STREET CLASSIC',
    tag: 'ORIGINAL RECIPE',
    price: '₱35',
    image: '/images/menu-pork.png',
    isCutout: false,
  },
  {
    name: 'Shrimp Siomai',
    shortName: 'SHRIMP SIOMAI',
    category: 'PREMIUM DIM SUM',
    tag: 'FRESH FLAVOR',
    price: '₱45',
    image: '/images/menu-shrimp.png',
    isCutout: false,
  },
  {
    name: 'Japanese Siomai',
    shortName: 'JAPANESE SIOMAI',
    category: 'SPECIALTY ROLL',
    tag: 'NORI WRAPPED',
    price: '₱50',
    image: '/images/menu-classic.png',
    isCutout: false,
  },
];

const SLIDE_DURATION = 5000;

const Hero = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const sectionRef = useRef(null);

  const goToSlide = useCallback((index) => {
    setActiveIndex(index);
  }, []);

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % bestSellers.length);
  }, []);

  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + bestSellers.length) % bestSellers.length);
  }, []);

  // Autoplay: pauses when user hovers/focuses, section is offscreen, or tab is hidden
  useEffect(() => {
    if (isPaused || !isVisible) return;

    const prefersReducedMotion =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const interval = setInterval(() => {
      handleNext();
    }, SLIDE_DURATION);

    return () => clearInterval(interval);
  }, [isPaused, isVisible, handleNext]);

  // IntersectionObserver to pause autoplay when hero is offscreen
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0 }
    );
    observer.observe(section);

    // Pause when tab is hidden
    const onVisibility = () => {
      setIsVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const currentItem = bestSellers[activeIndex];

  return (
    <>
      <section className="hero" id="hero" ref={sectionRef}>
        <div className="hero-bg">
          <img
            src="/images/Group 1.png"
            srcSet="
              /images/responsive/Group 1-480w.png 480w,
              /images/responsive/Group 1-768w.png 768w,
              /images/responsive/Group 1-1024w.png 1024w,
              /images/responsive/Group 1-1440w.png 1440w,
              /images/responsive/Group 1-1920w.png 1920w
            "
            sizes="100vw"
            alt="Siomai Street storefront"
            width="1920"
            height="1080"
            fetchPriority="high"
          />
        </div>
        <div className="hero-overlay"></div>

        <div className="hero-content">
          {/* Left — Preserved Title & Franchise CTA */}
          <div className="hero-text">
            <h1 className="hero-title">
              Start Your Own <br />
              <span className="highlight">Siomai Street Experience</span>
            </h1>

            <p className="hero-description">
              Join the Philippines' fastest-growing street food franchise. Low investment, high returns,
              and complete support every step of the way.
            </p>

            <div className="hero-buttons">
              <Link to="/application" className="btn btn-primary btn-lg">
                Apply Now
              </Link>
              <a href="#about" className="btn btn-secondary btn-lg">
                Learn More
              </a>
            </div>
          </div>

          {/* Right — Hero Food Showcase Carousel */}
          <div
            className="hero-showcase"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onFocus={() => setIsPaused(true)}
            onBlur={() => setIsPaused(false)}
            role="region"
            aria-label="Siomai Street best-selling menu showcase"
          >
            {/* Layered Background Watermark Typography */}
            <div className="showcase-watermark" aria-hidden="true">
              <span className="watermark-number">0{activeIndex + 1}</span>
              <span className="watermark-word">SIOMAI</span>
            </div>

            {/* Subtle Ambient Brand Disc */}
            <div className="showcase-backdrop-disc" aria-hidden="true"></div>

            {/* Authentic Brand Sticker / Stamp */}
            <div className="showcase-brand-stamp" aria-hidden="true" key={`stamp-${activeIndex}`}>
              <div className="stamp-inner">
                <span className="stamp-sub">EST. 2015</span>
                <span className="stamp-brand">SIOMAI STREET</span>
                <span className="stamp-tag">{currentItem.tag}</span>
              </div>
            </div>

            {/* Main Featured Food Stage */}
            <div className="showcase-stage">
              {/* Floating Side Arrow Controls */}
              <button
                type="button"
                className="showcase-arrow showcase-arrow--prev"
                onClick={handlePrev}
                aria-label="Previous menu item"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>

              <button
                type="button"
                className="showcase-arrow showcase-arrow--next"
                onClick={handleNext}
                aria-label="Next menu item"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>

              {bestSellers.map((item, index) => {
                const isActive = index === activeIndex;
                return (
                  <div
                    key={item.name}
                    className={`showcase-slide ${isActive ? 'is-active' : ''}`}
                    aria-hidden={!isActive}
                  >
                    {item.isCutout ? (
                      <div className="food-cutout-wrap">
                        <img
                          src={item.image}
                          srcSet={getSrcSet(item.image, [400, 800])}
                          sizes="(max-width: 768px) 280px, 500px"
                          alt={item.name}
                          className="food-cutout-img"
                          draggable="false"
                          width="500"
                          height="500"
                        />
                        <div className="food-ground-shadow" aria-hidden="true"></div>
                      </div>
                    ) : (
                      <div className="food-photo-frame">
                        <img
                          src={item.image}
                          srcSet={getSrcSet(item.image, [300, 600])}
                          sizes="(max-width: 768px) 280px, 500px"
                          alt={item.name}
                          className="food-photo-img"
                          draggable="false"
                          width="500"
                          height="500"
                        />
                        <div className="food-photo-sheen" aria-hidden="true"></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Minimalist Carousel Pagination Dots */}
            <div className="showcase-dots" role="tablist" aria-label="Featured food items">
              {bestSellers.map((item, idx) => (
                <button
                  key={item.shortName}
                  type="button"
                  role="tab"
                  aria-selected={idx === activeIndex}
                  className={`showcase-dot ${idx === activeIndex ? 'active' : ''}`}
                  onClick={() => goToSlide(idx)}
                  aria-label={`View ${item.name}`}
                >
                  <span className="dot-inner"></span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar (Preserved) */}
      <section className="hero-stats-bar">
        <div className="hero-stats-inner">
          <div className="hero-stat">
            <div className="hero-stat-number">10+</div>
            <div className="hero-stat-label">Active Franchises</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-number">5+</div>
            <div className="hero-stat-label">Years in Business</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-number">3</div>
            <div className="hero-stat-label">Franchise Formats to Explore</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-number">99%</div>
            <div className="hero-stat-label">Franchise Satisfaction</div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Hero;
