/**
 * ExpoScheduleSection.jsx — Embedded Schedule & Sessions section for ExpoDetailPage
 *
 * Provides a preview of the expo's schedule directly inside the Expo Details page.
 */

import React, { useState, useEffect } from 'react';
import { getExpoSchedule } from '../services/sessionService';

const ExpoScheduleSection = ({ expoId, canManage, onNavigate }) => {
  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!expoId) return;
    let isMounted = true;
    const loadSchedule = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getExpoSchedule(expoId);
        if (isMounted) setScheduleData(res.data);
      } catch (err) {
        if (isMounted) setError(err.message || 'Could not load schedule preview.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadSchedule();
    return () => { isMounted = false; };
  }, [expoId]);

  const totalSessions = scheduleData?.totalSessions || 0;
  const scheduleDays = scheduleData?.schedule || [];

  return (
    <section className="detail-section expo-schedule-embed-section">
      <div className="section-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 className="detail-section-title" style={{ margin: 0 }}>📅 Event Program & Sessions</h2>
          <small style={{ color: '#94a3b8' }}>
            {totalSessions > 0 ? `${totalSessions} sessions scheduled across ${scheduleDays.length} day(s)` : 'Program timeline'}
          </small>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {totalSessions > 0 && onNavigate && (
            <button
              className="btn-secondary"
              style={{ fontSize: '0.85rem', padding: '0.45rem 0.85rem' }}
              onClick={() => onNavigate('expo-schedule', { expoId })}
            >
              View Full Schedule →
            </button>
          )}

          {canManage && onNavigate && (
            <button
              className="btn-primary"
              style={{ fontSize: '0.85rem', padding: '0.45rem 0.85rem' }}
              onClick={() => onNavigate('organizer-sessions', { expoId })}
            >
              + Manage Sessions
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
          <p>Loading schedule preview...</p>
        </div>
      ) : error ? (
        <div style={{ padding: '1.25rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#94a3b8' }}>
          <p style={{ margin: 0 }}>⚠️ {error}</p>
        </div>
      ) : totalSessions === 0 ? (
        <div style={{ padding: '2rem 1.5rem', background: '#0f172a', border: '1px dashed #334155', borderRadius: '10px', textAlign: 'center', color: '#94a3b8' }}>
          <p style={{ margin: '0 0 0.5rem', fontSize: '1.05rem', color: '#cbd5e1' }}>No sessions announced yet.</p>
          <small>The event schedule and speaker lineup will be published closer to the event date.</small>
          {canManage && onNavigate && (
            <div style={{ marginTop: '1rem' }}>
              <button
                className="btn-primary"
                style={{ fontSize: '0.85rem', padding: '0.45rem 0.85rem' }}
                onClick={() => onNavigate('organizer-sessions', { expoId })}
              >
                + Add First Session
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {scheduleDays.slice(0, 2).map((day) => (
            <div key={day.date} style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '1rem 1.25rem' }}>
              <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.95rem', marginBottom: '0.65rem' }}>
                {day.dayLabel}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {day.sessions.slice(0, 3).map((sess) => (
                  <div
                    key={sess._id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#1e293b',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      borderLeft: '4px solid #6366f1',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                    }}
                  >
                    <div>
                      <strong style={{ color: '#f8fafc', fontSize: '0.9rem', display: 'block' }}>{sess.title}</strong>
                      <small style={{ color: '#94a3b8' }}>
                        🗣️ {sess.speaker?.name || 'TBA'} {sess.speaker?.company ? `(${sess.speaker.company})` : ''} • 📍 {sess.room}
                      </small>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600 }}>
                        {new Date(sess.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(sess.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {totalSessions > 6 && onNavigate && (
            <button
              className="btn-secondary"
              style={{ width: '100%', padding: '0.6rem' }}
              onClick={() => onNavigate('expo-schedule', { expoId })}
            >
              View all {totalSessions} sessions on full schedule →
            </button>
          )}
        </div>
      )}
    </section>
  );
};

export default ExpoScheduleSection;
