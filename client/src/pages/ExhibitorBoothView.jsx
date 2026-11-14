/**
 * ExhibitorBoothView.jsx — Exhibitor Allocated Booth & Floor-Plan Viewer
 *
 * Allows authenticated exhibitors to:
 *  - View all booths currently allocated to them across expos.
 *  - Inspect their booth specifications (number, dimensions, area, zone, price, status).
 *  - View the interactive visual floor plan for the selected expo, highlighting their own booth.
 *  - Check status of pending allocations with quick links to their applications.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { getMyBooths, getExpoBooths } from '../services/boothService';
import '../styles/ExhibitorBoothView.css';

const STATUS_COLORS = {
  available: '#10b981',
  reserved: '#f59e0b',
  allocated: '#3b82f6',
  occupied: '#6366f1',
  maintenance: '#64748b',
};

const ExhibitorBoothView = ({ onNavigate }) => {
  const [myBooths, setMyBooths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selected booth to explore floor plan
  const [selectedBooth, setSelectedBooth] = useState(null);
  const [floorPlanData, setFloorPlanData] = useState(null);
  const [floorLoading, setFloorLoading] = useState(false);
  const [floorError, setFloorError] = useState(null);

  const fetchMyBooths = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getMyBooths();
      const booths = res.data?.booths || [];
      setMyBooths(booths);
      if (booths.length > 0 && !selectedBooth) {
        setSelectedBooth(booths[0]);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch your assigned booths.');
    } finally {
      setLoading(false);
    }
  }, [selectedBooth]);

  useEffect(() => {
    fetchMyBooths();
  }, [fetchMyBooths]);

  // When selected booth changes, load the full floor plan of its expo
  useEffect(() => {
    if (!selectedBooth?.expo?._id && !selectedBooth?.expo) return;
    const expoId = selectedBooth.expo._id || selectedBooth.expo;

    let isMounted = true;
    const loadFloor = async () => {
      try {
        setFloorLoading(true);
        setFloorError(null);
        const res = await getExpoBooths(expoId);
        if (isMounted) {
          setFloorPlanData(res.data);
        }
      } catch (err) {
        if (isMounted) {
          setFloorError(err.message || 'Could not load floor plan for this expo.');
        }
      } finally {
        if (isMounted) setFloorLoading(false);
      }
    };

    loadFloor();
    return () => { isMounted = false; };
  }, [selectedBooth]);

  if (loading) {
    return (
      <div className="exhibitor-booth-layout">
        <div className="booth-loading-card">
          <div className="spinner"></div>
          <p>Loading your assigned booth spaces...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="exhibitor-booth-layout">
        <div className="booth-error-card">
          <span className="error-icon">⚠️</span>
          <h2>Unable to Load Booth Data</h2>
          <p>{error}</p>
          <button className="btn-primary" onClick={fetchMyBooths}>Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="exhibitor-booth-layout">
      {/* Page Header */}
      <div className="exhibitor-booth-header">
        <div>
          <h1>My Exhibition Spaces & Floor Plan</h1>
          <p className="subtitle">
            Inspect your allocated booth spaces, review spatial dimensions, and visualize your location on the expo floor plan.
          </p>
        </div>

        {myBooths.length > 0 && (
          <div className="booth-counter-badge">
            <span className="count-num">{myBooths.length}</span>
            <span className="count-lbl">{myBooths.length === 1 ? 'Allocated Booth' : 'Allocated Booths'}</span>
          </div>
        )}
      </div>

      {myBooths.length === 0 ? (
        <div className="booth-empty-card">
          <span className="empty-icon">🎪</span>
          <h2>No Booths Assigned Yet</h2>
          <p>
            You do not currently have any booth spaces allocated. Once an expo organizer approves your exhibitor application and assigns a booth, it will appear here.
          </p>
          <div className="empty-actions">
            {onNavigate && (
              <>
                <button
                  className="btn-primary"
                  onClick={() => onNavigate('exhibitor-applications')}
                >
                  View My Applications
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => onNavigate('exhibitor-expos')}
                >
                  Browse Available Expos
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="exhibitor-booth-content">
          {/* Booths Selection Cards */}
          <div className="booth-cards-grid">
            {myBooths.map((b) => {
              const isSelected = selectedBooth?._id === b._id;
              const expoTitle = b.expo?.title || 'Exhibition';
              const area = (b.dimensions?.width || 0) * (b.dimensions?.length || 0);

              return (
                <div
                  key={b._id}
                  className={`my-booth-card ${isSelected ? 'active-booth-card' : ''}`}
                  onClick={() => setSelectedBooth(b)}
                >
                  <div className="my-booth-top">
                    <span className="my-booth-tag">📍 Booth {b.boothNumber}</span>
                    <span className="my-booth-status-pill">{b.status}</span>
                  </div>

                  <h3 className="my-booth-expo-title">{expoTitle}</h3>

                  <div className="my-booth-specs-row">
                    <div className="spec-item">
                      <span className="spec-lbl">Zone</span>
                      <strong className="spec-val">{b.zone || 'General'}</strong>
                    </div>
                    <div className="spec-item">
                      <span className="spec-lbl">Dimensions</span>
                      <strong className="spec-val">
                        {b.dimensions?.width}m × {b.dimensions?.length}m
                      </strong>
                    </div>
                    <div className="spec-item">
                      <span className="spec-lbl">Total Area</span>
                      <strong className="spec-val">{area} m²</strong>
                    </div>
                    <div className="spec-item">
                      <span className="spec-lbl">Type</span>
                      <strong className="spec-val">{b.type ? b.type.toUpperCase() : 'STANDARD'}</strong>
                    </div>
                  </div>

                  <div className="my-booth-card-footer">
                    <span className="view-floor-hint">
                      {isSelected ? '✓ Viewing floor plan' : 'Click to view on floor plan →'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Floor Plan Visualization for Selected Booth */}
          {selectedBooth && (
            <div className="floor-plan-section">
              <div className="floor-plan-header">
                <div>
                  <h2>
                    🗺️ Floor Plan — {selectedBooth.expo?.title || 'Selected Expo'}
                  </h2>
                  <p className="floor-subtitle">
                    Your assigned space is highlighted in blue below.
                  </p>
                </div>

                <div className="floor-legend">
                  <div className="legend-item">
                    <span className="legend-dot" style={{ background: '#3b82f6' }}></span>
                    <span>Your Space ({selectedBooth.boothNumber})</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot" style={{ background: '#10b981' }}></span>
                    <span>Available</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot" style={{ background: '#6366f1' }}></span>
                    <span>Other Exhibitor</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot" style={{ background: '#f59e0b' }}></span>
                    <span>Reserved</span>
                  </div>
                </div>
              </div>

              {floorLoading ? (
                <div className="floor-loading-state">
                  <div className="spinner"></div>
                  <p>Rendering interactive floor map...</p>
                </div>
              ) : floorError ? (
                <div className="floor-error-state">
                  <p>⚠️ {floorError}</p>
                </div>
              ) : floorPlanData?.zones ? (
                <div className="exhibitor-zones-wrapper">
                  {Object.keys(floorPlanData.zones).map((zoneName) => {
                    const zoneBooths = floorPlanData.zones[zoneName] || [];
                    return (
                      <div key={zoneName} className="exhibitor-zone-card">
                        <div className="exhibitor-zone-header">
                          <h4>📍 {zoneName}</h4>
                          <span className="zone-meta">{zoneBooths.length} spaces</span>
                        </div>

                        <div className="exhibitor-booth-grid">
                          {zoneBooths.map((booth) => {
                            const isMine = booth._id === selectedBooth._id;
                            const isAssigned = !!booth.assignedTo;

                            return (
                              <div
                                key={booth._id}
                                className={`exhibitor-tile ${isMine ? 'tile-mine' : ''} status-${booth.status}`}
                                style={{
                                  borderTopColor: isMine
                                    ? '#3b82f6'
                                    : STATUS_COLORS[booth.status] || '#64748b',
                                }}
                              >
                                <div className="tile-top-row">
                                  <span className="tile-number">{booth.boothNumber}</span>
                                  {isMine && <span className="mine-badge">YOU</span>}
                                </div>

                                <div className="tile-dims-text">
                                  {booth.dimensions?.width}m × {booth.dimensions?.length}m
                                </div>

                                <div className="tile-status-tag">
                                  {isMine ? (
                                    <strong className="text-mine">Assigned to You</strong>
                                  ) : isAssigned ? (
                                    <span className="text-occupied">Occupied</span>
                                  ) : (
                                    <span className="text-avail">{booth.status}</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExhibitorBoothView;
