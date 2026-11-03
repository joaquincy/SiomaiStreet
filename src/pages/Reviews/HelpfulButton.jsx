import { useEffect, useRef, useState } from 'react';
import { rateAwareFetch } from '../../utils/rateLimits.js';
import { BiCheck, BiLike } from 'react-icons/bi';
import { prepareHelpfulVote, readHelpfulVote, saveHelpfulVote, validHelpfulReceipt } from '../../utils/reviewHelpful';

export default function HelpfulButton({ review, onCount }) {
  const [voted, setVoted] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const work = useRef(null);
  useEffect(() => {
    const restore = () => { try { setVoted(!!readHelpfulVote(localStorage, review.id)?.voted); } catch { /* report storage errors on intent */ } };
    restore(); window.addEventListener('storage', restore);
    return () => { window.removeEventListener('storage', restore); work.current?.abort(); work.current = null; };
  }, [review.id]);
  const vote = async () => {
    if (voted || work.current) return;
    let record;
    try { record = prepareHelpfulVote(localStorage, review.id, () => crypto.randomUUID()); }
    catch { setMessage('Browser storage is unavailable or this saved vote is damaged. Your vote was not sent.'); return; }
    if (record.voted) { setVoted(true); return; }
    const controller = new AbortController(); work.current = controller;
    const timer = setTimeout(() => controller.abort(), 12000);
    setBusy(true); setMessage('');
    try {
      const response = await rateAwareFetch(`/api/reviews/${review.id}/helpful`, { method: 'POST', signal: controller.signal,
        headers: { 'content-type': 'application/json' }, body: JSON.stringify({ voterId: record.voterId }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Your vote could not be confirmed. Please retry.');
      if (!validHelpfulReceipt(body, review.id)) throw new Error('Your vote could not be confirmed. Please retry.');
      if (work.current !== controller || controller.signal.aborted) return;
      setVoted(true); onCount(review.id, body.helpful);
      try { saveHelpfulVote(localStorage, review.id, record); setMessage('Thanks! Your helpful vote is counted.'); }
      catch { setMessage('Vote counted. This browser could not save the confirmation; retrying the same vote is safe.'); }
    } catch (error) {
      if (work.current === controller) setMessage(controller.signal.aborted ? 'Confirmation timed out. Retry safely using this button.' : error.message || 'Could not confirm your vote. Please retry.');
    } finally {
      clearTimeout(timer);
      if (work.current === controller) { work.current = null; setBusy(false); }
    }
  };
  return <div className="cfb-helpful-control">
    <button type="button" className={`cfb-helpful-btn ${voted ? 'voted' : ''}`} onClick={vote}
      id={`cfb-helpful-btn-${review.id}`} aria-pressed={voted} disabled={busy || voted} aria-busy={busy}
      aria-describedby={`cfb-helpful-status-${review.id}`}>
      {voted ? <BiCheck aria-hidden="true" /> : <BiLike aria-hidden="true" />}
      {busy ? 'Saving…' : voted ? 'Marked helpful' : 'Helpful'} ({review.helpful})
    </button>
    <span id={`cfb-helpful-status-${review.id}`} role="status" aria-live="polite">{message}</span>
  </div>;
}
