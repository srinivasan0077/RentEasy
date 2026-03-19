// ============================================
// Hybrid Data Store for RentEasy
// Uses Supabase when configured, localStorage as fallback
// ============================================
import { supabase, isSupabaseConfigured } from './lib/supabase';

// ========================
// LOCAL STORAGE HELPERS
// ========================
const STORAGE_KEYS = {
  PROPERTIES: 'renteasy_properties',
  TENANTS: 'renteasy_tenants',
  PAYMENTS: 'renteasy_payments',
  AGREEMENTS: 'renteasy_agreements',
  MAINTENANCE: 'renteasy_maintenance',
  RECEIPTS: 'renteasy_receipts',
  LANDLORD_PROFILE: 'renteasy_landlord_profile',
};

function getLocal(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
}
function setLocal(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
function generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 9); }

// ========================
// PROPERTIES
// ========================
export async function getProperties(userId) {
  if (isSupabaseConfigured() && userId) {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (!error) return data.map(p => ({
      ...p,
      createdAt: p.created_at,
    }));
  }
  return getLocal(STORAGE_KEYS.PROPERTIES);
}

export async function addProperty(property, userId) {
  if (isSupabaseConfigured() && userId) {
    const payload = {
      user_id: userId,
      name: property.name || '',
      address: property.address,
      city: property.city || '',
      state: property.state || '',
      pincode: property.pincode || '',
      type: property.type || '1BHK',
      rent: Number(property.rent) || 0,
      deposit: Number(property.deposit) || 0,
      area: Number(property.area) || 0,
    };
    const { data, error } = await supabase
      .from('properties')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const props = getLocal(STORAGE_KEYS.PROPERTIES);
  const newProp = { ...property, id: generateId(), createdAt: new Date().toISOString() };
  props.push(newProp);
  setLocal(STORAGE_KEYS.PROPERTIES, props);
  return newProp;
}

export async function updateProperty(id, updates, userId) {
  if (isSupabaseConfigured() && userId) {
    const { error } = await supabase.from('properties').update(updates).eq('id', id).eq('user_id', userId);
    if (error) throw error;
    return;
  }
  setLocal(STORAGE_KEYS.PROPERTIES, getLocal(STORAGE_KEYS.PROPERTIES).map(p => p.id === id ? { ...p, ...updates } : p));
}

export async function deleteProperty(id, userId) {
  if (isSupabaseConfigured() && userId) {
    // Disassociate tenants — set their property_id to NULL (keeps tenant data intact)
    await supabase.from('tenants').update({ property_id: null }).eq('property_id', id).eq('user_id', userId);
    // Hard delete the property (FKs are SET NULL so payments/agreements/etc. are preserved)
    const { error } = await supabase.from('properties').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
    return;
  }
  setLocal(STORAGE_KEYS.PROPERTIES, getLocal(STORAGE_KEYS.PROPERTIES).filter(p => p.id !== id));
}

// ========================
// TENANTS
// ========================
export async function getTenants(userId) {
  if (isSupabaseConfigured() && userId) {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (!error) return data.map(t => ({
      ...t,
      propertyId: t.property_id,
      unitNumber: t.unit_number || '',
      rent: Number(t.rent) || 0,
      moveInDate: t.move_in_date,
      leaseEnd: t.lease_end,
      emergencyName: t.emergency_name,
      emergencyContact: t.emergency_contact,
      aadhaarUrl: t.aadhaar_url || '',
      panUrl: t.pan_url || '',
      createdAt: t.created_at,
    }));
  }
  return getLocal(STORAGE_KEYS.TENANTS);
}

export async function addTenant(tenant, userId) {
  if (isSupabaseConfigured() && userId) {
    const payload = {
      user_id: userId,
      property_id: tenant.propertyId || tenant.property_id,
      unit_number: tenant.unitNumber || tenant.unit_number || '',
      rent: Number(tenant.rent) || 0,
      name: tenant.name,
      phone: tenant.phone,
      email: tenant.email || '',
      aadhaar: tenant.aadhaar || '',
      pan: tenant.pan || '',
      move_in_date: tenant.moveInDate || tenant.move_in_date || null,
      lease_end: tenant.leaseEnd || tenant.lease_end || null,
      emergency_name: tenant.emergencyName || tenant.emergency_name || '',
      emergency_contact: tenant.emergencyContact || tenant.emergency_contact || '',
    };
    const { data, error } = await supabase.from('tenants').insert(payload).select().single();
    if (!error) return data;
    throw error;
  }
  const tenants = getLocal(STORAGE_KEYS.TENANTS);
  const newTenant = { ...tenant, id: generateId(), createdAt: new Date().toISOString() };
  tenants.push(newTenant);
  setLocal(STORAGE_KEYS.TENANTS, tenants);
  return newTenant;
}

export async function updateTenant(id, updates, userId) {
  if (isSupabaseConfigured() && userId) {
    const { error } = await supabase.from('tenants').update(updates).eq('id', id).eq('user_id', userId);
    if (error) throw error;
    return;
  }
  setLocal(STORAGE_KEYS.TENANTS, getLocal(STORAGE_KEYS.TENANTS).map(t => t.id === id ? { ...t, ...updates } : t));
}

export async function deleteTenant(id, userId) {
  // Clean up any attachments (Aadhaar, PAN docs) linked to this tenant
  await deleteAttachmentsForEntity(userId, 'tenant', id);
  if (isSupabaseConfigured() && userId) {
    const { error } = await supabase.from('tenants').update({ is_active: false }).eq('id', id).eq('user_id', userId);
    if (error) throw error;
    return;
  }
  setLocal(STORAGE_KEYS.TENANTS, getLocal(STORAGE_KEYS.TENANTS).filter(t => t.id !== id));
}

// ========================
// PAYMENTS
// ========================
export async function getPayments(userId) {
  if (isSupabaseConfigured() && userId) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .order('month', { ascending: false });
    if (!error) return data.map(p => ({
      ...p,
      tenantId: p.tenant_id,
      propertyId: p.property_id,
      paidDate: p.paid_date,
      screenshotUrl: p.screenshot_url || '',
      createdAt: p.created_at,
    }));
  }
  return getLocal(STORAGE_KEYS.PAYMENTS);
}

export async function addPayment(payment, userId) {
  if (isSupabaseConfigured() && userId) {
    const payload = {
      user_id: userId,
      tenant_id: payment.tenantId || payment.tenant_id,
      property_id: payment.propertyId || payment.property_id,
      amount: Number(payment.amount) || 0,
      month: payment.month,
      status: payment.status || 'pending',
      paid_date: payment.paidDate || payment.paid_date || null,
      method: payment.method || '',
      notes: payment.notes || '',
    };
    const { data, error } = await supabase.from('payments').insert(payload).select().single();
    if (!error) return data;
    throw error;
  }
  const payments = getLocal(STORAGE_KEYS.PAYMENTS);
  const newPayment = { ...payment, id: generateId(), createdAt: new Date().toISOString() };
  payments.push(newPayment);
  setLocal(STORAGE_KEYS.PAYMENTS, payments);
  return newPayment;
}

export async function updatePayment(id, updates, userId) {
  if (isSupabaseConfigured() && userId) {
    const dbUpdates = {};
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.paidDate !== undefined) dbUpdates.paid_date = updates.paidDate;
    if (updates.paid_date !== undefined) dbUpdates.paid_date = updates.paid_date;
    if (updates.method !== undefined) dbUpdates.method = updates.method;
    if (updates.screenshot_url !== undefined) dbUpdates.screenshot_url = updates.screenshot_url;
    if (updates.screenshotUrl !== undefined) dbUpdates.screenshot_url = updates.screenshotUrl;
    const { error } = await supabase.from('payments').update(dbUpdates).eq('id', id).eq('user_id', userId);
    if (error) throw error;
    return;
  }
  setLocal(STORAGE_KEYS.PAYMENTS, getLocal(STORAGE_KEYS.PAYMENTS).map(p => p.id === id ? { ...p, ...updates } : p));
}

export async function deletePayment(id, userId) {
  // Clean up any attachments (screenshots) linked to this payment
  await deleteAttachmentsForEntity(userId, 'payment', id);
  if (isSupabaseConfigured() && userId) {
    const { error } = await supabase.from('payments').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
    return;
  }
  setLocal(STORAGE_KEYS.PAYMENTS, getLocal(STORAGE_KEYS.PAYMENTS).filter(p => p.id !== id));
}

// ========================
// AGREEMENTS
// ========================
export async function getAgreements(userId) {
  if (isSupabaseConfigured() && userId) {
    const { data, error } = await supabase
      .from('agreements')
      .select('*, tenants(name), properties(address)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (!error) return data.map(a => ({
      ...a,
      tenantName: a.tenants?.name || '',
      propertyAddress: a.properties?.address || '',
      rentAmount: a.rent_amount,
      startDate: a.start_date,
      endDate: a.end_date,
      createdAt: a.created_at,
    }));
  }
  return getLocal(STORAGE_KEYS.AGREEMENTS);
}

export async function addAgreement(agreement, userId) {
  if (isSupabaseConfigured() && userId) {
    const payload = {
      user_id: userId,
      tenant_id: agreement.tenantId || agreement.tenant_id,
      property_id: agreement.propertyId || agreement.property_id,
      owner_name: agreement.ownerName || agreement.owner_name,
      owner_address: agreement.ownerAddress || agreement.owner_address || '',
      start_date: agreement.startDate || agreement.start_date,
      end_date: agreement.endDate || agreement.end_date,
      rent_amount: Number(agreement.rentAmount || agreement.rent_amount) || 0,
      deposit: Number(agreement.deposit) || 0,
      maintenance_charges: Number(agreement.maintenanceCharges || agreement.maintenance_charges) || 0,
      notice_period: Number(agreement.noticePeriod || agreement.notice_period) || 1,
      escalation: Number(agreement.escalation) || 5,
    };
    const { data, error } = await supabase.from('agreements').insert(payload).select().single();
    if (!error) return data;
    throw error;
  }
  const agreements = getLocal(STORAGE_KEYS.AGREEMENTS);
  const newAgreement = { ...agreement, id: generateId(), createdAt: new Date().toISOString() };
  agreements.push(newAgreement);
  setLocal(STORAGE_KEYS.AGREEMENTS, agreements);
  return newAgreement;
}

// ========================
// MAINTENANCE
// ========================
export async function getMaintenanceRequests(userId) {
  if (isSupabaseConfigured() && userId) {
    const { data, error } = await supabase
      .from('maintenance_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (!error) return data.map(r => ({
      ...r,
      propertyId: r.property_id,
      tenantId: r.tenant_id,
      photoUrl: r.photo_url || '',
      createdAt: r.created_at,
    }));
  }
  return getLocal(STORAGE_KEYS.MAINTENANCE);
}

export async function addMaintenanceRequest(request, userId) {
  if (isSupabaseConfigured() && userId) {
    const payload = {
      user_id: userId,
      property_id: request.propertyId || request.property_id,
      tenant_id: request.tenantId || request.tenant_id || null,
      title: request.title,
      description: request.description || '',
      priority: request.priority || 'medium',
      status: 'open',
    };
    const { data, error } = await supabase.from('maintenance_requests').insert(payload).select().single();
    if (!error) return data;
    throw error;
  }
  const requests = getLocal(STORAGE_KEYS.MAINTENANCE);
  const newRequest = { ...request, id: generateId(), createdAt: new Date().toISOString(), status: 'open' };
  requests.push(newRequest);
  setLocal(STORAGE_KEYS.MAINTENANCE, requests);
  return newRequest;
}

export async function updateMaintenanceRequest(id, updates, userId) {
  if (isSupabaseConfigured() && userId) {
    const dbUpdates = { ...updates };
    if (updates.status === 'resolved') dbUpdates.resolved_at = new Date().toISOString();
    const { error } = await supabase.from('maintenance_requests').update(dbUpdates).eq('id', id).eq('user_id', userId);
    if (error) throw error;
    return;
  }
  setLocal(STORAGE_KEYS.MAINTENANCE, getLocal(STORAGE_KEYS.MAINTENANCE).map(r => r.id === id ? { ...r, ...updates } : r));
}

export async function deleteMaintenanceRequest(id, userId) {
  // Clean up any attachments (photos) linked to this request
  await deleteAttachmentsForEntity(userId, 'maintenance', id);
  if (isSupabaseConfigured() && userId) {
    const { error } = await supabase.from('maintenance_requests').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
    return;
  }
  setLocal(STORAGE_KEYS.MAINTENANCE, getLocal(STORAGE_KEYS.MAINTENANCE).filter(r => r.id !== id));
}

// ========================
// RECEIPTS
// ========================
export async function getReceipts(userId) {
  if (isSupabaseConfigured() && userId) {
    const { data, error } = await supabase
      .from('receipts')
      .select('*, tenants(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (!error) return data.map(r => ({
      ...r,
      tenantId: r.tenant_id,
      propertyId: r.property_id,
      receiptNo: r.receipt_no,
      createdAt: r.created_at,
    }));
  }
  return getLocal(STORAGE_KEYS.RECEIPTS);
}

export async function addReceipt(receipt, userId) {
  if (isSupabaseConfigured() && userId) {
    const payload = {
      user_id: userId,
      tenant_id: receipt.tenantId || receipt.tenant_id,
      property_id: receipt.propertyId || receipt.property_id,
      payment_id: receipt.paymentId || receipt.payment_id || null,
      receipt_no: receipt.receiptNo || receipt.receipt_no,
      month: receipt.month,
      amount: Number(receipt.amount) || 0,
    };
    const { data, error } = await supabase.from('receipts').insert(payload).select().single();
    if (!error) return data;
    throw error;
  }
  const receipts = getLocal(STORAGE_KEYS.RECEIPTS);
  const newReceipt = { ...receipt, id: generateId(), createdAt: new Date().toISOString() };
  receipts.push(newReceipt);
  setLocal(STORAGE_KEYS.RECEIPTS, receipts);
  return newReceipt;
}

// ========================
// ATTACHMENTS (File uploads via Supabase Storage)
// ========================
const ATTACHMENT_BUCKET = 'renteasy-attachments';

/**
 * Upload a file to Supabase Storage
 * @param {File} file - The file to upload
 * @param {string} userId - The user's ID
 * @param {string} entityType - 'tenant', 'payment', 'maintenance'
 * @param {string} entityId - The ID of the entity
 * @param {string} fileType - 'aadhaar', 'pan', 'screenshot', 'photo', 'other'
 * @returns {string} Public URL of the uploaded file
 */
export async function uploadAttachment(file, userId, entityType, entityId, fileType = 'other') {
  if (!isSupabaseConfigured() || !userId) {
    throw new Error('File uploads require Supabase to be configured.');
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const fileName = `${entityType}/${entityId}/${fileType}_${Date.now()}.${ext}`;
  const filePath = `${userId}/${fileName}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  // Try public URL first, fall back to signed URL
  const storagePath = data.path;
  let publicUrl = '';

  // Try getPublicUrl (works if bucket is public)
  const { data: urlData } = supabase.storage
    .from(ATTACHMENT_BUCKET)
    .getPublicUrl(storagePath);
  
  if (urlData?.publicUrl) {
    publicUrl = urlData.publicUrl;
  } else {
    // Fallback: generate signed URL for private bucket (valid 1 year)
    const { data: signedData } = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365);
    publicUrl = signedData?.signedUrl || storagePath;
  }

  // Store in attachments table (server-side trigger enforces storage limit)
  const { error: attachError } = await supabase.from('attachments').insert({
    user_id: userId,
    entity_type: entityType,
    entity_id: entityId,
    file_name: file.name,
    file_type: fileType,
    file_url: publicUrl,
    file_size: file.size,
    mime_type: file.type,
  });

  if (attachError) {
    // Clean up the uploaded file since the DB record failed
    await supabase.storage.from(ATTACHMENT_BUCKET).remove([filePath]);
    
    // Check if it's a storage limit error from our DB trigger
    if (attachError.message?.includes('STORAGE_LIMIT')) {
      const friendlyMsg = attachError.message.replace('STORAGE_LIMIT: ', '');
      throw new Error(friendlyMsg);
    }
    throw new Error(`Upload failed: ${attachError.message}`);
  }

  return publicUrl;
}

/**
 * Get total storage usage in MB for a user
 * Uses server-side RPC function (tamper-proof) with client-side fallback
 */
export async function getStorageUsageMB(userId) {
  if (!isSupabaseConfigured() || !userId) return 0;
  try {
    // Try server-side RPC first (tamper-proof)
    const { data, error } = await supabase.rpc('get_storage_usage', { user_uuid: userId });
    if (!error && data) {
      return data.used_mb || 0;
    }
    // Fallback: client-side calculation
    const { data: attachments, error: fetchErr } = await supabase
      .from('attachments')
      .select('file_size')
      .eq('user_id', userId);
    if (fetchErr || !attachments) return 0;
    const totalBytes = attachments.reduce((sum, a) => sum + (Number(a.file_size) || 0), 0);
    return Math.round((totalBytes / (1024 * 1024)) * 100) / 100;
  } catch {
    return 0;
  }
}

/**
 * Get all attachments for an entity
 */
export async function getAttachments(userId, entityType, entityId) {
  if (!isSupabaseConfigured() || !userId) return [];

  const { data, error } = await supabase
    .from('attachments')
    .select('*')
    .eq('user_id', userId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Failed to fetch attachments:', error.message);
    return [];
  }
  return data.map(a => ({
    ...a,
    fileUrl: a.file_url,
    fileName: a.file_name,
    fileType: a.file_type,
    fileSize: a.file_size,
    mimeType: a.mime_type,
    createdAt: a.created_at,
  }));
}

/**
 * Delete attachments for an entity. If label is provided, only delete that specific attachment.
 * e.g. deleteAttachmentsForEntity(userId, 'tenant', id, 'aadhaar') — only deletes Aadhaar
 * e.g. deleteAttachmentsForEntity(userId, 'tenant', id) — deletes ALL attachments for that tenant
 */
export async function deleteAttachmentsForEntity(userId, entityType, entityId, label) {
  if (!isSupabaseConfigured() || !userId) return;
  try {
    // Get attachments for this entity (optionally filtered by label)
    let query = supabase
      .from('attachments')
      .select('id, file_url')
      .eq('user_id', userId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId);

    if (label) {
      query = query.eq('file_type', label);
    }

    const { data: attachments } = await query;

    if (!attachments || attachments.length === 0) return;

    // Remove files from storage
    const storagePaths = attachments
      .filter(a => a.file_url)
      .map(a => {
        const parts = a.file_url.split(`${ATTACHMENT_BUCKET}/`);
        return parts[1] || null;
      })
      .filter(Boolean);

    if (storagePaths.length > 0) {
      await supabase.storage.from(ATTACHMENT_BUCKET).remove(storagePaths);
    }

    // Delete DB records
    let deleteQuery = supabase
      .from('attachments')
      .delete()
      .eq('user_id', userId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId);

    if (label) {
      deleteQuery = deleteQuery.eq('file_type', label);
    }

    const { error } = await deleteQuery;

    if (error) console.warn('Failed to delete entity attachments:', error.message);
  } catch (err) {
    console.warn('deleteAttachmentsForEntity error:', err);
  }
}

/**
 * Delete an attachment
 */
export async function deleteAttachment(attachmentId, userId) {
  if (!isSupabaseConfigured() || !userId) return;

  // Get the attachment to find the storage path
  const { data: att } = await supabase
    .from('attachments')
    .select('file_url')
    .eq('id', attachmentId)
    .eq('user_id', userId)
    .single();

  if (att?.file_url) {
    // Extract storage path from URL
    const urlParts = att.file_url.split(`${ATTACHMENT_BUCKET}/`);
    if (urlParts[1]) {
      await supabase.storage.from(ATTACHMENT_BUCKET).remove([urlParts[1]]);
    }
  }

  const { error } = await supabase
    .from('attachments')
    .delete()
    .eq('id', attachmentId)
    .eq('user_id', userId);

  if (error) throw error;
}

// ========================
// DEMO DATA (localStorage only)
// ========================
function formatDemoDate(monthsOffset) {
  const d = new Date();
  d.setMonth(d.getMonth() + monthsOffset);
  d.setDate(1);
  return d.toISOString().split('T')[0];
}

export function loadDemoData() {
  if (getLocal(STORAGE_KEYS.PROPERTIES).length > 0) return;

  const prop1Id = generateId();
  const prop2Id = generateId();
  const tenant1Id = generateId();
  const tenant2Id = generateId();
  const now = new Date().toISOString();

  const props = [
    { id: prop1Id, name: 'Sunrise Apartments', address: '302, Sunrise Apartments, Koramangala', city: 'Bangalore', state: 'Karnataka', pincode: '560034', type: '2BHK', rent: 25000, deposit: 100000, area: 1100, createdAt: now },
    { id: prop2Id, name: 'Green Valley', address: '15, Green Valley Society, Andheri West', city: 'Mumbai', state: 'Maharashtra', pincode: '400058', type: '1BHK', rent: 18000, deposit: 72000, area: 650, createdAt: now },
  ];
  setLocal(STORAGE_KEYS.PROPERTIES, props);

  const tenants = [
    { id: tenant1Id, name: 'Rahul Sharma', phone: '9876543210', email: 'rahul.sharma@email.com', aadhaar: '1234-5678-9012', pan: 'ABCDE1234F', propertyId: prop1Id, rent: 25000, moveInDate: formatDemoDate(-9), leaseEnd: formatDemoDate(3), emergencyContact: '9876543211', emergencyName: 'Priya Sharma', createdAt: now },
    { id: tenant2Id, name: 'Anita Desai', phone: '9988776655', email: 'anita.desai@email.com', aadhaar: '9876-5432-1098', pan: 'FGHIJ5678K', propertyId: prop2Id, rent: 18000, moveInDate: formatDemoDate(-6), leaseEnd: formatDemoDate(6), emergencyContact: '9988776656', emergencyName: 'Vikram Desai', createdAt: now },
  ];
  setLocal(STORAGE_KEYS.TENANTS, tenants);

  const payments = [];
  // Generate 5 past months of payment history + current month
  const today = new Date();
  for (let i = 5; i >= 1; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    payments.push({ id: generateId(), tenantId: tenant1Id, propertyId: prop1Id, amount: 25000, month, status: 'paid', paidDate: `${month}-05`, method: 'UPI', createdAt: now });
    // Make the most recent past month pending for tenant2
    const isPrevMonth = i === 1;
    payments.push({ id: generateId(), tenantId: tenant2Id, propertyId: prop2Id, amount: 18000, month, status: isPrevMonth ? 'pending' : 'paid', paidDate: isPrevMonth ? null : `${month}-03`, method: 'Bank Transfer', createdAt: now });
  }
  // Current month — both pending (auto-overdue logic will handle status)
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  payments.push({ id: generateId(), tenantId: tenant1Id, propertyId: prop1Id, amount: 25000, month: currentMonth, status: 'pending', paidDate: null, method: '', createdAt: now });
  payments.push({ id: generateId(), tenantId: tenant2Id, propertyId: prop2Id, amount: 18000, month: currentMonth, status: 'pending', paidDate: null, method: '', createdAt: now });
  setLocal(STORAGE_KEYS.PAYMENTS, payments);

  const maintenance = [
    { id: generateId(), propertyId: prop1Id, tenantId: tenant1Id, title: 'Leaking kitchen tap', description: 'The kitchen tap has been dripping continuously for 2 days.', priority: 'medium', status: 'open', createdAt: now },
    { id: generateId(), propertyId: prop2Id, tenantId: tenant2Id, title: 'AC not cooling properly', description: 'The bedroom AC is running but not cooling. Might need gas refill.', priority: 'high', status: 'in-progress', createdAt: now },
  ];
  setLocal(STORAGE_KEYS.MAINTENANCE, maintenance);
}

// ========================
// LANDLORD PROFILE
// ========================
export function getLandlordProfile(userId) {
  try {
    const key = userId ? `${STORAGE_KEYS.LANDLORD_PROFILE}_${userId}` : STORAGE_KEYS.LANDLORD_PROFILE;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch { return null; }
}

export function saveLandlordProfile(profile, userId) {
  const key = userId ? `${STORAGE_KEYS.LANDLORD_PROFILE}_${userId}` : STORAGE_KEYS.LANDLORD_PROFILE;
  localStorage.setItem(key, JSON.stringify({
    name: profile.name || '',
    phone: profile.phone || '',
    pan: profile.pan || '',
    aadhaar: profile.aadhaar || '',
    address: profile.address || '',
    rentDueDay: Number(profile.rentDueDay) || 5,
    updatedAt: new Date().toISOString(),
  }));
}

export function getRentDueDay(userId) {
  const profile = getLandlordProfile(userId);
  return profile?.rentDueDay || 5;
}
