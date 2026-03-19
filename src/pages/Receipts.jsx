import { useState, useEffect, useRef } from 'react';
import { Download, Receipt, FileText, Upload, X, Pen, ClipboardList } from 'lucide-react';
import { getTenants, getProperties, getPayments, addReceipt, getReceipts, getLandlordProfile, saveLandlordProfile } from '../store';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/Pagination';
import UpgradeModal from '../components/UpgradeModal';
import { FormSkeleton } from '../components/SkeletonLoader';
import jsPDF from 'jspdf';

const SIGNATURE_STORAGE_KEY = 'renteasy_landlord_signature';

export default function Receipts({ showToast, refresh, refreshKey, onNavigate }) {
  const { user, checkLimit, currentPlan } = useAuth();
  const userId = user?.id;
  const [upgradeMsg, setUpgradeMsg] = useState('');
  const [form, setForm] = useState({
    tenantId: '', month: '', receiptNo: `RR-${Date.now().toString().slice(-6)}`,
    landlordName: '', landlordPan: '', landlordAddress: '',
  });
  const [showPreview, setShowPreview] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [payments, setPayments] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [signatureImg, setSignatureImg] = useState(null);
  const sigFileRef = useRef(null);

  // Load saved signature from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(SIGNATURE_STORAGE_KEY);
    if (saved) setSignatureImg(saved);
  }, []);

  const handleSignatureUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file (PNG, JPG)', 'error');
      return;
    }
    if (file.size > 500 * 1024) {
      showToast('Signature image must be under 500KB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target.result;
      setSignatureImg(dataUrl);
      localStorage.setItem(SIGNATURE_STORAGE_KEY, dataUrl);
      showToast('Signature uploaded! It will be embedded in all receipts ✍️');
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-uploaded
    e.target.value = '';
  };

  const removeSignature = () => {
    setSignatureImg(null);
    localStorage.removeItem(SIGNATURE_STORAGE_KEY);
    showToast('Signature removed');
  };

  useEffect(() => {
    async function load() {
      const [t, p, pay, r] = await Promise.all([
        getTenants(userId),
        getProperties(userId),
        getPayments(userId),
        getReceipts(userId),
      ]);
      setTenants(t);
      setProperties(p);
      setPayments(pay);
      setReceipts(r);
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
      landlordName: savedLandlord.name || prev.landlordName,
      landlordPan: savedLandlord.pan || prev.landlordPan,
      landlordAddress: savedLandlord.address || prev.landlordAddress,
    }));
    showToast('Landlord details filled from saved profile ✅');
  };

  // Auto-save landlord details when generating receipt
  const maybeSaveLandlordProfile = () => {
    if (form.landlordName && form.landlordPan) {
      const current = getLandlordProfile(userId);
      const changed = !current ||
        current.name !== form.landlordName ||
        current.pan !== form.landlordPan ||
        current.address !== form.landlordAddress;
      if (changed) {
        saveLandlordProfile({
          name: form.landlordName,
          pan: form.landlordPan,
          address: form.landlordAddress,
        }, userId);
      }
    }
  };

  const selectedTenant = tenants.find(t => t.id === form.tenantId);
  const selectedProperty = selectedTenant ? properties.find(p => p.id === selectedTenant.propertyId) : null;
  const selectedPayment = form.tenantId && form.month
    ? payments.find(p => p.tenantId === form.tenantId && p.month === form.month && p.status === 'paid')
    : null;

  const generateReceipt = () => {
    // Check monthly limit
    const currentMonth = new Date().toISOString().slice(0, 7);
    const thisMonthCount = receipts.filter(r =>
      (r.createdAt || r.created_at || '').slice(0, 7) === currentMonth
    ).length;
    const { allowed, message: limitMsg } = checkLimit('receipts', thisMonthCount);
    if (!allowed) { setUpgradeMsg(limitMsg); return; }

    if (!form.landlordName || !form.landlordPan) {
      showToast('Landlord name and PAN are required for valid HRA receipts', 'error');
      return;
    }
    if (!selectedPayment) {
      showToast('No paid payment found for this month', 'error');
      return;
    }
    setShowPreview(true);
  };

  const downloadReceiptPDF = async () => {
    if (submitting) return;
    if (!form.landlordName || !form.landlordPan) {
      showToast('Landlord name and PAN are required', 'error');
      return;
    }
    setSubmitting(true);

    const doc = new jsPDF();
    const margin = 20;
    let y = 25;
    const amount = Number(selectedPayment?.amount);

    // Header
    doc.setDrawColor(99, 102, 241);
    doc.setLineWidth(2);
    doc.line(margin, y - 5, 190, y - 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('RENT RECEIPT', 105, y + 5, { align: 'center' });
    y += 12;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('(For Income Tax HRA Exemption under Section 10(13A) of the Income Tax Act, 1961)', 105, y, { align: 'center' });
    y += 10;
    doc.line(margin, y, 190, y);
    y += 15;

    // Receipt Details
    doc.setFontSize(11);
    const addRow = (label, value) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(String(value || ''), 80, y);
      y += 8;
    };

    const formatIndianDate = (dateStr) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    };

    addRow('Receipt No:', form.receiptNo);
    addRow('Date:', new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }));
    y += 5;

    // Landlord (receiver) details - COMPLIANCE: mandatory for HRA
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('RECEIVED BY (Landlord):', margin, y);
    y += 8;
    doc.setFontSize(11);
    addRow('Name:', form.landlordName);
    addRow('PAN:', form.landlordPan);
    if (form.landlordAddress) addRow('Address:', form.landlordAddress);
    y += 5;

    // Tenant (payer) details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('RECEIVED FROM (Tenant):', margin, y);
    y += 8;
    doc.setFontSize(11);
    addRow('Name:', selectedTenant?.name || '');
    addRow('PAN:', selectedTenant?.pan || 'N/A');
    y += 5;

    // Property Address — inline with label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Property Address:', margin, y);
    doc.setFont('helvetica', 'normal');
    const fullAddr = [
      selectedProperty?.address || '',
      [selectedProperty?.city, selectedProperty?.state].filter(Boolean).join(', '),
      selectedProperty?.pincode ? `- ${selectedProperty.pincode}` : '',
    ].filter(Boolean).join(', ');
    const addrLines = doc.splitTextToSize(fullAddr, 110);
    addrLines.forEach((l, i) => {
      doc.text(l, 80, y + (i * 6));
    });
    y += addrLines.length * 6 + 4;

    addRow('Rent Period:', getMonthName(form.month));
    addRow('Payment Method:', selectedPayment?.method || 'N/A');
    addRow('Payment Date:', formatIndianDate(selectedPayment?.paidDate));

    // Amount Box
    y += 10;
    doc.setFillColor(238, 242, 255);
    doc.roundedRect(margin, y, 170, 30, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`Amount Received: Rs. ${amount.toLocaleString('en-IN')}/-`, 105, y + 12, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`(Rupees ${numberToWords(amount)} only)`, 105, y + 22, { align: 'center' });
    y += 45;

    // TDS note for rent > 50K/month — COMPLIANCE: Section 194-IB
    if (amount >= 50000) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(180, 50, 50);
      doc.text('TDS NOTE: As monthly rent exceeds Rs. 50,000/-, TDS @ 5% under Section 194-IB is applicable.', margin, y);
      y += 6;
      doc.text(`Tenant must deduct Rs. ${Math.round(amount * 0.05).toLocaleString('en-IN')}/- as TDS and provide Form 16C to the Landlord.`, margin, y);
      doc.setTextColor(0, 0, 0);
      y += 10;
    }

    // ============================================
    // PAGE 2: Declaration & Signatures
    // ============================================
    doc.addPage();
    y = 30;

    // Declaration — COMPLIANCE: proper HRA declaration text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('DECLARATION', margin, y);
    y += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`I, ${form.landlordName}, hereby acknowledge receipt of Rs. ${amount.toLocaleString('en-IN')}/- from`, margin, y);
    y += 5;
    doc.text(`${selectedTenant?.name || ''} towards rent for the month of ${getMonthName(form.month)} for the above property.`, margin, y);
    y += 8;
    doc.text('This receipt may be used by the tenant for claiming HRA exemption under Section 10(13A) of the Income Tax Act, 1961.', margin, y);
    y += 8;
    if (amount * 12 > 100000) {
      doc.setFont('helvetica', 'italic');
      doc.text(`Note: As annual rent exceeds Rs. 1,00,000/-, Landlord's PAN (${form.landlordPan}) is mandatory for HRA claim.`, margin, y);
      y += 8;
    }

    // Signatures
    y += 20;

    const leftX = margin;
    const rightX = 120;

    // Row 1: Labels
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('Landlord Signature:', leftX, y);
    doc.text('Tenant Signature:', rightX, y);
    y += 4;

    // Row 2: Signature area
    const sigLineY = y + 18; // where the signature line will be drawn

    if (signatureImg) {
      // Signature image sits just above the line
      try {
        doc.addImage(signatureImg, 'PNG', leftX, y, 45, 16);
      } catch (e) {
        // Fallback — no image
      }
    }

    // Draw signature lines for both sides
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(leftX, sigLineY, leftX + 55, sigLineY);       // Landlord line
    doc.line(rightX, sigLineY, rightX + 55, sigLineY);      // Tenant line
    y = sigLineY + 2;

    // Row 3: Digital signature note (if applicable)
    if (signatureImg) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text('(Digitally signed)', leftX, y + 3);
      doc.setTextColor(0, 0, 0);
    }
    y += 8;

    // Row 4: Names
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Name: ${form.landlordName}`, leftX, y);
    doc.text(`Name: ${selectedTenant?.name || ''}`, rightX, y);

    // Revenue Stamp — only shown for cash payments (Indian Stamp Act, Section 30)
    const isCash = selectedPayment?.method?.toLowerCase() === 'cash';
    if (isCash) {
      y += 12;
      const stampX = 150;
      const stampY = y;
      const stampW = 35;
      const stampH = 35;
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.5);
      doc.setTextColor(0, 0, 0);
      doc.rect(stampX, stampY, stampW, stampH);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('Revenue Stamp', stampX + stampW / 2, stampY + 14, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      if (amount >= 5000) {
        doc.text('[Affix Re. 1', stampX + stampW / 2, stampY + 22, { align: 'center' });
        doc.text('stamp here]', stampX + stampW / 2, stampY + 27, { align: 'center' });
      } else {
        doc.text('Re. 1 affixed', stampX + stampW / 2, stampY + 22, { align: 'center' });
      }
      y = stampY + stampH + 10;
    } else {
      y += 14;
    }
    doc.setDrawColor(99, 102, 241);
    doc.setLineWidth(1);
    doc.line(margin, y, 190, y);

    doc.save(`Rent_Receipt_${selectedTenant?.name?.replace(/\s/g, '_')}_${form.month}.pdf`);

    try {
      await addReceipt({
        tenantId: form.tenantId,
        propertyId: selectedTenant?.propertyId,
        month: form.month,
        amount: selectedPayment?.amount,
        receiptNo: form.receiptNo,
      }, userId);

      showToast('Rent receipt downloaded! 🧾');
      maybeSaveLandlordProfile();
      setForm({ ...form, receiptNo: `RR-${Date.now().toString().slice(-6)}` });
      refresh();
    } catch (err) {
      console.error('Save receipt error:', err);
      showToast(err.message || 'PDF downloaded but failed to save record', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const paidMonths = form.tenantId
    ? [...new Set(payments.filter(p => p.tenantId === form.tenantId && p.status === 'paid').map(p => p.month))].sort().reverse()
    : [];

  if (loading) return <FormSkeleton />;

  return (
    <div>
      <div className="page-header">
        <h2>Rent Receipts</h2>
        <p>Generate rent receipts for HRA tax exemption (Section 10(13A))</p>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '20px' }}>🧾 Generate New Receipt</h3>

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
            <label className="form-label">Landlord/Owner Name *</label>
            <input className="form-input" value={form.landlordName}
              onChange={e => setForm({ ...form, landlordName: e.target.value })} placeholder="Landlord full name" />
          </div>
          <div className="form-group">
            <label className="form-label">Landlord PAN *</label>
            <input className="form-input" value={form.landlordPan}
              onChange={e => setForm({ ...form, landlordPan: e.target.value.toUpperCase() })} placeholder="ABCDE1234F" maxLength={10} />
            <small style={{ color: 'var(--gray-400)', fontSize: '0.75rem' }}>Mandatory for HRA claims when rent &gt; ₹8,333/month</small>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Landlord Address</label>
          <input className="form-input" value={form.landlordAddress}
            onChange={e => setForm({ ...form, landlordAddress: e.target.value })} placeholder="Landlord's permanent address" />
        </div>

        {/* Digital Signature Upload */}
        <div className="form-group">
          <label className="form-label">
            <Pen size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            Landlord Digital Signature
          </label>
          <input
            type="file"
            ref={sigFileRef}
            accept="image/png,image/jpeg,image/webp"
            onChange={handleSignatureUpload}
            style={{ display: 'none' }}
          />
          {signatureImg ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '16px',
              padding: '12px 16px', background: '#f0fdf4', borderRadius: '10px',
              border: '1px solid #bbf7d0',
            }}>
              <img
                src={signatureImg}
                alt="Landlord Signature"
                style={{
                  maxHeight: '50px', maxWidth: '180px',
                  objectFit: 'contain', borderRadius: '6px',
                  border: '1px solid #d1d5db', background: '#fff', padding: '4px',
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 600 }}>
                  ✅ Signature saved
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                  Will be auto-embedded in all receipt PDFs
                </div>
              </div>
              <button
                className="btn"
                onClick={() => sigFileRef.current?.click()}
                style={{ fontSize: '0.8rem', padding: '6px 12px' }}
              >
                Change
              </button>
              <button
                className="btn"
                onClick={removeSignature}
                style={{ fontSize: '0.8rem', padding: '6px 10px', color: '#dc2626' }}
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div
              onClick={() => sigFileRef.current?.click()}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '10px', padding: '20px', borderRadius: '10px',
                border: '2px dashed #cbd5e1', cursor: 'pointer',
                background: '#f8fafc', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.background = '#eef2ff'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
            >
              <Upload size={20} style={{ color: 'var(--gray-400)' }} />
              <div>
                <div style={{ fontSize: '0.9rem', color: 'var(--gray-600)', fontWeight: 500 }}>
                  Upload signature image
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                  PNG or JPG, max 500KB • Saved locally for all future receipts
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Select Tenant</label>
            <select className="form-select" value={form.tenantId}
              onChange={e => setForm({ ...form, tenantId: e.target.value, month: '' })}>
              <option value="">Choose a tenant</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Month (Paid)</label>
            <select className="form-select" value={form.month}
              onChange={e => setForm({ ...form, month: e.target.value })}>
              <option value="">Select month</option>
              {paidMonths.map(m => <option key={m} value={m}>{getMonthName(m)}</option>)}
            </select>
          </div>
        </div>

        {selectedPayment && (
          <>
            <div className="receipt-preview" style={{ marginBottom: '20px' }}>
              <div className="receipt-header">
                <h2>RENT RECEIPT</h2>
                <p style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>For HRA Tax Exemption • Section 10(13A)</p>
              </div>
              <div className="receipt-row"><span className="label">Receipt No</span><span>{form.receiptNo}</span></div>
              <div className="receipt-row"><span className="label">Landlord</span><span>{form.landlordName} (PAN: {form.landlordPan || 'N/A'})</span></div>
              <div className="receipt-row"><span className="label">Tenant Name</span><span>{selectedTenant?.name}</span></div>
              <div className="receipt-row"><span className="label">Tenant PAN</span><span>{selectedTenant?.pan || 'N/A'}</span></div>
              <div className="receipt-row"><span className="label">Property</span><span>{selectedProperty?.address}</span></div>
              <div className="receipt-row"><span className="label">Rent Period</span><span>{getMonthName(form.month)}</span></div>
              <div className="receipt-row"><span className="label">Payment Date</span><span>{selectedPayment?.paidDate}</span></div>
              <div className="receipt-row"><span className="label">Payment Method</span><span>{selectedPayment?.method}</span></div>
              <div className="receipt-amount">
                <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginBottom: '4px' }}>Amount Received</div>
                <div className="amount">₹{Number(selectedPayment?.amount).toLocaleString('en-IN')}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginTop: '4px' }}>
                  ({numberToWords(Number(selectedPayment?.amount))} Rupees only)
                </div>
              </div>
              {Number(selectedPayment?.amount) >= 50000 && (
                <div style={{ padding: '10px', background: '#fef2f2', borderRadius: '8px', fontSize: '0.8rem', color: '#b91c1c', marginTop: '12px' }}>
                  ⚠️ TDS @ 5% (Rs. {Math.round(Number(selectedPayment?.amount) * 0.05).toLocaleString('en-IN')}) applicable under Section 194-IB
                </div>
              )}
              {signatureImg && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px', background: '#f0fdf4', borderRadius: '8px',
                  fontSize: '0.8rem', color: '#15803d', marginTop: '12px',
                }}>
                  <Pen size={14} />
                  <span><strong>Digital signature</strong> will be embedded in PDF — no printing needed!</span>
                </div>
              )}
            </div>
            <button className="btn btn-primary" onClick={downloadReceiptPDF} disabled={submitting}>
              <Download size={18} /> {submitting ? '⏳ Downloading...' : 'Download Receipt PDF'}
            </button>
          </>
        )}
      </div>

      {/* Past Receipts */}
      <div className="card">
        <div className="card-header"><h3>📋 Generated Receipts</h3></div>
        {receipts.length === 0 ? (
          <div className="empty-state">
            <Receipt size={64} />
            <h4>No receipts generated yet</h4>
            <p>Select a tenant and paid month above to generate a receipt</p>
          </div>
        ) : (
          <>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Receipt No</th><th>Tenant</th><th>Month</th><th>Amount</th><th>Generated</th></tr>
              </thead>
              <tbody>
                {receipts.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(r => {
                  const tenant = tenants.find(t => t.id === r.tenantId);
                  return (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{r.receiptNo}</td>
                      <td>{tenant?.name || 'Unknown'}</td>
                      <td>{getMonthName(r.month)}</td>
                      <td style={{ fontWeight: 600 }}>₹{Number(r.amount).toLocaleString('en-IN')}</td>
                      <td>{formatDate(r.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            totalItems={receipts.length}
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

function getMonthName(monthStr) {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-');
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[parseInt(month) - 1]} ${year}`;
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
