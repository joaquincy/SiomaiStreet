import { useEffect, useRef } from 'react';
import { HiOutlineArrowRight } from 'react-icons/hi';
import { Link } from 'react-router-dom';
import './CTA.css';

const CTA = () => {
  const ctaRef = useRef(null);

  useEffect(() => {
    const section = ctaRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          section.classList.add('cta-art--visible');
          observer.unobserve(section);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(section);

    return () => observer.disconnect();
  }, []);

  return (
    <section className="cta-art" id="cta" ref={ctaRef}>
      {/* ─── Aesthetic Background ─── */}
      <div className="cta-art__grid" aria-hidden="true" />
      <div className="cta-art__glow" aria-hidden="true" />

      <div className="cta-art__container">
        {/* ─── Left: Typography & Story ─── */}
        <div className="cta-art__text-col">
          <div className="cta-art__badge">
            <span className="cta-art__badge-dot"></span>
            FRANCHISE OPPORTUNITY
          </div>

          <h2 className="cta-art__title">
            <span className="cta-art__title-line cta-art__title-line--1">YOUR</span>
            <span className="cta-art__title-line cta-art__title-line--2">JOURNEY</span>
            <span className="cta-art__title-line cta-art__title-line--3">STARTS ON</span>
            <span className="cta-art__title-line cta-art__title-line--4">THE STREET.</span>
          </h2>

          <p className="cta-art__desc">
            Become a part of the fastest-growing street food family.
            Proven systems, high foot traffic, and the taste that Filipinos love.
            Don't just open a business — claim your spot on the street.
          </p>

          <div className="cta-art__contact">
            <div>+63 912 345 6789</div>
            <div>franchise@siomaistreet.ph</div>
          </div>
        </div>

        {/* ─── Right: Artistic Image Collage ─── */}
        <div className="cta-art__visual-col">
          {/* Shape 1: The Arch */}
          <div className="cta-art__shape cta-art__shape--arch">
            <img src="/images/franchise-store.png" alt="Siomai Street Storefront" loading="lazy" />
          </div>

          {/* Shape 2: The Polaroid */}
          <div className="cta-art__shape cta-art__shape--polaroid">
            <img src="/images/wc-siomai-1.jpg" alt="Siomai Street Culture" loading="lazy" />
            <div className="cta-art__polaroid-cap">CROWD FAVORITE</div>
          </div>

          {/* Shape 3: The Floating Circle */}
          <div className="cta-art__shape cta-art__shape--circle">
            <img src="/images/siomai 1.png" alt="Premium Siomai" loading="lazy" />
            <div className="cta-art__circle-ring"></div>
          </div>

          {/* Shape 4: The Accent Stamp */}
          <div className="cta-art__stamp" aria-hidden="true">
            <svg viewBox="0 0 100 100" className="cta-art__stamp-svg">
              <path id="curve" d="M 50, 50 m -35, 0 a 35,35 0 1,1 70,0 a 35,35 0 1,1 -70,0" fill="transparent" />
              <text><textPath href="#curve" startOffset="0%">EST 2015 • ORIGINAL • TASTE • EST 2015 • ORIGINAL • TASTE • </textPath></text>
            </svg>
            <div className="cta-art__stamp-center">SS</div>
          </div>
        </div>
      </div>

      {/* ─── Massive Interactive Ticker Button ─── */}
      <Link to="/application" className="cta-art__ticker-btn">
        <div className="cta-art__ticker-track">
          <div className="cta-art__ticker-content">
            APPLY FOR FRANCHISE <HiOutlineArrowRight /> APPLY FOR FRANCHISE <HiOutlineArrowRight />
            APPLY FOR FRANCHISE <HiOutlineArrowRight /> APPLY FOR FRANCHISE <HiOutlineArrowRight />
            APPLY FOR FRANCHISE <HiOutlineArrowRight /> APPLY FOR FRANCHISE <HiOutlineArrowRight />
            APPLY FOR FRANCHISE <HiOutlineArrowRight /> APPLY FOR FRANCHISE <HiOutlineArrowRight />
          </div>
          <div className="cta-art__ticker-content" aria-hidden="true">
            APPLY FOR FRANCHISE <HiOutlineArrowRight /> APPLY FOR FRANCHISE <HiOutlineArrowRight />
            APPLY FOR FRANCHISE <HiOutlineArrowRight /> APPLY FOR FRANCHISE <HiOutlineArrowRight />
            APPLY FOR FRANCHISE <HiOutlineArrowRight /> APPLY FOR FRANCHISE <HiOutlineArrowRight />
            APPLY FOR FRANCHISE <HiOutlineArrowRight /> APPLY FOR FRANCHISE <HiOutlineArrowRight />
          </div>
        </div>
      </Link>
    </section>
  );
};

export default CTA;
