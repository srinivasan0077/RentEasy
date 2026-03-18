import { useState, useEffect } from 'react';
import { Crown, Check, Star, Zap, Shield, CreditCard, Clock, IndianRupee } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { RAZORPAY_PLANS, createOrder, openCheckout, getSubscriptionHistory } from '../lib/razorpay';
import { PLAN_LIMITS, formatLimit } from '../lib/planLimits';

export default function LicensePage({ showToast }) {
  const { user, profile, getDaysLeft, isPro, isLocal, refreshLicense, PLAN_LIMITS } = useAuth();

  const currentPlan = profile?.plan || 'free';
  const daysLeft = getDaysLeft();
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [upgrading, setUpgrading] = useState(null); // planId being purchased
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (!isLocal && user?.id) {
      setLoadingHistory(true);
      getSubscriptionHistory(user.id)
        .then(setHistory)
        .finally(() => setLoadingHistory(false));
    }
  }, [user?.id, isLocal]);

  const plans = [
    {
      id: 'free',
      name: 'Free',
      monthlyPrice: '₹0',
      annualPrice: '₹0',
      period: 'forever',
      icon: <Star size={24} />,
      color: '#6b7280',
      features: [
        `${PLAN_LIMITS.free.properties} Properties`,
        `${PLAN_LIMITS.free.tenants} Tenants`,
        `${PLAN_LIMITS.free.agreements} Agreements/month`,
        `${PLAN_LIMITS.free.receipts} Receipts/month`,
        'Unlimited Payments & Maintenance',
        'WhatsApp reminders',
      ],
      notIncluded: ['File uploads', 'Bulk operations'],
    },
    {
      id: 'pro',
      name: 'Pro',
      monthlyPrice: '₹199',
      annualPrice: '₹1,999',
      annualSaving: 'Save ₹389/yr',
      period: billingPeriod === 'monthly' ? '/month' : '/year',
      icon: <Zap size={24} />,
      color: '#6366f1',
      popular: true,
      razorpayPlanId: billingPeriod === 'monthly' ? 'pro_monthly' : 'pro_annual',
      features: [
        `${PLAN_LIMITS.pro.properties} Properties`,
        `${PLAN_LIMITS.pro.tenants} Tenants`,
        `${PLAN_LIMITS.pro.agreements} Agreements/month`,
        `${PLAN_LIMITS.pro.receipts} Receipts/month`,
        `${PLAN_LIMITS.pro.attachmentsMB} MB file storage`,
        'Bulk payment generation',
        'WhatsApp reminders',
        'Email support',
      ],
      notIncluded: ['Priority support'],
    },
    {
      id: 'business',
      name: 'Business',
      monthlyPrice: '₹499',
      annualPrice: '₹4,999',
      annualSaving: 'Save ₹989/yr',
      period: billingPeriod === 'monthly' ? '/month' : '/year',
      icon: <Shield size={24} />,
      color: '#059669',
      razorpayPlanId: billingPeriod === 'monthly' ? 'business_monthly' : 'business_annual',
      features: [
        `${PLAN_LIMITS.business.properties} Properties`,
        `${PLAN_LIMITS.business.tenants} Tenants`,
        'Unlimited Agreements & Receipts',
        `${PLAN_LIMITS.business.attachmentsMB} MB file storage`,
        'Bulk payment generation',
        'WhatsApp reminders',
        'Priority support',
      ],
      notIncluded: [],
    },
  ];

  const handleUpgrade = async (plan) => {
    if (!plan.razorpayPlanId) return;

    if (isLocal) {
      showToast('Payment requires Supabase. Configure .env to enable payments.', 'error');
      return;
    }

    const razorpayPlan = RAZORPAY_PLANS[plan.razorpayPlanId];
    if (!razorpayPlan) {
      showToast('Invalid plan configuration', 'error');
      return;
    }

    setUpgrading(plan.razorpayPlanId);

    try {
      // Step 1: Create order via Edge Function
      const orderData = await createOrder(plan.razorpayPlanId, user.id);

      // Step 2: Open Razorpay checkout
      openCheckout({
        orderId: orderData.orderId,
        amount: orderData.amount,
        planName: razorpayPlan.description,
        userEmail: profile?.email || user?.email || '',
        userName: profile?.full_name || '',
        userId: user.id,
        onSuccess: async (result) => {
          showToast(`🎉 Upgraded to ${result.plan} plan! Welcome aboard!`, 'success');
          // Refresh license and profile data
          await refreshLicense();
          // Refresh subscription history
          const updated = await getSubscriptionHistory(user.id);
          setHistory(updated);
          setUpgrading(null);
        },
        onFailure: (errorMsg) => {
          showToast(errorMsg || 'Payment failed. Please try again.', 'error');
          setUpgrading(null);
        },
      });
    } catch (err) {
      console.error('Upgrade error:', err);
      showToast(err.message || 'Failed to start payment. Try again.', 'error');
      setUpgrading(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div>
      <div className="page-header" style={{ textAlign: 'center' }}>
        <h2>💎 Choose Your Plan</h2>
        <p>Start with a 30-day free trial, upgrade anytime</p>
      </div>

      {/* Current Plan Status */}
      <div className="card" style={{
        marginBottom: '24px', textAlign: 'center',
        background: currentPlan === 'trial' ? 'linear-gradient(135deg, #eef2ff, #e0e7ff)' : isPro() ? 'linear-gradient(135deg, #ecfdf5, #d1fae5)' : 'var(--white)',
        border: `2px solid ${isPro() ? 'var(--success)' : 'var(--primary)'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '12px' }}>
          <Crown size={24} style={{ color: isPro() ? 'var(--success)' : 'var(--primary)' }} />
          <h3 style={{ fontSize: '1.2rem' }}>
            Current Plan: <span style={{ color: isPro() ? 'var(--success)' : 'var(--primary)', textTransform: 'capitalize' }}>{currentPlan}</span>
          </h3>
        </div>
        {currentPlan === 'trial' && (
          <div>
            <p style={{ color: 'var(--gray-600)', marginBottom: '8px' }}>
              Your trial {daysLeft > 0
                ? <>has <strong style={{ color: 'var(--primary)' }}>{daysLeft} days</strong> remaining</>
                : <strong style={{ color: 'var(--danger)' }}>has expired</strong>
              }
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--gray-400)' }}>Upgrade to Pro for unlimited features</p>
          </div>
        )}
        {currentPlan === 'free' && (
          <p style={{ color: 'var(--gray-500)' }}>
            Limited to {PLAN_LIMITS.free.properties} properties and {PLAN_LIMITS.free.receipts} receipts/month
          </p>
        )}
        {isPro() && (
          <p style={{ color: 'var(--success)', fontWeight: 600 }}>
            ✅ All features unlocked! {daysLeft > 0 && `Renews in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`}
          </p>
        )}
      </div>

      {/* Billing Period Toggle */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px', gap: '4px' }}>
        <div style={{
          display: 'inline-flex', background: 'var(--gray-100)', borderRadius: '12px', padding: '4px',
        }}>
          <button
            onClick={() => setBillingPeriod('monthly')}
            style={{
              padding: '8px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.9rem', transition: 'all 0.2s',
              background: billingPeriod === 'monthly' ? 'white' : 'transparent',
              color: billingPeriod === 'monthly' ? 'var(--gray-800)' : 'var(--gray-400)',
              boxShadow: billingPeriod === 'monthly' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod('annual')}
            style={{
              padding: '8px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.9rem', transition: 'all 0.2s',
              background: billingPeriod === 'annual' ? 'white' : 'transparent',
              color: billingPeriod === 'annual' ? 'var(--gray-800)' : 'var(--gray-400)',
              boxShadow: billingPeriod === 'annual' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            Annual
            <span style={{
              background: '#059669', color: 'white', padding: '2px 8px',
              borderRadius: '10px', fontSize: '0.7rem', marginLeft: '6px', fontWeight: 700,
            }}>
              -17%
            </span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
        {plans.map(plan => {
          const displayPrice = billingPeriod === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
          const isCurrentPlan = currentPlan === plan.id;
          const isUpgrading = upgrading === plan.razorpayPlanId;

          return (
            <div key={plan.id} className="card" style={{
              position: 'relative',
              border: plan.popular ? '2px solid var(--primary)' : '1px solid var(--gray-200)',
              transform: plan.popular ? 'scale(1.02)' : 'none',
              opacity: isUpgrading ? 0.7 : 1,
            }}>
              {plan.popular && (
                <div style={{
                  position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
                  background: 'var(--primary)', color: 'white', padding: '4px 16px',
                  borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                }}>
                  MOST POPULAR
                </div>
              )}

              <div style={{ textAlign: 'center', marginBottom: '24px', paddingTop: plan.popular ? '8px' : 0 }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '12px',
                  background: `${plan.color}15`, color: plan.color,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '12px',
                }}>
                  {plan.icon}
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{plan.name}</h3>
                <div style={{ marginTop: '8px' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 800, color: plan.color }}>{displayPrice}</span>
                  <span style={{ color: 'var(--gray-400)', fontSize: '0.9rem' }}>{plan.period}</span>
                </div>
                {billingPeriod === 'annual' && plan.annualSaving && (
                  <div style={{
                    display: 'inline-block', marginTop: '6px', padding: '2px 10px',
                    background: '#ecfdf5', color: '#059669', borderRadius: '8px',
                    fontSize: '0.8rem', fontWeight: 600,
                  }}>
                    {plan.annualSaving}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '24px' }}>
                {plan.features.map((feature, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', fontSize: '0.9rem' }}>
                    <Check size={16} style={{ color: 'var(--success)', flexShrink: 0 }} />
                    <span>{feature}</span>
                  </div>
                ))}
                {plan.notIncluded.map((feature, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', fontSize: '0.9rem', color: 'var(--gray-300)' }}>
                    <span style={{ width: '16px', textAlign: 'center', flexShrink: 0 }}>✕</span>
                    <span style={{ textDecoration: 'line-through' }}>{feature}</span>
                  </div>
                ))}
              </div>

              {isCurrentPlan ? (
                <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} disabled>
                  Current Plan
                </button>
              ) : plan.id === 'free' ? (
                <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} disabled>
                  {currentPlan === 'trial' ? 'After Trial Ends' : 'Downgrade'}
                </button>
              ) : (
                <button
                  className={`btn ${plan.popular ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => handleUpgrade(plan)}
                  disabled={!!upgrading}
                >
                  {isUpgrading ? (
                    <>Processing...</>
                  ) : (
                    <><CreditCard size={16} /> Upgrade to {plan.name}</>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Subscription History */}
      {!isLocal && (
        <div className="card" style={{ marginTop: '32px' }}>
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={20} /> Payment History
          </h3>
          {loadingHistory ? (
            <p style={{ color: 'var(--gray-400)', textAlign: 'center', padding: '20px' }}>Loading...</p>
          ) : history.length === 0 ? (
            <p style={{ color: 'var(--gray-400)', textAlign: 'center', padding: '20px' }}>
              No payment history yet. Upgrade to a paid plan to see your transactions here.
            </p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Plan</th>
                    <th>Period</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Valid Until</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(sub => (
                    <tr key={sub.id}>
                      <td>{formatDate(sub.created_at)}</td>
                      <td style={{ fontWeight: 600, textTransform: 'capitalize' }}>{sub.plan}</td>
                      <td style={{ textTransform: 'capitalize' }}>{sub.period}</td>
                      <td style={{ fontWeight: 700 }}>
                        <IndianRupee size={12} style={{ verticalAlign: 'middle' }} />
                        {Number(sub.amount).toLocaleString('en-IN')}
                      </td>
                      <td>
                        <span className={`badge badge-${sub.status === 'paid' ? 'success' : sub.status === 'failed' ? 'danger' : 'warning'}`}>
                          {sub.status}
                        </span>
                      </td>
                      <td>{formatDate(sub.ends_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* FAQ */}
      <div className="card" style={{ marginTop: '32px' }}>
        <h3 style={{ marginBottom: '16px' }}>❓ Frequently Asked Questions</h3>
        {[
          { q: 'What happens after my 30-day trial?', a: 'Your account switches to the Free plan. You keep all your data but some features are limited. Upgrade anytime to unlock everything.' },
          { q: 'Can I cancel anytime?', a: 'Yes! Cancel anytime. Your account will revert to the Free plan at the end of the billing cycle. No refunds for partial months.' },
          { q: 'Is annual billing worth it?', a: 'Annual billing saves you 17% compared to monthly. Pro Annual costs ₹1,999/yr instead of ₹2,388/yr (monthly × 12).' },
          { q: 'What payment methods do you accept?', a: 'UPI, Debit/Credit Cards, Net Banking, and popular wallets — all via Razorpay. Payments are securely processed in India.' },
          { q: 'Is my data safe?', a: 'Absolutely. All data is encrypted and stored on Supabase (PostgreSQL) with row-level security. Each user can only see their own data.' },
          { q: 'Can I switch between monthly and annual?', a: 'Yes. When you switch, the new billing cycle starts immediately. You get full value for the period you purchase.' },
        ].map((faq, i) => (
          <div key={i} style={{ padding: '12px 0', borderBottom: i < 5 ? '1px solid var(--gray-100)' : 'none' }}>
            <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--gray-800)' }}>{faq.q}</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--gray-500)' }}>{faq.a}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
