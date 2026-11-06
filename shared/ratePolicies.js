// Public policy values, shared by server enforcement and browser feedback.
// Limits are never accepted from an HTTP request or client-supplied headers.
const rule = (limit, windowSeconds = 3600) => Object.freeze({ limit, windowSeconds });
export const RATE_POLICIES = Object.freeze({
  'email-ingress': rule(20, 300),
  'email-send': rule(5),
  'email-recipient': rule(5),
  'upload-start-burst': rule(5, 300),
  'upload-start': rule(20),
  'new-application': rule(4),
  'new-correction': rule(20),
  'upload-control': rule(100),
  portal: rule(60),
  'portal-write': rule(5, 300),
  'staff-documents': rule(100),
  'contact-ingress': rule(20),
  'contact-new': rule(5),
  'review-submit': rule(8),
  'review-helpful': rule(60),
  'place-search-client': rule(20),
  'route-client': rule(20),
  'place-search-global': rule(80),
  ingress: rule(20), // Retired multipart consumer retained for compatibility.
});
export const policyScopes = scope => scope === 'upload-start' ? ['upload-start-burst', scope] : [scope];
