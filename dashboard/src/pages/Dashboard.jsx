import { Server, Users, Hash, Activity } from 'lucide-react'
import StatCard from '../components/StatCard'
import ErrorState from '../components/ErrorState'
import LogViewer from '../components/LogViewer'
import { api, formatUptime } from '../lib/api'
import { useApi } from '../lib/useApi'

export default function Dashboard() {
  const stats = useApi(() => api.stats(), [], 15000)
  const health = useApi(() => api.health(), [], 15000)

  if (stats.error) return <ErrorState error={stats.error} onRetry={stats.reload} />

  const s = stats.data
  const dash = (v) => (v == null ? '—' : v)

  const cards = [
    {
      title: 'Total Servers',
      value: dash(s && s.servers.toLocaleString()),
      icon: Server,
      change: health.data?.bot ?? (health.loading ? 'กำลังโหลด...' : 'บอทออฟไลน์'),
    },
    {
      title: 'Total Members',
      value: dash(s && s.members.toLocaleString()),
      icon: Users,
      change: s ? `${s.channels.toLocaleString()} channels` : '',
    },
    {
      title: 'WebSocket Ping',
      value: dash(s?.ping != null ? `${s.ping}ms` : null),
      icon: Activity,
      change: 'Gateway heartbeat',
    },
    {
      title: 'Uptime',
      value: dash(s && formatUptime(s.uptime)),
      icon: Activity,
      change: 'Since process start',
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

      <div className="split">
        <div className="card card-hover">
          <h3 className="card-title">Bot Status</h3>
          <div className="kv-list">
            {health.loading && <div className="skeleton" style={{ height: 22 }} />}
            {health.data && (
              <>
                {[
                  ['Bot', health.data.bot],
                  ['State', health.data.ready ? 'พร้อมใช้งาน' : 'กำลังรอเชื่อมต่อ'],
                  ['Servers', String(health.data.guilds)],
                  ['Uptime', formatUptime(health.data.uptime)],
                  ['Ping', health.data.ping != null ? `${health.data.ping}ms` : 'n/a'],
                ].map(([k, v]) => (
                  <div className="kv-row" key={k}>
                    <span className="kv-key">{k}</span>
                    <span className="kv-val">{v}</span>
                  </div>
                ))}
                {health.data.inviteUrl && (
                  <a
                    className="btn btn-primary btn-block"
                    href={health.data.inviteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    ➕ เชิญบอทเข้าเซิร์ฟเวอร์
                  </a>
                )}
              </>
            )}
            {health.error && <div className="badge badge-danger">{health.error.message}</div>}
          </div>
        </div>

        <div className="card card-hover">
          <h3 className="card-title">Servers — Top 5 สมาชิกเยอะสุด</h3>
          <TopServers />
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <LogViewer />
      </div>
    </div>
  )
}

function TopServers() {
  const { data, error, loading } = useApi(() => api.servers(), [], 30000)

  if (loading) {
    return (
      <div className="kv-list">
        {[0, 1, 2].map((i) => (
          <div className="skeleton" key={i} style={{ height: 30, marginBottom: 12 }} />
        ))}
      </div>
    )
  }
  if (error) return <div className="badge badge-danger">{error.message}</div>
  if (!data?.length) return <div className="empty">บอทยังไม่ได้อยู่ในเซิร์ฟเวอร์ใด</div>

  return (
    <div>
      {data.slice(0, 5).map((g) => (
        <div className="server-row" key={g.id}>
          <div className="server-id">
            {g.icon ? (
              <img className="server-icon" src={g.icon} alt="" />
            ) : (
              <div className="server-icon-fallback" />
            )}
            <span className="server-name">{g.name}</span>
          </div>
          <div className="server-metrics">
            <span>
              <Users size={12} /> {g.members.toLocaleString()}
            </span>
            <span>
              <Hash size={12} /> {g.channels}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
