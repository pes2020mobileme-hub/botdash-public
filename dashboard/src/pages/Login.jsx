import { useState } from 'react'
import { Bot, LogIn } from 'lucide-react'
import { useAuth } from '../lib/auth'

export default function Login() {
  const { login } = useAuth()
  const [token, setToken] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const ok = await login(token.trim())
      if (!ok) setError('Token ไม่ถูกต้อง')
    } catch (err) {
      setError(err.message || 'ต่อ Bot API ไม่ได้')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
      }}
    >
      <form className="card" onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 400 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 15,
            background: 'var(--grad)',
            display: 'grid',
            placeItems: 'center',
            marginBottom: 18,
            boxShadow: '0 8px 24px -8px rgba(139, 92, 246, 0.8)',
          }}
        >
          <Bot size={26} color="#fff" />
        </div>

        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 4 }}>BotDash</h1>
        <p className="form-hint" style={{ marginBottom: 20 }}>
          ใส่ access token เพื่อเข้าใช้งาน — สร้างได้ด้วย <code>npm run token</code> ในโฟลเดอร์
          bot แล้วตั้งเป็น <code>DASHBOARD_TOKEN</code> บน Render
        </p>

        <div className="form-group">
          <label>Access Token</label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="วาง token ที่นี่"
            autoFocus
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {error && (
          <div className="badge badge-danger" style={{ marginBottom: 14, display: 'flex' }}>
            {error}
          </div>
        )}

        <button
          className="btn btn-primary btn-block"
          type="submit"
          disabled={busy || !token.trim()}
        >
          <LogIn size={15} /> {busy ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
        </button>
      </form>
    </div>
  )
}
