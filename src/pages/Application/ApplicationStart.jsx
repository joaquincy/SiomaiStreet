import { useEffect, useRef, useState } from 'react';
import { BiArrowToRight, BiCheck, BiFile, BiTimeFive, BiX } from 'react-icons/bi';
import { APPLICATION_DOCUMENTS } from '../../../shared/application.js';
import './ApplicationWelcome.css';

const SEEN_KEY = 'siomai-application-welcome-v1';
let dismissedInMemory = false;

export default function ApplicationStart({ ready = true }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef(null);
  const heading = useRef(null);
  const reopen = useRef(null);

  useEffect(() => {
    if (!ready || dismissedInMemory) return;
    let seen = false;
    try { seen = sessionStorage.getItem(SEEN_KEY) === 'seen'; } catch { /* The guide still works when browser storage is blocked. */ }
    if (!seen) setOpen(true);
  }, [ready]);

  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = 'hidden';
    heading.current?.focus();
    return () => { element.close(); document.body.style.overflow = previousOverflow; };
  }, [open]);

  const dismiss = () => {
    dismissedInMemory = true;
    try { sessionStorage.setItem(SEEN_KEY, 'seen'); } catch { /* In-memory fallback avoids repeated prompts during this visit. */ }
    dialog.current?.close();
    setOpen(false);
    reopen.current?.focus();
  };

  return <>
    <div className="welcome-reopen-bar">
      <span><BiFile aria-hidden="true" /> A little preparation goes a long way.</span>
      <button ref={reopen} type="button" onClick={() => setOpen(true)} aria-haspopup="dialog">Before you start <BiArrowToRight aria-hidden="true" /></button>
    </div>
    <dialog ref={dialog} className="application-welcome" aria-labelledby="application-welcome-title" onCancel={event => { event.preventDefault(); dismiss(); }}>
      <button className="welcome-close" type="button" aria-label="Close before you start" onClick={dismiss}><BiX aria-hidden="true" /></button>
      <div className="welcome-layout">
        <div className="welcome-intro">
          <span className="welcome-eyebrow">SIOMAI STREET / FRANCHISING</span>
          <div className="welcome-illustration" aria-hidden="true"><BiFile /><span><BiCheck /></span></div>
          <p className="welcome-kicker">Before you start</p>
          <h2 id="application-welcome-title" tabIndex={-1} ref={heading}>Your next chapter,<br /><em>starts here.</em></h2>
          <p>Let’s get you ready for a thoughtful, complete application.</p>
          <div className="welcome-time"><BiTimeFive aria-hidden="true" /><span>About 25–35 minutes <span>·</span> 9 steps</span></div>
          <p className="welcome-disclaimer">Submitting is a request for consideration, not franchise approval or a commitment to purchase.</p>
        </div>
        <div className="welcome-content">
          <div className="welcome-section-heading"><span className="welcome-eyebrow">A QUICK CHECKLIST</span><h3>A few things to have ready.</h3></div>
          <ol className="welcome-checklist">
            <li><span className="welcome-number" aria-hidden="true">01</span><div><h4>Your details &amp; plans</h4><p>Contact details, available investment and preferred territory. The current form requires applicants to be at least 18. Package prices are quotation-only; final eligibility is subject to owner review.</p></div></li>
            <li><span className="welcome-number" aria-hidden="true">02</span><div><h4>Your supporting documents</h4><ul className="welcome-documents">{APPLICATION_DOCUMENTS.filter(doc => doc.required).map(doc => <li key={doc.key}><BiCheck aria-hidden="true" />{doc.label}</li>)}</ul><p className="welcome-format">PDF, JPG or PNG · Up to 10 MiB each.<br />The ID portrait must be JPG or PNG.</p></div></li>
            <li><span className="welcome-number" aria-hidden="true">03</span><div><h4>Answers that reflect your situation</h4><p>No employment history? Choose “No employment history.” No co-applicant or secured site? Choose “No” and leave site types blank. Do not invent answers.</p></div></li>
          </ol>
          <details className="welcome-more"><summary>Saving, privacy &amp; what happens next</summary><div>
            <p>Business and site records are optional now. Additional verification or onboarding documents may be requested separately; the final list is awaiting owner approval.</p>
            <p>Use a private device. Answers and files may be saved in this browser for seven days after your last save. Watch for Save failed notices.</p>
            <p>After submission, save your reference and private access code securely. Use Track Status to check progress and replace only documents requested by the reviewer.</p>
          </div></details>
          <div className="welcome-footer"><button type="button" onClick={dismiss}>I’m ready to begin <BiArrowToRight aria-hidden="true" /></button><span>You can reopen this guide anytime.</span></div>
        </div>
      </div>
    </dialog>
  </>;
}
