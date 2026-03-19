import { useState, useEffect, useRef } from 'react';
import { Plus, Wrench, CheckCircle, Clock, AlertTriangle, Eye, Pencil, Upload, X, Camera, Trash2 } from 'lucide-react';
import { getMaintenanceRequests, addMaintenanceRequest, updateMaintenanceRequest, deleteMaintenanceRequest, getProperties, getTenants, uploadAttachment, deleteAttachmentsForEntity } from '../store';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import Pagination from '../components/Pagination';
import FileUpload from '../components/FileUpload';
import UpgradeModal from '../components/UpgradeModal';
import { CardListSkeleton } from '../components/SkeletonLoader';

export default function Maintenance({ showToast, refresh, refreshKey, onNavigate }) {
  const { user, checkLimit, currentPlan, refreshStorageUsage } = useAuth();
  const userId = user?.id;
  const [showModal, setShowModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [viewRequest, setViewRequest] = useState(null);
  const [filter, setFilter] = useState('all');
  const [upgradeMsg, setUpgradeMsg] = useState('');
  const [form, setForm] = useState({
    propertyId: '', tenantId: '', title: '', description: '', priority: 'medium',
  });
  const [requests, setRequests] = useState([]);
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pendingPhoto, setPendingPhoto] = useState(null); // File object for new requests
  const [pendingPhotoPreview, setPendingPhotoPreview] = useState(null);
  const newPhotoRef = useRef(null);
  const quickUploadRef = useRef(null);
  const [quickUploadTarget, setQuickUploadTarget] = useState(null); // req.id for quick attach

  useEffect(() => {
    async function load() {
      const [r, p, t] = await Promise.all([
        getMaintenanceRequests(userId),
        getProperties(userId),
        getTenants(userId),
      ]);
      setRequests(r);
      setProperties(p);
      setTenants(t);
      setLoading(false);
    }
    load();
  }, [userId, refreshKey]);

  const filteredRequests = requests
    .filter(r => filter === 'all' || r.status === filter)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!form.title || !form.propertyId) {
      showToast('Please fill title and select a property', 'error');
      return;
    }
    setSubmitting(true);
    try {
      if (editingRequest) {
        await updateMaintenanceRequest(editingRequest.id, {
          title: form.title,
          description: form.description,
          priority: form.priority,
          property_id: form.propertyId,
          tenant_id: form.tenantId || null,
        }, userId);
        showToast('Maintenance request updated!');
      } else {
        const newReq = await addMaintenanceRequest(form, userId);
        // Upload pending photo if attached during creation
        if (pendingPhoto && newReq?.id && isSupabaseConfigured()) {
          try {
            const url = await uploadAttachment(pendingPhoto, userId, 'maintenance', newReq.id, 'photo');
            await updateMaintenanceRequest(newReq.id, { photo_url: url }, userId);
            showToast('Maintenance request added with photo! 📸');
            refreshStorageUsage();
          } catch (uploadErr) {
            console.error('Photo upload after creation failed:', uploadErr);
            showToast('Request added, but photo upload failed', 'error');
          }
        } else {
          showToast('Maintenance request added!');
        }
      }
      resetForm();
      refresh();
    } catch (err) {
      console.error('Save maintenance error:', err);
      showToast(err.message || 'Failed to save request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({ propertyId: '', tenantId: '', title: '', description: '', priority: 'medium' });
    setShowModal(false);
    setEditingRequest(null);
    setPendingPhoto(null);
    setPendingPhotoPreview(null);
    setSubmitting(false);
  };

  const openEditModal = (req) => {
    setEditingRequest(req);
    setForm({
      propertyId: req.propertyId || '',
      tenantId: req.tenantId || '',
      title: req.title || '',
      description: req.description || '',
      priority: req.priority || 'medium',
    });
    setShowModal(true);
  };

  const openAddModal = () => {
    setEditingRequest(null);
    setForm({ propertyId: '', tenantId: '', title: '', description: '', priority: 'medium' });
    setShowModal(true);
  };

  const updateStatus = async (id, status) => {
    try {
      await updateMaintenanceRequest(id, { status }, userId);
      showToast(`Request marked as ${status}`);
      refresh();
    } catch (err) {
      console.error('Update status error:', err);
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  const handlePropertyChange = (propId) => {
    const tenant = tenants.find(t => t.propertyId === propId);
    setForm({ ...form, propertyId: propId, tenantId: tenant?.id || '' });
  };

  const handleQuickPhotoUpload = async (file, reqId) => {
    if (!file || !reqId) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('Photo must be under 5MB', 'error');
      return;
    }
    const { allowed, message: limitMsg } = checkLimit('attachmentsMB', 0);
    if (!allowed) { setUpgradeMsg(limitMsg); return; }
    try {
      // Delete old photo (file + DB row) before uploading new one
      await deleteAttachmentsForEntity(userId, 'maintenance', reqId);
      const url = await uploadAttachment(file, userId, 'maintenance', reqId, 'photo');
      await updateMaintenanceRequest(reqId, { photo_url: url }, userId);
      showToast('Photo attached! 📸');
      refreshStorageUsage();
      refresh();
    } catch (err) {
      console.error('Quick photo upload failed:', err);
      showToast(err.message || 'Photo upload failed', 'error');
    }
  };

  const [deletingRequest, setDeletingRequest] = useState(null);

  const handleDeleteRequest = async (req) => {
    try {
      await deleteMaintenanceRequest(req.id, userId);
      showToast('Maintenance request deleted 🗑️');
      refreshStorageUsage();
      setDeletingRequest(null);
      refresh();
    } catch (err) {
      console.error('Delete maintenance error:', err);
      showToast(err.message || 'Failed to delete request', 'error');
    }
  };

  const statusConfig = {
    open: { icon: <AlertTriangle size={16} />, badge: 'badge-warning', label: 'Open' },
    'in-progress': { icon: <Clock size={16} />, badge: 'badge-primary', label: 'In Progress' },
    resolved: { icon: <CheckCircle size={16} />, badge: 'badge-success', label: 'Resolved' },
  };

  const openCount = requests.filter(r => r.status === 'open').length;
  const inProgressCount = requests.filter(r => r.status === 'in-progress').length;
  const resolvedCount = requests.filter(r => r.status === 'resolved').length;

  if (loading) return <CardListSkeleton cards={3} showStats statsCount={3} />;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
          <h2>Maintenance Requests</h2>
          <p>Track and manage property maintenance issues</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={18} /> New Request
        </button>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card" onClick={() => setFilter('open')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon warning"><AlertTriangle size={22} /></div>
          <div className="stat-value">{openCount}</div>
          <div className="stat-label">Open</div>
        </div>
        <div className="stat-card" onClick={() => setFilter('in-progress')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon primary"><Clock size={22} /></div>
          <div className="stat-value">{inProgressCount}</div>
          <div className="stat-label">In Progress</div>
        </div>
        <div className="stat-card" onClick={() => setFilter('resolved')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon success"><CheckCircle size={22} /></div>
          <div className="stat-value">{resolvedCount}</div>
          <div className="stat-label">Resolved</div>
        </div>
      </div>

      <div className="tab-buttons" style={{ width: 'fit-content' }}>
        {['all', 'open', 'in-progress', 'resolved'].map(f => (
          <button key={f} className={`tab-btn ${filter === f ? 'active' : ''}`}
            onClick={() => { setFilter(f); setCurrentPage(1); }}>
            {f === 'in-progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filteredRequests.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Wrench size={64} />
            <h4>No maintenance requests</h4>
            <p>All clear! No requests match this filter.</p>
          </div>
        </div>
      ) : (
        <>
        <div style={{ display: 'grid', gap: '12px' }}>
          {filteredRequests.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(req => {
            const property = properties.find(p => p.id === req.propertyId);
            const tenant = tenants.find(t => t.id === req.tenantId);
            const config = statusConfig[req.status] || statusConfig.open;

            return (
              <div key={req.id} className="request-card" style={{ background: 'var(--white)', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--gray-900)', marginBottom: '4px' }}>
                      {req.title}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>{req.description}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                    <span className={`badge badge-${req.priority === 'high' ? 'danger' : req.priority === 'medium' ? 'warning' : 'primary'}`}>
                      {req.priority}
                    </span>
                    <span className={`badge ${config.badge}`}>
                      {config.icon} <span style={{ marginLeft: '4px' }}>{config.label}</span>
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--gray-400)' }}>
                    <span>📍 {(property?.name || property?.address)?.substring(0, 30) || 'Unknown'}</span>
                    <span>👤 {tenant?.name || 'N/A'}</span>
                    <span>📅 {new Date(req.createdAt).toLocaleDateString('en-IN')}</span>
                  </div>
                  <div className="action-buttons">
                    {isSupabaseConfigured() && !req.photoUrl && (
                      <button className="btn btn-sm btn-secondary" title="Attach Photo"
                        onClick={() => {
                          setQuickUploadTarget(req.id);
                          setTimeout(() => quickUploadRef.current?.click(), 0);
                        }}
                        style={{ position: 'relative' }}
                      >
                        <Camera size={14} />
                      </button>
                    )}
                    {req.photoUrl && (
                      <span title="Photo attached" style={{ fontSize: '0.8rem', cursor: 'default' }}>📸</span>
                    )}
                    <button className="btn btn-sm btn-secondary" onClick={() => setViewRequest(req)} title="View Details">
                      <Eye size={14} />
                    </button>
                    <button className="btn btn-sm btn-secondary" onClick={() => openEditModal(req)} title="Edit">
                      <Pencil size={14} />
                    </button>
                    <button className="btn btn-sm" onClick={() => setDeletingRequest(req)}
                      style={{ background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '8px', padding: '5px 8px', cursor: 'pointer' }}
                      title="Delete">
                      <Trash2 size={14} />
                    </button>
                    {req.status === 'open' && (
                      <button className="btn btn-sm btn-primary" onClick={() => updateStatus(req.id, 'in-progress')}>
                        Start Work
                      </button>
                    )}
                    {req.status === 'in-progress' && (
                      <button className="btn btn-sm btn-success" onClick={() => updateStatus(req.id, 'resolved')}>
                        <CheckCircle size={14} /> Resolve
                      </button>
                    )}
                    {req.status === 'resolved' && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600 }}>✅ Done</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {/* Hidden file input for quick photo upload from card */}
        <input
          type="file"
          ref={quickUploadRef}
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && quickUploadTarget) {
              handleQuickPhotoUpload(file, quickUploadTarget);
            }
            e.target.value = '';
            setQuickUploadTarget(null);
          }}
        />
        <Pagination
          totalItems={filteredRequests.length}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
        </>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingRequest ? 'Edit Maintenance Request' : 'New Maintenance Request'}</h3>
              <button className="modal-close" onClick={resetForm}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Property *</label>
                <select className="form-select" value={form.propertyId}
                  onChange={e => handlePropertyChange(e.target.value)}>
                  <option value="">Select property</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name ? `${p.name} — ${p.address}` : p.address}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Issue Title *</label>
                <input className="form-input" value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Leaking tap in kitchen" />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe the issue in detail..." />
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-select" value={form.priority}
                  onChange={e => setForm({ ...form, priority: e.target.value })}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              {editingRequest && isSupabaseConfigured() && (
                <div className="form-group">
                  <FileUpload
                    label="Photo of Issue (optional)"
                    accept="image/jpeg,image/png,image/webp"
                    maxSizeMB={5}
                    currentUrl={editingRequest.photoUrl || ''}
                    onUpload={async (file) => {
                      const { allowed, message: limitMsg } = checkLimit('attachmentsMB', 0);
                      if (!allowed) { setUpgradeMsg(limitMsg); return; }
                      // Always delete old photo from storage before uploading new one
                      await deleteAttachmentsForEntity(userId, 'maintenance', editingRequest.id);
                      const url = await uploadAttachment(file, userId, 'maintenance', editingRequest.id, 'photo');
                      await updateMaintenanceRequest(editingRequest.id, { photo_url: url }, userId);
                      setEditingRequest(prev => ({ ...prev, photoUrl: url }));
                      showToast('Photo uploaded ✅');
                      refreshStorageUsage();
                    }}
                    onRemove={async () => {
                      // Delete photo from storage + attachments table
                      await deleteAttachmentsForEntity(userId, 'maintenance', editingRequest.id);
                      await updateMaintenanceRequest(editingRequest.id, { photo_url: '' }, userId);
                      setEditingRequest(prev => ({ ...prev, photoUrl: '' }));
                      showToast('Photo removed');
                      refreshStorageUsage();
                    }}
                  />
                </div>
              )}
              {!editingRequest && isSupabaseConfigured() && (
                <div className="form-group">
                  <label className="form-label">Photo of Issue (optional)</label>
                  <input
                    type="file"
                    ref={newPhotoRef}
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 5 * 1024 * 1024) {
                        showToast('Photo must be under 5MB', 'error');
                        e.target.value = '';
                        return;
                      }
                      const { allowed, message: limitMsg } = checkLimit('attachmentsMB', 0);
                      if (!allowed) { setUpgradeMsg(limitMsg); e.target.value = ''; return; }
                      setPendingPhoto(file);
                      setPendingPhotoPreview(URL.createObjectURL(file));
                    }}
                    style={{ display: 'none' }}
                  />
                  {pendingPhotoPreview ? (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '12px', background: '#f0fdf4', borderRadius: '10px',
                      border: '1px solid #bbf7d0',
                    }}>
                      <img src={pendingPhotoPreview} alt="Preview"
                        style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#16a34a' }}>📸 Photo attached</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{pendingPhoto?.name}</div>
                      </div>
                      <button type="button" className="btn btn-sm" onClick={() => {
                        setPendingPhoto(null);
                        setPendingPhotoPreview(null);
                        if (newPhotoRef.current) newPhotoRef.current.value = '';
                      }} style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => newPhotoRef.current?.click()}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: '8px', padding: '16px', borderRadius: '10px',
                        border: '2px dashed #cbd5e1', cursor: 'pointer',
                        background: '#f8fafc', transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.background = '#eef2ff'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
                    >
                      <Upload size={18} style={{ color: 'var(--gray-400)' }} />
                      <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
                        Click to attach a photo (JPG/PNG, max 5MB)
                      </span>
                    </div>
                  )}
                </div>
              )}
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? '⏳ Saving...' : editingRequest ? 'Update Request' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Maintenance Detail Modal */}
      {viewRequest && (() => {
        const property = properties.find(p => p.id === viewRequest.propertyId);
        const tenant = tenants.find(t => t.id === viewRequest.tenantId);
        const config = statusConfig[viewRequest.status] || statusConfig.open;
        return (
          <div className="modal-overlay" onClick={() => setViewRequest(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Maintenance Request Details</h3>
                <button className="modal-close" onClick={() => setViewRequest(null)}>✕</button>
              </div>
              <div style={{ padding: '4px 0' }}>
                <div className="detail-grid">
                  <div className="detail-row">
                    <span className="detail-label">Title</span>
                    <span className="detail-value" style={{ fontWeight: 700 }}>{viewRequest.title}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Description</span>
                    <span className="detail-value">{viewRequest.description || '—'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Property</span>
                    <span className="detail-value">{property?.name || property?.address || '—'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Tenant</span>
                    <span className="detail-value">{tenant?.name || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Priority</span>
                    <span className="detail-value">
                      <span className={`badge badge-${viewRequest.priority === 'high' ? 'danger' : viewRequest.priority === 'medium' ? 'warning' : 'primary'}`}>
                        {viewRequest.priority}
                      </span>
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Status</span>
                    <span className="detail-value">
                      <span className={`badge ${config.badge}`}>{config.label}</span>
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Created</span>
                    <span className="detail-value">{new Date(viewRequest.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                  </div>
                  {viewRequest.photoUrl && (
                    <div className="detail-row">
                      <span className="detail-label">Photo</span>
                      <span className="detail-value">
                        <a href={viewRequest.photoUrl} target="_blank" rel="noopener noreferrer">
                          <img src={viewRequest.photoUrl} alt="Issue photo" style={{ maxWidth: '200px', maxHeight: '150px', borderRadius: '8px', border: '1px solid var(--gray-200)' }} />
                        </a>
                      </span>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  {viewRequest.status === 'open' && (
                    <button className="btn btn-primary" onClick={() => { updateStatus(viewRequest.id, 'in-progress'); setViewRequest(null); }}>
                      Start Work
                    </button>
                  )}
                  {viewRequest.status === 'in-progress' && (
                    <button className="btn btn-success" onClick={() => { updateStatus(viewRequest.id, 'resolved'); setViewRequest(null); }}>
                      <CheckCircle size={14} /> Mark Resolved
                    </button>
                  )}
                  <button className="btn btn-secondary" onClick={() => { setViewRequest(null); openEditModal(viewRequest); }}>
                    <Pencil size={14} /> Edit
                  </button>
                  <button className="btn" onClick={() => { setViewRequest(null); setDeletingRequest(viewRequest); }}
                    style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontWeight: 600 }}>
                    <Trash2 size={14} /> Delete
                  </button>
                  <button className="btn btn-secondary" onClick={() => setViewRequest(null)}>Close</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Delete Maintenance Request Confirmation Modal */}
      {deletingRequest && (() => {
        const property = properties.find(p => p.id === deletingRequest.propertyId);
        const tenant = tenants.find(t => t.id === deletingRequest.tenantId);
        return (
          <div className="modal-overlay" onClick={() => setDeletingRequest(null)}>
            <div className="modal" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3 style={{ color: '#dc2626' }}><Trash2 size={20} /> Delete Request</h3>
                <button className="modal-close" onClick={() => setDeletingRequest(null)}>✕</button>
              </div>
              <div>
                <div style={{ padding: '16px', background: '#fef2f2', borderRadius: '10px', marginBottom: '16px', border: '1px solid #fecaca' }}>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#991b1b' }}>
                    Are you sure you want to delete this maintenance request? This action cannot be undone.
                  </p>
                </div>
                <div style={{ padding: '12px 16px', background: 'var(--gray-50)', borderRadius: '10px', marginBottom: '16px' }}>
                  <div style={{ fontWeight: 700 }}>{deletingRequest.title}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginTop: '4px' }}>
                    📍 {property?.name || property?.address || 'Unknown'} · 👤 {tenant?.name || 'N/A'}
                  </div>
                  {deletingRequest.photoUrl && (
                    <div style={{ fontSize: '0.8rem', color: '#d97706', marginTop: '6px' }}>
                      ⚠️ Associated photo attachment will also be deleted
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setDeletingRequest(null)}>Cancel</button>
                  <button type="button" className="btn" onClick={() => handleDeleteRequest(deletingRequest)}
                    style={{ background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', fontWeight: 600 }}>
                    <Trash2 size={14} /> Delete Request
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <UpgradeModal
        show={!!upgradeMsg}
        message={upgradeMsg}
        currentPlan={currentPlan}
        onClose={() => setUpgradeMsg('')}
        onUpgrade={() => onNavigate?.('license')}
      />
    </div>
  );
}
