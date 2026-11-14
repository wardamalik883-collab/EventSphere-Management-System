/**
 * ExhibitorProfilePage.jsx — View & Edit Company Profile
 *
 * Allows authenticated exhibitors to create and maintain their corporate profile,
 * contact details, industry classification, and company logo.
 */

import React, { useState, useEffect } from 'react';
import { getMyProfile, createProfile, updateProfile } from '../services/exhibitorService';
import '../styles/ExhibitorProfilePage.css';

const INDUSTRY_OPTIONS = [
  'Technology', 'Robotics & AI', 'Healthcare & Medical', 'Finance & FinTech',
  'Manufacturing', 'Automotive', 'Renewable Energy', 'Retail & E-commerce',
  'Food & Beverage', 'Telecommunications', 'Aerospace', 'Education', 'Other',
];

const ExhibitorProfilePage = ({ onNavigate }) => {
  const [profileExists, setProfileExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    companyName: '',
    companyDescription: '',
    companyWebsite: '',
    industry: '',
    logoUrl: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
  });

  useEffect(() => {
    setLoading(true);
    getMyProfile()
      .then((res) => {
        if (res.data) {
          setProfileExists(true);
          const p = res.data;
          setForm({
            companyName: p.companyName || '',
            companyDescription: p.companyDescription || '',
            companyWebsite: p.companyWebsite || '',
            industry: p.industry || '',
            logoUrl: p.logoUrl || '',
            contactName: p.contactPerson?.name || '',
            contactEmail: p.contactPerson?.email || '',
            contactPhone: p.contactPerson?.phone || '',
          });
        }
      })
      .catch((err) => {
        // 404 means exhibitor has not created profile yet
        if (err.status === 404 || err.statusCode === 404) {
          setProfileExists(false);
        } else {
          setStatusMessage({ type: 'error', text: err.message || 'Error loading profile' });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const validate = () => {
    const errs = {};
    if (!form.companyName.trim()) {
      errs.companyName = 'Company name is required';
    } else if (form.companyName.trim().length < 2) {
      errs.companyName = 'Company name must be at least 2 characters';
    }
    if (!form.companyDescription.trim()) {
      errs.companyDescription = 'Company description is required';
    }
    if (!form.industry) {
      errs.industry = 'Please select your industry';
    }
    if (form.companyWebsite && !/^https?:\/\/.+/.test(form.companyWebsite.trim())) {
      errs.companyWebsite = 'Website must start with http:// or https://';
    }
    if (form.contactEmail && !/\S+@\S+\.\S+/.test(form.contactEmail.trim())) {
      errs.contactEmail = 'Please provide a valid contact email';
    }
    return errs;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage(null);

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    const payload = {
      companyName: form.companyName.trim(),
      companyDescription: form.companyDescription.trim(),
      companyWebsite: form.companyWebsite.trim(),
      industry: form.industry,
      logoUrl: form.logoUrl.trim(),
      contactPerson: {
        name: form.contactName.trim(),
        email: form.contactEmail.trim(),
        phone: form.contactPhone.trim(),
      },
    };

    try {
      if (profileExists) {
        await updateProfile(payload);
        setStatusMessage({ type: 'success', text: 'Company profile updated successfully!' });
      } else {
        await createProfile(payload);
        setProfileExists(true);
        setStatusMessage({ type: 'success', text: 'Company profile created successfully!' });
      }
    } catch (err) {
      const msg = err.data?.message || err.message || 'Failed to save profile';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="profile-spinner"></div>
        <p>Loading company profile...</p>
      </div>
    );
  }

  return (
    <div className="exhibitor-profile-layout">
      {/* Header */}
      <div className="profile-header-bar">
        <button className="btn-back" onClick={() => onNavigate('exhibitor-dashboard')}>
          ← Back to Dashboard
        </button>
        <div className="profile-header-title">
          <h1>{profileExists ? 'Company Profile' : 'Create Company Profile'}</h1>
          <p className="profile-header-subtitle">
            This information will be displayed to expo organizers when you apply for booths.
          </p>
        </div>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div className={`status-banner ${statusMessage.type === 'error' ? 'banner-error' : 'banner-success'}`}>
          {statusMessage.type === 'error' ? '⚠️' : '✅'} {statusMessage.text}
        </div>
      )}

      {/* Main Profile Form */}
      <form className="profile-form" onSubmit={handleSubmit} noValidate>
        {/* Company Details Section */}
        <section className="form-card">
          <h2 className="card-section-title">Corporate Information</h2>

          <div className="form-group">
            <label htmlFor="companyName">
              Company Name <span className="req">*</span>
            </label>
            <input
              id="companyName"
              name="companyName"
              type="text"
              className={`form-control ${errors.companyName ? 'is-invalid' : ''}`}
              placeholder="e.g., Acme Robotics International"
              value={form.companyName}
              onChange={handleChange}
              maxLength={200}
            />
            {errors.companyName && <span className="error-text">{errors.companyName}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="companyDescription">
              Company Description <span className="req">*</span>
            </label>
            <textarea
              id="companyDescription"
              name="companyDescription"
              rows={4}
              className={`form-control ${errors.companyDescription ? 'is-invalid' : ''}`}
              placeholder="Describe your company's core mission, market offerings, and innovations..."
              value={form.companyDescription}
              onChange={handleChange}
              maxLength={3000}
            />
            {errors.companyDescription && <span className="error-text">{errors.companyDescription}</span>}
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="industry">
                Industry Sector <span className="req">*</span>
              </label>
              <select
                id="industry"
                name="industry"
                className={`form-control ${errors.industry ? 'is-invalid' : ''}`}
                value={form.industry}
                onChange={handleChange}
              >
                <option value="">Select an industry...</option>
                {INDUSTRY_OPTIONS.map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
              {errors.industry && <span className="error-text">{errors.industry}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="companyWebsite">Company Website</label>
              <input
                id="companyWebsite"
                name="companyWebsite"
                type="url"
                className={`form-control ${errors.companyWebsite ? 'is-invalid' : ''}`}
                placeholder="https://example.com"
                value={form.companyWebsite}
                onChange={handleChange}
              />
              {errors.companyWebsite && <span className="error-text">{errors.companyWebsite}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="logoUrl">Company Logo URL</label>
            <input
              id="logoUrl"
              name="logoUrl"
              type="url"
              className="form-control"
              placeholder="https://example.com/logo.png"
              value={form.logoUrl}
              onChange={handleChange}
            />
            {form.logoUrl && (
              <div className="logo-preview-box">
                <span className="preview-label">Preview:</span>
                <img
                  src={form.logoUrl}
                  alt="Company Logo Preview"
                  className="preview-img"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            )}
          </div>
        </section>

        {/* Primary Contact Person */}
        <section className="form-card">
          <h2 className="card-section-title">Primary Contact Representative</h2>

          <div className="form-row-3">
            <div className="form-group">
              <label htmlFor="contactName">Representative Name</label>
              <input
                id="contactName"
                name="contactName"
                type="text"
                className="form-control"
                placeholder="e.g., Sarah Connor"
                value={form.contactName}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="contactEmail">Contact Email</label>
              <input
                id="contactEmail"
                name="contactEmail"
                type="email"
                className={`form-control ${errors.contactEmail ? 'is-invalid' : ''}`}
                placeholder="contact@company.com"
                value={form.contactEmail}
                onChange={handleChange}
              />
              {errors.contactEmail && <span className="error-text">{errors.contactEmail}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="contactPhone">Phone Number</label>
              <input
                id="contactPhone"
                name="contactPhone"
                type="tel"
                className="form-control"
                placeholder="+1-555-0100"
                value={form.contactPhone}
                onChange={handleChange}
              />
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <div className="form-footer-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onNavigate('exhibitor-dashboard')}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={saving}
          >
            {saving ? 'Saving Profile...' : (profileExists ? 'Update Profile' : 'Create Profile')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ExhibitorProfilePage;
