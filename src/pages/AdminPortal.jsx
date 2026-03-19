import { useState, useEffect } from 'react';
import { Shield, Users, Search, Crown, HardDrive, Clock, ChevronDown, ChevronUp, RefreshCw, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { CardListSkeleton } from '../components/SkeletonLoader';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

const PLAN_COLORS = {
  free: { bg: '#f3f4f6', color: '#6b7280', label: 'Free' },
  trial: { bg: '#fef3c7', color: '#d97706', label: 'Trial' },
  pro: { bg: '#dbeafe', color: '#2563eb', label: 'Pro' },
  business: { bg: '#ede9fe', color: '#7c3aed', label: 'Business' },
};

export default function AdminPortal({ showToast }) {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedUser, setExpandedUser] = useState(null);
  const [userDetails, setUserDetails] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  const [actionModal, setActionModal] = useState(null); // { type, userId, userName }
  const [actionForm, setActionForm] = useState({});

  // Gate: only admin can access
  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [isAdmin]);

  const callAdminAPI = async (action, params = {}) => {
    const { data, error } = await supabase.functions.invoke('admin-update-user', {
      body: { action, ...params },
    });
    if (error) throw new Error(error.message || 'Admin API error');
    return data;
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await callAdminAPI('list_users');
      setUsers(data.users || []);
    } catch (err) {
      console.error('Load users error:', err);
      showToast(err.message || 'Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadUserDetails = async (userId) => {
    try {
      const data = await callAdminAPI('get_user_details', { userId });
      setUserDetails(prev => ({ ...prev, [userId]: data }));
    } catch (err) {
      console.error('Load user details error:', err);
    }
  };

  const toggleExpand = (userId) => {
    if (expandedUser === userId) {
      setExpandedUser(null);
    } else {
      setExpandedUser(userId);
      if (!userDetails[userId]) loadUserDetails(userId);
    }
  };

  const executeAction = async () => {
    if (!actionModal) return;
    setActionLoading(true);
    try {
      let result;
      switch (actionModal.type) {
        case 'update_plan':
          result = await callAdminAPI('update_plan', {
            userId: actionModal.userId,
            plan: actionForm.plan,
            extensionDays: Number(actionForm.extensionDays) || 0,
          });
          break;
        case 'extend_trial':
          result = await callAdminAPI('extend_trial', {
            userId: actionModal.userId,
            days: Number(actionForm.days) || 15,
          });
          break;
        case 'add_storage':
          result = await callAdminAPI('add_storage_bonus', {
            userId: actionModal.userId,
            bonusMB: Number(actionForm.bonusMB) || 100,
          });
          break;
      }
      showToast(result?.message || 'Action completed ✅');
      setActionModal(null);
      setActionForm({});
      loadUsers();
      // Refresh details if expanded
      if (expandedUser) loadUserDetails(expandedUser);
    } catch (err) {
      showToast(err.message || 'Action failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Access denied
  if (!isAdmin) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="card" style={{ textAlign: 'center', padding: '60px', maxWidth: '440px' }}>
          <Shield size={64} style={{ color: '#ef4444', marginBottom: '16px' }} />
          <h3 style={{ color: 'var(--gray-800)', marginBottom: '8px' }}>Access Denied</h3>
          <p style={{ color: 'var(--gray-500)' }}>This page is restricted to the super admin only.</p>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(u =>
    (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.plan || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <CardListSkeleton cards={5} showStats statsCount={4} />;

  const planCounts = {
    total: users.length,
    free: users.filter(u => u.plan === 'free').length,
    trial: users.filter(u => u.plan === 'trial').length,
    pro: users.filter(u => u.plan === 'pro').length,
    business: users.filter(u => u.plan === 'business').length,
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield size={24} style={{ color: '#ef4444' }} /> Admin Portal
          </h2>
          <p>Manage users, plans, storage, and support overrides</p>
        </div>
        <button className="btn btn-secondary" onClick={loadUsers} title="Refresh">
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-icon primary"><Users size={22} /></div>
          <div className="stat-value">{planCounts.total}</div>
          <div className="stat-label">Total Users</div>
        </div>
        {['free', 'trial', 'pro', 'business'].map(p => (
          <div key={p} className="stat-card" onClick={() => setSearch(p)} style={{ cursor: 'pointer' }}>
            <div className="stat-icon" style={{ background: PLAN_COLORS[p].bg, color: PLAN_COLORS[p].color }}>
              <Crown size={22} />
            </div>
            <div className="stat-value">{planCounts[p]}</div>
            <div className="stat-label">{PLAN_COLORS[p].label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
        <input
          type="text"
          className="form-input"
          placeholder="Search by name, email, or plan..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: '42px' }}
        />
      </div>

      {/* User List */}
      <div style={{ display: 'grid', gap: '10px' }}>
        {filteredUsers.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-400)' }}>
            No users found
          </div>
        ) : (
          filteredUsers.map(u => {
            const planStyle = PLAN_COLORS[u.plan] || PLAN_COLORS.free;
            const isExpanded = expandedUser === u.id;
            const details = userDetails[u.id];
            const isExpired = u.plan === 'trial' && u.subscription_ends_at && new Date(u.subscription_ends_at) < new Date();

            return (
              <div key={u.id} style={{
                background: 'var(--white)', border: '1px solid var(--gray-200)',
                borderRadius: 'var(--radius)', overflow: 'hidden',
                borderLeft: `4px solid ${planStyle.color}`,
              }}>
                {/* User Row */}
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: '16px',
                    padding: '16px 20px', cursor: 'pointer',
                  }}
                  onClick={() => toggleExpand(u.id)}
                >
                  {/* Avatar */}
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    background: `linear-gradient(135deg, ${planStyle.bg}, ${planStyle.color}20)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '0.85rem', color: planStyle.color, flexShrink: 0,
                  }}>
                    {(u.full_name || u.email || '?').substring(0, 2).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--gray-900)', fontSize: '0.95rem' }}>
                      {u.full_name || 'No Name'}
                      {isExpired && (
                        <span style={{ marginLeft: '8px', fontSize: '0.7rem', color: '#ef4444', fontWeight: 600 }}>
                          ⚠️ EXPIRED
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {u.email}
                    </div>
                  </div>

                  {/* Storage */}
                  <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--gray-500)', minWidth: '80px' }}>
                    <HardDrive size={12} style={{ marginRight: '4px' }} />
                    {u.storage?.used_mb || 0} / {u.storage?.limit_mb || 0} MB
                  </div>

                  {/* Plan Badge */}
                  <span style={{
                    padding: '4px 14px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                    background: planStyle.bg, color: planStyle.color,
                  }}>
                    {planStyle.label}
                  </span>

                  {/* Joined */}
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', minWidth: '80px', textAlign: 'right' }}>
                    {new Date(u.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>

                  {isExpanded ? <ChevronUp size={16} color="var(--gray-400)" /> : <ChevronDown size={16} color="var(--gray-400)" />}
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div style={{
                    borderTop: '1px solid var(--gray-100)', padding: '20px',
                    background: 'var(--gray-50)',
                  }}>
                    {!details ? (
                      <div style={{ textAlign: 'center', padding: '20px', color: 'var(--gray-400)' }}>Loading details...</div>
                    ) : (
                      <div>
                        {/* Quick Stats */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
                          <div style={{ background: 'var(--white)', padding: '12px', borderRadius: '10px', textAlign: 'center', border: '1px solid var(--gray-100)' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>{details.propertyCount}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>Properties</div>
                          </div>
                          <div style={{ background: 'var(--white)', padding: '12px', borderRadius: '10px', textAlign: 'center', border: '1px solid var(--gray-100)' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#16a34a' }}>{details.tenantCount}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>Tenants</div>
                          </div>
                          <div style={{ background: 'var(--white)', padding: '12px', borderRadius: '10px', textAlign: 'center', border: '1px solid var(--gray-100)' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#d97706' }}>{details.storage?.file_count || 0}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>Files</div>
                          </div>
                          <div style={{ background: 'var(--white)', padding: '12px', borderRadius: '10px', textAlign: 'center', border: '1px solid var(--gray-100)' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#7c3aed' }}>{details.storage?.used_mb || 0} MB</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>Storage Used</div>
                          </div>
                        </div>

                        {/* Subscription Info */}
                        {details.profile?.subscription_ends_at && (
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '10px 16px', background: 'var(--white)',
                            borderRadius: '10px', border: '1px solid var(--gray-100)',
                            marginBottom: '16px', fontSize: '0.85rem',
                          }}>
                            <Clock size={14} style={{ color: 'var(--gray-400)' }} />
                            <span style={{ color: 'var(--gray-600)' }}>
                              Subscription ends: <strong>{new Date(details.profile.subscription_ends_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</strong>
                            </span>
                          </div>
                        )}

                        {/* Recent Subscriptions */}
                        {details.recentSubscriptions?.length > 0 && (
                          <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-500)', marginBottom: '8px' }}>Recent Payments</div>
                            {details.recentSubscriptions.map(sub => (
                              <div key={sub.id} style={{
                                display: 'flex', alignItems: 'center', gap: '12px',
                                padding: '8px 14px', background: 'var(--white)',
                                borderRadius: '8px', border: '1px solid var(--gray-100)',
                                marginBottom: '4px', fontSize: '0.8rem',
                              }}>
                                {sub.status === 'paid' ? <CheckCircle size={14} style={{ color: '#16a34a' }} /> : <AlertTriangle size={14} style={{ color: '#d97706' }} />}
                                <span style={{ fontWeight: 600 }}>{sub.plan} ({sub.period})</span>
                                <span style={{ color: 'var(--gray-400)' }}>₹{sub.amount}</span>
                                <span style={{ color: 'var(--gray-400)', marginLeft: 'auto' }}>
                                  {new Date(sub.created_at).toLocaleDateString('en-IN')}
                                </span>
                                <span className={`badge badge-${sub.status === 'paid' ? 'success' : 'warning'}`} style={{ fontSize: '0.7rem' }}>
                                  {sub.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Admin Actions */}
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          <button className="btn btn-primary btn-sm" onClick={() => {
                            setActionModal({ type: 'update_plan', userId: u.id, userName: u.full_name || u.email });
                            setActionForm({ plan: u.plan, extensionDays: 30 });
                          }}>
                            <Crown size={14} /> Change Plan
                          </button>
                          <button className="btn btn-sm" style={{ background: '#fef3c7', color: '#d97706', border: '1px solid #fbbf24' }} onClick={() => {
                            setActionModal({ type: 'extend_trial', userId: u.id, userName: u.full_name || u.email });
                            setActionForm({ days: 15 });
                          }}>
                            <Clock size={14} /> Extend Trial
                          </button>
                          <button className="btn btn-sm" style={{ background: '#ede9fe', color: '#7c3aed', border: '1px solid #c4b5fd' }} onClick={() => {
                            setActionModal({ type: 'add_storage', userId: u.id, userName: u.full_name || u.email });
                            setActionForm({ bonusMB: 100 });
                          }}>
                            <HardDrive size={14} /> Add Storage
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Action Modal */}
      {actionModal && (
        <div className="modal-overlay" onClick={() => { setActionModal(null); setActionForm({}); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3>
                {actionModal.type === 'update_plan' && '👑 Change Plan'}
                {actionModal.type === 'extend_trial' && '⏰ Extend Trial'}
                {actionModal.type === 'add_storage' && '💾 Add Bonus Storage'}
              </h3>
              <button className="modal-close" onClick={() => { setActionModal(null); setActionForm({}); }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '4px 0' }}>
              <div style={{
                padding: '12px 16px', background: 'var(--gray-50)', borderRadius: '10px',
                marginBottom: '16px', fontSize: '0.85rem', color: 'var(--gray-600)',
              }}>
                Applying to: <strong>{actionModal.userName}</strong>
              </div>

              {actionModal.type === 'update_plan' && (
                <>
                  <div className="form-group">
                    <label className="form-label">New Plan</label>
                    <select className="form-select" value={actionForm.plan || ''}
                      onChange={e => setActionForm(prev => ({ ...prev, plan: e.target.value }))}>
                      <option value="free">Free</option>
                      <option value="trial">Trial</option>
                      <option value="pro">Pro</option>
                      <option value="business">Business</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Extension (days from now)</label>
                    <input className="form-input" type="number" min="0" max="365"
                      value={actionForm.extensionDays || ''}
                      onChange={e => setActionForm(prev => ({ ...prev, extensionDays: e.target.value }))}
                      placeholder="30" />
                    <small style={{ color: 'var(--gray-400)' }}>Set 0 to only change the plan without extending</small>
                  </div>
                </>
              )}

              {actionModal.type === 'extend_trial' && (
                <div className="form-group">
                  <label className="form-label">Extend by (days)</label>
                  <input className="form-input" type="number" min="1" max="365"
                    value={actionForm.days || ''}
                    onChange={e => setActionForm(prev => ({ ...prev, days: e.target.value }))}
                    placeholder="15" />
                  <small style={{ color: 'var(--gray-400)' }}>Days will be added from current end date or today (whichever is later)</small>
                </div>
              )}

              {actionModal.type === 'add_storage' && (
                <div className="form-group">
                  <label className="form-label">Bonus Storage (MB)</label>
                  <input className="form-input" type="number" min="10" max="10000"
                    value={actionForm.bonusMB || ''}
                    onChange={e => setActionForm(prev => ({ ...prev, bonusMB: e.target.value }))}
                    placeholder="100" />
                  <small style={{ color: 'var(--gray-400)' }}>This sets the total bonus (not cumulative). It will be added on top of the plan limit.</small>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setActionModal(null); setActionForm({}); }}>Cancel</button>
              <button className="btn btn-primary" onClick={executeAction} disabled={actionLoading}>
                {actionLoading ? 'Applying...' : 'Apply Change'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
