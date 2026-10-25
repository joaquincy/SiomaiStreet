import { useState, useEffect, useRef, useCallback } from 'react';
import { BiStar } from 'react-icons/bi';
import { HiArrowLeft, HiArrowRight } from 'react-icons/hi';
import './Testimonials.css';

const Testimonials = () => {
  const [reviews, setReviews] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const sectionRef = useRef(null);
  const outerTimerRef = useRef(null);
  const innerTimerRef = useRef(null);

  useEffect(() => {
    let active = true;
    fetch('/api/reviews')
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load reviews.');
        if (active) {
          const fetched = Array.isArray(data) ? data : [];
          setReviews(fetched);
          setActiveIndex(0);
        }
      })
      .catch(() => { if (active) setReviews([]); });
    return () => { active = false; };
  }, []);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (outerTimerRef.current) clearTimeout(outerTimerRef.current);
      if (innerTimerRef.current) clearTimeout(innerTimerRef.current);
    };
  }, []);

  const goTo = useCallback((index) => {
    if (isTransitioning || index === activeIndex || reviews.length < 2) return;
    setIsTransitioning(true);
    // Short delay to allow exit animation, then swap content
    outerTimerRef.current = setTimeout(() => {
      setActiveIndex(index);
      // Allow enter animation to start
      innerTimerRef.current = setTimeout(() => setIsTransitioning(false), 50);
    }, 300);
  }, [activeIndex, isTransitioning, reviews.length]);

  const next = useCallback(() => {
    if (reviews.length) goTo((activeIndex + 1) % reviews.length);
  }, [activeIndex, goTo, reviews.length]);

  const prev = useCallback(() => {
    if (reviews.length) goTo((activeIndex - 1 + reviews.length) % reviews.length);
  }, [activeIndex, goTo, reviews.length]);

  // Entrance animation
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          section.classList.add('reviews--visible');
          observer.unobserve(section);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const current = reviews[activeIndex];
  const counter = current
    ? `${String(activeIndex + 1).padStart(2, '0')} / ${String(reviews.length).padStart(2, '0')}`
    : '00 / 00';

  return (
    <section className="reviews" id="reviews" ref={sectionRef}>
      {/* Faint background storefront watermark */}
      <div className="reviews__watermark" aria-hidden="true">
        <img
          src="/images/siomai front.png"
          alt=""
          className="reviews__watermark-img"
        />
      </div>

      <div className="reviews__container">
        {/* ─── Header ─── */}
        <div className="reviews__header">
          <span className="reviews__label">— Customer Reviews</span>
          <h2 className="reviews__title">
            Words from the <span className="reviews__title-accent">Street</span>
          </h2>
          <p className="reviews__subtitle">
            We let our food do the talking, but sometimes our customers say it better.
          </p>
        </div>

        {/* ─── Main Content Grid ─── */}
        <div className="reviews__grid">

          {/* Image Side */}
          <div className="reviews__image-col">
            <div className="reviews__image-frame">
              <img
                src={current?.image || '/images/siomai front.png'}
                alt={current?.image ? `Customer photo from ${current.name}` : 'Siomai Street'}
                className="reviews__image reviews__image--active"
              />
              {/* Small brand sticker */}
              <div className="reviews__sticker" aria-hidden="true">
                <span className="reviews__sticker-text">EST. 2015</span>
              </div>
            </div>
          </div>

          {/* Quote Side */}
          <div className="reviews__quote-col">
            {/* Oversized Quote Mark */}
            <span className="reviews__quote-mark" aria-hidden="true">"</span>

            <div className={`reviews__quote-body ${isTransitioning ? 'reviews__quote-body--exit' : 'reviews__quote-body--enter'}`}>
              {current ? (
                <>
                  <blockquote className="reviews__quote-text">{current.text}</blockquote>
                  <div className="reviews__stars">
                    {[...Array(Number(current.rating) || 0)].map((_, i) => <BiStar key={i} />)}
                  </div>
                  <div className="reviews__author">
                    <div className="reviews__avatar">{current.name?.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div>
                    <div className="reviews__author-info">
                      <span className="reviews__author-name">{current.name}</span>
                      <span className="reviews__author-meta">Customer • {current.branchName || 'Siomai Street'}</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <blockquote className="reviews__quote-text">Customer reviews will appear here after moderation.</blockquote>
                  <a href="/reviews" className="reviews__author-name">Share your experience</a>
                </>
              )}
            </div>

            {/* Navigation */}
            <div className="reviews__nav">
              <button
                className="reviews__nav-arrow"
                onClick={prev}
                aria-label="Previous review"
                id="reviews-prev-btn"
              >
                <HiArrowLeft />
              </button>

              <span className="reviews__nav-counter">{counter}</span>

              <div className="reviews__nav-dots">
                {reviews.map((review, i) => (
                  <button
                    key={review.id}
                    className={`reviews__nav-dot ${i === activeIndex ? 'reviews__nav-dot--active' : ''}`}
                    onClick={() => goTo(i)}
                    aria-label={`Go to review ${i + 1}`}
                    id={`reviews-dot-${i}`}
                  />
                ))}
              </div>

              <button
                className="reviews__nav-arrow"
                onClick={next}
                aria-label="Next review"
                id="reviews-next-btn"
              >
                <HiArrowRight />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
