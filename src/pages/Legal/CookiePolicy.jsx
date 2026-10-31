import PageMeta from '../../components/PageMeta';
import './Legal.css';

const CookiePolicy = () => (
  <main className="legal-page">
    <PageMeta
      title="Cookie Policy"
      path="/cookies"
      description="Learn about the cookies used on the Siomai Street website, their purpose, and how to manage your preferences."
    />
    <div className="legal-container">
      <div className="legal-header">
        <span className="legal-badge">Legal</span>
        <h1>Cookie Policy</h1>
        <p className="legal-updated">Last updated: October 31, 2026</p>
      </div>

      <div className="legal-content">
        <section className="legal-section">
          <h2>1. What Are Cookies?</h2>
          <p>
            Cookies are small text files stored on your device when you visit a website.
            They help the site remember your preferences and improve your experience.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Cookies We Use</h2>
          <div className="legal-table-wrapper">
            <table className="legal-table">
              <thead>
                <tr>
                  <th>Cookie Name</th>
                  <th>Purpose</th>
                  <th>Type</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>cookie_consent</code></td>
                  <td>Stores your cookie consent preference</td>
                  <td>Essential</td>
                  <td>1 year</td>
                </tr>
                <tr>
                  <td><code>siomai-street-franchise-draft-v1</code></td>
                  <td>Auto-saves franchise application draft (localStorage)</td>
                  <td>Essential / Functional</td>
                  <td>Until cleared</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="legal-note">
            Note: The franchise application draft is stored in your browser's local storage
            and IndexedDB, not as traditional cookies. It never leaves your device until
            you submit the application.
          </p>
        </section>

        <section className="legal-section">
          <h2>3. Third-Party Cookies</h2>
          <p>
            The optional store map loads Google Maps only after you choose “Explore the map”.
            Google may process technical information and use its own storage technologies under
            its privacy policy. You can use the store list without loading the map.
            Store search and distance sorting do not save your location in cookies or browser storage.
          </p>
          <p>
            We may use the following third-party services that set their own cookies:
          </p>
          <div className="legal-table-wrapper">
            <table className="legal-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Purpose</th>
                  <th>More Info</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Cloudflare Turnstile</td>
                  <td>Bot protection on forms</td>
                  <td>
                    <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer">
                      Cloudflare Privacy
                    </a>
                  </td>
                </tr>
                <tr>
                  <td>Google Fonts</td>
                  <td>Web font delivery</td>
                  <td>
                    <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
                      Google Privacy
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="legal-section">
          <h2>4. Managing Cookies</h2>
          <p>
            You can control cookies through your browser settings. Most browsers allow you to:
          </p>
          <ul>
            <li>View and delete existing cookies</li>
            <li>Block all or specific cookies</li>
            <li>Set preferences for certain websites</li>
          </ul>
          <p>
            Please note that blocking essential cookies may affect the functionality of our
            franchise application system, including the ability to save drafts.
          </p>
        </section>

        <section className="legal-section">
          <h2>5. Changes to This Policy</h2>
          <p>
            We may update this Cookie Policy as we add new features or services. The "Last
            updated" date reflects the most recent revision.
          </p>
        </section>

        <section className="legal-section">
          <h2>6. Contact</h2>
          <p>
            For questions about our use of cookies, contact us at{' '}
            <a href="mailto:privacy@siomaistreet.ph">privacy@siomaistreet.ph</a>.
          </p>
        </section>
      </div>
    </div>
  </main>
);

export default CookiePolicy;
