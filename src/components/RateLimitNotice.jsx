import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { RATE_ACTIONS, formatRateWait, rateFeedback } from '../utils/rateLimits.js';
import './RateLimitNotice.css';

export default function RateLimitNotice() {
  const notice = useSyncExternalStore(rateFeedback.subscribe, rateFeedback.getSnapshot, () => null);
  const dialog = useRef(null);
  const active = Boolean(notice);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const resume = () => { rateFeedback.refresh(); setNow(Date.now()); };
    window.addEventListener('focus', resume);
    document.addEventListener('visibilitychange', resume);
    return () => { window.removeEventListener('focus', resume); document.removeEventListener('visibilitychange', resume); };
  }, []);
  useEffect(() => {
    if (!notice) return;
    setNow(Date.now());
    if (notice.expiresAt <= Date.now()) return;
    const timer = setInterval(() => {
      const time = Date.now(); setNow(time);
      if (time >= notice.expiresAt) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [notice]);
  useEffect(() => {
    const element = dialog.current;
    if (!active || !element) return;
    let previousOverflow;
    // Let a security challenge, route planner or receipt finish first. Never
    // steal focus from another modal while a multi-request upload is running.
    const show = () => {
      const other = [...document.querySelectorAll('dialog[open], [aria-modal="true"]')]
        .some(node => node !== element && node.getClientRects().length);
      if (!element.open && !other) {
        element.showModal();
        previousOverflow = document.documentElement.style.overflow;
        document.documentElement.style.overflow = 'hidden';
      }
    };
    const observer = new MutationObserver(show);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open', 'aria-modal', 'hidden'] });
    show();
    return () => {
      observer.disconnect(); element.close();
      if (previousOverflow !== undefined) document.documentElement.style.overflow = previousOverflow;
    };
  }, [active]);
  if (!notice) return null;
  const action = RATE_ACTIONS[notice.scope];
  const seconds = Math.max(0, Math.ceil((notice.expiresAt - Math.max(now, Date.now())) / 1000));
  const empty = notice.remaining === 0;
  return (
    <dialog ref={dialog} className="rate-notice" aria-labelledby="rate-notice-title" aria-describedby="rate-notice-description" onCancel={event => { event.preventDefault(); rateFeedback.dismiss(); }}>
      <div className="rate-notice__top"><span>Siomai Street</span><button type="button" className="rate-notice__close" aria-label="Close request limit notice" onClick={rateFeedback.dismiss}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg></button></div>
      <div className="rate-notice__body">
        <p className="rate-notice__action">{action.label}</p>
        <h2 id="rate-notice-title">{seconds === 0 ? 'Ready to try again' : empty ? 'Time for a short pause' : 'You’re close to the limit'}</h2>
        <p id="rate-notice-description">{notice.limit} {action.unit} per {notice.windowSeconds === 3600 ? 'hour' : `${notice.windowSeconds / 60} minutes`}{action.shared === 'all visitors' ? ', shared by all visitors.' : action.shared === 'reply email' ? ' for this reply email.' : ' on your network. People on the same Wi-Fi may share this allowance.'}</p>
        {notice.scope === 'upload-start-burst' && <p className="rate-notice__hint">The first submission counts too. The five-minute window starts with the first attempt. A separate hourly allowance still applies.</p>}
        <div className="rate-notice__allowance">
          <div><strong>{seconds === 0 ? 'Reset' : notice.remaining}</strong><span>{seconds === 0 ? 'Window ended' : 'Remaining when last checked'}</span></div>
          <div><strong aria-hidden="true">{formatRateWait(seconds)}</strong><span>{empty ? 'Try again in' : 'Allowance resets in'}</span><span className="rate-notice__sr">{Math.ceil(seconds / 60)} minutes remaining.</span></div>
        </div>
        <p className="rate-notice__hint">{notice.scope === 'upload-control' ? 'A single submission uses several document requests. Keep the same application so completed uploads can be reused.' : action.conditional ? 'This limit applies to new items. Retrying the same unchanged request may still recover an existing session or receipt.' : 'You can close this notice and keep editing. Nothing will be submitted automatically.'}</p>
        <p className="rate-notice__hint">{empty && seconds > 0 ? 'Repeated clicks do not make the waiting period shorter. Keep this page open to retain any unsent entries.' : 'The server checks the allowance again when you retry.'}</p>
        {notice.allowed && <p className="rate-notice__hint">This notice does not cancel a response already received. Check the page for your submission result.</p>}
        <p role="status" className="rate-notice__sr">{seconds === 0 ? 'This waiting period has ended. You can close the notice and try again.' : ''}</p>
        <button type="button" className="rate-notice__done" onClick={rateFeedback.dismiss}>{seconds === 0 ? 'Back to my page' : 'Got it, keep my entries'}</button>
      </div>
    </dialog>
  );
}
