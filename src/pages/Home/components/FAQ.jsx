import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineArrowRight } from 'react-icons/hi';
import './FAQ.css';

const faqData = [
  { question: 'How much capital do I need?', answer: 'Request a current written quotation for Food Cart, Kiosk or Casual Dining. Prices and package scope are awaiting confirmation. Budget separately for rent, deposits, permits, payroll, utilities and working capital unless expressly included.' },
  { question: 'Do I need prior food business experience?', answer: 'You can describe your actual experience, including no employment history. Do not invent a job to complete the form. Your application is subject to review; submitting does not establish eligibility or approval.' },
  { question: 'How long before I can start operating?', answer: 'An opening date depends on application review, site assessment, agreement, permits, equipment and training. There is no guaranteed review or opening timeline on this website.' },
  { question: 'What support is included?', answer: 'Ask for the written scope of training, supply arrangements, software, marketing and operational support, including service limits and any additional charges. These items are not confirmed inclusions until specified in your offer.' },
  { question: 'Can I apply without a location or final package choice?', answer: 'Yes. Select No for a specific location and Not sure yet for your package. Provide your preferred city and region. A proposed site still needs review; applying does not reserve a territory.' },
  { question: 'Are there recurring fees?', answer: 'Fees are not yet confirmed here. Request disclosure of initial, recurring, royalty, marketing, software, renewal and transfer charges, taxes, payment milestones and cancellation terms before signing or paying.' },
  { question: 'Are sales or investment returns guaranteed?', answer: 'No. Sales and investment recovery depend on costs, demand, location and operations. This website does not provide a verified payback forecast.' },
  { question: 'What happens after I submit?', answer: 'A successful submission shows a reference number after the server confirms receipt. Save that reference. Receipt is not approval, an agreement or activation of a franchise account. If submission fails, retain your draft and retry the same application.' },
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
                srcSet="/images/responsive/siomai street logo-100w.png 100w, /images/responsive/siomai street logo-200w.png 200w"
                sizes="80px"
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
