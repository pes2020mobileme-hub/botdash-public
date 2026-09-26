const BASE = import.meta.env.VITE_API_URL ?? ''
const TOKEN_KEY = 'botdash.token'

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? ''
  } catch {
    return ''
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // private mode — token stays in memory only
  }
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request(path, { timeout = 10000, method = 'GET', body } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  const headers = { Accept: 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      signal: controller.signal,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)

      if (res.status === 401) {
        setToken('')
        throw new ApiError('Unauthorized', 401)
      }

      throw new ApiError(data?.error || `HTTP ${res.status}`, res.status)
    }

    return res.status === 204 ? null : await res.json().catch(() => null)
  } finally {
    clearTimeout(timer)
  }
}

export const api = {
  authStatus: () => request('/api/auth/status'),
  health: () => request('/api/health'),
  stats: () => request('/api/stats'),
  servers: () => request('/api/servers'),
  config: () => request('/api/config'),
  commands: () => request('/api/commands'),
  deployCommands: () => request('/api/commands/deploy', { method: 'POST' }),
}

/** Verify a candidate token before storing it. */
export async function verifyToken(token) {
  setToken(token)
  try {
    await request('/api/auth/verify', { method: 'POST', body: {} })
    return true
  } catch (error) {
    setToken('')
    if (error instanceof ApiError && error.status === 401) return false
    throw error
  }
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

/** EventSource cannot set headers, so the token rides in the query string. */
export function logStreamUrl() {
  return `${BASE}/api/logs?token=${encodeURIComponent(getToken())}`
}
