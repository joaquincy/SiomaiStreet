import useScrollReveal from '../../hooks/useScrollReveal';
import Hero from './components/Hero';
import AboutUs from './components/AboutUs';
import Marquee from './components/Marquee';
import WhyChoose from './components/WhyChoose';
import Journey from './components/Journey';
import Requirements from './components/Requirements';
import Packages from './components/Packages';
import FeaturedMenu from './components/FeaturedMenu';
import SuccessStories from './components/SuccessStories';
import FAQ from './components/FAQ';
import Testimonials from './components/Testimonials';
import CTA from './components/CTA';

const Home = () => {
  useScrollReveal();

  return (
    <main>
      <Hero />
      <AboutUs />
      <Marquee />
      <WhyChoose />
      <Journey />
      <Requirements />
      <Packages />
      <FeaturedMenu />
      <SuccessStories />
      <FAQ />
      <Testimonials />
      <CTA />
    </main>
  );
};

export default Home;
