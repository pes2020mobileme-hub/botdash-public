import { useEffect, useState } from 'react'
import { Terminal, Save, RotateCw, LogOut, AlertTriangle } from 'lucide-react'
import ErrorState from '../components/ErrorState'
import { api } from '../lib/api'
import { useApi } from '../lib/useApi'

export default function Settings() {
  const config = useApi(() => api.config(), [])
  const commands = useApi(() => api.commands(), [])

  const [prefix, setPrefix] = useState('')
  const [status, setStatus] = useState('online')
  const [activity, setActivity] = useState('')

  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(null)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    if (!config.data) return
    setPrefix(config.data.prefix)
    setStatus(config.data.status)
    setActivity(config.data.activity)
  }, [config.data])

  async function run(label, fn, confirmMessage) {
    if (confirmMessage && !window.confirm(confirmMessage)) return

    setBusy(label)
    setMsg(null)
    try {
      const text = await fn()
      setMsg({ ok: true, text })
    } catch (error) {
      setMsg({ ok: false, text: error.message })
    } finally {
      setBusy(null)
    }
  }

  if (config.error) return <ErrorState error={config.error} onRetry={config.reload} />

  const dirty =
    config.data &&
    (prefix !== config.data.prefix ||
      status !== config.data.status ||
      activity !== config.data.activity)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>ตั้งค่าบอท — บันทึกแล้วมีผลทันที ไม่ต้อง restart (ยกเว้น prefix)</p>
        </div>
      </div>

      <div style={{ maxWidth: 620 }}>
        <div className="card" style={{ marginBottom: 22 }}>
          <h3 className="card-title">
            <Save size={17} color="var(--g2)" /> Bot Configuration
          </h3>
          <p className="form-hint">
            ค่าที่บันทึกจะเขียนลง <code>bot/data/config.json</code> และมีผลเหนือค่าใน{' '}
            <code>.env</code> — ไฟล์นี้ถูก gitignore ไว้
          </p>

          <div className="form-group">
            <label>Command Prefix</label>
            <input value={prefix} onChange={(e) => setPrefix(e.target.value)} maxLength={5} placeholder="!" />
          </div>

          <div className="form-group">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="online">Online</option>
              <option value="idle">Idle</option>
              <option value="dnd">Do Not Disturb</option>
              <option value="invisible">Invisible</option>
            </select>
          </div>

          <div className="form-group">
            <label>Activity / Presence</label>
            <input
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              maxLength={128}
              placeholder="Watching the dashboard"
            />
          </div>

          <div className="form-actions">
            <button
              className="btn btn-primary"
              disabled={saving || !dirty}
              onClick={() =>
                run('save', async () => {
                  setSaving(true)
                  try {
                    const res = await api.saveConfig({ prefix, status, activity })
                    config.reload()
                    return `บันทึกแล้ว: prefix ${res.config.prefix}, status ${res.config.status}`
                  } finally {
                    setSaving(false)
                  }
                })
              }
            >
              <Save size={15} /> {saving ? 'กำลังบันทึก...' : 'Save Changes'}
            </button>
            {dirty && <span className="muted" style={{ fontSize: '0.85rem' }}>มีการเปลี่ยนแปลงที่ยังไม่บันทึก</span>}
          </div>
        </div>

        {msg && (
          <div className="card" style={{ marginBottom: 22, padding: 14 }}>
            <div className={msg.ok ? 'badge badge-success' : 'badge badge-danger'}>{msg.text}</div>
          </div>
        )}

        <div className="card" style={{ marginBottom: 22 }}>
          <h3 className="card-title">
            <Terminal size={17} color="var(--g2)" /> Slash Commands
          </h3>
          <p className="form-hint">
            คำสั่งโหลดจาก <code>bot/src/commands/</code> — ต้อง push ขึ้น Discord ก่อนถึงจะใช้ได้
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
            <button
              className="btn btn-primary"
              disabled={busy === 'deploy'}
              onClick={() =>
                run('deploy', async () => {
                  const res = await api.deployCommands()
                  commands.reload()
                  return `Deploy ${res.count} คำสั่งแล้ว (${res.scope}): ${res.names
                    .map((n) => `/${n}`)
                    .join(', ')}`
                })
              }
            >
              <Terminal size={15} /> {busy === 'deploy' ? 'กำลัง deploy...' : 'Deploy Slash Commands'}
            </button>
            <button className="btn btn-ghost" onClick={commands.reload} disabled={Boolean(busy)}>
              รีเฟรช
            </button>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">
            <AlertTriangle size={17} color="var(--danger)" /> Danger Zone
          </h3>
          <p className="form-hint">
            คำสั่งเหล่านี้กระทบทันทีทั้งบอท การกระทำบางอย่างย้อนกลับไม่ได้
          </p>

          <div className="row">
            <button
              className="btn btn-ghost"
              disabled={busy === 'restart'}
              onClick={() =>
                run('restart', async () => {
                  const res = await api.restartBot()
                  return res.message
                }, 'Restart บอท? จะตัดการเชื่อมต่อ Discord ชั่วคราว')
              }
            >
              <RotateCw size={15} /> {busy === 'restart' ? 'กำลัง restart...' : 'Restart Bot'}
            </button>

            <button
              className="btn btn-danger"
              disabled={busy === 'leave'}
              onClick={() =>
                run(
                  'leave',
                  async () => {
                    const res = await api.leaveAll()
                    return `ออกจาก ${res.left.length} เซิร์ฟเวอร์` +
                      (res.failed.length ? ` · พัง ${res.failed.length}` : '')
                  },
                  'ออกจากทุกเซิร์ฟเวอร์?\n\nบอทจะไม่เหลือที่ไหนเลย และต้องเชิญใหม่ทุกเซิร์ฟเวอร์',
                )
              }
            >
              <LogOut size={15} /> {busy === 'leave' ? 'กำลังออก...' : 'Leave All Servers'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
