import { Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import Sidebar from './components/Sidebar'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import Servers from './pages/Servers'
import Builder from './pages/Builder'
import Settings from './pages/Settings'
import Login from './pages/Login'

const pageTitles = {
  '/': 'Dashboard',
  '/servers': 'Servers',
  '/builder': 'Builder',
  '/settings': 'Settings',
}

function Shell() {
  const { state, logout } = useAuth()
  const location = useLocation()
  const title = pageTitles[location.pathname] || 'Dashboard'

  if (state === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <div className="skeleton" style={{ width: 180, height: 14 }} />
      </div>
    )
  }

  if (state === 'guest') {
    return <Login />
  }

  return (
    <div className="app-layout">
      <Sidebar onLogout={logout} />
      <div className="main-content">
        <Navbar title={title} />
        <main className="page-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/servers" element={<Servers />} />
            <Route path="/builder" element={<Builder />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  )
}
