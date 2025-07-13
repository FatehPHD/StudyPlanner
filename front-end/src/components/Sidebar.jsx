// src/components/Sidebar.jsx
import { useEffect, useState } from 'react'
import { NavLink }             from 'react-router-dom'
import { useAuth }             from '../context/AuthContext.jsx'

export default function Sidebar() {
  // pull both user and signOut
  const { user, signOut } = useAuth()

  // theme state (light or dark)
  const [theme, setTheme] = useState(
    () =>
      window.localStorage.getItem('theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  )

  // apply theme to <html> and persist
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    window.localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => (t === 'light' ? 'dark' : 'light'))

  return (
    <nav className="sidebar">
      <h2 className="sidebar-brand">Study Planner</h2>

      {user && (
        <p
          className="sidebar-email"
          style={{
            marginBottom: '1rem',
            fontSize: '0.9rem',
            color: 'var(--fg-muted)'
          }}
        >
          {user.email}
        </p>
      )}

      <ul className="sidebar-list">
        <li>
          <NavLink to="/" end className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
            Home
          </NavLink>
        </li>
        <li>
          <NavLink to="/add" className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
            Add Course
          </NavLink>
        </li>
        <li>
          <NavLink to="/calendar" className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}>
            Calendar
          </NavLink>
        </li>
      </ul>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="btn-link"
        style={{ marginTop: '2rem' }}
        aria-label="Toggle light/dark theme"
      >
        {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
      </button>

      {/* Sign Out */}
      {user && (
        <button
          onClick={signOut}
          className="btn-signout"
          style={{
            marginTop: '1.5rem',
            width: '100%',
            textAlign: 'center'
          }}
        >
          Sign Out
        </button>
      )}
    </nav>
  )
}
