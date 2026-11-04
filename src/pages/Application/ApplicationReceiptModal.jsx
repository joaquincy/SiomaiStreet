import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineCheck, HiOutlineX } from 'react-icons/hi';
import ApplicationReceipt from './ApplicationReceipt';
import './ApplicationReceiptModal.css';

function ReceiptDialog({ onClose, returnFocus, ...receiptProps }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    const opener = returnFocus.current;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = 'hidden';
    element.querySelector('#receipt-title')?.focus({ preventScroll: true });
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [returnFocus]);

  return <dialog ref={dialog} className="receipt-dialog" aria-labelledby="receipt-title" aria-describedby="receipt-dialog-reminder"
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <header className="receipt-dialog-bar">
      <span>Your application receipt</span>
      <button type="button" onClick={onClose} aria-label="Close receipt"><HiOutlineX aria-hidden="true" /></button>
    </header>
    <div className="receipt-dialog-content">
      <p id="receipt-dialog-reminder" className="receipt-dialog-reminder">Save your receipt before leaving this page. Closing this window keeps it available here.</p>
      <ApplicationReceipt {...receiptProps} inModal />
    </div>
  </dialog>;
}

export default function ApplicationReceiptModal(props) {
  const [open, setOpen] = useState(true);
  const reopen = useRef(null);
  return <>
    <section className="receipt-return" aria-labelledby="receipt-return-title">
      <HiOutlineCheck aria-hidden="true" className="receipt-return-check" />
      <h1 id="receipt-return-title">Application received.</h1>
      <p>Your submission is recorded. Receipt does not mean approval.</p>
      <button ref={reopen} type="button" onClick={() => setOpen(true)} aria-haspopup="dialog">View and save your receipt</button>
      <p>Keep your reference and private access code before leaving or reloading this page.</p>
      {props.cleanupStatus?.startsWith('Cleanup failed') && <p role="status">Local draft cleanup needs attention. Open your receipt to retry cleanup.</p>}
      <Link to="/">Back to home</Link>
    </section>
    {open && <ReceiptDialog {...props} returnFocus={reopen} onClose={() => setOpen(false)} />}
  </>;
}
