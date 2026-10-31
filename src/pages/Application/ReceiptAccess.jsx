import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineArrowRight, HiOutlineClipboardCopy, HiOutlineDownload, HiOutlineEye, HiOutlineEyeOff, HiOutlineLockClosed } from 'react-icons/hi';
import { formatReceiptDate, privateReceiptText } from '../../utils/applicationReceipt';

export default function ReceiptAccess({ receipt }) {
  const [message, setMessage] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [copying, setCopying] = useState(false);
  const downloads = useRef(new Map());
  const mounted = useRef(false);
  const hasAccess = typeof receipt?.accessCode === 'string' && Boolean(receipt.accessCode.trim());
  const receivedAt = formatReceiptDate(receipt?.submittedAt, true);
  const expiresAt = formatReceiptDate(receipt?.accessExpiresAt);

  useEffect(() => {
    mounted.current = true;
    const activeDownloads = downloads.current;
    return () => {
      mounted.current = false;
      for (const [url, timer] of activeDownloads) {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
      }
      activeDownloads.clear();
    };
  }, []);

  const copy = async (value, label) => {
    setCopying(true);
    setMessage('');
    try {
      await navigator.clipboard.writeText(value);
      if (mounted.current) setMessage(`${label} copied. Keep it private.`);
    } catch {
      if (mounted.current) setMessage(hasAccess
        ? 'Copy is unavailable. Select the reference or reveal and select your code, or download the receipt below.'
        : 'Copy is unavailable. Select the reference manually, or download the receipt below.');
    } finally {
      if (mounted.current) setCopying(false);
    }
  };

  const download = () => {
    let url;
    const link = document.createElement('a');
    try {
      const blob = new Blob([privateReceiptText(receipt, window.location.origin)], { type: 'text/plain;charset=utf-8' });
      url = URL.createObjectURL(blob);
      link.href = url;
      link.download = 'siomai-street-private-receipt.txt';
      document.body.append(link);
      link.click();
      const timer = setTimeout(() => { URL.revokeObjectURL(url); downloads.current.delete(url); }, 10000);
      downloads.current.set(url, timer);
      setMessage('Receipt download requested. Check your downloads and keep the file private.');
    } catch {
      if (url) URL.revokeObjectURL(url);
      setMessage(`The receipt could not be downloaded. Copy your reference${hasAccess ? ' and private code' : ''} instead, and keep ${hasAccess ? 'them' : 'it'} somewhere safe.`);
    } finally {
      link.remove();
    }
  };

  return <section className="receipt-access" aria-labelledby="receipt-access-title">
    <div className="receipt-access-heading">
      <span className="receipt-eyebrow">Your copy</span>
      <HiOutlineLockClosed aria-hidden="true" />
    </div>
    <h2 id="receipt-access-title">Keep your next steps close.</h2>
    <p className="receipt-access-description">Save these details to check your status and respond to document requests.</p>
    {receivedAt && <p className="receipt-timestamp">Received <time dateTime={receipt.submittedAt}>{receivedAt}</time> <span>(PHT)</span></p>}

    <div className="receipt-credential">
      <div className="receipt-credential-label"><h3>Application reference</h3><button type="button" className="receipt-copy-button" aria-label="Copy application reference" disabled={copying || !receipt?.id} onClick={() => copy(receipt.id, 'Reference')}><HiOutlineClipboardCopy aria-hidden="true" /><span>Copy</span></button></div>
      <code className="receipt-code">{receipt?.id || 'Reference unavailable'}</code>
    </div>
    {hasAccess ? <>
      <div className="receipt-credential">
        <div className="receipt-credential-label"><h3>Private access code</h3><button type="button" className="receipt-copy-button" aria-label="Copy private access code" disabled={copying} onClick={() => copy(receipt.accessCode, 'Private access code')}><HiOutlineClipboardCopy aria-hidden="true" /><span>Copy</span></button></div>
        <div className="receipt-secret-row">
          <code id="receipt-private-code" className={`receipt-code${revealed ? '' : ' receipt-code--masked'}`}>{revealed ? receipt.accessCode : <><span aria-hidden="true">•••• •••• ••••</span><span className="receipt-visually-hidden">Private access code hidden</span></>}</code>
          <button type="button" className="receipt-reveal-button" aria-label={`${revealed ? 'Hide' : 'Show'} private access code`} aria-controls="receipt-private-code" aria-expanded={revealed} onClick={() => setRevealed(value => !value)}>{revealed ? <HiOutlineEyeOff aria-hidden="true" /> : <HiOutlineEye aria-hidden="true" />}<span>{revealed ? 'Hide' : 'Show'}</span></button>
        </div>
        <p className="receipt-expiry">{expiresAt ? <>Access expires <time dateTime={receipt.accessExpiresAt}>{expiresAt}</time> (PHT).</> : 'Access expiry was not included in this receipt.'}</p>
      </div>
      <p className="receipt-privacy">Anyone with both details can view your status and send replacements. Keep them private. Your code is not saved in the browser draft.</p>
    </> : <p className="receipt-access-missing">Tracking access was not included in this receipt. Keep your reference for support.</p>}

    <div className="receipt-access-actions">
      <button type="button" className="receipt-action receipt-action--primary" disabled={!receipt?.id} onClick={download}><HiOutlineDownload aria-hidden="true" /> Save {hasAccess ? 'private ' : ''}receipt <span className="receipt-file-type">.TXT</span></button>
      <Link className="receipt-action receipt-action--secondary" to="/application/status">Track application status <HiOutlineArrowRight aria-hidden="true" /></Link>
    </div>
    <p className="receipt-save-reminder">Save before you leave. {hasAccess ? 'You’ll need your reference and private code to sign in to tracking.' : 'Your reference identifies this application.'}</p>
    <p className="receipt-action-feedback" role="status" aria-live="polite" aria-atomic="true">{message}</p>
  </section>;
}
