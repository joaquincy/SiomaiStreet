import { useEffect, useRef } from 'react';
import './Marquee.css';

const MARQUEE_ITEMS = [
  { type: 'brand', text: 'SIOMAI STREET' },
  { type: 'img', src: '/images/siomai 1.png', alt: 'Signature Siomai' },
  { type: 'badge', text: 'EST. 2015' },
  { type: 'text', text: '100% PURE PORK DIM SUM' },
  { type: 'sep' },
  { type: 'text', text: 'START YOUR OWN BUSINESS' },
  { type: 'img', src: '/images/franchise-store.png', alt: 'Turnkey Storefront' },
  { type: 'badge-red', text: '3 TURNKEY FORMATS' },
  { type: 'text', text: 'LOW OVERHEAD • FAST ROI' },
  { type: 'sep' },
  { type: 'text', text: 'CENTRALIZED COMMISSARY SUPPLY' },
  { type: 'img', src: '/images/menu-pork.png', alt: 'Steamed Dim Sum' },
  { type: 'text', text: 'STEAMED FRESH DAILY' },
  { type: 'sep' },
  { type: 'text', text: 'SLOW-SIMMERED CHILI GARLIC' },
  { type: 'sep' },
];

const renderItem = (item, index, groupKey) => {
  const key = `${groupKey}-${index}`;
  switch (item.type) {
    case 'brand':
      return (
        <span className="street-marquee__text street-marquee__text--brand" key={key}>
          {item.text}
        </span>
      );
    case 'badge':
      return (
        <span className="street-marquee__badge" key={key}>
          {item.text}
        </span>
      );
    case 'badge-red':
      return (
        <span className="street-marquee__badge street-marquee__badge--red" key={key}>
          {item.text}
        </span>
      );
    case 'img':
      return (
        <img
          key={key}
          src={item.src}
          alt={item.alt}
          className="street-marquee__img"
          loading="lazy"
        />
      );
    case 'sep':
      return (
        <span className="street-marquee__sep" aria-hidden="true" key={key}>
          ✦
        </span>
      );
    case 'text':
    default:
      return (
        <span className="street-marquee__text" key={key}>
          {item.text}
        </span>
      );
  }
};

const Marquee = () => {
  const sectionRef = useRef(null);

  // Pause the CSS animation when the marquee is offscreen to save GPU compositing
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const track = section.querySelector('.street-marquee__track');
        if (track) {
          track.style.animationPlayState = entry.isIntersecting ? 'running' : 'paused';
        }
      },
      { threshold: 0 }
    );
    observer.observe(section);

    return () => observer.disconnect();
  }, []);

  return (
    <section className="street-marquee" aria-hidden="true" ref={sectionRef}>
      <div className="street-marquee__tape">
        <div className="street-marquee__track">
          {/* Duplicate two identical groups for seamless infinite loop */}
          <div className="street-marquee__group">
            {MARQUEE_ITEMS.map((item, idx) => renderItem(item, idx, 'g1'))}
          </div>
          <div className="street-marquee__group" aria-hidden="true">
            {MARQUEE_ITEMS.map((item, idx) => renderItem(item, idx, 'g2'))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Marquee;
