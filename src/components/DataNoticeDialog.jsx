import { useEffect, useRef, useState } from 'react';
import { BiX } from 'react-icons/bi';
import './DataNoticeDialog.css';

export default function DataNoticeDialog({ onClose }) {
  const dialog = useRef(null);
  const closeButton = useRef(null);
  const [content, setContent] = useState({ Page: null, failed: false });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const element = dialog.current;
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus({ preventScroll: true });
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    // The same module serves /privacy. Browsers cache successful imports, so
    // reopening needs no additional policy download or background polling.
    import('../pages/Legal/DataNoticePage.jsx').then(
      module => { if (!cancelled) setContent({ Page: module.default, failed: false }); },
      () => { if (!cancelled) setContent({ Page: null, failed: true }); },
    );
    return () => { cancelled = true; };
  }, [attempt]);

  const { Page, failed } = content;
  return (
    <dialog ref={dialog} className="data-notice-dialog" aria-labelledby="data-notice-dialog-title"
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
      }}>
      <header className="data-notice-dialog__header">
        <div className="data-notice-dialog__heading">
          <h2 id="data-notice-dialog-title">Privacy Policy</h2>
          <p>How we handle your information.</p>
        </div>
        <button ref={closeButton} type="button" onClick={onClose} aria-label="Close privacy policy"><BiX aria-hidden="true" /></button>
      </header>
      <div className="data-notice-dialog__body" tabIndex={0} role="region" aria-label="Privacy policy content" aria-busy={!Page && !failed}>
        {Page ? <Page embedded /> : failed ? <div className="data-notice-dialog__message">
          <p role="alert">The policy could not be loaded. Your current page is still open underneath.</p>
          <button type="button" onClick={() => { setContent({ Page: null, failed: false }); setAttempt(value => value + 1); }}>Try again</button>
        </div> : <p className="data-notice-dialog__message" role="status">Loading privacy policy...</p>}
      </div>
    </dialog>
  );
}
