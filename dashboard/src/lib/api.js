const BASE = import.meta.env.VITE_API_URL ?? ''

async function request(path, { timeout = 8000, method = 'GET' } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || `HTTP ${res.status}`)
    }

    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

export const api = {
  health: () => request('/api/health'),
  stats: () => request('/api/stats'),
  servers: () => request('/api/servers'),
  config: () => request('/api/config'),
  commands: () => request('/api/commands'),
  deployCommands: () => request('/api/commands/deploy', { method: 'POST' }),
}

export function formatUptime(seconds) {
  const total = Math.floor(seconds || 0)
  const d = Math.floor(total / 86400)
  const h = Math.floor((total % 86400) / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60

  if (d) return `${d}d ${h}h`
  if (h) return `${h}h ${m}m`
  if (m) return `${m}m ${s}s`
  return `${s}s`
}
