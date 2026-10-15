import { useEffect, useRef } from 'react';
import './Marquee.css';

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
          {/* Content duplicated for seamless infinite loop */}
          {[...Array(4)].map((_, i) => (
            <div className="street-marquee__content" key={i}>
              <span className="street-marquee__text">SIOMAI STREET</span>
              <img src="/images/siomai 1.png" alt="" className="street-marquee__img" loading="lazy" />
              <span className="street-marquee__text street-marquee__text--outline">EST. 2015</span>
              <span className="street-marquee__star">✦</span>
              <span className="street-marquee__text">HOT &amp; FRESH</span>
              <img src="/images/menu-pork.png" alt="" className="street-marquee__img" loading="lazy" />
              <span className="street-marquee__text street-marquee__text--outline">STREET FOOD</span>
              <span className="street-marquee__star">✦</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Marquee;
