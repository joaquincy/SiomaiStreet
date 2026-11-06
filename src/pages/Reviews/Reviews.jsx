import { useState, useEffect, useRef } from 'react';
import { submitReview } from '../../api/reviewSubmission.js';
import { BiCamera, BiChevronDown, BiStoreAlt, BiCheck, BiSearch } from 'react-icons/bi';
import HelpfulButton from './HelpfulButton';
import { FaStar, FaStarHalfAlt, FaRegStar } from 'react-icons/fa';
import { RiVerifiedBadgeFill } from 'react-icons/ri';
import PageMeta from '../../components/PageMeta';
import { getSrcSet } from '../../utils/responsiveImage';
import { ReviewCardsSkeleton } from '../../components/Skeleton';
import './Reviews.css';


const StarRating = ({ rating, size = 16 }) => (
  <span className="cfb-star-row" style={{ fontSize: size }}>
    {[1, 2, 3, 4, 5].map((s) => {
      if (rating >= s) return <FaStar key={s} className="cfb-star filled" />;
      if (rating >= s - 0.5) return <FaStarHalfAlt key={s} className="cfb-star filled" />;
      return <FaRegStar key={s} className="cfb-star empty" />;
    })}
  </span>
);


const BranchPicker = ({ branches, selectedBranchId, onSelect, disabled }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef(null);
  const searchInputRef = useRef(null);

  const selectedBranch = branches.find((b) => String(b.branch_id) === String(selectedBranchId));

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [open]);

  const filtered = branches.filter((b) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (b.branch_name && b.branch_name.toLowerCase().includes(q)) ||
      (b.branch_address && b.branch_address.toLowerCase().includes(q))
    );
  });

  return (
    <div className={`branch-picker-wrapper ${open ? 'is-open' : ''}`} ref={wrapperRef}>
      <button
        type="button"
        id="cfb-review-branch-btn"
        className={`branch-picker-trigger ${!selectedBranch ? 'is-placeholder' : ''} ${open ? 'is-active' : ''}`}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        disabled={disabled || branches.length === 0}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="branch-picker-trigger-icon" aria-hidden="true">
          <BiStoreAlt />
        </span>
        <span className="branch-picker-trigger-text">
          {selectedBranch ? (
            <span className="branch-picker-selected-label">
              <strong>{selectedBranch.branch_name}</strong>
              {selectedBranch.branch_address ? <small> — {selectedBranch.branch_address}</small> : null}
            </span>
          ) : (
            branches.length ? 'Choose an active branch' : 'No active branches available'
          )}
        </span>
        <span className="branch-picker-chevron-box" aria-hidden="true">
          <BiChevronDown className={`branch-picker-chevron ${open ? 'open' : ''}`} />
        </span>
      </button>

      {/* Hidden native select for form validation, accessibility, and test compatibility */}
      <select
        id="cfb-review-branch"
        name="branchId"
        value={selectedBranchId}
        onChange={(e) => onSelect(e.target.value)}
        required
        tabIndex={-1}
        aria-hidden="true"
        style={{
          position: 'absolute',
          opacity: 0,
          pointerEvents: 'none',
          height: 0,
          width: 0,
          margin: 0,
          padding: 0,
        }}
      >
        <option value="">Choose an active branch</option>
        {branches.map((branch) => (
          <option key={branch.branch_id} value={branch.branch_id}>
            {branch.branch_name}{branch.branch_address ? ` — ${branch.branch_address}` : ''}
          </option>
        ))}
      </select>

      {open && (
        <div className="branch-picker-popover" role="listbox">
          {branches.length > 4 && (
            <div className="branch-picker-search-bar">
              <BiSearch className="branch-picker-search-icon" aria-hidden="true" />
              <input
                ref={searchInputRef}
                type="text"
                className="branch-picker-search-input"
                placeholder="Search branch name or city…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
          <ul className="branch-picker-options">
            {filtered.length > 0 ? (
              filtered.map((branch) => {
                const isSelected = String(branch.branch_id) === String(selectedBranchId);
                return (
                  <li
                    key={branch.branch_id}
                    role="option"
                    aria-selected={isSelected}
                    className={`branch-picker-option ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => {
                      onSelect(branch.branch_id);
                      setOpen(false);
                      setSearch('');
                    }}
                  >
                    <div className="branch-picker-option-details">
                      <span className="branch-picker-option-name">{branch.branch_name}</span>
                      {branch.branch_address && (
                        <span className="branch-picker-option-address">{branch.branch_address}</span>
                      )}
                    </div>
                    {isSelected && (
                      <span className="branch-picker-check" aria-hidden="true">
                        <BiCheck />
                      </span>
                    )}
                  </li>
                );
              })
            ) : (
              <li className="branch-picker-empty">No matching branches found</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

const ReviewsPage = () => {
  const [reviews, setReviews] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [sort, setSort] = useState('Newest First');
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [form, setForm] = useState({ name: '', text: '', photo: null });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitPhase, setSubmitPhase] = useState('');
  const submissionRef = useRef(null);
  const successTimer = useRef(null);
  const [submitError, setSubmitError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  // Track object URLs so they can be revoked to prevent memory leaks
  const objectUrlsRef = useRef([]);

  // Fetch reviews and branches from the backend API on mount
  useEffect(() => {
    let active = true;
    Promise.all([
      fetch('/api/reviews').then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not load reviews.');
        if (active && Array.isArray(result)) setReviews(result);
      }),
      fetch('/api/branches').then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not load branches.');
        if (active && result.branches) setBranches(result.branches);
      }),
    ]).catch(() => {
      if (active) setLoadError('Live reviews or branch locations are temporarily unavailable.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  // Revoke all object URLs created during this component's lifetime
  useEffect(() => {
    return () => {
      submissionRef.current?.abort();
      clearTimeout(successTimer.current);
      objectUrlsRef.current.forEach((url) => {
        try { URL.revokeObjectURL(url); } catch { /* already revoked */ }
      });
      objectUrlsRef.current = [];
    };
  }, []);

  const ratingBreakdown = [5, 4, 3, 2, 1].map((stars) => {
    const count = reviews.filter((r) => Math.round(r.rating) === stars).length;
    const percent = reviews.length ? Math.round((count / reviews.length) * 100) : 0;
    return { stars, percent };
  });

  const sortedReviews = [...reviews].sort((a, b) => {
    if (sort === 'Highest Rated') return b.rating - a.rating;
    if (sort === 'Lowest Rated') return a.rating - b.rating;
    if (sort === 'Most Helpful') return b.helpful - a.helpful;
    if (a.created_at && b.created_at) return new Date(b.created_at) - new Date(a.created_at);
    return Number(b.id) - Number(a.id);
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submissionRef.current) return;
    if (!selectedRating || !selectedBranchId || !form.name.trim() || !form.text.trim()) return;
    const controller = new AbortController();
    submissionRef.current = controller;
    clearTimeout(successTimer.current);
    setSubmitted(false);
    setSubmitting(true);
    setSubmitError('');
    try {
      await submitReview({ ...form, rating: selectedRating, branchId: selectedBranchId, signal: controller.signal, onPhase: setSubmitPhase });
      if (controller.signal.aborted) return;
      setForm({ name: '', text: '', photo: null });
      setSelectedRating(0);
      setSubmitted(true);
      successTimer.current = setTimeout(() => setSubmitted(false), 5000);
    } catch (error) {
      if (!controller.signal.aborted) setSubmitError(error.message || 'Your review could not be submitted.');
    } finally {
      if (submissionRef.current === controller) submissionRef.current = null;
      if (!controller.signal.aborted) { setSubmitting(false); setSubmitPhase(''); }
    }
  };

  const avgRating = reviews.length
    ? (reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length).toFixed(1)
    : '—';

  return (
    <main className="cfb-page">
      <PageMeta
        title="Reviews"
        path="/reviews"
        description="Read real customer reviews of Siomai Street. See ratings, photos, and feedback from our community of siomai lovers."
      />
      {/* ── Hero Photography Banner (Matching Menu & Application Page Hero Style) ── */}
      <section className="reviews-banner">
        <img
          className="reviews-banner__bg"
          src="/images/reviews%20hero%20header.png"
          srcSet={getSrcSet('/images/reviews hero header.png', [480, 768, 1024, 1440, 1920])}
          sizes="100vw"
          alt="Siomai Street customer reviews and dining experience"
          width="2048"
          height="768"
          fetchPriority="high"
        />
        <div className="reviews-banner__scrim" aria-hidden="true" />
        <div className="reviews-banner__content">
          <h1 className="reviews-banner__title">
            Customer <em>Reviews</em>
          </h1>
        </div>
      </section>

      {/* ── 2. Soft Steamed Cream Canvas with Authentic Paper Grain ── */}
      <div className="cfb-canvas">
        {/* Section Intro Header — Unified with Homepage & Menu Headers */}
        <div className="cfb-intro">
          <span className="cfb-kicker">
            <span className="cfb-kicker-line" aria-hidden="true" />
            COMMUNITY VOICES // REAL EXPERIENCES
            <span className="cfb-kicker-line" aria-hidden="true" />
          </span>
          <h2 className="cfb-intro-title">
            Loved Across Every <em>Neighborhood</em>
          </h2>
          <p className="cfb-intro-lead">
            Authentic feedback from dim sum lovers across 45+ locations. Pure meat, zero extenders, slow-simmered chili garlic oil, and service that keeps regulars coming back daily.
          </p>
        </div>

        <div className="cfb-layout">
          {/* ── Left Sidebar ── */}
          <aside className="cfb-sidebar">

            {/* Overall Rating Card */}
            <div className="cfb-card cfb-overall">
              <div className="cfb-overall-header">
                <FaStar className="cfb-overall-star-icon" />
                <span className="cfb-overall-label">Overall Rating</span>
              </div>
              <div className="cfb-overall-score">
                <span className="cfb-score-big">{avgRating}</span>
                <div className="cfb-score-details">
                  <StarRating rating={parseFloat(avgRating)} size={18} />
                  <span className="cfb-verified-count">{reviews.length} PUBLISHED REVIEWS</span>
                </div>
              </div>
              <div className="cfb-breakdown">
                {ratingBreakdown.map(({ stars, percent }) => (
                  <div className="cfb-bar-row" key={stars}>
                    <span className="cfb-bar-label">{stars}</span>
                    <FaStar className="cfb-bar-star" />
                    <div className="cfb-bar-track">
                      <div
                        className="cfb-bar-fill"
                        style={{ width: `${percent}%`, opacity: percent === 0 ? 0.25 : 1 }}
                      />
                    </div>
                    <span className="cfb-bar-pct">{percent}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Share Your Experience Form */}
            <div className="cfb-card cfb-form-card">
              <div className="cfb-form-header">
                <span className="cfb-form-icon">💬</span>
                <h3 className="cfb-form-title">
                  Share Your <em>Experience</em>
                </h3>
              </div>
              <p className="cfb-form-subtitle">
                Visited a cart recently? Help neighbors find their next favorite order.
              </p>

              {submitted && (
                <div className="cfb-success-msg">Thank you! Your review was submitted and will appear after moderation.</div>
              )}
              {submitError && <div className="cfb-error-msg" role="alert">{submitError}</div>}

              <form onSubmit={handleSubmit} className="cfb-form">
                <div className="cfb-form-group">
                  <label className="cfb-form-label" htmlFor="cfb-review-branch-btn">BRANCH VISITED</label>
                  <BranchPicker
                    branches={branches}
                    selectedBranchId={selectedBranchId}
                    onSelect={setSelectedBranchId}
                    disabled={submitting || branches.length === 0}
                  />
                </div>
                <div className="cfb-form-group">
                  <label className="cfb-form-label">YOUR RATING</label>
                  <div className="cfb-rating-input">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={`cfb-rating-star ${(hoverRating || selectedRating) >= s ? 'active' : ''}`}
                        disabled={submitting}
                        onMouseEnter={() => setHoverRating(s)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setSelectedRating(s)}
                        aria-label={`Rate ${s} star${s > 1 ? 's' : ''}`}
                      >
                        <FaStar />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="cfb-form-group">
                  <label className="cfb-form-label" htmlFor="cfb-display-name">Display Name</label>
                  <input
                    id="cfb-display-name"
                    disabled={submitting}
                    maxLength={100}
                    type="text"
                    className="cfb-input"
                    placeholder="e.g. Juan Dela Cruz"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>

                <div className="cfb-form-group">
                  <label className="cfb-form-label" htmlFor="cfb-review-text">Your Review</label>
                  <textarea
                    id="cfb-review-text"
                    disabled={submitting}
                    maxLength={5000}
                    className="cfb-textarea"
                    placeholder="What do you think of the siomai rice? How was the service?"
                    rows={4}
                    value={form.text}
                    onChange={(e) => setForm((p) => ({ ...p, text: e.target.value }))}
                  />
                </div>

                <label className="cfb-photo-upload" htmlFor="cfb-photo-input">
                  <BiCamera className="cfb-photo-icon" />
                  <span>{form.photo ? form.photo.name : 'Add a photo (Optional · JPG, PNG or WebP · Up to 3 MiB)'}</span>
                  <input
                    id="cfb-photo-input"
                    disabled={submitting}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => setForm((p) => ({ ...p, photo: e.target.files[0] || null }))}
                  />
                </label>

                <button type="submit" className="cfb-submit-btn" id="cfb-post-feedback-btn" disabled={submitting} aria-live="polite">
                  {submitting ? (submitPhase === 'verifying' ? 'Checking security…' : 'Submitting…') : 'Post Feedback'}
                </button>
              </form>
            </div>
          </aside>

          {/* ── Right Panel ── */}
          <section className="cfb-main">
            <div className="cfb-reviews-header">
              <div>
                <h2 className="cfb-reviews-title">
                  Community <em>Reviews</em>
                </h2>
                <p className="cfb-reviews-count">Showing {sortedReviews.length} results{loadError ? ` · ${loadError}` : ''}</p>
              </div>
              <div className="cfb-sort-wrapper">
                <select
                  className="cfb-sort-select"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  id="cfb-sort-select"
                >
                  <option>Newest First</option>
                  <option>Highest Rated</option>
                  <option>Lowest Rated</option>
                  <option>Most Helpful</option>
                </select>
                <BiChevronDown className="cfb-sort-icon" />
              </div>
            </div>

            <div className="cfb-reviews-list">
              {loading ? (
                <ReviewCardsSkeleton count={3} />
              ) : sortedReviews.length === 0 ? (
                <p className="cfb-empty-reviews">No published reviews yet. Be the first to share your experience.</p>
              ) : (
                sortedReviews.map((review) => (
                <div className="cfb-review-card" key={review.id}>
                  <div className="cfb-review-top">
                    <div className="cfb-review-user">
                      <div className="cfb-review-avatar" style={{ background: review.color }}>
                        {review.initials}
                      </div>
                      <div>
                        <div className="cfb-review-name-row">
                          <span className="cfb-review-name">{review.name}</span>
                          {review.verified && (
                            <span className="cfb-verified-badge">
                              <RiVerifiedBadgeFill /> verified
                            </span>
                          )}
                        </div>
                        <div className="cfb-review-meta">
                          <StarRating rating={review.rating} size={13} />
                          <span className="cfb-review-date">{review.date}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {review.tags.length > 0 && (
                    <div className="cfb-tags-row">
                      {review.tags.map((tag) => (
                        <span className="cfb-tag" key={tag}>{tag}</span>
                      ))}
                    </div>
                  )}

                  {review.branchName && <span className="cfb-review-branch">{review.branchName}</span>}
                  <p className="cfb-review-text">&ldquo;{review.text}&rdquo;</p>

                  {review.image && (
                    <div className="cfb-review-image-wrap">
                      <img src={review.image} alt="Review" className="cfb-review-image" loading="lazy" />
                    </div>
                  )}

                  <div className="cfb-review-footer">
                    <span className="cfb-helpful-label">Was this helpful?</span>
                    <HelpfulButton review={review} onCount={(id, helpful) => setReviews(prev => prev.map(item => item.id === id ? { ...item, helpful } : item))} />
                  </div>
                </div>
              ))
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};

export default ReviewsPage;

