import { useEffect, useState } from 'react'
import { Terminal } from 'lucide-react'
import ErrorState from '../components/ErrorState'
import { api } from '../lib/api'
import { useApi } from '../lib/useApi'

export default function Settings() {
  const { data, error, loading, reload } = useApi(() => api.config(), [])
  const commands = useApi(() => api.commands(), [])
  const [prefix, setPrefix] = useState('')
  const [status, setStatus] = useState('online')
  const [activity, setActivity] = useState('')
  const [deploying, setDeploying] = useState(false)
  const [deployMsg, setDeployMsg] = useState(null)

  useEffect(() => {
    if (!data) return
    setPrefix(data.prefix)
    setStatus(data.status)
    setActivity(data.activity)
  }, [data])

  async function handleDeploy() {
    setDeploying(true)
    setDeployMsg(null)
    try {
      const result = await api.deployCommands()
      setDeployMsg({
        ok: true,
        text: `Deploy แล้ว ${result.count} คำสั่ง: ${result.names.map((n) => `/${n}`).join(', ')}`,
      })
      commands.reload()
    } catch (err) {
      setDeployMsg({ ok: false, text: err.message })
    } finally {
      setDeploying(false)
    }
  }

  if (error) return <ErrorState error={error} onRetry={reload} />

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Configure your Discord bot</p>
        </div>
      </div>

      <div style={{ maxWidth: 560 }}>
        <div className="card" style={{ marginBottom: 22 }}>
          <h3 className="card-title">
            <Terminal size={17} color="var(--g2)" /> Slash Commands
          </h3>
          <p className="form-hint">
            คำสั่งถูกโหลดจาก <code>bot/src/commands/</code> — ต้อง push ขึ้น Discord ก่อนถึงจะใช้งานได้
            (global ใช้เวลาถึง ~1 ชั่วโมง, ตั้ง <code>GUILD_ID</code> เพื่อให้ขึ้นทันที)
          </p>

          {commands.loading && <div className="skeleton" style={{ height: 22, marginBottom: 12 }} />}

          {commands.data && (
            <div className="kv-list" style={{ marginBottom: 16 }}>
              <div className="kv-row">
                <span className="kv-key">ในโค้ด</span>
                <span className="kv-val">
                  {commands.data.local.length
                    ? commands.data.local.map((n) => `/${n}`).join(', ')
                    : 'ไม่มี'}
                </span>
              </div>
              <div className="kv-row">
                <span className="kv-key">บน Discord ({commands.data.scope})</span>
                <span className="kv-val">
                  {commands.data.registered.length
                    ? commands.data.registered.map((c) => `/${c.name}`).join(', ')
                    : 'ยังไม่มี'}
                </span>
              </div>
            </div>
          )}

          {commands.error && <div className="badge badge-danger">{commands.error.message}</div>}

          <div className="form-actions">
            <button className="btn btn-primary" onClick={handleDeploy} disabled={deploying}>
              {deploying ? 'กำลัง deploy...' : 'Deploy Slash Commands'}
            </button>
            <button className="btn btn-ghost" onClick={commands.reload} disabled={deploying}>
              รีเฟรช
            </button>
          </div>

          {deployMsg && (
            <div className={deployMsg.ok ? 'badge badge-success' : 'badge badge-danger'} style={{ marginTop: 14 }}>
              {deployMsg.text}
            </div>
          )}
        </div>

        <div className="card" style={{ marginBottom: 22 }}>
          <h3 className="card-title">Bot Configuration</h3>
          <p className="form-hint">
            ค่าเหล่านี้อ่านจากไฟล์ <code>.env</code> ของบอท — ต้อง restart บอทถึงจะมีผล
            ปุ่มบันทึกยังไม่ได้เชื่อมกับ API
          </p>

          <div className="form-group">
            <label>Command Prefix</label>
            <input
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="!"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={loading}>
              <option value="online">Online</option>
              <option value="idle">Idle</option>
              <option value="dnd">Do Not Disturb</option>
              <option value="invisible">Invisible</option>
            </select>
          </div>

          <div className="form-group">
            <label>Activity / Presence</label>
            <input
              type="text"
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              placeholder="Playing something..."
              disabled={loading}
            />
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" disabled title="ยังไม่ได้ทำ endpoint สำหรับบันทึกค่า">
              Save Changes
            </button>
            {loading && <span className="muted" style={{ fontSize: '0.85rem' }}>กำลังโหลด...</span>}
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">Danger Zone</h3>
          <p className="form-hint" style={{ marginBottom: 16 }}>
            Restart the bot or leave all servers. These actions cannot be undone easily.
          </p>
          <div className="row">
            <button className="btn btn-ghost" disabled>
              Restart Bot
            </button>
            <button className="btn btn-danger" disabled>
              Leave All Servers
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
