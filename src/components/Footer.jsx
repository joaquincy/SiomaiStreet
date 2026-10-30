import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BiPhone, BiEnvelope, BiMap, BiTime, BiLogoFacebook, BiLogoInstagram, BiLogoTiktok } from 'react-icons/bi';
import { SOCIALS } from '../data/siteData';
import { getSrcSet } from '../utils/responsiveImage';
import './Footer.css';

const siomaiVariants = {
  original: {
    src: '/images/siomai 1.png',
    alt: 'Original siomai',
    widths: [200, 400],
  },
  japanese: {
    src: '/images/japanese siomai.png',
    alt: 'Japanese siomai',
    widths: [400, 800],
  },
};

const Footer = () => {
  const sectionRef = useRef(null);
  const currentYear = new Date().getFullYear();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // Only trigger once
        }
      },
      { threshold: 0.2 } // Trigger when 20% visible
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Mix siomai varieties here as new product images are added.
  const foodPieces = [
    { variety: 'original', left: '-5%', bottom: '-5%', width: 'clamp(150px, 15vw, 250px)', rot: '-12deg', delay: '0s', z: 3 },
    { variety: 'japanese', left: '8%', bottom: '2%', width: 'clamp(180px, 18vw, 280px)', rot: '5deg', delay: '0.1s', z: 4 },
    { variety: 'original', left: '20%', bottom: '-8%', width: 'clamp(160px, 16vw, 260px)', rot: '22deg', delay: '0.05s', z: 2 },
    { variety: 'japanese', left: '35%', bottom: '5%', width: 'clamp(140px, 14vw, 220px)', rot: '-18deg', delay: '0.2s', z: 5 },
    { variety: 'original', left: '48%', bottom: '-2%', width: 'clamp(200px, 20vw, 300px)', rot: '8deg', delay: '0.15s', z: 3 },
    { variety: 'japanese', left: '60%', bottom: '10%', width: 'clamp(160px, 15vw, 240px)', rot: '-5deg', delay: '0.25s', z: 4 },
    { variety: 'original', left: '72%', bottom: '-5%', width: 'clamp(180px, 18vw, 280px)', rot: '15deg', delay: '0.1s', z: 2 },
    { variety: 'japanese', left: '85%', bottom: '5%', width: 'clamp(170px, 17vw, 270px)', rot: '-25deg', delay: '0.3s', z: 5 },
    { variety: 'original', left: '95%', bottom: '-10%', width: 'clamp(200px, 20vw, 320px)', rot: '35deg', delay: '0.05s', z: 3 },
    
    // Additional smaller background scatter
    { variety: 'original', left: '15%', bottom: '15%', width: 'clamp(100px, 10vw, 150px)', rot: '45deg', delay: '0.4s', z: 1 },
    { variety: 'japanese', left: '55%', bottom: '25%', width: 'clamp(120px, 12vw, 180px)', rot: '-40deg', delay: '0.35s', z: 1 },
    { variety: 'original', left: '80%', bottom: '18%', width: 'clamp(110px, 11vw, 160px)', rot: '60deg', delay: '0.45s', z: 1 },
  ];

  return (
    <footer className={`footer-poster ${isVisible ? 'is-visible' : ''}`} id="contact" ref={sectionRef}>
      
      {/* ─── Giant Typography ─── */}
      <div className="footer-poster__giant-text-container" aria-hidden="true">
        <div className="footer-poster__word-row">
          <div className="footer-sign-col footer-sign-col--left">
            <span className="footer-sign-word footer-sign-word--left" data-text="Siomai">Siomai</span>
          </div>
          <img
            src="/images/siomai street logo.png"
            srcSet="/images/responsive/siomai street logo-100w.png 100w, /images/responsive/siomai street logo-200w.png 200w, /images/responsive/siomai street logo-400w.png 400w"
            sizes="120px"
            alt="Siomai Street" className="footer-sign-logo"
          />
          <div className="footer-sign-col footer-sign-col--right">
            <span className="footer-sign-word footer-sign-word--right" data-text="Street">Street</span>
          </div>
        </div>
      </div>

      {/* ─── Falling Food Pile ─── */}
      <div className="footer-poster__food-pile" aria-hidden="true">
        {foodPieces.map((piece, index) => {
          const siomai = siomaiVariants[piece.variety];

          return (
            <img
              key={index}
              src={siomai.src}
              srcSet={getSrcSet(siomai.src, siomai.widths)}
              sizes="(max-width: 768px) 150px, 280px"
              alt={siomai.alt}
              className="footer-poster__food-piece"
              style={{
                '--left': piece.left,
                '--bottom': piece.bottom,
                '--width': piece.width,
                '--rot': piece.rot,
                '--delay': piece.delay,
                '--z': piece.z
              }}
              loading="lazy"
            />
          );
        })}
      </div>

      {/* ─── Editorial Content Area ─── */}
      <div className="footer-poster__content-wrapper">
        
        {/* Brand details top */}
        <div className="footer-poster__stamp-row">
          <span className="footer-poster__stamp">EST. 2015</span>
          <span className="footer-poster__stamp footer-poster__stamp--red">HOT • FRESH • STREET</span>
        </div>

        <div className="footer-poster__grid">
          
          {/* Navigation */}
          <div className="footer-poster__col">
            <h4 className="footer-poster__col-title">EXPLORE</h4>
            <nav className="footer-poster__nav">
              <Link to="/"><span>01</span> HOME</Link>
              <Link to="/#about"><span>02</span> OUR STORY</Link>
              <Link to="/application#packages"><span>03</span> PACKAGES</Link>
              <Link to="/application#journey"><span>04</span> FRANCHISE JOURNEY</Link>
              <Link to="/reviews"><span>05</span> REVIEWS</Link>
              <Link to="/menu"><span>06</span> FULL MENU</Link>
            </nav>
          </div>

          {/* Contact & Socials */}
          <div className="footer-poster__col footer-poster__col--contact">
            <h4 className="footer-poster__col-title">GET IN TOUCH</h4>
            
            <div className="footer-poster__contact-list">
              <div className="footer-poster__contact-item">
                <BiPhone className="footer-poster__contact-icon" />
                <a href="tel:+639123456789">+63 912 345 6789</a>
              </div>
              <div className="footer-poster__contact-item">
                <BiEnvelope className="footer-poster__contact-icon" />
                <a href="mailto:franchise@siomaistreet.ph">franchise@siomaistreet.ph</a>
              </div>
              <div className="footer-poster__contact-item">
                <BiMap className="footer-poster__contact-icon" />
                <span>Manila, Philippines</span>
              </div>
              <div className="footer-poster__contact-item">
                <BiTime className="footer-poster__contact-icon" />
                <span>Mon-Sat: 8AM - 6PM</span>
              </div>
            </div>

            <div className="footer-poster__socials">
              <a href={SOCIALS.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook"><BiLogoFacebook /></a>
              <a href={SOCIALS.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><BiLogoInstagram /></a>
              <a href={SOCIALS.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok"><BiLogoTiktok /></a>
            </div>
          </div>
          
          {/* Action Area */}
          <div className="footer-poster__col footer-poster__col--action">
            <div className="footer-poster__logo">
              Siomai<span>Street</span>
            </div>
            <p className="footer-poster__desc">
              The Philippines' favorite siomai franchise. Bringing joy, flavor, and entrepreneurial opportunity to every street corner since 2015.
            </p>
            <Link to="/application" className="footer-poster__cta">
              APPLY FOR FRANCHISE <span className="arrow">→</span>
            </Link>
          </div>

        </div>

        {/* Bottom Copyright */}
        <div className="footer-poster__bottom-bar">
          <p>© {currentYear} SIOMAI STREET. ALL RIGHTS RESERVED.</p>
          <div className="footer-poster__legal">
            <Link to="/privacy">PRIVACY</Link>
            <Link to="/terms">TERMS</Link>
            <Link to="/cookies">COOKIES</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
