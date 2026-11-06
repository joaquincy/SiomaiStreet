import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BiPhone, BiEnvelope, BiMap, BiTime, BiLogoFacebook, BiLogoInstagram, BiLogoTiktok } from 'react-icons/bi';
import { SOCIALS } from '../data/siteData';
import { getSrcSet } from '../utils/responsiveImage';
import DataNoticeDialog from './DataNoticeDialog';
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
  const [privacyOpen, setPrivacyOpen] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // Only trigger once
        }
      },
      { threshold: 0.12 } // Trigger smoothly on both desktop and mobile viewports
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Curated, balanced siomai pieces along the bottom edge (matches desktop composition on all screens)
  const foodPieces = [
    {
      variety: 'original',
      left: '-4%',
      bottom: '-5%',
      width: 'clamp(145px, 14.5vw, 230px)',
      mobileLeft: '-6%',
      mobileBottom: '-3%',
      mobileWidth: 'clamp(84px, 23vw, 128px)',
      rot: '-14deg',
      delay: '0s',
      z: 3,
    },
    {
      variety: 'japanese',
      left: '11%',
      bottom: '2%',
      width: 'clamp(160px, 16vw, 250px)',
      mobileLeft: '11%',
      mobileBottom: '1%',
      mobileWidth: 'clamp(90px, 25vw, 136px)',
      rot: '8deg',
      delay: '0.1s',
      z: 4,
    },
    {
      variety: 'original',
      left: '29%',
      bottom: '-6%',
      width: 'clamp(150px, 15vw, 235px)',
      mobileLeft: '30%',
      mobileBottom: '-4%',
      mobileWidth: 'clamp(82px, 22.5vw, 124px)',
      rot: '20deg',
      delay: '0.06s',
      z: 2,
    },
    {
      variety: 'japanese',
      left: '46%',
      bottom: '1%',
      width: 'clamp(170px, 17vw, 265px)',
      mobileLeft: '48%',
      mobileBottom: '1%',
      mobileWidth: 'clamp(92px, 25.5vw, 138px)',
      rot: '-10deg',
      delay: '0.16s',
      z: 4,
    },
    {
      variety: 'original',
      left: '65%',
      bottom: '-5%',
      width: 'clamp(155px, 15.5vw, 245px)',
      mobileLeft: '66%',
      mobileBottom: '-3%',
      mobileWidth: 'clamp(84px, 23vw, 128px)',
      rot: '15deg',
      delay: '0.12s',
      z: 3,
    },
    {
      variety: 'japanese',
      left: '83%',
      bottom: '2%',
      width: 'clamp(165px, 16.5vw, 255px)',
      mobileLeft: '81%',
      mobileBottom: '1%',
      mobileWidth: 'clamp(88px, 24.5vw, 134px)',
      rot: '-22deg',
      delay: '0.22s',
      z: 4,
    },
    // Subtle smaller background scatter for depth
    {
      variety: 'original',
      left: '21%',
      bottom: '13%',
      width: 'clamp(100px, 10vw, 148px)',
      mobileLeft: '20%',
      mobileBottom: '7%',
      mobileWidth: 'clamp(62px, 17vw, 92px)',
      rot: '38deg',
      delay: '0.3s',
      z: 1,
    },
    {
      variety: 'japanese',
      left: '74%',
      bottom: '14%',
      width: 'clamp(108px, 10.5vw, 158px)',
      mobileLeft: '73%',
      mobileBottom: '8%',
      mobileWidth: 'clamp(64px, 17.5vw, 96px)',
      rot: '-32deg',
      delay: '0.35s',
      z: 1,
    },
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
            src="/images/siomai%20street%20logo.png"
            srcSet="/images/responsive/siomai%20street%20logo-100w.png 100w, /images/responsive/siomai%20street%20logo-200w.png 200w, /images/responsive/siomai%20street%20logo-400w.png 400w"
            sizes="(max-width: 768px) 17vw, 10.5vw"
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
              sizes="(max-width: 768px) 25vw, 260px"
              alt={siomai.alt}
              className="footer-poster__food-piece"
              style={{
                '--left': piece.left,
                '--bottom': piece.bottom,
                '--width': piece.width,
                '--mobile-left': piece.mobileLeft,
                '--mobile-bottom': piece.mobileBottom,
                '--mobile-width': piece.mobileWidth,
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
      </div>

      {/* ─── Bottom-Most Rectangle Placer Bar ─── */}
      <div className="footer-poster__placer-bar">
        <div className="footer-poster__placer-inner">
          <span className="footer-poster__placer-copy">
            © {currentYear} SIOMAI STREET. ALL RIGHTS RESERVED.
          </span>
          <span className="footer-poster__placer-pipe" aria-hidden="true">|</span>
          <nav className="footer-poster__placer-links" aria-label="Legal links">
            <button type="button" className="footer-poster__privacy" aria-haspopup="dialog" onClick={() => setPrivacyOpen(true)}>PRIVACY</button>
            <span className="footer-poster__placer-link-sep" aria-hidden="true">|</span>
            <Link to="/terms">TERMS</Link>
            <span className="footer-poster__placer-link-sep" aria-hidden="true">|</span>
            <Link to="/cookies">COOKIES</Link>
          </nav>
        </div>
      </div>
      {privacyOpen && <DataNoticeDialog onClose={() => setPrivacyOpen(false)} />}
    </footer>
  );
};

export default Footer;
