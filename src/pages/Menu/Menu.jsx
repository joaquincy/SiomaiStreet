import { useRef, useEffect, useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { BiChevronLeft, BiChevronRight } from 'react-icons/bi';
import PageMeta from '../../components/PageMeta';
import useScrollReveal from '../../hooks/useScrollReveal';
import { getSrcSet } from '../../utils/responsiveImage';
import './Menu.css';

// Widths for menu items in /public/images/Menu/responsive
const MENU_ITEM_WIDTHS = [300, 500];
const HERO_WIDTHS = [300, 500, 800];

const srcSetFor = (src) => {
  if (src.startsWith('/images/Menu/') || src.startsWith('/images/menu/')) {
    return getSrcSet(src, MENU_ITEM_WIDTHS);
  }
  return getSrcSet(src, HERO_WIDTHS);
};

/*
 * Menu Catalog Definition:
 * Uses real Siomai Street products from /public/images/Menu/
 * Unified with Homepage Section Design System (Soft Steamed Cream #f0e9da + Red/Espresso accents)
 */
const MENU_SECTIONS = [
  {
    id: 'siomai',
    eyebrow: 'CATEGORY 01 // STEAMED PERFECTION',
    titleMain: 'Signature Dim Sum &',
    titleAccent: 'Siomai',
    description: '100% pure meat dim sum steamed hot in bamboo baskets. Served with freshly sliced calamansi and house slow-simmered chili garlic crisp.',
    items: [
      {
        name: 'Japanese Nori Siomai',
        note: '4 pcs • Wrapped in Roasted Nori',
        price: '₱50',
        image: '/images/Menu/Japanese Siomai 2.webp',
        cutout: true,
        tag: 'FAVORITE',
      },
      {
        name: 'Siomai Steamer Bowl',
        note: 'Signature Steamer • Chili Garlic',
        price: '₱45',
        image: '/images/Menu/SIOMAI BOWL.png',
        cutout: true,
        tag: 'BEST SELLER',
      },
      {
        name: 'Crispy Lumpia Shanghai',
        note: '5 pcs • Golden Fried Rolls',
        price: '₱40',
        image: '/images/Menu/Lumpia.webp',
        cutout: true,
        tag: 'CRISPY',
      },
      {
        name: 'Dim Sum Chicken Feet',
        note: 'Slow-Braised • Spiced Bean Sauce',
        price: '₱55',
        image: '/images/Menu/Chicken Feets.webp',
        cutout: true,
        tag: "CHEF'S SPECIAL",
      },
      {
        name: 'Steamed Wonton Soup',
        note: 'Warm Savory Broth • Pork Wontons',
        price: '₱50',
        image: '/images/Menu/Wonton Soup.webp',
        cutout: true,
      },
      {
        name: 'Hot Chili Dim Sum Soup',
        note: 'Fiery Chili Broth • Dim Sum Noodles',
        price: '₱55',
        image: '/images/Menu/Chili Soup.webp',
        cutout: true,
        tag: 'HOT & SPICY',
      },
    ],
  },
  {
    id: 'siombo',
    eyebrow: 'CATEGORY 02 // ALL-IN-ONE COMBOS',
    titleMain: 'Siombo Signature',
    titleAccent: 'Combos',
    description: 'Siomai Street’s trademark Siombo combo platters: steamed siomai, crispy sides, and fragrant seasoned chow rice in hearty value combinations.',
    items: [
      {
        name: 'Siombo A',
        note: 'Steamed Siomai + Wonton + Chow Rice',
        price: '₱75',
        image: '/images/Menu/Siombo A.webp',
        cutout: true,
        tag: 'TOP COMBO',
      },
      {
        name: 'Siombo B',
        note: 'Signature Siomai + Lumpia + Chow Rice',
        price: '₱79',
        image: '/images/Menu/Siombo B.webp',
        cutout: true,
        tag: 'BEST VALUE',
      },
      {
        name: 'Siombo C',
        note: 'Special Chicken + Siomai + Chow Rice',
        price: '₱89',
        image: '/images/Menu/Siombo C.webp',
        cutout: true,
        tag: 'HEAVY MEAL',
      },
      {
        name: 'Siombo D',
        note: 'Deluxe Dim Sum Feast + Chow Rice',
        price: '₱95',
        image: '/images/Menu/Siombo D.webp',
        cutout: true,
        tag: 'DELUXE',
      },
    ],
  },
  {
    id: 'meals',
    eyebrow: 'CATEGORY 03 // HEARTY CHOW RICE',
    titleMain: 'Chow Rice Meals &',
    titleAccent: 'Mains',
    description: 'Hearty street-style chow rice meals paired with fresh crispy wontons, savory embutido, golden lumpia shanghai, and tender roast chicken.',
    items: [
      {
        name: 'Chow Rice with Wonton',
        note: 'Crisp Golden Wontons + Seasoned Rice',
        price: '₱65',
        image: '/images/Menu/Chow Rice with Wonton.webp',
        cutout: true,
        tag: 'MUST TRY',
      },
      {
        name: 'Lumpia Chow Rice',
        note: 'Golden Fried Lumpia + Chow Rice',
        price: '₱65',
        image: '/images/Menu/Lumpia chow rice.webp',
        cutout: true,
      },
      {
        name: 'Embutido Chow Rice',
        note: 'Savory Pork Embutido + Chow Rice',
        price: '₱69',
        image: '/images/Menu/Embutido Chow Rice.webp',
        cutout: true,
        tag: 'HOUSE SPECIAL',
      },
      {
        name: 'Wonton Steamed Rice Meal',
        note: 'Savory Dim Sum Wontons + Hot Rice',
        price: '₱65',
        image: '/images/Menu/Wonton Rice.webp',
        cutout: true,
      },
      {
        name: 'Roast Chicken Combo',
        note: 'Savory Glazed Chicken + Sides & Rice',
        price: '₱99',
        image: '/images/Menu/Roast Chicken Combo.webp',
        cutout: true,
        tag: 'CHICKEN FAVORITE',
      },
      {
        name: 'Lumpia Chicken Duo',
        note: 'Crispy Lumpia + Savory Chicken Plate',
        price: '₱95',
        image: '/images/Menu/Lumpia with Chicken.webp',
        cutout: true,
      },
    ],
  },
  {
    id: 'platters',
    eyebrow: 'CATEGORY 04 // CELEBRATION BILAOS',
    titleMain: 'Party Bilaos &',
    titleAccent: 'Sharing',
    description: 'Grand woven bamboo bilaos packed with freshly steamed siomai and crispy golden lumpia. Perfect for family gatherings, office feasts, and barkada parties.',
    items: [
      {
        name: 'Grand Siomai Bilao',
        note: 'Party Bamboo Bilao • Mixed Siomai Feast',
        price: '₱349',
        image: '/images/Menu/SIOMAI BILAO.png',
        cutout: true,
        tag: 'PARTY SIZE',
      },
      {
        name: 'Crispy Lumpia Bilao',
        note: 'Celebration Bilao • Golden Lumpia Shanghai',
        price: '₱349',
        image: '/images/Menu/lumpia bilao.png',
        cutout: true,
        tag: 'BEST FOR EVENTS',
      },
    ],
  },
  {
    id: 'drinks',
    eyebrow: 'CATEGORY 05 // REFRESHING SIPS',
    titleMain: 'Street Coolers &',
    titleAccent: 'Pitchers',
    description: 'Ice-cold cucumber lemonade, house specialty blends, and sharing pitchers freshly prepared to pair with your dim sum.',
    items: [
      {
        name: 'Fresh Cucumber Cooler',
        note: '16 oz • Chilled Fresh Cucumber Lemonade',
        price: '₱29',
        image: '/images/Menu/Cucumber drink.webp',
        cutout: true,
        tag: 'REFRESHING',
      },
      {
        name: 'Cucumber Lemonade Pitcher',
        note: 'Sharing Pitcher • Fresh Cucumber Infusion',
        price: '₱79',
        image: '/images/Menu/Cucumber Pitcher.webp',
        cutout: true,
        tag: 'BARKADA SHARE',
      },
      {
        name: 'House Blend Drinks Pitcher',
        note: 'Sharing Pitcher • Sweet Iced Street Blend',
        price: '₱79',
        image: '/images/Menu/Drinks Pitcher.webp',
        cutout: true,
        tag: 'POPULAR',
      },
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
    <path d="M42 22C40 16 45 12 43 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M60 19C58 12 63 8 61 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M78 22C76 16 81 12 79 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M18 14L96 34" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M102 14L24 34" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M35 42C35 35 44 33 49 38C53 33 65 33 69 38C74 33 85 35 85 42" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <ellipse cx="60" cy="44" rx="34" ry="7" stroke="currentColor" strokeWidth="1.7" />
    <path d="M26 44V58C26 62.5 41.2 66 60 66C78.8 66 94 62.5 94 58V44" stroke="currentColor" strokeWidth="1.7" />
    <path d="M26 52C26 56.5 41.2 60 60 60C78.8 60 94 56.5 94 52" stroke="currentColor" strokeWidth="1.4" />
    <path d="M40 50L45 58M56 51L61 60M72 50L77 58" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const BackgroundDrawings = () => (
  <div className="food-drawings" aria-hidden="true">
    <svg className="food-drawing food-drawing--chopsticks" viewBox="0 0 240 260" fill="none">
      <path d="M12 28L168 88" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 56L168 98" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M118 96C112 96 108 102 110 110L115 138C117 146 125 150 138 150C151 150 159 146 161 138L166 110C168 102 164 96 158 96C153 96 151 101 146 100C141 99 141 94 138 94C135 94 135 99 130 100C125 101 123 96 118 96Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M124 112L127 140M138 110V142M152 112L149 140" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="138" cy="99" r="4" stroke="currentColor" strokeWidth="1.4" />
      <ellipse cx="138" cy="204" rx="58" ry="16" stroke="currentColor" strokeWidth="1.8" />
      <ellipse cx="138" cy="204" rx="40" ry="9" stroke="currentColor" strokeWidth="1.2" strokeDasharray="4 4" />
      <path d="M98 214C106 226 120 232 138 232C156 232 170 226 178 214" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M138 162C138 162 134 169 138 172C142 169 138 162 138 162Z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M132 182C132 182 129 187 132 189C135 187 132 182 132 182Z" stroke="currentColor" strokeWidth="1.4" />
    </svg>

    <svg className="food-drawing food-drawing--steamer" viewBox="0 0 260 260" fill="none">
      <path d="M92 52C86 38 98 26 90 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M130 44C124 28 138 18 130 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M168 52C162 38 174 26 166 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <ellipse cx="130" cy="86" rx="74" ry="20" stroke="currentColor" strokeWidth="1.8" />
      <path d="M56 86C62 56 92 44 130 44C168 44 198 56 204 86" stroke="currentColor" strokeWidth="1.8" />
      <ellipse cx="130" cy="44" rx="14" ry="5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M84 68L108 82M112 62L144 82M148 64L174 80" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M174 68L150 82M144 62L112 82M108 64L84 80" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M56 86V134C56 146 89 156 130 156C171 156 204 146 204 134V86" stroke="currentColor" strokeWidth="1.8" />
      <path d="M56 112C56 124 89 134 130 134C171 134 204 124 204 112" stroke="currentColor" strokeWidth="1.4" />
      <path d="M56 134V182C56 194 89 204 130 204C171 204 204 194 204 182V134" stroke="currentColor" strokeWidth="1.8" />
      <path d="M56 160C56 172 89 182 130 182C171 182 204 172 204 160" stroke="currentColor" strokeWidth="1.4" />
    </svg>

    <svg className="food-drawing food-drawing--spices" viewBox="0 0 240 240" fill="none">
      <path
        d="M54 68C76 64 98 78 112 104C126 130 152 156 194 152C168 176 124 174 96 146C68 118 52 88 54 68Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M54 68C44 58 34 56 24 62" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M48 74C50 64 58 60 64 64" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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
      <path
        d="M66 154C66 142 74 134 78 122C82 134 90 142 90 154C98 158 102 168 98 180C94 190 84 194 78 194C72 194 62 190 58 180C54 168 58 158 66 154Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M78 130V194M70 146C66 162 68 180 74 193M86 146C90 162 88 180 82 193" stroke="currentColor" strokeWidth="1.2" />
    </svg>

    <svg className="food-drawing food-drawing--citrus" viewBox="0 0 240 240" fill="none">
      <circle cx="136" cy="134" r="52" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="136" cy="134" r="44" stroke="currentColor" strokeWidth="1.2" />
      <path d="M136 90V178M92 134H180M105 103L167 165M167 103L105 165" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="136" cy="134" r="7" fill="var(--color-canvas)" stroke="currentColor" strokeWidth="1.4" />
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
  const animRef = useRef(null);
  const targetIdxRef = useRef(0);

  const stopAnimation = useCallback(() => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
    if (trackRef.current) {
      trackRef.current.style.scrollSnapType = '';
    }
  }, []);

  useEffect(() => () => stopAnimation(), [stopAnimation]);

  const scrollByCard = useCallback((dir) => {
    const track = trackRef.current;
    if (!track) return;
    const cards = track.children;
    const total = cards.length;
    if (!total) return;

    const firstWidth = cards[0].offsetWidth || track.clientWidth;
    const visibleCount = Math.max(1, Math.round(track.clientWidth / firstWidth));
    const maxIdx = Math.max(0, total - visibleCount);

    // Sync starting index from actual scroll position when not mid-animation
    if (!animRef.current) {
      let closestIdx = 0;
      let minDiff = Infinity;
      const currentScroll = track.scrollLeft;
      for (let i = 0; i <= maxIdx; i++) {
        const card = cards[i];
        const cardTarget =
          visibleCount === 1
            ? card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2
            : card.offsetLeft;
        const diff = Math.abs(currentScroll - cardTarget);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      }
      targetIdxRef.current = closestIdx;
    }

    let nextIdx = targetIdxRef.current + dir;
    if (nextIdx > maxIdx) nextIdx = 0;
    else if (nextIdx < 0) nextIdx = maxIdx;
    targetIdxRef.current = nextIdx;

    const targetCard = cards[nextIdx];
    const rawTarget =
      visibleCount === 1
        ? targetCard.offsetLeft - (track.clientWidth - targetCard.offsetWidth) / 2
        : targetCard.offsetLeft;
    const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
    const targetLeft = Math.max(0, Math.min(maxScroll, rawTarget));

    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      stopAnimation();
      track.scrollLeft = targetLeft;
      return;
    }

    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }

    const startLeft = track.scrollLeft;
    const distance = targetLeft - startLeft;
    if (Math.abs(distance) < 1) {
      track.style.scrollSnapType = '';
      return;
    }

    // Temporarily disable CSS scroll-snap so it never fights the button glide
    track.style.scrollSnapType = 'none';
    const duration = 340;
    const startTime = performance.now();

    const stepFrame = (now) => {
      const t = Math.min(1, (now - startTime) / duration);
      // Quartic ease-out for fast response and silky deceleration
      const eased = 1 - Math.pow(1 - t, 4);
      track.scrollLeft = startLeft + distance * eased;

      if (t < 1) {
        animRef.current = requestAnimationFrame(stepFrame);
      } else {
        track.scrollLeft = targetLeft;
        track.style.scrollSnapType = '';
        animRef.current = null;
      }
    };

    animRef.current = requestAnimationFrame(stepFrame);
  }, [stopAnimation]);

  return (
    <section className="food-section" id={section.id} aria-labelledby={`${section.id}-title`}>
      {/* ─── Category Section Header (Unified with Homepage Cream Sections) ─── */}
      <div className="food-section__header reveal">
        <div className="food-section__eyebrow">
          <span className="food-section__eyebrow-line" aria-hidden="true" />
          <span className="food-section__eyebrow-text">{section.eyebrow}</span>
          <span className="food-section__eyebrow-line" aria-hidden="true" />
        </div>
        <h2 className="food-section__title" id={`${section.id}-title`}>
          {section.titleMain} <em>{section.titleAccent}</em>
        </h2>
        <p className="food-section__lead">{section.description}</p>
      </div>

      <div className="food-carousel reveal">
        <button
          type="button"
          className="food-carousel__arrow food-carousel__arrow--prev"
          onClick={() => scrollByCard(-1)}
          aria-label={`Previous ${section.titleMain} ${section.titleAccent}`}
        >
          <BiChevronLeft aria-hidden="true" />
        </button>

        <ul
          className="food-carousel__track"
          ref={trackRef}
          onPointerDown={stopAnimation}
          onTouchStart={stopAnimation}
        >
          {section.items.map((item) => (
            <li className="food-item" key={item.name}>
              <div className={`food-item__plate ${item.cutout ? 'is-cutout' : 'is-photo'}`}>
                {item.tag && <span className="food-item__tag">{item.tag}</span>}
                <img
                  src={encodeURI(item.image)}
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
          aria-label={`Next ${section.titleMain} ${section.titleAccent}`}
        >
          <BiChevronRight aria-hidden="true" />
        </button>
      </div>
    </section>
  );
};

const MENU_CATEGORIES = [
  { id: 'siomai', index: '01', label: 'Signature Dim Sum' },
  { id: 'siombo', index: '02', label: 'Siombo Combos' },
  { id: 'meals', index: '03', label: 'Chow Rice Meals' },
  { id: 'platters', index: '04', label: 'Party Bilaos' },
  { id: 'drinks', index: '05', label: 'Drinks & Pitchers' },
];

const MenuPage = () => {
  useScrollReveal();
  const [activeCategory, setActiveCategory] = useState('siomai');

  const handleCategoryClick = useCallback((e, id) => {
    e.preventDefault();
    setActiveCategory(id);
    const target = document.getElementById(id);
    if (!target) return;
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      window.history.replaceState(null, '', `#${id}`);
    }
  }, []);

  return (
    <main className="food-page">
      <PageMeta
        title="Menu"
        path="/menu"
        description="Browse the authentic Siomai Street menu featuring signature Japanese nori and steamed siomai, Siombo combos, chow rice meals, party bilaos, and chilled cucumber coolers."
      />

      {/* ─── Hero Photography Banner (Unified with Dark Obsidian/Warm Gold Style) ─── */}
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
          <h1 className="food-banner__title">
            Our <em>Menu</em>
          </h1>
        </div>
      </section>

      {/* ─── Main Soft Steamed Cream Canvas with Line-Art Illustrations ─── */}
      <div className="food-canvas">
        <BackgroundDrawings />

        {/* ─── Centered Editorial Intro (Harmonized with FeaturedMenu / FAQ / Contact) ─── */}
        <section className="food-intro">
          <div className="container food-intro__inner reveal">
            <SteamerEmblemSvg />

            {/* Eyebrow Kicker: 28x3px Pill Line + Bold Kicker */}
            <div className="food-kicker">
              <span className="food-kicker-line" aria-hidden="true" />
              <span className="food-kicker-text">CRAFTED FOR THE STREETS</span>
              <span className="food-kicker-line" aria-hidden="true" />
            </div>

            <h2 className="food-intro__title">
              Street Recipes, <em>Steamed Fresh Daily.</em>
            </h2>
            <p className="food-intro__text">
              For Siomai Street, every basket is a shared memory. Taste the authentic street-side
              dim sum we grew up loving — prepared daily with coarse-ground pork, whole shrimp,
              and our signature slow-simmered house chili garlic crisp.
            </p>

            {/* Minimal Editorial Category Index */}
            <nav className="food-nav" aria-label="Menu categories">
              {MENU_CATEGORIES.map((cat) => (
                <a
                  key={cat.id}
                  href={`#${cat.id}`}
                  className={`food-nav__pill${activeCategory === cat.id ? ' is-active' : ''}`}
                  onClick={(e) => handleCategoryClick(e, cat.id)}
                >
                  <span className="food-nav__index" aria-hidden="true">{cat.index}</span>
                  <span className="food-nav__label">{cat.label}</span>
                </a>
              ))}
            </nav>
          </div>
        </section>

        {/* ─── Category Carousels ─── */}
        <div className="food-sections container">
          {MENU_SECTIONS.map((section) => (
            <MenuCarousel key={section.id} section={section} />
          ))}

          {/* ─── Bottom Panelist-Ready Franchise Callout Card ─── */}
          <section className="food-cta reveal">
            <div className="food-cta__inner">
              <div className="food-cta__content">
                <div className="food-cta__kicker-wrap">
                  <span className="food-cta__kicker-dot" aria-hidden="true" />
                  <span className="food-cta__kicker">FRANCHISE OPPORTUNITY</span>
                </div>
                <h2 className="food-cta__title">
                  Serve this proven menu in <em>your neighborhood.</em>
                </h2>
                <p className="food-cta__text">
                  Turnkey franchise carts equipped with commercial steamers and centralized daily commissary delivery. Low overhead unit economics proven across 45+ locations.
                </p>
              </div>
              <div className="food-cta__actions">
                <Link to="/application" className="food-btn food-btn--primary">
                  Apply for Franchise →
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};

export default MenuPage;
