import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineArrowLeft, HiOutlineCheck, HiOutlineRefresh, HiOutlineExclamation } from 'react-icons/hi';
import ReceiptAccess from './ReceiptAccess';
import ApplicationSupport from './ApplicationSupport';
import './ApplicationReceipt.css';

export default function ApplicationReceipt({ receipt, cleanupStatus = '', busy = false, onRetryCleanup, onNewApplication }) {
  const headingRef = useRef(null);
  const cleanupFailed = cleanupStatus.startsWith('Cleanup failed');
  const clearing = !cleanupStatus || cleanupStatus.startsWith('Clearing');

  useEffect(() => {
    // This is an in-place route transition; move keyboard and reading focus to its outcome.
    window.scrollTo({ top: 0, behavior: 'instant' });
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  return <div className="application-receipt">
    <div className="receipt-masthead">
      <span>Siomai Street <span aria-hidden="true">/</span> Franchising</span>
      <Link to="/"><HiOutlineArrowLeft aria-hidden="true" /> Back to home</Link>
    </div>

    <section className="receipt-paper" aria-labelledby="receipt-title">
      <header className="receipt-intro">
        <div className="receipt-confirmation"><span aria-hidden="true"><HiOutlineCheck /></span> Submission confirmed</div>
        <h1 id="receipt-title" ref={headingRef} tabIndex={-1}>Application<br /><em>received.</em></h1>
        <p className="receipt-intro-copy">Thank you for taking the next step with Siomai Street. Your application record has been received.</p>
        <div className="receipt-approval-note">
          <strong>Received does not mean approved.</strong>
          <p>This receipt is not franchise approval, a binding franchise agreement, or account activation.</p>
        </div>
      </header>

      <ReceiptAccess receipt={receipt} />

      <section className="receipt-followup" aria-labelledby="receipt-next-heading">
        <h2 id="receipt-next-heading">What happens next</h2>
        <ol role="list">
          <li><span aria-hidden="true">01</span><div><h3>Keep your receipt</h3><p>Save your reference and private access code before leaving this page.</p></div></li>
          <li><span aria-hidden="true">02</span><div><h3>Check for review updates</h3><p>Use Track Status. Official review and response timelines are not yet confirmed.</p></div></li>
          <li><span aria-hidden="true">03</span><div><h3>Make corrections in one place</h3><p>If a replacement is requested, send it through Track Status. You don’t need to apply again.</p></div></li>
        </ol>
      </section>
    </section>

    <section className={`receipt-device-note${cleanupFailed ? ' receipt-device-note--warning' : ''}`} aria-label="Local draft cleanup">
      {cleanupFailed ? <HiOutlineExclamation aria-hidden="true" /> : <HiOutlineCheck aria-hidden="true" className={clearing ? 'receipt-cleanup-pending' : ''} />}
      <div>
        <p role="status" aria-live="polite" aria-atomic="true">{cleanupStatus || 'Clearing local draft…'}</p>
        {cleanupFailed && <button type="button" className="receipt-text-button" onClick={onRetryCleanup}><HiOutlineRefresh aria-hidden="true" /> Retry local draft cleanup</button>}
      </div>
    </section>

    <div className="receipt-help"><h2>Need a hand?</h2><ApplicationSupport /></div>
    <div className="receipt-another">
      <p>Applying for someone else? Save this receipt before starting again.</p>
      <button type="button" className="receipt-text-button" disabled={busy || clearing || cleanupFailed} onClick={onNewApplication}>Start a new application <span aria-hidden="true">↗</span></button>
    </div>
  </div>;
}
