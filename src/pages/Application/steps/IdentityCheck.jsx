import { useEffect, useRef, useState } from 'react';
import { rateAwareFetch } from '../../../utils/rateLimits';

const endpoint = '/api/application-identity';
const fields = ['firstName', 'middleName', 'lastName', 'dateOfBirth', 'govIdType', 'govIdNumber'];

export default function IdentityCheck({ draftId, formData, updateField }) {
  const [mode, setMode] = useState(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState('');
  const [message, setMessage] = useState('');
  const [waiting, setWaiting] = useState(false);
  const [completedProof, setCompletedProof] = useState('');
  const retryTimer = useRef(null);
  const request = useRef(null);
  const proof = formData.identityProof;
  const manual = proof === 'manual';
  useEffect(() => () => {
    request.current?.abort();
    clearTimeout(retryTimer.current);
  }, []);
  async function openCheck() {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(endpoint, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]) });
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (!controller.signal.aborted) setMode(['sandbox', 'live'].includes(data.mode) ? data.mode : 'disabled');
    } catch {
      if (!controller.signal.aborted) setMessage('Could not check availability. Try again or choose staff review.');
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  const available = mode === 'sandbox' || mode === 'live';
  async function run(action) {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setMessage('');
    try {
      const response = await rateAwareFetch(endpoint, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(18000)]),
        body: JSON.stringify({ draft: draftId, details: Object.fromEntries(fields.map(k => [k, formData[k]])),
          action, proof, consent: consent ? mode : null })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Please try again or choose staff review.');
      if (controller.signal.aborted) return;
      if (result.proof !== proof) updateField('identityProof', result.proof);
      if (action === 'start') {
        setUrl(result.url);
        setMessage('Your session is ready. Open Didit, then return here and check your result.');
      } else {
        if (result.status === 'pending') {
          setWaiting(true);
          clearTimeout(retryTimer.current);
          retryTimer.current = setTimeout(() => setWaiting(false), 10000);
        } else if (result.status === 'passed') {
          setCompletedProof(result.proof);
        }
        if (result.status !== 'pending') setUrl('');
        setMessage(result.status === 'passed' ? (mode === 'sandbox' ? 'Sandbox simulation passed.' : 'Identity check passed.')
          : result.status === 'pending' ? 'Your check is still pending. Finish the session or choose staff review.'
          : 'Your identity documents need staff review. You can continue your application.');
      }
    } catch (error) {
      if (!controller.signal.aborted) setMessage(error.message || 'Please try again or choose staff review.');
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return <section className="file-upload-card identity-check" aria-labelledby="identity-check-title">
    <h4 id="identity-check-title" className="file-upload-label">Selfie-to-ID check · Optional</h4>
    {mode === null && <button type="button" disabled={busy} onClick={openCheck}>
      {proof && !manual ? 'View my identity check' : 'Verify my identity'}
    </button>}
    {available && <>
      <p>{mode === 'sandbox' ? 'Sandbox demonstration. Use test details only. The result is simulated.'
        : 'Didit will ask for camera access to capture your ID and selfie, check liveness, and compare your face with the ID portrait. Siomai Street receives the check result.'}</p>
      <label><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /> {mode === 'sandbox'
        ? 'I want to try the Didit demonstration.' : 'I agree to share my ID and selfie with Didit for this optional identity check.'}</label>
      <div className="identity-actions">
        <button type="button" disabled={busy || !consent} onClick={() => run('start')}>{proof && !manual ? 'Start a new check' : 'Verify my identity'}</button>
        {url && <a href={url} target="_blank" rel="noopener noreferrer">Open Didit in a new tab ↗</a>}
        {proof && !manual && completedProof !== proof && <button type="button" disabled={busy || waiting} onClick={() => run('status')}>
          {waiting ? 'Check again shortly' : 'Check my result'}
        </button>}
      </div>
    </>}
    {mode === 'disabled' && <p>The online selfie check is unavailable. Your uploaded ID can be reviewed by staff.</p>}
    <button type="button" disabled={busy || manual} onClick={() => {
      updateField('identityProof', 'manual'); setMessage(''); setUrl(''); setConsent(false);
    }}>{manual ? 'Staff review selected' : 'Use staff review instead'}</button>
    <p role="status">{busy ? 'Please wait…' : message || (manual ? 'Continue with the required documents below.' : '')}</p>
  </section>;
}
