import { useEffect, useState } from 'react'
import ErrorState from '../components/ErrorState'
import { api } from '../lib/api'
import { useApi } from '../lib/useApi'

export default function Settings() {
  const { data, error, loading, reload } = useApi(() => api.config(), [])
  const [prefix, setPrefix] = useState('')
  const [status, setStatus] = useState('online')
  const [activity, setActivity] = useState('')

  useEffect(() => {
    if (!data) return
    setPrefix(data.prefix)
    setStatus(data.status)
    setActivity(data.activity)
  }, [data])

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
