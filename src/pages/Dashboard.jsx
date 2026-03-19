import { useState, useEffect } from 'react';
import { Building2, Users, IndianRupee, AlertTriangle, TrendingUp, ArrowRight, Crown, HardDrive, FileText, Receipt, Gauge, Mail, X, Calendar, CreditCard, StickyNote, ImageIcon, Eye } from 'lucide-react';
import { getProperties, getTenants, getPayments, getMaintenanceRequests, getAgreements, getReceipts } from '../store';
import { useAuth } from '../context/AuthContext';
import { formatLimit } from '../lib/planLimits';
import { DashboardSkeleton } from '../components/SkeletonLoader';

export default function Dashboard({ onNavigate, refreshKey }) {
  const { user, currentPlan, getPlanLimits, storageUsedMB, getDaysLeft, license } = useAuth();
  const userId = user?.id;
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [payments, setPayments] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [agreements, setAgreements] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewPayment, setViewPayment] = useState(null);

  useEffect(() => {
    async function load() {
      const [p, t, pay, m, ag, rc] = await Promise.all([
        getProperties(userId),
        getTenants(userId),
        getPayments(userId),
        getMaintenanceRequests(userId),
        getAgreements(userId),
        getReceipts(userId),
      ]);
      setProperties(p);
      setTenants(t);
      setPayments(pay);
      setMaintenance(m);
      setAgreements(ag);
      setReceipts(rc);
      setLoading(false);
    }
    load();
  }, [userId, refreshKey]);

  const totalRent = tenants.reduce((sum, t) => sum + Number(t.rent || 0), 0);
  const currentMonth = new Date().toISOString().slice(0, 7); // e.g. '2026-03'
  const currentMonthLabel = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }); // e.g. 'March 2026'

  // Only count payments for active tenants in metrics
  const activeTenantIds = new Set(tenants.map(t => t.id));
  const activePayments = payments.filter(p => activeTenantIds.has(p.tenantId));

  const paidPayments = activePayments.filter(p => p.status === 'paid');
  const pendingPayments = activePayments.filter(p => p.status === 'pending');
  const overduePayments = activePayments.filter(p => p.status === 'overdue');
  const collectedThisMonth = activePayments
    .filter(p => p.status === 'paid' && p.month === currentMonth)
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const totalCollected = paidPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const openMaintenance = maintenance.filter(m => m.status !== 'resolved' && (!m.tenantId || activeTenantIds.has(m.tenantId)));

  const thisMonthPayments = activePayments
    .filter(p => p.month === currentMonth)
    .sort((a, b) => {
      const order = { overdue: 0, pending: 1, paid: 2 };
      return (order[a.status] ?? 3) - (order[b.status] ?? 3);
    });

  const formatCurrency = (amt) => `₹${Number(amt).toLocaleString('en-IN')}`;

  if (loading) {
    return <DashboardSkeleton />;
  }
  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Welcome back! Here's an overview of your rental properties.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card" onClick={() => onNavigate('properties')} style={{cursor:'pointer'}}>
          <div className="stat-icon primary"><Building2 size={22} /></div>
          <div className="stat-value">{properties.length}</div>
          <div className="stat-label">Properties</div>
        </div>
        <div className="stat-card" onClick={() => onNavigate('tenants')} style={{cursor:'pointer'}}>
          <div className="stat-icon success"><Users size={22} /></div>
          <div className="stat-value">{tenants.length}</div>
          <div className="stat-label">Active Tenants</div>
        </div>
        <div className="stat-card" onClick={() => onNavigate('payments')} style={{cursor:'pointer'}}>
          <div className="stat-icon warning"><IndianRupee size={22} /></div>
          <div className="stat-value">{formatCurrency(totalCollected)}</div>
          <div className="stat-label">Total Collected</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon danger"><AlertTriangle size={22} /></div>
          <div className="stat-value">{overduePayments.length + pendingPayments.length}</div>
          <div className="stat-label">Pending / Overdue</div>
        </div>
      </div>

      {/* License Usage Widget */}
      {(() => {
        const limits = getPlanLimits();
        const thisMonth = new Date().toISOString().slice(0, 7);
        const agreementsThisMonth = agreements.filter(a => (a.createdAt || a.created_at || '').slice(0, 7) === thisMonth).length;
        const receiptsThisMonth = receipts.filter(r => (r.createdAt || r.created_at || '').slice(0, 7) === thisMonth).length;
        const daysLeft = getDaysLeft();

        const usageItems = [
          { label: 'Properties', used: properties.length, limit: limits.properties, icon: <Building2 size={16} />, color: '#6366f1' },
          { label: 'Active Tenants', used: tenants.length, limit: limits.tenants, icon: <Users size={16} />, color: '#0ea5e9' },
          { label: 'Agreements', sub: 'this month', used: agreementsThisMonth, limit: limits.agreements, icon: <FileText size={16} />, color: '#8b5cf6' },
          { label: 'Receipts', sub: 'this month', used: receiptsThisMonth, limit: limits.receipts, icon: <Receipt size={16} />, color: '#f59e0b' },
          { label: 'Storage', used: storageUsedMB, limit: limits.attachmentsMB, icon: <HardDrive size={16} />, color: '#10b981', unit: 'MB' },
        ];

        const hasAnyNearLimit = usageItems.some(item => {
          if (item.limit >= 99999 || item.limit === 0) return false;
          return (item.used / item.limit) >= 0.8;
        });

        return (
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Gauge size={20} /> Plan Usage
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className={`badge badge-${currentPlan === 'business' ? 'success' : currentPlan === 'pro' ? 'primary' : 'warning'}`}
                  style={{ textTransform: 'capitalize', fontSize: '0.8rem', padding: '4px 12px' }}>
                  <Crown size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                  {limits.label}
                </span>
                {currentPlan === 'trial' && daysLeft > 0 && (
                  <span style={{ fontSize: '0.8rem', color: daysLeft <= 7 ? 'var(--danger)' : 'var(--gray-500)' }}>
                    {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                  </span>
                )}
                <button className="btn btn-sm btn-secondary" onClick={() => onNavigate('license')}>
                  {['free', 'trial'].includes(currentPlan) ? 'Upgrade' : 'Manage Plan'} <ArrowRight size={14} />
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '8px' }}>
              {usageItems.map(item => {
                const isUnlimited = item.limit >= 99999;
                const isDisabled = item.limit === 0 && item.label === 'Storage';
                const percent = isUnlimited ? 0 : isDisabled ? 100 : item.limit > 0 ? Math.min(100, Math.round((item.used / item.limit) * 100)) : 0;
                const barColor = percent >= 90 ? 'var(--danger)' : percent >= 70 ? 'var(--warning)' : item.color;
                const isAtLimit = !isUnlimited && !isDisabled && percent >= 100;

                return (
                  <div key={item.label} style={{
                    padding: '14px 16px', borderRadius: '10px',
                    background: isAtLimit ? 'var(--danger-bg)' : 'var(--gray-50)',
                    border: isAtLimit ? '1px solid var(--danger)' : '1px solid var(--gray-100)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--gray-600)', fontSize: '0.85rem', fontWeight: 600 }}>
                        <span style={{ color: item.color }}>{item.icon}</span>
                        {item.label}
                      </div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: isAtLimit ? 'var(--danger)' : 'var(--gray-700)' }}>
                        {isDisabled ? 'N/A' : isUnlimited
                          ? `${item.used}${item.unit ? ` ${item.unit}` : ''}`
                          : `${item.used}${item.unit ? ` ${item.unit}` : ''} / ${formatLimit(item.limit)}${item.unit ? ` ${item.unit}` : ''}`
                        }
                      </span>
                    </div>
                    {item.sub && <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', marginBottom: '6px', marginTop: '-4px' }}>{item.sub}</div>}
                    <div style={{ height: '6px', borderRadius: '3px', background: 'var(--gray-200)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: '3px',
                        width: isDisabled ? '0%' : isUnlimited ? '15%' : `${percent}%`,
                        background: isDisabled ? 'var(--gray-300)' : barColor,
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                    {isAtLimit && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--danger)', fontWeight: 600, marginTop: '4px' }}>
                        ⚠️ Limit reached
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Upgrade nudge or support link */}
            {hasAnyNearLimit && ['free', 'trial'].includes(currentPlan) && (
              <div style={{
                marginTop: '16px', padding: '12px 16px', borderRadius: '8px',
                background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
              }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--gray-700)' }}>
                  <span style={{ fontWeight: 600 }}>Running low on limits?</span> Upgrade your plan to unlock more properties, tenants, and features.
                </div>
                <button className="btn btn-sm btn-primary" onClick={() => onNavigate('license')} style={{ whiteSpace: 'nowrap' }}>
                  Upgrade Now
                </button>
              </div>
            )}
            {currentPlan === 'business' && (
              <div style={{
                marginTop: '16px', padding: '10px 16px', borderRadius: '8px',
                background: 'var(--gray-50)', display: 'flex', alignItems: 'center', gap: '8px',
                fontSize: '0.8rem', color: 'var(--gray-500)',
              }}>
                <Mail size={14} />
                Need higher limits or have billing questions? Contact us at <a href="mailto:support@userenteasy.in" style={{ color: 'var(--primary)', fontWeight: 600 }}>support@userenteasy.in</a>
              </div>
            )}
          </div>
        );
      })()}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Monthly Overview */}
        <div className="card">
          <div className="card-header">
            <h3>📊 This Month ({currentMonthLabel})</h3>
          </div>
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--success-bg)', borderRadius: '8px' }}>
              <span style={{ fontWeight: 600, color: 'var(--success)' }}>Collected</span>
              <span style={{ fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(collectedThisMonth)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--warning-bg)', borderRadius: '8px' }}>
              <span style={{ fontWeight: 600, color: 'var(--warning)' }}>Pending</span>
              <span style={{ fontWeight: 700, color: 'var(--warning)' }}>
                {formatCurrency(activePayments.filter(p => p.status === 'pending' && p.month === currentMonth).reduce((s, p) => s + Number(p.amount), 0))}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--danger-bg)', borderRadius: '8px' }}>
              <span style={{ fontWeight: 600, color: 'var(--danger)' }}>Overdue</span>
              <span style={{ fontWeight: 700, color: 'var(--danger)' }}>
                {formatCurrency(activePayments.filter(p => p.status === 'overdue' && p.month === currentMonth).reduce((s, p) => s + Number(p.amount), 0))}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--primary-bg)', borderRadius: '8px' }}>
              <span style={{ fontWeight: 600, color: 'var(--primary)' }}>Expected Total</span>
              <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(totalRent)}</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <h3>⚡ Quick Actions</h3>
          </div>
          <div style={{ display: 'grid', gap: '12px' }}>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'space-between' }}
              onClick={() => onNavigate('properties')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={18} /> Add New Property
              </span>
              <ArrowRight size={16} />
            </button>
            <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'space-between' }}
              onClick={() => onNavigate('tenants')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} /> Add New Tenant
              </span>
              <ArrowRight size={16} />
            </button>
            <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'space-between' }}
              onClick={() => onNavigate('receipts')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} /> Generate Rent Receipt
              </span>
              <ArrowRight size={16} />
            </button>
            <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'space-between' }}
              onClick={() => onNavigate('agreements')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} /> Create Rent Agreement
              </span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* This Month's Payments */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <h3>💳 This Month's Payments</h3>
          <button className="btn btn-sm btn-secondary" onClick={() => onNavigate('payments')}>
            View All <ArrowRight size={14} />
          </button>
        </div>
        {thisMonthPayments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)' }}>
            No payments recorded for {currentMonthLabel}
          </div>
        ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Property</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {thisMonthPayments.map(payment => {
                const tenant = tenants.find(t => t.id === payment.tenantId);
                const property = properties.find(p => p.id === payment.propertyId);
                return (
                  <tr key={payment.id} onClick={() => setViewPayment(payment)} style={{ cursor: 'pointer' }} title="Click to view details">
                    <td style={{ fontWeight: 600 }}>{tenant?.name || 'Unknown'}</td>
                    <td>{(() => { const label = property?.name || property?.address; return label ? (label.length > 30 ? label.substring(0, 30) + '...' : label) : 'Unknown'; })()}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(payment.amount)}</td>
                    <td>
                      <span className={`badge badge-${payment.status === 'paid' ? 'success' : payment.status === 'pending' ? 'warning' : 'danger'}`}>
                        {payment.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* Maintenance */}
      {openMaintenance.length > 0 && (
        <div className="card" style={{ marginTop: '24px' }}>
          <div className="card-header">
            <h3>🔧 Open Maintenance Requests</h3>
            <button className="btn btn-sm btn-secondary" onClick={() => onNavigate('maintenance')}>
              View All <ArrowRight size={14} />
            </button>
          </div>
          {openMaintenance.slice(0, 3).map(req => {
            const property = properties.find(p => p.id === req.propertyId);
            const tenant = tenants.find(t => t.id === req.tenantId);
            return (
              <div key={req.id} className="request-card">
                <div className="request-header">
                  <span className="request-title">{req.title}</span>
                  <span className={`badge badge-${req.priority === 'high' ? 'danger' : req.priority === 'medium' ? 'warning' : 'primary'}`}>
                    {req.priority}
                  </span>
                </div>
                <div className="request-desc">{req.description}</div>
                <div className="request-meta">
                  <span>👤 {tenant?.name || 'N/A'}</span>
                  <span>📍 {(() => { const label = property?.name || property?.address; return label ? (label.length > 30 ? label.substring(0, 30) + '...' : label) : 'Unknown'; })()}</span>
                  <span className={`badge badge-${req.status === 'open' ? 'warning' : 'primary'}`}>{req.status}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Payment Detail Modal */}
      {viewPayment && (() => {
        const vTenant = tenants.find(t => t.id === viewPayment.tenantId);
        const vProperty = properties.find(p => p.id === viewPayment.propertyId);
        const monthLabel = viewPayment.month ? new Date(viewPayment.month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '—';
        const statusColor = viewPayment.status === 'paid' ? 'var(--success)' : viewPayment.status === 'pending' ? 'var(--warning)' : 'var(--danger)';
        const statusBg = viewPayment.status === 'paid' ? 'var(--success-bg)' : viewPayment.status === 'pending' ? 'var(--warning-bg)' : 'var(--danger-bg)';

        return (
          <div className="modal-overlay" onClick={() => setViewPayment(null)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
              <div className="modal-header">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Eye size={20} /> Payment Details
                </h3>
                <button className="btn btn-sm btn-secondary" onClick={() => setViewPayment(null)}><X size={16} /></button>
              </div>

              {/* Amount hero */}
              <div style={{
                textAlign: 'center', padding: '24px 16px', margin: '0 0 20px',
                background: statusBg, borderRadius: '12px',
              }}>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: statusColor }}>
                  {formatCurrency(viewPayment.amount)}
                </div>
                <span className={`badge badge-${viewPayment.status === 'paid' ? 'success' : viewPayment.status === 'pending' ? 'warning' : 'danger'}`}
                  style={{ fontSize: '0.85rem', padding: '4px 14px', marginTop: '8px', display: 'inline-block', textTransform: 'capitalize' }}>
                  {viewPayment.status === 'paid' ? '✅ ' : viewPayment.status === 'overdue' ? '⚠️ ' : '⏳ '}{viewPayment.status}
                </span>
              </div>

              {/* Details grid */}
              <div style={{ display: 'grid', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'var(--gray-50)', borderRadius: '8px' }}>
                  <Users size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 600 }}>Tenant</div>
                    <div style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{vTenant?.name || 'Unknown'}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'var(--gray-50)', borderRadius: '8px' }}>
                  <Building2 size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 600 }}>Property</div>
                    <div style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{vProperty?.name || vProperty?.address || 'Unknown'}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'var(--gray-50)', borderRadius: '8px' }}>
                    <Calendar size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 600 }}>Month</div>
                      <div style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{monthLabel}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'var(--gray-50)', borderRadius: '8px' }}>
                    <CreditCard size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 600 }}>Method</div>
                      <div style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{viewPayment.method || '—'}</div>
                    </div>
                  </div>
                </div>

                {viewPayment.status === 'paid' && viewPayment.paidDate && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'var(--success-bg)', borderRadius: '8px' }}>
                    <Calendar size={16} style={{ color: 'var(--success)', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 600 }}>Paid On</div>
                      <div style={{ fontWeight: 600, color: 'var(--success)' }}>{viewPayment.paidDate}</div>
                    </div>
                  </div>
                )}

                {viewPayment.notes && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 14px', background: 'var(--gray-50)', borderRadius: '8px' }}>
                    <StickyNote size={16} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 600 }}>Notes</div>
                      <div style={{ color: 'var(--gray-700)', fontSize: '0.9rem' }}>{viewPayment.notes}</div>
                    </div>
                  </div>
                )}

                {viewPayment.screenshotUrl && (
                  <div style={{ padding: '10px 14px', background: 'var(--gray-50)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                      <ImageIcon size={16} style={{ color: 'var(--primary)' }} />
                      <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 600 }}>Payment Proof</span>
                    </div>
                    <a href={viewPayment.screenshotUrl} target="_blank" rel="noopener noreferrer">
                      <img src={viewPayment.screenshotUrl} alt="Payment proof"
                        style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '8px', border: '1px solid var(--gray-200)' }}
                      />
                    </a>
                  </div>
                )}
              </div>

              {/* Footer actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--gray-100)' }}>
                <button className="btn btn-secondary" onClick={() => setViewPayment(null)}>Close</button>
                <button className="btn btn-primary" onClick={() => { setViewPayment(null); onNavigate('payments'); }}>
                  Go to Payments <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
