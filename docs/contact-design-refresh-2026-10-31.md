# Contact design refresh — October 31, 2026

- Updated ContactSupport and its direct-contact dialog to warm ivory, charcoal and brand red. Added an editorial split heading, red ruled writing surface, clear selected destinations and narrow-screen stacking.
- FeaturedMenu changes in this pass are restricted to CSS and inline SVG colors (plus the primary-color comment). Its layout, content, images and behavior were preserved.
- Added a validation-backed, clickable five-item checklist when intake is available. Existing errors, disabled-intake handling, independent drafts, safe retries and receipts remain intact.
- Added browser beforeunload protection for unfinished topic/message/location/order drafts and pending requests. This is a browser reload/close warning, not persistent storage or an SPA navigation guard; browsers may suppress it.
- Added phone copying to the direct-contact dialog with independent copied-item feedback.
- No new dependencies, image requests, remote writes or backend activation.

Validation: 19 targeted tests pass (7 experience/render tests and 12 contact API tests). HTTP loopback tests required execution outside the sandbox. Production build and targeted lint passed. Desktop browser screenshot confirmed the new heading and contact surface. Browser click commands timed out, so dialog interaction, enabled-form interactions and mobile layouts were not verified live. Real delivery, staffed queues and configured contacts still require deployment-specific verification.
