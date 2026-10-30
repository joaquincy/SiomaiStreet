import { Link } from 'react-router-dom';
import { getSrcSet } from '../../../utils/responsiveImage';
import useScrollReveal from '../../../hooks/useScrollReveal';
import './FeaturedMenu.css';

/* ─── Responsive image widths (match /public/images/responsive/) ─── */
const WC_WIDTHS = [300, 500, 800];
const MENU_PORK_WIDTHS = [200, 400];
const MENU_SHRIMP_WIDTHS = [300, 600];
const SIOMAI1_WIDTHS = [200, 400];

/* ─── Saffron twin-accent SVG marks (like the reference's orange droplets) ─── */
const AccentMarks = () => (
  <svg className="fm-accent-marks" viewBox="0 0 24 28" fill="none" aria-hidden="true">
    <path d="M6 2C6 2 2 10 2 14C2 18 4.5 20 6 20C7.5 20 10 18 10 14C10 10 6 2 6 2Z" fill="var(--color-saffron)" />
    <path d="M18 6C18 6 15 12 15 15C15 18 16.8 19.5 18 19.5C19.2 19.5 21 18 21 15C21 12 18 6 18 6Z" fill="var(--color-saffron)" opacity="0.7" />
  </svg>
);

/* ─── Postage-stamp bordered photo ─── */
const StampPhoto = ({ src, widths, alt, className = '', rotate = 0 }) => (
  <div
    className={`fm-stamp-photo ${className}`}
    style={rotate ? { '--stamp-rotate': `${rotate}deg` } : undefined}
  >
    <img
      src={src}
      srcSet={getSrcSet(src, widths)}
      sizes="(max-width: 768px) 45vw, 260px"
      alt={alt}
      loading="lazy"
      decoding="async"
    />
  </div>
);

/* ─── Circular ink postmark stamp ─── */
const InkStamp = ({ text, subtext, className = '' }) => (
  <div className={`fm-ink-stamp ${className}`} aria-hidden="true">
    <svg viewBox="0 0 120 120" fill="none">
      <circle cx="60" cy="60" r="52" stroke="currentColor" strokeWidth="2" />
      <circle cx="60" cy="60" r="46" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
      <path d="M8 50Q20 46 32 50T56 50T80 50T104 50T112 50" stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.4" />
      <path d="M8 70Q20 66 32 70T56 70T80 70T104 70T112 70" stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.4" />
    </svg>
    <span className="fm-ink-stamp-text">{text}</span>
    {subtext && <span className="fm-ink-stamp-subtext">{subtext}</span>}
  </div>
);

/* ─── Hand-drawn SVG botanical: Calamansi wedge ─── */
const CalamansiSvg = ({ className = '' }) => (
  <svg className={`fm-botanical ${className}`} viewBox="0 0 80 80" fill="none" aria-hidden="true">
    <circle cx="40" cy="40" r="28" stroke="var(--color-saffron-dark)" strokeWidth="1.4" />
    <circle cx="40" cy="40" r="22" stroke="var(--color-saffron-dark)" strokeWidth="0.8" />
    <path d="M40 18V62M18 40H62M26 26L54 54M54 26L26 54" stroke="var(--color-saffron-dark)" strokeWidth="0.9" />
    <circle cx="40" cy="40" r="5" fill="none" stroke="var(--color-saffron-dark)" strokeWidth="1" />
    <path d="M22 12C30 8 38 14 40 12" stroke="var(--color-saffron-dark)" strokeWidth="1.2" strokeLinecap="round" fill="none" />
    <path d="M28 6C24 12 30 16 26 14" stroke="var(--color-saffron-dark)" strokeWidth="1" strokeLinecap="round" fill="none" />
  </svg>
);

/* ─── Hand-drawn SVG botanical: Star Anise ─── */
const StarAniseSvg = ({ className = '' }) => (
  <svg className={`fm-botanical ${className}`} viewBox="0 0 80 80" fill="none" aria-hidden="true">
    {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
      <path
        key={angle}
        d="M40 40L40 14C36 20 32 26 40 40Z"
        stroke="var(--color-saffron-dark)"
        strokeWidth="1"
        transform={`rotate(${angle} 40 40)`}
      />
    ))}
    <circle cx="40" cy="40" r="6" stroke="var(--color-saffron-dark)" strokeWidth="1.2" fill="none" />
  </svg>
);

/* ─── 2 Featured Items Only ─── */
const FEATURED_ITEMS = [
  {
    name: 'Classic Pork Siomai',
    price: '35',
    servingNote: '4 pcs',
    specs: [
      { heading: 'Seasoned Pork Filling', detail: 'Coarse-ground pork with savory aromatics' },
      { heading: 'Delicate Wonton Fold', detail: 'Pleated thin wrapper, steamed to order' },
      { heading: 'House Condiments', detail: 'Slow-simmered chili garlic crisp and calamansi soy' },
    ],
    mainImage: '/images/wc-siomai-1.jpg',
    mainWidths: WC_WIDTHS,
    stampImages: [
      { src: '/images/wc-siomai-6.jpg', widths: WC_WIDTHS, alt: 'Chopsticks dipping siomai', rotate: -7 },
      { src: '/images/menu-pork.png', widths: MENU_PORK_WIDTHS, alt: 'Street tray of pork siomai', rotate: 9 },
    ],
    cutoutImage: '/images/siomai 1.png',
    cutoutWidths: SIOMAI1_WIDTHS,
    layout: 'text-left',
  },
  {
    name: 'Supreme Shrimp Siomai',
    price: '45',
    servingNote: '4 pcs',
    specs: [
      { heading: 'Whole Shrimp Crown', detail: 'Sweet ocean shrimp set atop savory pork' },
      { heading: 'Texture and Bite', detail: 'Springy, juicy filling with sesame and scallion' },
      { heading: 'Serving Pairing', detail: 'Best paired with calamansi-pressed soy dip' },
    ],
    mainImage: '/images/menu-shrimp.png',
    mainWidths: MENU_SHRIMP_WIDTHS,
    stampImages: [
      { src: '/images/wc-siomai-5.jpg', widths: WC_WIDTHS, alt: 'Bamboo steamer basket overhead', rotate: 6 },
    ],
    cutoutImage: null,
    layout: 'text-right',
  },
];

/* ─── Individual food story composition ─── */
const FoodStory = ({ item, index }) => {
  const isTextLeft = item.layout === 'text-left';

  return (
    <article className={`fm-story fm-story--${item.layout} reveal`}>
      {/* ─── Text Column ─── */}
      <div className="fm-story-text">
        <AccentMarks />
        <h3 className="fm-story-title">{item.name}</h3>
        <span className="fm-story-price">
          <span className="fm-price-symbol">&#8369;</span>{item.price}
          <span className="fm-price-serving">{item.servingNote}</span>
        </span>

        <div className="fm-story-specs">
          {item.specs.map((spec, i) => (
            <div className="fm-spec-row" key={i}>
              <span className="fm-spec-heading">{spec.heading}</span>
              <span className="fm-spec-detail">{spec.detail}</span>
            </div>
          ))}
        </div>

        <div className="fm-story-actions">
          <Link to="/menu" className="fm-btn fm-btn--primary">Explore Our Menu</Link>
          <Link to="/application" className="fm-btn fm-btn--secondary">Start a Franchise</Link>
        </div>
      </div>

      {/* ─── Image Composition Column ─── */}
      <div className={`fm-story-imagery ${isTextLeft ? 'fm-imagery--right' : 'fm-imagery--left'}`}>
        {/* Main circular food photo */}
        <div className="fm-main-plate">
          <img
            src={item.mainImage}
            srcSet={getSrcSet(item.mainImage, item.mainWidths)}
            sizes="(max-width: 768px) 85vw, 560px"
            alt={item.name}
            loading="lazy"
            decoding="async"
            width="600"
            height="600"
          />
        </div>

        {/* Postage-stamp supporting photos */}
        {item.stampImages.map((stamp, i) => (
          <StampPhoto
            key={i}
            src={stamp.src}
            widths={stamp.widths}
            alt={stamp.alt}
            rotate={stamp.rotate}
            className={`fm-stamp--${i + 1}`}
          />
        ))}

        {/* Optional floating cutout */}
        {item.cutoutImage && (
          <img
            className="fm-floating-cutout"
            src={item.cutoutImage}
            srcSet={getSrcSet(item.cutoutImage, item.cutoutWidths)}
            sizes="140px"
            alt=""
            loading="lazy"
            decoding="async"
            aria-hidden="true"
          />
        )}

        {/* Botanical accents — unique per item */}
        {index === 0 && (
          <>
            <CalamansiSvg className="fm-botanical--calamansi" />
            <StarAniseSvg className="fm-botanical--anise" />
          </>
        )}
        {index === 1 && (
          <InkStamp text="Steamed to Order" subtext="Siomai Street" className="fm-ink-stamp--shrimp" />
        )}
      </div>
    </article>
  );
};

/* ─── Main FeaturedMenu Section ─── */
const FeaturedMenu = () => {
  useScrollReveal();

  return (
    <section className="featured-menu" id="menu">
      {/* ─── Section Intro ─── */}
      <div className="fm-intro reveal">
        <span className="fm-kicker">Our Signature Selection</span>
        <h2 className="fm-section-title">Meet Your Street Favorites</h2>
        <p className="fm-section-lead">
          Signature offerings from our steamer baskets, served with
          house-simmered chili garlic crisp and fresh calamansi.
        </p>
      </div>

      {/* ─── Two Alternating Food Stories ─── */}
      <div className="fm-stories">
        {FEATURED_ITEMS.map((item, index) => (
          <FoodStory key={item.name} item={item} index={index} />
        ))}
      </div>

      {/* ─── Section Footer ─── */}
      <div className="fm-footer reveal">
        <p className="fm-footer-text">
          These are just a few favorites. Discover our full lineup of siomai varieties,
          rice meals, and refreshing drinks.
        </p>
        <div className="fm-footer-actions">
          <Link to="/menu" className="fm-btn fm-btn--primary fm-btn--lg">Explore the Full Menu</Link>
          <Link to="/application" className="fm-btn fm-btn--ghost">Franchise This Menu</Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedMenu;
