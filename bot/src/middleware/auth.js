/**
 * Dashboard authentication.
 *
 * A single shared bearer token (DASHBOARD_TOKEN). The dashboard stores it in
 * localStorage and sends it on every request. This is deliberately simple — it
 * protects a single-operator tool, not a multi-tenant app.
 *
 * If DASHBOARD_TOKEN is unset, auth is skipped entirely so local dev keeps
 * working. That is also why the token must never be committed.
 */

import { timingSafeEqual, randomBytes } from 'node:crypto'

const PUBLIC_ROUTES = new Set(['/api/auth/verify', '/api/auth/status'])

function safeEqual(a, b) {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  // timingSafeEqual throws on length mismatch, so compare lengths first
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

export function authEnabled() {
  return Boolean(process.env.DASHBOARD_TOKEN)
}

export function extractToken(req) {
  const header = req.headers.authorization || ''
  if (header.startsWith('Bearer ')) return header.slice(7).trim()

  // EventSource cannot set headers, so SSE needs a query fallback
  if (typeof req.query.token === 'string') return req.query.token.trim()

  return ''
}

export function isValidToken(token) {
  if (!authEnabled()) return true
  return Boolean(token) && safeEqual(token, process.env.DASHBOARD_TOKEN)
}

export function isPublicRoute(path) {
  // This middleware may be mounted at /api, in which case req.path has the
  // prefix stripped. Accept either form so the allowlist stays readable.
  const normalized = path.startsWith('/api/') ? path : `/api${path}`
  return PUBLIC_ROUTES.has(normalized)
}

/** Express middleware. Apply after body parsing but before the API routes. */
export function requireAuth(req, res, next) {
  if (!authEnabled()) return next()
  if (isPublicRoute(req.path)) return next()

  if (!isValidToken(extractToken(req))) {
    return res.status(401).json({ error: 'Unauthorized', code: 'unauthorized' })
  }

  next()
}

export function generateToken() {
  return randomBytes(32).toString('base64url')
}
