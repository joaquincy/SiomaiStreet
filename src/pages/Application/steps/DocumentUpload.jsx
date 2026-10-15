import { useRef } from 'react';
import {
  BiFile,
  BiUpload,
  BiX,
} from 'react-icons/bi';
import './Steps.css';

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const ALLOWED_EXTENSIONS = '.pdf, .jpg, .jpeg, .png';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const REQUIRED_DOCUMENTS = [
  { key: 'govIdFront', label: 'Valid Government-Issued ID (Front)' },
  { key: 'govIdBack', label: 'Valid Government-Issued ID (Back)' },
  { key: 'proofOfBilling', label: 'Proof of Billing / Address' },
  { key: 'proofOfFunds', label: 'Proof of Funds (bank certificate or statement)' },
  { key: 'idPhoto', label: '2x2 ID Photo (white background, recent)' },
];

const OPTIONAL_DOCUMENTS = [
  { key: 'dtiSecCert', label: 'DTI or SEC Certificate (if business owner)' },
  { key: 'businessPermit', label: 'Business Permit (latest)' },
  { key: 'resumeCv', label: 'Resume or CV' },
  { key: 'characterRef', label: 'Character Reference Letter' },
  { key: 'siteProposal', label: 'Site Proposal or Location Photos' },
];

const FileUploadCard = ({ docKey, label, file, onFileSelect, onFileRemove }) => {
  const inputRef = useRef(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Client-side type validation
    if (!ALLOWED_TYPES.includes(selected.type)) {
      alert(`"${selected.name}" is not an allowed file type. Please upload PDF, JPG, or PNG files only.`);
      e.target.value = '';
      return;
    }

    // Client-side size validation
    if (selected.size > MAX_FILE_SIZE) {
      alert(`"${selected.name}" exceeds the 10MB size limit. Please choose a smaller file.`);
      e.target.value = '';
      return;
    }

    onFileSelect(docKey, selected);
    e.target.value = ''; // Reset so re-selecting the same file triggers onChange
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  if (file) {
    return (
      <div className="file-upload-card file-attached">
        <BiFile className="file-upload-icon attached" />
        <span className="file-upload-label">{label}</span>
        <span className="file-upload-filename">{file.name}</span>
        <span className="file-upload-size">
          {(file.size / 1024).toFixed(0)} KB
        </span>
        <button
          type="button"
          className="file-remove-btn"
          onClick={() => onFileRemove(docKey)}
          aria-label={`Remove ${label}`}
        >
          <BiX />
        </button>
      </div>
    );
  }

  return (
    <div
      className="file-upload-card"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Upload ${label}`}
    >
      <BiUpload className="file-upload-icon" />
      <span className="file-upload-label">{label}</span>
      <span className="file-upload-hint">Click to upload</span>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_EXTENSIONS}
        onChange={handleChange}
        style={{ display: 'none' }}
        aria-hidden="true"
      />
    </div>
  );
};

const DocumentUpload = ({ formData, updateField }) => {
  // Documents stored as { [docKey]: File }
  const documents = formData.documents || {};

  const handleFileSelect = (docKey, file) => {
    updateField('documents', { ...documents, [docKey]: file });
  };

  const handleFileRemove = (docKey) => {
    const updated = { ...documents };
    delete updated[docKey];
    updateField('documents', updated);
  };

  // Count uploaded required documents
  const uploadedRequiredCount = REQUIRED_DOCUMENTS.filter(
    (doc) => documents[doc.key]
  ).length;

  const uploadProgress = Math.round(
    (uploadedRequiredCount / REQUIRED_DOCUMENTS.length) * 100
  );

  return (
    <div className="step-content animate-fade-in">
      <div className="step-header-centered">
        <div className="step-icon-wrapper" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
          <BiFile />
        </div>
        <h2 className="step-title">Show us your vision as a franchise owner</h2>
        <p className="step-subtitle">Accepted formats: PDF, JPG, PNG. Max size per file: 10MB.</p>
      </div>

      <div className="form-section mt-2">
        <h3 className="section-title">
          <BiUpload className="section-icon" /> Upload Your Requirements
        </h3>

        <div className="highlight-box">
          {/* Progress Bar */}
          <div className="upload-progress-box">
            <div className="upload-progress-header">
              <span className="upload-progress-label">Upload Progress</span>
              <span className="upload-progress-count">
                {uploadedRequiredCount} of {REQUIRED_DOCUMENTS.length} required documents selected
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
              ></div>
            </div>
          </div>

          {/* Required Documents */}
          <div className="mt-4">
            <div className="document-group-header">
              <span className="badge-required">REQUIRED</span>
              <span className="document-group-title">Required Documents</span>
            </div>

            <div className="upload-grid two-cols mt-3">
              {REQUIRED_DOCUMENTS.map((doc) => (
                <FileUploadCard
                  key={doc.key}
                  docKey={doc.key}
                  label={doc.label}
                  file={documents[doc.key]}
                  onFileSelect={handleFileSelect}
                  onFileRemove={handleFileRemove}
                />
              ))}
            </div>
          </div>

          {/* Optional Documents */}
          <div className="mt-4 pt-2">
            <div className="document-group-header">
              <span className="badge-optional">OPTIONAL</span>
              <span className="document-group-title">Optional Documents</span>
            </div>

            <div className="upload-grid two-cols mt-3">
              {OPTIONAL_DOCUMENTS.map((doc) => (
                <FileUploadCard
                  key={doc.key}
                  docKey={doc.key}
                  label={doc.label}
                  file={documents[doc.key]}
                  onFileSelect={handleFileSelect}
                  onFileRemove={handleFileRemove}
                />
              ))}
            </div>
          </div>

          <p className="upload-server-notice mt-4">
            Files are selected locally and will be uploaded when online submission is activated.
            They are not stored or transmitted at this time.
          </p>
        </div>
      </div>

    </div>
  );
};

export default DocumentUpload;
