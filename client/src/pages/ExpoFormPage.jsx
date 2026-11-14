/**
 * ExpoFormPage.jsx — Create & Edit Expo Form
 *
 * Used for both creating a new expo and editing an existing one.
 * Props:
 *   - mode: 'create' | 'edit'
 *   - expoId: string (required when mode === 'edit')
 *   - onNavigate: function
 */

import React, { useState, useEffect } from 'react';
import { createExpo, getExpoById, updateExpo } from '../services/expoService';
import '../styles/ExpoFormPage.css';

const EXPO_CATEGORIES = [
  'Technology', 'Healthcare', 'Finance', 'Education', 'Manufacturing',
  'Retail', 'Food & Beverage', 'Fashion', 'Automotive', 'Energy',
  'Real Estate', 'Entertainment', 'Sports', 'Agriculture', 'Other',
];

const EXPO_STATUSES_CREATE = ['draft', 'published'];
const EXPO_STATUSES_EDIT   = ['draft', 'published', 'ongoing', 'completed', 'cancelled'];

const EMPTY_FORM = {
  title: '',
  description: '',
  theme: '',
  category: '',
  startDate: '',
  endDate: '',
  'location.venue': '',
  'location.city': '',
  'location.country': '',
  'location.address': '',
  status: 'draft',
  capacity: '',
  bannerUrl: '',
};

function flattenExpo(expo) {
  if (!expo) return EMPTY_FORM;
  const toDateInput = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt)) return '';
    return dt.toISOString().slice(0, 10);
  };
  return {
    title: expo.title || '',
    description: expo.description || '',
    theme: expo.theme || '',
    category: expo.category || '',
    startDate: toDateInput(expo.startDate),
    endDate: toDateInput(expo.endDate),
    'location.venue': expo.location?.venue || '',
    'location.city': expo.location?.city || '',
    'location.country': expo.location?.country || '',
    'location.address': expo.location?.address || '',
    status: expo.status || 'draft',
    capacity: expo.capacity != null ? String(expo.capacity) : '',
    bannerUrl: expo.bannerUrl || '',
  };
}

function buildPayload(form) {
  const payload = {
    title: form.title.trim(),
    description: form.description.trim(),
    category: form.category,
    startDate: form.startDate,
    endDate: form.endDate,
    location: {
      venue: form['location.venue'].trim(),
      city: form['location.city'].trim(),
      country: form['location.country'].trim(),
      address: form['location.address'].trim(),
    },
    status: form.status,
  };
  if (form.theme.trim()) payload.theme = form.theme.trim();
  if (form.bannerUrl.trim()) payload.bannerUrl = form.bannerUrl.trim();
  if (form.capacity !== '') {
    const cap = parseInt(form.capacity, 10);
    if (!isNaN(cap)) payload.capacity = cap;
  }
  return payload;
}

function validate(form) {
  const errors = {};
  if (!form.title.trim()) errors.title = 'Expo title is required';
  else if (form.title.trim().length < 3) errors.title = 'Title must be at least 3 characters';
  if (!form.description.trim()) errors.description = 'Description is required';
  if (!form.category) errors.category = 'Category is required';
  if (!form.startDate) errors.startDate = 'Start date is required';
  if (!form.endDate) errors.endDate = 'End date is required';
  if (form.startDate && form.endDate && form.endDate < form.startDate) {
    errors.endDate = 'End date must be on or after the start date';
  }
  if (!form['location.venue'].trim()) errors['location.venue'] = 'Venue name is required';
  if (!form['location.city'].trim()) errors['location.city'] = 'City is required';
  if (!form['location.country'].trim()) errors['location.country'] = 'Country is required';
  if (form.capacity !== '' && (isNaN(Number(form.capacity)) || Number(form.capacity) < 0)) {
    errors.capacity = 'Capacity must be a non-negative number';
  }
  return errors;
}

const ExpoFormPage = ({ mode = 'create', expoId, onNavigate }) => {
  const isEdit = mode === 'edit';

  const [form, setForm]           = useState(EMPTY_FORM);
  const [errors, setErrors]       = useState({});
  const [serverError, setServerError] = useState(null);
  const [serverErrors, setServerErrors] = useState([]);
  const [loading, setLoading]     = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]     = useState(false);
  const [createdId, setCreatedId] = useState(null);

  // Load existing expo data in edit mode
  useEffect(() => {
    if (!isEdit || !expoId) return;
    setLoading(true);
    getExpoById(expoId)
      .then((res) => {
        setForm(flattenExpo(res.data));
      })
      .catch((err) => {
        setServerError(err.message || 'Failed to load expo data');
      })
      .finally(() => setLoading(false));
  }, [isEdit, expoId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => { const copy = { ...prev }; delete copy[name]; return copy; });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);
    setServerErrors([]);

    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    try {
      const payload = buildPayload(form);
      let result;
      if (isEdit) {
        result = await updateExpo(expoId, payload);
      } else {
        result = await createExpo(payload);
        setCreatedId(result.data?._id);
      }
      setSuccess(true);
    } catch (err) {
      const errData = err.data || {};
      if (Array.isArray(errData.errors) && errData.errors.length > 0) {
        setServerErrors(errData.errors);
      } else {
        setServerError(err.message || 'An unexpected error occurred');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="expo-form-loading">
        <div className="expo-spinner" />
        <p>Loading expo data…</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="expo-form-success">
        <div className="success-card">
          <span className="success-icon">✅</span>
          <h2>{isEdit ? 'Expo Updated' : 'Expo Created'}</h2>
          <p>
            {isEdit
              ? 'The expo has been updated successfully.'
              : 'Your new expo has been created successfully.'}
          </p>
          <div className="success-actions">
            {createdId && (
              <button className="btn-primary" onClick={() => onNavigate('expo-detail', { expoId: createdId })}>
                View Expo
              </button>
            )}
            <button className="btn-secondary" onClick={() => onNavigate('expo-list')}>
              Back to Expo List
            </button>
          </div>
        </div>
      </div>
    );
  }

  const Field = ({ name, label, required, children }) => (
    <div className="form-field">
      <label className="form-label" htmlFor={name}>
        {label}{required && <span className="required">*</span>}
      </label>
      {children}
      {errors[name] && <span className="form-error">{errors[name]}</span>}
    </div>
  );

  return (
    <div className="expo-form-layout">
      <div className="expo-form-header">
        <button className="btn-back" onClick={() => onNavigate('expo-list')}>
          ← Back to Expos
        </button>
        <h1>{isEdit ? 'Edit Expo' : 'Create New Expo'}</h1>
        <p className="expo-form-subtitle">
          {isEdit ? 'Update expo information and settings.' : 'Fill in the details to create a new expo event.'}
        </p>
      </div>

      {/* Server-level errors */}
      {serverError && (
        <div className="form-server-error">
          <strong>⚠️ Error:</strong> {serverError}
        </div>
      )}
      {serverErrors.length > 0 && (
        <div className="form-server-error">
          <strong>⚠️ Validation errors:</strong>
          <ul>
            {serverErrors.map((e, i) => (
              <li key={i}>{e.field ? `${e.field}: ` : ''}{e.message}</li>
            ))}
          </ul>
        </div>
      )}

      <form className="expo-form" onSubmit={handleSubmit} noValidate>
        {/* Basic Info */}
        <section className="form-section">
          <h2 className="form-section-title">Basic Information</h2>

          <Field name="title" label="Expo Title" required>
            <input
              id="title" name="title" type="text"
              className={`form-input ${errors.title ? 'input-error' : ''}`}
              value={form.title} onChange={handleChange}
              placeholder="e.g., Global Tech Expo 2027"
              maxLength={200}
            />
          </Field>

          <Field name="description" label="Description" required>
            <textarea
              id="description" name="description"
              className={`form-textarea ${errors.description ? 'input-error' : ''}`}
              value={form.description} onChange={handleChange}
              rows={4} maxLength={5000}
              placeholder="Describe the expo, its goals, target audience…"
            />
          </Field>

          <div className="form-row">
            <Field name="category" label="Category" required>
              <select
                id="category" name="category"
                className={`form-select ${errors.category ? 'input-error' : ''}`}
                value={form.category} onChange={handleChange}
              >
                <option value="">Select a category…</option>
                {EXPO_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>

            <Field name="theme" label="Theme / Sub-topic">
              <input
                id="theme" name="theme" type="text"
                className="form-input"
                value={form.theme} onChange={handleChange}
                placeholder="e.g., AI & Machine Learning"
              />
            </Field>
          </div>

          <div className="form-row">
            <Field name="status" label="Status">
              <select
                id="status" name="status"
                className="form-select"
                value={form.status} onChange={handleChange}
              >
                {(isEdit ? EXPO_STATUSES_EDIT : EXPO_STATUSES_CREATE).map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </Field>

            <Field name="capacity" label="Capacity (attendees)">
              <input
                id="capacity" name="capacity" type="number"
                className={`form-input ${errors.capacity ? 'input-error' : ''}`}
                value={form.capacity} onChange={handleChange}
                min={0} placeholder="0 = unlimited"
              />
            </Field>
          </div>
        </section>

        {/* Dates */}
        <section className="form-section">
          <h2 className="form-section-title">Dates</h2>
          <div className="form-row">
            <Field name="startDate" label="Start Date" required>
              <input
                id="startDate" name="startDate" type="date"
                className={`form-input ${errors.startDate ? 'input-error' : ''}`}
                value={form.startDate} onChange={handleChange}
              />
            </Field>

            <Field name="endDate" label="End Date" required>
              <input
                id="endDate" name="endDate" type="date"
                className={`form-input ${errors.endDate ? 'input-error' : ''}`}
                value={form.endDate} onChange={handleChange}
                min={form.startDate || undefined}
              />
            </Field>
          </div>
        </section>

        {/* Location */}
        <section className="form-section">
          <h2 className="form-section-title">Location / Venue</h2>
          <div className="form-row">
            <Field name="location.venue" label="Venue Name" required>
              <input
                id="location.venue" name="location.venue" type="text"
                className={`form-input ${errors['location.venue'] ? 'input-error' : ''}`}
                value={form['location.venue']} onChange={handleChange}
                placeholder="e.g., Grand Convention Center"
              />
            </Field>
            <Field name="location.city" label="City" required>
              <input
                id="location.city" name="location.city" type="text"
                className={`form-input ${errors['location.city'] ? 'input-error' : ''}`}
                value={form['location.city']} onChange={handleChange}
                placeholder="e.g., New York"
              />
            </Field>
          </div>
          <div className="form-row">
            <Field name="location.country" label="Country" required>
              <input
                id="location.country" name="location.country" type="text"
                className={`form-input ${errors['location.country'] ? 'input-error' : ''}`}
                value={form['location.country']} onChange={handleChange}
                placeholder="e.g., USA"
              />
            </Field>
            <Field name="location.address" label="Street Address">
              <input
                id="location.address" name="location.address" type="text"
                className="form-input"
                value={form['location.address']} onChange={handleChange}
                placeholder="e.g., 100 Convention Ave, Suite 200"
              />
            </Field>
          </div>
        </section>

        {/* Media */}
        <section className="form-section">
          <h2 className="form-section-title">Media (Optional)</h2>
          <Field name="bannerUrl" label="Banner Image URL">
            <input
              id="bannerUrl" name="bannerUrl" type="url"
              className="form-input"
              value={form.bannerUrl} onChange={handleChange}
              placeholder="https://example.com/banner.jpg"
            />
          </Field>
          {form.bannerUrl && (
            <div className="banner-preview">
              <img src={form.bannerUrl} alt="Banner preview" onError={(e) => { e.target.style.display = 'none'; }} />
            </div>
          )}
        </section>

        {/* Actions */}
        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={() => onNavigate('expo-list')} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save Changes' : 'Create Expo')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ExpoFormPage;
