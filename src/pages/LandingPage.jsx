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
      icon: <Building2 size={28} />,
      title: 'Property Management',
      description: 'Add and manage all your rental properties in one place. Track addresses, rent amounts, deposits, and more.',
      color: '#6366f1',
    },
    {
      icon: <Users size={28} />,
      title: 'Tenant Directory',
      description: 'Store tenant details including Aadhaar, PAN, emergency contacts. Upload documents securely.',
      color: '#059669',
    },
    {
      icon: <CreditCard size={28} />,
      title: 'Rent Payment Tracking',
      description: 'Track every payment — paid, pending, or overdue. Generate bulk entries for all tenants at once.',
      color: '#f59e0b',
    },
    {
      icon: <FileText size={28} />,
      title: 'Rent Agreement Generator',
      description: 'Generate legally formatted rental agreements with stamp duty, lock-in, and TDS clauses. Download as PDF.',
      color: '#8b5cf6',
    },
    {
      icon: <Receipt size={28} />,
      title: 'HRA Rent Receipts',
      description: 'Generate HRA-compliant rent receipts with landlord PAN, revenue stamp notice, and proper declaration.',
      color: '#ef4444',
    },
    {
      icon: <MessageCircle size={28} />,
      title: 'WhatsApp Reminders',
      description: 'Send rent payment reminders to tenants directly via WhatsApp with one click. No API cost.',
      color: '#22c55e',
    },
    {
      icon: <Wrench size={28} />,
      title: 'Maintenance Tracker',
      description: 'Log maintenance requests, track status, assign priorities, and attach photos of issues.',
      color: '#0ea5e9',
    },
    {
      icon: <Shield size={28} />,
      title: 'India-First Compliance',
      description: 'Built for Indian landlords — stamp duty by state, police verification clause, TDS above ₹50K, and more.',
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
      role: 'Property Owner, Bangalore',
      text: 'RentEasy saved me hours every month. I used to track rents in Excel — now everything is automated. The WhatsApp reminder feature is brilliant!',
      rating: 5,
    },
    {
      name: 'Priya Menon',
      role: 'PG Owner, Chennai',
      text: 'Managing 30 PG tenants was a nightmare. RentEasy made it simple. The rent receipt generator helps my tenants claim HRA tax benefits.',
      rating: 5,
    },
    {
      name: 'Amit Gupta',
      role: 'Real Estate Agent, Delhi',
      text: 'I manage properties for 8 different owners. The agreement generator with proper legal clauses has been a game-changer. Highly recommended!',
      rating: 5,
    },
  ];

  const faqs = [
    {
      q: 'Is RentEasy free to use?',
      a: 'Yes! The Free plan lets you manage 2 properties and 3 tenants with no time limit. Upgrade to Pro or Business when you need more.',
    },
    {
      q: 'Are the rent agreements legally valid?',
      a: 'Our agreements include all standard Indian rental clauses — stamp duty, lock-in, police verification, and TDS. However, we recommend getting them notarized or registered for full legal validity.',
    },
    {
      q: 'Can my tenants use rent receipts for HRA?',
      a: 'Absolutely. Our receipts include landlord PAN (mandatory above ₹1 lakh/year), revenue stamp notice, and a proper declaration — fully compliant for HRA exemption.',
    },
    {
      q: 'Is my data secure?',
      a: 'Your data is stored securely on Supabase (powered by PostgreSQL) with row-level security. Each user can only access their own data. We never share or sell your information.',
    },
    {
      q: 'Can I cancel anytime?',
      a: 'Yes, there are no contracts. Cancel anytime from your account settings. Your data remains accessible on the Free plan.',
    },
    {
      q: 'Do you support UPI payments?',
      a: 'Yes! We use Razorpay for payments, which supports UPI, credit/debit cards, net banking, and wallets.',
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
            <Crown size={14} /> Built for Indian Landlords
          </div>
          <h1 className="landing-hero-title">
            Manage Rentals.<br />
            <span className="landing-gradient-text">Generate Documents.</span><br />
            Grow Effortlessly.
          </h1>
          <p className="landing-hero-subtitle">
            Track properties, tenants, payments, and maintenance — all in one place.
            Generate legally compliant rent agreements and HRA receipts in seconds.
          </p>
          <div className="landing-hero-actions">
            <button className="landing-btn landing-btn-primary landing-btn-lg" onClick={onGetStarted}>
              Get Started Free <ArrowRight size={18} />
            </button>
            <a href="#features" className="landing-btn landing-btn-outline landing-btn-lg">
              See Features
            </a>
          </div>
          <div className="landing-hero-stats">
            <div className="landing-stat">
              <div className="landing-stat-number">100%</div>
              <div className="landing-stat-label">Free to start</div>
            </div>
            <div className="landing-stat-divider" />
            <div className="landing-stat">
              <div className="landing-stat-number">₹0</div>
              <div className="landing-stat-label">No credit card</div>
            </div>
            <div className="landing-stat-divider" />
            <div className="landing-stat">
              <div className="landing-stat-number">2 min</div>
              <div className="landing-stat-label">Setup time</div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="features" className="landing-section">
        <div className="landing-container">
          <div className="landing-section-header">
            <h2>Everything You Need to<br /><span className="landing-gradient-text">Manage Rentals Like a Pro</span></h2>
            <p>Purpose-built tools for Indian landlords, PG owners, and real estate agents.</p>
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
            <h2>Get Started in<br /><span className="landing-gradient-text">3 Simple Steps</span></h2>
          </div>
          <div className="landing-steps">
            <div className="landing-step">
              <div className="landing-step-number">1</div>
              <h3>Sign Up Free</h3>
              <p>Create your account in 30 seconds. No credit card required. Start with the Free plan.</p>
            </div>
            <div className="landing-step-arrow"><ChevronRight size={24} /></div>
            <div className="landing-step">
              <div className="landing-step-number">2</div>
              <h3>Add Properties & Tenants</h3>
              <p>Enter your property details and tenant information. Import existing data easily.</p>
            </div>
            <div className="landing-step-arrow"><ChevronRight size={24} /></div>
            <div className="landing-step">
              <div className="landing-step-number">3</div>
              <h3>Track & Generate</h3>
              <p>Track payments, send reminders, and generate agreements & receipts instantly.</p>
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
            <h2>Trusted by<br /><span className="landing-gradient-text">Indian Landlords</span></h2>
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
            <h2>Frequently Asked<br /><span className="landing-gradient-text">Questions</span></h2>
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
          <h2>Ready to Simplify Your Rental Management?</h2>
          <p>Join thousands of Indian landlords who trust RentEasy. Free forever — upgrade when you're ready.</p>
          <button className="landing-btn landing-btn-white landing-btn-lg" onClick={onGetStarted}>
            Get Started Free <ArrowRight size={18} />
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
              <p>The simplest way for Indian landlords to manage rental properties, tenants, and documents.</p>
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
            <p>© 2026 RentEasy. Made with ❤️ in India.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
