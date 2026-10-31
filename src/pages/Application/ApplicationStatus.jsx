import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { APPLICATION_DOCUMENTS, UUID_PATTERN } from '../../../shared/application.js';
import ApplicationSupport from './ApplicationSupport';
import DocumentPicker from '../../components/DocumentPicker';
import { documentTypes, documentFormatLabel } from '../../../shared/application.js';
import ApplicantPortalLayout from './ApplicantPortalLayout';
import { BiArrowToRight, BiCheckCircle, BiFile, BiLockAlt, BiRefresh, BiShow, BiHide, BiLogOut } from 'react-icons/bi';

const statuses = {submitted:'Submitted',under_review:'Under review',more_information_requested:'Documents requested',approved:'Approved',declined:'Declined',withdrawn:'Withdrawn'};
export default function ApplicationStatus() {
  const [reference,setReference]=useState(''); const [code,setCode]=useState('');
  const [record,setRecord]=useState(null); const [files,setFiles]=useState({});
  const [message,setMessage]=useState(''); const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
  const [showCode,setShowCode]=useState(false);
  const lock=useRef(false); const retries=useRef({});
  const run=async action=>{if(lock.current)return;lock.current=true;setBusy(true);setError('');setMessage('');try{await action();}catch(e){setError(e.message);}finally{lock.current=false;setBusy(false);}};
  const call=async (suffix='',body)=>{
    let response; try { response=await fetch(`/api/application-status/${reference.trim()}${suffix}`,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${code.trim()}`},body,cache:'no-store'}); } catch {throw new Error('Connection failed. Keep this page open and retry with the same file.');}
    let data; try{data=await response.json();}catch{throw new Error('The service returned an unreadable response. Keep this page open and retry.');}
    if(!response.ok)throw new Error(data.error||'Unable to retrieve your application.');
    return data;
  };
  const refresh=async()=>{
    if(!UUID_PATTERN.test(reference.trim()) || !/^[A-Za-z0-9_-]{43}$/.test(code.trim()))throw new Error('Enter the reference and private access code from your receipt.');
    const data=await call();
    if(data.id!==reference.trim() || !statuses[data.status] || !Array.isArray(data.corrections))throw new Error('The service returned an invalid status response.');
    setRecord(data);setMessage('Status updated.');
  };
  const replace=async request=>{
    const file=files[request.id]; if(!file)throw new Error('Choose the requested replacement document.');
    if(!file.size || file.size>10*1024*1024 || !documentTypes(request.documentKey).includes(file.type))throw new Error(`Choose a nonempty ${documentFormatLabel(request.documentKey)} no larger than 10 MiB.`);
    const retryId=retries.current[request.id] ||= crypto.randomUUID();
    const body=new FormData();body.append('requestId',retryId);body.append('document',file);
    const result=await call(`/corrections/${request.id}`,body);
    if(result.id!==request.id || result.requestId!==retryId || result.status!=='received')throw new Error('Replacement receipt could not be confirmed. Retry with the same file.');
    setFiles(previous=>{const next={...previous};delete next[request.id];return next;});
    setRecord(previous=>({...previous,corrections:previous.corrections.map(r=>r.id===request.id?{...r,status:'received'}:r)}));
    setMessage('Replacement received. Your original application and reference are unchanged. Refresh status for the latest review stage.');
  };
  const nextSteps = {submitted:'Your application has been received. Check here for updates and requests from the reviewer.',under_review:'Your application is being reviewed. Any requests for more information will appear below.',more_information_requested:'Review the document requests below. Send replacements without starting a new application.',approved:'Your application is marked approved. Confirm the offer, agreement and onboarding instructions with the team.',declined:'Your application is marked declined. Use a verified support channel if you need clarification.',withdrawn:'Your application is marked withdrawn. Contact the team if you believe this is incorrect.'};
  const updatedDate = record ? new Date(record.updatedAt || record.submittedAt) : null;
  return <ApplicantPortalLayout>
    <header className="app-page-header portal-page-header"><div className="app-header-left"><h1>Track Your Application</h1><p>Follow your application, respond to document requests and see your next steps.</p></div></header>
    {!record ? <div className="portal-access-layout">

      <section className="portal-access-card app-form-card" aria-labelledby="tracking-title"><header className="step-intro"><span className="step-eyebrow">PRIVATE APPLICATION ACCESS</span><h2 className="step-intro-title" id="tracking-title">Let’s check your <span className="title-highlight">progress</span></h2><p className="step-intro-subtitle">Enter the reference and private access code from your submission receipt.</p></header>
        <form onSubmit={e=>{e.preventDefault();run(refresh);}} aria-busy={busy}>
          <label htmlFor="tracking-reference">Application reference <span className="field-requirement required">Required</span></label><input className="form-input" id="tracking-reference" required autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="Paste your application reference" value={reference} onChange={e=>setReference(e.target.value)} disabled={busy} />
          <label htmlFor="tracking-code">Private access code <span className="field-requirement required">Required</span></label><div className="portal-password"><input className="form-input" id="tracking-code" required type={showCode?'text':'password'} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="Paste your private access code" value={code} onChange={e=>setCode(e.target.value)} disabled={busy} aria-describedby="tracking-privacy" /><button type="button" aria-label={showCode?'Hide private access code':'Show private access code'} aria-pressed={showCode} onClick={()=>setShowCode(value=>!value)}>{showCode?<BiHide aria-hidden="true"/>:<BiShow aria-hidden="true"/>}</button></div>
          <p id="tracking-privacy" className="portal-small-note">This session stays in memory only. Reloading or closing the page signs you out. No ID images or financial answers are displayed here.</p>
          {error&&<p className="portal-error" role="alert">{error}</p>}
          <button className="portal-primary step-nav-continue" disabled={busy}>{busy?'Checking your application…':'Check status'}<span className="btn-arrow-badge"><BiArrowToRight aria-hidden="true" /></span></button>
        </form><details className="portal-help"><summary>Can’t find your access details?</summary><p>Check your saved submission receipt. Your reference alone cannot unlock the record. Use a verified support contact for help; do not send your private access code.</p><ApplicationSupport /></details>
      </section>
      <aside className="portal-access-intro helper-card"><span className="portal-large-icon"><BiLockAlt aria-hidden="true" /></span><h2>Your progress.<br />Your private space.</h2><p>Use the reference and private access code on your submission receipt. Your reference alone cannot open your application.</p><ol className="portal-access-steps"><li><span>01</span>Find your submission receipt</li><li><span>02</span>Enter your reference and access code</li><li><span>03</span>See updates and requested corrections</li></ol><p className="portal-small-note">Access expires 90 days after submission and may be revoked by staff. Keep your access code confidential.</p></aside>
    </div> : <div className="portal-record">
      <section className="portal-status-card app-form-card"><div className="portal-status-top"><span className="step-eyebrow">LATEST APPLICATION STATUS</span><div className="portal-record-actions"><button type="button" onClick={()=>run(refresh)} disabled={busy}><BiRefresh aria-hidden="true"/>{busy?'Refreshing…':'Refresh'}</button><button type="button" disabled={busy} onClick={()=>{setRecord(null);setCode('');setReference('');setShowCode(false);setFiles({});retries.current={};setMessage('Signed out.');setError('');}}><BiLogOut aria-hidden="true"/>Sign out</button></div></div><h2>{statuses[record.status]}</h2><p>{nextSteps[record.status]}</p><dl className="portal-record-meta"><div><dt>Application reference</dt><dd className="access-code">{record.id}</dd></div><div><dt>Last updated</dt><dd>{updatedDate && !Number.isNaN(updatedDate.getTime())?updatedDate.toLocaleString():'Not available'}</dd></div></dl><p className="portal-small-note">Receipt is not franchise approval, a signed agreement or account activation. Review timing has not yet been confirmed.</p>{record.status==='approved'&&<Link className="portal-text-link" to="/application/onboarding">Explore the onboarding guide <BiArrowToRight aria-hidden="true"/></Link>}</section>
      {error&&<p className="portal-error" role="alert">{error}</p>}
      <section aria-labelledby="document-requests-heading"><div className="portal-section-heading"><div><span className="step-eyebrow">KEEP YOUR APPLICATION MOVING</span><h2 id="document-requests-heading">Document requests</h2></div><span className="portal-tag">{record.corrections.filter(request=>request.status==='open').length} open</span></div>
        {!record.corrections.length && <div className="portal-empty"><BiCheckCircle aria-hidden="true"/><div><h3>Nothing to replace right now.</h3><p>No replacement documents are currently requested. Check back for updates.</p></div></div>}
        <div className="portal-request-grid">{record.corrections.map(request=><section key={request.id} className="portal-request-card"><div className="portal-request-heading"><BiFile aria-hidden="true"/><h3>{APPLICATION_DOCUMENTS.find(d=>d.key===request.documentKey)?.label || 'Document'}</h3></div><span className={'portal-request-state '+(request.status==='open'?'needs-action':'')}>{request.status==='received'?'Replacement received — awaiting review':request.status==='open'?'Action required':'Request closed'}</span><p className="portal-reviewer-note">{request.reason}</p>
          {request.status==='open' && <>
            <DocumentPicker docKey={request.documentKey} label={APPLICATION_DOCUMENTS.find(d=>d.key===request.documentKey)?.label || 'Requested document'} file={files[request.id]} disabled={busy} status="Selected on this device · Not saved in browser · Not uploaded" onError={setError}
              onConfirm={file=>{setFiles(p=>({...p,[request.id]:file}));delete retries.current[request.id];}}
              onRemove={()=>{setFiles(p=>{const next={...p};delete next[request.id];return next;});delete retries.current[request.id];}} />
            <p className="portal-small-note">Replacements stay in memory until sent; they are not saved as a local draft.</p><button className="portal-primary step-nav-continue" disabled={busy||!files[request.id]} onClick={()=>run(()=>replace(request))}>{busy?'Processing…':'Send replacement'}<BiArrowToRight aria-hidden="true"/></button>
          </>}
        </section>)}</div>
      </section><div className="portal-support"><ApplicationSupport /></div>
    </div>}
    <p className="portal-message" role="status" aria-live="polite">{message}</p>
    <div className="portal-bottom-links"><Link to="/application">Back to application</Link><Link to="/application/onboarding">Explore onboarding <BiArrowToRight aria-hidden="true"/></Link></div>
  </ApplicantPortalLayout>;
}
