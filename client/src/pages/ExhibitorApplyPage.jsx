/**
 * ExhibitorApplyPage.jsx — Submit Booth Application
 *
 * Allows an authenticated exhibitor to submit a booth participation application
 * to a selected expo event. Enforces profile completion prerequisite.
 */

import React, { useState, useEffect } from 'react';
import { getMyProfile, submitApplication } from '../services/exhibitorService';
import { getExpoById } from '../services/expoService';
import '../styles/ExhibitorApplyPage.css';

const BOOTH_SIZES = [
  { value: 'small', label: 'Small (3m x 3m)', desc: 'Ideal for startups, software demos, and single-display counters.' },
  { value: 'medium', label: 'Medium (6m x 3m)', desc: 'Standard pavilion space with ample room for product displays.' },
  { value: 'large', label: 'Large (6m x 6m)', desc: 'Island or corner booth designed for high-traffic presentations.' },
  { value: 'custom', label: 'Custom Specification', desc: 'Custom structural footprint subject to organizer approval.' },
];

const ExhibitorApplyPage = ({ expoId, expoTitle, onNavigate }) => {
  const [expo, setExpo] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    boothSize: 'medium',
    preferredLocation: '',
    specialRequirements: '',
  });

  useEffect(() => {
    if (!expoId) return;
    setLoading(true);
    Promise.all([
      getMyProfile().catch(() => null),
      getExpoById(expoId).catch((err) => ({ error: err.message })),
    ])
      .then(([profRes, expoRes]) => {
        if (profRes && profRes.data) {
          setProfile(profRes.data);
        }
        if (expoRes && expoRes.data) {
          setExpo(expoRes.data);
        } else if (expoRes && expoRes.error) {
          setError(expoRes.error);
        }
      })
      .finally(() => setLoading(false));
  }, [expoId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!profile) {
      setError('You must create your company profile before applying to an expo.');
      return;
    }

    setSubmitting(true);
    try {
      await submitApplication({
        expoId,
        boothPreference: {
          size: form.boothSize,
          preferredLocation: form.preferredLocation.trim(),
          specialRequirements: form.specialRequirements.trim(),
        },
      });
      setSuccess(true);
    } catch (err) {
      const msg = err.data?.message || err.message || 'Failed to submit application';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="apply-loading">
        <div className="apply-spinner"></div>
        <p>Loading application prerequisites...</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="apply-success-layout">
        <div className="apply-success-card">
          <span className="success-icon">🎉</span>
          <h2>Application Submitted!</h2>
          <p>
            Your booth participation application for <strong>{expo?.title || expoTitle || 'this expo'}</strong> has
            been transmitted to the organizing team for review.
          </p>
          <div className="success-details-box">
            <div><span>Company:</span> <strong>{profile?.companyName}</strong></div>
            <div><span>Requested Booth Size:</span> <strong>{form.boothSize.toUpperCase()}</strong></div>
            <div><span>Status:</span> <span className="status-pill badge-pending">Pending Review</span></div>
          </div>
          <div className="success-actions">
            <button
              className="btn-primary"
              onClick={() => onNavigate('exhibitor-applications')}
            >
              View My Applications
            </button>
            <button
              className="btn-secondary"
              onClick={() => onNavigate('exhibitor-dashboard')}
            >
              Exhibitor Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="exhibitor-apply-layout">
      {/* Header */}
      <div className="apply-header-bar">
        <button className="btn-back" onClick={() => onNavigate('exhibitor-expos')}>
          ← Back to Expos
        </button>
        <h1>Apply for Booth Space</h1>
        <p className="apply-subtitle">
          Submit your exhibition credentials and booth requirements to participate in {expo?.title || expoTitle}.
        </p>
      </div>

      {/* Profile Prerequisite Warning */}
      {!profile && (
        <div className="apply-warning-banner">
          <div>
            <strong>⚠️ Exhibitor Profile Required</strong>
            <p>You have not configured your company profile yet. Organizers require company details to evaluate applications.</p>
          </div>
          <button className="btn-primary" onClick={() => onNavigate('exhibitor-profile')}>
            Create Company Profile Now
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="apply-error-banner">
          ⚠️ {error}
        </div>
      )}

      {/* Main Form */}
      <form className="apply-form" onSubmit={handleSubmit}>
        {/* Selected Expo Summary */}
        <div className="apply-summary-card">
          <span className="summary-tag">TARGET EXPO EVENT</span>
          <h2 className="summary-title">{expo?.title || expoTitle}</h2>
          {expo && (
            <div className="summary-meta-grid">
              <div>📍 <strong>Venue:</strong> {expo.location?.venue}, {expo.location?.city}</div>
              <div>📂 <strong>Category:</strong> {expo.category}</div>
              <div>📅 <strong>Dates:</strong> {new Date(expo.startDate).toLocaleDateString()} – {new Date(expo.endDate).toLocaleDateString()}</div>
              <div>🏛️ <strong>Organizer:</strong> {expo.organizer?.name || 'Authorized Organizer'}</div>
            </div>
          )}
        </div>

        {/* Applicant Profile Information */}
        {profile && (
          <div className="applicant-info-card">
            <span className="summary-tag">APPLICANT CREDENTIALS</span>
            <div className="applicant-flex">
              <div>
                <h3 className="applicant-company">{profile.companyName}</h3>
                <p className="applicant-sub">{profile.industry} • Contact: {profile.contactPerson?.name || 'Representative'}</p>
              </div>
              <button
                type="button"
                className="btn-link"
                onClick={() => onNavigate('exhibitor-profile')}
              >
                Edit Profile ↗
              </button>
            </div>
          </div>
        )}

        {/* Booth Requirements */}
        <div className="apply-card">
          <h2 className="apply-section-title">Booth Preferences & Specifications</h2>

          <div className="form-group">
            <label className="section-label">Select Booth Footprint Size *</label>
            <div className="booth-options-grid">
              {BOOTH_SIZES.map((b) => (
                <label
                  key={b.value}
                  className={`booth-option-card ${form.boothSize === b.value ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="boothSize"
                    value={b.value}
                    checked={form.boothSize === b.value}
                    onChange={(e) => setForm((prev) => ({ ...prev, boothSize: e.target.value }))}
                  />
                  <div className="option-content">
                    <strong className="option-title">{b.label}</strong>
                    <span className="option-desc">{b.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="preferredLocation">Preferred Floor Location / Hall Zone</label>
            <input
              id="preferredLocation"
              type="text"
              className="form-control"
              placeholder="e.g., Near Entrance, Main Innovation Aisle, Corner Space"
              value={form.preferredLocation}
              onChange={(e) => setForm((prev) => ({ ...prev, preferredLocation: e.target.value }))}
              maxLength={200}
            />
          </div>

          <div className="form-group">
            <label htmlFor="specialRequirements">Technical & Electrical Requirements</label>
            <textarea
              id="specialRequirements"
              rows={3}
              className="form-control"
              placeholder="e.g., 3-phase 32A power supply, wired internet, suspended banner truss..."
              value={form.specialRequirements}
              onChange={(e) => setForm((prev) => ({ ...prev, specialRequirements: e.target.value }))}
              maxLength={1000}
            />
          </div>
        </div>

        {/* Submit Actions */}
        <div className="apply-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onNavigate('exhibitor-expos')}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={submitting || !profile}
          >
            {submitting ? 'Submitting Application...' : 'Confirm & Submit Application'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ExhibitorApplyPage;
