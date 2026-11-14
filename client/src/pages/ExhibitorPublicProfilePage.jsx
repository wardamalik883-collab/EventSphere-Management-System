/**
 * ExhibitorPublicProfilePage.jsx — Public Exhibitor Profile Detail
 * Task 11: Full public view of an exhibitor's profile, expos, and booth info.
 */

import React, { useState, useEffect } from 'react';
import { getExhibitorPublicProfile } from '../services/directoryService';
import { useAuth } from '../context/AuthContext';
import '../styles/ExhibitorPublicProfilePage.css';

const ExhibitorPublicProfilePage = ({ profileId, onNavigate }) => {
  const { isAuthenticated, role } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profileId) {
      setError('No profile ID provided.');
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await getExhibitorPublicProfile(profileId);
        setProfile(res.data.data);
      } catch (err) {
        if (err.response?.status === 404) {
          setError('Exhibitor profile not found.');
        } else if (err.response?.status === 400) {
          setError('Invalid profile ID.');
        } else {
          setError(err.response?.data?.message || 'Failed to load profile.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [profileId]);

  const canMessage = isAuthenticated && (role === 'attendee' || role === 'organizer');

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

  if (loading) {
    return (
      <div className="pub-profile-loading">
        <div className="dashboard-spinner" />
        <p>Loading profile…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pub-profile-error">
        <span>⚠️</span>
        <p>{error}</p>
        <button className="btn-back" onClick={() => onNavigate('exhibitor-directory')}>
          ← Back to Directory
        </button>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="pub-profile-page">
      {/* Back link */}
      <button className="btn-back-link" onClick={() => onNavigate('exhibitor-directory')}>
        ← Back to Directory
      </button>

      {/* Hero Section */}
      <div className="pub-profile-hero">
        <div className="pub-profile-logo-wrap">
          {profile.logoUrl ? (
            <img src={profile.logoUrl} alt={`${profile.companyName} logo`} className="pub-profile-logo" />
          ) : (
            <div className="pub-profile-logo-placeholder">
              {profile.companyName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="pub-profile-hero-info">
          <h1 className="pub-profile-company-name">{profile.companyName}</h1>
          <p className="pub-profile-exhibitor-name">👤 {profile.exhibitorName}</p>

          <div className="pub-profile-tags">
            <span className="pub-tag pub-tag-industry">{profile.industry}</span>
            {profile.location && (
              <span className="pub-tag pub-tag-location">📍 {profile.location}</span>
            )}
          </div>

          <div className="pub-profile-actions">
            {profile.companyWebsite && (
              <a
                href={profile.companyWebsite.startsWith('http') ? profile.companyWebsite : `https://${profile.companyWebsite}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-website"
              >
                🌐 Visit Website
              </a>
            )}
            {canMessage && (
              <button
                className="btn-message-primary"
                onClick={() =>
                  onNavigate('messages', {
                    prefill: {
                      recipientId: profile.userId,
                      recipientName: profile.companyName,
                    },
                  })
                }
              >
                ✉️ Send Message
              </button>
            )}
          </div>
        </div>
      </div>

      {/* About */}
      <section className="pub-profile-section">
        <h2 className="section-title">About</h2>
        <p className="pub-profile-description">{profile.companyDescription}</p>
        <p className="pub-profile-member-since">
          Member since: <strong>{formatDate(profile.memberSince)}</strong>
        </p>
      </section>

      {/* Products / Services */}
      {profile.products && profile.products.length > 0 && (
        <section className="pub-profile-section">
          <h2 className="section-title">Products &amp; Services</h2>
          <div className="products-grid">
            {profile.products.map((p) => (
              <div key={p._id} className="product-card">
                <h4 className="product-name">{p.name}</h4>
                {p.category && <span className="product-category">{p.category}</span>}
                {p.description && <p className="product-description">{p.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Participating Expos */}
      {profile.participatingExpos && profile.participatingExpos.length > 0 && (
        <section className="pub-profile-section">
          <h2 className="section-title">Participating Expos</h2>
          <div className="expo-participation-list">
            {profile.participatingExpos.map((expo) => (
              <div key={expo.expoId} className="expo-participation-card">
                <div className="expo-part-info">
                  <h4 className="expo-part-title">{expo.title}</h4>
                  {expo.venue && <p className="expo-part-venue">📍 {expo.venue}</p>}
                  <p className="expo-part-dates">
                    📅 {formatDate(expo.startDate)} – {formatDate(expo.endDate)}
                  </p>
                </div>
                <button
                  className="btn-view-expo"
                  onClick={() => onNavigate('expo-detail', { expoId: expo.expoId })}
                >
                  View Expo
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Booth Information */}
      {profile.boothInfo && profile.boothInfo.length > 0 && (
        <section className="pub-profile-section">
          <h2 className="section-title">Booth Information</h2>
          <div className="booth-info-list">
            {profile.boothInfo.map((booth, idx) => (
              <div key={idx} className="booth-info-card">
                <div className="booth-info-number">
                  <span className="booth-label">Booth</span>
                  <span className="booth-number">{booth.boothNumber}</span>
                </div>
                <div className="booth-info-details">
                  {booth.expoTitle && <p>📋 {booth.expoTitle}</p>}
                  {booth.zone && <p>Zone: <strong>{booth.zone}</strong></p>}
                  {booth.type && <p>Type: <strong>{booth.type}</strong></p>}
                  {booth.dimensions && (
                    <p>
                      Size: <strong>{booth.dimensions.width}×{booth.dimensions.length} {booth.dimensions.unit}</strong>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* No public data fallback */}
      {(!profile.participatingExpos || profile.participatingExpos.length === 0) &&
        (!profile.boothInfo || profile.boothInfo.length === 0) &&
        (!profile.products || profile.products.length === 0) && (
        <div className="pub-profile-no-data">
          <p>This exhibitor has not yet published additional details.</p>
        </div>
      )}
    </div>
  );
};

export default ExhibitorPublicProfilePage;
