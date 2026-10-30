import { useState } from 'react';
import { BiFile, BiIdCard, BiMap, BiReceipt, BiUser, BiWallet } from 'react-icons/bi';
import './Steps.css';
import { APPLICATION_DOCUMENTS } from '../../../../shared/application.js';
import { RequirementBadge, FieldErrorList } from '../../../components/ApplicationField';
import { useApplicationFeedback } from '../../../components/applicationFeedbackContext';
import DocumentPicker from '../../../components/DocumentPicker';
import DocumentCaptureGuide from '../../../components/DocumentCaptureGuide';
import './DocumentUpload.css';
const REQUIRED_DOCUMENTS = APPLICATION_DOCUMENTS.filter(doc=>doc.required);
const OPTIONAL_DOCUMENTS = APPLICATION_DOCUMENTS.filter(doc=>!doc.required);
const DOCUMENT_ICONS = { govIdFront: BiIdCard, govIdBack: BiIdCard, proofOfBilling: BiReceipt, proofOfFunds: BiWallet, idPhoto: BiUser, siteProposal: BiMap };

const DOCUMENT_HINTS = {
  govIdFront: 'Clear photo or scan showing your full name, photo, and ID number.',
  govIdBack: 'Back side of the same valid government ID showing address or signature.',
  proofOfBilling: 'Recent utility bill or billing statement showing your residential address.',
  proofOfFunds: 'Bank certificate (recommended) or statement showing available capital.',
  idPhoto: 'Recent 2x2 portrait photo against a plain white background.',
  dtiSecCert: 'Include if you currently own a registered sole proprietorship or corporation.',
  businessPermit: 'Latest mayor or business permit if you operate an existing business.',
  resumeCv: 'Summary of your professional, management, or operational experience.',
  characterRef: 'Reference letter from a professional, business partner, or lessor.',
  siteProposal: 'Photos, floor plan, or sketch of your proposed branch location.',
};

const FileUploadCard = ({ docKey, label, required, file, onFileSelect, onFileRemove, fileError, onError, saveStatus }) => {
  const feedback = useApplicationFeedback();
  const cardId = 'doc-'+docKey;
  const errors = [...(fileError ? [fileError] : []), ...feedback.errorsFor(cardId)];
  const Icon = DOCUMENT_ICONS[docKey] || BiFile;
  return <div id={cardId} tabIndex={-1} className={'file-upload-wrapper '+(errors.length?'has-errors':'')} aria-describedby={errors.length?cardId+'-error':undefined}>
    <div className={'file-upload-card '+(file?'file-attached':'')}>
      <div className="file-card-top"><div className="file-card-title-group"><span className="document-type-icon"><Icon aria-hidden="true"/></span><h4 className="file-upload-label">{label}</h4></div><RequirementBadge required={required}/></div>
      <p className="file-upload-description">{DOCUMENT_HINTS[docKey]}</p>
      <DocumentPicker docKey={docKey} label={label} file={file} onConfirm={selected=>onFileSelect(docKey,selected)} onRemove={()=>onFileRemove(docKey)} onError={message=>onError(docKey,message)}
        status={saveStatus==='Saved on this device'?'Selected on this device · Saved in this browser · Not uploaded':saveStatus?.startsWith('Save failed')?'Selected on this device · Save failed; keep this page open · Not uploaded':'Selected on this device · Saving not yet confirmed · Not uploaded'} />
    </div><FieldErrorList id={cardId} errors={errors}/>
  </div>;
};

const DocumentUpload = ({ formData, updateField, saveStatus }) => {
  const documents = formData.documents || {};
  const [fileErrors,setFileErrors]=useState({});
  const reportError=(key,message)=>setFileErrors(previous=>({...previous,[key]:message}));

  const handleFileSelect = (docKey, file) => {
    updateField('documents', { ...documents, [docKey]: file });
  };

  const handleFileRemove = (docKey) => {
    const updated = { ...documents };
    delete updated[docKey];
    updateField('documents', updated);
  };

  const uploadedRequiredCount = REQUIRED_DOCUMENTS.filter(
    (doc) => documents[doc.key]
  ).length;

  const uploadedOptionalCount = OPTIONAL_DOCUMENTS.filter(
    (doc) => documents[doc.key]
  ).length;

  const uploadProgress = Math.round(
    (uploadedRequiredCount / REQUIRED_DOCUMENTS.length) * 100
  );

  return (
    <div className="step-content document-step">
      <header className="step-intro">
        <div className="step-intro-icon red" aria-hidden="true">
          <BiFile />
        </div>
        <div className="step-intro-copy">
          <span className="step-eyebrow">Step 07 · Identity &amp; Financial Evidence</span>
          <h2 id="doc-step-title" tabIndex={-1} className="step-intro-title">
            Supporting <span className="title-highlight">Documents</span>
          </h2>
          <p className="step-intro-subtitle">
            Accepted formats: <strong>PDF, JPG, or PNG (ID photo: JPG/PNG only)</strong> (up to <strong>10 MiB</strong> per file). Files selected here are stored locally in your browser draft and are transmitted to the server only when you submit your application.
          </p>
        </div>
      </header>

      <DocumentCaptureGuide />
      {Object.values(fileErrors).some(Boolean)&&<div className="document-error-summary" role="alert"><strong>Check your document selection</strong><ul>{Object.entries(fileErrors).filter(([,message])=>message).map(([key,message])=><li key={key}><a href={'#doc-'+key} onClick={e=>{e.preventDefault();document.getElementById('doc-'+key)?.focus();}}>{APPLICATION_DOCUMENTS.find(doc=>doc.key===key)?.label}: {message}</a></li>)}</ul></div>}
      <section className="form-section">
        <div className="upload-progress-box">
          <div className="upload-progress-header">
            <span className="upload-progress-label">Required Document Readiness</span>
            <span className="upload-progress-count">
              {uploadedRequiredCount} of {REQUIRED_DOCUMENTS.length} required selected
              {uploadedOptionalCount > 0 ? ` · ${uploadedOptionalCount} optional selected` : ''}
            </span>
          </div>
          <div className="upload-progress-track">
            <div
              className="upload-progress-fill"
              style={{ width: `${uploadProgress}%` }}
              role="progressbar"
              aria-valuenow={uploadedRequiredCount}
              aria-valuemin={0}
              aria-valuemax={REQUIRED_DOCUMENTS.length}
              aria-label="Required documents selected"
            />
          </div>

          <div role="status" className="upload-missing-status">
            {uploadedRequiredCount === REQUIRED_DOCUMENTS.length ? (
              <p className="upload-ready-message">
                All required files are selected on this device. They will be sent and checked when you submit in Step 9; this is not reviewer acceptance.
              </p>
            ) : (
              <>
                <p className="upload-missing-heading">Still needed before you can continue:</p>
                <ul className="upload-missing-list">
                  {REQUIRED_DOCUMENTS.filter((doc) => !documents[doc.key]).map((doc) => (
                    <li key={doc.key}><a href={'#doc-'+doc.key} onClick={event=>{event.preventDefault();document.getElementById('doc-'+doc.key)?.focus();}}>{doc.label}</a></li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>

        {/* Required Documents */}
        <div className="document-group">
          <div className="document-group-header">
            <span className="badge-required">Required</span>
            <h3 className="document-group-title">Identity, Address &amp; Financial Evidence (5 Required)</h3>
          </div>

          <div className="upload-grid two-cols">
            {REQUIRED_DOCUMENTS.map((doc) => (
              <FileUploadCard
                key={doc.key}
                docKey={doc.key}
                label={doc.label}
                required={doc.required}
                file={documents[doc.key]}
                onFileSelect={handleFileSelect}
                onFileRemove={handleFileRemove}
                fileError={fileErrors[doc.key]} onError={reportError} saveStatus={saveStatus}
              />
            ))}
          </div>
        </div>

        {/* Optional Documents */}
        <div className="document-group">
          <div className="document-group-header">
            <span className="badge-optional">Optional</span>
            <h3 className="document-group-title">Supplemental Business &amp; Site Records (Optional)</h3>
          </div>

          <div className="upload-grid two-cols">
            {OPTIONAL_DOCUMENTS.map((doc) => (
              <FileUploadCard
                key={doc.key}
                docKey={doc.key}
                label={doc.label}
                required={doc.required}
                file={documents[doc.key]}
                onFileSelect={handleFileSelect}
                onFileRemove={handleFileRemove}
                fileError={fileErrors[doc.key]} onError={reportError} saveStatus={saveStatus}
              />
            ))}
          </div>
        </div>

        <p className="upload-server-notice">
          Selected files may be saved in this browser as part of your draft. They are sent to the server when you submit.
          Avoid shared devices. Never include passwords, bank login details, PINs or one-time codes.
          For proof of funds, a bank certificate is an alternative to a statement. Do not upload extra records unrelated to the requested evidence.
        </p>
      </section>
    </div>
  );
};

export default DocumentUpload;
