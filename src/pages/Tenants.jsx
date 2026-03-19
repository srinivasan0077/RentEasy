import { useState, useEffect, useRef } from 'react';
import { Plus, Users, Phone, Mail, Search, Trash2, Pencil, Eye, Upload } from 'lucide-react';
import { getTenants, addTenant, deleteTenant, updateTenant, getProperties, uploadAttachment, deleteAttachmentsForEntity } from '../store';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import Pagination from '../components/Pagination';
import FileUpload from '../components/FileUpload';
import UpgradeModal from '../components/UpgradeModal';
import { CardListSkeleton } from '../components/SkeletonLoader';

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function Tenants({ showToast, refresh, refreshKey, onNavigate }) {
  const { user, checkLimit, currentPlan, refreshStorageUsage } = useAuth();
  const userId = user?.id;
  const [showModal, setShowModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [viewTenant, setViewTenant] = useState(null);
  const [search, setSearch] = useState('');
  const [upgradeMsg, setUpgradeMsg] = useState('');
  const [form, setForm] = useState({
    name: '', phone: '', email: '', aadhaar: '', pan: '',
    propertyId: '', unitNumber: '', rent: '', moveInDate: '', leaseEnd: '',
    emergencyContact: '', emergencyName: '',
  });
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    async function load() {
      const [t, p] = await Promise.all([getTenants(userId), getProperties(userId)]);
      setTenants(t);
      setProperties(p);
      setLoading(false);
    }
    load();
  }, [userId, refreshKey]);

  const filteredTenants = tenants.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.phone.includes(search) ||
    t.email.toLowerCase().includes(search.toLowerCase())
  );

  const paginatedTenants = filteredTenants.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!form.name || !form.phone || !form.propertyId) {
      showToast('Please fill name, phone, and property', 'error');
      return;
    }
    setSubmitting(true);
    try {
      if (editingTenant) {
        await updateTenant(editingTenant.id, {
          name: form.name,
          phone: form.phone,
          email: form.email,
          aadhaar: form.aadhaar,
          pan: form.pan,
          property_id: form.propertyId,
          unit_number: form.unitNumber || '',
          rent: Number(form.rent) || 0,
          move_in_date: form.moveInDate || null,
          lease_end: form.leaseEnd || null,
          emergency_name: form.emergencyName,
          emergency_contact: form.emergencyContact,
        }, userId);
        showToast('Tenant updated successfully!');
      } else {
        await addTenant(form, userId);
        showToast('Tenant added successfully!');
      }
      resetForm();
      refresh();
    } catch (err) {
      console.error('Save tenant error:', err);
      showToast(err.message || 'Failed to save tenant', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({ name: '', phone: '', email: '', aadhaar: '', pan: '', propertyId: '', unitNumber: '', rent: '', moveInDate: '', leaseEnd: '', emergencyContact: '', emergencyName: '' });
    setShowModal(false);
    setEditingTenant(null);
    setSubmitting(false);
  };

  const openEditModal = (tenant) => {
    setEditingTenant(tenant);
    setForm({
      name: tenant.name || '',
      phone: tenant.phone || '',
      email: tenant.email || '',
      aadhaar: tenant.aadhaar || '',
      pan: tenant.pan || '',
      propertyId: tenant.propertyId || '',
      unitNumber: tenant.unitNumber || '',
      rent: tenant.rent || '',
      moveInDate: tenant.moveInDate || '',
      leaseEnd: tenant.leaseEnd || '',
      emergencyContact: tenant.emergencyContact || '',
      emergencyName: tenant.emergencyName || '',
    });
    setShowModal(true);
  };

  const openAddModal = () => {
    const { allowed, message } = checkLimit('tenants', tenants.length);
    if (!allowed) {
      setUpgradeMsg(message);
      return;
    }
    setEditingTenant(null);
    setForm({ name: '', phone: '', email: '', aadhaar: '', pan: '', propertyId: '', unitNumber: '', rent: '', moveInDate: '', leaseEnd: '', emergencyContact: '', emergencyName: '' });
    setShowModal(true);
  };

  const [deletingTenant, setDeletingTenant] = useState(null);

  const handleDelete = async (tenant) => {
    try {
      await deleteTenant(tenant.id, userId);
      showToast('Tenant removed 🗑️');
      setDeletingTenant(null);
      refreshStorageUsage();
      refresh();
    } catch (err) {
      console.error('Delete tenant error:', err);
      showToast(err.message || 'Failed to remove tenant', 'error');
    }
  };

  const getPropertyLabel = (propId) => {
    const prop = properties.find(p => p.id === propId);
    if (!prop) return 'Unassigned';
    return prop.name || prop.address;
  };
  const getPropertyAddress = (propId) => {
    const prop = properties.find(p => p.id === propId);
    return prop ? prop.address : 'Unassigned';
  };

  // Quick upload from list view
  const quickFileRef = useRef(null);
  const [quickUploadTarget, setQuickUploadTarget] = useState(null); // { tenantId, docType }

  const triggerQuickUpload = (tenantId, docType) => {
    if (!isSupabaseConfigured()) {
      showToast('File upload requires Supabase connection', 'error');
      return;
    }
    const { allowed, message } = checkLimit('attachmentsMB', 0);
    if (!allowed) { setUpgradeMsg(message); return; }
    setQuickUploadTarget({ tenantId, docType });
    // Small delay to ensure state is set before triggering click
    setTimeout(() => quickFileRef.current?.click(), 50);
  };

  const handleQuickUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !quickUploadTarget) return;
    const { tenantId, docType } = quickUploadTarget;
    try {
      // Delete old attachment (file + DB row) before uploading new one
      await deleteAttachmentsForEntity(userId, 'tenant', tenantId, docType);
      const url = await uploadAttachment(file, userId, 'tenant', tenantId, docType);
      const updateField = docType === 'aadhaar' ? 'aadhaar_url' : 'pan_url';
      await updateTenant(tenantId, { [updateField]: url }, userId);
      showToast(`${docType === 'aadhaar' ? 'Aadhaar' : 'PAN'} uploaded ✅`);
      refreshStorageUsage();
      refresh();
    } catch (err) {
      console.error('Quick upload error:', err);
      showToast(err.message || 'Upload failed', 'error');
    }
    setQuickUploadTarget(null);
    if (quickFileRef.current) quickFileRef.current.value = '';
  };

  if (loading) return <CardListSkeleton cards={4} />;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
          <h2>Tenants</h2>
          <p>Manage your tenant information and documents</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={18} /> Add Tenant
        </button>
      </div>

      <div className="filters-bar">
        <div className="search-input">
          <Search />
          <input placeholder="Search tenants by name, phone, email..." value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} />
        </div>
      </div>

      {filteredTenants.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Users size={64} />
            <h4>No tenants found</h4>
            <p>{search ? 'Try a different search' : 'Add your first tenant'}</p>
            {!search && (
              <button className="btn btn-primary" onClick={openAddModal}>
                <Plus size={18} /> Add Tenant
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Property</th>
                  <th>Lease Period</th>
                  <th>Documents</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
              {paginatedTenants.map(tenant => (
                  <tr key={tenant.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{tenant.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>
                        Emergency: {tenant.emergencyName || 'N/A'}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                        <Phone size={12} /> {tenant.phone}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--gray-400)' }}>
                        <Mail size={12} /> {tenant.email || 'N/A'}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.85rem', maxWidth: '200px' }}>
                      {(() => { const label = getPropertyLabel(tenant.propertyId); return label.length > 35 ? label.substring(0, 35) + '...' : label; })()}
                      {tenant.unitNumber && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, marginTop: '2px' }}>
                          📍 {tenant.unitNumber}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>{formatDate(tenant.moveInDate)}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>to {formatDate(tenant.leaseEnd)}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {tenant.aadhaarUrl ? (
                          <a href={tenant.aadhaarUrl} target="_blank" rel="noopener noreferrer"
                            className="badge badge-primary" style={{ cursor: 'pointer', textDecoration: 'none' }}
                            title="View Aadhaar document">
                            📄 Aadhaar
                          </a>
                        ) : (
                          <span className="badge" style={{
                            cursor: 'pointer', background: 'var(--gray-100)', color: 'var(--gray-500)',
                            border: '1px dashed var(--gray-300)', display: 'flex', alignItems: 'center', gap: '3px',
                          }}
                            onClick={() => triggerQuickUpload(tenant.id, 'aadhaar')}
                            title="Click to upload Aadhaar">
                            <Upload size={10} /> Aadhaar
                          </span>
                        )}
                        {tenant.panUrl ? (
                          <a href={tenant.panUrl} target="_blank" rel="noopener noreferrer"
                            className="badge badge-primary" style={{ cursor: 'pointer', textDecoration: 'none' }}
                            title="View PAN document">
                            📄 PAN
                          </a>
                        ) : (
                          <span className="badge" style={{
                            cursor: 'pointer', background: 'var(--gray-100)', color: 'var(--gray-500)',
                            border: '1px dashed var(--gray-300)', display: 'flex', alignItems: 'center', gap: '3px',
                          }}
                            onClick={() => triggerQuickUpload(tenant.id, 'pan')}
                            title="Click to upload PAN">
                            <Upload size={10} /> PAN
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn btn-icon btn-sm btn-primary" onClick={() => setViewTenant(tenant)} title="View Details">
                          <Eye size={14} />
                        </button>
                        <button className="btn btn-icon btn-sm btn-secondary" onClick={() => openEditModal(tenant)} title="Edit">
                          <Pencil size={14} />
                        </button>
                        <button className="btn btn-icon btn-sm btn-danger" onClick={() => setDeletingTenant(tenant)} title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            totalItems={filteredTenants.length}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingTenant ? 'Edit Tenant' : 'Add New Tenant'}</h3>
              <button className="modal-close" onClick={resetForm}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="form-input" value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Tenant full name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone *</label>
                  <input className="form-input" value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="9876543210" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })} placeholder="tenant@email.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Assign Property *</label>
                <select className="form-select" value={form.propertyId}
                  onChange={e => {
                    const propId = e.target.value;
                    const prop = properties.find(p => p.id === propId);
                    setForm({ ...form, propertyId: propId, rent: form.rent || prop?.rent || '' });
                  }}>
                  <option value="">Select a property</option>
                  {properties.map(p => {
                    const occupantCount = tenants.filter(t => t.propertyId === p.id && (!editingTenant || t.id !== editingTenant.id)).length;
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name ? `${p.name} — ${p.address}` : p.address} ({p.type}){occupantCount > 0 ? ` — ${occupantCount} tenant${occupantCount > 1 ? 's' : ''}` : ''}
                      </option>
                    );
                  })}
                </select>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: '4px' }}>
                  💡 A property can have multiple tenants (e.g. different floors/rooms)
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Unit / Floor / Room (optional)</label>
                <input className="form-input" value={form.unitNumber}
                  onChange={e => setForm({ ...form, unitNumber: e.target.value })}
                  placeholder="e.g. Floor 1, Room 2A, Ground Floor" />
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: '4px' }}>
                  Helps identify the exact portion rented — appears in agreements & receipts
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Monthly Rent (₹) *</label>
                <input className="form-input" type="number" value={form.rent}
                  onChange={e => setForm({ ...form, rent: e.target.value })}
                  placeholder="e.g. 15000" />
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: '4px' }}>
                  Used for payment generation, agreements & receipts
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Aadhaar Number</label>
                  <input className="form-input" value={form.aadhaar}
                    onChange={e => setForm({ ...form, aadhaar: e.target.value })} placeholder="1234-5678-9012" />
                </div>
                <div className="form-group">
                  <label className="form-label">PAN Number</label>
                  <input className="form-input" value={form.pan}
                    onChange={e => setForm({ ...form, pan: e.target.value })} placeholder="ABCDE1234F" />
                </div>
              </div>
              {isSupabaseConfigured() && (
                editingTenant ? (
                <div className="form-row">
                  <div className="form-group">
                    <FileUpload
                      label="Aadhaar Card (Photo/PDF)"
                      currentUrl={editingTenant.aadhaarUrl || ''}
                      onUpload={async (file) => {
                        const { allowed, message } = checkLimit('attachmentsMB', 0);
                        if (!allowed) { setUpgradeMsg(message); return; }
                        await deleteAttachmentsForEntity(userId, 'tenant', editingTenant.id, 'aadhaar');
                        const url = await uploadAttachment(file, userId, 'tenant', editingTenant.id, 'aadhaar');
                        await updateTenant(editingTenant.id, { aadhaar_url: url }, userId);
                        setEditingTenant(prev => ({ ...prev, aadhaarUrl: url }));
                        showToast('Aadhaar uploaded ✅');
                        refreshStorageUsage();
                      }}
                      onRemove={async () => {
                        await deleteAttachmentsForEntity(userId, 'tenant', editingTenant.id, 'aadhaar');
                        await updateTenant(editingTenant.id, { aadhaar_url: '' }, userId);
                        setEditingTenant(prev => ({ ...prev, aadhaarUrl: '' }));
                        showToast('Aadhaar removed');
                        refreshStorageUsage();
                      }}
                    />
                  </div>
                  <div className="form-group">
                    <FileUpload
                      label="PAN Card (Photo/PDF)"
                      currentUrl={editingTenant.panUrl || ''}
                      onUpload={async (file) => {
                        const { allowed, message } = checkLimit('attachmentsMB', 0);
                        if (!allowed) { setUpgradeMsg(message); return; }
                        await deleteAttachmentsForEntity(userId, 'tenant', editingTenant.id, 'pan');
                        const url = await uploadAttachment(file, userId, 'tenant', editingTenant.id, 'pan');
                        await updateTenant(editingTenant.id, { pan_url: url }, userId);
                        setEditingTenant(prev => ({ ...prev, panUrl: url }));
                        showToast('PAN card uploaded ✅');
                        refreshStorageUsage();
                      }}
                      onRemove={async () => {
                        await deleteAttachmentsForEntity(userId, 'tenant', editingTenant.id, 'pan');
                        await updateTenant(editingTenant.id, { pan_url: '' }, userId);
                        setEditingTenant(prev => ({ ...prev, panUrl: '' }));
                        showToast('PAN card removed');
                        refreshStorageUsage();
                      }}
                    />
                  </div>
                </div>
                ) : (
                <div style={{
                  padding: '12px 16px', background: '#f0f9ff', borderRadius: '8px',
                  marginBottom: '12px', border: '1px solid #bae6fd',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  fontSize: '0.85rem', color: '#0369a1',
                }}>
                  📎 You can upload Aadhaar & PAN documents after saving the tenant.
                </div>
                )
              )}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Move-in Date</label>
                  <input className="form-input" type="date" value={form.moveInDate}
                    onChange={e => setForm({ ...form, moveInDate: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Lease End Date</label>
                  <input className="form-input" type="date" value={form.leaseEnd}
                    onChange={e => setForm({ ...form, leaseEnd: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Emergency Contact Name</label>
                  <input className="form-input" value={form.emergencyName}
                    onChange={e => setForm({ ...form, emergencyName: e.target.value })} placeholder="Parent/Spouse name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Emergency Phone</label>
                  <input className="form-input" value={form.emergencyContact}
                    onChange={e => setForm({ ...form, emergencyContact: e.target.value })} placeholder="9876543211" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? '⏳ Saving...' : editingTenant ? 'Update Tenant' : 'Add Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Tenant Detail Modal */}
      {viewTenant && (
        <div className="modal-overlay" onClick={() => setViewTenant(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Tenant Details</h3>
              <button className="modal-close" onClick={() => setViewTenant(null)}>✕</button>
            </div>
            <div style={{ padding: '4px 0' }}>
              <div className="detail-grid">
                <div className="detail-row"><span className="detail-label">Name</span><span className="detail-value" style={{ fontWeight: 600 }}>{viewTenant.name}</span></div>
                <div className="detail-row"><span className="detail-label">Phone</span><span className="detail-value">{viewTenant.phone}</span></div>
                <div className="detail-row"><span className="detail-label">Email</span><span className="detail-value">{viewTenant.email || '—'}</span></div>
                <div className="detail-row"><span className="detail-label">Property</span><span className="detail-value">{getPropertyLabel(viewTenant.propertyId)}</span></div>
                {viewTenant.unitNumber && (
                  <div className="detail-row"><span className="detail-label">Unit / Floor</span><span className="detail-value" style={{ color: 'var(--primary)', fontWeight: 600 }}>{viewTenant.unitNumber}</span></div>
                )}
                <div className="detail-row"><span className="detail-label">Aadhaar</span><span className="detail-value">
                  {viewTenant.aadhaar || '—'}
                  {viewTenant.aadhaarUrl && (
                    <a href={viewTenant.aadhaarUrl} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '8px', fontSize: '0.8rem', color: 'var(--primary)' }}>📄 View Document</a>
                  )}
                </span></div>
                <div className="detail-row"><span className="detail-label">PAN</span><span className="detail-value">
                  {viewTenant.pan || '—'}
                  {viewTenant.panUrl && (
                    <a href={viewTenant.panUrl} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '8px', fontSize: '0.8rem', color: 'var(--primary)' }}>📄 View Document</a>
                  )}
                </span></div>
                <div className="detail-row"><span className="detail-label">Move-in Date</span><span className="detail-value">{formatDate(viewTenant.moveInDate) || '—'}</span></div>
                <div className="detail-row"><span className="detail-label">Lease End</span><span className="detail-value">{formatDate(viewTenant.leaseEnd) || '—'}</span></div>
                <div className="detail-row"><span className="detail-label">Emergency Contact</span><span className="detail-value">{viewTenant.emergencyName || '—'} ({viewTenant.emergencyContact || '—'})</span></div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => { setViewTenant(null); openEditModal(viewTenant); }}>
                  <Pencil size={14} /> Edit
                </button>
                <button className="btn btn-primary" onClick={() => setViewTenant(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Tenant Confirmation Modal */}
      {deletingTenant && (
        <div className="modal-overlay" onClick={() => setDeletingTenant(null)}>
          <div className="modal" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ color: '#dc2626' }}><Trash2 size={20} /> Remove Tenant</h3>
              <button className="modal-close" onClick={() => setDeletingTenant(null)}>✕</button>
            </div>
            <div>
              <div style={{ padding: '16px', background: '#fef2f2', borderRadius: '10px', marginBottom: '16px', border: '1px solid #fecaca' }}>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#991b1b' }}>
                  Are you sure you want to remove this tenant? This action cannot be undone.
                </p>
              </div>
              <div style={{ padding: '12px 16px', background: 'var(--gray-50)', borderRadius: '10px', marginBottom: '16px' }}>
                <div style={{ fontWeight: 700, marginBottom: '4px' }}>{deletingTenant.name}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
                  {deletingTenant.phone} {deletingTenant.email ? `· ${deletingTenant.email}` : ''}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginTop: '2px' }}>
                  📍 {getPropertyLabel(deletingTenant.propertyId)}
                  {deletingTenant.unitNumber ? ` (${deletingTenant.unitNumber})` : ''}
                </div>
                {(deletingTenant.aadhaarUrl || deletingTenant.panUrl) && (
                  <div style={{ fontSize: '0.8rem', color: '#d97706', marginTop: '8px', padding: '8px', background: '#fffbeb', borderRadius: '6px', border: '1px solid #fde68a' }}>
                    ⚠️ Uploaded documents (Aadhaar{deletingTenant.panUrl ? ', PAN' : ''}) will also be permanently deleted
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setDeletingTenant(null)}>Cancel</button>
                <button type="button" className="btn" onClick={() => handleDelete(deletingTenant)}
                  style={{ background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', fontWeight: 600 }}>
                  <Trash2 size={14} /> Remove Tenant
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <UpgradeModal
        show={!!upgradeMsg}
        message={upgradeMsg}
        currentPlan={currentPlan}
        onClose={() => setUpgradeMsg('')}
        onUpgrade={() => onNavigate?.('license')}
      />

      {/* Hidden file input for quick uploads from list view */}
      <input
        type="file"
        ref={quickFileRef}
        style={{ display: 'none' }}
        accept="image/*,.pdf"
        onChange={handleQuickUpload}
      />
    </div>
  );
}
