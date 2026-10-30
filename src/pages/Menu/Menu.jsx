import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { BiChevronLeft, BiChevronRight } from 'react-icons/bi';
import PageMeta from '../../components/PageMeta';
import useScrollReveal from '../../hooks/useScrollReveal';
import { getSrcSet } from '../../utils/responsiveImage';
import './Menu.css';

// Widths that exist in /public/images/responsive (see generate-responsive-images.cjs)
const IMAGE_WIDTHS = {
  '/images/menu-pork.png': [200, 400],
  '/images/menu-classic.png': [300, 600],
  '/images/menu-shrimp.png': [300, 600],
  '/images/menu-drinks.png': [300, 600],
  '/images/siomai 1.png': [200, 400],
  '/images/japanese siomai.png': [400, 800],
};
const PHOTO_WIDTHS = [300, 500, 800];

const srcSetFor = (src) => getSrcSet(src, IMAGE_WIDTHS[src] || PHOTO_WIDTHS);

/*
 * cutout: true  -> transparent PNG cutout, rendered in its natural silhouette on a plate
 * cutout: false -> rectangular food photograph, framed inside a circular ceramic plate
 */
const MENU_SECTIONS = [
  {
    id: 'siomai',
    title: 'Signature & Fresh Siomai',
    items: [
      { name: 'Classic Pork Siomai', note: '4 pcs • House Staple', price: '₱35', image: '/images/menu-pork.png', cutout: false },
      { name: 'Japanese Nori Siomai', note: '4 pcs • Seaweed Wrapped', price: '₱50', image: '/images/japanese siomai.png', cutout: true },
      { name: 'Supreme Shrimp Siomai', note: '4 pcs • Whole Shrimp Top', price: '₱45', image: '/images/menu-shrimp.png', cutout: false },
      { name: 'Savory Chicken Siomai', note: '4 pcs • Ginger & Scallion', price: '₱35', image: '/images/wc-siomai-3.jpg', cutout: false },
      { name: 'Peppered Beef Siomai', note: '4 pcs • Toasted Sesame', price: '₱40', image: '/images/wc-siomai-2.jpg', cutout: false },
    ],
  },
  {
    id: 'specials',
    title: 'Street Specials & Appetizers',
    items: [
      { name: 'Crispy Shanghai Siomai', note: '5 pcs • Golden Fried', price: '₱40', image: '/images/menu-classic.png', cutout: false },
      { name: 'Chili Crisp Siomai', note: '4 pcs • Double Spiced', price: '₱45', image: '/images/wc-siomai-6.jpg', cutout: false },
      { name: 'Garden Tofu Siomai', note: '4 pcs • Plant-Based', price: '₱30', image: '/images/wc-siomai-5.jpg', cutout: false },
      { name: 'Bamboo Steamer Basket', note: '6 pcs • Chef Assortment', price: '₱60', image: '/images/wc-siomai-4.jpg', cutout: false },
    ],
  },
  {
    id: 'meals',
    title: 'Rice Meals & Sharing Platters',
    items: [
      { name: 'Siomai Garlic Rice Meal', note: '4 pcs + Steamed Garlic Rice', price: '₱65', image: '/images/wc-siomai-1.jpg', cutout: false },
      { name: 'Barkada Family Platter', note: '20 pcs • Mixed Favorites', price: '₱195', image: '/images/wc-siomai-8.jpg', cutout: false },
      { name: 'Dim Sum Feast Plate', note: '8 pcs + Trio Dipping Sauces', price: '₱85', image: '/images/wc-siomai-7.jpg', cutout: false },
      { name: 'Street Solo Cup', note: '3 pcs • Skewered on the Go', price: '₱30', image: '/images/siomai 1.png', cutout: true },
    ],
  },
  {
    id: 'drinks',
    title: 'Drinks & Street Coolers',
    items: [
      { name: 'Old-Style Black Gulaman', note: '16 oz • Brown Sugar & Sago', price: '₱25', image: '/images/menu-drinks.png', cutout: false },
      { name: 'Fresh Mango Shake', note: '16 oz • Carabao Mango', price: '₱45', image: '/images/menu-drinks.png', cutout: false },
      { name: 'Calamansi Honey Cooler', note: '16 oz • Fresh Pressed Citrus', price: '₱25', image: '/images/menu-drinks.png', cutout: false },
    ],
  },
];

/* ─── Hand-Drawn Monoline Culinary Illustrations (Pen & Ink Style) ─── */
const SteamerEmblemSvg = () => (
  <svg
    className="food-intro__emblem"
    viewBox="0 0 120 76"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    {/* Rising steam lines */}
    <path d="M42 22C40 16 45 12 43 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M60 19C58 12 63 8 61 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M78 22C76 16 81 12 79 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    {/* Crossed chopsticks */}
    <path d="M18 14L96 34" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M102 14L24 34" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    {/* Three pleated siomai tops */}
    <path d="M35 42C35 35 44 33 49 38C53 33 65 33 69 38C74 33 85 35 85 42" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    {/* Bamboo steamer rim & woven body */}
    <ellipse cx="60" cy="44" rx="34" ry="7" stroke="currentColor" strokeWidth="1.7" />
    <path d="M26 44V58C26 62.5 41.2 66 60 66C78.8 66 94 62.5 94 58V44" stroke="currentColor" strokeWidth="1.7" />
    <path d="M26 52C26 56.5 41.2 60 60 60C78.8 60 94 56.5 94 52" stroke="currentColor" strokeWidth="1.4" />
    <path d="M40 50L45 58M56 51L61 60M72 50L77 58" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const BackgroundDrawings = () => (
  <div className="food-drawings" aria-hidden="true">
    {/* Drawing 1: Left Margin — Chopsticks lifting a pleated Siomai over dipping saucer */}
    <svg className="food-drawing food-drawing--chopsticks" viewBox="0 0 240 260" fill="none">
      <path d="M12 28L168 88" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 56L168 98" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      {/* Pleated Siomai dumpling */}
      <path
        d="M118 96C112 96 108 102 110 110L115 138C117 146 125 150 138 150C151 150 159 146 161 138L166 110C168 102 164 96 158 96C153 96 151 101 146 100C141 99 141 94 138 94C135 94 135 99 130 100C125 101 123 96 118 96Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M124 112L127 140M138 110V142M152 112L149 140" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="138" cy="99" r="4" stroke="currentColor" strokeWidth="1.4" />
      {/* Dipping saucer below */}
      <ellipse cx="138" cy="204" rx="58" ry="16" stroke="currentColor" strokeWidth="1.8" />
      <ellipse cx="138" cy="204" rx="40" ry="9" stroke="currentColor" strokeWidth="1.2" strokeDasharray="4 4" />
      <path d="M98 214C106 226 120 232 138 232C156 232 170 226 178 214" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      {/* Falling sauce droplets */}
      <path d="M138 162C138 162 134 169 138 172C142 169 138 162 138 162Z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M132 182C132 182 129 187 132 189C135 187 132 182 132 182Z" stroke="currentColor" strokeWidth="1.4" />
    </svg>

    {/* Drawing 2: Right Margin — Two-Tiered Bamboo Steamer & Botanical Herb Sprig */}
    <svg className="food-drawing food-drawing--steamer" viewBox="0 0 260 260" fill="none">
      {/* Steam curls */}
      <path d="M92 52C86 38 98 26 90 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M130 44C124 28 138 18 130 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M168 52C162 38 174 26 166 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      {/* Dome lid */}
      <ellipse cx="130" cy="86" rx="74" ry="20" stroke="currentColor" strokeWidth="1.8" />
      <path d="M56 86C62 56 92 44 130 44C168 44 198 56 204 86" stroke="currentColor" strokeWidth="1.8" />
      <ellipse cx="130" cy="44" rx="14" ry="5" stroke="currentColor" strokeWidth="1.6" />
      {/* Woven lattice detail on lid */}
      <path d="M84 68L108 82M112 62L144 82M148 64L174 80" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M174 68L150 82M144 62L112 82M108 64L84 80" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      {/* Tier 1 */}
      <path d="M56 86V134C56 146 89 156 130 156C171 156 204 146 204 134V86" stroke="currentColor" strokeWidth="1.8" />
      <path d="M56 112C56 124 89 134 130 134C171 134 204 124 204 112" stroke="currentColor" strokeWidth="1.4" />
      {/* Tier 2 */}
      <path d="M56 134V182C56 194 89 204 130 204C171 204 204 194 204 182V134" stroke="currentColor" strokeWidth="1.8" />
      <path d="M56 160C56 172 89 182 130 182C171 182 204 172 204 160" stroke="currentColor" strokeWidth="1.4" />
    </svg>

    {/* Drawing 3: Left Lower Margin — Chili Peppers, Garlic Cloves & Star Anise */}
    <svg className="food-drawing food-drawing--spices" viewBox="0 0 240 240" fill="none">
      {/* Curved Chili Pepper */}
      <path
        d="M54 68C76 64 98 78 112 104C126 130 152 156 194 152C168 176 124 174 96 146C68 118 52 88 54 68Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M54 68C44 58 34 56 24 62" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M48 74C50 64 58 60 64 64" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Star Anise */}
      <g transform="translate(154, 66)">
        <circle cx="0" cy="0" r="5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M0 -5C-5 -16 0 -26 0 -26C0 -26 5 -16 0 -5Z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M0 5C-5 16 0 26 0 26C0 26 5 16 0 5Z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M-5 0C-16 -5 -26 0 -26 0C-26 0 -16 5 -5 0Z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5 0C16 -5 26 0 26 0C26 0 16 5 5 0Z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M-4 -4C-14 -10 -18 -18 -18 -18C-18 -18 -10 -14 -4 -4Z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M4 4C14 10 18 18 18 18C18 18 10 14 4 4Z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M4 -4C14 -10 18 -18 18 -18C18 -18 10 -14 4 -4Z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M-4 4C-14 10 -18 18 -18 18C-18 18 -10 14 -4 4Z" stroke="currentColor" strokeWidth="1.5" />
      </g>
      {/* Garlic Bulb */}
      <path
        d="M66 154C66 142 74 134 78 122C82 134 90 142 90 154C98 158 102 168 98 180C94 190 84 194 78 194C72 194 62 190 58 180C54 168 58 158 66 154Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M78 130V194M70 146C66 162 68 180 74 193M86 146C90 162 88 180 82 193" stroke="currentColor" strokeWidth="1.2" />
    </svg>

    {/* Drawing 4: Right Lower Margin — Sliced Calamansi Citrus & Leaf Branch */}
    <svg className="food-drawing food-drawing--citrus" viewBox="0 0 240 240" fill="none">
      {/* Citrus cross-section */}
      <circle cx="136" cy="134" r="52" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="136" cy="134" r="44" stroke="currentColor" strokeWidth="1.2" />
      {/* Citrus segments */}
      <path d="M136 90V178M92 134H180M105 103L167 165M167 103L105 165" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="136" cy="134" r="7" fill="var(--color-canvas)" stroke="currentColor" strokeWidth="1.4" />
      {/* Botanical stem & leaves */}
      <path d="M64 62C92 64 116 72 136 82" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M98 70C88 46 62 36 38 44C48 66 72 76 98 70Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M42 46L94 68" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path
        d="M118 76C124 52 146 38 170 40C164 62 142 76 118 76Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M166 42L122 74" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  </div>
);

const MenuCarousel = ({ section }) => {
  const trackRef = useRef(null);

  // Scroll by one item width so cards always snap cleanly
  const scrollByCard = (dir) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.firstElementChild;
    const step = card ? card.getBoundingClientRect().width : track.clientWidth / 3;
    track.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  return (
    <section className="food-section" id={section.id} aria-labelledby={`${section.id}-title`}>
      <h2 className="food-section__title reveal" id={`${section.id}-title`}>
        <span className="food-section__title-text">{section.title}</span>
      </h2>

      <div className="food-carousel reveal">
        <button
          type="button"
          className="food-carousel__arrow food-carousel__arrow--prev"
          onClick={() => scrollByCard(-1)}
          aria-label={`Previous ${section.title}`}
        >
          <BiChevronLeft aria-hidden="true" />
        </button>

        <ul className="food-carousel__track" ref={trackRef}>
          {section.items.map((item) => (
            <li className="food-item" key={item.name}>
              <div className={`food-item__plate ${item.cutout ? 'is-cutout' : 'is-photo'}`}>
                <img
                  src={item.image}
                  srcSet={srcSetFor(item.image)}
                  sizes="(max-width: 600px) 72vw, (max-width: 900px) 42vw, 290px"
                  alt={item.name}
                  loading="lazy"
                  decoding="async"
                  width="300"
                  height="300"
                />
              </div>
              <h3 className="food-item__name">{item.name}</h3>
              <span className="food-item__note">{item.note}</span>
              <span className="food-item__price">{item.price}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          className="food-carousel__arrow food-carousel__arrow--next"
          onClick={() => scrollByCard(1)}
          aria-label={`Next ${section.title}`}
        >
          <BiChevronRight aria-hidden="true" />
        </button>
      </div>
    </section>
  );
};

const MenuPage = () => {
  useScrollReveal();

  return (
    <main className="food-page">
      <PageMeta
        title="Menu"
        path="/menu"
        description="Browse the Siomai Street menu featuring classic pork, Japanese nori and supreme shrimp siomai, garlic rice meals, platters and street coolers."
      />

      {/* ─── Tall Photography Banner ─── */}
      <section className="food-banner">
        <img
          className="food-banner__bg"
          src="/images/wc-siomai-8.jpg"
          srcSet={srcSetFor('/images/wc-siomai-8.jpg')}
          sizes="100vw"
          alt="Assorted steamed siomai baskets and dipping sauces"
          width="1400"
          height="780"
          fetchPriority="high"
        />
        <div className="food-banner__scrim" aria-hidden="true" />
        <div className="food-banner__content">
          <span className="food-banner__kicker">EST. 2015 • HANDCRAFTED DAILY</span>
          <h1 className="food-banner__title">OUR MENU</h1>
        </div>
      </section>

      {/* ─── Main Dirty-White Canvas with Hand-Drawn Background Illustrations ─── */}
      <div className="food-canvas">
        <BackgroundDrawings />

        {/* ─── Centered Editorial Intro ─── */}
        <section className="food-intro">
          <div className="container food-intro__inner reveal">
            <SteamerEmblemSvg />
            <h2 className="food-intro__title">
              Street Recipes
              <br />
              Steamed Fresh Daily
            </h2>
            <p className="food-intro__text">
              For Siomai Street, every basket is a shared memory. Taste the authentic street-side
              dim sum we grew up loving, prepared daily with fresh ingredients, whole shrimp and
              our slow-simmered house chili garlic crisp.
            </p>
            <p className="food-intro__subtext">Browse through our highlighted offerings.</p>
            <div className="food-intro__actions">
              <a href="#siomai" className="food-btn food-btn--primary">View Our Full Menu</a>
              <Link to="/application" className="food-btn food-btn--secondary">Franchise This Menu</Link>
            </div>
          </div>
        </section>

        {/* ─── Category Carousels ─── */}
        <div className="food-sections container">
          {MENU_SECTIONS.map((section) => (
            <MenuCarousel key={section.id} section={section} />
          ))}
        </div>
      </div>
    </main>
  );
};

export default MenuPage;
