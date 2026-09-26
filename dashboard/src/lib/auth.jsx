import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, getToken, setToken as persist, verifyToken } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // 'loading' | 'authed' | 'guest'
  const [state, setState] = useState('loading')

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const status = await api.authStatus()
        if (cancelled) return

        if (!status.required) {
          setState('authed')
          return
        }
        setState(getToken() ? 'authed' : 'guest')
      } catch {
        if (!cancelled) setState('guest')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (token) => {
    const ok = await verifyToken(token)
    if (ok) setState('authed')
    return ok
  }, [])

  const logout = useCallback(() => {
    persist('')
    setState('guest')
  }, [])

  const value = useMemo(() => ({ state, login, logout }), [state, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
