import { useState, useEffect } from 'react';
import { Home, Building2, Users, CreditCard, FileText, Receipt, Wrench, Menu, X, Crown, LogOut, User, Shield } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Properties from './pages/Properties';
import Tenants from './pages/Tenants';
import Payments from './pages/Payments';
import Agreements from './pages/Agreements';
import Receipts from './pages/Receipts';
import Maintenance from './pages/Maintenance';
import LicensePage from './pages/LicensePage';
import LandlordProfile from './pages/LandlordProfile';
import AdminPortal from './pages/AdminPortal';
import AuthPage from './pages/AuthPage';
import LandingPage from './pages/LandingPage';
import Toast from './components/Toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { loadDemoData } from './store';
import './landing.css';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'properties', label: 'Properties', icon: Building2 },
  { id: 'tenants', label: 'Tenants', icon: Users },
  { id: 'payments', label: 'Rent Payments', icon: CreditCard },
  { id: 'agreements', label: 'Agreements', icon: FileText },
  { id: 'receipts', label: 'Rent Receipts', icon: Receipt },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  { id: 'landlord', label: 'Landlord Profile', icon: User },
  { id: 'license', label: 'Plans & Pricing', icon: Crown },
];

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

function AppContent() {
  const { user, profile, loading, isLocal, signOut, getDaysLeft, isTrialExpired, passwordRecovery } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => { if (isLocal) loadDemoData(); }, [isLocal]);

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const refresh = () => setRefreshKey(k => k + 1);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--gray-50)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="logo-icon" style={{ width: 56, height: 56, margin: '0 auto 16px' }}><Building2 size={28} /></div>
          <h2 style={{ color: 'var(--gray-700)' }}>Loading RentEasy...</h2>
        </div>
      </div>
    );
  }

  // Show password reset form when user clicks the reset link from email
  if (passwordRecovery) {
    return (
      <>
        <AuthPage showToast={showToast} />
        <Toast toasts={toasts} />
      </>
    );
  }

  if (!user) {
    if (showAuth) {
      return (
        <>
          <AuthPage showToast={showToast} onBack={() => setShowAuth(false)} />
          <Toast toasts={toasts} />
        </>
      );
    }
    return (
      <>
        <LandingPage onGetStarted={() => setShowAuth(true)} />
        <Toast toasts={toasts} />
      </>
    );
  }

  const renderPage = () => {
    const props = { showToast, refresh, refreshKey, onNavigate: setCurrentPage };
    switch (currentPage) {
      case 'dashboard': return <Dashboard {...props} onNavigate={setCurrentPage} />;
      case 'properties': return <Properties {...props} />;
      case 'tenants': return <Tenants {...props} />;
      case 'payments': return <Payments {...props} />;
      case 'agreements': return <Agreements {...props} />;
      case 'receipts': return <Receipts {...props} />;
      case 'maintenance': return <Maintenance {...props} />;
      case 'landlord': return <LandlordProfile {...props} />;
      case 'license': return <LicensePage {...props} />;
      case 'admin': return <AdminPortal {...props} />;
      default: return <Dashboard {...props} onNavigate={setCurrentPage} />;
    }
  };

  const daysLeft = getDaysLeft();
  const trialExpired = isTrialExpired();
  const planLabel = profile?.plan === 'trial'
    ? `Trial • ${daysLeft}d left`
    : (profile?.plan || 'free').charAt(0).toUpperCase() + (profile?.plan || 'free').slice(1) + ' Plan';
  const initials = (profile?.full_name || user?.email || 'U').substring(0, 2).toUpperCase();

  return (
    <div className="app-layout">
      <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Trial expiry banner */}
      {trialExpired && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
          background: 'linear-gradient(90deg, #ef4444, #dc2626)', color: 'white',
          padding: '10px 24px', textAlign: 'center', fontSize: '0.9rem', fontWeight: 600,
        }}>
          ⚠️ Your trial has expired!{' '}
          <button onClick={() => setCurrentPage('license')} style={{
            background: 'white', color: '#ef4444', border: 'none', padding: '4px 16px',
            borderRadius: '20px', fontWeight: 700, cursor: 'pointer', marginLeft: '12px',
          }}>
            Upgrade Now
          </button>
        </div>
      )}

      {/* Low trial warning banner */}
      {!trialExpired && profile?.plan === 'trial' && daysLeft <= 7 && daysLeft > 0 && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
          background: 'linear-gradient(90deg, #f59e0b, #d97706)', color: 'white',
          padding: '8px 24px', textAlign: 'center', fontSize: '0.85rem', fontWeight: 600,
        }}>
          ⏰ Your trial expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}!{' '}
          <button onClick={() => setCurrentPage('license')} style={{
            background: 'white', color: '#d97706', border: 'none', padding: '3px 14px',
            borderRadius: '20px', fontWeight: 700, cursor: 'pointer', marginLeft: '8px', fontSize: '0.8rem',
          }}>
            View Plans
          </button>
        </div>
      )}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon"><Building2 size={22} /></div>
          <h1>RentEasy</h1>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`nav-link ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => { setCurrentPage(item.id); setSidebarOpen(false); }}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
          {user?.email === ADMIN_EMAIL && (
            <button
              className={`nav-link ${currentPage === 'admin' ? 'active' : ''}`}
              onClick={() => { setCurrentPage('admin'); setSidebarOpen(false); }}
              style={{ borderTop: '1px solid var(--gray-200)', marginTop: '8px', paddingTop: '12px' }}
            >
              <Shield size={20} />
              Admin Portal
            </button>
          )}
        </nav>

        <div className="sidebar-user">
          <div className="user-avatar">{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="user-name">{profile?.full_name || user?.email?.split('@')[0] || 'User'}</div>
            <div className="user-role">{planLabel}</div>
          </div>
          <button onClick={signOut} title="Sign out"
            style={{ background: 'none', border: 'none', color: 'var(--gray-400)', cursor: 'pointer', padding: '4px' }}>
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <main className="main-content" style={{ paddingTop: trialExpired || (!trialExpired && profile?.plan === 'trial' && daysLeft <= 7 && daysLeft > 0) ? '52px' : undefined }}>
        {renderPage()}
      </main>

      <Toast toasts={toasts} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
