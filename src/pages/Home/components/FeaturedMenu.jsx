import { Link } from 'react-router-dom';
import useScrollReveal from '../../../hooks/useScrollReveal';
import './FeaturedMenu.css';

/* ─── Orange Accent Marks (twin curved droplets like inspiration) ─── */
const AccentMarks = ({ className = '' }) => (
  <svg className={`fm-accent-marks ${className}`} viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <path
      d="M8 8 C 8 4, 13 2, 16 2 C 16 10, 11 16, 7 16 C 5 16, 4 14, 4 12 C 4 10, 6 9, 8 8 Z"
      fill="#EBA028"
    />
    <path
      d="M22 14 C 22 10, 27 8, 30 8 C 30 16, 25 22, 21 22 C 19 22, 18 20, 18 18 C 18 16, 20 15, 22 14 Z"
      fill="#EBA028"
    />
  </svg>
);

/* ─── Hand-drawn Line-Art Calamansi / Lime Wedge (Story 1 top edge of left stamp) ─── */
const CalamansiWedge = ({ className = '' }) => (
  <svg className={`fm-botanical fm-botanical--calamansi ${className}`} viewBox="0 0 90 90" fill="none" aria-hidden="true">
    {/* Outer rind arc with light cream backing */}
    <path
      d="M 18 68 C 12 36, 36 12, 68 18 L 62 62 Z"
      stroke="#b82b26"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="#f0e9da"
    />
    {/* Inner pulp boundary */}
    <path
      d="M 24 62 C 20 38, 38 20, 62 24 L 56 56 Z"
      stroke="#b82b26"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Radial pulp segment dividers radiating towards corner */}
    <path d="M 56 56 L 28 44" stroke="#b82b26" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M 56 56 L 36 30" stroke="#b82b26" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M 56 56 L 48 24" stroke="#b82b26" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M 56 56 L 40 54" stroke="#b82b26" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

/* ─── Hand-drawn Line-Art Star Anise (Story 1 top-right of right stamp) ─── */
const StarAniseSvg = ({ className = '' }) => (
  <svg className={`fm-botanical fm-botanical--anise ${className}`} viewBox="0 0 80 80" fill="none" aria-hidden="true">
    {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
      <g key={angle} transform={`rotate(${angle} 40 40)`}>
        <path
          d="M40 40 C 35 30, 34 16, 40 10 C 46 16, 45 30, 40 40 Z"
          stroke="#b82b26"
          strokeWidth="1.8"
          strokeLinejoin="round"
          fill="#f0e9da"
        />
        <circle cx="40" cy="20" r="2.5" fill="#b82b26" />
      </g>
    ))}
    <circle cx="40" cy="40" r="4.5" stroke="#b82b26" strokeWidth="1.6" fill="#f0e9da" />
  </svg>
);

/* ─── Circular Ink Postmark Stamp with Wavy Lines (Story 2) ─── */
const InkPostmarkStamp = ({ className = '' }) => (
  <div className={`fm-ink-postmark ${className}`} aria-hidden="true">
    <svg viewBox="0 0 190 120" fill="none">
      {/* Circular cancellation stamp */}
      <g transform="translate(10, 10)">
        <circle cx="50" cy="50" r="46" stroke="#b82b26" strokeWidth="2.2" />
        <circle cx="50" cy="50" r="40" stroke="#b82b26" strokeWidth="1.2" strokeDasharray="3 2" />

        {/* Curved text path top */}
        <path id="fm-stamp-curve-top" d="M 16 50 A 34 34 0 0 1 84 50" fill="none" />
        <text fill="#b82b26" fontSize="8.5" fontWeight="800" letterSpacing="2.5" fontFamily="var(--font-heading)">
          <textPath href="#fm-stamp-curve-top" startOffset="50%" textAnchor="middle">
            HANDCRAFTED
          </textPath>
        </text>

        {/* Center illustration: two rolls & stars */}
        <g transform="translate(50, 50)">
          <text x="-16" y="3" fill="#b82b26" fontSize="8" textAnchor="middle">★</text>
          <text x="16" y="3" fill="#b82b26" fontSize="8" textAnchor="middle">★</text>
          <rect x="-10" y="-8" width="20" height="9" rx="3" stroke="#b82b26" strokeWidth="1.5" fill="none" transform="rotate(-15)" />
          <rect x="-8" y="-1" width="20" height="9" rx="3" stroke="#b82b26" strokeWidth="1.5" fill="none" transform="rotate(12)" />
        </g>

        {/* Curved text path bottom */}
        <path id="fm-stamp-curve-bot" d="M 16 50 A 34 34 0 0 0 84 50" fill="none" />
        <text fill="#b82b26" fontSize="7.5" fontWeight="700" letterSpacing="1.8" fontFamily="var(--font-heading)">
          <textPath href="#fm-stamp-curve-bot" startOffset="50%" textAnchor="middle">
            FOR EACH ORDER
          </textPath>
        </text>
      </g>

      {/* Postal cancellation wavy lines */}
      <path d="M 112 40 Q 128 32 144 40 T 176 40 T 190 40" stroke="#b82b26" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.85" />
      <path d="M 112 56 Q 128 48 144 56 T 176 56 T 190 56" stroke="#b82b26" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.85" />
      <path d="M 112 72 Q 128 64 144 72 T 176 72 T 190 72" stroke="#b82b26" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.85" />
    </svg>
  </div>
);

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
        {/* ── Story 1: Text Left, Postage Stamps + Bowl on Right (Full Bleed to Viewport Right) ── */}
        <article className="fm-story fm-story--text-left reveal">
          <div className="fm-story-text">
            <AccentMarks className="fm-accent-marks--story1" />
            <h3 className="fm-story-title">Classic Pork Siomai</h3>

            <div className="fm-story-specs">
              <div className="fm-spec-row">
                <span className="fm-spec-heading">Seasoned Pork Filling</span>
                <span className="fm-spec-detail">Coarse-ground pork with savory aromatics</span>
              </div>
              <div className="fm-spec-row">
                <span className="fm-spec-heading">Delicate Wonton Fold</span>
                <span className="fm-spec-detail">Pleated thin wrapper, steamed to order</span>
              </div>
              <div className="fm-spec-row">
                <span className="fm-spec-heading">House Condiments</span>
                <span className="fm-spec-detail">Slow-simmered chili garlic crisp and calamansi soy</span>
              </div>
            </div>

            <div className="fm-story-actions">
              <Link to="/menu" className="fm-btn fm-btn--primary">EXPLORE OUR MENU</Link>
            </div>
          </div>

          <div className="fm-story-imagery fm-imagery--story1">
            {/* Left Stamp: Chicken Feet (reaches into middle of the website) */}
            <div className="fm-stamp-wrap fm-stamp-wrap--chicken-feet">
              <img
                src="/images/chicken feet pic.png"
                alt="Savory chicken feet street snack"
                className="fm-stamp-img"
                loading="lazy"
                decoding="async"
              />
              <CalamansiWedge />
            </div>

            {/* Right Stamp: Wonton (elevated, behind bowl) */}
            <div className="fm-stamp-wrap fm-stamp-wrap--wonton">
              <img
                src="/images/wonton.png"
                alt="Crispy wonton in savory broth"
                className="fm-stamp-img"
                loading="lazy"
                decoding="async"
              />
              <StarAniseSvg />
            </div>

            {/* Hero Bowl: Siomai Rice Bowl with Egg (Foreground, grounded on baseline) */}
            <div className="fm-hero-wrap fm-hero-wrap--bowl">
              <img
                src="/images/siomai-bowl-hero.png"
                alt="Classic Pork Siomai Rice Bowl with Fried Egg"
                className="fm-hero-img fm-hero-img--bowl"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
        </article>

        {/* ── Story 2: Lumpia Bilao + Siomai Bilao on Left (Full Bleed to Viewport Left), Text Right ── */}
        <article className="fm-story fm-story--text-right reveal">
          <div className="fm-story-imagery fm-imagery--story2">
            {/* Background Bilao: Siomai Bilao (Bleeds off Left Viewport Edge) */}
            <div className="fm-bilao-wrap fm-bilao-wrap--back">
              <img
                src="/images/SIOMAI BILAO.png"
                alt="Siomai Bilao Party Platter"
                className="fm-bilao-img fm-bilao-img--back"
                loading="lazy"
                decoding="async"
              />
            </div>

            {/* Foreground Bilao: Lumpia Bilao (Overlaps back bilao, reaches towards center) */}
            <div className="fm-bilao-wrap fm-bilao-wrap--front">
              <img
                src="/images/lumpia bilao.png"
                alt="Crispy Lumpia and Steamed Siomai Bilao with Sweet Chili Dip"
                className="fm-bilao-img fm-bilao-img--front"
                loading="lazy"
                decoding="async"
              />
            </div>

            {/* Circular Ink Postmark Stamp */}
            <InkPostmarkStamp className="fm-ink-stamp--bilao" />
          </div>

          <div className="fm-story-text">
            <AccentMarks className="fm-accent-marks--story2" />
            <h3 className="fm-story-title">Crispy Lumpia &amp; Bilao Platters</h3>

            <div className="fm-story-specs">
              <div className="fm-spec-row">
                <span className="fm-spec-heading">Our #1 Favourite</span>
                <span className="fm-spec-detail">500+ pieces handcrafted daily</span>
              </div>
              <div className="fm-spec-row">
                <span className="fm-spec-heading">Freshly Made</span>
                <span className="fm-spec-detail">Steamed &amp; fried fresh for every celebration</span>
              </div>
              <div className="fm-spec-row">
                <span className="fm-spec-heading">House Dipping Sauces</span>
                <span className="fm-spec-detail">Sweet chili glaze and house chili garlic crisp</span>
              </div>
            </div>

            <div className="fm-story-actions">
              <Link to="/menu" className="fm-btn fm-btn--primary">EXPLORE OUR MENU</Link>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
};

export default FeaturedMenu;
