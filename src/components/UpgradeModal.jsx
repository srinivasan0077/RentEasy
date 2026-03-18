import { Crown, ArrowRight, X } from 'lucide-react';
import { getUpgradeSuggestion } from '../lib/planLimits';

/**
 * UpgradeModal — shown when a user hits a plan limit
 * Props:
 *  - show: boolean
 *  - message: string (limit message)
 *  - currentPlan: string
 *  - onClose: function
 *  - onUpgrade: function (navigates to LicensePage)
 */
export default function UpgradeModal({ show, message, currentPlan, onClose, onUpgrade }) {
  if (!show) return null;

  const suggestion = getUpgradeSuggestion(currentPlan);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal upgrade-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="upgrade-modal-header">
          <div className="upgrade-icon-circle">
            <Crown size={28} color="#f59e0b" />
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <h3 style={{ margin: '16px 0 8px', textAlign: 'center', fontSize: '1.25rem' }}>
          Upgrade Required
        </h3>

        <p style={{
          textAlign: 'center',
          color: 'var(--text-secondary)',
          fontSize: '0.95rem',
          lineHeight: 1.5,
          margin: '0 0 24px',
          padding: '0 8px',
        }}>
          {message}
        </p>

        {suggestion && (
          <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: 12,
            padding: '16px 20px',
            marginBottom: 20,
            border: '1px solid var(--border-color)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>{suggestion.label} Plan</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 2 }}>
                  Starting at {suggestion.price}
                </div>
              </div>
              <div style={{
                background: 'var(--primary)',
                color: '#fff',
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: '0.8rem',
                fontWeight: 600,
              }}>
                Recommended
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            className="btn btn-secondary"
            onClick={onClose}
            style={{ flex: 1 }}
          >
            Maybe Later
          </button>
          <button
            className="btn btn-primary"
            onClick={() => { onClose(); onUpgrade?.(); }}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            Upgrade Now <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
