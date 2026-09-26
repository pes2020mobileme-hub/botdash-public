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
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 8, fontSize: '1.1rem' }}>Bot Configuration</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 20 }}>
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

          <div style={{ marginTop: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
            <button className="btn btn-primary" disabled title="ยังไม่ได้ทำ endpoint สำหรับบันทึกค่า">
              Save Changes
            </button>
            {loading && <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>กำลังโหลด...</span>}
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 12, fontSize: '1.1rem' }}>Danger Zone</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16, fontSize: '0.9rem' }}>
            Restart the bot or leave all servers. These actions cannot be undone easily.
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-ghost" disabled>
              Restart Bot
            </button>
            <button
              className="btn"
              style={{ background: 'var(--danger)', color: 'white' }}
              disabled
            >
              Leave All Servers
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
