import { useEffect, useRef, useState, useId } from 'react';
import { BiCamera, BiCheck, BiCrop, BiFile, BiImage, BiRotateRight, BiShow, BiTrash, BiUpload, BiX, BiZoomIn } from 'react-icons/bi';
import { documentFormatLabel, documentTypes, MAX_DOCUMENT_BYTES } from '../../shared/application.js';
import { FULL_CROP, loadDocumentImage, renderDocumentImage } from '../utils/documentImage';
import './DocumentPicker.css';

export default function DocumentPicker({ docKey, label, file, onConfirm, onRemove, onError = () => {}, disabled = false, status = 'Selected on this device · Sent when you submit' }) {
  const id=useId(); const dialog=useRef(null); const camera=useRef(null);const gallery=useRef(null);const upload=useRef(null);
  const bitmap=useRef(null); const previewUrl=useRef(''); const generation=useRef(0); const trigger=useRef(null);const busyRef=useRef(false);
  const [candidate,setCandidate]=useState(null);const [preview,setPreview]=useState('');const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');const [zoom,setZoom]=useState(100);const [rotation,setRotation]=useState(0);const [crop,setCrop]=useState(FULL_CROP);const [applied,setApplied]=useState(true);
  const [confirmed,setConfirmed]=useState(false);const [dimensions,setDimensions]=useState('');
  const [thumbnail,setThumbnail]=useState('');
  const previousOverflow=useRef(null);
  const restoreScroll=()=>{if(previousOverflow.current!==null){document.body.style.overflow=previousOverflow.current;previousOverflow.current=null;}};
  const cleanup=()=>{generation.current++;bitmap.current?.close();bitmap.current=null;URL.revokeObjectURL(previewUrl.current);previewUrl.current='';};
  useEffect(()=>()=>{cleanup();restoreScroll();},[]);
  useEffect(()=>{
    if(!file?.type?.startsWith('image/')){setThumbnail('');return;}
    const url=URL.createObjectURL(file);setThumbnail(url);
    return ()=>URL.revokeObjectURL(url);
  },[file]);
  const publish=file=>{URL.revokeObjectURL(previewUrl.current);previewUrl.current=URL.createObjectURL(file);setPreview(previewUrl.current);setCandidate(file);setConfirmed(false);};
  const close=()=>{cleanup();dialog.current?.close();restoreScroll();setCandidate(null);setPreview('');setError('');setBusy(false);busyRef.current=false;trigger.current?.focus();};
  const choose=(ref,e)=>{trigger.current=e.currentTarget;ref.current?.click();};
  const stage=async selected=>{
    if(!selected)return;
    if(busyRef.current)return;
    cleanup();const ticket=generation.current;setError('');onError('');setRotation(0);setCrop(FULL_CROP);setZoom(100);setApplied(true);setConfirmed(false);setDimensions('');setCandidate(null);setPreview('');
    dialog.current?.showModal();
    if(previousOverflow.current===null){previousOverflow.current=document.body.style.overflow;document.body.style.overflow='hidden';}
    setBusy(true);busyRef.current=true;
    try {
      if(selected.type==='application/pdf'){
        if(!documentTypes(docKey).includes(selected.type))throw new Error('The ID photo must be a JPG or PNG image, not a PDF. Choose a portrait photo.');
        if(!selected.size||selected.size>MAX_DOCUMENT_BYTES)throw new Error('Choose a nonempty PDF no larger than 10 MiB. Export a smaller PDF from your document app.');
        const header=await selected.slice(0,5).text();if(header!=='%PDF-')throw new Error('This file does not appear to be a PDF. Export it again rather than renaming it.');
        if(ticket===generation.current)publish(selected);
      }else{
        const image=await loadDocumentImage(selected);
        if(ticket!==generation.current){image.close();return;}
        bitmap.current=image;
        const processed=await renderDocumentImage(image);
        if(ticket===generation.current){publish(new File([processed.file],`${docKey}.jpg`,{type:'image/jpeg'}));setDimensions(`${processed.width} × ${processed.height} pixels`);}
      }
    }catch(e){if(ticket===generation.current){setError(e.message);onError(e.message);}}
    finally {if(ticket===generation.current){setBusy(false);busyRef.current=false;}}
  };
  const apply=async()=>{
    if(busyRef.current || !bitmap.current)return;busyRef.current=true;setBusy(true);setError('');const ticket=generation.current;
    try{const result=await renderDocumentImage(bitmap.current,rotation,crop);if(ticket===generation.current){publish(new File([result.file],`${docKey}.jpg`,{type:'image/jpeg'}));setDimensions(`${result.width} × ${result.height} pixels`);setApplied(true);}}
    catch(e){if(ticket===generation.current)setError(e.message);}finally{if(ticket===generation.current){setBusy(false);busyRef.current=false;}}
  };
  const select=e=>{const selected=e.target.files?.[0];e.target.value='';stage(selected);};
  return <div className="document-picker">
    <input hidden ref={camera} type="file" accept="image/*" capture={docKey==='idPhoto'?'user':'environment'} onChange={select} />
    <input hidden ref={gallery} type="file" accept="image/*" onChange={select} />
    <input hidden ref={upload} type="file" accept={documentTypes(docKey).join(',')} onChange={select} />
    {file&&<div className="document-current">
      <div className="document-current-file"><span className="document-thumbnail">{thumbnail?<img src={thumbnail} alt=""/>:<BiFile aria-hidden="true"/>}</span><div><strong>{file.name}</strong><span>{(file.size/1024/1024).toFixed(2)} MiB · {file.type==='application/pdf'?'PDF':'Image'}</span></div></div>
      <p className="document-local-status" role="status">{status}</p>
      <div className="document-current-actions"><button type="button" disabled={disabled} aria-label={`Preview ${label}`} onClick={e=>{trigger.current=e.currentTarget;stage(file);}}><BiShow aria-hidden="true"/>Preview / edit</button><button type="button" disabled={disabled} aria-label={`Remove ${label}`} onClick={()=>{onRemove?.();onError('');}}><BiTrash aria-hidden="true"/>Remove</button></div>
    </div>}
    <div className="document-source-actions" role="group" aria-label={`${file?'Replace':'Add'} ${label}`}>
      <button className="document-camera-button" type="button" disabled={disabled} aria-label={`Take photo for ${label}`} onClick={e=>choose(camera,e)}><BiCamera aria-hidden="true"/><span>Take photo</span><span className="document-action-hint">Use camera</span></button>
      <button type="button" disabled={disabled} aria-label={`Choose photo for ${label}`} onClick={e=>choose(gallery,e)}><BiImage aria-hidden="true"/>Choose photo</button>
      <button type="button" disabled={disabled} aria-label={`Upload file for ${label}`} onClick={e=>choose(upload,e)}><BiUpload aria-hidden="true"/>Upload file</button>
    </div>
    <p className="document-format">{documentFormatLabel(docKey)} <span aria-hidden="true">·</span> Maximum 10 MiB after processing</p>
    <p className="document-fallback">Camera not opening? Choose an existing photo or file.</p>
    <dialog ref={dialog} className="document-preview-dialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-instructions`} onCancel={e=>{e.preventDefault();close();}}>
      <header className="document-preview-header"><div><span className="document-editor-eyebrow">REVIEW YOUR DOCUMENT</span><h3 id={`${id}-title`}>Preview — {label}</h3></div><button className="document-dialog-close" type="button" onClick={close} autoFocus aria-label="Cancel preview"><BiX aria-hidden="true"/></button></header>
      <p className="document-preview-instructions" id={`${id}-instructions`}>{file?'Your previous document stays selected until you confirm this replacement.':'Take a moment to check your document before adding it.'} Check readability and all required edges. A photo is not proof of authenticity.</p>
      {busy&&<p className="document-processing" role="status"><span aria-hidden="true"/>Preparing preview on this device…</p>}
      {error&&<p className="document-preview-error" role="alert">{error}</p>}
      {candidate&&<>
        <div className="document-editor-layout">
          <div className="document-preview-workspace">
            <div className="document-preview-file"><BiFile aria-hidden="true"/><span>{candidate.name}</span><span>{(candidate.size/1024/1024).toFixed(2)} MiB</span></div>
            {candidate.type==='application/pdf'?<iframe title={`PDF preview for ${label}`} src={preview} sandbox="" />:<>
              <div className="document-preview-pan" tabIndex={0} role="region" aria-label="Photo preview; scroll to inspect enlarged image"><img src={preview} alt={`Selected ${label}; inspect text and edges`} style={{width:`${zoom}%`,maxWidth:'none'}} /></div>
              <label className="document-zoom"><BiZoomIn aria-hidden="true"/><span>Zoom</span><input aria-label="Preview zoom" type="range" min="100" max="300" step="25" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/><output>{zoom}%</output></label>
            </>}
            <p className="document-preview-resolution">{dimensions || 'PDF document'} · Preview before confirming</p>
          </div>
          <aside className="document-editor-controls" aria-label="Document preparation">
            {candidate.type==='application/pdf'?<div className="document-pdf-guidance"><BiFile aria-hidden="true"/><h4>Check every page.</h4><p>If your browser cannot display this PDF, inspect the original file in your document app before confirming it.</p><p>Make sure text is readable and all required details are included.</p></div>:<>
              <fieldset disabled={busy}><legend>Fine-tune your photo</legend>
                <p className="document-edit-help">Keep the whole document in view. Only trim the surrounding background.</p>
                <button className="document-rotate" type="button" onClick={()=>{setRotation(r=>(r+90)%360);setCrop(FULL_CROP);setApplied(false);setConfirmed(false);}}><BiRotateRight aria-hidden="true"/>Rotate 90° <span>{rotation}°</span></button>
                <details className="document-crop"><summary><BiCrop aria-hidden="true"/>Crop edges <span aria-hidden="true">+</span></summary><p>Trim 0–40% from each edge of the rotated image.</p><div className="document-crop-grid">{['left','top','right','bottom'].map(edge=><label key={edge}>Crop {edge} (%)<input type="number" min="0" max="40" step="1" value={crop[edge]} onChange={e=>{setCrop(c=>({...c,[edge]:e.target.value}));setApplied(false);setConfirmed(false);}}/></label>)}</div></details>
                <div className="document-edit-actions"><button type="button" onClick={apply} disabled={applied}>Apply edits</button><button type="button" onClick={()=>{setRotation(0);setCrop(FULL_CROP);setApplied(false);setConfirmed(false);}}>Reset</button></div>
              </fieldset>
              {!applied&&<p className="document-pending-edits" role="status">Apply your edits before confirming. The preview shows the last applied image.</p>}
              <p className="document-processing-note">Photos are re-encoded as JPG to remove unnecessary metadata and limit size. No automatic readability or authenticity check is performed.</p>
            </>}
            <div className="document-replace-actions"><span>Need a clearer copy?</span><button type="button" disabled={busy} onClick={()=>camera.current?.click()}><BiCamera aria-hidden="true"/>Retake photo</button><button type="button" disabled={busy} onClick={()=>upload.current?.click()}><BiUpload aria-hidden="true"/>Choose another file</button></div>
          </aside>
        </div>
        <footer className="document-preview-footer">
          <label className="document-readability"><input type="checkbox" checked={confirmed} disabled={busy||!applied} onChange={e=>setConfirmed(e.target.checked)}/><span>I checked that required details are readable and not cut off.</span></label>
          <button className="document-confirm" type="button" disabled={busy||!applied||!confirmed||!!error} onClick={()=>{onConfirm(candidate);onError('');close();}}><BiCheck aria-hidden="true"/>Confirm document</button>
        </footer>
      </>}
      {!candidate&&!busy&&<div className="document-empty-recovery"><button type="button" onClick={()=>camera.current?.click()}><BiCamera aria-hidden="true"/>Retake photo</button><button type="button" onClick={()=>upload.current?.click()}><BiUpload aria-hidden="true"/>Choose another file</button></div>}
    </dialog>
  </div>;
}
