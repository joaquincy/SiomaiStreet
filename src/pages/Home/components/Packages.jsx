import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { BiCheck, BiChevronLeft, BiChevronRight } from 'react-icons/bi';
import { getSrcSet } from '../../../utils/responsiveImage';
import {
  FRANCHISE_PACKAGES,
  PRICING_NOTICE,
  QUOTATION_CHECKLIST,
} from '../../../../shared/franchiseCatalogue.js';
import './Packages.css';

const PACKAGES = [
  {
    id: 'food-cart',
    number: '01',
    tier: 'FOOD CART',
    name: 'Food Cart',
    price: PRICING_NOTICE,
    period: 'TERMS SUBJECT TO WRITTEN CONFIRMATION',
    description: FRANCHISE_PACKAGES[0]?.description || 'A compact cart format for a proposed trading location.',
    popular: false,
    image: '/images/about-story.png',
    widths: [400, 640, 895],
    featuresTitle: 'CONFIRM IN YOUR QUOTATION',
    features: QUOTATION_CHECKLIST,
  },
  {
    id: 'kiosk',
    number: '02',
    tier: 'KIOSK',
    name: 'Kiosk',
    price: PRICING_NOTICE,
    period: 'TERMS SUBJECT TO WRITTEN CONFIRMATION',
    description: FRANCHISE_PACKAGES[1]?.description || 'A kiosk format for a proposed commercial space.',
    popular: true,
    image: '/images/siomai front.png',
    widths: [320, 480, 640],
    featuresTitle: 'CONFIRM IN YOUR QUOTATION',
    features: QUOTATION_CHECKLIST,
  },
  {
    id: 'casual-dining',
    number: '03',
    tier: 'CASUAL DINING',
    name: 'Casual Dining',
    price: PRICING_NOTICE,
    period: 'TERMS SUBJECT TO WRITTEN CONFIRMATION',
    description: FRANCHISE_PACKAGES[2]?.description || 'A store format with space for dine-in customers.',
    popular: false,
    image: '/images/franchise-store.png',
    widths: [400, 640, 876],
    featuresTitle: 'CONFIRM IN YOUR QUOTATION',
    features: QUOTATION_CHECKLIST,
  },
];

const Packages = () => {
  const sectionRef = useRef(null);
  const rowRef = useRef(null);
  const animRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const stopScrollAnim = useCallback(() => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
    if (rowRef.current) {
      rowRef.current.style.scrollSnapType = '';
    }
  }, []);

  useEffect(() => () => stopScrollAnim(), [stopScrollAnim]);

  const scrollToPackage = useCallback((index) => {
    const row = rowRef.current;
    const clamped = Math.max(0, Math.min(PACKAGES.length - 1, index));
    setActiveIdx(clamped);
    if (!row) return;

    const cards = Array.from(row.querySelectorAll('.pkg__card'));
    const targetCard = cards[clamped];
    if (!targetCard) return;

    const maxScroll = Math.max(0, row.scrollWidth - row.clientWidth);
    const rawTarget =
      targetCard.offsetLeft - (row.clientWidth - targetCard.offsetWidth) / 2;
    const targetLeft = Math.max(0, Math.min(maxScroll, rawTarget));

    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      stopScrollAnim();
      row.scrollLeft = targetLeft;
      return;
    }

    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }

    const startLeft = row.scrollLeft;
    const distance = targetLeft - startLeft;
    if (Math.abs(distance) < 1) {
      row.style.scrollSnapType = '';
      return;
    }

    row.style.scrollSnapType = 'none';
    const duration = 340;
    const startTime = performance.now();

    const stepFrame = (now) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      row.scrollLeft = startLeft + distance * eased;

      if (t < 1) {
        animRef.current = requestAnimationFrame(stepFrame);
      } else {
        row.scrollLeft = targetLeft;
        row.style.scrollSnapType = '';
        animRef.current = null;
      }
    };

    animRef.current = requestAnimationFrame(stepFrame);
  }, [stopScrollAnim]);

  const handleRowScroll = useCallback(() => {
    if (animRef.current) return;
    const row = rowRef.current;
    if (!row) return;
    const cards = Array.from(row.querySelectorAll('.pkg__card'));
    if (!cards.length) return;

    const rowCenter = row.scrollLeft + row.clientWidth / 2;
    let closest = 0;
    let minDiff = Infinity;
    cards.forEach((card, i) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const diff = Math.abs(cardCenter - rowCenter);
      if (diff < minDiff) {
        minDiff = diff;
        closest = i;
      }
    });
    setActiveIdx(closest);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          section.classList.add('pkg--visible');
          observer.unobserve(section);
        }
      },
      { threshold: 0.08 }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="pkg" id="packages" ref={sectionRef}>
      {/* ─── Giant Background Typography ─── */}
      <div className="pkg__bg-type" aria-hidden="true">
        <span className="pkg__bg-word">SIOMAI</span>
        <span className="pkg__bg-word pkg__bg-word--2">STREET</span>
      </div>

      <div className="pkg__inner">
        {/* ─── Section Header ─── */}
        <header className="pkg__header">
          <div className="pkg__heading-wrap">
            <div className="pkg__badge">
              <span className="pkg__badge-dot" aria-hidden="true" />
              <span className="pkg__badge-title">FRANCHISE PACKAGES</span>
              <span className="pkg__badge-divider" aria-hidden="true">/</span>
              <span className="pkg__badge-notice">3 PROVEN FORMATS</span>
            </div>

            <h2 className="pkg__heading">
              <span className="pkg__heading-outline">CHOOSE THE SETUP</span>
              <span className="pkg__heading-solid">THAT FITS YOUR GOALS</span>
            </h2>

            <p className="pkg__desc">
              Flexible packages to match your budget and goals. Every package includes our proven system and ongoing support.
            </p>
          </div>

          <div className="pkg__header-badge" aria-hidden="true">
            <svg viewBox="0 0 100 100" className="pkg__spin-text">
              <path id="pkg-curve" d="M 50, 50 m -35, 0 a 35,35 0 1,1 70,0 a 35,35 0 1,1 -70,0" fill="transparent" />
              <text><textPath href="#pkg-curve" startOffset="0%">SIOMAI STREET FRANCHISE • SIOMAI STREET FRANCHISE • </textPath></text>
            </svg>
            <div className="pkg__spin-icon">S</div>
          </div>
        </header>

        {/* ─── Mobile Format Switcher Tabs (Visible <= 768px) ─── */}
        <div className="pkg__mobile-controls">
          <div className="pkg__mobile-tabs" role="tablist" aria-label="Franchise package formats">
            {PACKAGES.map((pkg, idx) => (
              <button
                key={pkg.id}
                type="button"
                role="tab"
                aria-selected={activeIdx === idx}
                className={`pkg__mobile-tab${activeIdx === idx ? ' is-active' : ''}`}
                onClick={() => scrollToPackage(idx)}
              >
                <span className="pkg__mobile-tab-num">{pkg.number}</span>
                <span className="pkg__mobile-tab-name">{pkg.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ─── Three Package Cards ─── */}
        <div className="pkg__carousel-wrap">
          <button
            type="button"
            className="pkg__mobile-arrow pkg__mobile-arrow--prev"
            onClick={() => scrollToPackage(activeIdx - 1)}
            disabled={activeIdx === 0}
            aria-label="Previous franchise package"
          >
            <BiChevronLeft aria-hidden="true" />
          </button>

          <div
            className="pkg__row"
            ref={rowRef}
            onScroll={handleRowScroll}
            onPointerDown={stopScrollAnim}
            onTouchStart={stopScrollAnim}
          >
            {PACKAGES.map((pkg) => (
              <article
                key={pkg.id}
                className={`pkg__card ${pkg.popular ? 'pkg__card--hero' : ''}`}
              >
                {/* Unobstructed Image Header */}
                <div className="pkg__card-img-wrap">
                  <img
                    src={pkg.image}
                    srcSet={getSrcSet(pkg.image, pkg.widths)}
                    sizes="(max-width: 680px) 90vw, (max-width: 1024px) 45vw, 380px"
                    alt={`Siomai Street ${pkg.name}`}
                    className="pkg__card-img"
                    loading="lazy"
                    decoding="async"
                  />
                </div>

                {/* Content Panel */}
                <div className="pkg__card-body">
                  <div className="pkg__card-head">
                    <div className="pkg__card-meta">
                      <span className="pkg__card-tier">{pkg.number} / {pkg.tier}</span>
                      {pkg.popular && (
                        <span className="pkg__sticker">MOST POPULAR</span>
                      )}
                    </div>
                    <h3 className="pkg__card-name">{pkg.name}</h3>
                    <p className="pkg__card-desc">{pkg.description}</p>
                  </div>

                  <div className="pkg__card-quote">
                    <span className="pkg__card-price">{pkg.price}</span>
                    <span className="pkg__card-period">{pkg.period}</span>
                  </div>

                  <div className="pkg__card-features">
                    <h4 className="pkg__card-feat-title">{pkg.featuresTitle}</h4>
                    <ul className="pkg__card-feat-list">
                      {pkg.features.map((feat, fi) => (
                        <li key={fi}>
                          <BiCheck className="pkg__card-check" aria-hidden="true" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link
                    to={`/application?package=${pkg.id}#cta`}
                    className={`pkg__card-btn ${pkg.popular ? 'pkg__card-btn--red' : ''}`}
                  >
                    GET STARTED <span className="pkg__card-btn-arr" aria-hidden="true">→</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <button
            type="button"
            className="pkg__mobile-arrow pkg__mobile-arrow--next"
            onClick={() => scrollToPackage(activeIdx + 1)}
            disabled={activeIdx === PACKAGES.length - 1}
            aria-label="Next franchise package"
          >
            <BiChevronRight aria-hidden="true" />
          </button>
        </div>

        {/* ─── Mobile Pagination Dots ─── */}
        <div className="pkg__mobile-dots" aria-hidden="true">
          {PACKAGES.map((pkg, idx) => (
            <button
              key={pkg.id}
              type="button"
              tabIndex={-1}
              className={`pkg__mobile-dot${activeIdx === idx ? ' is-active' : ''}`}
              onClick={() => scrollToPackage(idx)}
            />
          ))}
        </div>

        {/* ─── Undecided / Exploratory Application Link ─── */}
        <div className="pkg__footer-note">
          <span>Undecided on store format?</span>{' '}
          <Link to="/application?package=not-sure#cta" className="pkg__footer-link">
            Start an exploratory application <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Packages;
