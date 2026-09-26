import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Server, Settings, Bot, LogOut } from 'lucide-react'
import { api } from '../lib/api'
import { useApi } from '../lib/useApi'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/servers', icon: Server, label: 'Servers' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar({ onLogout }) {
  const { data, loading } = useApi(() => api.health(), [], 10000)
  const online = Boolean(data?.ready)

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">
          <Bot size={22} color="white" />
        </div>
        <div>
          <div className="brand-name">BotDash</div>
          <div className="brand-sub">Discord Manager</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon size={19} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-foot">
        <span
          className={`status-dot ${loading ? 'idle' : online ? 'online' : 'offline'}`}
          aria-hidden="true"
        />
        <span style={{ flex: 1 }}>
          {loading ? 'Checking...' : online ? 'Bot Online' : 'Bot Offline'}
        </span>
        {onLogout && (
          <button
            className="icon-btn"
            style={{ width: 32, height: 32 }}
            onClick={onLogout}
            title="ออกจากระบบ"
          >
            <LogOut size={15} />
          </button>
        )}
      </div>
    </aside>
  )
}
