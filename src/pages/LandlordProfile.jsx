import { useState, useEffect } from 'react';
import { User, Save, Trash2 } from 'lucide-react';
import { getLandlordProfile, saveLandlordProfile } from '../store';
import { useAuth } from '../context/AuthContext';

export default function LandlordProfile({ showToast }) {
  const { user } = useAuth();
  const userId = user?.id;

  const [form, setForm] = useState({
    name: '', phone: '', pan: '', aadhaar: '', address: '', rentDueDay: 5,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const profile = getLandlordProfile(userId);
    if (profile) {
      setForm({
        name: profile.name || '',
        phone: profile.phone || '',
        pan: profile.pan || '',
        aadhaar: profile.aadhaar || '',
        address: profile.address || '',
        rentDueDay: profile.rentDueDay || 5,
      });
      setSaved(true);
    }
  }, [userId]);

  const handleSave = (e) => {
    e.preventDefault();
    if (!form.name) {
      showToast('Please enter your name', 'error');
      return;
    }
    if (form.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.pan.toUpperCase())) {
      showToast('Invalid PAN format. Expected: ABCDE1234F', 'error');
      return;
    }
    saveLandlordProfile(form, userId);
    setSaved(true);
    showToast('Landlord profile saved! It will auto-fill in Agreements & Receipts ✅');
  };

  const handleClear = () => {
    if (confirm('Clear saved landlord profile? You can re-enter it anytime.')) {
      const key = userId ? `renteasy_landlord_profile_${userId}` : 'renteasy_landlord_profile';
      localStorage.removeItem(key);
      setForm({ name: '', phone: '', pan: '', aadhaar: '', address: '', rentDueDay: 5 });
      setSaved(false);
      showToast('Landlord profile cleared');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Landlord Profile</h2>
          <p>Save your details once — they'll auto-fill in Agreements & Rent Receipts</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: '640px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          marginBottom: '24px', paddingBottom: '16px',
          borderBottom: '1px solid var(--gray-100)',
        }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <User size={24} color="#fff" />
          </div>
          <div>
            <h3 style={{ margin: 0 }}>Your Landlord Details</h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--gray-400)' }}>
              {saved ? '✅ Profile saved — auto-fills into forms' : 'Fill once, use everywhere'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSave}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-input" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Your full name (as on PAN)" />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="9876543210" maxLength={10} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">PAN Number</label>
              <input className="form-input" value={form.pan}
                onChange={e => setForm({ ...form, pan: e.target.value.toUpperCase() })}
                placeholder="ABCDE1234F" maxLength={10} />
              <small style={{ color: 'var(--gray-400)', fontSize: '0.75rem' }}>
                Required for agreements & HRA receipts
              </small>
            </div>
            <div className="form-group">
              <label className="form-label">Aadhaar Number</label>
              <input className="form-input" value={form.aadhaar}
                onChange={e => setForm({ ...form, aadhaar: e.target.value })}
                placeholder="1234-5678-9012" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Address</label>
            <input className="form-input" value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })}
              placeholder="Your permanent address (used in rent receipts)" />
          </div>

          <div className="form-group" style={{ maxWidth: '320px' }}>
            <label className="form-label">Rent Due Day (of every month) *</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input className="form-input" type="number" min="1" max="28" value={form.rentDueDay}
                onChange={e => setForm({ ...form, rentDueDay: Math.max(1, Math.min(28, Number(e.target.value) || 1)) })}
                style={{ width: '80px', textAlign: 'center', fontWeight: 600, fontSize: '1.1rem' }} />
              <span style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>
                of every month
              </span>
            </div>
            <small style={{ color: 'var(--gray-400)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
              Payments not received by this day will be marked <strong style={{ color: '#dc2626' }}>Overdue</strong>.
              Also used in rent agreements. (Default: 5th)
            </small>
          </div>

          <div style={{
            display: 'flex', gap: '12px', marginTop: '20px',
            paddingTop: '16px', borderTop: '1px solid var(--gray-100)',
          }}>
            <button type="submit" className="btn btn-primary">
              <Save size={16} /> {saved ? 'Update Profile' : 'Save Profile'}
            </button>
            {saved && (
              <button type="button" className="btn btn-danger" onClick={handleClear} style={{
                background: 'none', color: '#dc2626', border: '1px solid #fecaca',
              }}>
                <Trash2 size={14} /> Clear Profile
              </button>
            )}
          </div>
        </form>

        <div style={{
          marginTop: '20px', padding: '12px 16px', background: '#f0f9ff',
          borderRadius: '8px', border: '1px solid #bae6fd',
          fontSize: '0.82rem', color: '#0369a1',
        }}>
          💡 <strong>How it works:</strong> Once saved, you'll see a "📋 Use Saved Details" button
          at the top of the Agreement and Receipt forms. Click it to auto-fill your landlord details.
          The <strong>Rent Due Day</strong> is used to automatically mark unpaid payments as overdue
          and is mentioned in generated rent agreements. You can still edit fields manually for any specific document.
        </div>
      </div>
    </div>
  );
}
