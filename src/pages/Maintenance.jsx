import { useState, useEffect } from 'react';
import { Plus, Wrench, CheckCircle, Clock, AlertTriangle, Eye, Pencil } from 'lucide-react';
import { getMaintenanceRequests, addMaintenanceRequest, updateMaintenanceRequest, getProperties, getTenants, uploadAttachment } from '../store';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import Pagination from '../components/Pagination';
import FileUpload from '../components/FileUpload';
import UpgradeModal from '../components/UpgradeModal';

export default function Maintenance({ showToast, refresh, refreshKey, onNavigate }) {
  const { user, checkLimit, currentPlan } = useAuth();
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
    if (!form.title || !form.propertyId) {
      showToast('Please fill title and select a property', 'error');
      return;
    }
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
        await addMaintenanceRequest(form, userId);
        showToast('Maintenance request added!');
      }
      resetForm();
      refresh();
    } catch (err) {
      console.error('Save maintenance error:', err);
      showToast(err.message || 'Failed to save request', 'error');
    }
  };

  const resetForm = () => {
    setForm({ propertyId: '', tenantId: '', title: '', description: '', priority: 'medium' });
    setShowModal(false);
    setEditingRequest(null);
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

  const statusConfig = {
    open: { icon: <AlertTriangle size={16} />, badge: 'badge-warning', label: 'Open' },
    'in-progress': { icon: <Clock size={16} />, badge: 'badge-primary', label: 'In Progress' },
    resolved: { icon: <CheckCircle size={16} />, badge: 'badge-success', label: 'Resolved' },
  };

  const openCount = requests.filter(r => r.status === 'open').length;
  const inProgressCount = requests.filter(r => r.status === 'in-progress').length;
  const resolvedCount = requests.filter(r => r.status === 'resolved').length;

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
                    <span>📍 {property?.address?.substring(0, 30)}</span>
                    <span>👤 {tenant?.name || 'N/A'}</span>
                    <span>📅 {new Date(req.createdAt).toLocaleDateString('en-IN')}</span>
                  </div>
                  <div className="action-buttons">
                    <button className="btn btn-sm btn-secondary" onClick={() => setViewRequest(req)} title="View Details">
                      <Eye size={14} />
                    </button>
                    <button className="btn btn-sm btn-secondary" onClick={() => openEditModal(req)} title="Edit">
                      <Pencil size={14} />
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
                  {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
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
                      const url = await uploadAttachment(file, userId, 'maintenance', editingRequest.id, 'photo');
                      await updateMaintenanceRequest(editingRequest.id, { photo_url: url }, userId);
                      setEditingRequest(prev => ({ ...prev, photoUrl: url }));
                      showToast('Photo uploaded ✅');
                    }}
                    onRemove={async () => {
                      await updateMaintenanceRequest(editingRequest.id, { photo_url: '' }, userId);
                      setEditingRequest(prev => ({ ...prev, photoUrl: '' }));
                      showToast('Photo removed');
                    }}
                  />
                </div>
              )}
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingRequest ? 'Update Request' : 'Submit Request'}</button>
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
                    <span className="detail-value">{property?.address || '—'}</span>
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
                  <button className="btn btn-secondary" onClick={() => setViewRequest(null)}>Close</button>
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
