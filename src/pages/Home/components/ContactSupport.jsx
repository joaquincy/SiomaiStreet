import { requestTurnstile } from '../../../utils/turnstile';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BiBowlHot, BiStore, BiRightArrowAlt, BiCheck, BiCheckCircle, BiCopy, BiDownload, BiEnvelope, BiInfoCircle, BiMap, BiFile, BiRefresh, BiChevronDown, BiErrorCircle } from 'react-icons/bi';
import { CONTACT_TOPICS, CONTACT_LIMITS, contactTextLength, validateContact, validContactReceipt } from '../../../../shared/contact';
import DirectContactModal from './DirectContactModal';
import { createContactDrafts, emptyContactDraft, editContactDraft, normalizeContactOptions, contactGuidance, contactReceiptText, contactCompletion, hasUnsentContact } from '../../../utils/contactExperience';
import './ContactSupport.css';

const channels = [
  { id: 'customer', name: 'Food & store support', description: 'Your order, our menu, your experience.', icon: BiBowlHot },
  { id: 'franchise', name: 'Franchise inquiries', description: 'Your questions. Your next big move.', icon: BiStore },
];
const destination = channel => channel === 'customer' ? 'Customer support' : 'Franchise inquiries';
const SupportLink = ({ to, children, ...props }) => to.startsWith('/#')
  ? <a href={to.slice(1)} {...props}>{children}</a>
  : <Link to={to} {...props}>{children}</Link>;
const focusAnswer = key => {
  const target = document.getElementById(`contact-${key}`);
  (key === 'topic' ? target?.querySelector('input:checked, input') : target)?.focus();
};

export function ContactComposer({ channel, form, errors = {}, tried, enabled, configStatus, contact = {}, sending, uncertain, failure, limitNote, summaryRef, onSubmit, onUpdate, onBlur, onReload, onDirectContact }) {
  const locked = sending || uncertain;
  const guidance = contactGuidance(channel, form.topic);
  const count = contactTextLength(form.message);
  const issueCount = Object.keys(errors).length;
  const completion = contactCompletion(form, channel);
  const completeCount = completion.filter(item => item.complete).length;
  const fieldError = key => errors[key] ? <p className="contact-support__error" id={`contact-${key}-error`}><BiErrorCircle aria-hidden="true" />{errors[key]}</p> : null;
  const attributes = key => ({
    id: `contact-${key}`, name: key, value: form[key],
    onChange: event => onUpdate(key, event.target.value), onBlur: () => onBlur(key),
    // Native limits count UTF-16 units; editing uses the server's code-point limit.
    maxLength: CONTACT_LIMITS[key] ? CONTACT_LIMITS[key] * 2 : undefined,
    'aria-invalid': Boolean(errors[key]),
    'aria-describedby': [errors[key] && `contact-${key}-error`, ['message', 'email'].includes(key) && `contact-${key}-help`].filter(Boolean).join(' ') || undefined,
  });
  return <>
    <div className="contact-support__form-top">
      <div><span className="contact-support__micro">YOUR MESSAGE</span><h3 id="contact-compose-title">What’s on your mind?</h3></div>
      <span className="contact-support__destination"><BiEnvelope aria-hidden="true" />{destination(channel)}</span>
    </div>
    <div className={`contact-support__availability${enabled ? ' is-ready' : ''}`} role="status">
      {configStatus === 'loading' ? <><BiRefresh aria-hidden="true" /><span>Checking message availability…</span></> : configStatus === 'error' ? <><BiInfoCircle aria-hidden="true" /><span><strong>We couldn’t check availability.</strong> Your answers stay on this page.</span><button type="button" onClick={onReload}>Try again <BiRefresh aria-hidden="true" /></button></> : !enabled ? <><BiInfoCircle aria-hidden="true" /><span><strong>Online messaging isn’t open yet.</strong> You can still explore the quick links{contact.email || contact.phone ? ' or use a direct contact.' : '. Support contacts will appear once confirmed.'}</span>{(contact.email || contact.phone) && <button type="button" aria-haspopup="dialog" onClick={onDirectContact}>Contact options <BiRightArrowAlt aria-hidden="true" /></button>}</> : <><BiCheckCircle aria-hidden="true" /><span>{contact.responseNote || 'Send your question here. You’ll receive a reference once it reaches us.'}</span></>}
    </div>
    <form onSubmit={onSubmit} noValidate aria-labelledby="contact-compose-title" aria-busy={sending}>
      {enabled && <nav className="contact-support__completion" aria-label="Message checklist">
        <div><span>YOUR MESSAGE CHECKLIST</span><strong>{completeCount} / 5 ready</strong></div>
        <div>{completion.map(item => <button key={item.key} type="button" disabled={locked} className={item.complete ? 'is-complete' : ''} onClick={() => focusAnswer(item.key)}><span aria-hidden="true">{item.complete ? <BiCheck /> : '○'}</span>{item.label}<span className="contact-support__sr-only">{item.complete ? ': complete' : ': needs an answer'}</span></button>)}</div>
      </nav>}
      {tried && issueCount > 0 && <div className="contact-support__summary" ref={summaryRef} tabIndex={-1} role="alert"><strong>{issueCount === 1 ? 'One answer needs a second look.' : `${issueCount} answers need a second look.`}</strong><ul>{Object.entries(errors).map(([key, message]) => <li key={key}>{Object.hasOwn(form, key) && key !== 'website' ? <button type="button" onClick={() => focusAnswer(key)}>{message}</button> : <span>{message}</span>}</li>)}</ul></div>}
      <fieldset disabled={locked || !enabled} className="contact-support__fields"><legend className="contact-support__sr-only">Your message and reply details</legend>
        <fieldset className="contact-support__topics" id="contact-topic" aria-describedby={errors.topic ? 'contact-topic-error' : undefined}>
          <legend>Choose a topic <span>Required</span></legend>
          <div className="contact-support__topic-options">{CONTACT_TOPICS[channel].map(topic => <label key={topic.value} className={form.topic === topic.value ? 'is-selected' : ''}>
            <input type="radio" id={`contact-topic-${topic.value}`} name="topic" value={topic.value} checked={form.topic === topic.value} onChange={() => onUpdate('topic', topic.value)} onBlur={() => onBlur('topic')} required aria-invalid={Boolean(errors.topic)} aria-describedby={errors.topic ? 'contact-topic-error' : undefined} />
            <span>{topic.label}</span><BiCheck aria-hidden="true" />
          </label>)}</div>{fieldError('topic')}
        </fieldset>
        <div className="contact-support__row">
          <div className="contact-support__field"><label htmlFor="contact-name">Your name <span>Required</span></label><input {...attributes('name')} autoComplete="name" required placeholder="How should we address you?" />{fieldError('name')}</div>
          <div className="contact-support__field"><label htmlFor="contact-email">Reply email <span>Required</span></label><input {...attributes('email')} type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required placeholder="you@example.com" /><small id="contact-email-help">Any reply will go to this address.</small>{fieldError('email')}</div>
        </div>
        {channel === 'customer' && <div className="contact-support__row">
          <div className="contact-support__field"><label htmlFor="contact-branch">Branch or location <span>Optional</span></label><input {...attributes('branch')} placeholder="Branch name, city or landmark" />{fieldError('branch')}</div>
          {form.topic === 'order' && <div className="contact-support__field"><label htmlFor="contact-orderReference">Order reference <span>Optional</span></label><input {...attributes('orderReference')} placeholder="If you have one" />{fieldError('orderReference')}</div>}
        </div>}
        <div className="contact-support__field contact-support__message-field">
          <label htmlFor="contact-message">Your message <span>Required</span></label>
          <div className="contact-support__writing-hint" id="contact-message-help"><BiInfoCircle aria-hidden="true" /><p>{guidance.hint}</p></div>
          <textarea {...attributes('message')} rows={5} required placeholder={channel === 'customer' ? 'We’re listening. Tell us a little more…' : 'Tell us about your question or your plans…'} />
          <div className="contact-support__message-meter"><small>At least 20 characters. No IDs, passwords or bank details.</small><span className={count >= 1900 ? 'is-near-limit' : ''}>{count.toLocaleString()} / 2,000</span></div>
          <p className="contact-support__limit-note" role="status">{limitNote}</p>{fieldError('message')}
        </div>
        <div className="contact-support__trap" aria-hidden="true"><label htmlFor="contact-website">Website</label><input id="contact-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={event => onUpdate('website', event.target.value)} /></div>
        <div className="contact-support__privacy"><input id="contact-privacyAcknowledged" name="privacyAcknowledged" type="checkbox" checked={form.privacyAcknowledged} onChange={event => onUpdate('privacyAcknowledged', event.target.checked)} aria-invalid={Boolean(errors.privacyAcknowledged)} aria-describedby={errors.privacyAcknowledged ? 'contact-privacy-help contact-privacyAcknowledged-error' : 'contact-privacy-help'} required /><div><label htmlFor="contact-privacyAcknowledged">Use my details to handle this inquiry. <span>Required</span></label><p id="contact-privacy-help">Read how your message is handled in our <Link to="/privacy#support-inquiries" target="_blank" rel="noopener noreferrer">Privacy Policy<span className="contact-support__sr-only"> (opens in a new tab)</span></Link>.</p>{fieldError('privacyAcknowledged')}</div></div>
      </fieldset>
      {failure && <div className="contact-support__failure" role="alert"><BiErrorCircle aria-hidden="true" /><div><strong>{uncertain ? 'Let’s confirm your receipt.' : 'Your message wasn’t sent.'}</strong><p>{failure}</p>{uncertain && <p>Keep this page open. Your original answers are locked so a retry sends the same message.</p>}</div></div>}
      <div className="contact-support__submit-row"><p><BiEnvelope aria-hidden="true" />No account needed.<br />Your reference follows submission.</p><button className="contact-support__send" type="submit" disabled={sending || !enabled}><span>{sending ? 'Sending…' : uncertain ? 'Retry safely' : 'Send message'}</span><span className="contact-support__button-arrow"><BiRightArrowAlt aria-hidden="true" /></span></button></div>
      <span className="contact-support__sr-only" role="status">{sending ? 'Sending your message. Please wait for your receipt.' : ''}</span>
      <p className="contact-support__storage-note">Unsent messages stay only on this page. Leaving or reloading clears them.</p>
    </form>
  </>;
}

export function ContactReceipt({ receipt, headingRef, note, onCopy, onDownload, onNew }) {
  return <div className="contact-support__receipt">
    <div className="contact-support__receipt-top"><span className="contact-support__micro">SIOMAI STREET / YOUR RECEIPT</span><span className="contact-support__received"><BiCheckCircle aria-hidden="true" />Received</span></div>
    <span className="contact-support__receipt-mark" aria-hidden="true"><BiEnvelope /><BiCheck /></span>
    <h3 tabIndex={-1} ref={headingRef}>Message received.<br /><em>Keep in touch.</em></h3>
    <p>Your message has reached {destination(receipt.channel).toLowerCase()}. Keep your reference for any follow-up.</p>
    <div className="contact-support__ticket"><span>YOUR INQUIRY REFERENCE</span><code>{receipt.reference}</code><dl><div><dt>Received</dt><dd><time dateTime={receipt.receivedAt}>{new Date(receipt.receivedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</time></dd></div><div><dt>Reply email</dt><dd>{receipt.replyEmail}</dd></div></dl></div>
    <div className="contact-support__receipt-actions"><button type="button" onClick={onCopy}><BiCopy aria-hidden="true" />Copy reference</button><button type="button" onClick={onDownload}><BiDownload aria-hidden="true" />Save receipt</button></div>
    <p className="contact-support__action-note" role="status">{note}</p>
    <div className="contact-support__next"><h4>What happens next?</h4><p>Staff can review your inquiry and reply using the email above. This receipt confirms delivery, not staff review{receipt.channel === 'franchise' ? ' or franchise approval. This message is not a franchise application.' : ' or a refund.'}</p><p>Keep this reference even if the confirmation email is delayed or cannot be delivered.</p></div>
    <button type="button" className="contact-support__text-button" onClick={onNew}>Write another message <BiRightArrowAlt aria-hidden="true" /></button>
  </div>;
}

export default function ContactSupport() {
  const section = useRef(null), summary = useRef(null), receiptHeading = useRef(null), firstChoice = useRef(null);
  const pending = useRef(null), inFlight = useRef(false), request = useRef(null), mounted = useRef(false), downloads = useRef(new Map());
  const [nearby, setNearby] = useState(false), [reload, setReload] = useState(0);
  const [options, setOptions] = useState(null), [configStatus, setConfigStatus] = useState('loading');
  const [channel, setChannel] = useState('customer'), [drafts, setDrafts] = useState(createContactDrafts);
  const [errors, setErrors] = useState({}), [tried, setTried] = useState(false), [focusTick, setFocusTick] = useState(0);
  const [sending, setSending] = useState(false), [uncertain, setUncertain] = useState(false);
  const [failure, setFailure] = useState(''), [receipt, setReceipt] = useState(null), [actionNote, setActionNote] = useState(''), [limitNote, setLimitNote] = useState('');
  const [returnFocus, setReturnFocus] = useState(false);
  const [directOpen, setDirectOpen] = useState(false);
  const form = drafts[channel];
  const contact = options?.[channel] || {};
  const enabled = configStatus === 'ready' && contact.enabled === true;
  const locked = sending || uncertain;
  const guidance = contactGuidance(channel, form.topic);
  const unsent = hasUnsentContact(drafts) || sending || uncertain;

  useEffect(() => {
    if (!unsent) return;
    const warnBeforeLeaving = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warnBeforeLeaving);
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving);
  }, [unsent]);

  useEffect(() => {
    mounted.current = true;
    const urls = downloads.current;
    return () => { mounted.current = false; request.current?.abort(); for (const [url, timer] of urls) { clearTimeout(timer); URL.revokeObjectURL(url); } urls.clear(); };
  }, []);
  useEffect(() => {
    if (!('IntersectionObserver' in window)) { setNearby(true); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setNearby(true); observer.disconnect(); }
    }, { rootMargin: '600px' });
    observer.observe(section.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!nearby) return;
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    setConfigStatus('loading');
    fetch('/api/contact-options', { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error();
      const result = normalizeContactOptions(await response.json());
      if (active) { setOptions(result); setConfigStatus('ready'); }
    }).catch(() => { if (active) setConfigStatus('error'); }).finally(() => clearTimeout(timer));
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [nearby, reload]);
  useEffect(() => { if (focusTick) summary.current?.focus(); }, [focusTick]);
  useEffect(() => { if (receipt) receiptHeading.current?.focus(); }, [receipt]);
  useEffect(() => { if (returnFocus && !receipt) { firstChoice.current?.focus(); setReturnFocus(false); } }, [returnFocus, receipt]);

  const update = (key, value) => {
    if (locked) return;
    const edited = editContactDraft(drafts, channel, key, value);
    setDrafts(edited.drafts);
    setLimitNote(edited.limited ? `The ${key === 'message' ? 'message' : 'answer'} reached its ${CONTACT_LIMITS[key].toLocaleString()}-character limit. Extra text was not added; please check your answer.` : '');
    const validated = validateContact({ ...edited.drafts[channel], channel }).errors;
    setErrors(previous => tried ? validated : Object.fromEntries(Object.keys(previous).filter(field => validated[field]).map(field => [field, validated[field]])));
    setFailure('');
  };
  const blur = key => {
    const message = validateContact({ ...form, channel }).errors[key];
    setErrors(previous => { const next = { ...previous }; if (message) next[key] = message; else delete next[key]; return next; });
  };
  const changeChannel = next => {
    if (locked || receipt || next === channel) return;
    setChannel(next); setErrors({}); setTried(false); setFailure(''); setLimitNote(''); setActionNote(''); pending.current = null;
  };
  const submit = async event => {
    event.preventDefault();
    if (inFlight.current || !enabled) return;
    const validated = validateContact({ ...form, channel });
    setTried(true); setErrors(validated.errors); setFailure('');
    if (Object.keys(validated.errors).length) { setFocusTick(tick => tick + 1); return; }
    if (!pending.current) {
      if (!window.crypto?.randomUUID) { setFailure('Secure submission is unavailable in this browser. Please use a current browser on HTTPS.'); return; }
      pending.current = { ...validated.data, requestId: crypto.randomUUID(), website: form.website };
    }
    const payload = pending.current, wasUncertain = uncertain;
    inFlight.current = true; setSending(true);
    const controller = new AbortController(); request.current = controller;
    let timer, sent = false;
    try {
      const token = await requestTurnstile('inquiry', { signal: controller.signal });
      timer = setTimeout(() => controller.abort(), 20000);
      sent = true;
      const response = await fetch('/api/contact-inquiries', { method: 'POST', signal: controller.signal, headers: { 'content-type': 'application/json', accept: 'application/json', 'x-turnstile-token': token }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => null);
      if (!mounted.current) return;
      if (!response.ok) {
        if (result?.accepted === false && !wasUncertain) {
          pending.current = null;
          if (result.errors && typeof result.errors === 'object') { setErrors(Object.fromEntries(Object.entries(result.errors).filter(([, value]) => typeof value === 'string'))); setFocusTick(tick => tick + 1); }
        } else setUncertain(true);
        setFailure(typeof result?.error === 'string' ? result.error : 'We could not confirm receipt. Please retry the same message.');
        return;
      }
      if (!validContactReceipt(result, payload.requestId, payload.channel)) throw new Error('Invalid receipt');
      setReceipt({ ...result, replyEmail: payload.email, topic: payload.topic });
      setDrafts(previous => ({ ...previous, [payload.channel]: emptyContactDraft() }));
      setErrors({}); setUncertain(false); pending.current = null;
    } catch (error) {
      if (mounted.current) {
        if (!sent && !wasUncertain) { pending.current = null; setUncertain(false); setFailure(error.message || 'Security check failed. Please retry.'); }
        else { setUncertain(true); setFailure('We could not confirm receipt. Your message is kept on this page. Retry it unchanged to avoid a duplicate.'); }
      }
    } finally {
      clearTimeout(timer); request.current = null; inFlight.current = false;
      if (mounted.current) setSending(false);
    }
  };
  const copy = async value => {
    try { await navigator.clipboard.writeText(value); if (mounted.current) setActionNote('Copied to your clipboard.'); }
    catch { if (mounted.current) setActionNote('Copy is unavailable. Select and copy the text shown here.'); }
  };
  const download = () => {
    try {
      const url = URL.createObjectURL(new Blob([contactReceiptText(receipt)], { type: 'text/plain;charset=utf-8' }));
      const timer = setTimeout(() => { URL.revokeObjectURL(url); downloads.current.delete(url); }, 1000);
      downloads.current.set(url, timer);
      const link = document.createElement('a'); link.href = url; link.download = `siomai-street-inquiry-${receipt.id}.txt`;
      document.body.append(link); link.click(); link.remove();
      setActionNote('Receipt download requested. Check your browser’s downloads.');
    } catch { setActionNote('Download is unavailable. Copy your reference or save a screenshot of this receipt.'); }
  };

  return <section className="contact-support" id="contact" aria-labelledby="contact-title" ref={section}>
    <div className="contact-support__container">
      <header className="contact-support__intro">
        <p className="contact-support__eyebrow"><span />CONTACT SIOMAI STREET<span /></p>
        <h2 id="contact-title">Good conversations<br />start <em>here.</em></h2>
        <p className="contact-support__lead">From your last order to your next business idea. Choose a conversation and find your next step.</p>
      </header>

      <div className="contact-support__desk">
        <div className="contact-support__chooser"><span className="contact-support__micro">CHOOSE YOUR CONVERSATION</span><h3>How can we help?</h3>
          <div className="contact-support__channels" role="group" aria-label="Inquiry destination">{channels.map(item => <button ref={channel === item.id ? firstChoice : undefined} key={item.id} type="button" disabled={locked || Boolean(receipt)} aria-pressed={channel === item.id} aria-controls="contact-workspace" onClick={() => changeChannel(item.id)}>
            <span className="contact-support__channel-icon"><item.icon aria-hidden="true" /></span><span className="contact-support__channel-copy"><strong>{item.name}</strong><span>{item.description}</span></span><span className="contact-support__choice" aria-hidden="true">{channel === item.id ? <BiCheck /> : <BiRightArrowAlt />}</span>
          </button>)}</div><p className="contact-support__switch-note">Switch freely. Each unfinished message stays here until you leave the page.</p>
        </div>

        <div className="contact-support__paper" id="contact-workspace">
          {receipt ? <ContactReceipt receipt={receipt} headingRef={receiptHeading} note={actionNote} onCopy={() => copy(receipt.reference)} onDownload={download} onNew={() => { setReceipt(null); setTried(false); setActionNote(''); setLimitNote(''); setReturnFocus(true); }} /> : <ContactComposer channel={channel} form={form} errors={errors} tried={tried} enabled={enabled} configStatus={configStatus} contact={contact} sending={sending} uncertain={uncertain} failure={failure} limitNote={limitNote} summaryRef={summary} onSubmit={submit} onUpdate={update} onBlur={blur} onReload={() => setReload(value => value + 1)} onDirectContact={() => { setNearby(true); setDirectOpen(true); }} />}
        </div>

        <aside className="contact-support__help" aria-label="Quick help and direct contacts">
          <div className="contact-support__quick-links"><h3>A little shortcut?</h3><p>You might find what you need right here.</p>
            <a href="#stores"><BiMap aria-hidden="true" /><span>Find a store<small>Addresses & directions</small></span><BiRightArrowAlt aria-hidden="true" /></a>
            <SupportLink to={channel === 'customer' ? '/menu' : '/#faq'}><BiBowlHot aria-hidden="true" /><span>{channel === 'customer' ? 'Explore the menu' : 'Franchise FAQs'}<small>{channel === 'customer' ? 'Find your next favorite' : 'Application essentials'}</small></span><BiRightArrowAlt aria-hidden="true" /></SupportLink>
            <Link to="/application/status"><BiFile aria-hidden="true" /><span>Track an application<small>Reference & private access code</small></span><BiRightArrowAlt aria-hidden="true" /></Link>
          </div>
          {guidance.link && <SupportLink className="contact-support__related" to={guidance.link}><span>RELATED TO YOUR TOPIC<strong>{guidance.action}</strong></span><BiRightArrowAlt aria-hidden="true" /></SupportLink>}
          <button className="contact-support__direct-trigger" type="button" aria-haspopup="dialog" aria-expanded={directOpen} onClick={() => { setNearby(true); setDirectOpen(true); }}><span className="contact-support__direct-symbol"><BiEnvelope aria-hidden="true" /></span><span><strong>Prefer a direct conversation?</strong><small>View contact options & service hours</small></span><BiRightArrowAlt aria-hidden="true" /></button>
          <details className="contact-support__details"><summary>What happens after I send?<BiChevronDown aria-hidden="true" /></summary><p>A reference appears only after your inquiry is received. Save it for follow-up. Any reply will use the email you provide; receipt does not mean staff have reviewed your message.</p><p>{contact.responseNote || 'A response timeframe has not been published.'}</p></details>
          <details className="contact-support__details"><summary>What should I keep private?<BiChevronDown aria-hidden="true" /></summary><p>Leave out IDs, bank details, passwords and private application access codes. Use the franchise application’s document steps for requested files.</p><Link to="/privacy#support-inquiries" target="_blank" rel="noopener noreferrer">Read the privacy notice <span className="contact-support__sr-only">(opens in a new tab)</span><BiRightArrowAlt aria-hidden="true" /></Link></details>
        </aside>
      </div>
    </div>
    {directOpen && <DirectContactModal initialChannel={channel} options={options} configStatus={configStatus} onReload={() => setReload(value => value + 1)} onClose={() => setDirectOpen(false)} />}
  </section>;
}
