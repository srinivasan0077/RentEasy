import { useState, useEffect } from 'react';
import { Plus, MapPin, Home, Maximize, IndianRupee, Pencil, Trash2, Eye, X } from 'lucide-react';
import { getProperties, addProperty, deleteProperty, updateProperty, getTenants } from '../store';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/Pagination';
import UpgradeModal from '../components/UpgradeModal';
import { CardListSkeleton } from '../components/SkeletonLoader';

export default function Properties({ showToast, refresh, refreshKey, onNavigate }) {
  const { user, checkLimit, currentPlan } = useAuth();
  const userId = user?.id;
  const [showModal, setShowModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null); // null = add mode, object = edit mode
  const [viewProperty, setViewProperty] = useState(null);
  const [upgradeMsg, setUpgradeMsg] = useState('');
  const [form, setForm] = useState({
    name: '', address: '', city: '', state: '', pincode: '', type: '1BHK', rent: '', deposit: '', area: '',
  });
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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
  }, [userId, refreshKey]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!form.address || !form.rent) {
      showToast('Please fill address and rent', 'error');
      return;
    }
    setSubmitting(true);
    try {
      if (editingProperty) {
        await updateProperty(editingProperty.id, {
          name: form.name,
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
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({ name: '', address: '', city: '', state: '', pincode: '', type: '1BHK', rent: '', deposit: '', area: '' });
    setShowModal(false);
    setEditingProperty(null);
    setSubmitting(false);
  };

  const openEditModal = (prop) => {
    setEditingProperty(prop);
    setForm({
      name: prop.name || '',
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
    setForm({ name: '', address: '', city: '', state: '', pincode: '', type: '1BHK', rent: '', deposit: '', area: '' });
    setShowModal(true);
  };

  const [deletingProperty, setDeletingProperty] = useState(null);

  const handleDelete = async (prop) => {
    try {
      await deleteProperty(prop.id, userId);
      showToast('Property deleted');
      setDeletingProperty(null);
      refresh();
    } catch (err) {
      console.error('Delete property error:', err);
      showToast(err.message || 'Failed to delete property', 'error');
    }
  };

  const getTenantsForProperty = (propId) => tenants.filter(t => t.propertyId === propId);
  const formatCurrency = (amt) => `₹${Number(amt).toLocaleString('en-IN')}`;

  if (loading) return <CardListSkeleton cards={4} />;

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
            const propTenants = getTenantsForProperty(prop.id);
            const tenantCount = propTenants.length;
            return (
              <div key={prop.id} className="property-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <span className={`badge ${tenantCount > 0 ? 'badge-success' : 'badge-warning'}`}>
                    {tenantCount > 0 ? `${tenantCount} Tenant${tenantCount > 1 ? 's' : ''}` : 'Vacant'}
                  </span>
                  <div className="action-buttons">
                    <button className="btn btn-icon btn-primary btn-sm" onClick={() => setViewProperty(prop)} title="View Details">
                      <Eye size={14} />
                    </button>
                    <button className="btn btn-icon btn-secondary btn-sm" onClick={() => openEditModal(prop)} title="Edit">
                      <Pencil size={14} />
                    </button>
                    <button className="btn btn-icon btn-secondary btn-sm" onClick={() => setDeletingProperty(prop)} title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {prop.name && <div style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '4px', color: 'var(--gray-800)' }}>{prop.name}</div>}
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
                {propTenants.length > 0 && (
                  <div style={{ marginTop: '12px', padding: '10px', background: 'var(--gray-50)', borderRadius: '8px', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--gray-500)' }}>{propTenants.length === 1 ? 'Tenant:' : 'Tenants:'}</span>{' '}
                    <span style={{ fontWeight: 600 }}>{propTenants.map(t => t.name + (t.unitNumber ? ` (${t.unitNumber})` : '')).join(', ')}</span>
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
                <label className="form-label">Property Name</label>
                <input className="form-input" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Sunrise Apartments, Green Valley Villa" />
                <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: '2px' }}>A short nickname for quick identification (optional)</span>
              </div>
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
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? '⏳ Saving...' : editingProperty ? 'Update Property' : 'Add Property'}
                </button>
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
                {viewProperty.name && <div className="detail-row"><span className="detail-label">Name</span><span className="detail-value" style={{ fontWeight: 700 }}>{viewProperty.name}</span></div>}
                <div className="detail-row"><span className="detail-label">Address</span><span className="detail-value">{viewProperty.address}</span></div>
                <div className="detail-row"><span className="detail-label">City</span><span className="detail-value">{viewProperty.city || '—'}</span></div>
                <div className="detail-row"><span className="detail-label">State</span><span className="detail-value">{viewProperty.state || '—'}</span></div>
                <div className="detail-row"><span className="detail-label">Pincode</span><span className="detail-value">{viewProperty.pincode || '—'}</span></div>
                <div className="detail-row"><span className="detail-label">Type</span><span className="detail-value">{viewProperty.type}</span></div>
                <div className="detail-row"><span className="detail-label">Area</span><span className="detail-value">{viewProperty.area ? `${viewProperty.area} sq.ft` : '—'}</span></div>
                <div className="detail-row"><span className="detail-label">Monthly Rent</span><span className="detail-value" style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(viewProperty.rent)}</span></div>
                <div className="detail-row"><span className="detail-label">Security Deposit</span><span className="detail-value">{formatCurrency(viewProperty.deposit)}</span></div>
                <div className="detail-row">
                  <span className="detail-label">Tenant(s)</span>
                  <span className="detail-value">
                    {(() => {
                      const pts = getTenantsForProperty(viewProperty.id);
                      return pts.length > 0
                        ? pts.map(t => t.name + (t.unitNumber ? ` (${t.unitNumber})` : '')).join(', ')
                        : <span style={{ color: 'var(--gray-400)' }}>Vacant</span>;
                    })()}
                  </span>
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

      {/* Delete Property Confirmation Modal */}
      {deletingProperty && (() => {
        const propTenants = getTenantsForProperty(deletingProperty.id);
        return (
          <div className="modal-overlay" onClick={() => setDeletingProperty(null)}>
            <div className="modal" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3 style={{ color: '#dc2626' }}><Trash2 size={20} /> Delete Property</h3>
                <button className="modal-close" onClick={() => setDeletingProperty(null)}>✕</button>
              </div>
              <div>
                <div style={{ padding: '16px', background: '#fef2f2', borderRadius: '10px', marginBottom: '16px', border: '1px solid #fecaca' }}>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#991b1b' }}>
                    Are you sure you want to permanently delete this property? This action cannot be undone.
                  </p>
                </div>
                <div style={{ padding: '12px 16px', background: 'var(--gray-50)', borderRadius: '10px', marginBottom: '16px' }}>
                  {deletingProperty.name && <div style={{ fontWeight: 700, marginBottom: '4px', fontSize: '1rem' }}>{deletingProperty.name}</div>}
                  <div style={{ fontWeight: deletingProperty.name ? 500 : 700, marginBottom: '4px', fontSize: deletingProperty.name ? '0.85rem' : '1rem', color: deletingProperty.name ? 'var(--gray-500)' : 'inherit' }}>{deletingProperty.address}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
                    {deletingProperty.city}{deletingProperty.state ? `, ${deletingProperty.state}` : ''} · {deletingProperty.type} · {formatCurrency(deletingProperty.rent)}/month
                  </div>
                  {propTenants.length > 0 && (
                    <div style={{ fontSize: '0.8rem', color: '#0369a1', marginTop: '8px', padding: '8px', background: '#f0f9ff', borderRadius: '6px', border: '1px solid #bae6fd' }}>
                      ℹ️ {propTenants.length} tenant{propTenants.length > 1 ? 's' : ''} ({propTenants.map(t => t.name).join(', ')}) will be disassociated but not deleted.
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setDeletingProperty(null)}>Cancel</button>
                  <button type="button" className="btn" onClick={() => handleDelete(deletingProperty)}
                    style={{ background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', fontWeight: 600 }}>
                    <Trash2 size={14} /> Delete Property
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
