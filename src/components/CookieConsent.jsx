import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './CookieConsent.css';

const CONSENT_KEY = 'cookie_consent';

/**
 * CookieConsent — shows a banner on first visit asking the user
 * to accept or decline non-essential cookies.
 *
 * Choice is stored in localStorage. Only shows once until cleared.
 * Essential cookies (draft storage, CSRF) are always active.
 */
const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Small delay so it doesn't compete with page load animations
    const timer = setTimeout(() => {
      try {
        const consent = localStorage.getItem(CONSENT_KEY);
        if (!consent) setVisible(true);
      } catch {
        // localStorage unavailable — don't show banner
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify({
        essential: true,
        analytics: true,
        acceptedAt: new Date().toISOString(),
      }));
    } catch { /* storage unavailable */ }
    setVisible(false);
  };

  const handleDecline = () => {
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify({
        essential: true,
        analytics: false,
        acceptedAt: new Date().toISOString(),
      }));
    } catch { /* storage unavailable */ }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-label="Cookie consent">
      <div className="cookie-banner-inner">
        <div className="cookie-banner-text">
          <p>
            <strong>🍪 We use cookies</strong> to improve your experience. Essential cookies
            keep the site working (like saving your application draft). We may also use
            analytics cookies to understand how visitors use our site.
          </p>
          <p className="cookie-banner-link">
            Learn more in our <Link to="/cookies">Cookie Policy</Link>.
          </p>
        </div>
        <div className="cookie-banner-actions">
          <button
            type="button"
            className="cookie-btn cookie-btn-accept"
            onClick={handleAccept}
          >
            Accept All
          </button>
          <button
            type="button"
            className="cookie-btn cookie-btn-decline"
            onClick={handleDecline}
          >
            Essential Only
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
