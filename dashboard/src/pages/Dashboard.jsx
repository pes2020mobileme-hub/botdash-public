import { Server, Users, Hash, Activity } from 'lucide-react'
import StatCard from '../components/StatCard'
import ErrorState from '../components/ErrorState'
import { api, formatUptime } from '../lib/api'
import { useApi } from '../lib/useApi'

export default function Dashboard() {
  const stats = useApi(() => api.stats(), [], 15000)
  const health = useApi(() => api.health(), [], 15000)

  if (stats.error) return <ErrorState error={stats.error} onRetry={stats.reload} />

  const s = stats.data
  const cards = [
    {
      title: 'Total Servers',
      value: s ? s.servers.toLocaleString() : '—',
      icon: Server,
      change: health.data?.bot ?? 'กำลังโหลด...',
      changeType: 'neutral',
    },
    {
      title: 'Total Members',
      value: s ? s.members.toLocaleString() : '—',
      icon: Users,
      change: s ? `${s.channels.toLocaleString()} channels` : '',
      changeType: 'neutral',
    },
    {
      title: 'WebSocket Ping',
      value: s?.ping != null ? `${s.ping}ms` : '—',
      icon: Activity,
      change: s ? 'Gateway heartbeat' : '',
      changeType: 'neutral',
    },
    {
      title: 'Uptime',
      value: s ? formatUptime(s.uptime) : '—',
      icon: Activity,
      change: 'Since process start',
      changeType: 'neutral',
    },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Overview of your Discord bot performance</p>
        </div>
      </div>

      <div className="stat-grid">
        {cards.map((c) => (
          <StatCard key={c.title} {...c} />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className="card">
          <h3 style={{ marginBottom: 16, fontSize: '1.1rem' }}>Bot Status</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {health.loading && <div style={{ color: 'var(--text-muted)' }}>กำลังโหลด...</div>}
            {health.data && (
              <>
                {[
                  ['Bot', health.data.bot],
                  ['Online', health.data.ready ? 'พร้อมใช้งาน' : 'กำลังรอเชื่อมต่อ'],
                  ['Servers', String(health.data.guilds)],
                  ['Uptime', formatUptime(health.data.uptime)],
                  ['Ping', health.data.ping != null ? `${health.data.ping}ms` : 'n/a'],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 0',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                    <span style={{ fontWeight: 500 }}>{value}</span>
                  </div>
                ))}
                {health.data.inviteUrl && (
                  <a
                    className="btn btn-primary"
                    href={health.data.inviteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textAlign: 'center', textDecoration: 'none', marginTop: 4 }}
                  >
                    ➕ เชิญบอทเข้าเซิร์ฟเวอร์
                  </a>
                )}
              </>
            )}
            {health.error && (
              <div style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>{health.error.message}</div>
            )}
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 16, fontSize: '1.1rem' }}>Servers (Top 5 สมาชิกเยอะสุด)</h3>
          <TopServers />
        </div>
      </div>
    </div>
  )
}

function TopServers() {
  const { data, error, loading } = useApi(() => api.servers(), [], 30000)

  if (loading) return <div style={{ color: 'var(--text-muted)' }}>กำลังโหลด...</div>
  if (error) return <div style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>{error.message}</div>
  if (!data?.length) return <div style={{ color: 'var(--text-muted)' }}>บอทยังไม่ได้อยู่ในเซิร์ฟเวอร์ใด</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {data.slice(0, 5).map((g) => (
        <div
          key={g.id}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 0',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {g.icon ? (
              <img src={g.icon} alt="" width={28} height={28} style={{ borderRadius: 8 }} />
            ) : (
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: 'var(--bg-secondary)',
                }}
              />
            )}
            <span style={{ fontWeight: 500 }}>{g.name}</span>
          </div>
          <div style={{ display: 'flex', gap: 14, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Users size={13} /> {g.members.toLocaleString()}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Hash size={13} /> {g.channels}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
