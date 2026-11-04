import { useEffect, useRef } from 'react';
import PageMeta from '../../components/PageMeta';
import { observeMotionVisibility } from '../../utils/motionVisibility';
import useScrollReveal from '../../hooks/useScrollReveal';
import Hero from './components/Hero';
import AboutUs from './components/AboutUs';
import Marquee from './components/Marquee';
import WhyChoose from './components/WhyChoose';
import Journey from './components/Journey';
import Requirements from './components/Requirements';
import Packages from './components/Packages';
import FeaturedMenu from './components/FeaturedMenu';
import StoreFinder from './components/StoreFinder';
import FAQ from './components/FAQ';
import Testimonials from './components/Testimonials';
import CTA from './components/CTA';
import ContactSupport from './components/ContactSupport';
import './HomeMotion.css';

const Home = () => {
  const pageRef = useRef(null);
  useScrollReveal(pageRef);
  useEffect(() => {
    const sections = Array.from(pageRef.current?.children || []);
    const stop = observeMotionVisibility(sections, (section, active) => {
      section.dataset.homeMotion = active ? 'active' : 'paused';
    }, { rootMargin: '200px 0px' });
    return () => {
      stop();
      sections.forEach(section => delete section.dataset.homeMotion);
    };
  }, []);

  return (
    <main ref={pageRef} data-home-motion-root>
      <PageMeta
        path="/"
        description="Explore Siomai Street franchise formats, request current pricing and prepare your franchise application."
      />
      <Hero />
      <AboutUs />
      <Marquee />

      {/* ─── Sticky Curtain Reveal: WhyChoose stays pinned while Journey scrolls over it ─── */}
      <WhyChoose />
      <Journey />

      <Requirements />
      <Packages />
      <FeaturedMenu />
      <StoreFinder />
      {/* Publish franchise performance stories only after verifying claims and permission. */}
      <FAQ />
      <Testimonials />
      <CTA />
      <ContactSupport />
    </main>
  );
};

export default Home;
