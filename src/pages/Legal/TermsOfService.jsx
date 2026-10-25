import PageMeta from '../../components/PageMeta';
import './Legal.css';

const TermsOfService = () => (
  <main className="legal-page">
    <PageMeta
      title="Terms of Service"
      path="/terms"
      description="Terms and conditions for using the Siomai Street website and franchise application."
    />
    <div className="legal-container">
      <div className="legal-header">
        <span className="legal-badge">Legal</span>
        <h1>Terms of Service</h1>
        <p className="legal-updated">Last updated: October 25, 2026</p>
      </div>

      <div className="legal-content">
        <section className="legal-section">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using the Siomai Street website and franchise application system
            ("Service"), you agree to be bound by these Terms of Service. If you do not agree,
            please do not use the Service.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Franchise Application</h2>
          <p>
            Submitting a franchise application does not guarantee approval. All applications
            are subject to review and evaluation by the Siomai Street franchise team.
            We reserve the right to approve, reject, or request additional information for
            any application at our sole discretion.
          </p>
          <p>
            By submitting an application, you certify that all information provided is true,
            accurate, and complete to the best of your knowledge. Providing false or misleading
            information may result in immediate disqualification.
          </p>
        </section>

        <section className="legal-section">
          <h2>3. Intellectual Property</h2>
          <p>
            All content on this website — including the Siomai Street name, logo, brand
            assets, text, images, and design — is the property of Siomai Street and is
            protected by Philippine intellectual property laws. You may not reproduce,
            distribute, or create derivative works without our written consent.
          </p>
        </section>

        <section className="legal-section">
          <h2>4. User Conduct</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Submit fraudulent, misleading, or incomplete applications</li>
            <li>Attempt to access systems or data you are not authorized to access</li>
            <li>Upload files containing malware, viruses, or harmful code</li>
            <li>Use automated scripts or bots to interact with the Service</li>
            <li>Post defamatory, offensive, or spam content in reviews</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>5. Reviews & User Content</h2>
          <p>
            Customer reviews submitted through our platform are subject to moderation.
            We reserve the right to remove reviews that violate our content guidelines,
            are spam, or contain inappropriate material. By posting a review, you grant
            Siomai Street a non-exclusive, royalty-free license to display your review
            on our website and marketing materials.
          </p>
        </section>

        <section className="legal-section">
          <h2>6. Limitation of Liability</h2>
          <p>
            The Service is provided "as is" without warranty of any kind. Siomai Street
            shall not be liable for any indirect, incidental, special, or consequential
            damages arising from your use of the Service. Our total liability to you for
            any claim shall not exceed the amount you paid to use the Service (if any).
          </p>
        </section>

        <section className="legal-section">
          <h2>7. Governing Law</h2>
          <p>
            These Terms are governed by the laws of the Republic of the Philippines.
            Any disputes shall be resolved through the courts of Manila, Philippines.
          </p>
        </section>

        <section className="legal-section">
          <h2>8. Changes to Terms</h2>
          <p>
            We may update these Terms from time to time. Continued use of the Service after
            changes constitutes acceptance of the revised Terms.
          </p>
        </section>

        <section className="legal-section">
          <h2>9. Contact</h2>
          <p>
            For questions about these Terms, contact us at{' '}
            <a href="mailto:franchise@siomaistreet.ph">franchise@siomaistreet.ph</a>.
          </p>
        </section>
      </div>
    </div>
  </main>
);

export default TermsOfService;
