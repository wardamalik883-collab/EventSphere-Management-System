/**
 * ExpoFeedbackSection.jsx — Expo Reviews & Rating Section
 * Task 12: Public ratings summary, star distribution, reviews list, and review submission modal.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  getExpoFeedback,
  submitFeedback,
  updateFeedback,
  deleteFeedback,
} from '../services/feedbackService';
import { useAuth } from '../context/AuthContext';
import '../styles/ExpoFeedbackSection.css';

const CATEGORIES = [
  { value: 'overall', label: 'Overall Experience' },
  { value: 'organization', label: 'Event Organization' },
  { value: 'venue', label: 'Venue & Facilities' },
  { value: 'sessions', label: 'Sessions & Speakers' },
  { value: 'exhibitors', label: 'Exhibitors & Booths' },
  { value: 'other', label: 'Other' },
];

function StarRating({ rating, size = 'medium', interactive = false, onRatingChange }) {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className={`star-rating-wrap star-rating-${size}`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = (hoverRating || rating) >= star;
        return (
          <span
            key={star}
            className={`star-icon ${isFilled ? 'star-filled' : 'star-empty'} ${interactive ? 'star-interactive' : ''}`}
            onClick={() => interactive && onRatingChange && onRatingChange(star)}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onMouseLeave={() => interactive && setHoverRating(0)}
          >
            ★
          </span>
        );
      })}
    </div>
  );
}

const ExpoFeedbackSection = ({ expoId }) => {
  const { user, isAuthenticated, role } = useAuth();

  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [distribution, setDistribution] = useState({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // User's own review if already submitted
  const [myReview, setMyReview] = useState(null);

  // Modal form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formRating, setFormRating] = useState(5);
  const [formCategory, setFormCategory] = useState('overall');
  const [formComment, setFormComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const fetchReviews = useCallback(async () => {
    if (!expoId) return;
    setLoading(true);
    setError('');
    try {
      const res = await getExpoFeedback(expoId, { limit: 20 });
      const data = res.data.data;
      setReviews(data?.reviews || []);
      setAverageRating(data?.averageRating || 0);
      setTotalReviews(data?.totalReviews || 0);
      setDistribution(data?.ratingDistribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });

      // Check if user already submitted a review
      if (user?._id && data?.reviews) {
        const mine = data.reviews.find((r) => r.user?._id === user._id);
        if (mine) {
          setMyReview(mine);
        } else {
          setMyReview(null);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [expoId, user]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleOpenModal = (existing = null) => {
    setFormError('');
    setFormSuccess('');
    if (existing) {
      setFormRating(existing.rating);
      setFormCategory(existing.category || 'overall');
      setFormComment(existing.comment || '');
    } else {
      setFormRating(5);
      setFormCategory('overall');
      setFormComment('');
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!formComment.trim()) {
      setFormError('Please enter a feedback comment');
      return;
    }

    setSubmitting(true);
    try {
      if (myReview) {
        // Edit existing review
        await updateFeedback(myReview._id, {
          rating: formRating,
          category: formCategory,
          comment: formComment.trim(),
        });
        setFormSuccess('Review updated successfully!');
      } else {
        // Submit new review
        await submitFeedback(expoId, {
          rating: formRating,
          category: formCategory,
          comment: formComment.trim(),
        });
        setFormSuccess('Thank you! Your review has been submitted.');
      }

      await fetchReviews();
      setTimeout(() => {
        setIsModalOpen(false);
      }, 1000);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async (feedbackId) => {
    if (!window.confirm('Are you sure you want to delete your review?')) return;
    try {
      await deleteFeedback(feedbackId);
      setMyReview(null);
      await fetchReviews();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete review');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const canLeaveFeedback = isAuthenticated && (role === 'attendee' || role === 'admin');

  return (
    <section className="expo-feedback-section">
      <div className="feedback-section-header">
        <div>
          <h2 className="feedback-section-title">⭐ Attendee Reviews &amp; Feedback</h2>
          <p className="feedback-section-subtitle">
            Authentic ratings and feedback from verified expo attendees.
          </p>
        </div>

        {canLeaveFeedback && (
          <button
            className="btn-open-feedback-modal"
            onClick={() => handleOpenModal(myReview)}
          >
            {myReview ? '✏️ Edit My Review' : '✍️ Leave Feedback'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="feedback-loading">
          <div className="dashboard-spinner" />
          <p>Loading attendee feedback…</p>
        </div>
      ) : error ? (
        <div className="feedback-error">⚠️ {error}</div>
      ) : (
        <>
          {/* Summary Banner */}
          <div className="feedback-summary-card">
            <div className="feedback-score-box">
              <span className="feedback-average-num">
                {averageRating > 0 ? averageRating.toFixed(1) : '—'}
              </span>
              <StarRating rating={Math.round(averageRating)} size="large" />
              <span className="feedback-total-count">
                Based on {totalReviews} review{totalReviews !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Distribution Bars */}
            <div className="feedback-distribution-bars">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = distribution[stars] || 0;
                const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
                return (
                  <div key={stars} className="dist-row">
                    <span className="dist-label">{stars} ★</span>
                    <div className="dist-track">
                      <div className="dist-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="dist-count">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reviews List */}
          {reviews.length === 0 ? (
            <div className="feedback-empty-state">
              <span className="feedback-empty-icon">💬</span>
              <p>No reviews yet for this expo.</p>
              {canLeaveFeedback && !myReview && (
                <button
                  className="btn-first-review"
                  onClick={() => handleOpenModal(null)}
                >
                  Be the first to leave a review
                </button>
              )}
            </div>
          ) : (
            <div className="reviews-grid">
              {reviews.map((r) => {
                const isMine = user?._id && r.user?._id === user._id;
                return (
                  <div
                    key={r._id}
                    className={`review-card ${isMine ? 'review-card-mine' : ''}`}
                  >
                    <div className="review-card-top">
                      <div className="review-author-wrap">
                        <span className="review-author-avatar">
                          {r.user?.displayName?.charAt(0) || 'A'}
                        </span>
                        <div>
                          <span className="review-author-name">
                            {r.user?.displayName || 'Attendee'}
                            {isMine && <span className="mine-badge"> (You)</span>}
                          </span>
                          <span className="review-date">{formatDate(r.createdAt)}</span>
                        </div>
                      </div>

                      <div className="review-rating-wrap">
                        <StarRating rating={r.rating} size="small" />
                        {r.category && (
                          <span className="review-cat-tag">
                            {CATEGORIES.find((c) => c.value === r.category)?.label || r.category}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="review-comment-body">{r.comment}</p>

                    {isMine && (
                      <div className="review-card-actions">
                        <button
                          className="btn-review-action btn-review-edit"
                          onClick={() => handleOpenModal(r)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-review-action btn-review-del"
                          onClick={() => handleDeleteReview(r._id)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Review Modal Form */}
      {isModalOpen && (
        <div className="feedback-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div
            className="feedback-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="feedback-modal-header">
              <h3 className="feedback-modal-title">
                {myReview ? 'Edit Your Review' : 'Leave Event Feedback'}
              </h3>
              <button
                className="btn-modal-close"
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="feedback-form">
              <div className="form-group">
                <label className="form-label">Your Overall Rating</label>
                <div className="interactive-stars-box">
                  <StarRating
                    rating={formRating}
                    size="large"
                    interactive
                    onRatingChange={setFormRating}
                  />
                  <span className="rating-num-label">{formRating} out of 5 stars</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Feedback Category</label>
                <select
                  className="form-select"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Your Comments &amp; Suggestions
                  <span className="char-count">({formComment.length}/2000)</span>
                </label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  maxLength={2000}
                  placeholder="Share your thoughts about this expo, sessions, venue, and exhibitors…"
                  value={formComment}
                  onChange={(e) => setFormComment(e.target.value)}
                  required
                />
              </div>

              {formError && <div className="form-error-banner">⚠️ {formError}</div>}
              {formSuccess && <div className="form-success-banner">✓ {formSuccess}</div>}

              <div className="feedback-modal-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-submit-review"
                  disabled={submitting}
                >
                  {submitting ? 'Saving…' : myReview ? 'Update Review' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default ExpoFeedbackSection;
