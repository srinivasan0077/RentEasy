/**
 * SkeletonLoader — Beautiful shimmer loading placeholders
 * Use these instead of blank/empty views while data loads from Supabase
 */

// Base skeleton block with shimmer animation
function Skeleton({ width, height = '16px', borderRadius = '8px', style = {} }) {
  return (
    <div
      className="skeleton-pulse"
      style={{
        width: width || '100%',
        height,
        borderRadius,
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-shimmer 1.5s ease-in-out infinite',
        ...style,
      }}
    />
  );
}

// Dashboard skeleton — stat cards + recent list
export function DashboardSkeleton() {
  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Skeleton width="200px" height="28px" style={{ marginBottom: '8px' }} />
        <Skeleton width="340px" height="16px" />
      </div>
      <div className="stats-grid">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="stat-card">
            <Skeleton width="44px" height="44px" borderRadius="12px" style={{ marginBottom: '12px' }} />
            <Skeleton width="60px" height="32px" style={{ marginBottom: '8px' }} />
            <Skeleton width="90px" height="14px" />
          </div>
        ))}
      </div>
      <div style={{ marginTop: '24px' }}>
        <Skeleton width="180px" height="22px" style={{ marginBottom: '16px' }} />
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            padding: '16px', background: 'var(--white)', borderRadius: 'var(--radius)',
            border: '1px solid var(--gray-100)', marginBottom: '8px',
          }}>
            <Skeleton width="40px" height="40px" borderRadius="50%" />
            <div style={{ flex: 1 }}>
              <Skeleton width="60%" height="14px" style={{ marginBottom: '6px' }} />
              <Skeleton width="40%" height="12px" />
            </div>
            <Skeleton width="80px" height="28px" borderRadius="14px" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Card list skeleton — for Properties, Tenants, Maintenance
export function CardListSkeleton({ cards = 4, showStats = false, statsCount = 3 }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <Skeleton width="180px" height="28px" style={{ marginBottom: '8px' }} />
          <Skeleton width="260px" height="16px" />
        </div>
        <Skeleton width="140px" height="40px" borderRadius="10px" />
      </div>
      {showStats && (
        <div className="stats-grid" style={{ gridTemplateColumns: `repeat(${statsCount}, 1fr)`, marginBottom: '20px' }}>
          {Array.from({ length: statsCount }).map((_, i) => (
            <div key={i} className="stat-card">
              <Skeleton width="44px" height="44px" borderRadius="12px" style={{ marginBottom: '12px' }} />
              <Skeleton width="48px" height="28px" style={{ marginBottom: '6px' }} />
              <Skeleton width="80px" height="14px" />
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'grid', gap: '12px' }}>
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} style={{
            background: 'var(--white)', border: '1px solid var(--gray-200)',
            borderRadius: 'var(--radius)', padding: '20px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ flex: 1 }}>
                <Skeleton width="55%" height="18px" style={{ marginBottom: '8px' }} />
                <Skeleton width="75%" height="14px" />
              </div>
              <Skeleton width="70px" height="26px" borderRadius="14px" />
            </div>
            <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
              <Skeleton width="120px" height="12px" />
              <Skeleton width="100px" height="12px" />
              <Skeleton width="90px" height="12px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Table skeleton — for Payments
export function TableSkeleton({ rows = 5 }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <Skeleton width="200px" height="28px" style={{ marginBottom: '8px' }} />
          <Skeleton width="300px" height="16px" />
        </div>
        <Skeleton width="140px" height="40px" borderRadius="10px" />
      </div>
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '20px' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="stat-card">
            <Skeleton width="44px" height="44px" borderRadius="12px" style={{ marginBottom: '12px' }} />
            <Skeleton width="70px" height="28px" style={{ marginBottom: '6px' }} />
            <Skeleton width="90px" height="14px" />
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gap: '8px' }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            padding: '16px 20px', background: 'var(--white)',
            borderRadius: 'var(--radius)', border: '1px solid var(--gray-100)',
          }}>
            <Skeleton width="32px" height="32px" borderRadius="50%" />
            <Skeleton width="18%" height="14px" />
            <Skeleton width="15%" height="14px" />
            <Skeleton width="12%" height="14px" />
            <Skeleton width="80px" height="26px" borderRadius="14px" />
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <Skeleton width="32px" height="32px" borderRadius="8px" />
              <Skeleton width="32px" height="32px" borderRadius="8px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Form page skeleton — for Agreements, Receipts
export function FormSkeleton() {
  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Skeleton width="220px" height="28px" style={{ marginBottom: '8px' }} />
        <Skeleton width="340px" height="16px" />
      </div>
      <div className="card" style={{ padding: '24px' }}>
        <Skeleton width="160px" height="20px" style={{ marginBottom: '20px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i}>
              <Skeleton width="100px" height="14px" style={{ marginBottom: '8px' }} />
              <Skeleton height="40px" borderRadius="10px" />
            </div>
          ))}
        </div>
        <Skeleton width="160px" height="44px" borderRadius="10px" style={{ marginTop: '12px' }} />
      </div>
    </div>
  );
}

export default Skeleton;
