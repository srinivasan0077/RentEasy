import { useState, useEffect, useRef } from 'react';
import { Search, CheckCircle, MessageCircle, Filter, Plus, IndianRupee, Pencil, Zap, CalendarPlus, Upload, Image, ChevronLeft, ChevronRight, Users, AlertTriangle, Clock, LayoutGrid, List, Send, Trash2, Camera, Eye, X, Calendar, CreditCard, StickyNote, ImageIcon, Building2 } from 'lucide-react';
import { getPayments, updatePayment, addPayment, deletePayment, getTenants, getProperties, uploadAttachment, getRentDueDay, deleteAttachmentsForEntity } from '../store';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import Pagination from '../components/Pagination';
import FileUpload from '../components/FileUpload';
import UpgradeModal from '../components/UpgradeModal';
import { TableSkeleton } from '../components/SkeletonLoader';

export default function Payments({ showToast, refresh, refreshKey, onNavigate }) {
  const { user, checkLimit, currentPlan, refreshStorageUsage } = useAuth();
  const userId = user?.id;
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [payments, setPayments] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'

  const currentMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [payForm, setPayForm] = useState({
    tenantId: '', propertyId: '', amount: '', month: currentMonth,
    status: 'pending', method: '', notes: '',
  });
  const [bulkStartMonth, setBulkStartMonth] = useState(currentMonth);
  const [bulkEndMonth, setBulkEndMonth] = useState(currentMonth);
  const [bulkTenants, setBulkTenants] = useState([]); // which tenants to include
  const [currentDueDay, setCurrentDueDay] = useState(5);

  useEffect(() => {
    async function load() {
      const [pay, t, p] = await Promise.all([
        getPayments(userId),
        getTenants(userId),
        getProperties(userId),
      ]);
      // Auto-overdue: sync payment statuses based on customizable due day
      const today = new Date();
      const dueDay = await getRentDueDay(userId);
      const activeTids = new Set(t.map(tn => tn.id));
      const autoUpdated = [];
      for (const payment of pay) {
        // Only auto-sync status for active tenants
        if (payment.month && activeTids.has(payment.tenantId)) {
          const [year, month] = payment.month.split('-').map(Number);
          const dueDate = new Date(year, month - 1, dueDay);
          // pending → overdue: due date has passed
          if (payment.status === 'pending' && today > dueDate) {
            payment.status = 'overdue';
            autoUpdated.push(payment);
          }
          // overdue → pending: due date hasn't passed yet (landlord changed due day)
          if (payment.status === 'overdue' && today <= dueDate) {
            payment.status = 'pending';
            autoUpdated.push(payment);
          }
        }
      }
      for (const payment of autoUpdated) {
        try { await updatePayment(payment.id, { status: payment.status }, userId); } catch {}
      }
      setPayments(pay);
      setTenants(t);
      setProperties(p);
      setCurrentDueDay(dueDay);
      setLoading(false);
    }
    load();
  }, [userId, refreshKey]);

  const handleTenantChange = (tenantId) => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (tenant) {
      setPayForm({
        ...payForm,
        tenantId,
        propertyId: tenant.propertyId || tenant.property_id || '',
        amount: tenant.rent || '',
      });
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!payForm.tenantId || !payForm.amount || !payForm.month) {
      showToast('Please select tenant, enter amount, and month', 'error');
      return;
    }
    setSubmitting(true);
    try {
      if (editingPayment) {
        await updatePayment(editingPayment.id, {
          status: payForm.status,
          paidDate: payForm.status === 'paid' ? (payForm.paidDate || new Date().toISOString().split('T')[0]) : null,
          paid_date: payForm.status === 'paid' ? (payForm.paidDate || new Date().toISOString().split('T')[0]) : null,
          method: payForm.method,
        }, userId);
        showToast('Payment updated! ✅');
      } else {
        await addPayment({
          tenantId: payForm.tenantId,
          propertyId: payForm.propertyId,
          amount: payForm.amount,
          month: payForm.month,
          status: payForm.status,
          paidDate: payForm.status === 'paid' ? new Date().toISOString().split('T')[0] : null,
          method: payForm.method,
          notes: payForm.notes,
        }, userId);
        showToast('Payment record added! 💰');
      }
      resetPayForm();
      refresh();
    } catch (err) {
      console.error('Save payment error:', err);
      showToast(err.message || 'Failed to save payment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetPayForm = () => {
    setPayForm({ tenantId: '', propertyId: '', amount: '', month: currentMonth, status: 'pending', method: '', notes: '' });
    setShowModal(false);
    setEditingPayment(null);
    setSubmitting(false);
  };

  const openEditPayment = (payment) => {
    setEditingPayment(payment);
    setPayForm({
      tenantId: payment.tenantId,
      propertyId: payment.propertyId,
      amount: payment.amount,
      month: payment.month,
      status: payment.status,
      method: payment.method || '',
      notes: payment.notes || '',
      paidDate: payment.paidDate || '',
    });
    setShowModal(true);
  };

  const openAddModal = () => {
    setEditingPayment(null);
    setPayForm({ tenantId: '', propertyId: '', amount: '', month: currentMonth, status: 'pending', method: '', notes: '' });
    setShowModal(true);
  };

  // ===== BULK GENERATE PAYMENTS (Multi-Month) =====
  const getMonthsInRange = (start, end) => {
    const months = [];
    let [sy, sm] = start.split('-').map(Number);
    const [ey, em] = end.split('-').map(Number);
    while (sy < ey || (sy === ey && sm <= em)) {
      months.push(`${sy}-${String(sm).padStart(2, '0')}`);
      sm++;
      if (sm > 12) { sm = 1; sy++; }
    }
    return months;
  };

  const openBulkModal = () => {
    const { allowed, message } = checkLimit('bulkGenerate', 0);
    if (!allowed) { setUpgradeMsg(message); return; }
    setBulkStartMonth(currentMonth);
    setBulkEndMonth(currentMonth);
    // Pre-select all tenants that don't already have a payment for this month
    const existingForMonth = payments.filter(p => p.month === currentMonth).map(p => p.tenantId);
    const eligible = tenants.filter(t => !existingForMonth.includes(t.id));
    setBulkTenants(eligible.map(t => t.id));
    setShowBulkModal(true);
  };

  const handleBulkStartChange = (month) => {
    setBulkStartMonth(month);
    const endMonth = month > bulkEndMonth ? month : bulkEndMonth;
    setBulkEndMonth(endMonth);
    recalcEligibleTenants(month, endMonth);
  };

  const handleBulkEndChange = (month) => {
    const endMonth = month < bulkStartMonth ? bulkStartMonth : month;
    setBulkEndMonth(endMonth);
    recalcEligibleTenants(bulkStartMonth, endMonth);
  };

  const recalcEligibleTenants = (start, end) => {
    const months = getMonthsInRange(start, end);
    // Include tenants that are missing at least one month in the range
    const eligible = tenants.filter(t => {
      return months.some(m => !payments.some(p => p.tenantId === t.id && p.month === m));
    });
    setBulkTenants(eligible.map(t => t.id));
  };

  const toggleBulkTenant = (tenantId) => {
    setBulkTenants(prev =>
      prev.includes(tenantId) ? prev.filter(id => id !== tenantId) : [...prev, tenantId]
    );
  };

  const handleBulkGenerate = async () => {
    if (bulkTenants.length === 0) {
      showToast('No tenants selected', 'error');
      return;
    }
    const months = getMonthsInRange(bulkStartMonth, bulkEndMonth);
    setBulkGenerating(true);
    let created = 0;
    let skipped = 0;
    let failed = 0;
    for (const month of months) {
      for (const tenantId of bulkTenants) {
        // Skip if payment already exists for this tenant+month
        const exists = payments.some(p => p.tenantId === tenantId && p.month === month);
        if (exists) { skipped++; continue; }
        const tenant = tenants.find(t => t.id === tenantId);
        try {
          await addPayment({
            tenantId,
            propertyId: tenant?.propertyId || '',
            amount: tenant?.rent || 0,
            month,
            status: 'pending',
            paidDate: null,
            method: '',
            notes: 'Auto-generated',
          }, userId);
          created++;
        } catch (err) {
          console.error(`Bulk payment failed for ${tenant?.name} (${month}):`, err);
          failed++;
        }
      }
    }
    setBulkGenerating(false);
    setShowBulkModal(false);
    let msg = `✅ ${created} payment record(s) created`;
    if (skipped) msg += `, ${skipped} skipped (already exist)`;
    if (failed) msg += `, ${failed} failed`;
    showToast(msg + '!');
    refresh();
  };

  const bulkMonths = getMonthsInRange(bulkStartMonth, bulkEndMonth);

  // ===== MONTH NAVIGATION =====
  const navigateMonth = (direction) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    let newM = m + direction;
    let newY = y;
    if (newM > 12) { newM = 1; newY++; }
    if (newM < 1) { newM = 12; newY--; }
    setSelectedMonth(`${newY}-${String(newM).padStart(2, '0')}`);
  };

  // ===== ACTIVE TENANT IDs (for filtering metrics) =====
  const activeTenantIds = new Set(tenants.map(t => t.id));

  // ===== MONTHLY COLLECTION STATS (only active tenants) =====
  const monthlyPayments = payments.filter(p => p.month === selectedMonth && activeTenantIds.has(p.tenantId));
  const monthlyPaid = monthlyPayments.filter(p => p.status === 'paid');
  const monthlyPending = monthlyPayments.filter(p => p.status === 'pending');
  const monthlyOverdue = monthlyPayments.filter(p => p.status === 'overdue');
  const monthlyCollected = monthlyPaid.reduce((s, p) => s + Number(p.amount || 0), 0);
  const monthlyExpected = monthlyPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const collectionPercent = monthlyExpected > 0 ? Math.round((monthlyCollected / monthlyExpected) * 100) : 0;

  // ===== TENANT PAYMENT CARDS FOR SELECTED MONTH =====
  const tenantCardsData = tenants.map(tenant => {
    const property = properties.find(p => p.id === tenant.propertyId);
    const payment = monthlyPayments.find(p => p.tenantId === tenant.id);
    return { tenant, property, payment };
  });

  // ===== QUICK ACTIONS =====
  const generateThisMonth = async () => {
    const { allowed, message } = checkLimit('bulkGenerate', 0);
    if (!allowed) { setUpgradeMsg(message); return; }
    let created = 0;
    for (const tenant of tenants) {
      const exists = payments.some(p => p.tenantId === tenant.id && p.month === selectedMonth);
      if (exists) continue;
      try {
        await addPayment({
          tenantId: tenant.id,
          propertyId: tenant.propertyId || '',
          amount: tenant.rent || 0,
          month: selectedMonth,
          status: 'pending',
          paidDate: null,
          method: '',
          notes: 'Auto-generated',
        }, userId);
        created++;
      } catch (err) {
        console.error('Quick generate failed:', err);
      }
    }
    if (created > 0) {
      showToast(`✅ ${created} payment(s) generated for ${getMonthName(selectedMonth)}`);
      refresh();
    } else {
      showToast('All tenants already have entries for this month', 'info');
    }
  };

  const remindAllPending = () => {
    const unpaid = monthlyPayments.filter(p => p.status === 'pending' || p.status === 'overdue');
    if (unpaid.length === 0) {
      showToast('No pending/overdue payments this month 🎉', 'info');
      return;
    }
    // Open WhatsApp for each (browser will queue them)
    for (const payment of unpaid) {
      sendReminder(payment);
    }
  };

  const quickMarkPaid = async (payment) => {
    try {
      await updatePayment(payment.id, {
        status: 'paid',
        paidDate: new Date().toISOString().split('T')[0],
        method: 'UPI',
      }, userId);
      showToast('Payment marked as paid! ✅');
      refresh();
    } catch (err) {
      showToast(err.message || 'Failed to update', 'error');
    }
  };

  const getTenantsWithSomePayments = () => {
    // Tenants who have payments for ALL months in range (fully covered)
    return tenants.filter(t => bulkMonths.every(m => payments.some(p => p.tenantId === t.id && p.month === m)));
  };

  const getTenantsEligible = () => {
    // Tenants missing at least one month
    return tenants.filter(t => bulkMonths.some(m => !payments.some(p => p.tenantId === t.id && p.month === m)));
  };

  const getNewEntriesCount = () => {
    let count = 0;
    for (const month of bulkMonths) {
      for (const tenantId of bulkTenants) {
        if (!payments.some(p => p.tenantId === tenantId && p.month === month)) count++;
      }
    }
    return count;
  };

  const filteredPayments = payments
    .filter(p => activeTenantIds.has(p.tenantId)) // exclude payments for inactive tenants
    .filter(p => filter === 'all' || p.status === filter)
    .filter(p => {
      if (!search) return true;
      const tenant = tenants.find(t => t.id === p.tenantId);
      return tenant?.name.toLowerCase().includes(search.toLowerCase()) || p.month.includes(search);
    })
    .sort((a, b) => {
      if (a.month > b.month) return -1;
      if (a.month < b.month) return 1;
      return 0;
    });

  const paginatedPayments = filteredPayments.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const [markingPaid, setMarkingPaid] = useState(null); // payment being marked as paid
  const [markPaidForm, setMarkPaidForm] = useState({ method: 'UPI', screenshotUrl: '' });

  const openMarkPaidModal = (payment) => {
    setMarkingPaid(payment);
    setMarkPaidForm({ method: 'UPI', screenshotUrl: payment.screenshotUrl || '' });
  };

  const confirmMarkPaid = async () => {
    if (!markingPaid) return;
    try {
      await updatePayment(markingPaid.id, {
        status: 'paid',
        paidDate: new Date().toISOString().split('T')[0],
        method: markPaidForm.method,
        screenshotUrl: markPaidForm.screenshotUrl,
      }, userId);
      showToast('Payment marked as paid! ✅');
      setMarkingPaid(null);
      refresh();
    } catch (err) {
      console.error('Update payment error:', err);
      showToast(err.message || 'Failed to update payment', 'error');
    }
  };

  const [deletingPayment, setDeletingPayment] = useState(null); // payment pending delete confirmation
  const [viewPayment, setViewPayment] = useState(null); // payment being viewed in detail modal

  const handleDeletePayment = async (payment) => {
    try {
      await deletePayment(payment.id, userId);
      showToast('Payment deleted 🗑️');
      refreshStorageUsage();
      setDeletingPayment(null);
      refresh();
    } catch (err) {
      console.error('Delete payment error:', err);
      showToast(err.message || 'Failed to delete payment', 'error');
    }
  };

  // Quick screenshot upload from card
  const screenshotUploadRef = useRef(null);
  const [screenshotUploadTarget, setScreenshotUploadTarget] = useState(null);

  const handleQuickScreenshotUpload = async (file, paymentId) => {
    if (!file || !paymentId) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('Screenshot must be under 5MB', 'error');
      return;
    }
    const { allowed, message: limitMsg } = checkLimit('attachmentsMB', 0);
    if (!allowed) { setUpgradeMsg(limitMsg); return; }
    try {
      // Delete old screenshot (file + DB row) before uploading new one
      await deleteAttachmentsForEntity(userId, 'payment', paymentId);
      const url = await uploadAttachment(file, userId, 'payment', paymentId, 'screenshot');
      await updatePayment(paymentId, { screenshotUrl: url }, userId);
      showToast('Payment screenshot uploaded! 📸');
      refreshStorageUsage();
      refresh();
    } catch (err) {
      console.error('Screenshot upload failed:', err);
      showToast(err.message || 'Screenshot upload failed', 'error');
    }
  };

  const sendReminder = (payment) => {
    const tenant = tenants.find(t => t.id === payment.tenantId);
    const property = properties.find(p => p.id === payment.propertyId);
    const dueDay = currentDueDay;
    const ordinal = (n) => { const s = ['th','st','nd','rd']; const v = n % 100; return n + (s[(v-20)%10] || s[v] || s[0]); };
    const message = `Hi ${tenant?.name}, this is a friendly reminder that your rent of ₹${Number(payment.amount).toLocaleString('en-IN')} for ${property?.name || property?.address || 'your property'} is due for ${payment.month} (by the ${ordinal(dueDay)}). Please pay at your earliest convenience. - RentEasy`;

    // Open WhatsApp with pre-filled message
    const whatsappUrl = `https://wa.me/91${tenant?.phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    showToast(`WhatsApp reminder opened for ${tenant?.name}`, 'info');
  };

  const formatCurrency = (amt) => `₹${Number(amt).toLocaleString('en-IN')}`;

  const pendingCount = payments.filter(p => p.status === 'pending' && activeTenantIds.has(p.tenantId)).length;
  const overdueCount = payments.filter(p => p.status === 'overdue' && activeTenantIds.has(p.tenantId)).length;
  const paidCount = payments.filter(p => p.status === 'paid' && activeTenantIds.has(p.tenantId)).length;

  if (loading) return <TableSkeleton rows={5} />;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
          <h2>Rent Payments</h2>
          <p>Track and manage rent payments from all tenants
            <span style={{
              marginLeft: '10px', padding: '2px 8px', borderRadius: '6px',
              background: '#f0f9ff', color: '#0369a1', fontSize: '0.75rem',
              fontWeight: 600, border: '1px solid #bae6fd', cursor: 'pointer',
            }} onClick={() => onNavigate && onNavigate('landlord-profile')}
              title="Change in Landlord Profile">
              ⏰ Due by {currentDueDay}{currentDueDay === 1 ? 'st' : currentDueDay === 2 ? 'nd' : currentDueDay === 3 ? 'rd' : 'th'} of month
            </span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={openBulkModal} title="Generate payment entries for all tenants in one click">
            <Zap size={18} /> Bulk Generate
          </button>
          <button className="btn btn-primary" onClick={openAddModal}>
            <Plus size={18} /> Add Payment
          </button>
        </div>
      </div>

      {/* ===== MONTHLY COLLECTION DASHBOARD ===== */}
      <div className="card" style={{ marginBottom: '20px', padding: '24px' }}>
        {/* Month Navigator */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <button className="btn btn-sm btn-secondary" onClick={() => navigateMonth(-1)} style={{ padding: '8px 12px' }}>
            <ChevronLeft size={18} />
          </button>
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700 }}>
              {getMonthName(selectedMonth)}
            </h3>
            {selectedMonth === currentMonth && (
              <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, background: '#eef2ff', padding: '2px 10px', borderRadius: '20px' }}>
                Current Month
              </span>
            )}
          </div>
          <button className="btn btn-sm btn-secondary" onClick={() => navigateMonth(1)} style={{ padding: '8px 12px' }}>
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Collection Progress Bar */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)', fontWeight: 500 }}>
              Collection Progress
            </span>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: collectionPercent === 100 ? 'var(--success)' : 'var(--primary)' }}>
              {collectionPercent}%
            </span>
          </div>
          <div style={{ background: 'var(--gray-100)', borderRadius: '10px', height: '12px', overflow: 'hidden' }}>
            <div style={{
              width: `${collectionPercent}%`,
              height: '100%',
              borderRadius: '10px',
              background: collectionPercent === 100
                ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                : collectionPercent >= 50
                  ? 'linear-gradient(90deg, var(--primary), #818cf8)'
                  : 'linear-gradient(90deg, #f59e0b, #f97316)',
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>

        {/* Monthly Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          <div style={{ textAlign: 'center', padding: '12px', background: 'var(--gray-50)', borderRadius: '10px' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary)' }}>
              {formatCurrency(monthlyCollected)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: '2px' }}>Collected</div>
          </div>
          <div style={{ textAlign: 'center', padding: '12px', background: 'var(--gray-50)', borderRadius: '10px' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--gray-600)' }}>
              {formatCurrency(monthlyExpected - monthlyCollected)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: '2px' }}>Remaining</div>
          </div>
          <div style={{ textAlign: 'center', padding: '12px', background: monthlyOverdue.length > 0 ? '#fef2f2' : 'var(--gray-50)', borderRadius: '10px' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: monthlyOverdue.length > 0 ? '#dc2626' : 'var(--gray-600)' }}>
              {monthlyOverdue.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: '2px' }}>Overdue</div>
          </div>
          <div style={{ textAlign: 'center', padding: '12px', background: 'var(--gray-50)', borderRadius: '10px' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f59e0b' }}>
              {monthlyPending.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: '2px' }}>Pending</div>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
          {monthlyPayments.length < tenants.length && (
            <button className="btn btn-sm btn-primary" onClick={generateThisMonth} style={{ fontSize: '0.85rem' }}>
              <CalendarPlus size={15} /> Generate Missing ({tenants.length - monthlyPayments.length})
            </button>
          )}
          {(monthlyPending.length > 0 || monthlyOverdue.length > 0) && (
            <button className="btn btn-sm btn-secondary" onClick={remindAllPending} style={{ fontSize: '0.85rem' }}>
              <Send size={15} /> Remind All ({monthlyPending.length + monthlyOverdue.length})
            </button>
          )}
          {selectedMonth !== currentMonth && (
            <button className="btn btn-sm btn-secondary" onClick={() => setSelectedMonth(currentMonth)} style={{ fontSize: '0.85rem' }}>
              Today
            </button>
          )}
        </div>
      </div>

      {/* ===== VIEW MODE TOGGLE + TENANT CARDS ===== */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--gray-600)' }}>
          {getMonthName(selectedMonth)} — Tenant Status
        </h3>
        <div style={{ display: 'flex', gap: '4px', background: 'var(--gray-100)', padding: '3px', borderRadius: '8px' }}>
          <button
            onClick={() => setViewMode('cards')}
            style={{
              padding: '6px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
              background: viewMode === 'cards' ? 'white' : 'transparent',
              color: viewMode === 'cards' ? 'var(--primary)' : 'var(--gray-400)',
              boxShadow: viewMode === 'cards' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              fontWeight: 600, fontSize: '0.8rem',
            }}>
            <LayoutGrid size={14} /> Cards
          </button>
          <button
            onClick={() => setViewMode('table')}
            style={{
              padding: '6px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
              background: viewMode === 'table' ? 'white' : 'transparent',
              color: viewMode === 'table' ? 'var(--primary)' : 'var(--gray-400)',
              boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              fontWeight: 600, fontSize: '0.8rem',
            }}>
            <List size={14} /> Table
          </button>
        </div>
      </div>

      {/* ===== TENANT PAYMENT CARDS ===== */}
      {viewMode === 'cards' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px', marginBottom: '24px' }}>
          {tenantCardsData.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-400)', gridColumn: '1 / -1' }}>
              <Users size={36} style={{ marginBottom: '10px', opacity: 0.5 }} />
              <p>No tenants yet. Add tenants to start tracking payments.</p>
            </div>
          ) : (
            tenantCardsData.map(({ tenant, property, payment }) => {
              const status = payment?.status || 'no-entry';
              const statusColors = {
                paid: { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a', badge: 'var(--success)' },
                pending: { bg: '#fffbeb', border: '#fde68a', text: '#d97706', badge: '#f59e0b' },
                overdue: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', badge: '#dc2626' },
                'no-entry': { bg: 'var(--gray-50)', border: 'var(--gray-200)', text: 'var(--gray-400)', badge: 'var(--gray-400)' },
              };
              const c = statusColors[status];
              return (
                <div key={tenant.id} style={{
                  background: c.bg,
                  border: `1.5px solid ${c.border}`,
                  borderRadius: '14px',
                  padding: '18px',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  cursor: 'default',
                }}>
                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--gray-800)' }}>
                        {tenant.name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: '2px' }}>
                        {(property?.name || property?.address)?.substring(0, 35) || 'No property'}
                      </div>
                    </div>
                    <span style={{
                      padding: '4px 12px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700,
                      color: 'white', background: c.badge, textTransform: 'uppercase', letterSpacing: '0.5px',
                    }}>
                      {status === 'no-entry' ? 'No Entry' : status}
                    </span>
                  </div>

                  {/* Amount */}
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: c.text, marginBottom: '12px' }}>
                    {formatCurrency(payment?.amount || tenant.rent || 0)}
                  </div>

                  {/* Extra Info */}
                  {payment?.paidDate && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: '8px' }}>
                      Paid on {payment.paidDate} {payment.method ? `via ${payment.method}` : ''}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {status === 'paid' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem', color: 'var(--success)', fontWeight: 600 }}>
                        <CheckCircle size={15} /> Collected
                        {payment?.screenshotUrl && (
                          <a href={payment.screenshotUrl} target="_blank" rel="noopener noreferrer" title="View proof" style={{ marginLeft: '4px' }}>
                            <Image size={14} style={{ color: 'var(--primary)', verticalAlign: 'middle' }} />
                          </a>
                        )}
                        {isSupabaseConfigured() && !payment?.screenshotUrl && (
                          <button className="btn btn-sm" onClick={() => {
                            setScreenshotUploadTarget(payment.id);
                            setTimeout(() => screenshotUploadRef.current?.click(), 0);
                          }}
                            style={{ marginLeft: '4px', fontSize: '0.78rem', background: '#dbeafe', color: '#2563eb', border: 'none', borderRadius: '8px', padding: '4px 8px', cursor: 'pointer' }}
                            title="Attach payment screenshot">
                            <Camera size={12} />
                          </button>
                        )}
                        <button className="btn btn-sm" onClick={() => setViewPayment(payment)}
                          style={{ marginLeft: '4px', fontSize: '0.78rem', background: '#e0e7ff', color: '#4f46e5', border: 'none', borderRadius: '8px', padding: '4px 8px', cursor: 'pointer' }}
                          title="View payment details">
                          <Eye size={12} />
                        </button>
                        <button className="btn btn-sm" onClick={() => openEditPayment(payment)}
                          style={{ marginLeft: '4px', fontSize: '0.78rem', background: 'var(--gray-100)', color: 'var(--gray-500)', border: 'none', borderRadius: '8px', padding: '4px 8px', cursor: 'pointer' }}
                          title="Edit payment details">
                          <Pencil size={12} />
                        </button>
                        <button className="btn btn-sm" onClick={() => setDeletingPayment(payment)}
                          style={{ fontSize: '0.78rem', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '8px', padding: '4px 8px', cursor: 'pointer' }}
                          title="Delete payment">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ) : status === 'no-entry' ? (
                      <button className="btn btn-sm btn-primary" onClick={async () => {
                        try {
                          await addPayment({
                            tenantId: tenant.id,
                            propertyId: tenant.propertyId || '',
                            amount: tenant.rent || 0,
                            month: selectedMonth,
                            status: 'pending',
                            paidDate: null,
                            method: '',
                            notes: '',
                          }, userId);
                          showToast(`Payment entry created for ${tenant.name}`);
                          refresh();
                        } catch (err) {
                          showToast(err.message || 'Failed to create', 'error');
                        }
                      }} style={{ fontSize: '0.82rem' }}>
                        <Plus size={14} /> Create Entry
                      </button>
                    ) : (
                      <>
                        <button className="btn btn-sm btn-success" onClick={() => openMarkPaidModal(payment)} style={{ fontSize: '0.82rem' }}>
                          <CheckCircle size={14} /> Mark Paid
                        </button>
                        <button className="btn btn-sm" onClick={() => quickMarkPaid(payment)}
                          style={{ fontSize: '0.82rem', background: '#dbeafe', color: '#2563eb', border: 'none', borderRadius: '8px', padding: '5px 10px', cursor: 'pointer', fontWeight: 600 }}
                          title="Quick: Mark paid via UPI today">
                          <Zap size={13} /> Quick Pay
                        </button>
                        <button className="btn btn-sm btn-secondary" onClick={() => sendReminder(payment)} style={{ fontSize: '0.82rem' }}>
                          <MessageCircle size={14} />
                        </button>
                        {isSupabaseConfigured() && !payment?.screenshotUrl && (
                          <button className="btn btn-sm" onClick={() => {
                            setScreenshotUploadTarget(payment.id);
                            setTimeout(() => screenshotUploadRef.current?.click(), 0);
                          }}
                            style={{ fontSize: '0.78rem', background: '#dbeafe', color: '#2563eb', border: 'none', borderRadius: '8px', padding: '5px 8px', cursor: 'pointer' }}
                            title="Attach payment screenshot">
                            <Camera size={13} />
                          </button>
                        )}
                        {payment?.screenshotUrl && (
                          <a href={payment.screenshotUrl} target="_blank" rel="noopener noreferrer" title="View proof">
                            <Image size={14} style={{ color: 'var(--primary)', verticalAlign: 'middle' }} />
                          </a>
                        )}
                        <button className="btn btn-sm" onClick={() => setViewPayment(payment)}
                          style={{ fontSize: '0.78rem', background: '#e0e7ff', color: '#4f46e5', border: 'none', borderRadius: '8px', padding: '5px 8px', cursor: 'pointer' }}
                          title="View payment details">
                          <Eye size={12} />
                        </button>
                        <button className="btn btn-sm" onClick={() => openEditPayment(payment)}
                          style={{ fontSize: '0.82rem', background: 'var(--gray-100)', color: 'var(--gray-500)', border: 'none', borderRadius: '8px', padding: '5px 8px', cursor: 'pointer' }}
                          title="Edit payment details">
                          <Pencil size={12} />
                        </button>
                        <button className="btn btn-sm" onClick={() => setDeletingPayment(payment)}
                          style={{ fontSize: '0.78rem', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '8px', padding: '5px 8px', cursor: 'pointer' }}
                          title="Delete payment">
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Hidden file input for quick screenshot upload from card */}
      <input
        type="file"
        ref={screenshotUploadRef}
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && screenshotUploadTarget) {
            handleQuickScreenshotUpload(file, screenshotUploadTarget);
          }
          e.target.value = '';
          setScreenshotUploadTarget(null);
        }}
      />

      {/* ===== DETAILED TABLE VIEW ===== */}
      {viewMode === 'table' && (
        <>
          <div className="filters-bar">
            <div className="search-input">
              <Search />
              <input placeholder="Search by tenant name or month..." value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} />
            </div>
            <div className="tab-buttons">
              {['all', 'paid', 'pending', 'overdue'].map(f => (
                <button key={f} className={`tab-btn ${filter === f ? 'active' : ''}`}
                  onClick={() => { setFilter(f); setCurrentPage(1); }}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Tenant</th>
                    <th>Property</th>
                    <th>Month</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Paid Date</th>
                    <th>Method</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-400)' }}>No payments found</td></tr>
                  ) : (
                    paginatedPayments.map(payment => {
                      const tenant = tenants.find(t => t.id === payment.tenantId);
                      const property = properties.find(p => p.id === payment.propertyId);
                      return (
                        <tr key={payment.id}>
                          <td style={{ fontWeight: 600 }}>{tenant?.name || 'Unknown'}</td>
                          <td style={{ fontSize: '0.85rem', maxWidth: '180px' }}>
                            {(property?.name || property?.address)?.substring(0, 30) || 'Unknown'}
                          </td>
                          <td>{payment.month}</td>
                          <td style={{ fontWeight: 700 }}>{formatCurrency(payment.amount)}</td>
                          <td>
                            <span className={`badge badge-${payment.status === 'paid' ? 'success' : payment.status === 'pending' ? 'warning' : 'danger'}`}>
                              {payment.status}
                            </span>
                          </td>
                          <td>{payment.paidDate || '—'}</td>
                          <td>
                            {payment.method || '—'}
                            {payment.screenshotUrl && (
                              <a href={payment.screenshotUrl} target="_blank" rel="noopener noreferrer" title="View payment proof" style={{ marginLeft: '6px' }}>
                                <Image size={14} style={{ color: 'var(--primary)', verticalAlign: 'middle' }} />
                              </a>
                            )}
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button className="btn btn-sm" onClick={() => setViewPayment(payment)}
                                style={{ background: '#e0e7ff', color: '#4f46e5', border: 'none', borderRadius: '8px', padding: '5px 8px', cursor: 'pointer' }}
                                title="View Details">
                                <Eye size={14} />
                              </button>
                              {payment.status !== 'paid' && (
                                <>
                                  <button className="btn btn-sm btn-success" onClick={() => openMarkPaidModal(payment)}
                                    title="Mark as Paid">
                                    <CheckCircle size={14} /> Paid
                                  </button>
                                  <button className="btn btn-sm btn-secondary" onClick={() => sendReminder(payment)}
                                    title="Send WhatsApp Reminder">
                                    <MessageCircle size={14} />
                                  </button>
                                </>
                              )}
                              {isSupabaseConfigured() && !payment.screenshotUrl && (
                                <button className="btn btn-sm btn-secondary" onClick={() => {
                                  setScreenshotUploadTarget(payment.id);
                                  setTimeout(() => screenshotUploadRef.current?.click(), 0);
                                }} title="Attach Screenshot">
                                  <Camera size={14} />
                                </button>
                              )}
                              <button className="btn btn-sm btn-secondary" onClick={() => openEditPayment(payment)}
                                title="Edit Payment">
                                <Pencil size={14} />
                              </button>
                              <button className="btn btn-sm" onClick={() => setDeletingPayment(payment)}
                                style={{ background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '8px', padding: '5px 8px', cursor: 'pointer' }}
                                title="Delete Payment">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              totalItems={filteredPayments.length}
              currentPage={currentPage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </>
      )}

      {/* Add/Edit Payment Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={resetPayForm}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingPayment ? 'Edit Payment' : 'Add Payment Record'}</h3>
              <button className="modal-close" onClick={resetPayForm}>✕</button>
            </div>
            <form onSubmit={handleAddPayment}>
              {!editingPayment && (
                <div className="form-group">
                  <label className="form-label">Tenant *</label>
                  <select className="form-select" value={payForm.tenantId}
                    onChange={e => handleTenantChange(e.target.value)}>
                    <option value="">Select tenant</option>
                    {tenants.map(t => {
                      const prop = properties.find(p => p.id === t.propertyId);
                      return <option key={t.id} value={t.id}>{t.name} — {(prop?.name || prop?.address)?.substring(0, 30) || 'No property'}</option>;
                    })}
                  </select>
                </div>
              )}
              {editingPayment && (
                <div style={{ padding: '12px', background: 'var(--gray-50)', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>
                  <strong>{tenants.find(t => t.id === payForm.tenantId)?.name}</strong> — {payForm.month} — {formatCurrency(payForm.amount)}
                </div>
              )}
              {!editingPayment && (
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Month *</label>
                    <input className="form-input" type="month" value={payForm.month}
                      onChange={e => setPayForm({ ...payForm, month: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Amount (₹) *</label>
                    <input className="form-input" type="number" value={payForm.amount}
                      onChange={e => setPayForm({ ...payForm, amount: e.target.value })}
                      placeholder="25000" />
                  </div>
                </div>
              )}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={payForm.status}
                    onChange={e => setPayForm({ ...payForm, status: e.target.value })}>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Method</label>
                  <select className="form-select" value={payForm.method}
                    onChange={e => setPayForm({ ...payForm, method: e.target.value })}>
                    <option value="">Select method</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Google Pay">Google Pay</option>
                    <option value="PhonePe">PhonePe</option>
                  </select>
                </div>
              </div>
              {!editingPayment && (
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <input className="form-input" value={payForm.notes}
                    onChange={e => setPayForm({ ...payForm, notes: e.target.value })}
                    placeholder="Optional notes..." />
                </div>
              )}
              {editingPayment && isSupabaseConfigured() && (
                <div className="form-group">
                  <FileUpload
                    label="Payment Screenshot (optional)"
                    accept="image/jpeg,image/png,image/webp"
                    maxSizeMB={5}
                    currentUrl={editingPayment.screenshotUrl || ''}
                    onUpload={async (file) => {
                      const { allowed, message: limitMsg } = checkLimit('attachmentsMB', 0);
                      if (!allowed) { setUpgradeMsg(limitMsg); return; }
                      // Always delete old screenshot from storage before uploading new one
                      await deleteAttachmentsForEntity(userId, 'payment', editingPayment.id);
                      const url = await uploadAttachment(file, userId, 'payment', editingPayment.id, 'screenshot');
                      await updatePayment(editingPayment.id, { screenshotUrl: url }, userId);
                      setEditingPayment(prev => ({ ...prev, screenshotUrl: url }));
                      showToast('Screenshot uploaded ✅');
                      refreshStorageUsage();
                    }}
                    onRemove={async () => {
                      // Delete screenshot from storage + attachments table
                      await deleteAttachmentsForEntity(userId, 'payment', editingPayment.id);
                      await updatePayment(editingPayment.id, { screenshotUrl: '', screenshot_url: '' }, userId);
                      setEditingPayment(prev => ({ ...prev, screenshotUrl: '' }));
                      showToast('Screenshot removed');
                      refreshStorageUsage();
                    }}
                  />
                </div>
              )}
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={resetPayForm}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? '⏳ Saving...' : editingPayment ? 'Update Payment' : <><Plus size={16} /> Add Payment</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Generate Modal (Multi-Month) */}
      {showBulkModal && (
        <div className="modal-overlay" onClick={() => setShowBulkModal(false)}>
          <div className="modal" style={{ maxWidth: '620px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Zap size={20} /> Bulk Generate Payments</h3>
              <button className="modal-close" onClick={() => setShowBulkModal(false)}>✕</button>
            </div>
            <div>
              <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem', marginBottom: '16px' }}>
                Create pending payment entries for multiple tenants across one or more months. Existing entries will be skipped automatically.
              </p>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">From Month</label>
                  <input className="form-input" type="month" value={bulkStartMonth}
                    onChange={e => handleBulkStartChange(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">To Month</label>
                  <input className="form-input" type="month" value={bulkEndMonth}
                    min={bulkStartMonth}
                    onChange={e => handleBulkEndChange(e.target.value)} />
                </div>
              </div>

              {bulkMonths.length > 1 && (
                <div style={{ padding: '8px 14px', background: '#eef2ff', borderRadius: '8px', marginBottom: '12px', fontSize: '0.85rem', color: 'var(--primary)' }}>
                  <CalendarPlus size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                  <strong>{bulkMonths.length} months</strong> selected: {getMonthName(bulkStartMonth)} → {getMonthName(bulkEndMonth)}
                </div>
              )}

              {getTenantsWithSomePayments().length > 0 && (
                <div style={{ padding: '10px 14px', background: '#fef3c7', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem', color: '#92400e' }}>
                  ⚠️ {getTenantsWithSomePayments().length} tenant(s) already have payments for all selected months:
                  <strong> {getTenantsWithSomePayments().map(t => t.name).join(', ')}</strong>
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label className="form-label" style={{ margin: 0 }}>Select Tenants ({bulkTenants.length} selected)</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" className="btn btn-sm btn-secondary" onClick={() => setBulkTenants(getTenantsEligible().map(t => t.id))}>
                      Select All
                    </button>
                    <button type="button" className="btn btn-sm btn-secondary" onClick={() => setBulkTenants([])}>
                      Clear
                    </button>
                  </div>
                </div>

                {getTenantsEligible().length === 0 && tenants.length > 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--gray-400)', background: 'var(--gray-50)', borderRadius: '8px' }}>
                    All tenants already have payment entries for every selected month ✅
                  </div>
                ) : tenants.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--gray-400)', background: 'var(--gray-50)', borderRadius: '8px' }}>
                    No tenants found. Add tenants first.
                  </div>
                ) : (
                  <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--gray-200)', borderRadius: '8px' }}>
                    {getTenantsEligible().map(tenant => {
                      const property = properties.find(p => p.id === tenant.propertyId);
                      const isChecked = bulkTenants.includes(tenant.id);
                      // Count how many months this tenant is missing
                      const missingMonths = bulkMonths.filter(m => !payments.some(p => p.tenantId === tenant.id && p.month === m)).length;
                      return (
                        <label key={tenant.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
                            borderBottom: '1px solid var(--gray-100)', cursor: 'pointer',
                            background: isChecked ? '#eef2ff' : 'transparent',
                            transition: 'background 0.15s',
                          }}>
                          <input type="checkbox" checked={isChecked} onChange={() => toggleBulkTenant(tenant.id)}
                            style={{ width: '18px', height: '18px' }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{tenant.name}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>
                              {(property?.name || property?.address)?.substring(0, 40) || 'No property'}
                              {bulkMonths.length > 1 && ` · ${missingMonths} month(s) to generate`}
                            </div>
                          </div>
                          <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.95rem' }}>
                            {formatCurrency(tenant.rent || 0)}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {bulkTenants.length > 0 && (
                <div style={{ padding: '12px 16px', background: '#eef2ff', borderRadius: '8px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span>Tenants × Months:</span>
                    <strong>{bulkTenants.length} × {bulkMonths.length}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginTop: '4px' }}>
                    <span>New entries to create:</span>
                    <strong>{getNewEntriesCount()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginTop: '4px' }}>
                    <span>Total expected rent:</span>
                    <strong style={{ color: 'var(--primary)' }}>
                      {formatCurrency(bulkTenants.reduce((sum, tid) => {
                        const t = tenants.find(t => t.id === tid);
                        const missingMonths = bulkMonths.filter(m => !payments.some(pay => pay.tenantId === tid && pay.month === m)).length;
                        return sum + ((Number(t?.rent) || 0) * missingMonths);
                      }, 0))}
                    </strong>
                  </div>
                </div>
              )}

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowBulkModal(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleBulkGenerate}
                  disabled={bulkTenants.length === 0 || bulkGenerating || getNewEntriesCount() === 0}>
                  <Zap size={16} /> {bulkGenerating ? 'Generating...' : `Generate ${getNewEntriesCount()} Payment(s)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mark as Paid Modal */}
      {markingPaid && (() => {
        const tenant = tenants.find(t => t.id === markingPaid.tenantId);
        const property = properties.find(p => p.id === markingPaid.propertyId);
        return (
          <div className="modal-overlay" onClick={() => setMarkingPaid(null)}>
            <div className="modal" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3><CheckCircle size={20} style={{ color: 'var(--success)' }} /> Mark Payment as Paid</h3>
                <button className="modal-close" onClick={() => setMarkingPaid(null)}>✕</button>
              </div>
              <div>
                <div style={{ padding: '12px 16px', background: 'var(--gray-50)', borderRadius: '10px', marginBottom: '16px' }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{tenant?.name || 'Unknown'}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
                    {(property?.name || property?.address)?.substring(0, 40) || 'Unknown'} · {markingPaid.month}
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
                    {formatCurrency(markingPaid.amount)}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Payment Method *</label>
                  <select className="form-select" value={markPaidForm.method}
                    onChange={e => setMarkPaidForm({ ...markPaidForm, method: e.target.value })}>
                    <option value="UPI">UPI</option>
                    <option value="Google Pay">Google Pay</option>
                    <option value="PhonePe">PhonePe</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                {isSupabaseConfigured() && (
                  <div className="form-group">
                    <FileUpload
                      label="Payment Screenshot (optional)"
                      accept="image/jpeg,image/png,image/webp"
                      maxSizeMB={3}
                      currentUrl={markPaidForm.screenshotUrl}
                      onUpload={async (file) => {
                        const { allowed, message: limitMsg } = checkLimit('attachmentsMB', 0);
                        if (!allowed) { setUpgradeMsg(limitMsg); return; }
                        const url = await uploadAttachment(file, userId, 'payment', markingPaid.id, 'screenshot');
                        setMarkPaidForm(prev => ({ ...prev, screenshotUrl: url }));
                        showToast('Screenshot uploaded ✅');
                        refreshStorageUsage();
                      }}
                      onRemove={() => {
                        setMarkPaidForm(prev => ({ ...prev, screenshotUrl: '' }));
                      }}
                    />
                  </div>
                )}

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setMarkingPaid(null)}>Cancel</button>
                  <button type="button" className="btn btn-success" onClick={confirmMarkPaid}>
                    <CheckCircle size={16} /> Confirm Payment
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Delete Payment Confirmation Modal */}
      {deletingPayment && (() => {
        const tenant = tenants.find(t => t.id === deletingPayment.tenantId);
        return (
          <div className="modal-overlay" onClick={() => setDeletingPayment(null)}>
            <div className="modal" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3 style={{ color: '#dc2626' }}><Trash2 size={20} /> Delete Payment</h3>
                <button className="modal-close" onClick={() => setDeletingPayment(null)}>✕</button>
              </div>
              <div>
                <div style={{ padding: '16px', background: '#fef2f2', borderRadius: '10px', marginBottom: '16px', border: '1px solid #fecaca' }}>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#991b1b' }}>
                    Are you sure you want to delete this payment record? This action cannot be undone.
                  </p>
                </div>
                <div style={{ padding: '12px 16px', background: 'var(--gray-50)', borderRadius: '10px', marginBottom: '16px' }}>
                  <div style={{ fontWeight: 700 }}>{tenant?.name || 'Unknown'}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginTop: '4px' }}>
                    {deletingPayment.month} · {formatCurrency(deletingPayment.amount)} · <span className={`badge badge-${deletingPayment.status === 'paid' ? 'success' : deletingPayment.status === 'pending' ? 'warning' : 'danger'}`}>{deletingPayment.status}</span>
                  </div>
                  {deletingPayment.screenshotUrl && (
                    <div style={{ fontSize: '0.8rem', color: '#d97706', marginTop: '6px' }}>
                      ⚠️ Associated screenshot will also be deleted
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setDeletingPayment(null)}>Cancel</button>
                  <button type="button" className="btn" onClick={() => handleDeletePayment(deletingPayment)}
                    style={{ background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', fontWeight: 600 }}>
                    <Trash2 size={14} /> Delete Payment
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* View Payment Detail Modal */}
      {viewPayment && (() => {
        const vTenant = tenants.find(t => t.id === viewPayment.tenantId);
        const vProperty = properties.find(p => p.id === viewPayment.propertyId);
        const monthLabel = viewPayment.month ? new Date(viewPayment.month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '—';
        const statusColor = viewPayment.status === 'paid' ? 'var(--success)' : viewPayment.status === 'pending' ? 'var(--warning)' : 'var(--danger)';
        const statusBg = viewPayment.status === 'paid' ? 'var(--success-bg)' : viewPayment.status === 'pending' ? 'var(--warning-bg)' : 'var(--danger-bg)';

        return (
          <div className="modal-overlay" onClick={() => setViewPayment(null)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
              <div className="modal-header">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Eye size={20} /> Payment Details
                </h3>
                <button className="modal-close" onClick={() => setViewPayment(null)}>✕</button>
              </div>

              {/* Amount hero */}
              <div style={{
                textAlign: 'center', padding: '24px 16px', margin: '0 0 20px',
                background: statusBg, borderRadius: '12px',
              }}>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: statusColor }}>
                  {formatCurrency(viewPayment.amount)}
                </div>
                <span className={`badge badge-${viewPayment.status === 'paid' ? 'success' : viewPayment.status === 'pending' ? 'warning' : 'danger'}`}
                  style={{ fontSize: '0.85rem', padding: '4px 14px', marginTop: '8px', display: 'inline-block', textTransform: 'capitalize' }}>
                  {viewPayment.status === 'paid' ? '✅ ' : viewPayment.status === 'overdue' ? '⚠️ ' : '⏳ '}{viewPayment.status}
                </span>
              </div>

              {/* Details grid */}
              <div style={{ display: 'grid', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'var(--gray-50)', borderRadius: '8px' }}>
                  <Users size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 600 }}>Tenant</div>
                    <div style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{vTenant?.name || 'Unknown'}</div>
                    {vTenant?.phone && <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{vTenant.phone}</div>}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'var(--gray-50)', borderRadius: '8px' }}>
                  <Building2 size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 600 }}>Property</div>
                    <div style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{vProperty?.name || vProperty?.address || 'Unknown'}</div>
                    {vProperty?.name && vProperty?.address && <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{vProperty.address}</div>}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'var(--gray-50)', borderRadius: '8px' }}>
                    <Calendar size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 600 }}>Month</div>
                      <div style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{monthLabel}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'var(--gray-50)', borderRadius: '8px' }}>
                    <CreditCard size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 600 }}>Method</div>
                      <div style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{viewPayment.method || '—'}</div>
                    </div>
                  </div>
                </div>

                {viewPayment.status === 'paid' && viewPayment.paidDate && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'var(--success-bg)', borderRadius: '8px' }}>
                    <Calendar size={16} style={{ color: 'var(--success)', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 600 }}>Paid On</div>
                      <div style={{ fontWeight: 600, color: 'var(--success)' }}>{viewPayment.paidDate}</div>
                    </div>
                  </div>
                )}

                {viewPayment.notes && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 14px', background: 'var(--gray-50)', borderRadius: '8px' }}>
                    <StickyNote size={16} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 600 }}>Notes</div>
                      <div style={{ color: 'var(--gray-700)', fontSize: '0.9rem' }}>{viewPayment.notes}</div>
                    </div>
                  </div>
                )}

                {viewPayment.screenshotUrl && (
                  <div style={{ padding: '10px 14px', background: 'var(--gray-50)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                      <ImageIcon size={16} style={{ color: 'var(--primary)' }} />
                      <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 600 }}>Payment Proof</span>
                    </div>
                    <a href={viewPayment.screenshotUrl} target="_blank" rel="noopener noreferrer">
                      <img src={viewPayment.screenshotUrl} alt="Payment proof"
                        style={{ width: '100%', maxHeight: '250px', objectFit: 'contain', borderRadius: '8px', border: '1px solid var(--gray-200)' }}
                      />
                    </a>
                  </div>
                )}
              </div>

              {/* Footer actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--gray-100)' }}>
                <button className="btn btn-secondary" onClick={() => setViewPayment(null)}>Close</button>
                {viewPayment.status !== 'paid' && (
                  <button className="btn btn-success" onClick={() => { setViewPayment(null); openMarkPaidModal(viewPayment); }}>
                    <CheckCircle size={14} /> Mark Paid
                  </button>
                )}
                <button className="btn btn-secondary" onClick={() => { setViewPayment(null); openEditPayment(viewPayment); }}>
                  <Pencil size={14} /> Edit
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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

function getMonthName(monthStr) {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-');
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[parseInt(month) - 1]} ${year}`;
}
