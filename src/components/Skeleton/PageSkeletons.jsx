import Skeleton from './Skeleton';
import './Skeleton.css';

/**
 * Menu Page Skeleton:
 * Structural fallback reflecting the Menu page's hero banner,
 * centered editorial intro with quick-jump pills, and plated category carousels.
 */
export function MenuPageSkeleton() {
  return (
    <div className="page-skeleton" role="status" aria-busy="true" aria-label="Loading Menu page…">
      {/* Hero Photography Banner Skeleton */}
      <div className="page-skeleton__hero">
        <Skeleton variant="pill" theme="dark" width={220} height={34} style={{ marginBottom: 12 }} />
        <Skeleton variant="title" theme="dark" width="min(480px, 80vw)" height={56} />
      </div>

      {/* Centered Editorial Intro Skeleton */}
      <div className="page-skeleton__intro">
        <Skeleton variant="circular" width={68} height={68} style={{ marginBottom: 8 }} />
        <Skeleton variant="pill" width={240} height={18} />
        <Skeleton variant="title" width="min(440px, 75vw)" height={40} />
        <Skeleton variant="text" width="min(560px, 90vw)" height={18} />
        <Skeleton variant="text" width="min(480px, 80vw)" height={18} />

        {/* Quick-Jump Pills */}
        <div className="page-skeleton__pills">
          <Skeleton variant="pill" width={140} height={38} />
          <Skeleton variant="pill" width={130} height={38} />
          <Skeleton variant="pill" width={160} height={38} />
          <Skeleton variant="pill" width={140} height={38} />
        </div>
      </div>

      {/* Category Sections & Plate Rows Skeleton */}
      <div className="page-skeleton__sections">
        {[1, 2].map((catIndex) => (
          <div key={catIndex} className="page-skeleton__section">
            <div className="page-skeleton__section-head">
              <Skeleton variant="pill" width={220} height={16} />
              <Skeleton variant="title" width="min(320px, 60vw)" height={32} />
              <Skeleton variant="text" width="min(460px, 75vw)" height={16} />
            </div>

            <div className="page-skeleton__carousel-row">
              {[1, 2, 3].map((cardIndex) => (
                <div key={cardIndex} className="page-skeleton__plate-card">
                  <div className="page-skeleton__plate-disc">
                    <Skeleton variant="circular" width="85%" height="85%" />
                  </div>
                  <Skeleton variant="title" width={180} height={22} />
                  <Skeleton variant="text" width={130} height={15} />
                  <Skeleton variant="pill" width={74} height={26} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Reviews Page Skeleton:
 * Structural fallback for the Reviews catalog with ratings breakdown & review cards.
 */
export function ReviewsPageSkeleton() {
  return (
    <div className="page-skeleton" role="status" aria-busy="true" aria-label="Loading Reviews page…">
      {/* Hero Banner Skeleton */}
      <div className="page-skeleton__hero">
        <Skeleton variant="pill" theme="dark" width={200} height={32} style={{ marginBottom: 10 }} />
        <Skeleton variant="title" theme="dark" width="min(500px, 85vw)" height={52} />
        <Skeleton variant="text" theme="dark" width="min(400px, 70vw)" height={18} />
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '3.5rem 1.5rem 5rem' }}>
        {/* Rating Summary Card Skeleton */}
        <div style={{
          background: '#faf6f0',
          border: '1.5px solid rgba(41, 29, 25, 0.1)',
          borderRadius: 18,
          padding: '2rem',
          marginBottom: '2.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '2rem',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            <Skeleton variant="title" width={100} height={58} />
            <Skeleton variant="pill" width={140} height={20} />
            <Skeleton variant="text" width={110} height={14} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Skeleton variant="text" width={24} height={14} />
                <Skeleton variant="pill" width="100%" height={12} />
                <Skeleton variant="text" width={36} height={14} />
              </div>
            ))}
          </div>
        </div>

        {/* Review Cards Skeleton List */}
        <ReviewCardsSkeleton count={3} />
      </div>
    </div>
  );
}

/**
 * In-Page Review Cards Skeleton
 * Used when switching filter tabs, sorting, or awaiting API data.
 */
export function ReviewCardsSkeleton({ count = 3 }) {
  return (
    <div className="review-skeleton-list" role="status" aria-busy="true" aria-label="Loading reviews…">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="review-skeleton-card">
          <div className="review-skeleton-user">
            <Skeleton variant="circular" width={48} height={48} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Skeleton variant="title" width={140} height={18} />
                <Skeleton variant="pill" width={64} height={16} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Skeleton variant="pill" width={80} height={14} />
                <Skeleton variant="text" width={70} height={12} />
              </div>
            </div>
          </div>
          <Skeleton variant="pill" width={110} height={22} />
          <Skeleton variant="text" width="92%" height={16} />
          <Skeleton variant="text" width="78%" height={16} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
            <Skeleton variant="pill" width={120} height={32} />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Application Multi-Step Portal Skeleton
 */
export function ApplicationPageSkeleton() {
  return (
    <div className="page-skeleton" role="status" aria-busy="true" aria-label="Loading Application…">
      {/* Hero Photography Banner Skeleton */}
      <div className="page-skeleton__hero">
        <Skeleton variant="title" theme="dark" width="min(520px, 85vw)" height={52} />
      </div>

      <div className="app-skeleton-shell">
        <div className="app-skeleton-container">
        {/* Progress Step Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <Skeleton variant="title" width={220} height={34} />
          <Skeleton variant="pill" width={90} height={28} />
        </div>
        <Skeleton variant="pill" width="100%" height={8} />

        {/* Step Card */}
        <div className="app-skeleton-card">
          <Skeleton variant="title" width={280} height={28} />
          <Skeleton variant="text" width="85%" height={16} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.2rem', marginTop: 12 }}>
            <div>
              <Skeleton variant="text" width={100} height={14} style={{ marginBottom: 8 }} />
              <Skeleton variant="rect" width="100%" height={46} style={{ borderRadius: 10 }} />
            </div>
            <div>
              <Skeleton variant="text" width={120} height={14} style={{ marginBottom: 8 }} />
              <Skeleton variant="rect" width="100%" height={46} style={{ borderRadius: 10 }} />
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <Skeleton variant="text" width={140} height={14} style={{ marginBottom: 8 }} />
            <Skeleton variant="rect" width="100%" height={90} style={{ borderRadius: 10 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
            <Skeleton variant="pill" width={110} height={42} />
            <Skeleton variant="pill" width={140} height={42} />
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

/**
 * Store Card Skeletons for Store Finder
 */
export function StoreCardsSkeleton({ count = 3 }) {
  return (
    <div className="store-skeleton-list" role="status" aria-busy="true" aria-label="Loading store locations…">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="store-skeleton-card">
          <Skeleton variant="circular" width={28} height={28} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
            <Skeleton variant="pill" width={80} height={12} />
            <Skeleton variant="title" width={160} height={18} />
            <Skeleton variant="text" width="80%" height={14} />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Default / Legal Page Skeleton
 */
export function DefaultPageSkeleton({ title = 'Loading' }) {
  return (
    <div className="page-skeleton" role="status" aria-busy="true" aria-label={`${title}…`}>
      <div className="page-skeleton__hero">
        <Skeleton variant="title" theme="dark" width="min(380px, 75vw)" height={48} />
      </div>
      <div style={{ maxWidth: 840, margin: '0 auto', padding: '3.5rem 1.5rem 5rem', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Skeleton variant="title" width={240} height={28} />
        <Skeleton variant="text" width="100%" height={16} />
        <Skeleton variant="text" width="94%" height={16} />
        <Skeleton variant="text" width="88%" height={16} />
        <Skeleton variant="title" width={180} height={24} style={{ marginTop: 16 }} />
        <Skeleton variant="text" width="100%" height={16} />
        <Skeleton variant="text" width="90%" height={16} />
      </div>
    </div>
  );
}

