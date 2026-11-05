import PageMeta from '../../components/PageMeta';
import ApplicationPrivacyNotice from '../../components/ApplicationPrivacyNotice';
import { APPLICATION_RETENTION_NOTICE, PRIVACY_CONTACT_EMAIL, PRIVACY_NOTICE_VERSION } from '../../../shared/privacy.js';
import './Legal.css';

const DataNoticePage = ({ embedded = false }) => {
  const Container = embedded ? 'div' : 'main';
  return (
  <Container className={embedded ? 'legal-embedded' : 'legal-page'}>
    {!embedded && <PageMeta
      title="Privacy Policy"
      path="/privacy"
      description="How Siomai Street handles personal information, application retention and privacy requests."
    />}
    <div className="legal-container">
      <div className="legal-header">
        {!embedded && <><span className="legal-badge">Legal</span>
        <h1>Privacy Policy</h1></>}
        <p className="legal-updated">Last updated: November 4, 2026 · Notice {PRIVACY_NOTICE_VERSION}</p>
      </div>

      <div className="legal-content">
        <section className="legal-section" id={embedded ? undefined : 'support-inquiries'}>
          <h2>Homepage support inquiries</h2>
          <p>
            When online messaging is enabled, the contact form sends your name, reply email,
            chosen topic and message to the customer-support or franchise-inquiry queue you
            select. Branch and order details are optional. These details are used to handle
            your inquiry and reply to you; this form does not sign you up for marketing.
          </p>
          <p>
            Unsent answers are not saved as a browser draft. After submission, messages are
            stored in a private database queue with a receipt reference and the version of
            this notice you acknowledged. Access is reserved for authorized support staff
            through the connected administration system or private support tools. Your inquiry
            details are also sent through Resend to the designated support email inbox so staff
            can respond. A private email-queue copy supports reliable delivery and retries;
            support emails are also retained by the receiving email provider. Please do not send identity documents,
            payment credentials or private application access codes through this form.
          </p>
          <p>
            Rate limiting uses keyed hashes of the connection IP address and reply email to
            limit repeated attempts. A receipt confirms that your message was saved; it does
            not confirm staff review, a refund or franchise approval. Support contacts, service
            hours and any response target are shown in the homepage contact section only when
            configured. The application retention rule below does not apply to support inquiries.
            Support inquiries and inbox copies require a separate retention review when the concern
            is resolved. You can request that review through our privacy contact below.
          </p>
        </section>

        <section className="legal-section" id={embedded ? undefined : 'franchise-applications'}>
          <h2>1. Introduction</h2>
          <p>
            Siomai Street ("we", "our", or "us") is committed to protecting the privacy and
            security of the personal information you provide to us. This Privacy Policy explains
            how we collect, use, store, and disclose your personal data in accordance with the
            Philippine Data Privacy Act of 2012 (Republic Act No. 10173) and its Implementing
            Rules and Regulations.
          </p>
          <ApplicationPrivacyNotice compact showPolicyLink={!embedded} />
        </section>

        <section className="legal-section">
          <h2>2. Information We Collect</h2>
          <p>When you apply for a franchise or interact with our website, we may collect:</p>
          <ul>
            <li><strong>Personal identifiers:</strong> full name, date of birth, citizenship, marital status</li>
            <li><strong>Contact information:</strong> email address, phone number, residential address</li>
            <li><strong>Government-issued IDs:</strong> ID type, number and applicable images; a Passport needs its identity page only</li>
            <li><strong>Financial information:</strong> liquid capital, investment sources, proof of funds</li>
            <li><strong>Business background:</strong> employment history, business ownership history</li>
            <li><strong>Documents:</strong> proof of billing, ID photos, business permits, and other uploaded files</li>
            <li><strong>Technical data:</strong> IP address, browser type, and device information (collected automatically)</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>3. How We Use Your Information</h2>
          <p>We use the information you provide to:</p>
          <ul>
            <li>Process and evaluate your franchise application</li>
            <li>Verify your identity and eligibility</li>
            <li>Communicate with you about your application status</li>
            <li>Comply with legal and regulatory obligations</li>
            <li>Improve our franchise application process</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>4. Data Storage & Security</h2>
          <p>
            The website uses Vercel for hosting and Supabase for its database and document storage.
            Documents are held in private storage. The website's document endpoint checks the
            staff member's authenticated identity and reviewer permission, records access and
            issues a short-lived download link. Staff must protect downloaded copies and use
            application information only for their assigned duties.
          </p>
          <p>
            {APPLICATION_RETENTION_NOTICE} The 180-day period allows follow-up and reconsideration
            of a closed application; it is a business retention rule, not a period prescribed by law.
            A hold must state its reason and review date. It must not be used to retain data indefinitely
            without review. Older closed records with no reliable closure date require a staff review
            before a deletion date can be assigned.
          </p>
          <p>
            Deletion removes the application's stored documents, answers, correction and verification
            history, associated upload sessions, document-access entries and related notification
            queue/event copies held by this website. Failed cleanup is retried and is not reported
            as completed. Staff separately reconcile copies in the administration app, inboxes,
            provider records and exports. Backup copies follow the provider's applicable backup
            lifecycle; a restoration must reapply recorded deletions before the data is used again.
            Minimal deletion/replay records and delivery-suppression records are kept separately
            to prevent erased applications being recreated by old retries and prevent unwanted email.
          </p>
          <p>
            Local drafts are different from submitted records: answers and selected files can be
            saved in this browser before submission. They expire seven days after the last save
            and are removed when you next open the application, or after confirmed submission.
            If storage cleanup is blocked, clear this site's browser data on the device. Clearing
            browser data does not erase information already submitted to Siomai Street.
          </p>
        </section>

        <section className="legal-section">
          <h2>5. Data Sharing</h2>
          <p>
            The homepage store finder requests device location only when you choose “Find near me”
            and your browser permits it. Coordinates are used in browser memory to calculate approximate
            distances, are not sent to our store-directory server, and are cleared when you leave the
            homepage or choose “Clear my location”. Loading the optional interactive map connects your
            browser to OpenStreetMap’s tile service, which receives your IP address, website origin
            and requests identifying the map areas you view. Our distance-sorting feature does not
            send your device coordinates to the tile service. See the <a href="https://osmfoundation.org/wiki/Privacy_Policy" target="_blank" rel="noopener noreferrer">OpenStreetMap Foundation Privacy Policy</a>. Opening directions
            takes you to Google Maps, where Google’s own location settings and privacy policy apply.
            See <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google’s Privacy Policy</a>.
          </p>
          <p>
            Worldwide place search sends the address, area or business name you enter to our server
            and Geoapify only when you press Search. Do not enter confidential information. We do
            not store these searches in the application database; a bounded server-memory cache
            reuses matching results for five minutes. Expired entries are removed on the next search
            or when the server process ends. Rate limiting uses pseudonymous identifiers.
            Selecting a result uses its coordinates in this visit to estimate branch distances;
            these are not driving distances. If you open the map, its tile provider receives requests
            for the area displayed. See <a href="https://www.geoapify.com/privacy-policy/" target="_blank" rel="noopener noreferrer">Geoapify’s privacy policy</a>.
          </p>
          <p>
            If you choose Show route, your chosen starting and destination coordinates are sent
            through our server to Geoapify to calculate a driving or walking route. Using your
            device location as the starting point requires your browser permission first; it is
            sent for routing only when you press Show route. We do not save route coordinates in
            our database. Estimates exclude live traffic. Street View opens Google Maps in a
            separate tab and shares the chosen map coordinates with Google.
          </p>
          <p>We do not sell your personal data. We may share your data with:</p>
          <ul>
            <li>Authorized franchise reviewers and operations staff</li>
            <li>Cloud service providers (for secure data storage and email delivery)</li>
            <li>Government authorities (when required by law or regulation)</li>
          </ul>
          <p>
            These services include Vercel, Supabase, Cloudflare Turnstile for abuse prevention,
            and Resend for configured notifications. The administration app also handles application
            review and status notifications. Staff must manage access and retained copies across
            both systems. Providers may process information outside the Philippines under their
            applicable service and data-processing arrangements. Privacy questions about these
            arrangements can be sent to the contact below.
          </p>
        </section>

        <section className="legal-section">
          <h2>6. Your Rights</h2>
          <p>Under the Data Privacy Act of 2012, you have the right to:</p>
          <ul>
            <li><strong>Access</strong> — request a copy of your personal data we hold</li>
            <li><strong>Correction</strong> — request correction of inaccurate or incomplete data</li>
            <li><strong>Erasure</strong> — request deletion of your personal data, subject to legal retention requirements</li>
            <li><strong>Object</strong> — object to the processing of your data under certain conditions</li>
            <li><strong>Data portability</strong> — receive your data in a structured, machine-readable format</li>
          </ul>
          <p>
            Email <a href={`mailto:${PRIVACY_CONTACT_EMAIL}`}>{PRIVACY_CONTACT_EMAIL}</a> with
            your request type and application or inquiry reference, if available. Use the email
            associated with your submission where possible. Do not send ID images, full financial
            documents, passwords or private access codes. We will verify the request through a
            proportionate check before releasing or changing information; knowing a reference
            alone is not proof of identity.
          </p>
          <p>
            The privacy handler records and acknowledges the request, confirms its scope, verifies
            the requester and coordinates with authorized reviewers. Access requests are fulfilled
            through an agreed secure channel. Corrections are checked and propagated to relevant
            records. Objections and consent withdrawal are reviewed against the purpose and lawful
            basis for the processing. Deletion requests are checked for justified retention or legal
            holds. We explain the outcome, any limitation and any follow-up needed. A deletion
            request does not automatically cancel a legal retention obligation or erase another
            person's records. You may raise unresolved concerns with the National Privacy Commission.
          </p>
        </section>

        <section className="legal-section">
          <h2>7. Cookies</h2>
          <p>
            We use essential cookies to maintain site functionality. For details on all cookies
            used, please see our <a href="/cookies">Cookie Policy</a>.
          </p>
        </section>

        <section className="legal-section">
          <h2>8. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Significant changes will be
            communicated via our website. The "Last updated" date at the top of this policy
            reflects the most recent revision.
          </p>
        </section>

        <section className="legal-section">
          <h2>9. Contact Us</h2>
          <p>
            Siomai Street privacy requests are monitored by the website operator at{' '}
            <a href={`mailto:${PRIVACY_CONTACT_EMAIL}`}>{PRIVACY_CONTACT_EMAIL}</a>.
            This contact coordinates requests with the owner and authorized application reviewers.
          </p>
          <p>
            For available customer and franchise support channels, visit the{' '}
            <a href="/#contact">homepage contact section</a>.
          </p>
          <p>
            You may also file a complaint with the National Privacy Commission at{' '}
            <a href="https://www.privacy.gov.ph" target="_blank" rel="noopener noreferrer">
              www.privacy.gov.ph
            </a>.
          </p>
        </section>
      </div>
    </div>
  </Container>
);
};

export default DataNoticePage;
