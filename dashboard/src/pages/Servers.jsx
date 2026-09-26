import { Users, Hash, ExternalLink } from 'lucide-react'
import ErrorState from '../components/ErrorState'
import { api } from '../lib/api'
import { useApi } from '../lib/useApi'

export default function Servers() {
  const { data, error, loading, reload } = useApi(() => api.servers(), [], 30000)
  const health = useApi(() => api.health(), [], 30000)

  if (error) return <ErrorState error={error} onRetry={reload} />

  const servers = data ?? []

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Servers</h1>
          <p>Manage servers your bot is in</p>
        </div>
        {health.data?.inviteUrl && (
          <a className="btn btn-primary" href={health.data.inviteUrl} target="_blank" rel="noopener noreferrer">
            Invite Bot
          </a>
        )}
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Server</th>
              <th>Members</th>
              <th>Channels</th>
              <th>ID</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="muted">
                  กำลังโหลด...
                </td>
              </tr>
            )}

            {!loading && servers.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  บอทยังไม่ได้อยู่ในเซิร์ฟเวอร์ใด
                </td>
              </tr>
            )}

            {servers.map((s) => (
              <tr key={s.id}>
                <td>
                  <div className="server-cell">
                    {s.icon ? (
                      <img src={s.icon} alt="" />
                    ) : (
                      <div className="fallback" />
                    )}
                    <span style={{ fontWeight: 600 }}>{s.name}</span>
                  </div>
                </td>
                <td>
                  <div className="server-metrics">
                    <span>
                      <Users size={13} /> {s.members.toLocaleString()}
                    </span>
                  </div>
                </td>
                <td>
                  <div className="server-metrics">
                    <span>
                      <Hash size={13} /> {s.channels}
                    </span>
                  </div>
                </td>
                <td>
                  <code className="muted" style={{ fontSize: '0.78rem' }}>
                    {s.id}
                  </code>
                </td>
                <td>
                  <a
                    className="btn btn-ghost btn-sm"
                    href={`https://discord.com/channels/${s.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open <ExternalLink size={12} />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
