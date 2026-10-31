import PageMeta from '../../components/PageMeta';
import './Legal.css';

const PrivacyPolicy = () => (
  <main className="legal-page">
    <PageMeta
      title="Privacy Policy"
      path="/privacy"
      description="Learn how Siomai Street collects, uses, stores, and protects your personal information in compliance with the Philippine Data Privacy Act."
    />
    <div className="legal-container">
      <div className="legal-header">
        <span className="legal-badge">Legal</span>
        <h1>Privacy Policy</h1>
        <p className="legal-updated">Last updated: October 31, 2026</p>
      </div>

      <div className="legal-content">
        <section className="legal-section" id="support-inquiries">
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
            through the connected administration system. Please do not send identity documents,
            payment credentials or private application access codes through this form.
          </p>
          <p>
            Rate limiting uses keyed hashes of the connection IP address and reply email to
            limit repeated attempts. A receipt confirms that your message was saved; it does
            not confirm staff review, a refund or franchise approval. Support contacts, service
            hours and any response target are shown in the homepage contact section only when
            configured. A support-specific retention period and privacy contact must be approved
            and published before online messaging is activated.
          </p>
        </section>

        <section className="legal-section">
          <h2>1. Introduction</h2>
          <p>
            Siomai Street ("we", "our", or "us") is committed to protecting the privacy and
            security of the personal information you provide to us. This Privacy Policy explains
            how we collect, use, store, and disclose your personal data in accordance with the
            Philippine Data Privacy Act of 2012 (Republic Act No. 10173) and its Implementing
            Rules and Regulations.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Information We Collect</h2>
          <p>When you apply for a franchise or interact with our website, we may collect:</p>
          <ul>
            <li><strong>Personal identifiers:</strong> full name, date of birth, citizenship, marital status</li>
            <li><strong>Contact information:</strong> email address, phone number, residential address</li>
            <li><strong>Government-issued IDs:</strong> ID type, ID number, and scanned copies (front and back)</li>
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
            Your personal data is stored securely using industry-standard encryption at rest and
            in transit (TLS/SSL). Documents are stored in private cloud storage buckets with
            access restricted to authorized franchise review personnel only.
          </p>
          <p>
            We retain your application data for up to two (2) years after the date of submission,
            or for the duration of your franchise agreement if approved, after which it is
            securely deleted unless required by law.
          </p>
        </section>

        <section className="legal-section">
          <h2>5. Data Sharing</h2>
          <p>
            The homepage store finder requests device location only when you choose “Use my location”
            and your browser permits it. Coordinates are used in browser memory to calculate approximate
            distances, are not sent to our store-directory server, and are cleared when you leave the
            homepage or choose “Clear my location”. Loading the optional interactive map connects your
            browser to Google Maps, which receives technical information such as your IP address.
            Our distance-sorting feature does not send your coordinates to Google. Opening directions
            takes you to Google Maps, where Google’s own location settings and privacy policy apply.
            See <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google’s Privacy Policy</a>.
          </p>
          <p>We do not sell your personal data. We may share your data with:</p>
          <ul>
            <li>Authorized franchise reviewers and operations staff</li>
            <li>Cloud service providers (for secure data storage and email delivery)</li>
            <li>Government authorities (when required by law or regulation)</li>
          </ul>
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
            Verified privacy-request contact details are pending confirmation. Once published,
            use those details to request access, correction or deletion of your information.
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
            Privacy contact details will be published once confirmed by Siomai Street.
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
  </main>
);

export default PrivacyPolicy;
