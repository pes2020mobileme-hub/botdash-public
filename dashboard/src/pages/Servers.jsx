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
          <a
            className="btn btn-primary"
            href={health.data.inviteUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'none' }}
          >
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
                <td colSpan={5} style={{ color: 'var(--text-muted)' }}>
                  กำลังโหลด...
                </td>
              </tr>
            )}
            {!loading && servers.length === 0 && (
              <tr>
                <td colSpan={5} style={{ color: 'var(--text-muted)' }}>
                  บอทยังไม่ได้อยู่ในเซิร์ฟเวอร์ใด
                </td>
              </tr>
            )}
            {servers.map((s) => (
              <tr key={s.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {s.icon ? (
                      <img src={s.icon} alt="" width={40} height={40} style={{ borderRadius: 10 }} />
                    ) : (
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          background: 'var(--bg-secondary)',
                        }}
                      />
                    )}
                    <span style={{ fontWeight: 600 }}>{s.name}</span>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Users size={14} color="var(--text-muted)" />
                    {s.members.toLocaleString()}
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Hash size={14} color="var(--text-muted)" />
                    {s.channels}
                  </div>
                </td>
                <td>
                  <code style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.id}</code>
                </td>
                <td>
                  <a
                    className="btn btn-ghost"
                    style={{ padding: '6px 12px', fontSize: '0.8rem', textDecoration: 'none' }}
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
