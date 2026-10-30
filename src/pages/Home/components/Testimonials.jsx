import { useState, useEffect, useRef, useCallback } from 'react';
import { BiChevronLeft, BiChevronRight, BiStar } from 'react-icons/bi';
import './Testimonials.css';

const DEFAULT_REVIEWS = [
  {
    id: 'def-1',
    name: 'Eduardo Ramos',
    location: 'SM Dasmariñas Partner',
    badge: 'Full ROI in 4.5 months',
    rating: 5,
    avatarImg: '/images/franchise-store.png',
    text: 'The entire setup with Siomai Street was painless and straightforward. Head office delivered our turnkey cart in 16 days, fully equipped. The centralized supply chain means our dim sum arrives fresh every morning without production headaches.',
  },
  {
    id: 'def-2',
    name: 'Stacy Mendoza, 32 y.o.',
    location: 'España Blvd Regular',
    badge: 'Daily Commuter Routine',
    rating: 5,
    avatarImg: '/images/wc-siomai-1.jpg',
    text: 'Unlike street carts with mystery extenders, Siomai Street uses real pork and slow-simmered chili garlic oil. Hot, fast, and remarkably consistent every single evening after my hospital shift.',
  },
  {
    id: 'def-3',
    name: 'Danilo Navarro',
    location: 'Bulacan Multi-Unit Operator',
    badge: 'Opened 2nd cart in 6 mos',
    rating: 5,
    avatarImg: '/images/about-story.png',
    text: 'What convinced our family was the low overhead unit economics. With only 4 to 6 square meters of floor space and two crew members, our monthly breakeven was reached in week one. Expanding was an easy call.',
  },
  {
    id: 'def-4',
    name: 'Althea Cruz',
    location: 'Manila University Belt',
    badge: 'Japanese Siomai Favorite',
    rating: 5,
    avatarImg: '/images/wc-siomai-4.jpg',
    text: 'The nori-wrapped Japanese siomai is legitimately dim sum parlor quality at street-stand pricing. Paired with cold gulaman, it is the best student value merienda on the entire avenue.',
  },
  {
    id: 'def-5',
    name: 'Kenneth Tan',
    location: 'Transit Terminal Kiosk',
    badge: '850+ Servings Daily',
    rating: 5,
    avatarImg: '/images/wc-siomai-5.jpg',
    text: 'Pedestrian velocity in transit terminals is relentless. The heavy-duty stainless steel steam deck recovers heat in seconds, so our crew serves customers with zero wait time during rush hour.',
  },
];

const FALLBACK_AVATARS = [
  '/images/wc-siomai-1.jpg',
  '/images/wc-siomai-3.jpg',
  '/images/wc-siomai-5.jpg',
  '/images/wc-siomai-7.jpg',
];

const Testimonials = () => {
  const [apiReviews, setApiReviews] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [exitDirection, setExitDirection] = useState(null);

  const sectionRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0, time: 0 });
  const isDraggingRef = useRef(false);

  useEffect(() => {
    let active = true;
    fetch('/api/reviews')
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load reviews.');
        if (active && Array.isArray(data) && data.length > 0) {
          setApiReviews(data);
        }
      })
      .catch(() => {
        /* Fallback to curated reviews */
      });
    return () => {
      active = false;
    };
  }, []);

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

  const allReviews =
    apiReviews.length > 0
      ? [
          ...apiReviews.map((r, i) => ({
            id: r.id || `api-${i}`,
            name: r.name || 'Verified Customer',
            location: r.branchName || 'Siomai Street Branch',
            badge: r.branchName ? `Verified at ${r.branchName}` : 'Verified Customer Review',
            rating: Number(r.rating) || 5,
            avatarImg: r.image || FALLBACK_AVATARS[i % FALLBACK_AVATARS.length],
            text: r.text,
          })),
          ...DEFAULT_REVIEWS,
        ]
      : DEFAULT_REVIEWS;

  const count = allReviews.length;
  const currentCard = allReviews[activeIndex % count];
  const nextCard = allReviews[(activeIndex + 1) % count];
  const thirdCard = allReviews[(activeIndex + 2) % count];

  const triggerExit = useCallback(
    (direction) => {
      if (exitDirection) return;
      setExitDirection(direction);
      setDragOffset({ x: 0, y: 0 });

      setTimeout(() => {
        setActiveIndex((prev) => {
          if (direction === 'left') {
            return (prev + 1) % count;
          }
          return (prev - 1 + count) % count;
        });
        setExitDirection(null);
      }, 240);
    },
    [exitDirection, count]
  );

  const handleNext = () => triggerExit('left');
  const handlePrev = () => triggerExit('right');

  const handlePointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    isDraggingRef.current = true;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
    };
    if (e.currentTarget.setPointerCapture) {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setDragOffset({ x: dx, y: dy });
  };

  const finishDrag = (e) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);

    if (e && e.currentTarget && e.currentTarget.releasePointerCapture) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }

    const dx = dragOffset.x;
    const dt = Date.now() - dragStartRef.current.time;
    const velocity = Math.abs(dx) / Math.max(dt, 1);
    const threshold = 55;

    if (dx < -threshold || (dx < -25 && velocity > 0.35)) {
      triggerExit('left');
    } else if (dx > threshold || (dx > 25 && velocity > 0.35)) {
      triggerExit('right');
    } else {
      setDragOffset({ x: 0, y: 0 });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') {
      triggerExit('right');
    } else if (e.key === 'ArrowRight') {
      triggerExit('left');
    }
  };

  const getFrontCardStyle = () => {
    if (exitDirection === 'left') {
      return {
        transform: 'translate3d(-120%, 12px, 0) rotate(-12deg)',
        opacity: 0,
      };
    }
    if (exitDirection === 'right') {
      return {
        transform: 'translate3d(120%, 12px, 0) rotate(12deg)',
        opacity: 0,
      };
    }
    if (isDragging) {
      return {
        transform: `translate3d(${dragOffset.x}px, ${dragOffset.y * 0.12}px, 0) rotate(${dragOffset.x * 0.04}deg)`,
        transition: 'none',
      };
    }
    return {
      transform: 'translate3d(0, 0, 0) rotate(0deg)',
    };
  };

  const getLeftBackCardStyle = () => {
    const dragRatio = isDragging ? Math.min(Math.abs(dragOffset.x) / 120, 1) : exitDirection ? 1 : 0;
    const scale = 0.96 + 0.04 * dragRatio;
    const rot = -5.5 * (1 - dragRatio);
    const x = -26 * (1 - dragRatio);
    const y = 12 * (1 - dragRatio);

    return {
      transform: `translate3d(${x}px, ${y}px, 0) rotate(${rot}deg) scale(${scale})`,
      transition: isDragging ? 'none' : undefined,
    };
  };

  const getRightBackCardStyle = () => {
    const dragRatio = isDragging ? Math.min(Math.abs(dragOffset.x) / 120, 1) : exitDirection ? 1 : 0;
    const scale = 0.95 + 0.02 * dragRatio;
    const rot = 4.8 * (1 - dragRatio);
    const x = 22 * (1 - dragRatio);
    const y = -10 * (1 - dragRatio);

    return {
      transform: `translate3d(${x}px, ${y}px, 0) rotate(${rot}deg) scale(${scale})`,
      transition: isDragging ? 'none' : undefined,
    };
  };

  return (
    <section className="reviews" id="reviews" ref={sectionRef}>
      {/* ─── Giant Ghost Typography (Harmonized with Requirements & Packages) ─── */}
      <div className="reviews__bg-type" aria-hidden="true">
        <span className="reviews__bg-word">VOICES</span>
      </div>

      <div className="reviews__container">
        {/* ─── Editorial Header (Aligned with Requirements & Packages) ─── */}
        <header className="reviews__header">
          <div className="reviews__header-top">
            <div className="reviews__badge">
              <span className="reviews__badge-dot" aria-hidden="true" />
              <span className="reviews__badge-title">STREET CREDIBILITY</span>
              <span className="reviews__badge-divider" aria-hidden="true">/</span>
              <span className="reviews__badge-notice">COMMUNITY & OPERATOR LOGS</span>
            </div>
            <span className="reviews__stamp-tag">EST. 2015</span>
          </div>

          <div className="reviews__heading-wrap">
            <h2 className="reviews__heading">
              <span className="reviews__heading-outline">VOICES FROM</span>
              <span className="reviews__heading-solid">THE STREET</span>
            </h2>
          </div>

          <p className="reviews__subtitle">
            Unfiltered field logs from our neighborhood cart operators, terminal franchisees, and daily commuters.
          </p>
        </header>

        {/* ─── Horizontally Aligned Two-Column Showcase ─── */}
        <div className="reviews__showcase">
          {/* LEFT SIDE: Staggered Review Deck */}
          <div className="reviews__deck-col">
            <div className="reviews__deck-topbar">
              <div className="reviews__deck-title-lockup">
                <span className="reviews__deck-dot" aria-hidden="true" />
                <span className="reviews__deck-label">Review</span>
                <span className="reviews__deck-sublabel">// Field Log</span>
              </div>

              <div className="reviews__deck-arrows">
                <button
                  type="button"
                  className="reviews__chevron-btn"
                  onClick={handlePrev}
                  aria-label="Previous review"
                >
                  <BiChevronLeft />
                </button>
                <button
                  type="button"
                  className="reviews__chevron-btn"
                  onClick={handleNext}
                  aria-label="Next review"
                >
                  <BiChevronRight />
                </button>
              </div>
            </div>

            <div
              className={`reviews__deck ${isDragging ? 'reviews__deck--dragging' : ''}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={finishDrag}
              onPointerCancel={finishDrag}
              onKeyDown={handleKeyDown}
              tabIndex={0}
              role="region"
              aria-label="Customer and franchisee reviews. Drag horizontally or use arrow buttons to switch cards."
            >
              {/* Back Layer B (Tilted Clockwise — Top/Right Peek) */}
              {thirdCard && (
                <div
                  className="reviews__card reviews__card--back-right"
                  style={getRightBackCardStyle()}
                  aria-hidden="true"
                >
                  <p className="reviews__card-text">{thirdCard.text}</p>
                  <div className="reviews__card-author">
                    <img
                      src={thirdCard.avatarImg}
                      alt=""
                      className="reviews__avatar"
                      loading="lazy"
                    />
                    <div className="reviews__author-meta">
                      <div className="reviews__author-name-row">
                        <span className="reviews__author-name">{thirdCard.name}</span>
                        <div className="reviews__card-stars" aria-hidden="true">
                          {[...Array(5)].map((_, i) => (
                            <BiStar key={i} />
                          ))}
                        </div>
                      </div>
                      <span className="reviews__author-location">{thirdCard.location}</span>
                      <span className="reviews__card-pill">{thirdCard.badge}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Back Layer A (Tilted Counter-Clockwise — Left Peek) */}
              {nextCard && (
                <div
                  className="reviews__card reviews__card--back-left"
                  style={getLeftBackCardStyle()}
                  aria-hidden="true"
                >
                  <p className="reviews__card-text">{nextCard.text}</p>
                  <div className="reviews__card-author">
                    <img
                      src={nextCard.avatarImg}
                      alt=""
                      className="reviews__avatar"
                      loading="lazy"
                    />
                    <div className="reviews__author-meta">
                      <div className="reviews__author-name-row">
                        <span className="reviews__author-name">{nextCard.name}</span>
                        <div className="reviews__card-stars" aria-hidden="true">
                          {[...Array(5)].map((_, i) => (
                            <BiStar key={i} />
                          ))}
                        </div>
                      </div>
                      <span className="reviews__author-location">{nextCard.location}</span>
                      <span className="reviews__card-pill">{nextCard.badge}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Front Active Card (With Signature Translucent Masking Tape) */}
              {currentCard && (
                <article
                  className="reviews__card reviews__card--front"
                  style={getFrontCardStyle()}
                >
                  {/* Masking Tape Element (Exact match to Requirements & Packages) */}
                  <div className="reviews__card-clip" aria-hidden="true" />

                  <p className="reviews__card-text">{currentCard.text}</p>

                  <div className="reviews__card-author">
                    <img
                      src={currentCard.avatarImg}
                      alt={currentCard.name}
                      className="reviews__avatar"
                      loading="lazy"
                    />
                    <div className="reviews__author-meta">
                      <div className="reviews__author-name-row">
                        <span className="reviews__author-name">{currentCard.name}</span>
                        <div className="reviews__card-stars" aria-label="5 out of 5 stars">
                          {[...Array(5)].map((_, i) => (
                            <BiStar key={i} />
                          ))}
                        </div>
                      </div>
                      <span className="reviews__author-location">{currentCard.location}</span>
                      <span className="reviews__card-pill">{currentCard.badge}</span>
                    </div>
                  </div>
                </article>
              )}
            </div>

            <div className="reviews__deck-footer">
              <span className="reviews__deck-count">
                {String((activeIndex % count) + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
              </span>
              <div className="reviews__deck-dots" aria-hidden="true">
                {allReviews.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`reviews__deck-dot ${i === activeIndex % count ? 'reviews__deck-dot--active' : ''}`}
                    onClick={() => setActiveIndex(i)}
                    aria-label={`Go to review ${i + 1}`}
                  />
                ))}
              </div>
              <a href="/reviews" className="reviews__leave-link">
                Write a review →
              </a>
            </div>
          </div>

          {/* RIGHT SIDE: Natural Editorial Mascot Lockup & Provenance Plaque */}
          <div className="reviews__mascot-col">
            <div className="reviews__mascot-poster">
              {/* Radiant Warm Streetlamp Stage Disk */}
              <div className="reviews__mascot-disc" aria-hidden="true">
                <div className="reviews__mascot-ring-outer" />
                <div className="reviews__mascot-ring-inner" />
              </div>

              {/* Rotating Circular Print-Shop Ink Stamp */}
              <div className="reviews__ink-stamp" aria-hidden="true">
                <svg viewBox="0 0 140 140" className="reviews__ink-stamp-svg">
                  <defs>
                    <path
                      id="siomaiStampCircle"
                      d="M 70, 70 m -52, 0 a 52,52 0 1,1 104,0 a 52,52 0 1,1 -104,0"
                    />
                  </defs>
                  <circle cx="70" cy="70" r="64" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
                  <circle cx="70" cy="70" r="40" fill="none" stroke="currentColor" strokeWidth="1" />
                  <text className="reviews__ink-stamp-text">
                    <textPath href="#siomaiStampCircle" startOffset="0%">
                      SIOMAI STREET • SULIT SA SARAP • EST. 2015 •
                    </textPath>
                  </text>
                  <text x="70" y="74" textAnchor="middle" className="reviews__ink-stamp-center">
                    2015
                  </text>
                </svg>
              </div>

              {/* Mascot Illustration */}
              <figure className="reviews__mascot-figure">
                <img
                  src="/images/MASCOT-removebg-preview.png"
                  alt="Siomai Street mascot holding a bamboo steamer of fresh siomai with thumbs up"
                  className="reviews__mascot-img"
                  onError={(e) => {
                    e.currentTarget.src = '/images/mascot.png';
                  }}
                  loading="lazy"
                />
              </figure>

              {/* Asian Street-Food Provenance Banner (Inspired by Lunar Dim Sum Signboards) */}
              <aside className="reviews__mascot-banner" aria-label="Siomai Street Provenance Banner">
                {/* Traditional Asian Fret / Meander Corner Ornaments */}
                <svg className="reviews__banner-fret reviews__banner-fret--tl" width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                  <path d="M2 20V2h18v5H7v8h8v5H2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
                </svg>
                <svg className="reviews__banner-fret reviews__banner-fret--br" width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                  <path d="M20 2v18H2v-5h13V7H7V2h13z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
                </svg>

                {/* Banner Top Header */}
                <div className="reviews__banner-header">
                  <div className="reviews__banner-stamp-group">
                    <span className="reviews__banner-seal" aria-hidden="true">正宗</span>
                    <span className="reviews__banner-eyebrow">SIOMAI STREET • SULIT SA SARAP</span>
                  </div>
                  <span className="reviews__banner-year">MNL // EST. 2015</span>
                </div>

                {/* Main Slogan Typography */}
                <div className="reviews__banner-headline-wrap">
                  <h3 className="reviews__banner-headline">SUBOK SA KALSADA</h3>
                </div>

                {/* Gold Divider Line with Center Diamond */}
                <div className="reviews__banner-divider" aria-hidden="true">
                  <span className="reviews__divider-line" />
                  <span className="reviews__divider-diamond">◆</span>
                  <span className="reviews__divider-line" />
                </div>

                <p className="reviews__banner-copy">
                  Pure pork and beef dim sum steamed fresh daily. Proven across 45+ neighborhood carts and high-turnover transit kiosks.
                </p>

                {/* Clean Editorial Provenance Strip (No generic software pills) */}
                <div className="reviews__banner-specs">
                  <span className="reviews__banner-spec-item">
                    <span className="reviews__spec-dot" aria-hidden="true" />
                    100% PURE MEAT
                  </span>
                  <span className="reviews__banner-spec-sep" aria-hidden="true">•</span>
                  <span className="reviews__banner-spec-item">ZERO EXTENDERS</span>
                  <span className="reviews__banner-spec-sep" aria-hidden="true">•</span>
                  <span className="reviews__banner-spec-item">CHILI GARLIC OIL</span>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
