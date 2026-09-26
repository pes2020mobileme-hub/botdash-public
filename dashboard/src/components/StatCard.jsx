export default function StatCard({ title, value, icon: Icon, change, changeType = 'neutral' }) {
  return (
    <div className="card card-hover stat-card">
      <div className="stat-head">
        <span className="stat-label">{title}</span>
        {Icon && (
          <div className="stat-icon">
            <Icon size={17} color="var(--g2)" />
          </div>
        )}
      </div>
      <div className="stat-value">{value}</div>
      {change && <div className={`stat-change ${changeType}`}>{change}</div>}
    </div>
  )
}
