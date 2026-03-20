import { useState } from 'react';
import { Building2, Mail, Lock, User, ArrowRight, Eye, EyeOff, ArrowLeft, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthPage({ showToast, onBack }) {
  const { signIn, signUp, resetPassword, updatePassword, isLocal, passwordRecovery, setPasswordRecovery } = useAuth();
  const [mode, setMode] = useState(passwordRecovery ? 'reset-password' : 'login'); // login, signup, forgot, reset-password
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', fullName: '', newPassword: '', confirmPassword: '' });

  // In local mode, auto-login
  if (isLocal) return null;

  // Detect password recovery mode from URL hash (backup for the context flag)
  useState(() => {
    if (window.location.hash.includes('reset-password') || window.location.hash.includes('type=recovery') || passwordRecovery) {
      setMode('reset-password');
    }
  });

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(form.email, form.password);
    if (error) showToast(error.message, 'error');
    else showToast('Welcome back! 🎉');
    setLoading(false);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }
    setLoading(true);
    const { error } = await signUp(form.email, form.password, form.fullName);
    if (error) showToast(error.message, 'error');
    else showToast('Account created! Check your email to verify. ✉️', 'info');
    setLoading(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!form.email) { showToast('Please enter your email address', 'error'); return; }
    setLoading(true);
    const { error } = await resetPassword(form.email);
    if (error) showToast(error.message, 'error');
    else showToast('Password reset link sent to your email! Check your inbox. 📧', 'info');
    setLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (form.newPassword.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }
    if (form.newPassword !== form.confirmPassword) { showToast('Passwords do not match', 'error'); return; }
    setLoading(true);
    const { error } = await updatePassword(form.newPassword);
    if (error) showToast(error.message, 'error');
    else {
      showToast('Password updated successfully! You can now login. ✅');
      setMode('login');
      setForm({ ...form, newPassword: '', confirmPassword: '' });
      if (setPasswordRecovery) setPasswordRecovery(false);
      window.location.hash = '';
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 50%, #c7d2fe 100%)',
      padding: '20px',
    }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        {/* Back to landing */}
        {onBack && (
          <button onClick={onBack} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer',
            fontSize: '0.9rem', fontWeight: 600, marginBottom: 16, padding: 0,
          }}>
            <ArrowLeft size={16} /> Back to Home
          </button>
        )}
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', marginBottom: '16px', boxShadow: '0 8px 30px rgba(99,102,241,0.3)',
          }}>
            <Building2 size={32} />
          </div>
          <h1 style={{
            fontSize: '2rem', fontWeight: 800,
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>RentEasy</h1>
          <p style={{ color: '#6b7280', marginTop: '4px' }}>
            Manage properties, tenants & rent — the easy way
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.1)' }}>
          {/* Tabs — only show for login/signup, not forgot/reset */}
          {(mode === 'login' || mode === 'signup') && (
            <div className="tab-buttons" style={{ marginBottom: '24px' }}>
              <button className={`tab-btn ${mode === 'login' ? 'active' : ''}`}
                onClick={() => setMode('login')}>Login</button>
              <button className={`tab-btn ${mode === 'signup' ? 'active' : ''}`}
                onClick={() => setMode('signup')}>Sign Up</button>
            </div>
          )}

          {/* Email Login */}
          {mode === 'login' && (
            <form onSubmit={handleEmailLogin}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input className="form-input" type="email" value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="you@example.com" style={{ paddingLeft: '38px' }} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input className="form-input" type={showPassword ? 'text' : 'password'} value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••" style={{ paddingLeft: '38px', paddingRight: '38px' }} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}
                style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
                {loading ? 'Logging in...' : 'Login'} <ArrowRight size={16} />
              </button>
              <div style={{ textAlign: 'center', marginTop: '12px' }}>
                <button type="button" onClick={() => setMode('forgot')}
                  style={{
                    background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer',
                    fontSize: '0.85rem', fontWeight: 500, textDecoration: 'underline',
                  }}>
                  Forgot your password?
                </button>
              </div>
            </form>
          )}

          {/* Signup */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUp}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input className="form-input" value={form.fullName}
                    onChange={e => setForm({ ...form, fullName: e.target.value })}
                    placeholder="Your full name" style={{ paddingLeft: '38px' }} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input className="form-input" type="email" value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="you@example.com" style={{ paddingLeft: '38px' }} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Password (min 6 chars)</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input className="form-input" type="password" value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••" style={{ paddingLeft: '38px' }} required />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}
                style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
                {loading ? 'Creating account...' : 'Start 30-Day Free Trial'} <ArrowRight size={16} />
              </button>
              <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#9ca3af', marginTop: '12px' }}>
                🎉 30 days free trial • No credit card required
              </p>
            </form>
          )}

          {/* Forgot Password */}
          {mode === 'forgot' && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '12px',
                  background: '#fef3c7', display: 'inline-flex', alignItems: 'center',
                  justifyContent: 'center', marginBottom: '12px',
                }}>
                  <KeyRound size={24} style={{ color: '#d97706' }} />
                </div>
                <h3 style={{ margin: 0, color: 'var(--gray-900)' }}>Forgot Password?</h3>
                <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '8px 0 0' }}>
                  Enter your email and we'll send you a reset link
                </p>
              </div>
              <form onSubmit={handleForgotPassword}>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input className="form-input" type="email" value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      placeholder="you@example.com" style={{ paddingLeft: '38px' }} required />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading}
                  style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
                  {loading ? 'Sending...' : 'Send Reset Link'} <Mail size={16} />
                </button>
              </form>
              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <button type="button" onClick={() => setMode('login')}
                  style={{
                    background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer',
                    fontSize: '0.85rem', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px',
                  }}>
                  <ArrowLeft size={14} /> Back to Login
                </button>
              </div>
            </div>
          )}

          {/* Reset Password (after clicking email link) */}
          {mode === 'reset-password' && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '12px',
                  background: '#dcfce7', display: 'inline-flex', alignItems: 'center',
                  justifyContent: 'center', marginBottom: '12px',
                }}>
                  <Lock size={24} style={{ color: '#16a34a' }} />
                </div>
                <h3 style={{ margin: 0, color: 'var(--gray-900)' }}>Set New Password</h3>
                <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '8px 0 0' }}>
                  Choose a strong password for your account
                </p>
              </div>
              <form onSubmit={handleResetPassword}>
                <div className="form-group">
                  <label className="form-label">New Password (min 6 chars)</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input className="form-input" type={showPassword ? 'text' : 'password'} value={form.newPassword}
                      onChange={e => setForm({ ...form, newPassword: e.target.value })}
                      placeholder="••••••••" style={{ paddingLeft: '38px', paddingRight: '38px' }} required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input className="form-input" type="password" value={form.confirmPassword}
                      onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                      placeholder="••••••••" style={{ paddingLeft: '38px' }} required />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading}
                  style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
                  {loading ? 'Updating...' : 'Update Password'} <ArrowRight size={16} />
                </button>
              </form>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: '24px', color: '#9ca3af', fontSize: '0.8rem' }}>
          By signing up, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
