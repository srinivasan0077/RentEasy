import { useState, useEffect } from 'react';
import { Plus, MapPin, Home, Maximize, IndianRupee, Pencil, Trash2, Eye, X } from 'lucide-react';
import { getProperties, addProperty, deleteProperty, updateProperty, getTenants } from '../store';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/Pagination';
import UpgradeModal from '../components/UpgradeModal';

export default function Properties({ showToast, refresh, onNavigate }) {
  const { user, checkLimit, currentPlan } = useAuth();
  const userId = user?.id;
  const [showModal, setShowModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null); // null = add mode, object = edit mode
  const [viewProperty, setViewProperty] = useState(null);
  const [upgradeMsg, setUpgradeMsg] = useState('');
  const [form, setForm] = useState({
    address: '', city: '', state: '', pincode: '', type: '1BHK', rent: '', deposit: '', area: '',
  });
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    async function load() {
      const [p, t] = await Promise.all([getProperties(userId), getTenants(userId)]);
      setProperties(p);
      setTenants(t);
      setLoading(false);
    }
    load();
  }, [userId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.address || !form.rent) {
      showToast('Please fill address and rent', 'error');
      return;
    }
    try {
      if (editingProperty) {
        await updateProperty(editingProperty.id, {
          address: form.address,
          city: form.city,
          state: form.state,
          pincode: form.pincode,
          type: form.type,
          rent: Number(form.rent) || 0,
          deposit: Number(form.deposit) || 0,
          area: Number(form.area) || 0,
        }, userId);
        showToast('Property updated successfully!');
      } else {
        await addProperty(form, userId);
        showToast('Property added successfully!');
      }
      resetForm();
      refresh();
    } catch (err) {
      console.error('Save property error:', err);
      showToast(err.message || 'Failed to save property', 'error');
    }
  };

  const resetForm = () => {
    setForm({ address: '', city: '', state: '', pincode: '', type: '1BHK', rent: '', deposit: '', area: '' });
    setShowModal(false);
    setEditingProperty(null);
  };

  const openEditModal = (prop) => {
    setEditingProperty(prop);
    setForm({
      address: prop.address || '',
      city: prop.city || '',
      state: prop.state || '',
      pincode: prop.pincode || '',
      type: prop.type || '1BHK',
      rent: prop.rent || '',
      deposit: prop.deposit || '',
      area: prop.area || '',
    });
    setShowModal(true);
  };

  const openAddModal = () => {
    const { allowed, message } = checkLimit('properties', properties.length);
    if (!allowed) {
      setUpgradeMsg(message);
      return;
    }
    setEditingProperty(null);
    setForm({ address: '', city: '', state: '', pincode: '', type: '1BHK', rent: '', deposit: '', area: '' });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this property?')) {
      try {
        await deleteProperty(id, userId);
        showToast('Property deleted');
        refresh();
      } catch (err) {
        console.error('Delete property error:', err);
        showToast(err.message || 'Failed to delete property', 'error');
      }
    }
  };

  const getTenantForProperty = (propId) => tenants.find(t => t.propertyId === propId);
  const formatCurrency = (amt) => `₹${Number(amt).toLocaleString('en-IN')}`;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
          <h2>Properties</h2>
          <p>Manage your rental properties</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={18} /> Add Property
        </button>
      </div>

      {properties.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Home size={64} />
            <h4>No properties yet</h4>
            <p>Add your first rental property to get started</p>
            <button className="btn btn-primary" onClick={openAddModal}>
              <Plus size={18} /> Add Property
            </button>
          </div>
        </div>
      ) : (
        <>
        <div className="properties-grid">
          {properties.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(prop => {
            const tenant = getTenantForProperty(prop.id);
            return (
              <div key={prop.id} className="property-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <span className={`badge ${tenant ? 'badge-success' : 'badge-warning'}`}>
                    {tenant ? 'Occupied' : 'Vacant'}
                  </span>
                  <div className="action-buttons">
                    <button className="btn btn-icon btn-primary btn-sm" onClick={() => setViewProperty(prop)} title="View Details">
                      <Eye size={14} />
                    </button>
                    <button className="btn btn-icon btn-secondary btn-sm" onClick={() => openEditModal(prop)} title="Edit">
                      <Pencil size={14} />
                    </button>
                    <button className="btn btn-icon btn-secondary btn-sm" onClick={() => handleDelete(prop.id)} title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="property-address">{prop.address}</div>
                <div className="property-details">
                  <span className="property-detail"><MapPin size={14} /> {prop.city}, {prop.state}</span>
                  <span className="property-detail"><Home size={14} /> {prop.type}</span>
                  <span className="property-detail"><Maximize size={14} /> {prop.area} sq.ft</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="property-rent">{formatCurrency(prop.rent)}<span style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>/month</span></div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>Deposit: {formatCurrency(prop.deposit)}</div>
                </div>
                {tenant && (
                  <div style={{ marginTop: '12px', padding: '10px', background: 'var(--gray-50)', borderRadius: '8px', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--gray-500)' }}>Tenant:</span>{' '}
                    <span style={{ fontWeight: 600 }}>{tenant.name}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <Pagination
          totalItems={properties.length}
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
              <h3>{editingProperty ? 'Edit Property' : 'Add New Property'}</h3>
              <button className="modal-close" onClick={resetForm}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Address *</label>
                <textarea className="form-textarea" value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  placeholder="Flat no, Building, Street, Locality" style={{ minHeight: '70px' }} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input className="form-input" value={form.city}
                    onChange={e => setForm({ ...form, city: e.target.value })} placeholder="e.g. Bangalore" />
                </div>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input className="form-input" value={form.state}
                    onChange={e => setForm({ ...form, state: e.target.value })} placeholder="e.g. Karnataka" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Pincode</label>
                  <input className="form-input" value={form.pincode}
                    onChange={e => setForm({ ...form, pincode: e.target.value })} placeholder="560034" />
                </div>
                <div className="form-group">
                  <label className="form-label">Property Type</label>
                  <select className="form-select" value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value })}>
                    <option>1RK</option><option>1BHK</option><option>2BHK</option>
                    <option>3BHK</option><option>4BHK</option><option>Villa</option>
                    <option>Commercial</option><option>PG</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Monthly Rent (₹) *</label>
                  <input className="form-input" type="number" value={form.rent}
                    onChange={e => setForm({ ...form, rent: e.target.value })} placeholder="25000" />
                </div>
                <div className="form-group">
                  <label className="form-label">Security Deposit (₹)</label>
                  <input className="form-input" type="number" value={form.deposit}
                    onChange={e => setForm({ ...form, deposit: e.target.value })} placeholder="100000" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Area (sq.ft)</label>
                <input className="form-input" type="number" value={form.area}
                  onChange={e => setForm({ ...form, area: e.target.value })} placeholder="1100" />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingProperty ? 'Update Property' : 'Add Property'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Property Detail Modal */}
      {viewProperty && (
        <div className="modal-overlay" onClick={() => setViewProperty(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Property Details</h3>
              <button className="modal-close" onClick={() => setViewProperty(null)}>✕</button>
            </div>
            <div style={{ padding: '4px 0' }}>
              <div className="detail-grid">
                <div className="detail-row"><span className="detail-label">Address</span><span className="detail-value">{viewProperty.address}</span></div>
                <div className="detail-row"><span className="detail-label">City</span><span className="detail-value">{viewProperty.city || '—'}</span></div>
                <div className="detail-row"><span className="detail-label">State</span><span className="detail-value">{viewProperty.state || '—'}</span></div>
                <div className="detail-row"><span className="detail-label">Pincode</span><span className="detail-value">{viewProperty.pincode || '—'}</span></div>
                <div className="detail-row"><span className="detail-label">Type</span><span className="detail-value">{viewProperty.type}</span></div>
                <div className="detail-row"><span className="detail-label">Area</span><span className="detail-value">{viewProperty.area ? `${viewProperty.area} sq.ft` : '—'}</span></div>
                <div className="detail-row"><span className="detail-label">Monthly Rent</span><span className="detail-value" style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(viewProperty.rent)}</span></div>
                <div className="detail-row"><span className="detail-label">Security Deposit</span><span className="detail-value">{formatCurrency(viewProperty.deposit)}</span></div>
                <div className="detail-row">
                  <span className="detail-label">Tenant</span>
                  <span className="detail-value">{getTenantForProperty(viewProperty.id)?.name || <span style={{ color: 'var(--gray-400)' }}>Vacant</span>}</span>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => { setViewProperty(null); openEditModal(viewProperty); }}>
                  <Pencil size={14} /> Edit
                </button>
                <button className="btn btn-primary" onClick={() => setViewProperty(null)}>Close</button>
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
