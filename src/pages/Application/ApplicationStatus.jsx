import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { APPLICATION_DOCUMENTS, UUID_PATTERN } from '../../../shared/application.js';
import ApplicationSupport from './ApplicationSupport';
import DocumentPicker from '../../components/DocumentPicker';
import { documentTypes, documentFormatLabel } from '../../../shared/application.js';
import './Application.css';
import './ApplicationExperience.css';
import './ApplicationAccess.css';

const statuses = {submitted:'Submitted',under_review:'Under review',more_information_requested:'Documents requested',approved:'Approved',declined:'Declined',withdrawn:'Withdrawn'};
export default function ApplicationStatus() {
  const [reference,setReference]=useState(''); const [code,setCode]=useState('');
  const [record,setRecord]=useState(null); const [files,setFiles]=useState({});
  const [message,setMessage]=useState(''); const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
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
  return <main className="application-page application-access">
    <h1>Track your application</h1>
    <p>Your reference alone cannot open your record. Keep the private access code confidential. Access expires 90 days after submission and may be revoked by staff.</p>
    <ApplicationSupport />
    {!record ? <form onSubmit={e=>{e.preventDefault();run(refresh);}}>
      <label htmlFor="tracking-reference">Application reference</label><input id="tracking-reference" required autoComplete="off" value={reference} onChange={e=>setReference(e.target.value)} disabled={busy} />
      <label htmlFor="tracking-code">Private access code</label><input id="tracking-code" required type="password" autoComplete="off" value={code} onChange={e=>setCode(e.target.value)} disabled={busy} aria-describedby="tracking-privacy" />
      <p id="tracking-privacy">This session stays in memory only. Reloading or closing the page signs you out. No ID images or financial answers are displayed here.</p>
      <button className="btn btn-primary" disabled={busy}>{busy?'Checking…':'Check status'}</button>
    </form> : <>
      <h2>{statuses[record.status]}</h2><p>Reference: <strong className="access-code">{record.id}</strong></p>
      <p>Last updated: {new Date(record.updatedAt||record.submittedAt).toLocaleString()}</p>
      <p>Receipt is not franchise approval, a signed agreement or account activation. Review timing has not yet been confirmed.</p>
      <button onClick={()=>run(refresh)} disabled={busy}>Refresh status</button>{' '}
      <button disabled={busy} onClick={()=>{setRecord(null);setCode('');setReference('');setFiles({});retries.current={};setMessage('Signed out.');setError('');}}>Sign out</button>
      <h2>Document requests</h2>
      {!record.corrections.length && <p>No replacement documents are currently requested.</p>}
      {record.corrections.map(request=><section key={request.id} className="application-preparation">
        <h3>{APPLICATION_DOCUMENTS.find(d=>d.key===request.documentKey)?.label || 'Document'}</h3>
        <p>{request.reason}</p><p>Status: {request.status==='received'?'Replacement received — awaiting review':request.status==='open'?'Action required':'Request closed'}</p>
        {request.status==='open' && <>
          <DocumentPicker docKey={request.documentKey} label={APPLICATION_DOCUMENTS.find(d=>d.key===request.documentKey)?.label || 'Requested document'} file={files[request.id]} disabled={busy} status="Selected on this device · Not saved in browser · Not uploaded" onError={setError}
            onConfirm={file=>{setFiles(p=>({...p,[request.id]:file}));delete retries.current[request.id];}}
            onRemove={()=>{setFiles(p=>{const next={...p};delete next[request.id];return next;});delete retries.current[request.id];}} />
          <p>{files[request.id]?.name || 'No replacement selected.'} Replacements stay in memory until sent; they are not saved as a local draft.</p>
          <button disabled={busy||!files[request.id]} onClick={()=>run(()=>replace(request))}>{busy?'Processing…':'Send replacement'}</button>
        </>}
      </section>)}
    </>}
    {error&&<p role="alert">{error}</p>}<p role="status" aria-live="polite">{message}</p>
    <Link to="/application">Back to application</Link>
  </main>;
}
