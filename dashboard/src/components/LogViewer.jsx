import { useEffect, useRef, useState } from 'react'
import { logStreamUrl } from '../lib/api'

const MAX_LINES = 300

const LEVEL_ICON = {
  info: 'ℹ️',
  success: '✅',
  warn: '⚠️',
  error: '❌',
}

export default function LogViewer() {
  const [lines, setLines] = useState([])
  const [connected, setConnected] = useState(false)
  const [paused, setPaused] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    const source = new EventSource(logStreamUrl())

    source.onopen = () => setConnected(true)
    source.onerror = () => setConnected(false)

    source.onmessage = (event) => {
      if (paused) return
      let entry
      try {
        entry = JSON.parse(event.data)
      } catch {
        return
      }
      setLines((prev) => [...prev, entry].slice(-MAX_LINES))
    }

    return () => source.close()
  }, [paused])

  useEffect(() => {
    if (paused) return
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [lines, paused])

  function clear() {
    setLines([])
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '14px 20px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <h3 className="card-title" style={{ margin: 0 }}>
          Activity Log
        </h3>
        <div className="row" style={{ gap: 8 }}>
          <span className={`badge ${connected ? 'badge-success' : 'badge-danger'}`}>
            {connected ? 'live' : 'disconnected'}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => setPaused((p) => !p)}>
            {paused ? 'เล่นต่อ' : 'หยุดชั่วคราว'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={clear}>
            ล้าง
          </button>
        </div>
      </div>

      <div
        style={{
          maxHeight: 380,
          minHeight: 200,
          overflowY: 'auto',
          padding: '14px 20px',
          fontFamily: "'JetBrains Mono', ui-monospace, Consolas, monospace",
          fontSize: '0.8rem',
          lineHeight: 1.75,
        }}
      >
        {lines.length === 0 ? (
          <div className="muted">ยังไม่มี log — รอเหตุการณ์จากบอท…</div>
        ) : (
          lines.map((entry, index) => (
            <div
              key={entry.id ?? index}
              style={{
                display: 'flex',
                gap: 10,
                color: entry.level === 'error' ? 'var(--danger)' : 'var(--text-secondary)',
              }}
            >
              <span className="muted" style={{ flexShrink: 0 }}>
                {entry.time
                  ? new Date(entry.time).toLocaleTimeString('en-GB', { hour12: false })
                  : '--:--:--'}
              </span>
              <span style={{ flexShrink: 0 }}>{LEVEL_ICON[entry.level] ?? '•'}</span>
              <span>{entry.message}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
