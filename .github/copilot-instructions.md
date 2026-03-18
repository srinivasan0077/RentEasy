<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# RentEasy - Rental Agreement & Tenant Manager

This is a Vite + React SaaS web application for Indian landlords to manage rental properties, tenants, payments, and legal documents.

## Tech Stack
- **Frontend**: React 19 + Vite
- **Styling**: Pure CSS with CSS Variables (no frameworks)
- **Icons**: Lucide React
- **PDF Generation**: jsPDF
- **Storage**: LocalStorage (can be upgraded to a backend)
- **Date Handling**: date-fns

## Key Features
1. Property Management - Add/edit/delete rental properties
2. Tenant Management - Store tenant details, Aadhaar, PAN
3. Rent Payment Tracking - Track paid/pending/overdue payments
4. WhatsApp Rent Reminders - Send payment reminders via WhatsApp
5. Rent Agreement Generator - Generate legally formatted rental agreements as PDF
6. Rent Receipt Generator - Generate HRA-compliant rent receipts for tax exemption
7. Maintenance Request Tracker - Track property maintenance issues

## Conventions
- Use functional components with hooks
- Data is stored in localStorage via `src/store.js`
- Currency is Indian Rupees (₹), formatted using `toLocaleString('en-IN')`
- Numbers use Indian numbering system (Lakh, Crore)
- All dates use Indian format (DD/MM/YYYY)
