import { useEffect, useRef, useState } from 'react';
import { BiUpArrowAlt } from 'react-icons/bi';
import { useLocation } from 'react-router-dom';
import { scrollToPageTop } from '../utils/scrollToPageTop';
import './BackToTop.css';

export default function BackToTop() {
  const { pathname } = useLocation();
  return <PageBackToTop key={pathname} />;
}

function PageBackToTop() {
  const [visible, setVisible] = useState(false);
  const target = useRef(null);
  const cancelScroll = useRef(null);
  const [travelling, setTravelling] = useState(false);

  useEffect(() => {
    const hero = document.getElementById('hero');
    const heading = document.querySelector('main h1') || document.querySelector('main');
    if (!heading) return;
    const previousTabIndex = heading.getAttribute('tabindex');
    heading.setAttribute('tabindex', '-1');
    target.current = heading;
    let frame;
    const check = () => {
      frame = undefined;
      setVisible(hero ? hero.getBoundingClientRect().bottom <= 0 : window.scrollY > Math.min(500, window.innerHeight * .65));
    };
    const schedule = () => { if (frame === undefined) frame = requestAnimationFrame(check); };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    check();
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      cancelAnimationFrame(frame);
      cancelScroll.current?.();
      if (previousTabIndex === null) heading.removeAttribute('tabindex');
      else heading.setAttribute('tabindex', previousTabIndex);
      target.current = null;
    };
  }, []);

  const returnToTop = () => {
    cancelScroll.current?.();
    setTravelling(true);
    cancelScroll.current = scrollToPageTop(window, reached => {
      if (reached) target.current?.focus({ preventScroll: true });
      setTravelling(false);
    });
  };

  const shown = visible || travelling;
  return <button type="button" className={`home-back-top${shown ? ' is-visible' : ''}${travelling ? ' is-travelling' : ''}`} onClick={returnToTop} tabIndex={shown ? 0 : -1} aria-hidden={!shown} aria-label="Back to top">
    <span className="home-back-top__label">{travelling ? 'Heading up' : 'Back to top'}</span>
    <span className="home-back-top__icon" aria-hidden="true"><span className="home-back-top__arrows"><BiUpArrowAlt /><BiUpArrowAlt /></span></span>
  </button>;
}
