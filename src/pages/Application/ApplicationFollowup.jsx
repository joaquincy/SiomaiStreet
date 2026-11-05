import { useEffect, useRef, useState } from 'react';
import { CHANGE_GROUPS, followupLabel, followupOptions, FOLLOWUP_ARRAY_FIELDS, changeStates, onboardingStates } from '../../../shared/applicationFollowup.js';
import { FormSelect } from '../../components/FormElements';
import DocumentPicker from '../../components/DocumentPicker';
import { submitFranchiseApplication } from '../../api/directUploads';
import { rateAwareFetch } from '../../utils/rateLimits';
import { BiCheck, BiChevronDown, BiEditAlt, BiLockAlt, BiRefresh, BiHistory, BiListCheck } from 'react-icons/bi';
import { FUNDING_STATUS_OPTIONS, FUNDS_EVIDENCE_OPTIONS, DOCUMENT_POLICY, DOCUMENT_REDACTION_NOTICE } from '../../../shared/documentPolicy.js';
import { PLAN_TIMELINE_LABELS } from '../../../shared/applicationAnswers.js';
import './ApplicationFollowup.css';

const optionLabel = value => [...FUNDING_STATUS_OPTIONS, ...FUNDS_EVIDENCE_OPTIONS].find(option => option.value !== 'other' && option.value === value)?.label || PLAN_TIMELINE_LABELS[value] || ({ 'food-cart': 'Food Cart', kiosk: 'Kiosk', 'casual-dining': 'Casual Dining', 'not-sure': 'Not sure yet', 'personal-savings': 'Personal savings', 'bank-loan': 'Bank loan', 'family-support': 'Family support', 'business-partner': 'Business partner', other: 'Other', email: 'Email', phone: 'Phone', yes: 'Yes', no: 'No', maybe: 'Maybe' }[value]) || value;
const display = value => Array.isArray(value) ? value.map(optionLabel).join(', ') || 'Not provided' : value && typeof value === 'object' ? Object.entries(value).map(([k, v]) => `${followupLabel(k)}: ${v || 'Not provided'}`).join(' · ') : optionLabel(value) || 'Not provided';
const dateLabel = value => value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' }).format(new Date(value)) + ' PHT' : '';
const stateLabel = state => changeStates[state] || onboardingStates[state];
function StateBadge({ state }) { return <span className={`followup-state followup-state--${state}`}>{['accepted', 'complete'].includes(state) && <BiCheck aria-hidden="true" />}{stateLabel(state)}</span>; }
function Comparison({ current, proposed }) {
  return <dl className="followup-comparison">{Object.keys(proposed).filter(key => JSON.stringify(current[key]) !== JSON.stringify(proposed[key])).map(key => <div key={key}>
    <dt>{followupLabel(key)}</dt><dd><span><small>Current answer</small>{display(current[key])}</span><span><small>Proposed answer</small>{key === 'govIdNumber' ? 'New ID number provided' : display(proposed[key])}</span></dd>
  </div>)}</dl>;
}
export default function ApplicationFollowup({ reference, accessCode }) {
  const [data, setData] = useState(null), [category, setCategory] = useState('contact'), [patch, setPatch] = useState({}), [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState(''), [notes, setNotes] = useState({}), [files, setFiles] = useState({});
  const controller = useRef(null), mounted = useRef(true), retry = useRef(new Map());
  const errorSummary = useRef(null);
  const historyDetails = useRef(null);
  const [changeFiles, setChangeFiles] = useState({});
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; controller.current?.abort(); }; }, []);
  useEffect(() => { if (error) errorSummary.current?.focus(); }, [error]);
  const call = async (path = '', body) => {
    const response = await rateAwareFetch(`/api/application-status/${reference}/followup${path}`, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${accessCode}`, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined, cache: 'no-store', signal: controller.current?.signal });
    const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Unable to save. Keep your answers and retry.'); return result;
  };
  const load = async () => { const result = await call(); if (result.id !== reference || !result.groups || !Array.isArray(result.items)) throw new Error('Unable to confirm the current record.'); if (mounted.current) setData(result); };
  const run = async action => { if (controller.current) return; controller.current = new AbortController(); setBusy(true); setError(''); setMessage(''); try { await action(); } catch (e) { if (mounted.current) setError(e.message); } finally { controller.current = null; if (mounted.current) setBusy(false); } };
  const idFor = body => { const key = JSON.stringify(body); if (!retry.current.has(key)) retry.current.set(key, crypto.randomUUID()); return retry.current.get(key); };
  const sendChange = async () => {
    const body = { revision: data.revision, category, patch, reason }; const receipt = await call('/changes', { ...body, requestId: idFor(body) });
    if (!receipt.id || !changeStates[receipt.state]) throw new Error('Update receipt could not be confirmed. Retry with the same answers.');
    setPatch({}); setReason(''); setMessage(receipt.state === 'accepted' ? 'Contact details updated.' : 'Change request received. Your current answers remain until accepted.'); await load();
    if (historyDetails.current) { historyDetails.current.open = true; historyDetails.current.querySelector('summary')?.focus(); }
  };
  const act = async (item, action) => {
    const body = { revision: item.revision, action, note: notes[item.id] || '' }; const result = await call(`/onboarding/${item.id}`, { ...body, requestId: idFor({ item: item.id, ...body }) });
    if (result.itemId !== item.id || !onboardingStates[result.state]) throw new Error('Receipt not confirmed. Retry with the same request.');
    setMessage(action === 'clarification' ? 'Question sent to your reviewer.' : 'Received for review. This is not confirmation of completion.'); await load();
  };
  const upload = async item => {
    const file = files[item.id]; const key = `file:${item.id}:${item.revision}`;
    if (!retry.current.has(key)) retry.current.set(key, crypto.randomUUID());
    await submitFranchiseApplication({ formData: { documents: { onboardingEvidence: file } }, requestId: retry.current.get(key), onboarding: { applicationId: reference, id: item.id, revision: item.revision, accessCode }, signal: controller.current.signal, onProgress: text => { if (mounted.current) setMessage(text); } });
    if (!mounted.current) return; setFiles(p => ({ ...p, [item.id]: null })); setMessage('Document received for reviewer assessment.'); await load();
  };
  const spec = CHANGE_GROUPS[category];
  const uploadChange = async change => {
    const key = `change:${change.id}`;
    if (!retry.current.has(key)) retry.current.set(key, crypto.randomUUID());
    await submitFranchiseApplication({ formData: { documents: changeFiles[change.id] || {} }, requestId: retry.current.get(key),
      changeEvidence: { applicationId: reference, id: change.id, accessCode }, signal: controller.current.signal,
      onProgress: text => { if (mounted.current) setMessage(text); } });
    if (!mounted.current) return;
    setChangeFiles(previous => { const next = { ...previous }; delete next[change.id]; return next; });
    setMessage('Supporting documents received. Your current answers and documents stay unchanged until your reviewer accepts the request.');
    await load();
  };
  const closed = data && ['declined', 'withdrawn'].includes(data.status);
  const completed = data?.items.filter(item => item.state === 'complete').length || 0;
  const values = { ...data?.groups[category], ...patch };
  const visibleFields = spec.fields.filter(key =>
    (key !== 'coApplicant' || values.hasCoApplicant === 'yes') &&
    (!['govIdOtherName', 'govIdOtherIssuer'].includes(key) || values.govIdType === 'Other') &&
    (key !== 'pendingFundingDetails' || ['pending', 'partly-pending'].includes(values.fundingStatus)) &&
    (key !== 'fundsEvidenceDetails' || values.fundsEvidenceType === 'other'));
  const changed = data ? Object.fromEntries(Object.entries(patch).filter(([key, value]) => JSON.stringify(data.groups[category][key]) !== JSON.stringify(value))) : {};
  const renderField = key => {
    const current = data.groups[category][key], value = values[key] ?? '', options = followupOptions(key), id = `change-${key}`;
    return <div className={['address', 'coApplicant', 'additionalPlanDetails', 'pendingFundingDetails', 'fundsEvidenceDetails'].includes(key) ? 'followup-field followup-field--wide' : 'followup-field'} key={key}>
      {key === 'coApplicant' || FOLLOWUP_ARRAY_FIELDS.includes(key) ? <span id={`${id}-label`} className="followup-field-label">{followupLabel(key)}</span> : <label htmlFor={id}>{followupLabel(key)}</label>}
      <p id={`${id}-current`} className="followup-current"><span>Current</span> {display(current)}</p>
      {key === 'coApplicant' ? <div className="followup-field-grid" role="group" aria-labelledby={`${id}-label`}>
        {['firstName', 'lastName', 'email', 'phone'].map(k => <label key={k} className="followup-field">{followupLabel(k)}
          <input className="form-input" type={k === 'email' ? 'email' : k === 'phone' ? 'tel' : 'text'} value={value?.[k] || ''} maxLength={320} onChange={e => setPatch(p => ({ ...p, coApplicant: { ...value, [k]: e.target.value } }))} />
        </label>)}
      </div> : FOLLOWUP_ARRAY_FIELDS.includes(key) ? <div className="chip-group" role="group" aria-labelledby={`${id}-label`}>{options.map(option => <button type="button" className={`chip ${value.includes(option) ? 'selected' : ''}`} aria-pressed={value.includes(option)} key={option} onClick={() => setPatch(p => ({ ...p, [key]: value.includes(option) ? value.filter(v => v !== option) : [...value, option] }))}>{optionLabel(option)}</button>)}</div>
        : options ? <FormSelect id={id} value={optionLabel(value)} options={options.map(optionLabel)} onChange={v => setPatch(p => ({ ...p, [key]: options.find(option => optionLabel(option) === v) }))} />
          : ['additionalPlanDetails', 'pendingFundingDetails', 'fundsEvidenceDetails', 'address'].includes(key) ? <textarea id={id} className="form-textarea" rows={3} value={value} maxLength={2000} aria-describedby={`${id}-current`} onChange={e => setPatch(p => ({ ...p, [key]: e.target.value }))} />
            : <input id={id} className="form-input" value={key === 'govIdNumber' && !Object.hasOwn(patch, key) ? '' : value} placeholder={key === 'govIdNumber' ? 'Leave blank to keep your current number' : undefined} type={key === 'email' ? 'email' : key === 'dateOfBirth' ? 'date' : /Phone$/.test(key) ? 'tel' : 'text'} inputMode={key === 'totalLiquidCapital' ? 'decimal' : undefined} maxLength={2000} aria-describedby={`${id}-current`} onChange={e => setPatch(p => {
              const next = { ...p, [key]: e.target.value };
              if (key === 'govIdNumber' && !e.target.value) delete next[key];
              return next;
            })} />}
    </div>;
  };
  return <section className="portal-followup" aria-labelledby="followup-title" aria-busy={busy}>
    <header className="followup-heading">
      <div><span className="step-eyebrow">Your private application</span><h2 id="followup-title">Keep your next steps close.</h2><p>Correct your details, follow a request and prepare for what comes next.</p></div>
      <button type="button" className="followup-secondary" disabled={busy} onClick={() => run(load)}><BiRefresh aria-hidden="true" />{busy ? 'Please wait…' : data ? 'Refresh details' : 'Load my details'}</button>
    </header>
    <p className="followup-privacy"><BiLockAlt aria-hidden="true" /><span>Details load when you request them. Unsent edits stay in this page’s memory; leaving clears them.</span></p>
    {error && <div ref={errorSummary} tabIndex={-1} role="alert" className="portal-error">{error}</div>}
    <div role="status" aria-live="polite" aria-atomic="true" className={message ? 'followup-feedback' : ''}>{message}</div>
    {!data && <div className="followup-empty"><BiLockAlt aria-hidden="true" /><h3>Your record, when you need it.</h3><p>Choose “Load my details” to see your current answers and any requirements assigned by your reviewer.</p></div>}
    {data && <>
      {data.reassessmentRequired && <p className="portal-error">A material change needs reassessment. Onboarding is paused until your reviewer resolves it.</p>}
      {closed && <p className="followup-feedback">This application is closed. Contact support if a correction is needed.</p>}
      <details className="followup-panel">
        <summary><span className="followup-summary-icon"><BiEditAlt aria-hidden="true" /></span><span><strong>Update my application details</strong><small>Change an answer without starting again</small></span><BiChevronDown className="followup-chevron" aria-hidden="true" /></summary>
        <div className="followup-panel-body"><form onSubmit={e => { e.preventDefault(); run(sendChange); }}>
          <fieldset disabled={busy || closed} className="portal-followup-fields">
            <div className="followup-category"><label htmlFor="change-category">What would you like to update?</label><FormSelect id="change-category" value={spec.label} options={Object.values(CHANGE_GROUPS).map(g => g.label)} onChange={value => { setCategory(Object.keys(CHANGE_GROUPS).find(k => CHANGE_GROUPS[k].label === value)); setPatch({}); setReason(''); }} /></div>
            <p className="followup-policy">{spec.immediate ? 'Valid phone and contact-preference corrections take effect immediately.' : spec.verification ? 'Staff must verify and accept this change. A new email also needs verification and authorization through an established channel.' : 'Your current answers remain in place until a reviewer accepts the change.'} Only edit what needs correcting.</p>
            <div className="followup-field-grid">{visibleFields.map(renderField)}</div>
            <div className="followup-field followup-reason"><label htmlFor="change-reason">Reason for your update <span>Required</span></label><textarea id="change-reason" className="form-textarea" rows={3} value={reason} onChange={e => setReason(e.target.value)} minLength={10} maxLength={1000} required aria-describedby="change-reason-hint" placeholder="Briefly explain what changed or what needs correcting." /><small id="change-reason-hint">10–1,000 characters · {reason.length.toLocaleString()} / 1,000</small></div>
            {Object.keys(changed).length > 0 && <section className="followup-review" aria-label="Review your proposed changes"><h3>Check before sending</h3><Comparison current={data.groups[category]} proposed={changed} /></section>}
            <div className="followup-actions"><p>{spec.immediate ? 'A saved correction will appear in your history.' : ['identity', 'funding'].includes(category) ? 'After sending, attach any required supporting documents in Change history below.' : 'Your reviewer may ask for supporting information.'}</p><button className="portal-primary step-nav-continue" disabled={!Object.keys(changed).length || reason.trim().length < 10}>{busy ? 'Saving…' : spec.immediate ? 'Save contact correction' : 'Send change request'}</button></div>
          </fieldset>
        </form></div>
      </details>
      <details className="followup-panel" ref={historyDetails}>
        <summary><span className="followup-summary-icon"><BiHistory aria-hidden="true" /></span><span><strong>Change history <span className="followup-count">{data.changes.length}</span></strong><small>Requests, decisions and reviewer feedback</small></span><BiChevronDown className="followup-chevron" aria-hidden="true" /></summary>
        <div className="followup-panel-body">{!data.changes.length ? <p className="followup-empty-copy">Your updates will appear here after you send them.</p> : <ol className="followup-history">{data.changes.map(c => <li key={c.id}><article>
          <header className="followup-item-heading"><div><h3>{CHANGE_GROUPS[c.category]?.label}</h3>{dateLabel(c.createdAt) && <time dateTime={c.createdAt}>{dateLabel(c.createdAt)}</time>}</div><StateBadge state={c.state} /></header>
          <Comparison current={c.current} proposed={c.proposed} /><p><strong>Your reason:</strong> {c.reason}</p>{c.reviewNote && <p className="followup-reviewer"><strong>Reviewer feedback</strong>{c.reviewNote}</p>}
          {!!c.documents?.length && <section className="followup-evidence" aria-label="Supporting documents for this change">
            <h3>{c.documents.every(doc => doc.received) ? 'Documents received for review' : 'Supporting documents needed'}</h3>
            <p className="followup-policy">These files support this proposed change. They replace your current documents only if the reviewer accepts it. PDF, JPG or PNG, up to 10 MiB each; portraits must be JPG or PNG.</p>
            {c.documents.every(doc => doc.received) ? <ul>{c.documents.map(doc => <li key={doc.key}>{doc.label}: {doc.name}</li>)}</ul>
              : c.state === 'pending' && !closed ? <fieldset disabled={busy} className="portal-followup-fields">
                <details className="followup-policy"><summary>What can I redact?</summary><p>{DOCUMENT_REDACTION_NOTICE}</p></details>
                {c.documents.map(doc => <div key={doc.key} className="followup-evidence-file"><h4>{doc.label}</h4><p className="followup-policy">{DOCUMENT_POLICY[doc.key]?.pages}</p><DocumentPicker docKey={doc.key} label={doc.label} file={changeFiles[c.id]?.[doc.key]} disabled={busy}
                  status="Selected on this device; not uploaded or saved in this browser" onError={setError}
                  onConfirm={file => { setChangeFiles(p => ({ ...p, [c.id]: { ...p[c.id], [doc.key]: file } })); retry.current.delete(`change:${c.id}`); }}
                  onRemove={() => { setChangeFiles(p => { const next = { ...p[c.id] }; delete next[doc.key]; return { ...p, [c.id]: next }; }); retry.current.delete(`change:${c.id}`); }} /></div>)}
                <button type="button" className="portal-primary step-nav-continue" disabled={busy || c.documents.some(doc => !changeFiles[c.id]?.[doc.key])} onClick={() => run(() => uploadChange(c))}>{busy ? 'Processing documents…' : 'Send supporting documents'}</button>
              </fieldset> : <p>Uploads are closed for this request. Read the reviewer feedback before sending a new change request.</p>}
          </section>}
        </article></li>)}</ol>}</div>
      </details>
      <section className="followup-panel followup-onboarding" id="my-onboarding" aria-labelledby="my-onboarding-title">
        <header className="followup-onboarding-heading"><div><span className="step-eyebrow">After approval</span><h2 id="my-onboarding-title">My onboarding</h2><p>Your assigned requirements and confirmed next steps.</p></div><BiListCheck aria-hidden="true" /></header>
        {!data.onboardingAvailable ? <div className="followup-empty"><BiLockAlt aria-hidden="true" /><h3>{data.reassessmentRequired ? 'Waiting for reassessment' : 'Your checklist comes after approval'}</h3><p>{data.reassessmentRequired ? 'Your reviewer needs to resolve the proposed changes before onboarding can continue.' : 'You can still correct your details above. Requirements appear here once your case is approved and your reviewer assigns them.'}</p></div> : !data.items.length ? <div className="followup-empty"><BiListCheck aria-hidden="true" /><h3>Ready for your next steps.</h3><p>No requirements have been assigned yet. Your reviewer will publish the checklist and confirmed schedule for your case.</p></div> : <>
          <div className="followup-progress"><span><strong>{completed} of {data.items.length}</strong> reviewer-confirmed complete</span><progress value={completed} max={data.items.length} aria-label="Reviewer-confirmed onboarding requirements" /></div>
          <ol className="followup-checklist">{data.items.map((item, index) => <li key={item.id}><details className="followup-task">
            <summary><span className="followup-task-number" aria-hidden="true">{item.state === 'complete' ? <BiCheck /> : String(index + 1).padStart(2, '0')}</span><span className="followup-task-title"><strong>{item.title}</strong><StateBadge state={item.state} /></span><BiChevronDown className="followup-chevron" aria-hidden="true" /></summary>
            <div className="followup-task-body"><p>{item.instructions}</p><dl className="followup-task-meta"><div><dt>Why it is needed</dt><dd>{item.purpose}</dd></div><div><dt>Responsible</dt><dd>{item.responsible}</dd></div><div><dt>Confirmed schedule</dt><dd>{dateLabel(item.dueAt) || 'Not scheduled yet'}</dd></div><div><dt>Your contact</dt><dd><a href={`mailto:${item.contactEmail}`}>{item.contactName}</a><small>{item.contactEmail}</small></dd></div></dl>
              {item.evidenceName && <p className="followup-feedback"><BiCheck aria-hidden="true" /> Received file: {item.evidenceName}</p>}
              {item.note && <p><strong>Your submitted note:</strong> {item.note}</p>}
              {item.reviewerNote && <p className="followup-reviewer"><strong>Reviewer feedback</strong>{item.reviewerNote}</p>}
              {item.state === 'submitted' && <p className="followup-policy">Your requirement is with the reviewer. You can ask a question below while you wait.</p>}
              <fieldset disabled={busy} className="portal-followup-fields"><div className="followup-field"><label htmlFor={`note-${item.id}`}>{item.evidenceMode === 'note' && ['not_started', 'needs_correction'].includes(item.state) ? 'Evidence note or question' : 'Question for your reviewer'}</label><textarea id={`note-${item.id}`} className="form-textarea" rows={3} maxLength={2000} value={notes[item.id] || ''} onChange={e => setNotes(p => ({ ...p, [item.id]: e.target.value }))} aria-describedby={`note-hint-${item.id}`} /><small id={`note-hint-${item.id}`}>At least 10 characters to ask a question. Use the secure file control for documents; keep private access codes out of notes.</small></div>
                {['not_started', 'needs_correction'].includes(item.state) && (item.evidenceMode === 'file' ? <><DocumentPicker docKey="onboardingEvidence" label={item.title} file={files[item.id]} disabled={busy} status="Selected on this device; send to upload" onError={setError} onConfirm={file => { setFiles(p => ({ ...p, [item.id]: file })); retry.current.delete(`file:${item.id}:${item.revision}`); }} onRemove={() => setFiles(p => ({ ...p, [item.id]: null }))} /><button type="button" className="portal-primary step-nav-continue" disabled={!files[item.id]} onClick={() => run(() => upload(item))}>Send evidence for review</button></> : <button type="button" className="portal-primary step-nav-continue" onClick={() => run(() => act(item, 'submit'))}>{item.evidenceMode === 'ready' ? 'Mark ready for review' : 'Submit evidence note'}</button>)}
                <button type="button" className="followup-secondary" onClick={() => run(() => act(item, 'clarification'))} disabled={(notes[item.id] || '').trim().length < 10}>Ask for clarification</button>
              </fieldset>
              {!!item.discussion.length && <section className="followup-discussion" aria-label="Conversation with your reviewer"><h3>Conversation</h3>{item.discussion.map(entry => <article key={entry.id}><header><strong>{entry.kind === 'reply' ? 'Reviewer' : 'You'}</strong>{dateLabel(entry.createdAt) && <time dateTime={entry.createdAt}>{dateLabel(entry.createdAt)}</time>}</header><p>{entry.note}</p></article>)}</section>}
            </div>
          </details></li>)}</ol>
        </>}
        <footer className="followup-footer"><BiLockAlt aria-hidden="true" /><p>Only your reviewer confirms completion. This checklist does not create an agreement, payment obligation or opening date.</p></footer>
      </section>
    </>}
  </section>;
}
