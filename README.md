# 🏠 RentEasy — Rental Agreement & Tenant Manager

> The simple, powerful tool Indian landlords need to manage properties, tenants, and rent — no CA required.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Razorpay](https://img.shields.io/badge/Razorpay-Payments-0C2451?logo=razorpay&logoColor=white)](https://razorpay.com)
[![License](https://img.shields.io/badge/License-Proprietary-red)](#license)

---

## 🎯 Problem

- **90%+ Indian landlords** still use paper agreements, WhatsApp chats, and notebooks to manage rentals
- Tenants need **HRA rent receipts** for tax savings but landlords don't provide them
- **Late rent payments** cause stress — no automated reminders exist
- Legal **rent agreements** cost ₹500–2000 at a CA's office
- **No simple tool** exists for this massive market (1.1Cr+ rental properties in India)

## ✨ Features

| Feature | Description |
|---|---|
| 🏠 **Landing Page** | Premium marketing page with pricing, testimonials, FAQ |
| � **Authentication** | Supabase Auth with email/password, session persistence |
| �📊 **Dashboard** | Overview of properties, tenants, payments, and collection stats |
| 🏘️ **Properties** | Add/edit/delete rental properties with full details |
| 👥 **Tenants** | Store tenant info with Aadhaar, PAN, emergency contacts + document uploads |
| 💳 **Smart Payments** | Monthly collection dashboard, tenant cards, auto-overdue detection, quick-pay |
| 📱 **WhatsApp Reminders** | One-click & bulk "Remind All" payment reminders via WhatsApp |
| 📄 **Rent Agreements** | Generate legally formatted PDF agreements (Indian Registration Act compliant) |
| 🧾 **Rent Receipts** | HRA-compliant receipts for Section 10(13A) tax exemption |
| 🔧 **Maintenance** | Track property issues: Open → In Progress → Resolved with photo uploads |
| ⚡ **Bulk Generate** | Create payment entries for all tenants across multiple months in one click |
| 📎 **File Uploads** | Aadhaar/PAN documents, payment screenshots via Supabase Storage |
| 💎 **Plan Limits** | Feature-gated plans (Free → Trial → Pro → Business) |
| 💰 **Razorpay Checkout** | Subscription payments with order creation + verification |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│          React 19 + Vite 8 + Custom CSS          │
│                                                   │
│  Landing → Auth → Dashboard → Feature Pages       │
└────────────────────┬────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
  ┌─────▼─────┐          ┌───────▼───────┐
  │  Supabase  │          │  localStorage  │
  │  (online)  │          │  (fallback)    │
  │            │          └───────────────┘
  │ • Auth     │
  │ • Postgres │
  │ • Storage  │
  │ • Edge Fn  │
  └─────┬──────┘
        │
  ┌─────▼──────┐
  │  Razorpay   │
  │  Payments   │
  └────────────┘
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Quick Start (Local Mode — no backend needed)

```bash
git clone https://github.com/YOUR_USERNAME/renteasy.git
cd renteasy
npm install
npm run dev
```

Open `http://localhost:5173` — works with localStorage, no Supabase needed!

### Full Setup (with Supabase Backend)

1. **Create a Supabase project** at [supabase.com](https://supabase.com)

2. **Run the database schema:**
   ```sql
   -- Run supabase/schema.sql first, then supabase/schema-v2.sql
   ```

3. **Create storage bucket:**
   - Go to Supabase Dashboard → Storage → Create bucket `renteasy-attachments` (public)
   - Run `supabase/storage-policies.sql` in SQL Editor

4. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase URL and Anon Key
   ```

5. **Deploy Edge Functions** (for Razorpay):
   ```bash
   supabase functions deploy create-razorpay-order
   supabase functions deploy verify-razorpay-order
   ```

6. **Set Razorpay secrets** in Supabase Dashboard → Edge Functions → Secrets:
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`

7. **Start dev server:**
   ```bash
   npm run dev
   ```

## 📁 Project Structure

```
renteasy/
├── public/                    # Static assets
├── src/
│   ├── assets/               # Images, logos
│   ├── components/           # Reusable components
│   │   ├── FileUpload.jsx    # File upload with preview
│   │   ├── Pagination.jsx    # Reusable pagination
│   │   ├── Toast.jsx         # Toast notifications
│   │   └── UpgradeModal.jsx  # Plan upgrade prompt
│   ├── context/
│   │   └── AuthContext.jsx   # Auth + license management
│   ├── lib/
│   │   ├── planLimits.js     # Centralized plan configuration
│   │   ├── razorpay.js       # Razorpay client integration
│   │   └── supabase.js       # Supabase client setup
│   ├── pages/
│   │   ├── Agreements.jsx    # Rent agreement PDF generator
│   │   ├── AuthPage.jsx      # Login / Sign up
│   │   ├── Dashboard.jsx     # Main dashboard
│   │   ├── LandingPage.jsx   # Marketing landing page
│   │   ├── LicensePage.jsx   # Subscription management
│   │   ├── Maintenance.jsx   # Maintenance tracker
│   │   ├── Payments.jsx      # Payment tracking + collection dashboard
│   │   ├── Properties.jsx    # Property management
│   │   ├── Receipts.jsx      # HRA rent receipt generator
│   │   └── Tenants.jsx       # Tenant management
│   ├── App.jsx               # Main app with routing
│   ├── main.jsx              # Entry point
│   ├── store.js              # Hybrid data store (Supabase + localStorage)
│   ├── index.css             # Global styles
│   └── landing.css           # Landing page styles
├── supabase/
│   ├── functions/            # Edge Functions (Razorpay)
│   │   ├── create-razorpay-order/
│   │   └── verify-razorpay-order/
│   ├── schema.sql            # Core database schema
│   ├── schema-v2.sql         # V2: subscriptions, attachments
│   └── storage-policies.sql  # Storage bucket RLS policies
├── .env.example              # Environment template
├── .gitignore
├── index.html
├── package.json
└── vite.config.js
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite 8 |
| **Styling** | Custom CSS with CSS Variables (no frameworks) |
| **Icons** | Lucide React |
| **PDF Generation** | jsPDF + html2canvas |
| **Backend** | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| **Payments** | Razorpay (subscriptions) |
| **Dates** | date-fns |
| **Routing** | React Router DOM v7 |

## 💰 Pricing Plans

| Feature | Free | Trial | Pro (₹199/mo) | Business (₹499/mo) |
|---------|------|-------|----------------|---------------------|
| Properties | 2 | 5 | 10 | 50 |
| Tenants | 3 | 10 | 25 | 100 |
| Agreements/mo | 3 | 10 | 50 | Unlimited |
| Receipts/mo | 3 | 20 | 50 | Unlimited |
| Attachments | ❌ | 50 MB | 100 MB | 500 MB |
| Bulk Generate | ❌ | ✅ | ✅ | ✅ |
| WhatsApp Reminders | ✅ | ✅ | ✅ | ✅ |

## 🌐 Environments

| Environment | URL | Branch | Supabase | Razorpay |
|-------------|-----|--------|----------|----------|
| **Development** | `localhost:5173` | local | Test project | Test keys |
| **Staging** | `test.renteasy.in` | `develop` | Test project | Test keys |
| **Production** | `renteasy.in` | `main` | Production project | Live keys |

## 📜 Scripts

```bash
npm run dev       # Start dev server
npm run build     # Build for production
npm run preview   # Preview production build
npm run lint      # Run ESLint
```

## 🇮🇳 India-Specific

- Currency: Indian Rupees (₹) with `toLocaleString('en-IN')`
- Numbering: Indian system (Lakh, Crore)
- Dates: DD/MM/YYYY format
- Documents: Aadhaar, PAN validation
- Legal: Indian Registration Act compliant agreements
- Tax: Section 10(13A) HRA-compliant rent receipts
- Payments: UPI, Google Pay, PhonePe, Bank Transfer, Cash, Cheque

## 📄 License

Proprietary — All rights reserved.

---

Built with ❤️ for Indian landlords

## 📂 Structure

```
src/
├── App.jsx, main.jsx, store.js, index.css
├── components/Toast.jsx
└── pages/Dashboard, Properties, Tenants, Payments, Agreements, Receipts, Maintenance
```

Built with ❤️ for Indian landlords and tenants.
