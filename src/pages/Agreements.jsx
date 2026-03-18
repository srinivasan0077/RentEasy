import { useState, useEffect } from 'react';
import { FileText, Download, Plus } from 'lucide-react';
import { getTenants, getProperties, addAgreement, getAgreements } from '../store';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/Pagination';
import UpgradeModal from '../components/UpgradeModal';
import jsPDF from 'jspdf';

export default function Agreements({ showToast, refresh, refreshKey, onNavigate }) {
  const { user, checkLimit, currentPlan } = useAuth();
  const userId = user?.id;
  const [showForm, setShowForm] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState('');
  const [form, setForm] = useState({
    tenantId: '', propertyId: '', startDate: '', endDate: '',
    rentAmount: '', deposit: '', maintenanceCharges: '',
    noticePeriod: '1', escalation: '5', lockInPeriod: '6',
    ownerName: '', ownerAddress: '', ownerPan: '', ownerAadhaar: '',
    stampDutyState: 'Karnataka', policeVerification: true, paintingClause: true,
  });
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
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

  const selectedTenant = tenants.find(t => t.id === form.tenantId);
  const selectedProperty = properties.find(p => p.id === form.propertyId);

  const handleTenantChange = (tenantId) => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (tenant) {
      const property = properties.find(p => p.id === tenant.propertyId);
      setForm({
        ...form,
        tenantId,
        propertyId: tenant.propertyId || tenant.property_id || '',
        startDate: tenant.moveInDate || tenant.move_in_date || '',
        endDate: tenant.leaseEnd || tenant.lease_end || '',
        rentAmount: property?.rent || '',
        deposit: property?.deposit || '',
      });
    }
  };

  const generateAgreement = async () => {
    // Check monthly limit
    const currentMonth = new Date().toISOString().slice(0, 7);
    const thisMonthCount = agreements.filter(a =>
      (a.createdAt || a.created_at || '').slice(0, 7) === currentMonth
    ).length;
    const { allowed, message: limitMsg } = checkLimit('agreements', thisMonthCount);
    if (!allowed) { setUpgradeMsg(limitMsg); return; }

    const missing = [];
    if (!form.ownerName) missing.push('Owner Name');
    if (!form.ownerPan) missing.push('Owner PAN');
    if (!form.tenantId) missing.push('Tenant');
    if (!form.propertyId) missing.push('Property');
    if (!form.startDate) missing.push('Start Date');
    if (!form.endDate) missing.push('End Date');
    if (missing.length > 0) {
      showToast(`Please fill: ${missing.join(', ')}`, 'error');
      return;
    }

    try {
      await addAgreement({
        ...form,
        tenantName: selectedTenant?.name,
        propertyAddress: selectedProperty?.address,
      }, userId);

      showToast('Agreement generated successfully!');
      refresh();
      downloadAgreementPDF();
    } catch (err) {
      console.error('Generate agreement error:', err);
      showToast(err.message || 'Failed to generate agreement', 'error');
    }
  };

  const downloadAgreementPDF = () => {
    const doc = new jsPDF();
    const margin = 20;
    let y = margin;

    const formatIndianDate = (dateStr) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    };

    const rentNum = Number(form.rentAmount);
    const depositNum = Number(form.deposit);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('RENTAL / LEASE AGREEMENT', 105, y, { align: 'center' });
    y += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`(Under Section 17 of the Indian Registration Act, 1908)`, 105, y, { align: 'center' });
    y += 7;
    doc.text(`(To be executed on appropriate Stamp Paper as per ${form.stampDutyState} State Stamp Act)`, 105, y, { align: 'center' });
    y += 15;

    let clauseNum = 0;
    const nextClause = () => ++clauseNum;

    const content = [
      `This Rental Agreement ("Agreement") is executed on this ${formatIndianDate(form.startDate)} at ${selectedProperty?.city || 'the city'}, ${selectedProperty?.state || 'the state'}.`,
      '',
      `BETWEEN:`,
      '',
      `LANDLORD/OWNER:`,
      `Name: ${form.ownerName}`,
      `Address: ${form.ownerAddress || 'As mentioned'}`,
      `PAN: ${form.ownerPan || 'N/A'}`,
      `Aadhaar: ${form.ownerAadhaar || 'N/A'}`,
      `(Hereinafter referred to as the "OWNER/LANDLORD", which expression shall include their heirs, executors, administrators, successors, and assigns)`,
      '',
      `AND`,
      '',
      `TENANT/LESSEE:`,
      `Name: ${selectedTenant?.name || ''}`,
      `Phone: ${selectedTenant?.phone || ''}`,
      `Aadhaar: ${selectedTenant?.aadhaar || 'N/A'}`,
      `PAN: ${selectedTenant?.pan || 'N/A'}`,
      `(Hereinafter referred to as the "TENANT/LESSEE")`,
      '',
      `SCHEDULE OF PROPERTY:`,
      `Address: ${selectedProperty?.address || ''}`,
      `City: ${selectedProperty?.city || ''}, ${selectedProperty?.state || ''} - ${selectedProperty?.pincode || ''}`,
      `Type: ${selectedProperty?.type || ''}  |  Built-up Area: ${selectedProperty?.area || ''} sq.ft`,
      '',
      `TERMS AND CONDITIONS:`,
      '',
      `${nextClause()}. MONTHLY RENT: The monthly rent for the said premises shall be Rs. ${rentNum.toLocaleString('en-IN')}/- (Rupees ${numberToWords(rentNum)} only), payable on or before the 5th of every calendar month. Failure to pay rent on time shall attract a late fee of Rs. 50/- per day of delay.`,
      '',
      `${nextClause()}. SECURITY DEPOSIT: The Tenant has deposited a sum of Rs. ${depositNum.toLocaleString('en-IN')}/- (Rupees ${numberToWords(depositNum)} only) as refundable security deposit. This amount shall be returned to the Tenant within 30 days of vacating the premises, after deducting any outstanding dues, damages to property (beyond normal wear and tear), unpaid utility bills, or cost of repairs as applicable.`,
      '',
      `${nextClause()}. LEASE PERIOD: This Agreement shall be valid for the period from ${formatIndianDate(form.startDate)} to ${formatIndianDate(form.endDate)}. The agreement may be renewed by mutual written consent of both parties.`,
      '',
    ];

    // Lock-in period clause
    if (form.lockInPeriod && form.lockInPeriod !== '0') {
      content.push(`${nextClause()}. LOCK-IN PERIOD: Neither party shall terminate this agreement during the initial lock-in period of ${form.lockInPeriod} month(s) from the date of commencement. If either party terminates during the lock-in period, they shall be liable to pay compensation equivalent to the rent for the remaining lock-in period.`);
      content.push('');
    }

    content.push(
      `${nextClause()}. MAINTENANCE CHARGES: ${form.maintenanceCharges ? `Monthly maintenance/society charges of Rs. ${Number(form.maintenanceCharges).toLocaleString('en-IN')}/- shall be borne by the Tenant, payable along with the monthly rent.` : 'Maintenance/society charges as applicable shall be borne by the Tenant.'}`,
      '',
      `${nextClause()}. RENT ESCALATION: The rent shall be increased by ${form.escalation}% at the end of every 11-month period or upon renewal of this agreement, whichever is applicable.`,
      '',
      `${nextClause()}. NOTICE PERIOD: Either party must provide ${form.noticePeriod} month(s) prior written notice before terminating this agreement. Failure to serve proper notice shall result in forfeiture of one month's rent as compensation.`,
      '',
      `${nextClause()}. NO SUBLETTING: The Tenant shall not sublet, assign, or transfer the tenancy or any part thereof to any third party without the prior written consent of the Owner.`,
      '',
      `${nextClause()}. PERMITTED USE: The Tenant shall use the premises exclusively for residential purposes. No commercial activity shall be carried out from the premises without prior written permission from the Owner.`,
      '',
      `${nextClause()}. STRUCTURAL MAINTENANCE: The Owner shall be responsible for maintaining the structural integrity of the property, including repairs to the roof, external walls, and plumbing infrastructure. Minor repairs and day-to-day maintenance shall be borne by the Tenant.`,
      '',
      `${nextClause()}. UTILITIES: Electricity, water, piped gas, internet/broadband, DTH/cable TV, and any other utility bills shall be paid directly by the Tenant to the respective service providers. The Tenant shall ensure no outstanding dues remain at the time of vacating.`,
      '',
      `${nextClause()}. ALTERATIONS: The Tenant shall not make any structural alterations, additions, or modifications to the premises without the prior written consent of the Owner. Any approved modifications shall be at the Tenant's expense and shall become the property of the Owner unless otherwise agreed.`,
      '',
    );

    // Painting clause
    if (form.paintingClause) {
      content.push(`${nextClause()}. PAINTING & REPAIR ON VACATING: Upon vacating the premises, the Tenant shall get the entire premises painted and hand over the property in the same condition as received (subject to normal wear and tear). If the Tenant fails to do so, the cost of painting shall be deducted from the security deposit.`);
      content.push('');
    }

    // Police verification clause
    if (form.policeVerification) {
      content.push(`${nextClause()}. POLICE VERIFICATION: The Tenant agrees to complete police verification formalities at the local police station within 15 days of moving in, as mandated by local authorities. The Owner shall cooperate in providing necessary documentation for the same. Copies of the verification receipt shall be maintained by both parties.`);
      content.push('');
    }

    // TDS clause for rent > 50K
    if (rentNum >= 50000) {
      content.push(`${nextClause()}. TAX DEDUCTION AT SOURCE (TDS): As the monthly rent exceeds Rs. 50,000/-, the Tenant is required to deduct TDS at the rate of 5% (or applicable rate) under Section 194-IB of the Income Tax Act, 1961, and remit the same to the Government of India. The Owner's PAN is: ${form.ownerPan}. The Tenant shall provide Form 16C to the Owner after filing of TDS returns.`);
      content.push('');
    }

    content.push(
      `${nextClause()}. VACATING: The Tenant shall vacate the premises on the expiry of this agreement unless renewed by mutual written consent. Upon vacating, the Tenant shall return all keys and hand over the property in good condition. A joint inspection shall be conducted before the return of the security deposit.`,
      '',
      `${nextClause()}. REGISTRATION: ${Number(form.endDate?.split('-')[0]) - Number(form.startDate?.split('-')[0]) >= 1 || (form.endDate && form.startDate && (new Date(form.endDate) - new Date(form.startDate)) / (1000 * 60 * 60 * 24 * 30) > 11) ? 'As this agreement exceeds 11 months, it is advisable to register this document with the Sub-Registrar as per Section 17 of the Indian Registration Act, 1908. Registration charges shall be borne equally by both parties unless otherwise agreed.' : 'This agreement is for a period of 11 months or less and hence registration under Section 17 of the Indian Registration Act, 1908 is not mandatory. However, parties may opt for voluntary registration.'}`,
      '',
      `${nextClause()}. STAMP DUTY: This agreement shall be executed on appropriate e-stamp paper / non-judicial stamp paper of requisite value as per the ${form.stampDutyState} Stamp Act. The cost of stamp duty shall be borne equally by both parties unless otherwise agreed.`,
      '',
      `${nextClause()}. GOVERNING LAW & JURISDICTION: This agreement shall be governed by the laws of India. Any disputes arising out of or in connection with this agreement shall be subject to the exclusive jurisdiction of the courts at ${selectedProperty?.city || 'the city'}, ${selectedProperty?.state || 'the state'}.`,
      '',
      `${nextClause()}. ENTIRE AGREEMENT: This Agreement, together with any schedules and annexures, constitutes the entire agreement between the parties. Any amendments or modifications shall be made only in writing and signed by both parties.`,
      '',
      `IN WITNESS WHEREOF, the parties hereto have set their hands on this Agreement on the date first mentioned above, in the presence of the witnesses named below.`,
    );

    doc.setFontSize(10);
    content.forEach(line => {
      if (y > 270) { doc.addPage(); y = margin; }
      if (line.startsWith('BETWEEN') || line.startsWith('AND') || line.startsWith('LANDLORD') ||
          line.startsWith('TENANT') || line.startsWith('SCHEDULE') || line.startsWith('TERMS') ||
          line.startsWith('IN WITNESS')) {
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setFont('helvetica', 'normal');
      }
      const lines = doc.splitTextToSize(line || ' ', 170);
      lines.forEach(l => {
        if (y > 270) { doc.addPage(); y = margin; }
        doc.text(l, margin, y);
        y += 6;
      });
    });

    y += 20;
    if (y > 220) { doc.addPage(); y = margin; }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('SIGNATURES:', margin, y);
    y += 15;

    doc.setFontSize(10);
    doc.text('_______________________', margin, y);
    doc.text('_______________________', 120, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.text(`Owner: ${form.ownerName}`, margin, y);
    doc.text(`Tenant: ${selectedTenant?.name || ''}`, 120, y);
    y += 6;
    doc.text(`PAN: ${form.ownerPan}`, margin, y);
    doc.text(`PAN: ${selectedTenant?.pan || 'N/A'}`, 120, y);
    y += 6;
    doc.text(`Date: ${formatIndianDate(form.startDate)}`, margin, y);
    doc.text(`Date: ${formatIndianDate(form.startDate)}`, 120, y);
    y += 18;

    doc.setFont('helvetica', 'bold');
    doc.text('WITNESSES:', margin, y);
    y += 12;

    doc.text('_______________________', margin, y);
    doc.text('_______________________', 120, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.text('Witness 1: Name ___________', margin, y);
    doc.text('Witness 2: Name ___________', 120, y);
    y += 6;
    doc.text('Address: _______________', margin, y);
    doc.text('Address: _______________', 120, y);
    y += 6;
    doc.text('Aadhaar/ID: ____________', margin, y);
    doc.text('Aadhaar/ID: ____________', 120, y);

    y += 15;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('Note: This agreement is a template for reference. Both parties are advised to seek independent legal counsel.', margin, y);
    y += 5;
    doc.text('Stamp duty and registration charges may vary by state. Please verify with your local Sub-Registrar office.', margin, y);
    y += 5;
    doc.text('Generated by RentEasy — Rental Management Platform | www.renteasy.in', margin, y);

    doc.save(`Rent_Agreement_${selectedTenant?.name?.replace(/\s/g, '_') || 'document'}.pdf`);
    showToast('Agreement PDF downloaded! 📄');
  };

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

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Owner Name *</label>
              <input className="form-input" value={form.ownerName}
                onChange={e => setForm({ ...form, ownerName: e.target.value })} placeholder="Your full name" />
            </div>
            <div className="form-group">
              <label className="form-label">Owner Address</label>
              <input className="form-input" value={form.ownerAddress}
                onChange={e => setForm({ ...form, ownerAddress: e.target.value })} placeholder="Your permanent address" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Owner PAN *</label>
              <input className="form-input" value={form.ownerPan}
                onChange={e => setForm({ ...form, ownerPan: e.target.value.toUpperCase() })} placeholder="ABCDE1234F" maxLength={10} />
              <small style={{ color: 'var(--gray-400)', fontSize: '0.75rem' }}>Required for TDS compliance (Section 194-IB)</small>
            </div>
            <div className="form-group">
              <label className="form-label">Owner Aadhaar</label>
              <input className="form-input" value={form.ownerAadhaar}
                onChange={e => setForm({ ...form, ownerAadhaar: e.target.value })} placeholder="1234-5678-9012" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Select Tenant *</label>
            <select className="form-select" value={form.tenantId}
              onChange={e => handleTenantChange(e.target.value)}>
              <option value="">Choose a tenant</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.name} - {t.phone}</option>)}
            </select>
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
                <select className="form-select" value={form.escalation}
                  onChange={e => setForm({ ...form, escalation: e.target.value })}>
                  <option value="0">0%</option>
                  <option value="5">5%</option>
                  <option value="8">8%</option>
                  <option value="10">10%</option>
                </select>
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
                  <label className="form-label">Stamp Duty State</label>
                  <select className="form-select" value={form.stampDutyState}
                    onChange={e => setForm({ ...form, stampDutyState: e.target.value })}>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Telangana">Telangana</option>
                    <option value="Uttar Pradesh">Uttar Pradesh</option>
                    <option value="Gujarat">Gujarat</option>
                    <option value="Rajasthan">Rajasthan</option>
                    <option value="West Bengal">West Bengal</option>
                    <option value="Kerala">Kerala</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

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

              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-primary" onClick={generateAgreement}>
                  <FileText size={18} /> Generate & Download PDF
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
