import { useState } from 'react';
import {
  Building2, Shield, Zap, FileText, Receipt, CreditCard, MessageCircle,
  Wrench, ChevronRight, Check, Star, ArrowRight, Menu, X, Crown,
  Users, IndianRupee, Download, Clock, CheckCircle
} from 'lucide-react';

export default function LandingPage({ onGetStarted }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState('monthly');

  const features = [
    {
      icon: <FileText size={28} />,
      title: 'Rent Agreements in 30 Seconds',
      description: 'Stop paying ₹500–₹2000 to agents for drafting. Generate legally formatted agreements with stamp duty, lock-in period, police verification & TDS clauses — ready to print as PDF.',
      color: '#8b5cf6',
    },
    {
      icon: <Receipt size={28} />,
      title: 'HRA Rent Receipts — Tax Ready',
      description: 'Your tenants need receipts for HRA exemption? Generate compliant receipts with landlord PAN, revenue stamp notice, and proper declaration. Their CA will thank you.',
      color: '#ef4444',
    },
    {
      icon: <CreditCard size={28} />,
      title: 'Never Miss a Rent Payment',
      description: 'See who paid, who didn\'t, and who\'s overdue — at a glance. Auto-marks payments overdue after your due date. Send WhatsApp reminders with one tap.',
      color: '#f59e0b',
    },
    {
      icon: <Users size={28} />,
      title: 'All Tenants in One Place',
      description: 'Store Aadhaar, PAN, lease dates, emergency contacts — no more digging through WhatsApp chats. Attach documents securely. Access from any device.',
      color: '#059669',
    },
    {
      icon: <Building2 size={28} />,
      title: 'Multi-Property Dashboard',
      description: 'Own 2 flats or 50? One dashboard shows rent collected, pending dues, vacant units, and maintenance issues across all properties.',
      color: '#6366f1',
    },
    {
      icon: <Wrench size={28} />,
      title: 'Maintenance Without the Chaos',
      description: 'Tenants report a leaking tap? Log it, set priority, track progress, attach photos. No more forgetting complaints or losing messages.',
      color: '#0ea5e9',
    },
    {
      icon: <MessageCircle size={28} />,
      title: 'WhatsApp Rent Reminders',
      description: 'One click sends a polite payment reminder to your tenant on WhatsApp. No awkward phone calls. No cost. Works with any phone.',
      color: '#22c55e',
    },
    {
      icon: <Shield size={28} />,
      title: 'Built for India, By India',
      description: 'Stamp duty rules for all 28 states. Indian numbering (₹1,00,000). DD/MM/YYYY dates. PAN & Aadhaar fields. This isn\'t a foreign tool adapted for India — it\'s made for you.',
      color: '#ec4899',
    },
  ];

  const plans = [
    {
      name: 'Free',
      price: '₹0',
      period: 'forever',
      description: 'Perfect for getting started',
      color: '#6b7280',
      features: [
        '2 Properties',
        '3 Tenants',
        '3 Agreements/month',
        '3 Receipts/month',
        'Unlimited Payments tracking',
        'WhatsApp reminders',
      ],
      cta: 'Start Free',
    },
    {
      name: 'Pro',
      price: billingPeriod === 'monthly' ? '₹199' : '₹1,999',
      period: billingPeriod === 'monthly' ? '/month' : '/year',
      description: 'For serious landlords',
      color: '#6366f1',
      popular: true,
      saving: billingPeriod === 'annual' ? 'Save ₹389/yr' : null,
      features: [
        '10 Properties',
        '25 Tenants',
        '50 Agreements/month',
        '50 Receipts/month',
        '100 MB file storage',
        'Bulk payment generation',
        'Email support',
      ],
      cta: 'Start 30-Day Trial',
    },
    {
      name: 'Business',
      price: billingPeriod === 'monthly' ? '₹499' : '₹4,999',
      period: billingPeriod === 'monthly' ? '/month' : '/year',
      description: 'For PG owners & agents',
      color: '#059669',
      saving: billingPeriod === 'annual' ? 'Save ₹989/yr' : null,
      features: [
        '50 Properties',
        '100 Tenants',
        'Unlimited Agreements',
        'Unlimited Receipts',
        '500 MB file storage',
        'Bulk payment generation',
        'Priority support',
      ],
      cta: 'Start 30-Day Trial',
    },
  ];

  const testimonials = [
    {
      name: 'Rajesh Sharma',
      role: '3 Flats, Bangalore',
      text: 'I was tracking rent in a Google Sheet and chasing tenants on WhatsApp. RentEasy shows me who hasn\'t paid in 2 seconds. The agreement generator alone saved me ₹3,000.',
      rating: 5,
    },
    {
      name: 'Priya Menon',
      role: 'PG Owner, Chennai (28 beds)',
      text: 'My PG tenants kept asking for rent receipts during tax season. Now I generate 28 receipts in 5 minutes. They\'re happy, I\'m happy, their CA is happy.',
      rating: 5,
    },
    {
      name: 'Amit Gupta',
      role: 'NRI Landlord, Lives in Dubai',
      text: 'I manage 4 flats in Delhi from Dubai. Before RentEasy, I\'d call my brother to check if tenants paid. Now I just open the app. The WhatsApp reminder feature is genius.',
      rating: 5,
    },
  ];

  const faqs = [
    {
      q: 'Is RentEasy really free?',
      a: 'Yes. The Free plan gives you 2 properties and 3 tenants with no time limit — not a trial. You can generate agreements, receipts, and track payments forever. Upgrade only when you need more capacity.',
    },
    {
      q: 'Are the rent agreements legally valid in India?',
      a: 'Our agreements include all standard Indian rental clauses — stamp duty (state-specific), lock-in period, police verification, escalation, TDS above ₹50,000/month, and more. We recommend getting them notarized or registered at your local sub-registrar office for full legal validity.',
    },
    {
      q: 'Can my tenants use these rent receipts for HRA tax exemption?',
      a: 'Absolutely. Our receipts include landlord PAN (mandatory for rent above ₹1 lakh/year as per Section 194-IB), revenue stamp notice, proper declaration, and digital signature — fully compliant for HRA exemption under Section 10(13A).',
    },
    {
      q: 'Is my data safe? I\'m storing Aadhaar and PAN numbers.',
      a: 'Your data is encrypted and stored securely on enterprise-grade infrastructure with row-level security — meaning only you can access your data. We never share, sell, or access your information. You can delete your data anytime.',
    },
    {
      q: 'I\'m not tech-savvy. Is this complicated?',
      a: 'If you can use WhatsApp, you can use RentEasy. There\'s no training needed. Add a property, add a tenant, click a button to generate documents. Most landlords set up in under 5 minutes.',
    },
    {
      q: 'Can I use this from my phone?',
      a: 'Yes! RentEasy works perfectly in your phone browser — Chrome, Safari, or any browser. No app download needed. It works on desktop too. Your data syncs across all devices.',
    },
    {
      q: 'I manage properties for someone else. Can I use this?',
      a: 'Yes — the Business plan supports up to 50 properties and 100 tenants. Real estate agents and property managers use RentEasy to manage multiple owners\' properties from one account.',
    },
    {
      q: 'Can I cancel anytime?',
      a: 'Yes, there are no contracts or lock-in. Cancel anytime from your account. Your data remains accessible on the Free plan even after cancellation.',
    },
  ];

  return (
    <div className="landing-page">
      {/* ===== NAVBAR ===== */}
      <nav className="landing-nav">
        <div className="landing-container landing-nav-inner">
          <div className="landing-logo">
            <div className="logo-icon" style={{ width: 36, height: 36 }}><Building2 size={18} /></div>
            <span className="landing-logo-text">RentEasy</span>
          </div>
          <div className={`landing-nav-links ${mobileMenuOpen ? 'open' : ''}`}>
            <a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
            <a href="#testimonials" onClick={() => setMobileMenuOpen(false)}>Testimonials</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
            <button className="landing-btn landing-btn-primary landing-btn-sm" onClick={onGetStarted}>
              Sign In
            </button>
          </div>
          <button className="landing-mobile-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className="landing-hero">
        <div className="landing-container">
          <div className="landing-hero-badge">
            <Crown size={14} /> #1 Free Tool for Indian Landlords
          </div>
          <h1 className="landing-hero-title">
            Stop Using Excel & WhatsApp<br />
            <span className="landing-gradient-text">to Manage Your Rentals</span>
          </h1>
          <p className="landing-hero-subtitle">
            Generate rent agreements, HRA receipts, track payments, and send WhatsApp reminders —
            all from one dashboard. Built specifically for Indian landlords, PG owners & property managers.
          </p>
          <div className="landing-hero-actions">
            <button className="landing-btn landing-btn-primary landing-btn-lg" onClick={onGetStarted}>
              Start Free — No Credit Card <ArrowRight size={18} />
            </button>
            <a href="#features" className="landing-btn landing-btn-outline landing-btn-lg">
              See How It Works
            </a>
          </div>
          <div className="landing-hero-stats">
            <div className="landing-stat">
              <div className="landing-stat-number">30 sec</div>
              <div className="landing-stat-label">To generate a rent agreement</div>
            </div>
            <div className="landing-stat-divider" />
            <div className="landing-stat">
              <div className="landing-stat-number">₹0</div>
              <div className="landing-stat-label">Free forever plan</div>
            </div>
            <div className="landing-stat-divider" />
            <div className="landing-stat">
              <div className="landing-stat-number">100%</div>
              <div className="landing-stat-label">HRA & tax compliant</div>
            </div>
          </div>
          <div className="landing-hero-trust">
            <CheckCircle size={15} />
            <span>No credit card required</span>
            <span className="landing-trust-dot" />
            <Shield size={15} />
            <span>Your data stays private</span>
            <span className="landing-trust-dot" />
            <Clock size={15} />
            <span>Setup in under 5 minutes</span>
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="features" className="landing-section">
        <div className="landing-container">
          <div className="landing-section-header">
            <h2>Stop Juggling WhatsApp, Excel & Paper.<br /><span className="landing-gradient-text">One Dashboard for Everything.</span></h2>
            <p>Every tool an Indian landlord needs — agreements, receipts, payments, reminders — in one place.</p>
          </div>
          <div className="landing-features-grid">
            {features.map((feature, i) => (
              <div key={i} className="landing-feature-card">
                <div className="landing-feature-icon" style={{ background: `${feature.color}15`, color: feature.color }}>
                  {feature.icon}
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="landing-section landing-section-alt">
        <div className="landing-container">
          <div className="landing-section-header">
            <h2>Up and Running in<br /><span className="landing-gradient-text">Under 5 Minutes</span></h2>
            <p>No training. No setup fees. No tech skills needed.</p>
          </div>
          <div className="landing-steps">
            <div className="landing-step">
              <div className="landing-step-number">1</div>
              <h3>Create Your Free Account</h3>
              <p>Sign up with email or Google. No credit card, no phone verification. Takes 30 seconds.</p>
            </div>
            <div className="landing-step-arrow"><ChevronRight size={24} /></div>
            <div className="landing-step">
              <div className="landing-step-number">2</div>
              <h3>Add Your Properties & Tenants</h3>
              <p>Enter property address, rent amount, and tenant details (name, Aadhaar, PAN). That's it.</p>
            </div>
            <div className="landing-step-arrow"><ChevronRight size={24} /></div>
            <div className="landing-step">
              <div className="landing-step-number">3</div>
              <h3>Generate, Track & Collect</h3>
              <p>Create agreements & receipts as PDF, track who's paid, and send WhatsApp reminders to defaulters.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section id="pricing" className="landing-section">
        <div className="landing-container">
          <div className="landing-section-header">
            <h2>Simple, Transparent<br /><span className="landing-gradient-text">Pricing</span></h2>
            <p>No hidden fees. No surprises. Cancel anytime.</p>
            <div className="landing-billing-toggle">
              <button className={billingPeriod === 'monthly' ? 'active' : ''} onClick={() => setBillingPeriod('monthly')}>Monthly</button>
              <button className={billingPeriod === 'annual' ? 'active' : ''} onClick={() => setBillingPeriod('annual')}>
                Annual <span className="landing-save-badge">Save 17%</span>
              </button>
            </div>
          </div>
          <div className="landing-pricing-grid">
            {plans.map((plan, i) => (
              <div key={i} className={`landing-pricing-card ${plan.popular ? 'popular' : ''}`}>
                {plan.popular && <div className="landing-popular-badge">Most Popular</div>}
                <div className="landing-pricing-header">
                  <h3 style={{ color: plan.color }}>{plan.name}</h3>
                  <p className="landing-pricing-desc">{plan.description}</p>
                  <div className="landing-price">
                    <span className="landing-price-amount">{plan.price}</span>
                    <span className="landing-price-period">{plan.period}</span>
                  </div>
                  {plan.saving && <div className="landing-price-saving">{plan.saving}</div>}
                </div>
                <ul className="landing-pricing-features">
                  {plan.features.map((f, j) => (
                    <li key={j}><Check size={16} className="landing-check" /> {f}</li>
                  ))}
                </ul>
                <button
                  className={`landing-btn landing-btn-full ${plan.popular ? 'landing-btn-primary' : 'landing-btn-outline'}`}
                  onClick={onGetStarted}
                >
                  {plan.cta} <ArrowRight size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section id="testimonials" className="landing-section landing-section-alt">
        <div className="landing-container">
          <div className="landing-section-header">
            <h2>Landlords Across India<br /><span className="landing-gradient-text">Love RentEasy</span></h2>
            <p>From single-property owners to PG managers with 50+ beds.</p>
          </div>
          <div className="landing-testimonials-grid">
            {testimonials.map((t, i) => (
              <div key={i} className="landing-testimonial-card">
                <div className="landing-testimonial-stars">
                  {[...Array(t.rating)].map((_, j) => <Star key={j} size={16} fill="#f59e0b" color="#f59e0b" />)}
                </div>
                <p>"{t.text}"</p>
                <div className="landing-testimonial-author">
                  <div className="landing-testimonial-avatar">{t.name.split(' ').map(n => n[0]).join('')}</div>
                  <div>
                    <div className="landing-testimonial-name">{t.name}</div>
                    <div className="landing-testimonial-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" className="landing-section">
        <div className="landing-container" style={{ maxWidth: 720 }}>
          <div className="landing-section-header">
            <h2>Got Questions?<br /><span className="landing-gradient-text">We've Got Answers</span></h2>
            <p>Everything you need to know before getting started.</p>
          </div>
          <div className="landing-faq-list">
            {faqs.map((faq, i) => (
              <details key={i} className="landing-faq-item">
                <summary>{faq.q}</summary>
                <p>{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA BANNER ===== */}
      <section className="landing-cta">
        <div className="landing-container">
          <h2>Your Tenants Won't Wait. Neither Should You.</h2>
          <p>Set up your rental dashboard in under 5 minutes. Free forever for up to 2 properties — no credit card, no catch.</p>
          <button className="landing-btn landing-btn-white landing-btn-lg" onClick={onGetStarted}>
            Create My Free Account <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="landing-footer-inner">
            <div className="landing-footer-brand">
              <div className="landing-logo">
                <div className="logo-icon" style={{ width: 32, height: 32 }}><Building2 size={16} /></div>
                <span className="landing-logo-text">RentEasy</span>
              </div>
              <p>India's simplest rental management tool — agreements, receipts, payments & reminders in one place.</p>
            </div>
            <div className="landing-footer-links">
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <a href="#faq">FAQ</a>
            </div>
            <div className="landing-footer-links">
              <h4>Legal</h4>
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
              <a href="#">Refund Policy</a>
            </div>
          </div>
          <div className="landing-footer-bottom">
            <p>© {new Date().getFullYear()} RentEasy. Made with ❤️ in India.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
