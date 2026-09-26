import { Bell, Search, User } from 'lucide-react'

export default function Navbar({ title }) {
  return (
    <header className="navbar">
      <h2 className="navbar-title">{title}</h2>

      <div className="navbar-right">
        <div className="search">
          <Search size={15} color="var(--text-muted)" />
          <input type="text" placeholder="Search..." />
        </div>

        <button className="icon-btn" title="Notifications">
          <Bell size={17} />
          <span className="pip" />
        </button>

        <div className="avatar">
          <User size={17} color="white" />
        </div>
      </div>
    </header>
  )
}
