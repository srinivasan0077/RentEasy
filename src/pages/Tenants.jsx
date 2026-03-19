import { useState, useEffect } from 'react';
import { Plus, Users, Phone, Mail, Search, Trash2, Pencil, Eye } from 'lucide-react';
import { getTenants, addTenant, deleteTenant, updateTenant, getProperties, uploadAttachment } from '../store';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import Pagination from '../components/Pagination';
import FileUpload from '../components/FileUpload';
import UpgradeModal from '../components/UpgradeModal';

export default function Tenants({ showToast, refresh, refreshKey, onNavigate }) {
  const { user, checkLimit, currentPlan } = useAuth();
  const userId = user?.id;
  const [showModal, setShowModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [viewTenant, setViewTenant] = useState(null);
  const [search, setSearch] = useState('');
  const [upgradeMsg, setUpgradeMsg] = useState('');
  const [form, setForm] = useState({
    name: '', phone: '', email: '', aadhaar: '', pan: '',
    propertyId: '', moveInDate: '', leaseEnd: '',
    emergencyContact: '', emergencyName: '',
  });
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
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
    if (!form.name || !form.phone || !form.propertyId) {
      showToast('Please fill name, phone, and property', 'error');
      return;
    }
    try {
      if (editingTenant) {
        await updateTenant(editingTenant.id, {
          name: form.name,
          phone: form.phone,
          email: form.email,
          aadhaar: form.aadhaar,
          pan: form.pan,
          property_id: form.propertyId,
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
    }
  };

  const resetForm = () => {
    setForm({ name: '', phone: '', email: '', aadhaar: '', pan: '', propertyId: '', moveInDate: '', leaseEnd: '', emergencyContact: '', emergencyName: '' });
    setShowModal(false);
    setEditingTenant(null);
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
    setForm({ name: '', phone: '', email: '', aadhaar: '', pan: '', propertyId: '', moveInDate: '', leaseEnd: '', emergencyContact: '', emergencyName: '' });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to remove this tenant?')) {
      try {
        await deleteTenant(id, userId);
        showToast('Tenant removed');
        refresh();
      } catch (err) {
        console.error('Delete tenant error:', err);
        showToast(err.message || 'Failed to remove tenant', 'error');
      }
    }
  };

  const getPropertyAddress = (propId) => {
    const prop = properties.find(p => p.id === propId);
    return prop ? prop.address : 'Unassigned';
  };

  const availableProperties = properties.filter(p => !tenants.some(t => t.propertyId === p.id));

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
                      {getPropertyAddress(tenant.propertyId).substring(0, 35)}...
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>{tenant.moveInDate || 'N/A'}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>to {tenant.leaseEnd || 'N/A'}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem' }}>
                        {tenant.aadhaar && <span className="badge badge-primary" style={{ marginRight: '4px' }}>Aadhaar</span>}
                        {tenant.pan && <span className="badge badge-primary">PAN</span>}
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
                        <button className="btn btn-icon btn-sm btn-danger" onClick={() => handleDelete(tenant.id)} title="Delete">
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
                  onChange={e => setForm({ ...form, propertyId: e.target.value })}>
                  <option value="">Select a property</option>
                  {availableProperties.map(p => (
                    <option key={p.id} value={p.id}>{p.address} ({p.type})</option>
                  ))}
                  {properties.filter(p => tenants.some(t => t.propertyId === p.id)).map(p => (
                    <option key={p.id} value={p.id}>{p.address} ({p.type}) - Currently Occupied</option>
                  ))}
                  {editingTenant && !properties.some(p => p.id === form.propertyId) && form.propertyId && (
                    <option value={form.propertyId}>Current Property</option>
                  )}
                </select>
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
                        const url = await uploadAttachment(file, userId, 'tenant', editingTenant.id, 'aadhaar');
                        await updateTenant(editingTenant.id, { aadhaar_url: url }, userId);
                        setEditingTenant(prev => ({ ...prev, aadhaarUrl: url }));
                        showToast('Aadhaar uploaded ✅');
                      }}
                      onRemove={async () => {
                        await updateTenant(editingTenant.id, { aadhaar_url: '' }, userId);
                        setEditingTenant(prev => ({ ...prev, aadhaarUrl: '' }));
                        showToast('Aadhaar removed');
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
                        const url = await uploadAttachment(file, userId, 'tenant', editingTenant.id, 'pan');
                        await updateTenant(editingTenant.id, { pan_url: url }, userId);
                        setEditingTenant(prev => ({ ...prev, panUrl: url }));
                        showToast('PAN card uploaded ✅');
                      }}
                      onRemove={async () => {
                        await updateTenant(editingTenant.id, { pan_url: '' }, userId);
                        setEditingTenant(prev => ({ ...prev, panUrl: '' }));
                        showToast('PAN card removed');
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
                <button type="submit" className="btn btn-primary">{editingTenant ? 'Update Tenant' : 'Add Tenant'}</button>
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
                <div className="detail-row"><span className="detail-label">Property</span><span className="detail-value">{getPropertyAddress(viewTenant.propertyId)}</span></div>
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
                <div className="detail-row"><span className="detail-label">Move-in Date</span><span className="detail-value">{viewTenant.moveInDate || '—'}</span></div>
                <div className="detail-row"><span className="detail-label">Lease End</span><span className="detail-value">{viewTenant.leaseEnd || '—'}</span></div>
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
