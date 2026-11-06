import { useEffect, useRef, useState } from 'react';
import { BiCheckCircle, BiEnvelope } from 'react-icons/bi';
import { requestTurnstile } from '../../../utils/turnstile';
import { rateAwareFetch } from '../../../utils/rateLimits';
import './EmailConfirmation.css';

export default function EmailConfirmation({ email, confirmEmail, draftId, confirmation, onConfirmed, challenge, onChallenge }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(''), [error, setError] = useState(''), [clock, setClock] = useState(Date.now());
  const [retryAt, setRetryAt] = useState(0);
  const resendAt = Math.max(retryAt, challenge?.resendAt || 0);
  const controller = useRef(null), input = useRef(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    const now = Date.now();
    const nextExpiry = Date.parse(confirmation?.expiresAt || challenge?.expiresAt);
    const delay = resendAt > now ? Math.min(1000, resendAt - now) : nextExpiry > now ? nextExpiry - now : 0;
    if (!delay) return;
    const timer = setTimeout(() => setClock(Date.now()), delay);
    return () => clearTimeout(timer);
  }, [challenge, confirmation, resendAt, clock]);
  const confirmed = confirmation?.email === email && Date.parse(confirmation.expiresAt) > clock;
  const ready = /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(email) && email === confirmEmail?.trim().toLowerCase();
  const wait = Math.max(0, Math.ceil((resendAt - clock) / 1000));
  const run = async action => {
    if (controller.current) return;
    const abort = new AbortController(); controller.current = abort;
    setBusy(action); setError('');
    try {
      const token = action === 'send' ? await requestTurnstile('application_email', { signal: abort.signal }) : '';
      const response = await rateAwareFetch('/api/application-email', { method: 'POST', cache: 'no-store',
        signal: AbortSignal.any([abort.signal, AbortSignal.timeout(25000)]),
        headers: { 'content-type': 'application/json', 'x-turnstile-token': token },
        body: JSON.stringify({ action, email, draftId, code, challengeId: challenge?.challengeId }) });
      const data = await response.json();
      abort.signal.throwIfAborted();
      if (!response.ok) {
        const retry = Number(response.headers.get('Retry-After'));
        if (response.status === 429 && retry > 0) setRetryAt(Date.now() + retry * 1000);
        throw new Error(response.status >= 500 ? 'Email confirmation is temporarily unavailable. Your draft is kept. Try again later.' : data.error || 'Could not confirm your email. Your answers are kept.');
      }
      if (action === 'send') {
        if (!data.challengeId || !Number.isFinite(Date.parse(data.expiresAt))) throw new Error('Email request was not confirmed. Please retry.');
        onChallenge({ ...data, email, resendAt: Date.now() + 60000 }); setCode(''); setClock(Date.now());
        requestAnimationFrame(() => input.current?.focus());
      } else {
        if (data.status !== 'confirmed' || data.email !== email || !data.proof || !Number.isFinite(Date.parse(data.expiresAt))) throw new Error('Email confirmation could not be verified. Please retry.');
        onConfirmed(data); setCode(''); onChallenge(null); setClock(Date.now());
      }
    } catch (e) {
      if (!abort.signal.aborted) setError(e.message || 'Email confirmation is unavailable. Keep your draft and retry.');
    } finally { if (controller.current === abort) { controller.current = null; if (!abort.signal.aborted) setBusy(''); } }
  };
  return <section id="pi-email-confirmation" tabIndex={-1} className="email-confirmation" aria-labelledby="email-confirmation-title" aria-busy={!!busy}>
    <div className="email-confirmation-heading">
      {confirmed ? <BiCheckCircle aria-hidden="true" /> : <BiEnvelope aria-hidden="true" />}
      <div><h4 id="email-confirmation-title">{confirmed ? 'Email confirmed' : 'Confirm your email address'}</h4>
        <p>{confirmed ? `You confirmed access to ${email}.` : 'We use Resend to email you a one-time code. Enter it here before submitting.'}</p></div>
    </div>
    {!confirmed && <>
      {!ready && <p>Enter matching email addresses above, then request a code.</p>}
      {challenge && <div className="email-confirmation-code">
        <label htmlFor="application-email-code">Six-digit email code</label>
        <p id="application-email-code-hint">Sent to {email}. Check Spam too. {Date.parse(challenge.expiresAt) <= clock ? 'This code expired; request a new one.' : 'Valid for 10 minutes, with up to 5 attempts.'}</p>
        <input ref={input} id="application-email-code" className="form-input" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} disabled={!!busy} aria-describedby={`application-email-code-hint${error ? ' application-email-error' : ''}`} aria-invalid={!!error} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (code.length === 6 && !busy) run('confirm'); } }} />
      </div>}
      <div className="email-confirmation-actions">
        {challenge && <button type="button" className="step-nav-continue" disabled={!!busy || code.length !== 6 || Date.parse(challenge.expiresAt) <= clock} onClick={() => run('confirm')}>{busy === 'confirm' ? 'Confirming…' : 'Confirm email'}</button>}
        <button type="button" className="step-nav-back" disabled={!!busy || !ready || wait > 0} onClick={() => run('send')}>{busy === 'send' ? 'Sending code…' : wait ? `Send again in ${wait}s` : challenge ? 'Send a new code' : 'Send confirmation code'}</button>
      </div>
    </>}
    {error && <p id="application-email-error" className="email-confirmation-error" role="alert">{error}</p>}
    <p className="email-confirmation-footnote" role="status">{confirmed ? 'Inbox access confirmed for this application session. This does not verify your identity or approve your franchise.' : challenge ? 'Enter the code from the latest email. Staff will never ask you to send them this code.' : 'We send a code only when you request it. Changing your email or reloading requires confirmation again.'}</p>
  </section>;
}
