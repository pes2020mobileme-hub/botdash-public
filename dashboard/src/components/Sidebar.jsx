import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Server, Settings, Bot } from 'lucide-react'
import { api } from '../lib/api'
import { useApi } from '../lib/useApi'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/servers', icon: Server, label: 'Servers' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  const { data, loading } = useApi(() => api.health(), [], 10000)
  const online = Boolean(data?.ready)
  return (
    <aside
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        width: 'var(--sidebar-width)',
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: '24px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Bot size={22} color="white" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>BotDash</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Discord Manager</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 12px' }}>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 14px',
              borderRadius: 8,
              marginBottom: 4,
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: isActive ? 'var(--bg-hover)' : 'transparent',
              fontWeight: isActive ? 600 : 500,
              transition: 'all 0.15s',
            })}
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Status */}
      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: loading ? 'var(--text-muted)' : online ? 'var(--success)' : 'var(--danger)',
            boxShadow: online ? '0 0 8px var(--success)' : 'none',
          }}
        />
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {loading ? 'Checking...' : online ? 'Bot Online' : 'Bot Offline'}
        </span>
      </div>
    </aside>
  )
}
