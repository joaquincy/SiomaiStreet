import { useState, useEffect, useRef, useCallback } from 'react';
import { BiStar } from 'react-icons/bi';
import { HiArrowLeft, HiArrowRight } from 'react-icons/hi';
import './Testimonials.css';

const reviews = [
  {
    name: 'Carlo M.',
    initials: 'CM',
    location: 'Quezon City',
    rating: 5,
    text: 'Grabe ang sarap ng siomai nila! Every time I pass by, di ko mapigilan bumili. The chili garlic sauce is the best! 🔥',
    platform: 'Google Reviews',
    image: '/images/franchise-store.png',
  },
  {
    name: 'Rica P.',
    initials: 'RP',
    location: 'Makati',
    rating: 5,
    text: 'My go-to merienda spot. Affordable and masarap. The shrimp siomai is my absolute favorite. Lagi akong bumabalik!',
    platform: 'Facebook',
    image: '/images/wc-siomai-1.jpg',
  },
  {
    name: 'Mark T.',
    initials: 'MT',
    location: 'Cebu City',
    rating: 5,
    text: 'Best siomai in our area! My kids love it. We order almost every day. Super worth it for the price. Highly recommended!',
    platform: 'Google Reviews',
    image: '/images/wc-siomai-3.jpg',
  },
  {
    name: 'Jenny L.',
    initials: 'JL',
    location: 'Davao',
    rating: 5,
    text: 'Consistent quality every time. I love that the portions are generous and the staff is always friendly. Keep it up, Siomai Street!',
    platform: 'Facebook',
    image: '/images/wc-siomai-5.jpg',
  },
  {
    name: 'Paolo G.',
    initials: 'PG',
    location: 'Manila',
    rating: 5,
    text: 'Discovered this gem near our office. Now the whole team orders from here for lunch. The rice meals are super sulit!',
    platform: 'Google Reviews',
    image: '/images/wc-siomai-7.jpg',
  },
];

const Testimonials = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const sectionRef = useRef(null);
  const outerTimerRef = useRef(null);
  const innerTimerRef = useRef(null);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (outerTimerRef.current) clearTimeout(outerTimerRef.current);
      if (innerTimerRef.current) clearTimeout(innerTimerRef.current);
    };
  }, []);

  const goTo = useCallback((index) => {
    if (isTransitioning || index === activeIndex) return;
    setIsTransitioning(true);
    // Short delay to allow exit animation, then swap content
    outerTimerRef.current = setTimeout(() => {
      setActiveIndex(index);
      // Allow enter animation to start
      innerTimerRef.current = setTimeout(() => setIsTransitioning(false), 50);
    }, 300);
  }, [activeIndex, isTransitioning]);

  const next = useCallback(() => {
    goTo((activeIndex + 1) % reviews.length);
  }, [activeIndex, goTo]);

  const prev = useCallback(() => {
    goTo((activeIndex - 1 + reviews.length) % reviews.length);
  }, [activeIndex, goTo]);

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
  const counter = `${String(activeIndex + 1).padStart(2, '0')} / ${String(reviews.length).padStart(2, '0')}`;

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
              {reviews.map((review, i) => (
                <img
                  key={i}
                  src={review.image}
                  alt={`Review by ${review.name}`}
                  className={`reviews__image ${i === activeIndex ? 'reviews__image--active' : ''}`}
                />
              ))}
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
              <blockquote className="reviews__quote-text">
                {current.text}
              </blockquote>

              <div className="reviews__stars">
                {[...Array(current.rating)].map((_, i) => (
                  <BiStar key={i} />
                ))}
              </div>

              <div className="reviews__author">
                <div className="reviews__avatar">{current.initials}</div>
                <div className="reviews__author-info">
                  <span className="reviews__author-name">{current.name}</span>
                  <span className="reviews__author-meta">
                    Customer • {current.location}
                  </span>
                </div>
              </div>
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
                {reviews.map((_, i) => (
                  <button
                    key={i}
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
