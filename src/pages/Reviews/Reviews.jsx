import { useState, useEffect, useRef } from 'react';
import { BiLike, BiCamera, BiChevronDown } from 'react-icons/bi';
import { FaStar, FaStarHalfAlt, FaRegStar } from 'react-icons/fa';
import { RiVerifiedBadgeFill } from 'react-icons/ri';
import PageMeta from '../../components/PageMeta';
import './Reviews.css';

const initialReviews = [
  {
    id: 1,
    name: 'Tord Cabanela',
    initials: 'TC',
    color: '#E63946',
    verified: true,
    date: '2 days ago',
    rating: 5,
    tags: ['GREAT VALUE', 'BEST CHILI SAUCE'],
    text: 'The best siomai in town! The chili garlic sauce is absolutely perfect. I always buy the family pack to take home.',
    image: 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400&q=80',
    helpful: 24,
  },
  {
    id: 2,
    name: 'Rica Paloma',
    initials: 'RP',
    color: '#F5A623',
    verified: true,
    date: '1 week ago',
    rating: 5,
    tags: ['MUST TRY', 'AFFORDABLE'],
    text: 'My go-to merienda spot. Affordable and masarap. The shrimp siomai is my absolute favorite. Lagi akong bumabalik!',
    image: null,
    helpful: 18,
  },
  {
    id: 3,
    name: 'Mark Tan',
    initials: 'MT',
    color: '#4CAF50',
    verified: true,
    date: '3 days ago',
    rating: 5,
    tags: ['BEST SIOMAI', 'FAMILY PACK'],
    text: 'Best siomai in our area! My kids love it. We order almost every day. Super worth it for the price. Highly recommended!',
    image: null,
    helpful: 31,
  },
  {
    id: 4,
    name: 'Jenny Lim',
    initials: 'JL',
    color: '#9C27B0',
    verified: true,
    date: '5 days ago',
    rating: 4,
    tags: ['GREAT SERVICE', 'CONSISTENT'],
    text: 'Consistent quality every time. I love that the portions are generous and the staff is always friendly. Keep it up, Siomai Street!',
    image: null,
    helpful: 12,
  },
  {
    id: 5,
    name: 'Paolo Garcia',
    initials: 'PG',
    color: '#2196F3',
    verified: false,
    date: '1 week ago',
    rating: 5,
    tags: ['OFFICE FAVE', 'GREAT VALUE'],
    text: 'Discovered this gem near our office. Now the whole team orders from here for lunch. The rice meals are super sulit!',
    image: null,
    helpful: 9,
  },
];

const ratingBreakdown = [
  { stars: 5, percent: 60 },
  { stars: 4, percent: 50 },
  { stars: 3, percent: 50 },
  { stars: 2, percent: 0 },
  { stars: 1, percent: 0 },
];

const StarRating = ({ rating, size = 16 }) => (
  <span className="cfb-star-row" style={{ fontSize: size }}>
    {[1, 2, 3, 4, 5].map((s) => {
      if (rating >= s) return <FaStar key={s} className="cfb-star filled" />;
      if (rating >= s - 0.5) return <FaStarHalfAlt key={s} className="cfb-star filled" />;
      return <FaRegStar key={s} className="cfb-star empty" />;
    })}
  </span>
);

const ReviewsPage = () => {
  const [reviews, setReviews] = useState(initialReviews);
  const [sort, setSort] = useState('Newest First');
  const [helpfulMap, setHelpfulMap] = useState({});
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [form, setForm] = useState({ name: '', text: '', photo: null });
  const [submitted, setSubmitted] = useState(false);

  // Track object URLs so they can be revoked to prevent memory leaks
  const objectUrlsRef = useRef([]);

  useEffect(() => {
    return () => {
      // Revoke all object URLs created during this component's lifetime
      objectUrlsRef.current.forEach((url) => {
        try { URL.revokeObjectURL(url); } catch { /* already revoked */ }
      });
      objectUrlsRef.current = [];
    };
  }, []);

  const sortedReviews = [...reviews].sort((a, b) => {
    if (sort === 'Highest Rated') return b.rating - a.rating;
    if (sort === 'Lowest Rated') return a.rating - b.rating;
    if (sort === 'Most Helpful') return b.helpful - a.helpful;
    return b.id - a.id;
  });

  const handleHelpful = (id) => {
    if (helpfulMap[id]) return;
    setHelpfulMap((prev) => ({ ...prev, [id]: true }));
    setReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, helpful: r.helpful + 1 } : r))
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedRating || !form.name.trim() || !form.text.trim()) return;

    let imageUrl = null;
    if (form.photo) {
      imageUrl = URL.createObjectURL(form.photo);
      objectUrlsRef.current.push(imageUrl);
    }

    const newReview = {
      id: Date.now(),
      name: form.name,
      initials: form.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase(),
      color: '#E63946',
      verified: false,
      date: 'Just now',
      rating: selectedRating,
      tags: [],
      text: form.text,
      image: imageUrl,
      helpful: 0,
    };
    setReviews((prev) => [newReview, ...prev]);
    setForm({ name: '', text: '', photo: null });
    setSelectedRating(0);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  const avgRating = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);

  return (
    <main className="cfb-page">
      <PageMeta
        title="Reviews"
        path="/reviews"
        description="Read real customer reviews of Siomai Street. See ratings, photos, and feedback from our community of siomai lovers."
      />
      {/* Page Header */}
      <div className="cfb-page-header">
        <h1 className="cfb-page-title">
          Community <span className="cfb-highlight">Feedback</span>
        </h1>
        <p className="cfb-page-subtitle">
          Real stories from our beloved customers. We take pride in our service and our food,
          but there&apos;s always room to grow. Share your experience!
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
                <span className="cfb-verified-count">{reviews.length} VERIFIED REVIEWS</span>
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
              <h3 className="cfb-form-title">Share Your Experience</h3>
            </div>

            {submitted && (
              <div className="cfb-success-msg">Thank you for your feedback!</div>
            )}

            <form onSubmit={handleSubmit} className="cfb-form">
              <div className="cfb-form-group">
                <label className="cfb-form-label">YOUR RATING</label>
                <div className="cfb-rating-input">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`cfb-rating-star ${(hoverRating || selectedRating) >= s ? 'active' : ''}`}
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
                  className="cfb-textarea"
                  placeholder="What do you think of the siomai rice? how was the service?"
                  rows={4}
                  value={form.text}
                  onChange={(e) => setForm((p) => ({ ...p, text: e.target.value }))}
                />
              </div>

              <label className="cfb-photo-upload" htmlFor="cfb-photo-input">
                <BiCamera className="cfb-photo-icon" />
                <span>{form.photo ? form.photo.name : 'Add a photo (Optional)'}</span>
                <input
                  id="cfb-photo-input"
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => setForm((p) => ({ ...p, photo: e.target.files[0] || null }))}
                />
              </label>

              <button type="submit" className="cfb-submit-btn" id="cfb-post-feedback-btn">
                ✉ Post Feedback
              </button>
            </form>
          </div>
        </aside>

        {/* ── Right Panel ── */}
        <section className="cfb-main">
          <div className="cfb-reviews-header">
            <div>
              <h2 className="cfb-reviews-title">Customer Reviews</h2>
              <p className="cfb-reviews-count">Showing {sortedReviews.length} results</p>
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
            {sortedReviews.map((review) => (
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

                <p className="cfb-review-text">&ldquo;{review.text}&rdquo;</p>

                {review.image && (
                  <div className="cfb-review-image-wrap">
                    <img src={review.image} alt="Review" className="cfb-review-image" loading="lazy" />
                  </div>
                )}

                <div className="cfb-review-footer">
                  <span className="cfb-helpful-label">Was this helpful?</span>
                  <button
                    className={`cfb-helpful-btn ${helpfulMap[review.id] ? 'voted' : ''}`}
                    onClick={() => handleHelpful(review.id)}
                    id={`cfb-helpful-btn-${review.id}`}
                  >
                    <BiLike /> Helpful ({review.helpful})
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
};

export default ReviewsPage;

