import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineArrowRight } from 'react-icons/hi';
import './FAQ.css';

const faqData = [
  {
    question: 'How much capital do I need to start a Siomai Street franchise?',
    answer: 'Our franchise packages start at ₱39,999 for the Cart Package, ₱149,999 for the Kiosk Package, and ₱299,999 for the Store Package. Each package includes everything you need to get started — no hidden fees.',
  },
  {
    question: 'Do I need prior food business experience?',
    answer: 'Not at all! We provide comprehensive training covering food preparation, operations, customer service, and business management. Our system is designed for beginners and experienced entrepreneurs alike.',
  },
  {
    question: 'How long before I can start operating?',
    answer: 'Typically, you can be up and running within 2-4 weeks after signing the franchise agreement. This includes training, setup, and your grand opening preparation.',
  },
  {
    question: 'What kind of support do you provide to franchisees?',
    answer: 'We provide full support including initial training, marketing materials, operations manual, supply chain access, ongoing consultation, and a dedicated franchise manager for Kiosk and Store packages.',
  },
  {
    question: 'Can I choose my own location?',
    answer: 'Yes! You can propose your preferred location, and our team will help evaluate its potential. We look for high-foot-traffic areas near schools, offices, markets, and transportation hubs.',
  },
  {
    question: 'Is the franchise fee a one-time payment?',
    answer: 'Yes, the franchise fee is a one-time investment. There are no monthly royalty fees. You only need to purchase your supplies through our approved supply chain to maintain quality standards.',
  },
  {
    question: 'What is the average ROI for a Siomai Street franchise?',
    answer: 'Most franchisees see a return on investment within 3-6 months, depending on their location and package. Our Kiosk and Store packages typically have faster ROI due to higher volume potential.',
  },
];

const FaqItem = ({ item, index, isOpen, onToggle }) => {
  const number = String(index + 1).padStart(2, '0');

  return (
    <div className={`faq-card ${isOpen ? 'faq-card--open' : ''}`}>
      <button
        className="faq-card__trigger"
        onClick={onToggle}
        id={`faq-question-${index}`}
        aria-expanded={isOpen}
        aria-controls={`faq-answer-${index}`}
      >
        <span className="faq-card__num">{number}</span>
        <span className="faq-card__q">{item.question}</span>
        <span className="faq-card__toggle" aria-hidden="true">
          <span className="faq-card__toggle-bar faq-card__toggle-bar--h" />
          <span className="faq-card__toggle-bar faq-card__toggle-bar--v" />
        </span>
      </button>

      <div
        className="faq-card__body"
        id={`faq-answer-${index}`}
        role="region"
      >
        <div className="faq-card__body-inner">
          <p className="faq-card__answer">{item.answer}</p>
        </div>
      </div>
    </div>
  );
};

const FAQ = () => {
  // Ensure the first FAQ is open by default
  const [openIndex, setOpenIndex] = useState(0);
  const sectionRef = useRef(null);

  const toggle = (index) => {
    setOpenIndex(openIndex === index ? -1 : index);
  };

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          section.classList.add('faq--visible');
          observer.unobserve(section);
        }
      },
      { threshold: 0.08 }
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="faq-section" id="faq" ref={sectionRef}>
      <div className="faq-section__container">

        {/* ─── Left Column ─── */}
        <div className="faq-left">
          {/* Ambient glow for the left side to balance the composition */}
          <div className="faq-left__glow" aria-hidden="true" />

          <div className="faq-left__label">
            <span className="faq-left__label-line" aria-hidden="true" />
            <span className="faq-left__label-text">FAQs</span>
          </div>

          <h2 className="faq-left__heading">
            Frequently Asked<br />
            Questions
          </h2>

          <p className="faq-left__desc">
            Got questions about starting your Siomai Street franchise?
            We've got you covered. Here are the most common questions
            from aspiring franchisees.
          </p>

          <div className="faq-info-card">
            {/* Soft inner glow for the card to make it more aesthetically modern */}
            <div className="faq-info-card__bg-glow" aria-hidden="true" />

            <div className="faq-info-card__icon-wrap">
              <img
                src="/images/siomai street logo.png"
                alt="Siomai Street"
                className="faq-info-card__logo"
              />
            </div>
            <h3 className="faq-info-card__title">Franchise Information</h3>
            <p className="faq-info-card__text">
              Have more questions? Start your Siomai Street franchise journey with us today.
            </p>
            <Link to="/application" className="faq-info-card__cta">
              Learn More <HiOutlineArrowRight />
            </Link>
          </div>
        </div>

        {/* ─── Right Column ─── */}
        <div className="faq-right">
          {/* Ambient Glows positioned behind the glass cards */}
          <div className="faq-right__glow-container" aria-hidden="true">
            <div className="faq-right__glow faq-right__glow--peach" />
            <div className="faq-right__glow faq-right__glow--orange" />
            <div className="faq-right__glow faq-right__glow--cream" />
          </div>

          <div className="faq-right__list">
            {faqData.map((item, index) => (
              <FaqItem
                key={index}
                item={item}
                index={index}
                isOpen={openIndex === index}
                onToggle={() => toggle(index)}
              />
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};

export default FAQ;
