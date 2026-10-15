import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { BiCheck } from 'react-icons/bi';
import './Packages.css';

const PACKAGES = [
  {
    number: '01',
    tier: 'STARTER',
    name: 'Starter Package',
    description: 'Perfect for starting small in high-traffic areas with minimal investment.',
    price: '39,999',
    period: 'ONE-TIME INVESTMENT',
    popular: false,
    image: '/images/siomai 1.png',
    features: [
      'Complete cart setup',
      'Initial inventory supply',
      'Basic training program',
      'Branded packaging',
      'Operations manual',
      'Location assistance',
    ],
  },
  {
    number: '02',
    tier: 'KIOSK',
    name: 'Kiosk Package',
    description: 'Our most popular option — ideal for malls, terminals, and commercial areas.',
    price: '149,999',
    period: 'ONE-TIME INVESTMENT',
    popular: true,
    image: '/images/siomai front.png',
    features: [
      'Full kiosk build-out',
      'Complete equipment set',
      'Extended inventory supply',
      'Comprehensive training',
      'Marketing starter kit',
      'Dedicated franchise manager',
      'POS system included',
      'Grand opening support',
    ],
  },
  {
    number: '03',
    tier: 'FULL STORE',
    name: 'Full Store Package',
    description: 'The premium experience — a full dine-in store with maximum earning potential.',
    price: '299,999',
    period: 'ONE-TIME INVESTMENT',
    popular: false,
    image: '/images/franchise-store.png',
    features: [
      'Full store construction',
      'Premium equipment suite',
      'Maximum inventory supply',
      'VIP training program',
      'Full marketing campaign',
      'Priority support line',
      'POS & inventory system',
      'Staff hiring assistance',
    ],
  },
];

const Packages = () => {
  const sectionRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          section.classList.add('pkg--visible');
          observer.unobserve(section);
        }
      },
      { threshold: 0.08 }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="pkg" id="packages" ref={sectionRef}>
      {/* ─── Giant Background Typography ─── */}
      <div className="pkg__bg-type" aria-hidden="true">
        <span className="pkg__bg-word">SIOMAI</span>
        <span className="pkg__bg-word pkg__bg-word--2">STREET</span>
      </div>

      <div className="pkg__inner">
        {/* ─── Section Header ─── */}
        <header className="pkg__header">
          <div className="pkg__tag">
            <span className="pkg__tag-line" />
            FRANCHISE PACKAGES
          </div>
          <h2 className="pkg__title">
            Choose the setup{' '}
            that fits your <span className="pkg__title-red">goals.</span>
          </h2>
          <p className="pkg__desc">
            Flexible packages to match your budget and goals. Every package includes our proven system and ongoing support.
          </p>
        </header>

        {/* ─── Three Package Cards ─── */}
        <div className="pkg__row">
          {PACKAGES.map((pkg, i) => (
            <article
              key={i}
              className={`pkg__card ${pkg.popular ? 'pkg__card--hero' : ''}`}
            >
              {/* Most Popular Sticker */}
              {pkg.popular && (
                <div className="pkg__sticker">★ MOST POPULAR ★</div>
              )}

              {/* Image */}
              <div className="pkg__card-img-wrap">
                <img src={pkg.image} alt={pkg.name} className="pkg__card-img" />
              </div>

              {/* Content Panel */}
              <div className="pkg__card-body">
                {/* Oversized number watermark */}
                <span className="pkg__card-num" aria-hidden="true">{pkg.number}</span>

                <div className="pkg__card-head">
                  <span className="pkg__card-tier">{pkg.number} / {pkg.tier}</span>
                  <h3 className="pkg__card-name">{pkg.name}</h3>
                </div>

                <div className="pkg__card-price-row">
                  <span className="pkg__card-curr">₱</span>
                  <span className="pkg__card-price">{pkg.price}</span>
                </div>
                <div className="pkg__card-period">{pkg.period}</div>

                <p className="pkg__card-desc">{pkg.description}</p>

                <div className="pkg__card-features">
                  <h4 className="pkg__card-feat-title">WHAT'S INCLUDED</h4>
                  <ul className="pkg__card-feat-list">
                    {pkg.features.map((feat, fi) => (
                      <li key={fi}>
                        <BiCheck className="pkg__card-check" />
                        {feat}
                      </li>
                    ))}
                  </ul>
                </div>

                <Link to="/application#cta" className={`pkg__card-btn ${pkg.popular ? 'pkg__card-btn--red' : ''}`}>
                  Get Started <span className="pkg__card-btn-arr">→</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Packages;
