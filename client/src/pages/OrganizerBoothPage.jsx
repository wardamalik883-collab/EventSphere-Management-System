/**
 * OrganizerBoothPage.jsx — Organizer Booth & Floor-Plan Management
 *
 * Full-featured interactive floor-plan and booth inventory control:
 *  - Visual floor-plan grid grouped by zones with status color-coding
 *  - Inventory summary metrics (total, available, allocated, reserved)
 *  - Zone filtering, search, and view switcher (Visual Grid vs Table)
 *  - Create & Edit Booth modal
 *  - Booth Allocation to approved applications & unallocation controls
 *  - Safe deletion checks
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  getExpoBooths,
  createBooth,
  updateBooth,
  deleteBooth,
  allocateBooth,
  unallocateBooth,
} from '../services/boothService';
import { listOrganizerApplications } from '../services/exhibitorService';
import { listExpos } from '../services/expoService';
import '../styles/OrganizerBoothPage.css';

const BOOTH_TYPES = ['standard', 'corner', 'island', 'premium'];

const STATUS_COLORS = {
  available: '#10b981',
  reserved: '#f59e0b',
  allocated: '#3b82f6',
  occupied: '#6366f1',
  maintenance: '#64748b',
};

const OrganizerBoothPage = ({ expoId: initialExpoId, onNavigate }) => {
  const [selectedExpoId, setSelectedExpoId] = useState(initialExpoId || '');
  const [myExpos, setMyExpos] = useState([]);
  const [floorData, setFloorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingBooth, setEditingBooth] = useState(null);
  const [allocatingBooth, setAllocatingBooth] = useState(null);
  const [approvedApplications, setApprovedApplications] = useState([]);
  const [selectedAppId, setSelectedAppId] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // Form state for Create / Edit
  const [boothForm, setBoothForm] = useState({
    boothNumber: '',
    width: 3,
    length: 3,
    unit: 'meters',
    zone: 'Main Hall',
    type: 'standard',
    price: 1000,
  });

  // Load organizer's expos for the selector
  useEffect(() => {
    listExpos({ limit: 50 })
      .then((res) => {
        const expos = res.data || [];
        setMyExpos(expos);
        if (!selectedExpoId && expos.length > 0) {
          setSelectedExpoId(expos[0]._id);
        }
      })
      .catch((err) => console.error('Failed to load expos:', err));
  }, [selectedExpoId]);

  // Load booths for the selected expo
  const fetchBooths = useCallback(async () => {
    if (!selectedExpoId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getExpoBooths(selectedExpoId, {
        search,
        zone: zoneFilter,
      });
      setFloorData(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load booth floor plan');
    } finally {
      setLoading(false);
    }
  }, [selectedExpoId, search, zoneFilter]);

  useEffect(() => {
    fetchBooths();
  }, [fetchBooths]);

  // Load approved applications for allocation modal
  const handleOpenAllocate = async (booth) => {
    setAllocatingBooth(booth);
    setSelectedAppId('');
    try {
      const res = await listOrganizerApplications({
        expoId: selectedExpoId,
        status: 'approved',
      });
      setApprovedApplications(res.data || []);
    } catch (err) {
      console.error('Failed to load approved applications:', err);
    }
  };

  const handleAllocateSubmit = async (e) => {
    e.preventDefault();
    if (!allocatingBooth || !selectedAppId) return;

    setActionLoading(true);
    setFeedbackMsg(null);
    try {
      await allocateBooth(allocatingBooth._id, selectedAppId);
      setFeedbackMsg({ type: 'success', text: `Booth ${allocatingBooth.boothNumber} allocated successfully!` });
      setAllocatingBooth(null);
      fetchBooths();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.data?.message || err.message || 'Failed to allocate booth' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnallocate = async (booth) => {
    if (!window.confirm(`Release allocation for Booth ${booth.boothNumber}? This will unassign the exhibitor.`)) return;
    try {
      await unallocateBooth(booth._id);
      setFeedbackMsg({ type: 'success', text: `Booth ${booth.boothNumber} is now available.` });
      fetchBooths();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.data?.message || err.message || 'Failed to unallocate' });
    }
  };

  const handleSaveBooth = async (e) => {
    e.preventDefault();
    if (!selectedExpoId) return;

    setActionLoading(true);
    setFeedbackMsg(null);
    try {
      const payload = {
        boothNumber: boothForm.boothNumber.trim(),
        dimensions: {
          width: Number(boothForm.width),
          length: Number(boothForm.length),
          unit: boothForm.unit,
        },
        zone: boothForm.zone.trim(),
        type: boothForm.type,
        price: Number(boothForm.price),
      };

      if (editingBooth) {
        await updateBooth(editingBooth._id, payload);
        setFeedbackMsg({ type: 'success', text: `Booth ${payload.boothNumber} updated successfully!` });
        setEditingBooth(null);
      } else {
        await createBooth(selectedExpoId, payload);
        setFeedbackMsg({ type: 'success', text: `Booth ${payload.boothNumber} created successfully!` });
        setIsCreateOpen(false);
      }
      fetchBooths();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.data?.message || err.message || 'Error saving booth' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (booth) => {
    if (!window.confirm(`Are you sure you want to delete Booth ${booth.boothNumber}?`)) return;
    try {
      await deleteBooth(booth._id);
      setFeedbackMsg({ type: 'success', text: `Booth ${booth.boothNumber} deleted.` });
      fetchBooths();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.data?.message || err.message || 'Cannot delete booth' });
    }
  };

  const openCreateModal = () => {
    setBoothForm({
      boothNumber: '',
      width: 3,
      length: 3,
      unit: 'meters',
      zone: zoneFilter || 'Main Hall',
      type: 'standard',
      price: 1000,
    });
    setEditingBooth(null);
    setIsCreateOpen(true);
  };

  const openEditModal = (booth) => {
    setBoothForm({
      boothNumber: booth.boothNumber,
      width: booth.dimensions?.width || 3,
      length: booth.dimensions?.length || 3,
      unit: booth.dimensions?.unit || 'meters',
      zone: booth.zone || 'General',
      type: booth.type || 'standard',
      price: booth.price || 0,
    });
    setEditingBooth(booth);
    setIsCreateOpen(true);
  };

  const stats = floorData?.stats || { total: 0, available: 0, allocated: 0, reserved: 0 };
  const occupancyRate = stats.total > 0 ? Math.round(((stats.allocated + stats.occupied) / stats.total) * 100) : 0;
  const zonesList = floorData?.zones ? Object.keys(floorData.zones) : [];

  return (
    <div className="booth-page-layout">
      {/* Top Header */}
      <div className="booth-header-bar">
        <div>
          <h1>Booth & Floor-Plan Management</h1>
          <p className="booth-subtitle">
            Configure physical floor zones, manage booth inventory, and allocate spaces to approved exhibitors.
          </p>
        </div>

        <div className="header-actions">
          {myExpos.length > 0 && (
            <select
              className="expo-picker"
              value={selectedExpoId}
              onChange={(e) => setSelectedExpoId(e.target.value)}
            >
              {myExpos.map((exp) => (
                <option key={exp._id} value={exp._id}>
                  🏛️ {exp.title}
                </option>
              ))}
            </select>
          )}

          <button className="btn-primary" onClick={openCreateModal} disabled={!selectedExpoId}>
            + Add Booth
          </button>
        </div>
      </div>

      {/* Feedback banner */}
      {feedbackMsg && (
        <div className={`booth-feedback ${feedbackMsg.type === 'error' ? 'feedback-error' : 'feedback-success'}`}>
          {feedbackMsg.type === 'error' ? '⚠️' : '✅'} {feedbackMsg.text}
          <button className="btn-close-fb" onClick={() => setFeedbackMsg(null)}>✕</button>
        </div>
      )}

      {/* Metrics Banner */}
      <section className="booth-stats-strip">
        <div className="booth-stat-card">
          <span className="stat-label">Total Inventory</span>
          <strong className="stat-val">{stats.total}</strong>
          <span className="stat-sub">Configured Booths</span>
        </div>
        <div className="booth-stat-card border-green">
          <span className="stat-label">Available</span>
          <strong className="stat-val text-green">{stats.available}</strong>
          <span className="stat-sub">Ready for allocation</span>
        </div>
        <div className="booth-stat-card border-blue">
          <span className="stat-label">Allocated</span>
          <strong className="stat-val text-blue">{stats.allocated + stats.occupied}</strong>
          <span className="stat-sub">Assigned to exhibitors</span>
        </div>
        <div className="booth-stat-card border-amber">
          <span className="stat-label">Reserved</span>
          <strong className="stat-val text-amber">{stats.reserved}</strong>
          <span className="stat-sub">Held spaces</span>
        </div>
        <div className="booth-stat-card">
          <span className="stat-label">Occupancy Rate</span>
          <strong className="stat-val">{occupancyRate}%</strong>
          <div className="occupancy-bar">
            <div className="occupancy-fill" style={{ width: `${occupancyRate}%` }}></div>
          </div>
        </div>
      </section>

      {/* Filter and View Controls */}
      <div className="booth-controls-bar">
        <div className="filter-group">
          <input
            type="text"
            className="search-input"
            placeholder="Search booth number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="zone-select"
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
          >
            <option value="">All Zones</option>
            {zonesList.map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
        </div>

        <div className="view-switcher">
          <button
            className={`btn-toggle ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
          >
            🗺️ Visual Floor Plan
          </button>
          <button
            className={`btn-toggle ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
          >
            📋 Inventory Table
          </button>
        </div>
      </div>

      {/* Floor Plan Content */}
      {loading ? (
        <div className="booth-loading">
          <div className="booth-spinner"></div>
          <p>Generating floor-plan representation...</p>
        </div>
      ) : error ? (
        <div className="booth-error">
          <span className="error-icon">⚠️</span>
          <h2>Unable to Load Floor Plan</h2>
          <p>{error}</p>
          <button className="btn-primary" onClick={fetchBooths}>Try Again</button>
        </div>
      ) : stats.total === 0 ? (
        <div className="booth-empty-state">
          <span className="empty-icon">🗺️</span>
          <h3>No Booths Configured</h3>
          <p>Start creating booth spaces to build out the floor plan for this expo.</p>
          <button className="btn-primary" onClick={openCreateModal}>
            Create First Booth
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Visual Floor Plan Grid grouped by Zones */
        <div className="floor-plan-zones-container">
          {zonesList.map((zoneName) => {
            const zoneBooths = floorData.zones[zoneName] || [];
            return (
              <div key={zoneName} className="zone-card">
                <div className="zone-header">
                  <h3>📍 {zoneName}</h3>
                  <span className="zone-count">{zoneBooths.length} spaces</span>
                </div>

                <div className="booth-grid">
                  {zoneBooths.map((booth) => (
                    <div
                      key={booth._id}
                      className={`booth-tile status-${booth.status}`}
                      style={{ borderTopColor: STATUS_COLORS[booth.status] }}
                    >
                      <div className="tile-top">
                        <span className="booth-num">{booth.boothNumber}</span>
                        <span className="booth-type-tag">{booth.type}</span>
                      </div>

                      <div className="tile-dims">
                        {booth.dimensions?.width}m × {booth.dimensions?.length}m
                      </div>

                      <div className="tile-status-row">
                        <span
                          className="status-dot"
                          style={{ background: STATUS_COLORS[booth.status] }}
                        ></span>
                        <span className="status-name">{booth.status}</span>
                      </div>

                      {booth.assignedTo && (
                        <div className="tile-assigned-box">
                          <strong>{booth.application?.exhibitorProfile?.companyName || booth.assignedTo.name}</strong>
                        </div>
                      )}

                      <div className="tile-actions">
                        {['available', 'reserved'].includes(booth.status) && !booth.assignedTo ? (
                          <button
                            className="btn-tile-action btn-allocate"
                            onClick={() => handleOpenAllocate(booth)}
                          >
                            Assign Exhibitor
                          </button>
                        ) : booth.assignedTo ? (
                          <button
                            className="btn-tile-action btn-unallocate"
                            onClick={() => handleUnallocate(booth)}
                          >
                            Release Space
                          </button>
                        ) : null}

                        <div className="tile-btns-row">
                          <button
                            className="btn-icon"
                            title="Edit specifications"
                            onClick={() => openEditModal(booth)}
                          >
                            ✏️
                          </button>
                          {!booth.assignedTo && (
                            <button
                              className="btn-icon btn-danger"
                              title="Delete booth"
                              onClick={() => handleDelete(booth)}
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Inventory Table View */
        <div className="booth-table-card">
          <table className="booth-table">
            <thead>
              <tr>
                <th>Booth Number</th>
                <th>Zone</th>
                <th>Type</th>
                <th>Dimensions</th>
                <th>Price</th>
                <th>Status</th>
                <th>Assigned Exhibitor</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {floorData.booths.map((booth) => (
                <tr key={booth._id}>
                  <td><strong>{booth.boothNumber}</strong></td>
                  <td>{booth.zone}</td>
                  <td><span className="booth-type-tag">{booth.type}</span></td>
                  <td>{booth.dimensions?.width} × {booth.dimensions?.length} {booth.dimensions?.unit}</td>
                  <td>${Number(booth.price).toLocaleString()}</td>
                  <td>
                    <span className={`status-pill status-${booth.status}`}>
                      {booth.status}
                    </span>
                  </td>
                  <td>
                    {booth.assignedTo ? (
                      <div className="exhibitor-cell">
                        <strong>{booth.application?.exhibitorProfile?.companyName || booth.assignedTo.name}</strong>
                        <small>{booth.assignedTo.email}</small>
                      </div>
                    ) : (
                      <span className="unassigned-text">— Available —</span>
                    )}
                  </td>
                  <td>
                    <div className="table-actions">
                      {booth.assignedTo ? (
                        <button
                          className="btn-secondary btn-sm"
                          onClick={() => handleUnallocate(booth)}
                        >
                          Release
                        </button>
                      ) : (
                        <button
                          className="btn-primary btn-sm"
                          onClick={() => handleOpenAllocate(booth)}
                        >
                          Assign
                        </button>
                      )}
                      <button
                        className="btn-secondary btn-sm"
                        onClick={() => openEditModal(booth)}
                      >
                        Edit
                      </button>
                      {!booth.assignedTo && (
                        <button
                          className="btn-danger btn-sm"
                          onClick={() => handleDelete(booth)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Create / Edit Booth */}
      {isCreateOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingBooth ? `Edit Booth ${editingBooth.boothNumber}` : 'Create New Booth'}</h2>
              <button className="modal-close-btn" onClick={() => setIsCreateOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveBooth}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Booth Identifier / Number *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="e.g., A-101, B-205"
                    value={boothForm.boothNumber}
                    onChange={(e) => setBoothForm({ ...boothForm, boothNumber: e.target.value })}
                  />
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Floor Zone</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g., Main Hall, Innovation Alley"
                      value={boothForm.zone}
                      onChange={(e) => setBoothForm({ ...boothForm, zone: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Booth Type</label>
                    <select
                      className="form-control"
                      value={boothForm.type}
                      onChange={(e) => setBoothForm({ ...boothForm, type: e.target.value })}
                    >
                      {BOOTH_TYPES.map((t) => (
                        <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row-3">
                  <div className="form-group">
                    <label>Width ({boothForm.unit})</label>
                    <input
                      type="number"
                      min={1}
                      className="form-control"
                      value={boothForm.width}
                      onChange={(e) => setBoothForm({ ...boothForm, width: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Length ({boothForm.unit})</label>
                    <input
                      type="number"
                      min={1}
                      className="form-control"
                      value={boothForm.length}
                      onChange={(e) => setBoothForm({ ...boothForm, length: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Price ($)</label>
                    <input
                      type="number"
                      min={0}
                      className="form-control"
                      value={boothForm.price}
                      onChange={(e) => setBoothForm({ ...boothForm, price: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Saving...' : (editingBooth ? 'Update Booth' : 'Create Booth')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Allocate Booth to Approved Exhibitor */}
      {allocatingBooth && (
        <div className="modal-overlay" onClick={() => setAllocatingBooth(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="modal-sub">BOOTH ALLOCATION</span>
                <h2>Assign Booth {allocatingBooth.boothNumber}</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setAllocatingBooth(null)}>✕</button>
            </div>

            <form onSubmit={handleAllocateSubmit}>
              <div className="modal-body">
                <div className="booth-brief-card">
                  <div><span>Zone:</span> <strong>{allocatingBooth.zone}</strong></div>
                  <div><span>Dimensions:</span> <strong>{allocatingBooth.dimensions?.width}m × {allocatingBooth.dimensions?.length}m</strong></div>
                  <div><span>Type:</span> <strong>{allocatingBooth.type?.toUpperCase()}</strong></div>
                </div>

                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label>Select Approved Exhibitor Application *</label>
                  {approvedApplications.length === 0 ? (
                    <div className="empty-notice">
                      <p>⚠️ No approved applications found for this expo.</p>
                      <small>Go to Applications Review and approve an exhibitor before assigning booth space.</small>
                    </div>
                  ) : (
                    <div className="app-selection-list">
                      {approvedApplications.map((app) => (
                        <label
                          key={app._id}
                          className={`app-select-card ${selectedAppId === app._id ? 'selected' : ''}`}
                        >
                          <input
                            type="radio"
                            name="selectedApp"
                            value={app._id}
                            checked={selectedAppId === app._id}
                            onChange={() => setSelectedAppId(app._id)}
                          />
                          <div className="app-select-info">
                            <strong>{app.exhibitorProfile?.companyName || app.exhibitor?.name}</strong>
                            <span>Requested size: {app.boothPreference?.size?.toUpperCase()}</span>
                            {app.boothPreference?.preferredLocation && (
                              <small>Prefers: {app.boothPreference.preferredLocation}</small>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setAllocatingBooth(null)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={actionLoading || !selectedAppId || approvedApplications.length === 0}
                >
                  {actionLoading ? 'Assigning Space...' : 'Confirm Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizerBoothPage;
