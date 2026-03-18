import { useState, useEffect } from 'react';
import { Building2, Users, IndianRupee, AlertTriangle, TrendingUp, ArrowRight } from 'lucide-react';
import { getProperties, getTenants, getPayments, getMaintenanceRequests } from '../store';
import { useAuth } from '../context/AuthContext';

export default function Dashboard({ onNavigate, refreshKey }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [payments, setPayments] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [p, t, pay, m] = await Promise.all([
        getProperties(userId),
        getTenants(userId),
        getPayments(userId),
        getMaintenanceRequests(userId),
      ]);
      setProperties(p);
      setTenants(t);
      setPayments(pay);
      setMaintenance(m);
      setLoading(false);
    }
    load();
  }, [userId, refreshKey]);

  const totalRent = properties.reduce((sum, p) => sum + Number(p.rent), 0);
  const paidPayments = payments.filter(p => p.status === 'paid');
  const pendingPayments = payments.filter(p => p.status === 'pending');
  const overduePayments = payments.filter(p => p.status === 'overdue');
  const collectedThisMonth = payments
    .filter(p => p.status === 'paid' && p.month === '2026-03')
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const totalCollected = paidPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const openMaintenance = maintenance.filter(m => m.status !== 'resolved');

  const recentPayments = [...payments]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  const formatCurrency = (amt) => `₹${Number(amt).toLocaleString('en-IN')}`;

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
        <p style={{ color: 'var(--gray-400)' }}>Loading dashboard...</p>
      </div>
    );
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Monthly Overview */}
        <div className="card">
          <div className="card-header">
            <h3>📊 This Month (March 2026)</h3>
          </div>
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--success-bg)', borderRadius: '8px' }}>
              <span style={{ fontWeight: 600, color: 'var(--success)' }}>Collected</span>
              <span style={{ fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(collectedThisMonth)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--warning-bg)', borderRadius: '8px' }}>
              <span style={{ fontWeight: 600, color: 'var(--warning)' }}>Pending</span>
              <span style={{ fontWeight: 700, color: 'var(--warning)' }}>
                {formatCurrency(payments.filter(p => p.status === 'pending' && p.month === '2026-03').reduce((s, p) => s + Number(p.amount), 0))}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--danger-bg)', borderRadius: '8px' }}>
              <span style={{ fontWeight: 600, color: 'var(--danger)' }}>Overdue</span>
              <span style={{ fontWeight: 700, color: 'var(--danger)' }}>
                {formatCurrency(payments.filter(p => p.status === 'overdue' && p.month === '2026-03').reduce((s, p) => s + Number(p.amount), 0))}
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

      {/* Recent Payments */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <h3>💳 Recent Payments</h3>
          <button className="btn btn-sm btn-secondary" onClick={() => onNavigate('payments')}>
            View All <ArrowRight size={14} />
          </button>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Property</th>
                <th>Month</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentPayments.map(payment => {
                const tenant = tenants.find(t => t.id === payment.tenantId);
                const property = properties.find(p => p.id === payment.propertyId);
                return (
                  <tr key={payment.id}>
                    <td style={{ fontWeight: 600 }}>{tenant?.name || 'Unknown'}</td>
                    <td>{property?.address?.substring(0, 30) || 'Unknown'}...</td>
                    <td>{payment.month}</td>
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
                  <span>📍 {property?.address?.substring(0, 30)}</span>
                  <span className={`badge badge-${req.status === 'open' ? 'warning' : 'primary'}`}>{req.status}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
