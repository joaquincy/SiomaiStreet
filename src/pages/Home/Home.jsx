import PageMeta from '../../components/PageMeta';
import useScrollReveal from '../../hooks/useScrollReveal';
import Hero from './components/Hero';
import AboutUs from './components/AboutUs';
import Marquee from './components/Marquee';
import WhyChoose from './components/WhyChoose';
import Journey from './components/Journey';
import Requirements from './components/Requirements';
import Packages from './components/Packages';
import FeaturedMenu from './components/FeaturedMenu';
import FAQ from './components/FAQ';
import Testimonials from './components/Testimonials';
import CTA from './components/CTA';

const Home = () => {
  useScrollReveal();

  return (
    <main>
      <PageMeta
        path="/"
        description="Explore Siomai Street franchise formats, request current pricing and prepare your franchise application."
      />
      <Hero />
      <AboutUs />
      <Marquee />
      <WhyChoose />
      <Journey />
      <Requirements />
      <Packages />
      <FeaturedMenu />
      {/* Publish franchise performance stories only after verifying claims and permission. */}
      <FAQ />
      <Testimonials />
      <CTA />
    </main>
  );
};

export default Home;
