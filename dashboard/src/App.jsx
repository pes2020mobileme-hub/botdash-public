import { Routes, Route, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import Servers from './pages/Servers'
import Settings from './pages/Settings'

const pageTitles = {
  '/': 'Dashboard',
  '/servers': 'Servers',
  '/settings': 'Settings',
}

export default function App() {
  const location = useLocation()
  const title = pageTitles[location.pathname] || 'Dashboard'

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar title={title} />
        <main className="page-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/servers" element={<Servers />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
