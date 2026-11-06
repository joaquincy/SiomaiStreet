import { useEffect, useState } from 'react';
import { documentFingerprint } from '../../../utils/documentFingerprint.js';
import { duplicateIdSides, DUPLICATE_ID_MESSAGE } from '../../../../shared/applicationQuality.js';
import { BiFile, BiIdCard, BiMap, BiReceipt, BiUser, BiWallet, BiShield } from 'react-icons/bi';
import './Steps.css';
import { getApplicationDocuments } from '../../../../shared/application.js';
import { ApplicationField, RequirementBadge, FieldErrorList } from '../../../components/ApplicationField';
import { DOCUMENT_POLICY, DOCUMENT_POLICY_VERSION, DOCUMENT_RECENCY_NOTICE, DOCUMENT_REDACTION_NOTICE, ADDRESS_EVIDENCE_OPTIONS, FUNDS_EVIDENCE_OPTIONS, needsAddressExplanation, canDeferFundsEvidence } from '../../../../shared/documentPolicy.js';
import { useApplicationFeedback } from '../../../components/applicationFeedbackContext';
import DocumentPicker from '../../../components/DocumentPicker';
import DocumentCaptureGuide from '../../../components/DocumentCaptureGuide';
import OcrAutofill from '../../../components/OcrAutofill';
import ApplicationDisclosure from '../../../components/ApplicationDisclosure';
import './DocumentUpload.css';
const DOCUMENT_ICONS = { govIdFront: BiIdCard, govIdBack: BiIdCard, proofOfBilling: BiReceipt, proofOfFunds: BiWallet, idPhoto: BiUser, siteProposal: BiMap };

const DOCUMENT_HINTS = {
  govIdFront: 'Clear photo or scan showing your full name, photo, and ID number.',
  govIdBack: 'Back side of the same valid government ID showing address or signature.',
  proofOfBilling: 'Address evidence with the issuer, relevant holder name, address and date or period visible.',
  proofOfFunds: 'Evidence of available funds or a clearly identified pending funding arrangement.',
  idPhoto: 'A 2x2 portrait against a plain white background that reflects your current appearance.',
  dtiSecCert: 'Include if you currently own a registered sole proprietorship or corporation.',
  businessPermit: 'Latest mayor or business permit if you operate an existing business.',
  resumeCv: 'Summary of your professional, management, or operational experience.',
  characterRef: 'Reference letter from a professional, business partner, or lessor.',
  siteProposal: 'Photos, floor plan, or sketch of your proposed branch location.',
};

const FileUploadCard = ({ docKey, label, required, deferred, hint, file, onFileSelect, onFileRemove, fileError, onError, saveStatus, children }) => {
  const feedback = useApplicationFeedback();
  const cardId = 'doc-'+docKey;
  const errors = [...(fileError ? [fileError] : []), ...feedback.errorsFor(cardId)];
  const Icon = DOCUMENT_ICONS[docKey] || BiFile;
  return <div id={cardId} tabIndex={-1} className={'file-upload-wrapper '+(errors.length?'has-errors':'')} aria-describedby={errors.length?cardId+'-error':undefined}>
    <div className={'file-upload-card '+(file?'file-attached':'')}>
      <div className="file-card-top"><div className="file-card-title-group"><span className="document-type-icon"><Icon aria-hidden="true"/></span><h4 className="file-upload-label">{label}</h4></div><RequirementBadge required={required} conditional={deferred ? 'Deferred until verification' : undefined}/></div>
      <p className="file-upload-description">{hint || DOCUMENT_HINTS[docKey]}</p>
      <ApplicationDisclosure title="Purpose, pages & alternatives" compact>
        <p><strong>Purpose:</strong> {DOCUMENT_POLICY[docKey].purpose}</p><p><strong>When:</strong> {DOCUMENT_POLICY[docKey].stage}</p>
        <p><strong>Include:</strong> {DOCUMENT_POLICY[docKey].pages}</p><p><strong>Alternatives:</strong> {DOCUMENT_POLICY[docKey].alternatives}</p>
      </ApplicationDisclosure>
      <DocumentPicker docKey={docKey} label={label} file={file} onConfirm={selected=>onFileSelect(docKey,selected)} onRemove={()=>onFileRemove(docKey)} onError={message=>onError(docKey,message)}
        status={saveStatus==='Saved on this device'?'Selected on this device · Saved in this browser · Submit to upload or retry':saveStatus?.startsWith('Save failed')?'Selected on this device · Save failed; keep this page open · Submit to upload or retry':'Selected on this device · Saving not yet confirmed · Submit to upload or retry'} />
      {children}
    </div><FieldErrorList id={cardId} errors={errors}/>
  </div>;
};

const DocumentUpload = ({ formData, updateField, saveStatus }) => {
  const applicableDocuments = getApplicationDocuments(formData);
  const REQUIRED_DOCUMENTS = applicableDocuments.filter(doc => doc.required);
  const OPTIONAL_DOCUMENTS = applicableDocuments.filter(doc => !doc.required);
  const documents = formData.documents || {};
  const [fileErrors,setFileErrors]=useState({});
  const [idSidesError, setIdSidesError] = useState('');
  const visibleFileErrors = { ...fileErrors, govIdBack: [fileErrors.govIdBack, idSidesError].filter(Boolean).join(' ') };
  const applicableFileErrors = Object.entries(visibleFileErrors).filter(([key, message]) => message && applicableDocuments.some(doc => doc.key === key));
  const reportError=(key,message)=>setFileErrors(previous=>({...previous,[key]:message}));
  useEffect(() => {
    let active = true;
    const check = async () => {
      let message = '';
      if (formData.govIdType !== 'Passport' && documents.govIdFront && documents.govIdBack && documents.govIdFront.size === documents.govIdBack.size) {
        try {
          const front = await documentFingerprint(documents.govIdFront);
          const back = await documentFingerprint(documents.govIdBack);
          if (duplicateIdSides({ govIdType: formData.govIdType }, { govIdFront: front, govIdBack: back })) message = DUPLICATE_ID_MESSAGE;
        } catch { message = 'Could not compare the ID sides. Keep your files selected and retry before submitting.'; }
      }
      if (active) setIdSidesError(message);
    };
    check();
    return () => { active = false; };
  }, [documents.govIdFront, documents.govIdBack, formData.govIdType]);

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
            Accepted formats: <strong>PDF, JPG, or PNG (ID photo: JPG/PNG only)</strong> (up to <strong>10 MiB</strong> per file). File transfer starts when you submit your application. Interrupted uploads may remain temporarily in private storage for safe retry; submission is confirmed only when you receive a receipt.
          </p>
        </div>
      </header>

      <DocumentCaptureGuide />
      <ApplicationDisclosure title="Document policy: privacy, dates & review" hint="What to include, what you can redact and how review works." icon={BiShield}>
        <div><h4>Submission and review</h4><p>Policy {DOCUMENT_POLICY_VERSION}. These options allow submission for manual review; they do not establish document authenticity, sufficient funding or franchise approval.</p></div>
        <div><h4>Protect unrelated information</h4><p>{DOCUMENT_REDACTION_NOTICE}</p><p>Use a redaction tool that permanently removes the hidden content. Reopen your exported file and check that hidden text cannot be selected or copied. The website does not automatically redact files.</p></div>
        <div><h4>Document dates</h4><p>{DOCUMENT_RECENCY_NOTICE}</p></div>
        <div><h4>Later document requests</h4><p>Later verification and onboarding documents must be requested with a specific purpose through your private status page. Do not send extra records by public link or ordinary chat.</p></div>
      </ApplicationDisclosure>
      <section className="form-section">
        <h3 className="section-title">Choose evidence that matches your situation</h3>
        <ApplicationField id="doc-addressEvidenceType" label="Which address document are you providing?" required
          options={ADDRESS_EVIDENCE_OPTIONS.map(option => option.label)} value={ADDRESS_EVIDENCE_OPTIONS.find(option => option.value === formData.addressEvidenceType)?.label}
          onChange={value => updateField('addressEvidenceType', ADDRESS_EVIDENCE_OPTIONS.find(option => option.label === value).value)}
          hint="The address must relate to your declared residence. A bill need not be in your name if you explain the relationship and occupancy for review." />
        {needsAddressExplanation(formData) && <ApplicationField id="doc-addressEvidenceDetails" name="addressEvidenceDetails" type="textarea" label="Explain how this document supports your address" required maxLength={1000}
          value={formData.addressEvidenceDetails} onChange={value => updateField('addressEvidenceDetails', value)}
          hint="For a parent/spouse/landlord bill, state your relationship and why it covers your residence. For another document, identify it and its issuer. Do not include third-party ID numbers or copies." />}
        <ApplicationField id="doc-fundsEvidenceType" label="Which funding evidence can you provide now?" required
          options={FUNDS_EVIDENCE_OPTIONS.map(option => option.label)} value={FUNDS_EVIDENCE_OPTIONS.find(option => option.value === formData.fundsEvidenceType)?.label}
          onChange={value => updateField('fundsEvidenceType', FUNDS_EVIDENCE_OPTIONS.find(option => option.label === value).value)}
          hint="Use a certificate or the relevant balance page instead of full transaction history. A financing offer or commitment is evidence of a plan, not released cash. Pending choices must match Step 4." />
        {formData.fundsEvidenceType === 'other' && <ApplicationField id="doc-fundsEvidenceDetails" name="fundsEvidenceDetails" type="textarea" label="Explain your funding evidence" required maxLength={1000}
          value={formData.fundsEvidenceDetails} onChange={value => updateField('fundsEvidenceDetails', value)} hint="Identify the document and what it demonstrates. Keep account numbers and unrelated transactions out of this explanation." />}
        {canDeferFundsEvidence(formData) && <p className="field-help" role="status">Funding evidence deferred. Your Step 4 explanation will accompany the application. Do not upload a dummy file. A reviewer must request evidence privately and verify funding before approval.</p>}
      </section>
      {applicableFileErrors.length > 0&&<div className="document-error-summary" role="alert"><strong>Check your document selection</strong><ul>{applicableFileErrors.map(([key,message])=><li key={key}><a href={'#doc-'+key} onClick={e=>{e.preventDefault();document.getElementById('doc-'+key)?.focus();}}>{applicableDocuments.find(doc=>doc.key===key)?.label}: {message}</a></li>)}</ul></div>}
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
                All files required for initial submission are selected on this device. They will be sent and checked when you submit in Step 9; this is not reviewer acceptance or completion of any deferred verification.
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
            <h3 className="document-group-title">Identity, Address &amp; Financial Evidence ({REQUIRED_DOCUMENTS.length} Required)</h3>
          </div>

          {formData.govIdType === 'Passport' && <p className="field-help">Passport selected: upload the identity page showing your photo, full name and passport number. No back image is required.</p>}

          <div className="upload-grid two-cols">
            {REQUIRED_DOCUMENTS.map((doc) => (
              <FileUploadCard
                key={doc.key}
                docKey={doc.key}
                label={doc.label}
                required={doc.required}
                hint={doc.key === 'govIdFront' && formData.govIdType === 'Passport' ? 'Clear photo or scan of your passport identity page. Keep all four corners and identity details readable.' : doc.key === 'govIdBack' && formData.govIdType === 'PhilID (National ID)' ? 'Photograph the reverse side and permanently cover the private 12-digit PSN. The reviewer uses the PCN from the front.' : undefined}
                file={documents[doc.key]}
                onFileSelect={handleFileSelect}
                onFileRemove={handleFileRemove}
                fileError={visibleFileErrors[doc.key]} onError={reportError} saveStatus={saveStatus}
              >
                {doc.key === 'govIdFront' && documents.govIdFront && (
                  <OcrAutofill file={documents.govIdFront} formData={formData} updateField={updateField} />
                )}
              </FileUploadCard>
            ))}
          </div>
        </div>

        {/* Optional Documents */}
        <div className="document-group">
          <div className="document-group-header">
            <span className="badge-optional">{canDeferFundsEvidence(formData) ? 'Later or optional' : 'Optional'}</span>
            <h3 className="document-group-title">Additional Evidence &amp; Business Records</h3>
          </div>

          <div className="upload-grid two-cols">
            {OPTIONAL_DOCUMENTS.map((doc) => (
              <FileUploadCard
                key={doc.key}
                docKey={doc.key}
                label={doc.label}
                required={doc.required}
                deferred={doc.deferred}
                hint={doc.deferred ? 'Not required for initial submission while funding evidence is pending. If you have evidence now, select its type above before attaching it.' : undefined}
                file={documents[doc.key]}
                onFileSelect={handleFileSelect}
                onFileRemove={handleFileRemove}
                fileError={visibleFileErrors[doc.key]} onError={reportError} saveStatus={saveStatus}
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
