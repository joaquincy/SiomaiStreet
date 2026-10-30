import { useEffect, useRef } from 'react';
import { getSrcSet } from '../../../utils/responsiveImage';
import './Requirements.css';

const REQUIREMENTS = [
  {
    number: '01',
    titleMain: 'PLAN YOUR',
    titleSub: 'BUDGET',
    description: 'Request a written quotation and budget for setup and ongoing operating costs.',
    image: '/images/siomai 1.png',
    widths: [200, 400],
  },
  {
    number: '02',
    titleMain: 'CHOOSE A',
    titleSub: 'LOCATION',
    description: 'Provide a preferred city and region. A specific site is not needed to begin.',
    image: '/images/franchise-store.png',
    widths: [400, 640, 876],
  },
  {
    number: '03',
    titleMain: 'PREPARE TO',
    titleSub: 'OPERATE',
    description: 'Consider who will run the branch and discuss training and support in your offer.',
    image: '/images/menu-classic.png',
    widths: [300, 600],
  },
];

const Requirements = () => {
  const sectionRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          section.classList.add('req-max-visible');
          observer.unobserve(section);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(section);

    return () => observer.disconnect();
  }, []);

  return (
    <section className="req-max" id="requirements" ref={sectionRef}>

      {/* ─── Creative Background Elements ─── */}
      <div className="req-max__bg-noise"></div>
      <div className="req-max__bg-text">START</div>

      {/* ─── Dynamic Header ─── */}
      <header className="req-max__header">
        <div className="req-max__header-badge">
          <svg viewBox="0 0 100 100" className="req-max__spin-text">
            <path id="curve" d="M 50, 50 m -35, 0 a 35,35 0 1,1 70,0 a 35,35 0 1,1 -70,0" fill="transparent" />
            <text><textPath href="#curve" startOffset="0%">SIOMAI STREET FRANCHISE • SIOMAI STREET FRANCHISE • </textPath></text>
          </svg>
          <div className="req-max__spin-icon" aria-hidden="true">S</div>
        </div>

        <div className="req-max__heading-wrap">
          <div className="req-max__badge">
            <span className="req-max__badge-dot" aria-hidden="true" />
            <span className="req-max__badge-title">FRANCHISE ROADMAP</span>
            <span className="req-max__badge-divider" aria-hidden="true">/</span>
            <span className="req-max__badge-notice">3 SIMPLE PHASES</span>
          </div>

          <h2 className="req-max__heading">
            <span className="req-max__heading-outline">WHAT YOU NEED</span>
            <span className="req-max__heading-solid">TO GET STARTED</span>
          </h2>
        </div>
      </header>

      {/* ─── Floating Cards ─── */}
      <div className="req-max__cards-container">
        {REQUIREMENTS.map((item, i) => (
          <article
            className={`req-max__card req-max__card--${i + 1}`}
            key={i}
          >
            {/* Tape/Clip Element */}
            <div className="req-max__card-clip"></div>

            {/* Swiss-style Formal Header */}
            <div className="req-max__card-top-bar">
              <span className="req-max__eyebrow">PHASE // {item.number}</span>
              <span className="req-max__stamp">EST. 2015</span>
            </div>

            {/* Massive Aligned Title */}
            <div className="req-max__card-title-box">
              <h4 className="req-max__card-title-sub">{item.titleMain}</h4>
              <h3 className="req-max__card-title-main">{item.titleSub}</h3>
            </div>

            {/* Centered Visual */}
            <div className="req-max__card-visual">
              <div className="req-max__card-backdrop"></div>
              <img
                src={item.image}
                srcSet={getSrcSet(item.image, item.widths)}
                sizes="(max-width: 768px) 90vw, (max-width: 1024px) 40vw, 380px"
                alt={item.titleSub}
                className="req-max__card-img"
                loading="lazy"
              />
            </div>

            {/* Formal Footer */}
            <div className="req-max__card-bottom-bar">
              <p className="req-max__card-desc">{item.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default Requirements;
