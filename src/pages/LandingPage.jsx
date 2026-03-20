import { useState } from 'react';
import {
  Building2, Shield, Zap, FileText, Receipt, CreditCard, MessageCircle,
  Wrench, ChevronRight, Check, Star, ArrowRight, Menu, X,
  Users, Clock, CheckCircle, XCircle, Sparkles
} from 'lucide-react';

export default function LandingPage({ onGetStarted }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState('monthly');

  /* ── 3 KILLER FEATURES (spotlight section) ── */
  const spotlightFeatures = [
    {
      icon: <Receipt size={32} />,
      tag: 'Most Used Feature',
      title: 'Generate Rent Receipts Your Tenant\'s CA Will Accept',
      description: 'With landlord PAN, revenue stamp notice, digital signature & proper declaration — fully compliant for HRA exemption under Section 10(13A). Download as PDF in one click.',
      color: '#ef4444',
      highlight: 'Tenants pay rent above ₹1 lakh/year? PAN on receipt is mandatory. We handle it.',
    },
    {
      icon: <FileText size={32} />,
      tag: 'Save ₹500–₹2000',
      title: 'Create Rent Agreements Without Paying an Agent',
      description: 'Stamp duty (state-specific), lock-in period, police verification clause, TDS above ₹50,000/month, escalation, security deposit — all standard Indian clauses, auto-filled from your tenant data.',
      color: '#8b5cf6',
      highlight: 'Ready-to-print PDF. Just sign, notarize, done.',
    },
    {
      icon: <MessageCircle size={32} />,
      tag: 'No Other Tool Does This',
      title: 'Send Rent Reminders via WhatsApp — One Tap',
      description: 'No more awkward phone calls asking for rent. One click opens a pre-written WhatsApp message to your tenant. Polite, professional, instant. Works on any phone.',
      color: '#22c55e',
      highlight: 'Rent is late? Tap. Reminder sent. That\'s it.',
    },
  ];

  /* ── SECONDARY FEATURES (grid below) ── */
  const features = [
    {
      icon: <CreditCard size={28} />,
      title: 'Know Who Paid & Who Didn\'t — Instantly',
      description: 'Colour-coded payment tracker shows paid, pending & overdue at a glance. Auto-marks overdue after your due date. No more checking bank statements manually.',
      color: '#f59e0b',
    },
    {
      icon: <Users size={28} />,
      title: 'Every Tenant Detail in One Place',
      description: 'Aadhaar, PAN, lease dates, emergency contacts, attached documents — stop digging through WhatsApp chats. Access from any device, anytime.',
      color: '#059669',
    },
    {
      icon: <Wrench size={28} />,
      title: 'Track Maintenance Complaints Properly',
      description: 'Tenant reports a leaking tap? Log it, set priority, track progress, attach photos. No more forgetting complaints or losing messages in WhatsApp.',
      color: '#0ea5e9',
    },
    {
      icon: <Building2 size={28} />,
      title: 'One Dashboard — Even for 50 Properties',
      description: 'Rent collected, pending dues, vacant units, overdue payments, maintenance issues — everything across all your properties in one view.',
      color: '#6366f1',
    },
  ];

  const plans = [
    {
      name: 'Free',
      price: '₹0',
      period: 'forever',
      description: 'For 1–2 properties. Everything you need.',
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
      description: 'For landlords with 3–10 properties',
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
      description: 'For PG owners, agents & large portfolios',
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
            🇮🇳 Built specifically for Indian landlords — PAN, Aadhaar, stamp duty & ₹ formatting included
          </div>
          <h1 className="landing-hero-title">
            Rent Receipts, Agreements &<br />
            <span className="landing-gradient-text">Payment Tracking — All Free</span>
          </h1>
          <p className="landing-hero-subtitle">
            Stop using Excel, WhatsApp & paper to manage tenants.<br />
            RentEasy does it all — and your first receipt is ready in 30 seconds.
          </p>
          <div className="landing-hero-actions">
            <button className="landing-btn landing-btn-primary landing-btn-lg" onClick={onGetStarted}>
              Generate Your First Receipt — Free <ArrowRight size={18} />
            </button>
          </div>
          <p className="landing-hero-sub-cta">No credit card · No setup · Works on phone & laptop</p>
          <div className="landing-hero-stats">
            <div className="landing-stat">
              <div className="landing-stat-number">30 sec</div>
              <div className="landing-stat-label">to create a rent receipt</div>
            </div>
            <div className="landing-stat-divider" />
            <div className="landing-stat">
              <div className="landing-stat-number">₹0</div>
              <div className="landing-stat-label">free forever — not a trial</div>
            </div>
            <div className="landing-stat-divider" />
            <div className="landing-stat">
              <div className="landing-stat-number">HRA</div>
              <div className="landing-stat-label">Section 10(13A) compliant</div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== KILLER FEATURE SPOTLIGHT ===== */}
      <section id="features" className="landing-section">
        <div className="landing-container">
          <div className="landing-section-header">
            <h2>3 Things No Other Rental Tool<br /><span className="landing-gradient-text">Does for Indian Landlords</span></h2>
            <p>These aren't just features — they solve problems you face every single month.</p>
          </div>
          <div className="landing-spotlight-list">
            {spotlightFeatures.map((sf, i) => (
              <div key={i} className="landing-spotlight-card">
                <div className="landing-spotlight-left">
                  <div className="landing-spotlight-tag" style={{ background: `${sf.color}15`, color: sf.color }}>{sf.tag}</div>
                  <h3>{sf.title}</h3>
                  <p>{sf.description}</p>
                  <div className="landing-spotlight-highlight">
                    <Zap size={16} /> {sf.highlight}
                  </div>
                </div>
                <div className="landing-spotlight-icon" style={{ background: `${sf.color}10`, color: sf.color }}>
                  {sf.icon}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== BEFORE vs AFTER ===== */}
      <section className="landing-section landing-section-alt">
        <div className="landing-container">
          <div className="landing-section-header">
            <h2>You're Still Managing Rent<br /><span className="landing-gradient-text">The Hard Way</span></h2>
            <p>Sound familiar? Here's what changes with RentEasy.</p>
          </div>
          <div className="landing-before-after">
            <div className="landing-ba-column landing-ba-before">
              <div className="landing-ba-label"><XCircle size={18} /> Without RentEasy</div>
              <ul>
                <li>Tracking rent in Excel or a paper notebook</li>
                <li>Calling tenants awkwardly to ask for rent</li>
                <li>Paying ₹500–₹2000 to agents for agreements</li>
                <li>Tenants asking for receipts during tax season — and you scramble</li>
                <li>Forgetting who paid and who didn't</li>
                <li>Maintenance complaints lost in WhatsApp chats</li>
              </ul>
            </div>
            <div className="landing-ba-column landing-ba-after">
              <div className="landing-ba-label"><Sparkles size={18} /> With RentEasy</div>
              <ul>
                <li>One dashboard shows all properties, tenants & payments</li>
                <li>Send polite WhatsApp reminders with one click</li>
                <li>Generate rent agreements yourself in 30 seconds</li>
                <li>Create HRA-compliant receipts instantly — download as PDF</li>
                <li>Auto-tracks paid, pending & overdue — colour-coded</li>
                <li>Log complaints, set priority, track resolution</li>
              </ul>
            </div>
          </div>
          <div className="landing-ba-cta">
            <button className="landing-btn landing-btn-primary landing-btn-lg" onClick={onGetStarted}>
              Try It Free — See the Difference <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* ===== MORE FEATURES ===== */}
      <section className="landing-section">
        <div className="landing-container">
          <div className="landing-section-header">
            <h2>And There's More —<br /><span className="landing-gradient-text">All Built In</span></h2>
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
      <section id="how-it-works" className="landing-section landing-section-alt">
        <div className="landing-container">
          <div className="landing-section-header">
            <h2>How Does It Work?<br /><span className="landing-gradient-text">3 Simple Steps</span></h2>
            <p>If you can use WhatsApp, you can use RentEasy. No training, no manual, no tech skills.</p>
          </div>
          <div className="landing-steps">
            <div className="landing-step">
              <div className="landing-step-number">1</div>
              <h3>Sign Up Free</h3>
              <p>Email or Google login. No credit card. No phone verification. Takes 30 seconds.</p>
            </div>
            <div className="landing-step-arrow"><ChevronRight size={24} /></div>
            <div className="landing-step">
              <div className="landing-step-number">2</div>
              <h3>Add Property & Tenant</h3>
              <p>Property address, rent amount, tenant name, Aadhaar, PAN. That's all you need.</p>
            </div>
            <div className="landing-step-arrow"><ChevronRight size={24} /></div>
            <div className="landing-step">
              <div className="landing-step-number">3</div>
              <h3>Generate & Track</h3>
              <p>Create receipts & agreements as PDF. Track payments. Send WhatsApp reminders. Done.</p>
            </div>
          </div>
          <div className="landing-steps-trust">
            <Shield size={16} />
            <span>Your data is encrypted & private — only you can see it. Built by an Indian engineer who saw this problem firsthand.</span>
          </div>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section id="pricing" className="landing-section">
        <div className="landing-container">
          <div className="landing-section-header">
            <h2>Pick a Plan That<br /><span className="landing-gradient-text">Fits Your Needs</span></h2>
            <p>Start free. Upgrade only when your portfolio grows. No hidden fees.</p>
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
          <h2>Every Month You Delay, You're Losing Time & Money</h2>
          <p>Agents charge ₹500–₹2000 per agreement. Tenants pester you for receipts. Rent is late and you forget who paid. Fix it all today — in 5 minutes.</p>
          <button className="landing-btn landing-btn-white landing-btn-lg" onClick={onGetStarted}>
            Create My Free Account <ArrowRight size={18} />
          </button>
          <div className="landing-cta-reassurance">
            <span><Check size={14} /> Free forever plan</span>
            <span><Check size={14} /> No credit card</span>
            <span><Check size={14} /> Takes 2 minutes</span>
            <span><Check size={14} /> Cancel anytime</span>
          </div>
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
