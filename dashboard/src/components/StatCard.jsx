export default function StatCard({ title, value, icon: Icon, change, changeType = 'neutral' }) {
  const changeColor =
    changeType === 'up'
      ? 'var(--success)'
      : changeType === 'down'
        ? 'var(--danger)'
        : 'var(--text-muted)'

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>
          {title}
        </span>
        {Icon && (
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'rgba(88, 101, 242, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={18} color="var(--accent)" />
          </div>
        )}
      </div>
      <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{value}</div>
      {change && (
        <div style={{ fontSize: '0.8rem', color: changeColor }}>{change}</div>
      )}
    </div>
  )
}
