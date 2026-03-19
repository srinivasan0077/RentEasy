import { useState, useEffect } from 'react';
import { FileText, Download, Plus, Info, AlertTriangle, ClipboardList } from 'lucide-react';
import { getTenants, getProperties, addAgreement, getAgreements, getLandlordProfile, saveLandlordProfile, getRentDueDay } from '../store';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/Pagination';
import UpgradeModal from '../components/UpgradeModal';
import { FormSkeleton } from '../components/SkeletonLoader';
import jsPDF from 'jspdf';

// ===== STATE-WISE STAMP DUTY & REGISTRATION DATA =====
const INDIAN_STATES = {
  'Andhra Pradesh': { stampDuty: '0.5% of annual rent + deposit', registration: 'Mandatory if >11 months', eStamp: true, notes: 'eSbtr portal for e-stamps' },
  'Arunachal Pradesh': { stampDuty: '₹100–500 (fixed)', registration: 'Optional for ≤11 months', eStamp: false, notes: 'Physical stamp paper from treasury' },
  'Assam': { stampDuty: '₹100–500 (fixed)', registration: 'Optional for ≤11 months', eStamp: false, notes: 'Stamp paper from authorized vendors' },
  'Bihar': { stampDuty: '2% of annual rent', registration: 'Mandatory if >11 months', eStamp: true, notes: 'GRAS portal for e-stamps' },
  'Chhattisgarh': { stampDuty: '₹100–500 (fixed)', registration: 'Optional for ≤11 months', eStamp: true, notes: 'SHCIL e-stamps available' },
  'Delhi': { stampDuty: '2% of average annual rent', registration: 'Mandatory for all tenures', eStamp: true, notes: 'e-Stamp via SHCIL. Delhi mandates registration for all agreements.' },
  'Goa': { stampDuty: '₹100–500 (fixed)', registration: 'Optional for ≤11 months', eStamp: false, notes: 'Physical stamp paper from treasury' },
  'Gujarat': { stampDuty: '1% of annual rent', registration: 'Mandatory if >11 months', eStamp: true, notes: 'GARVI portal for e-stamps and registration' },
  'Haryana': { stampDuty: '1.5% of annual rent', registration: 'Mandatory if >11 months', eStamp: true, notes: 'Jamabandi portal for registration' },
  'Himachal Pradesh': { stampDuty: '₹100–500 (fixed)', registration: 'Optional for ≤11 months', eStamp: false, notes: 'Physical stamp paper from treasury' },
  'Jharkhand': { stampDuty: '2% of annual rent', registration: 'Mandatory if >11 months', eStamp: true, notes: 'e-Registration portal available' },
  'Karnataka': { stampDuty: '1% of rent+deposit (max ₹500 for ≤11mo)', registration: 'Mandatory if >11 months', eStamp: true, notes: 'Kaveri Online portal. ≤11 months: ₹100-500 stamp paper. >11 months: 1% of total rent+deposit.' },
  'Kerala': { stampDuty: '₹100–200 for ≤11 months', registration: 'Mandatory if >11 months', eStamp: true, notes: 'e-Stamp available via Kerala Registration dept' },
  'Madhya Pradesh': { stampDuty: '2% of annual rent', registration: 'Mandatory if >11 months', eStamp: true, notes: 'SAMPADA portal for e-registration' },
  'Maharashtra': { stampDuty: '0.25% of (total rent + deposit) — Leave & License', registration: 'Mandatory registration for all', eStamp: true, notes: 'IGR Maharashtra portal. Leave & License format mandatory. Registration compulsory regardless of tenure.' },
  'Manipur': { stampDuty: '₹100–500 (fixed)', registration: 'Optional for ≤11 months', eStamp: false, notes: 'Physical stamp paper' },
  'Meghalaya': { stampDuty: '₹100–500 (fixed)', registration: 'Optional for ≤11 months', eStamp: false, notes: 'Physical stamp paper' },
  'Mizoram': { stampDuty: '₹100–500 (fixed)', registration: 'Optional for ≤11 months', eStamp: false, notes: 'Physical stamp paper' },
  'Nagaland': { stampDuty: '₹100–500 (fixed)', registration: 'Optional for ≤11 months', eStamp: false, notes: 'Physical stamp paper' },
  'Odisha': { stampDuty: '0.5% of annual rent', registration: 'Mandatory if >11 months', eStamp: true, notes: 'e-Registration on IGRS Odisha' },
  'Punjab': { stampDuty: '1% of annual rent', registration: 'Mandatory if >11 months', eStamp: true, notes: 'PRISM portal for registration' },
  'Rajasthan': { stampDuty: '1% of annual rent + deposit', registration: 'Mandatory if >11 months', eStamp: true, notes: 'e-Stamp via SHCIL or Rajasthan eGRAS' },
  'Sikkim': { stampDuty: '₹100–500 (fixed)', registration: 'Optional for ≤11 months', eStamp: false, notes: 'Physical stamp paper' },
  'Tamil Nadu': { stampDuty: '1% of annual rent', registration: 'Mandatory if >11 months', eStamp: true, notes: 'TNREGINET portal for e-stamps and registration' },
  'Telangana': { stampDuty: '0.4% of annual rent', registration: 'Mandatory if >11 months', eStamp: true, notes: 'IGRS Telangana portal. Dharani portal for property records.' },
  'Tripura': { stampDuty: '₹100–500 (fixed)', registration: 'Optional for ≤11 months', eStamp: false, notes: 'Physical stamp paper' },
  'Uttar Pradesh': { stampDuty: '2% of annual rent', registration: 'Mandatory if >11 months', eStamp: true, notes: 'IGRS UP portal. Stamp duty varies by city (higher in metros).' },
  'Uttarakhand': { stampDuty: '₹100–500 (fixed)', registration: 'Optional for ≤11 months', eStamp: true, notes: 'e-Stamp via SHCIL' },
  'West Bengal': { stampDuty: '0.25% of annual rent or ₹1 per ₹1000', registration: 'Mandatory if >11 months', eStamp: true, notes: 'e-Nathikaran portal for registration' },
  // Union Territories
  'Andaman & Nicobar': { stampDuty: '₹100–500 (fixed)', registration: 'Optional for ≤11 months', eStamp: false, notes: 'Central stamp rules apply' },
  'Chandigarh': { stampDuty: '1% of annual rent', registration: 'Mandatory if >11 months', eStamp: true, notes: 'e-Stamp via SHCIL' },
  'Dadra & Nagar Haveli and Daman & Diu': { stampDuty: '₹100–500 (fixed)', registration: 'Optional for ≤11 months', eStamp: false, notes: 'Central stamp rules apply' },
  'Jammu & Kashmir': { stampDuty: '₹100–500 (fixed)', registration: 'Optional for ≤11 months', eStamp: false, notes: 'J&K Stamp Act applies' },
  'Ladakh': { stampDuty: '₹100–500 (fixed)', registration: 'Optional for ≤11 months', eStamp: false, notes: 'Central stamp rules apply' },
  'Lakshadweep': { stampDuty: '₹100–500 (fixed)', registration: 'Optional for ≤11 months', eStamp: false, notes: 'Central stamp rules apply' },
  'Puducherry': { stampDuty: '1% of annual rent', registration: 'Mandatory if >11 months', eStamp: false, notes: 'Physical stamp paper from treasury' },
};

export default function Agreements({ showToast, refresh, refreshKey, onNavigate }) {
  const { user, checkLimit, currentPlan } = useAuth();
  const userId = user?.id;
  const [showForm, setShowForm] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState('');
  const [form, setForm] = useState({
    tenantId: '', propertyId: '', startDate: '', endDate: '',
    rentAmount: '', deposit: '', maintenanceCharges: '',
    noticePeriod: '1', escalation: '5', lockInPeriod: '6',
    ownerName: '', ownerAddress: '', ownerPhone: '', ownerPan: '', ownerAadhaar: '',
    stampDutyState: 'Karnataka', policeVerification: true, paintingClause: true,
    furnishing: 'unfurnished', furnishingItems: '',
    petPolicy: 'not-allowed',
  });
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    async function load() {
      const [t, p, a] = await Promise.all([
        getTenants(userId),
        getProperties(userId),
        getAgreements(userId),
      ]);
      setTenants(t);
      setProperties(p);
      setAgreements(a);
      setLoading(false);
    }
    load();
  }, [userId, refreshKey]);

  // Landlord profile auto-fill
  const savedLandlord = getLandlordProfile(userId);
  const hasLandlordProfile = savedLandlord && (savedLandlord.name || savedLandlord.pan);

  const fillFromProfile = () => {
    if (!savedLandlord) return;
    setForm(prev => ({
      ...prev,
      ownerName: savedLandlord.name || prev.ownerName,
      ownerPhone: savedLandlord.phone || prev.ownerPhone,
      ownerPan: savedLandlord.pan || prev.ownerPan,
      ownerAadhaar: savedLandlord.aadhaar || prev.ownerAadhaar,
    }));
    showToast('Landlord details filled from saved profile ✅');
  };

  // Offer to save landlord details after generating agreement
  const maybeSaveLandlordProfile = () => {
    if (form.ownerName && form.ownerPan) {
      const current = getLandlordProfile(userId);
      const changed = !current ||
        current.name !== form.ownerName ||
        current.phone !== form.ownerPhone ||
        current.pan !== form.ownerPan ||
        current.aadhaar !== form.ownerAadhaar;
      if (changed) {
        saveLandlordProfile({
          name: form.ownerName,
          phone: form.ownerPhone,
          pan: form.ownerPan,
          aadhaar: form.ownerAadhaar,
        }, userId);
      }
    }
  };

  const selectedTenant = tenants.find(t => t.id === form.tenantId);
  const selectedProperty = properties.find(p => p.id === form.propertyId);

  // Auto-sync stampDutyState when property changes
  const deriveStateFromProperty = (property) => {
    if (!property?.state) return form.stampDutyState;
    // Match property state to INDIAN_STATES keys
    const match = Object.keys(INDIAN_STATES).find(
      s => s.toLowerCase() === property.state.toLowerCase()
    );
    return match || property.state;
  };

  const handleTenantChange = (tenantId) => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (tenant) {
      const property = properties.find(p => p.id === (tenant.propertyId || tenant.property_id));
      setForm({
        ...form,
        tenantId,
        propertyId: tenant.propertyId || tenant.property_id || '',
        startDate: tenant.moveInDate || tenant.move_in_date || '',
        endDate: tenant.leaseEnd || tenant.lease_end || '',
        rentAmount: property?.rent || '',
        deposit: property?.deposit || '',
        stampDutyState: deriveStateFromProperty(property),
      });
    }
  };

  const handlePropertyChange = (propertyId) => {
    const property = properties.find(p => p.id === propertyId);
    setForm({
      ...form,
      propertyId,
      rentAmount: property?.rent || form.rentAmount,
      deposit: property?.deposit || form.deposit,
      stampDutyState: deriveStateFromProperty(property),
    });
  };

  const generateAgreement = async () => {
    if (submitting) return;

    // Check monthly limit
    const currentMonth = new Date().toISOString().slice(0, 7);
    const thisMonthCount = agreements.filter(a =>
      (a.createdAt || a.created_at || '').slice(0, 7) === currentMonth
    ).length;
    const { allowed, message: limitMsg } = checkLimit('agreements', thisMonthCount);
    if (!allowed) { setUpgradeMsg(limitMsg); return; }

    const missing = [];
    if (!form.ownerName) missing.push('Owner Name');
    if (!form.ownerPhone) missing.push('Owner Phone');
    if (!form.ownerPan) missing.push('Owner PAN');
    if (!form.tenantId) missing.push('Tenant');
    if (!form.propertyId) missing.push('Property');
    if (!form.startDate) missing.push('Start Date');
    if (!form.endDate) missing.push('End Date');
    if (!form.rentAmount) missing.push('Monthly Rent');
    if (!form.deposit) missing.push('Security Deposit');
    if (!form.stampDutyState) missing.push('Stamp Duty State');
    if (!form.noticePeriod) missing.push('Notice Period');
    if (!form.escalation && form.escalation !== 0) missing.push('Rent Escalation %');
    if (missing.length > 0) {
      showToast(`Please fill: ${missing.join(', ')}`, 'error');
      return;
    }

    // Validate PAN format (ABCDE1234F)
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(form.ownerPan?.toUpperCase())) {
      showToast('Invalid Owner PAN format. Expected format: ABCDE1234F', 'error');
      return;
    }

    // Validate dates
    if (new Date(form.endDate) <= new Date(form.startDate)) {
      showToast('End Date must be after Start Date', 'error');
      return;
    }

    // Validate rent and deposit are positive numbers
    if (Number(form.rentAmount) <= 0 || Number(form.deposit) <= 0) {
      showToast('Rent and Security Deposit must be positive amounts', 'error');
      return;
    }

    // Validate state consistency — stamp duty state must match property state
    if (selectedProperty?.state) {
      const propertyState = selectedProperty.state.toLowerCase().trim();
      const stampState = form.stampDutyState.toLowerCase().trim();
      if (propertyState !== stampState) {
        showToast(`State mismatch: Property is in "${selectedProperty.state}" but Stamp Duty State is "${form.stampDutyState}". The agreement state must match the property location.`, 'error');
        return;
      }
    }

    setSubmitting(true);
    try {
      await addAgreement({
        ...form,
        tenantName: selectedTenant?.name,
        propertyAddress: selectedProperty?.address,
      }, userId);

      showToast('Agreement generated successfully!');
      maybeSaveLandlordProfile();
      refresh();
      downloadAgreementPDF();
    } catch (err) {
      console.error('Generate agreement error:', err);
      showToast(err.message || 'Failed to generate agreement', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const downloadAgreementPDF = () => {
    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = 210;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    const formatIndianDate = (dateStr) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    };

    const rentNum = Number(form.rentAmount);
    const depositNum = Number(form.deposit);

    // Get customizable rent due day
    const dueDay = getRentDueDay(userId);
    const ordinal = (n) => {
      const s = ['th','st','nd','rd'];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    // Derive the agreement state from property (single source of truth)
    const agreementState = selectedProperty?.state || form.stampDutyState || '________';
    const agreementCity = selectedProperty?.city || '________';

    // ===== HELPER: Check page break =====
    const checkPage = (needed = 20) => {
      if (y + needed > 275) { doc.addPage(); y = margin; return true; }
      return false;
    };

    // ===== HELPER: Draw horizontal rule =====
    const drawHR = (color = [200, 200, 200]) => {
      doc.setDrawColor(...color);
      doc.setLineWidth(0.3);
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;
    };

    // ===== HELPER: Section heading =====
    const sectionHeading = (text) => {
      checkPage(20);
      y += 4;
      doc.setFillColor(245, 247, 250);
      doc.rect(margin, y - 5, contentWidth, 10, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(40, 40, 40);
      doc.text(text, margin + 4, y + 1);
      y += 14;
    };

    // ===== HELPER: Write clause =====
    const writeClause = (num, title, body) => {
      checkPage(25);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(50, 50, 50);
      doc.text(`${num}. ${title}`, margin, y);
      y += 5.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      const lines = doc.splitTextToSize(body, contentWidth - 4);
      lines.forEach(l => {
        checkPage(6);
        doc.text(l, margin + 4, y);
        y += 4.8;
      });
      y += 3;
    };

    // ===== HELPER: Key-value pair =====
    const writeKV = (label, value, x = margin + 4) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text(`${label}:`, x, y);
      const labelWidth = doc.getTextWidth(`${label}:  `);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 40);
      doc.text(value, x + labelWidth, y);
      y += 5.5;
    };

    // ============================================
    // PAGE 1: TITLE & HEADER
    // ============================================

    // Top border accent line
    doc.setFillColor(79, 70, 229); // primary indigo
    doc.rect(0, 0, pageWidth, 3, 'F');

    y = 18;

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(30, 30, 30);
    doc.text('RENTAL / LEASE AGREEMENT', 105, y, { align: 'center' });
    y += 9;

    // Subtitle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(120, 120, 120);
    doc.text('Under Section 17 of the Indian Registration Act, 1908', 105, y, { align: 'center' });
    y += 5;
    doc.text(`To be executed on appropriate Stamp Paper as per ${agreementState} State Stamp Act`, 105, y, { align: 'center' });
    y += 10;

    drawHR([79, 70, 229]);

    // Execution line
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(50, 50, 50);
    const execLines = doc.splitTextToSize(
      `This Rental Agreement ("Agreement") is executed on this ${formatIndianDate(form.startDate)} at ${agreementCity}, ${agreementState}.`,
      contentWidth
    );
    execLines.forEach(l => { doc.text(l, margin, y); y += 5; });
    y += 4;

    // ============================================
    // PARTIES SECTION
    // ============================================
    sectionHeading('PARTIES TO THE AGREEMENT');

    // Owner Box
    const boxHeight = 34;
    const halfBox = contentWidth / 2 - 4;
    const boxStartY = y;
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(252, 252, 253);
    doc.roundedRect(margin, boxStartY - 4, halfBox, boxHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(79, 70, 229);
    doc.text('LANDLORD / OWNER', margin + 4, boxStartY + 2);
    let ownerY = boxStartY + 9;

    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'bold');
    doc.text(form.ownerName, margin + 4, ownerY);
    ownerY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Phone: ${form.ownerPhone || 'N/A'}`, margin + 4, ownerY); ownerY += 4.5;
    doc.text(`PAN: ${form.ownerPan || 'N/A'}`, margin + 4, ownerY); ownerY += 4.5;
    doc.text(`Aadhaar: ${form.ownerAadhaar || 'N/A'}`, margin + 4, ownerY);

    // Tenant Box
    const tenantBoxX = margin + contentWidth / 2 + 4;
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(252, 252, 253);
    doc.roundedRect(tenantBoxX, boxStartY - 4, halfBox, boxHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(79, 70, 229);
    doc.text('TENANT / LESSEE', tenantBoxX + 4, boxStartY + 2);
    let tenantY = boxStartY + 9;

    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'bold');
    doc.text(selectedTenant?.name || '', tenantBoxX + 4, tenantY);
    tenantY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Phone: ${selectedTenant?.phone || 'N/A'}`, tenantBoxX + 4, tenantY); tenantY += 4.5;
    doc.text(`PAN: ${selectedTenant?.pan || 'N/A'}`, tenantBoxX + 4, tenantY); tenantY += 4.5;
    doc.text(`Aadhaar: ${selectedTenant?.aadhaar || 'N/A'}`, tenantBoxX + 4, tenantY);

    y = boxStartY + boxHeight + 4;

    // Legal text for parties
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(140, 140, 140);
    const partyNote = doc.splitTextToSize(
      'The Owner (hereinafter referred to as the "LANDLORD") which expression shall include heirs, executors, administrators, successors, and assigns; and the Tenant (hereinafter referred to as the "LESSEE").',
      contentWidth
    );
    partyNote.forEach(l => { doc.text(l, margin, y); y += 4; });
    y += 3;

    // ============================================
    // PROPERTY SCHEDULE
    // ============================================
    sectionHeading('SCHEDULE OF PROPERTY');

    const propBoxY = y;
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(250, 251, 255);

    // Fixed tab stop for values
    const propTabX = margin + 4 + 50;
    const propValMaxW = contentWidth - 58; // generous width for values

    // Pre-calculate address wrapping
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const addrText = selectedProperty?.address || '';
    const addrWrapped = doc.splitTextToSize(addrText, propValMaxW);
    const addrExtraLines = addrWrapped.length - 1;
    const tenantUnit = selectedTenant?.unitNumber || selectedTenant?.unit_number || '';
    const hasUnit = tenantUnit.trim().length > 0;

    const propBoxH = 10 + (3 * 5.5) + (addrExtraLines * 4.5) + (hasUnit ? 5.5 : 0) + 6;
    doc.roundedRect(margin, propBoxY - 4, contentWidth, propBoxH, 2, 2, 'FD');

    // Add top padding inside box
    y += 4;

    // Address row (with wrapping)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text('Address:', margin + 4, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    addrWrapped.forEach((line, i) => {
      doc.text(line, propTabX, y + (i * 4.5));
    });
    y += 5.5 + (addrExtraLines * 4.5);

    // Unit / Floor row (only if specified)
    if (hasUnit) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text('Unit / Floor:', margin + 4, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 40);
      doc.text(tenantUnit, propTabX, y);
      y += 5.5;
    }

    // City row
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text('City:', margin + 4, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    doc.text(`${agreementCity}, ${agreementState} - ${selectedProperty?.pincode || ''}`, propTabX, y);
    y += 5.5;

    // Type / Area row
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text('Type / Area:', margin + 4, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    doc.text(`${selectedProperty?.type || ''} | ${selectedProperty?.area || '—'} sq.ft`, propTabX, y);
    y += 5.5;

    y = propBoxY - 4 + propBoxH + 4;

    // ============================================
    // FINANCIAL TERMS (Highlighted)
    // ============================================
    sectionHeading('FINANCIAL TERMS');

    // Three-column financial summary
    const colW = contentWidth / 3;
    const cardH = 24;
    const finY = y;

    // Monthly Rent
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(margin, finY - 5, colW - 3, cardH, 2, 2, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text('Monthly Rent', margin + 4, finY + 1);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(30, 64, 175);
    doc.text(`Rs. ${rentNum.toLocaleString('en-IN')}/-`, margin + 4, finY + 11);

    // Security Deposit
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(margin + colW, finY - 5, colW - 3, cardH, 2, 2, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text('Security Deposit', margin + colW + 4, finY + 1);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(22, 101, 52);
    doc.text(`Rs. ${depositNum.toLocaleString('en-IN')}/-`, margin + colW + 4, finY + 11);

    // Lease Period
    doc.setFillColor(254, 249, 238);
    doc.roundedRect(margin + colW * 2, finY - 5, colW - 1, cardH, 2, 2, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text('Lease Period', margin + colW * 2 + 4, finY + 1);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(146, 64, 14);
    const startShort = form.startDate ? new Date(form.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '--';
    const endShort = form.endDate ? new Date(form.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '--';
    doc.text(`${startShort} to ${endShort}`, margin + colW * 2 + 4, finY + 11);

    y = finY + cardH + 4;

    // Rent in words
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`(Rupees ${numberToWords(rentNum)} only per month)`, margin, y);
    y += 10;

    // ============================================
    // TERMS AND CONDITIONS (new page)
    // ============================================
    doc.addPage();
    y = margin;
    sectionHeading('TERMS AND CONDITIONS');

    let clauseNum = 0;
    const nextClause = () => ++clauseNum;

    writeClause(nextClause(), 'MONTHLY RENT',
      `The monthly rent for the said premises shall be Rs. ${rentNum.toLocaleString('en-IN')}/- (Rupees ${numberToWords(rentNum)} only), payable on or before the ${ordinal(dueDay)} of every calendar month. Failure to pay rent on time shall attract a late fee of Rs. 50/- per day of delay.`
    );

    writeClause(nextClause(), 'SECURITY DEPOSIT',
      `The Tenant has deposited a sum of Rs. ${depositNum.toLocaleString('en-IN')}/- (Rupees ${numberToWords(depositNum)} only) as refundable security deposit. This amount shall be returned to the Tenant within 30 days of vacating the premises, after deducting any outstanding dues, damages to property (beyond normal wear and tear), unpaid utility bills, or cost of repairs as applicable.`
    );

    writeClause(nextClause(), 'LEASE PERIOD',
      `This Agreement shall be valid for the period from ${formatIndianDate(form.startDate)} to ${formatIndianDate(form.endDate)}. Upon expiry, this agreement shall be renewed only by mutual written consent of both parties, executed in writing.`
    );

    if (form.lockInPeriod && form.lockInPeriod !== '0') {
      writeClause(nextClause(), 'LOCK-IN PERIOD',
        `Neither party shall terminate this agreement during the initial lock-in period of ${form.lockInPeriod} month(s) from the date of commencement. If either party terminates during the lock-in period, they shall be liable to pay compensation equivalent to the rent for the remaining lock-in period.`
      );
    }

    writeClause(nextClause(), 'MAINTENANCE CHARGES',
      form.maintenanceCharges
        ? `Monthly maintenance/society charges of Rs. ${Number(form.maintenanceCharges).toLocaleString('en-IN')}/- shall be borne by the Tenant, payable along with the monthly rent.`
        : 'Maintenance/society charges as applicable shall be borne by the Tenant.'
    );

    writeClause(nextClause(), 'RENT ESCALATION',
      `The rent shall be increased by ${form.escalation}% at the end of every 11-month period or upon renewal of this agreement, whichever is applicable.`
    );

    writeClause(nextClause(), 'NOTICE PERIOD',
      `Either party must provide ${form.noticePeriod} month(s) prior written notice before terminating this agreement. Failure to serve proper notice shall result in forfeiture of one month's rent as compensation.`
    );

    writeClause(nextClause(), 'NO SUBLETTING',
      'The Tenant shall not sublet, assign, or transfer the tenancy or any part thereof to any third party without the prior written consent of the Owner.'
    );

    const isCommercial = ['Commercial', 'Shop', 'Office', 'Warehouse'].includes(selectedProperty?.type);

    writeClause(nextClause(), 'PERMITTED USE',
      isCommercial
        ? 'The Tenant shall use the premises exclusively for lawful commercial purposes as agreed between both parties. No change in the nature of business or use shall be made without the prior written consent of the Owner. The Tenant shall obtain all necessary licenses and permits required for the business operations.'
        : 'The Tenant shall use the premises exclusively for residential purposes. No commercial activity shall be carried out from the premises without prior written permission from the Owner.'
    );

    writeClause(nextClause(), 'STRUCTURAL MAINTENANCE',
      'The Owner shall be responsible for maintaining the structural integrity of the property, including repairs to the roof, external walls, and plumbing infrastructure. Minor repairs and day-to-day maintenance shall be borne by the Tenant.'
    );

    writeClause(nextClause(), 'UTILITIES',
      'Electricity, water, piped gas, internet/broadband, DTH/cable TV, and any other utility bills shall be paid directly by the Tenant to the respective service providers. The Tenant shall ensure no outstanding dues remain at the time of vacating.'
    );

    writeClause(nextClause(), 'ALTERATIONS',
      'The Tenant shall not make any structural alterations, additions, or modifications to the premises without the prior written consent of the Owner. Any approved modifications shall be at the Tenant\'s expense and shall become the property of the Owner unless otherwise agreed.'
    );

    // Furnishing / Inventory
    if (form.furnishing === 'fully-furnished' || form.furnishing === 'semi-furnished') {
      const furnLabel = form.furnishing === 'fully-furnished' ? 'FULLY FURNISHED' : 'SEMI-FURNISHED';
      writeClause(nextClause(), `FURNISHING & INVENTORY (${furnLabel})`,
        `The said premises is let out on a ${furnLabel} basis. ${form.furnishingItems ? `The following items of furniture, fixtures, and appliances are provided by the Owner: ${form.furnishingItems}.` : 'An inventory list of all furniture, fixtures, and appliances shall be annexed to this agreement as Annexure-A.'} The Tenant shall maintain all furnished items in good condition and shall be liable for any damage, loss, or breakage beyond normal wear and tear. The cost of repair or replacement shall be deducted from the security deposit. The Tenant shall not remove any furnished items from the premises without the prior written consent of the Owner.`
      );
    }

    // Pet Policy
    if (form.petPolicy === 'allowed-with-deposit') {
      writeClause(nextClause(), 'PET POLICY',
        'The Tenant is permitted to keep pets on the premises subject to an additional pet deposit of one month\'s rent. The Tenant shall be fully responsible for any damage caused by pets to the property, furnishings, or common areas. The pet deposit shall be refundable upon vacating, subject to inspection. The Tenant shall comply with all local municipal regulations regarding pet ownership.'
      );
    } else if (form.petPolicy === 'not-allowed') {
      writeClause(nextClause(), 'PET POLICY',
        'The Tenant shall not keep any pets or animals on the premises without the prior written consent of the Owner.'
      );
    }

    // Painting
    if (form.paintingClause) {
      writeClause(nextClause(), 'PAINTING & REPAIR ON VACATING',
        'Upon vacating the premises, the Tenant shall get the entire premises painted and hand over the property in the same condition as received (subject to normal wear and tear). If the Tenant fails to do so, the cost of painting shall be deducted from the security deposit.'
      );
    }

    // Police verification
    if (form.policeVerification) {
      writeClause(nextClause(), 'POLICE VERIFICATION',
        'The Tenant agrees to complete police verification formalities at the local police station within 15 days of moving in, as mandated by local authorities. The Owner shall cooperate in providing necessary documentation for the same. Copies of the verification receipt shall be maintained by both parties.'
      );
    }

    // TDS clause
    if (rentNum >= 50000) {
      writeClause(nextClause(), 'TAX DEDUCTION AT SOURCE (TDS)',
        `As the monthly rent exceeds Rs. 50,000/-, the Tenant is required to deduct TDS at the rate of 5% (or applicable rate) under Section 194-IB of the Income Tax Act, 1961, and remit the same to the Government of India. The Owner's PAN is: ${form.ownerPan}. The Tenant shall provide Form 16C to the Owner after filing of TDS returns.`
      );
    }

    writeClause(nextClause(), 'VACATING',
      'The Tenant shall vacate the premises on the expiry of this agreement unless renewed by mutual written consent. Upon vacating, the Tenant shall return all keys and hand over the property in good condition. A joint inspection shall be conducted before the return of the security deposit.'
    );

    const isLongLease = Number(form.endDate?.split('-')[0]) - Number(form.startDate?.split('-')[0]) >= 1 ||
      (form.endDate && form.startDate && (new Date(form.endDate) - new Date(form.startDate)) / (1000 * 60 * 60 * 24 * 30) > 11);

    writeClause(nextClause(), 'REGISTRATION',
      isLongLease
        ? 'As this agreement exceeds 11 months, it shall be compulsorily registered with the office of the Sub-Registrar having jurisdiction over the property, in accordance with Section 17 of the Indian Registration Act, 1908. Failure to register shall render this agreement inadmissible as evidence in any court of law under Section 49 of the said Act. Registration charges shall be borne equally by both parties unless otherwise agreed in writing.'
        : 'This agreement is for a period of 11 months or less and hence registration under Section 17 of the Indian Registration Act, 1908 is not mandatory. However, parties shall have the right to opt for voluntary registration at their own cost.'
    );

    writeClause(nextClause(), 'STAMP DUTY',
      `This agreement shall be executed on appropriate e-stamp paper / non-judicial stamp paper of requisite value as per the applicable provisions of the ${agreementState} Stamp Act in force at the time of execution. The cost of stamp duty shall be borne equally by both parties unless otherwise agreed in writing. The parties shall ensure compliance with all applicable stamp duty requirements prior to execution of this agreement.`
    );

    writeClause(nextClause(), 'GOVERNING LAW & JURISDICTION',
      `This agreement shall be governed by the laws of India. Any disputes arising out of or in connection with this agreement shall be subject to the exclusive jurisdiction of the courts at ${agreementCity}, ${agreementState}.`
    );

    writeClause(nextClause(), 'ENTIRE AGREEMENT',
      'This Agreement, together with any schedules and annexures, constitutes the entire agreement between the parties. Any amendments or modifications shall be made only in writing and signed by both parties.'
    );

    // ============================================
    // SIGNATURES (new page)
    // ============================================
    doc.addPage();
    y = margin;
    sectionHeading('SIGNATURES');

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('IN WITNESS WHEREOF, the parties hereto have set their hands on this Agreement on the date first mentioned above.', margin, y);
    y += 12;

    const sigBoxH = 40;
    const sigStartY = y;

    // Owner signature box
    doc.setDrawColor(180, 180, 180);
    doc.setFillColor(252, 252, 253);
    doc.roundedRect(margin, sigStartY - 4, contentWidth / 2 - 6, sigBoxH, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(79, 70, 229);
    doc.text('LANDLORD / OWNER', margin + 4, sigStartY + 2);
    // Signature line
    doc.setDrawColor(160, 160, 160);
    doc.setLineWidth(0.2);
    doc.line(margin + 4, sigStartY + 16, margin + contentWidth / 2 - 14, sigStartY + 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(`Name: ${form.ownerName}`, margin + 4, sigStartY + 22);
    doc.text(`PAN: ${form.ownerPan}`, margin + 4, sigStartY + 27);
    doc.text(`Date: ${formatIndianDate(form.startDate)}`, margin + 4, sigStartY + 32);

    // Tenant signature box
    const sigTenantX = margin + contentWidth / 2 + 2;
    doc.setDrawColor(180, 180, 180);
    doc.setFillColor(252, 252, 253);
    doc.roundedRect(sigTenantX, sigStartY - 4, contentWidth / 2 - 2, sigBoxH, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(79, 70, 229);
    doc.text('TENANT / LESSEE', sigTenantX + 4, sigStartY + 2);
    doc.setDrawColor(160, 160, 160);
    doc.line(sigTenantX + 4, sigStartY + 16, sigTenantX + contentWidth / 2 - 10, sigStartY + 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(`Name: ${selectedTenant?.name || ''}`, sigTenantX + 4, sigStartY + 22);
    doc.text(`PAN: ${selectedTenant?.pan || 'N/A'}`, sigTenantX + 4, sigStartY + 27);
    doc.text(`Date: ${formatIndianDate(form.startDate)}`, sigTenantX + 4, sigStartY + 32);

    y = sigStartY + sigBoxH + 8;

    // ============================================
    // WITNESSES
    // ============================================
    checkPage(45);
    sectionHeading('WITNESSES');

    const witBoxH = 40;
    const witStartY = y;

    // Witness 1
    doc.setDrawColor(180, 180, 180);
    doc.setFillColor(252, 252, 253);
    doc.roundedRect(margin, witStartY - 4, contentWidth / 2 - 6, witBoxH, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(79, 70, 229);
    doc.text('WITNESS 1', margin + 4, witStartY + 2);
    // Signature line
    doc.setDrawColor(160, 160, 160);
    doc.setLineWidth(0.2);
    doc.line(margin + 4, witStartY + 16, margin + contentWidth / 2 - 14, witStartY + 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text('Name: _______________________', margin + 4, witStartY + 22);
    doc.text('Address: ____________________', margin + 4, witStartY + 27);
    doc.text('Aadhaar/ID: _________________', margin + 4, witStartY + 32);

    // Witness 2
    const w2x = margin + contentWidth / 2 + 2;
    doc.setDrawColor(180, 180, 180);
    doc.setFillColor(252, 252, 253);
    doc.roundedRect(w2x, witStartY - 4, contentWidth / 2 - 2, witBoxH, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(79, 70, 229);
    doc.text('WITNESS 2', w2x + 4, witStartY + 2);
    doc.setDrawColor(160, 160, 160);
    doc.line(w2x + 4, witStartY + 16, w2x + contentWidth / 2 - 10, witStartY + 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text('Name: _______________________', w2x + 4, witStartY + 22);
    doc.text('Address: ____________________', w2x + 4, witStartY + 27);
    doc.text('Aadhaar/ID: _________________', w2x + 4, witStartY + 32);

    y = witStartY + witBoxH + 6;

    // ============================================
    // FOOTER
    // ============================================
    checkPage(20);
    drawHR([200, 200, 200]);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('Both parties have read and understood all the terms and conditions stated herein and have signed this agreement', margin, y);
    y += 3.5;
    doc.text('voluntarily, without any coercion, undue influence, or misrepresentation. This document shall be legally binding', margin, y);
    y += 3.5;
    doc.text('upon execution by both parties on non-judicial stamp paper of appropriate value as per applicable State laws.', margin, y);
    y += 6;

    // Add page numbers
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      // Top accent line on every page
      doc.setFillColor(79, 70, 229);
      doc.rect(0, 0, pageWidth, 3, 'F');
      // Page number
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(180, 180, 180);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, 290, { align: 'right' });
      // Bottom border
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.2);
      doc.line(margin, 287, pageWidth - margin, 287);
    }

    doc.save(`Rent_Agreement_${selectedTenant?.name?.replace(/\s/g, '_') || 'document'}.pdf`);
    showToast('Agreement PDF downloaded! 📄');
  };

  if (loading) return <FormSkeleton />;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
          <h2>Rent Agreements</h2>
          <p>Generate legally formatted rental agreements in seconds</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={18} /> {showForm ? 'Hide Form' : 'Create Agreement'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '20px' }}>📝 Agreement Details</h3>

          {/* Landlord Profile Auto-fill */}
          {hasLandlordProfile && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 16px', background: '#eef2ff', borderRadius: '10px',
              border: '1px solid #c7d2fe', marginBottom: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#4338ca' }}>
                <ClipboardList size={16} />
                <span>Saved landlord profile: <strong>{savedLandlord.name}</strong> ({savedLandlord.pan})</span>
              </div>
              <button
                type="button"
                className="btn btn-sm"
                onClick={fillFromProfile}
                style={{
                  background: '#4f46e5', color: '#fff', border: 'none',
                  padding: '6px 14px', borderRadius: '6px', fontSize: '0.8rem',
                  cursor: 'pointer', fontWeight: 600,
                }}
              >
                📋 Use Saved Details
              </button>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Owner Name *</label>
              <input className="form-input" value={form.ownerName}
                onChange={e => setForm({ ...form, ownerName: e.target.value })} placeholder="Your full name" />
            </div>
            <div className="form-group">
              <label className="form-label">Owner PAN *</label>
              <input className="form-input" value={form.ownerPan}
                onChange={e => setForm({ ...form, ownerPan: e.target.value.toUpperCase() })} placeholder="ABCDE1234F" maxLength={10} />
              <small style={{ color: 'var(--gray-400)', fontSize: '0.75rem' }}>Required for TDS compliance (Section 194-IB)</small>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Owner Phone *</label>
              <input className="form-input" value={form.ownerPhone}
                onChange={e => setForm({ ...form, ownerPhone: e.target.value })} placeholder="9876543210" maxLength={10} />
            </div>
            <div className="form-group">
              <label className="form-label">Owner Aadhaar</label>
              <input className="form-input" value={form.ownerAadhaar}
                onChange={e => setForm({ ...form, ownerAadhaar: e.target.value })} placeholder="1234-5678-9012" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Select Tenant *</label>
              <select className="form-select" value={form.tenantId}
                onChange={e => handleTenantChange(e.target.value)}>
                <option value="">Choose a tenant</option>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.name} - {t.phone}</option>)}
              </select>
            </div>
          </div>

          {form.tenantId && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Lease Start Date *</label>
                  <input className="form-input" type="date" value={form.startDate}
                    onChange={e => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Lease End Date *</label>
                  <input className="form-input" type="date" value={form.endDate}
                    onChange={e => setForm({ ...form, endDate: e.target.value })} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Monthly Rent (₹)</label>
                  <input className="form-input" type="number" value={form.rentAmount}
                    onChange={e => setForm({ ...form, rentAmount: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Security Deposit (₹)</label>
                  <input className="form-input" type="number" value={form.deposit}
                    onChange={e => setForm({ ...form, deposit: e.target.value })} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Maintenance Charges (₹/month)</label>
                  <input className="form-input" type="number" value={form.maintenanceCharges}
                    onChange={e => setForm({ ...form, maintenanceCharges: e.target.value })} placeholder="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Notice Period (months)</label>
                  <select className="form-select" value={form.noticePeriod}
                    onChange={e => setForm({ ...form, noticePeriod: e.target.value })}>
                    <option value="1">1 Month</option>
                    <option value="2">2 Months</option>
                    <option value="3">3 Months</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Annual Rent Escalation (%)</label>
                <input className="form-input" type="number" min="0" max="100" step="1"
                  value={form.escalation}
                  onChange={e => {
                    const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                    setForm({ ...form, escalation: String(val) });
                  }}
                  placeholder="e.g. 5" />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Lock-in Period (months)</label>
                  <select className="form-select" value={form.lockInPeriod}
                    onChange={e => setForm({ ...form, lockInPeriod: e.target.value })}>
                    <option value="0">No Lock-in</option>
                    <option value="3">3 Months</option>
                    <option value="6">6 Months</option>
                    <option value="12">12 Months</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Stamp Duty State * {selectedProperty?.state && <span style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: 400 }}>(auto-derived from property)</span>}</label>
                  <select className="form-select" value={form.stampDutyState}
                    onChange={e => setForm({ ...form, stampDutyState: e.target.value })}
                    style={selectedProperty?.state ? { borderColor: 'var(--success)', background: '#f0fdf4' } : {}}>
                    <optgroup label="States">
                      {Object.keys(INDIAN_STATES).filter(s => !['Andaman & Nicobar', 'Chandigarh', 'Dadra & Nagar Haveli and Daman & Diu', 'Jammu & Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'].includes(s)).map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Union Territories">
                      {['Andaman & Nicobar', 'Chandigarh', 'Dadra & Nagar Haveli and Daman & Diu', 'Jammu & Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'].map(ut => (
                        <option key={ut} value={ut}>{ut}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>

              {/* Stamp Duty Guidance */}
              {form.stampDutyState && INDIAN_STATES[form.stampDutyState] && (
                <div style={{
                  padding: '14px 18px', background: '#eef2ff', borderRadius: '10px',
                  marginBottom: '16px', border: '1px solid #c7d2fe',
                }}>
                  <div style={{ display: 'flex', alignItems: 'start', gap: '10px' }}>
                    <Info size={18} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ fontSize: '0.85rem', color: 'var(--gray-700)' }}>
                      <strong style={{ color: 'var(--primary)' }}>{form.stampDutyState} — Stamp Duty Guide</strong>
                      <div style={{ marginTop: '6px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                        <span><strong>Stamp Duty:</strong> {INDIAN_STATES[form.stampDutyState].stampDuty}</span>
                        <span><strong>Registration:</strong> {INDIAN_STATES[form.stampDutyState].registration}</span>
                        <span><strong>e-Stamp Available:</strong> {INDIAN_STATES[form.stampDutyState].eStamp ? '✅ Yes' : '❌ No (physical stamp paper)'}</span>
                      </div>
                      <div style={{ marginTop: '6px', fontSize: '0.8rem', color: 'var(--gray-500)', fontStyle: 'italic' }}>
                        💡 {INDIAN_STATES[form.stampDutyState].notes}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Furnishing & Pet Policy */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Furnishing Status</label>
                  <select className="form-select" value={form.furnishing}
                    onChange={e => setForm({ ...form, furnishing: e.target.value })}>
                    <option value="unfurnished">Unfurnished</option>
                    <option value="semi-furnished">Semi-Furnished</option>
                    <option value="fully-furnished">Fully Furnished</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Pet Policy</label>
                  <select className="form-select" value={form.petPolicy}
                    onChange={e => setForm({ ...form, petPolicy: e.target.value })}>
                    <option value="not-allowed">Pets Not Allowed</option>
                    <option value="allowed-with-deposit">Allowed (with pet deposit)</option>
                    <option value="no-clause">No Pet Clause</option>
                  </select>
                </div>
              </div>

              {/* Furnishing Items (if furnished) */}
              {(form.furnishing === 'fully-furnished' || form.furnishing === 'semi-furnished') && (
                <div className="form-group">
                  <label className="form-label">Furniture & Appliances Inventory</label>
                  <textarea className="form-input" value={form.furnishingItems}
                    onChange={e => setForm({ ...form, furnishingItems: e.target.value })}
                    placeholder="e.g., 1 Double Bed, 1 Wardrobe, 1 Dining Table with 4 Chairs, 1 Refrigerator, 1 Washing Machine, 2 ACs, 1 TV..."
                    rows={3}
                    style={{ resize: 'vertical', minHeight: '70px' }}
                  />
                  <small style={{ color: 'var(--gray-400)', fontSize: '0.75rem' }}>
                    List all items provided. This will be included in the agreement as inventory.
                  </small>
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.policeVerification}
                      onChange={e => setForm({ ...form, policeVerification: e.target.checked })} />
                    Include Police Verification Clause
                  </label>
                </div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.paintingClause}
                      onChange={e => setForm({ ...form, paintingClause: e.target.checked })} />
                    Include Painting/Repair at Vacating Clause
                  </label>
                </div>
              </div>

              {/* Maharashtra Leave & License Warning */}
              {form.stampDutyState === 'Maharashtra' && (
                <div style={{
                  padding: '12px 16px', background: '#fef3c7', borderRadius: '10px',
                  marginBottom: '16px', border: '1px solid #fde68a',
                  display: 'flex', alignItems: 'start', gap: '10px',
                }}>
                  <AlertTriangle size={18} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ fontSize: '0.85rem', color: '#92400e' }}>
                    <strong>Maharashtra Note:</strong> In Maharashtra, rental agreements must follow the <strong>Leave & License</strong> format
                    (not a traditional lease). Registration is <strong>mandatory</strong> regardless of tenure. This template uses
                    standard rental agreement language — for full Maharashtra compliance, consider registering via the
                    <strong> IGR Maharashtra</strong> portal.
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-primary" onClick={generateAgreement} disabled={submitting}>
                  <FileText size={18} /> {submitting ? '⏳ Generating...' : 'Generate & Download PDF'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Past Agreements */}
      <div className="card">
        <div className="card-header">
          <h3>📄 Generated Agreements</h3>
        </div>
        {agreements.length === 0 ? (
          <div className="empty-state">
            <FileText size={64} />
            <h4>No agreements yet</h4>
            <p>Create your first rental agreement above</p>
          </div>
        ) : (
          <>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Property</th>
                  <th>Lease Period</th>
                  <th>Rent</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {agreements.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(a => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>{a.tenantName}</td>
                    <td style={{ fontSize: '0.85rem' }}>{a.propertyAddress?.substring(0, 35)}</td>
                    <td>{formatDate(a.startDate)} → {formatDate(a.endDate)}</td>
                    <td style={{ fontWeight: 600 }}>₹{Number(a.rentAmount).toLocaleString('en-IN')}</td>
                    <td>{formatDate(a.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            totalItems={agreements.length}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
          </>
        )}
      </div>

      <UpgradeModal
        show={!!upgradeMsg}
        message={upgradeMsg}
        currentPlan={currentPlan}
        onClose={() => setUpgradeMsg('')}
        onUpgrade={() => onNavigate?.('license')}
      />
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function numberToWords(num) {
  if (num === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num < 20) return ones[num];
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
  if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' and ' + numberToWords(num % 100) : '');
  if (num < 100000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + numberToWords(num % 1000) : '');
  if (num < 10000000) return numberToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + numberToWords(num % 100000) : '');
  return numberToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + numberToWords(num % 10000000) : '');
}
