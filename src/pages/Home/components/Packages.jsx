import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  BiCheck,
  BiRightArrowAlt,
  BiChevronDown,
  BiChevronUp,
  BiTable,
  BiStore,
  BiCart,
  BiRestaurant,
} from 'react-icons/bi';
import './Packages.css';
import {
  PRICING_NOTICE,
  QUOTATION_GUIDANCE,
  QUOTATION_CHECKLIST,
} from '../../../../shared/franchiseCatalogue.js';

const PACKAGES = [
  {
    id: 'food-cart',
    num: '01',
    seal: '壹',
    name: 'Food Cart',
    subtitle: 'Compact Footprint • Rapid Turnkey',
    description:
      'A streamlined mobile food unit engineered for high pedestrian velocity, low setup overhead, and rapid turnkey deployment in streetfront and transit settings.',
    image: '/images/about-story.png',
    caption: 'Authentic streetfront cart setup: 4–6 sqm footprint, single 220V line, 1–2 crew.',
    imageAlt: 'Authentic Siomai Street food cart with vendor steaming dim sum for commuters',
    facts: [
      { label: 'Target Footprint', value: '4 – 6 SQM' },
      { label: 'Crew Requirement', value: '1 – 2 Crew per shift' },
      { label: 'Optimal Location', value: 'Transport hubs, supermarket entrances & streetfronts' },
      { label: 'Setup Timeline', value: '14 – 21 Days turnkey' },
      { label: 'Utility Line', value: 'Standard 220V single connection' },
      { label: 'Steaming Capacity', value: 'Heavy-duty stainless steel steam station' },
    ],
    inclusions: [
      'Heavy-duty stainless steel steam deck with fast temperature recovery',
      'Lockable insulated cold-storage box & dry commissary inventory bay',
      'Mobile POS mounting console & lockable cash collection drawer',
      'Illuminated acrylic canopy signage & branded menu pricing board',
      '3-day hands-on crew training (dim sum steaming, handling & hygiene)',
      'Complete initial utensil set, bamboo steamer baskets & uniform pack',
    ],
  },
  {
    id: 'kiosk',
    num: '02',
    seal: '贰',
    name: 'Commercial Kiosk',
    subtitle: 'Commercial Counter • Mall & Terminal Flagship',
    description:
      'Our flagship semi-permanent retail station featuring dual-sided customer service counters, expanded steam capacity, and 360-degree perimeter branding for commercial centers.',
    image: '/images/franchise-store.png',
    caption: 'Commercial kiosk unit: 8–15 sqm enclosed station, dual steam counters, high customer turnover.',
    imageAlt: 'Enclosed commercial kiosk station with customer service windows and team members steaming dim sum',
    facts: [
      { label: 'Target Footprint', value: '8 – 15 SQM' },
      { label: 'Crew Requirement', value: '2 – 3 Crew per shift' },
      { label: 'Optimal Location', value: 'Enclosed malls, food courts & hypermarket terminals' },
      { label: 'Setup Timeline', value: '30 – 45 Days turnkey' },
      { label: 'Utility Line', value: 'Dedicated 220V / 30A commercial line' },
      { label: 'Steaming Capacity', value: 'Dual high-velocity commercial steam stations (120+ baskets/hr)' },
    ],
    inclusions: [
      'Dual heavy-duty commercial steaming decks for rapid rush-hour service',
      'Built-in under-counter commercial chiller and bulk storage cabinet',
      'Dual customer ordering counter with cash safe console & POS wiring',
      'Dedicated beverage dispensing station for house iced black gulaman',
      '360-degree illuminated canopy header & high-visibility perimeter signage',
      '5-day store manager & crew training covering stock reconciliation & prep',
    ],
  },
  {
    id: 'casual-dining',
    num: '03',
    seal: '叁',
    name: 'Dine-In Storefront',
    subtitle: 'Full Storefront • Customer Dining & Combo Meals',
    description:
      'A full-service brick-and-mortar store model with guest dining tables, an expanded combo meal menu, dedicated kitchen ventilation, and highest average order volume.',
    image: '/images/Group 1.png',
    caption: 'Flagship dine-in store: 30–60+ sqm, guest seating, full kitchen extraction, dine-in comfort.',
    imageAlt: 'Siomai Street dine-in storefront with customer tables, red interior branding, and illuminated neon signage',
    facts: [
      { label: 'Target Footprint', value: '30 – 60+ SQM' },
      { label: 'Crew Requirement', value: '4 – 6 Crew per shift' },
      { label: 'Optimal Location', value: 'Commercial high streets, strip malls & lifestyle avenues' },
      { label: 'Setup Timeline', value: '45 – 60 Days store fit-out' },
      { label: 'Utility Line', value: 'Commercial 3-phase, dedicated water supply & grease trap' },
      { label: 'Steaming Capacity', value: 'Multi-tier commercial steaming kitchen battery' },
    ],
    inclusions: [
      'Complete dining hall fit-out: solid guest tables & banquette dining seating',
      'Back-of-house commercial kitchen with compliant exhaust & ventilation hood',
      'Dual POS terminals with integrated Kitchen Order Display (KDS) system',
      'Reach-in commercial stainless chiller & separate bulk freezer storage',
      'Full exterior architectural storefront sign fascia & branded interior wall finish',
      '7-day comprehensive front-of-house and kitchen operational training program',
    ],
  },
];

const COMPARISON_ROWS = [
  {
    metric: 'Target Footprint',
    f01: '4 – 6 SQM',
    f02: '8 – 15 SQM',
    f03: '30 – 60+ SQM',
  },
  {
    metric: 'Optimal Location',
    f01: 'Transport hubs, supermarket entrances & streetfronts',
    f02: 'Enclosed malls, food courts & hypermarket terminals',
    f03: 'Commercial high streets, strip malls & lifestyle hubs',
  },
  {
    metric: 'Crew Requirement',
    f01: '1 – 2 Crew per shift',
    f02: '2 – 3 Crew per shift',
    f03: '4 – 6 Crew per shift',
  },
  {
    metric: 'Utility Connection',
    f01: 'Standard 220V power connection',
    f02: 'Dedicated 220V / 30A commercial line',
    f03: 'Commercial 3-phase, water line & grease trap',
  },
  {
    metric: 'Steaming Hardware',
    f01: 'Single heavy-duty stainless steam deck',
    f02: 'Dual heavy-duty steam stations (120+ baskets/hr)',
    f03: 'Multi-tier commercial kitchen steam battery',
  },
  {
    metric: 'Chiller & Storage',
    f01: 'Lockable dry stock bay + insulated chiller box',
    f02: 'Under-counter commercial chiller + storage bay',
    f03: 'Reach-in commercial chiller + bulk freezer storage',
  },
  {
    metric: 'Turnkey Setup Timeline',
    f01: '14 – 21 Days from site lease sign-off',
    f02: '30 – 45 Days standard turnkey deployment',
    f03: '45 – 60 Days architectural store fit-out',
  },
  {
    metric: 'Training Scope',
    f01: '3-day hands-on crew prep & service training',
    f02: '5-day crew, inventory & manager training',
    f03: '7-day front-of-house & back-of-house program',
  },
  {
    metric: 'Menu Offerings',
    f01: 'Core siomai line + gulaman beverage',
    f02: 'Complete siomai variety + fried sides & drinks',
    f03: 'Full dim sum line, garlic rice combo meals & specialties',
  },
];

const Packages = () => {
  const [expandedInclusions, setExpandedInclusions] = useState({});
  const [showComparison, setShowComparison] = useState(false);
  const sectionRef = useRef(null);

  const toggleInclusions = (id) => {
    setExpandedInclusions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const scrollToFormat = (id) => {
    const el = document.getElementById(`package-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const scrollToComparison = () => {
    setShowComparison(true);
    setTimeout(() => {
      const el = document.getElementById('package-comparison-table');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  return (
    <section className="pkg" id="packages" ref={sectionRef}>
      {/* ─── Shared Matte Charcoal Texture & Subtle Background Linework ─── */}
      <div className="pkg__bg-noise" aria-hidden="true" />

      {/* Faint architectural storefront outline cropped in the outer margin */}
      <div className="pkg__storefront-outline" aria-hidden="true">
        <svg viewBox="0 0 600 700" className="pkg__storefront-svg" fill="none">
          <path d="M40,40 L560,40 L580,110 L20,110 Z" stroke="currentColor" strokeWidth="1" />
          <line x1="20" y1="110" x2="20" y2="640" stroke="currentColor" strokeWidth="1" />
          <line x1="580" y1="110" x2="580" y2="640" stroke="currentColor" strokeWidth="1" />
          <line x1="20" y1="360" x2="580" y2="360" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
          <rect x="70" y="360" width="460" height="240" stroke="currentColor" strokeWidth="1" />
          <line x1="300" y1="360" x2="300" y2="600" stroke="currentColor" strokeWidth="1" />
        </svg>
      </div>

      <div className="pkg__inner">
        {/* ═══════════════════════════════════════════════════════════
           SECTION INTRO: "From your plan to your place on Siomai Street"
           ═══════════════════════════════════════════════════════════ */}
        <header className="pkg__intro">
          <div className="pkg__intro-top">
            <div className="pkg__brand-seal-group">
              <span className="pkg__brand-chop" aria-hidden="true">
                街
              </span>
              <span className="pkg__brand-eyebrow">
                FRANCHISE BUSINESS FORMATS // 01–03
              </span>
            </div>
            <span className="pkg__provenance-tag">EST. 2015 • MANILA</span>
          </div>

          <div className="pkg__intro-heading-box">
            <h2 className="pkg__intro-title">
              Find your place on <span className="pkg__intro-title--red">Siomai Street</span>.
            </h2>
            <p className="pkg__intro-sub">
              Three turnkey physical business formats engineered for streetfronts, commercial kiosks, and full dine-in spaces. Explore the specifications below to picture your location and prepare your written quotation request.
            </p>
          </div>

          {/* Quotation Guidance Notice (Restrained Chinese Menu Border Style) */}
          <div className="pkg__notice-banner" role="note">
            <div className="pkg__notice-accent" aria-hidden="true" />
            <div className="pkg__notice-content">
              <span className="pkg__notice-tag">QUOTATION PROTOCOL</span>
              <p className="pkg__notice-text">{QUOTATION_GUIDANCE}</p>
            </div>
          </div>

          {/* Quick Format Directory Bar */}
          <nav className="pkg__directory-nav" aria-label="Format directory">
            <span className="pkg__dir-label">Quick Jump:</span>
            <div className="pkg__dir-links">
              {PACKAGES.map((pkg) => (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => scrollToFormat(pkg.id)}
                  className="pkg__dir-btn"
                >
                  <span className="pkg__dir-num">{pkg.num}</span>
                  <span className="pkg__dir-name">{pkg.name}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={scrollToComparison}
                className="pkg__dir-btn pkg__dir-btn--compare"
              >
                <BiTable className="pkg__dir-icon" aria-hidden="true" />
                <span>Compare All Formats</span>
              </button>
            </div>
          </nav>
        </header>

        {/* ═══════════════════════════════════════════════════════════
           THREE EDITORIAL SPREADS (Stacked Vertically)
           ═══════════════════════════════════════════════════════════ */}
        <div className="pkg__spreads">
          {PACKAGES.map((pkg, index) => {
            const isReversed = index % 2 === 1; // Alternates image left/right on desktop
            const isOpen = !!expandedInclusions[pkg.id];

            return (
              <article
                key={pkg.id}
                id={`package-${pkg.id}`}
                className={`pkg-spread ${isReversed ? 'pkg-spread--reversed' : ''}`}
              >
                {/* ─── COLUMN A: Business-Format Image Presentation (50% Desktop) ─── */}
                <div className="pkg-spread__media">
                  <div className="pkg-spread__frame">
                    {/* Chinese Menu Style Corner Tick Marks */}
                    <div className="pkg-spread__frame-tick pkg-spread__frame-tick--tl" aria-hidden="true" />
                    <div className="pkg-spread__frame-tick pkg-spread__frame-tick--tr" aria-hidden="true" />
                    <div className="pkg-spread__frame-tick pkg-spread__frame-tick--bl" aria-hidden="true" />
                    <div className="pkg-spread__frame-tick pkg-spread__frame-tick--br" aria-hidden="true" />

                    {/* Format Chop Seal Tag */}
                    <div className="pkg-spread__seal-tag" aria-hidden="true">
                      <span className="pkg-spread__seal-char">{pkg.seal}</span>
                      <span className="pkg-spread__seal-num">FORMAT // {pkg.num}</span>
                    </div>

                    <figure className="pkg-spread__figure">
                      <img
                        src={pkg.image}
                        alt={pkg.imageAlt}
                        className="pkg-spread__img"
                        loading="lazy"
                      />
                      <figcaption className="pkg-spread__caption">
                        <span className="pkg-spread__caption-dot" aria-hidden="true" />
                        <span>{pkg.caption}</span>
                      </figcaption>
                    </figure>
                  </div>
                </div>

                {/* ─── COLUMN B: Structured Information Area (50% Desktop) ─── */}
                <div className="pkg-spread__info">
                  {/* Overline & Category */}
                  <div className="pkg-spread__meta">
                    <span className="pkg-spread__code">FORMAT // {pkg.num}</span>
                    <span className="pkg-spread__meta-sep" aria-hidden="true">/</span>
                    <span className="pkg-spread__category">{pkg.subtitle}</span>
                  </div>

                  {/* Main Format Title */}
                  <h3 className="pkg-spread__name">{pkg.name}</h3>

                  <p className="pkg-spread__desc">{pkg.description}</p>

                  {/* Essential Facts Grid (Always visible without interaction) */}
                  <div className="pkg-spread__facts">
                    <div className="pkg-spread__facts-header">
                      <span className="pkg-spread__facts-title">ESSENTIAL SPECIFICATIONS</span>
                      <span className="pkg-spread__facts-stamp">STANDARD TURNKEY</span>
                    </div>

                    <dl className="pkg-spread__facts-grid">
                      {pkg.facts.map((fact) => (
                        <div key={fact.label} className="pkg-spread__fact-item">
                          <dt className="pkg-spread__fact-label">{fact.label}</dt>
                          <dd className="pkg-spread__fact-value">{fact.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>

                  {/* Expandable Inclusions Accordion */}
                  <div className="pkg-spread__inclusions">
                    <button
                      type="button"
                      className="pkg-spread__inclusions-toggle"
                      onClick={() => toggleInclusions(pkg.id)}
                      aria-expanded={isOpen}
                      aria-controls={`inclusions-${pkg.id}`}
                    >
                      <span className="pkg-spread__toggle-label">
                        {isOpen ? 'Hide equipment & provisions' : 'View included equipment & provisions'}
                      </span>
                      {isOpen ? (
                        <BiChevronUp className="pkg-spread__toggle-icon" aria-hidden="true" />
                      ) : (
                        <BiChevronDown className="pkg-spread__toggle-icon" aria-hidden="true" />
                      )}
                    </button>

                    {isOpen && (
                      <div
                        id={`inclusions-${pkg.id}`}
                        className="pkg-spread__inclusions-panel"
                      >
                        <ul className="pkg-spread__inclusions-list">
                          {pkg.inclusions.map((item, idx) => (
                            <li key={idx} className="pkg-spread__inclusion-item">
                              <BiCheck className="pkg-spread__check-icon" aria-hidden="true" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Spread Action Row */}
                  <div className="pkg-spread__action-row">
                    <Link
                      to={`/application?package=${pkg.id}`}
                      className="pkg-spread__apply-btn"
                    >
                      <span>Apply for {pkg.name}</span>
                      <BiRightArrowAlt className="pkg-spread__btn-arrow" aria-hidden="true" />
                    </Link>
                    <span className="pkg-spread__pricing-note">{PRICING_NOTICE}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* ═══════════════════════════════════════════════════════════
           ACCESSIBLE FULL-FORMAT COMPARISON TABLE SECTION
           ═══════════════════════════════════════════════════════════ */}
        <section
          id="package-comparison-table"
          className="pkg-comparison"
          aria-label="Format specifications comparison"
        >
          <div className="pkg-comparison__header">
            <div className="pkg-comparison__header-left">
              <span className="pkg-comparison__eyebrow">SIDE-BY-SIDE MATRIX</span>
              <h3 className="pkg-comparison__title">Compare all three business formats</h3>
              <p className="pkg-comparison__subtitle">
                Side-by-side evaluation of space, utility requirements, hardware capacity, and deployment schedules.
              </p>
            </div>
            <button
              type="button"
              className="pkg-comparison__toggle-btn"
              onClick={() => setShowComparison(!showComparison)}
              aria-expanded={showComparison}
            >
              <span>{showComparison ? 'Collapse Table' : 'Expand Full Table'}</span>
              {showComparison ? (
                <BiChevronUp aria-hidden="true" />
              ) : (
                <BiChevronDown aria-hidden="true" />
              )}
            </button>
          </div>

          {showComparison && (
            <div className="pkg-comparison__table-wrap">
              <table className="pkg-comparison__table">
                <thead>
                  <tr>
                    <th scope="col" className="pkg-comparison__th-metric">Specification Parameter</th>
                    <th scope="col" className="pkg-comparison__th-format">
                      <div className="pkg-comparison__th-cell">
                        <span className="pkg-comparison__th-num">01</span>
                        <span className="pkg-comparison__th-name">Food Cart</span>
                      </div>
                    </th>
                    <th scope="col" className="pkg-comparison__th-format pkg-comparison__th-format--featured">
                      <div className="pkg-comparison__th-cell">
                        <span className="pkg-comparison__th-num">02</span>
                        <span className="pkg-comparison__th-name">Commercial Kiosk</span>
                      </div>
                    </th>
                    <th scope="col" className="pkg-comparison__th-format">
                      <div className="pkg-comparison__th-cell">
                        <span className="pkg-comparison__th-num">03</span>
                        <span className="pkg-comparison__th-name">Dine-In Storefront</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row, idx) => (
                    <tr key={idx} className="pkg-comparison__tr">
                      <th scope="row" className="pkg-comparison__td-metric">{row.metric}</th>
                      <td className="pkg-comparison__td-val">{row.f01}</td>
                      <td className="pkg-comparison__td-val pkg-comparison__td-val--featured">{row.f02}</td>
                      <td className="pkg-comparison__td-val">{row.f03}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pkg-comparison__table-footer">
                <span className="pkg-comparison__footer-notice">{PRICING_NOTICE}</span>
                <span className="pkg-comparison__footer-guide">
                  Equipment counts and utility specs are formalized in your written quotation before any financial commitment.
                </span>
              </div>
            </div>
          )}
        </section>

        {/* ═══════════════════════════════════════════════════════════
           QUOTATION CHECKLIST & EXPLORATORY APPLICATION BAR
           ═══════════════════════════════════════════════════════════ */}
        <aside className="pkg-protocol" aria-label="Formal quotation checklist">
          <div className="pkg-protocol__card">
            <div className="pkg-protocol__left">
              <span className="pkg-protocol__tag">FORMAL QUOTATION TRANSPARENCY</span>
              <h4 className="pkg-protocol__title">What is confirmed before you commit</h4>
              <p className="pkg-protocol__desc">
                Siomai Street operates on written costed quotations. The following details are explicitly verified in writing prior to lease signing or capital transfer:
              </p>
              <div className="pkg-protocol__tags">
                {QUOTATION_CHECKLIST.map((item, idx) => (
                  <span key={idx} className="pkg-protocol__tag-pill">
                    <span className="pkg-protocol__tag-bullet" aria-hidden="true" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="pkg-protocol__right">
              <div className="pkg-protocol__undecided-box">
                <span className="pkg-protocol__undecided-eyebrow">STILL EVALUATING SITES?</span>
                <h5 className="pkg-protocol__undecided-title">Undecided on store format?</h5>
                <p className="pkg-protocol__undecided-text">
                  You can begin qualification without a finalized store model. Specify your target region and our development team will evaluate location feasibility.
                </p>
                <Link
                  to="/application?package=not-sure"
                  className="pkg-protocol__undecided-btn"
                >
                  <span>Start Exploratory Application</span>
                  <BiRightArrowAlt aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};

export default Packages;
