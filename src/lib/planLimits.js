// ============================================
// Plan Limits & Feature Gating for RentEasy
// ============================================

/**
 * Plan limits — only gate what actually costs money
 * DB rows (payments, maintenance, whatsapp) = free, no limits
 * Storage (attachments) = costs money, limit by MB
 * CPU (bulk generate, PDF) = costs compute, limit or gate
 */
export const PLAN_LIMITS = {
  free: {
    label: 'Free',
    properties: 2,
    tenants: 3,
    agreements: 3,        // per month
    receipts: 3,          // per month
    attachmentsMB: 0,     // no uploads on free
    bulkGenerate: false,
  },
  trial: {
    label: 'Trial (30 days)',
    properties: 5,
    tenants: 10,
    agreements: 10,
    receipts: 20,
    attachmentsMB: 50,
    bulkGenerate: true,
  },
  pro: {
    label: 'Pro',
    properties: 10,
    tenants: 25,
    agreements: 50,       // per month
    receipts: 50,         // per month
    attachmentsMB: 100,   // 100 MB
    bulkGenerate: true,
  },
  business: {
    label: 'Business',
    properties: 50,
    tenants: 100,
    agreements: 99999,    // unlimited
    receipts: 99999,      // unlimited
    attachmentsMB: 500,   // 500 MB
    bulkGenerate: true,
  },
};

/**
 * Get limits for a plan
 */
export function getPlanLimits(plan) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}

/**
 * Check if a feature limit has been reached
 * @param {string} plan - 'free', 'trial', 'pro', 'business'
 * @param {string} feature - key from PLAN_LIMITS (e.g. 'properties', 'tenants')
 * @param {number} currentCount - how many the user currently has
 * @returns {{ allowed: boolean, limit: number, remaining: number, message: string }}
 */
export function checkLimit(plan, feature, currentCount) {
  const limits = getPlanLimits(plan);
  const limit = limits[feature];

  if (limit === undefined) {
    // No restriction for this feature
    return { allowed: true, limit: 0, remaining: 0, message: '' };
  }

  // Boolean features (like bulkGenerate)
  if (typeof limit === 'boolean') {
    return {
      allowed: limit,
      limit: limit ? 1 : 0,
      remaining: limit ? 1 : 0,
      message: limit ? '' : `Bulk generate is available on Pro & Business plans.`,
    };
  }

  // Numeric limits
  const remaining = Math.max(0, limit - currentCount);
  const allowed = currentCount < limit;

  const featureLabels = {
    properties: 'properties',
    tenants: 'tenants',
    agreements: 'agreements this month',
    receipts: 'receipts this month',
    attachmentsMB: 'MB of storage',
  };

  const label = featureLabels[feature] || feature;
  const planLabel = limits.label;

  const message = allowed
    ? ''
    : `You've reached your ${planLabel} plan limit of ${formatLimit(limit)} ${label}. Upgrade to add more.`;

  return { allowed, limit, remaining, message };
}

/**
 * Format limit number for display
 */
export function formatLimit(limit) {
  if (limit >= 99999) return 'Unlimited';
  return limit.toLocaleString('en-IN');
}

/**
 * Get usage percentage for a feature
 */
export function getUsagePercent(currentCount, limit) {
  if (limit >= 99999) return 0;
  if (limit === 0) return 100;
  return Math.min(100, Math.round((currentCount / limit) * 100));
}

/**
 * Get the upgrade plan suggestion based on current plan
 */
export function getUpgradeSuggestion(currentPlan) {
  switch (currentPlan) {
    case 'free':
    case 'trial':
      return { plan: 'pro', label: 'Pro', price: '₹199/mo' };
    case 'pro':
      return { plan: 'business', label: 'Business', price: '₹499/mo' };
    default:
      return null;
  }
}
