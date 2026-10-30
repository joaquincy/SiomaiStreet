import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { BiCheck } from 'react-icons/bi';
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
          <div className="pkg__tag">
            <span className="pkg__tag-line" aria-hidden="true" />
            FRANCHISE PACKAGES
          </div>
          <h2 className="pkg__title">
            Choose the setup{' '}
            that fits your <span className="pkg__title-red">goals.</span>
          </h2>
          <p className="pkg__desc">
            Flexible packages to match your budget and goals. Every package includes our proven system and ongoing support.
          </p>
        </header>

        {/* ─── Three Package Cards ─── */}
        <div className="pkg__row">
          {PACKAGES.map((pkg) => (
            <article
              key={pkg.id}
              className={`pkg__card ${pkg.popular ? 'pkg__card--hero' : ''}`}
            >
              {/* Most Popular Sticker */}
              {pkg.popular && (
                <div className="pkg__sticker">★ MOST POPULAR ★</div>
              )}

              {/* Image */}
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
                {/* Oversized number watermark */}
                <span className="pkg__card-num" aria-hidden="true">{pkg.number}</span>

                <div className="pkg__card-head">
                  <span className="pkg__card-tier">{pkg.number} / {pkg.tier}</span>
                  <h3 className="pkg__card-name">{pkg.name}</h3>
                </div>

                <div className="pkg__card-price-row">
                  <span className="pkg__card-price">{pkg.price}</span>
                </div>
                <div className="pkg__card-period">{pkg.period}</div>

                <p className="pkg__card-desc">{pkg.description}</p>

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
