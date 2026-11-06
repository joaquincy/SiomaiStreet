import { APPLICATION_RETENTION_NOTICE, PRIVACY_CONTACT_EMAIL } from '../../shared/privacy.js';
import './ApplicationNotices.css';

function NoticeSection({ title, compact, children }) {
  return compact ? children : <div className="application-privacy-section"><h4>{title}</h4>{children}</div>;
}

// Reused before data entry and beside the existing processing acknowledgement.
export default function ApplicationPrivacyNotice({ compact = false, showPolicyLink = true }) {
  return <div className="application-privacy-notice">
    <NoticeSection title="Why we collect it" compact={compact}>
    <p>Siomai Street uses the contact, identity, business and financial details and documents you provide to assess your franchise application, verify supporting information and communicate the outcome. Submitting does not create a franchise contract or sign you up for marketing.</p>
    </NoticeSection>
    {!compact && <>
      <NoticeSection title="Who can access it">
      <p>Assigned franchise reviewers use the administration app. Document access through this website requires an authorized staff account and is logged. Hosting, database/storage, anti-abuse and notification providers process the information needed to deliver those services.</p>
      </NoticeSection>
      <NoticeSection title="On-device processing">
      <p>Your browser may check photo quality (brightness, blur, resolution) and optionally read text from your ID photo to suggest details for you to confirm. These automated checks run on your device without sending your photo to an OCR or image-analysis service. The guided camera opens only when you choose it and allow access. You can use an existing photo or type your details manually. Confirmed documents are uploaded when you submit your application and become available to authorized reviewers.</p>
      </NoticeSection>
      <NoticeSection title="Drafts on this device">
      <p>Draft answers and selected files may be saved on this device before submission. They expire seven days after the last save and are removed when you next open the application, or after confirmed submission. If cleanup fails, files may remain until you clear this site's browser data. Clearing browser data does not delete a submitted application.</p>
      </NoticeSection>
      <NoticeSection title="Retention and deletion">
      <p>{APPLICATION_RETENTION_NOTICE} Deletion covers website records, documents and associated queue/history copies. Staff handle copies in inboxes, exports, other systems and backup procedures separately; a privacy request is not marked fully erased until those checks are completed.</p>
      </NoticeSection>
    </>}
    <NoticeSection title="Your privacy requests" compact={compact}>
    <p>For access, correction, objection, withdrawal of consent or deletion requests, email <a href={`mailto:${PRIVACY_CONTACT_EMAIL}`}>{PRIVACY_CONTACT_EMAIL}</a>. Include your application reference if available and the action you want. Do not email ID images, financial documents, passwords or your private access code. We verify requests before disclosing or changing data and explain any justified limit or retention exception.{showPolicyLink && <> Read the <a href="/privacy#franchise-applications" target="_blank" rel="noopener noreferrer">Privacy Policy (opens in a new tab)</a>.</>}</p>
    </NoticeSection>
  </div>;
}
