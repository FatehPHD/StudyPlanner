// src/components/Sidebar.jsx
import { useEffect, useState } from 'react'
import { NavLink }             from 'react-router-dom'
import { useAuth }             from '../context/AuthContext.jsx'

export default function Sidebar() {
  const { user } = useAuth()

  // Start theme from OS or last saved
  const [theme, setTheme] = useState(
    () => window.localStorage.getItem('theme')
      || (window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light')
  )

  // Apply to <html> on change
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    window.localStorage.setItem('theme', theme)
  }, [theme])

  const toggle = () =>
    setTheme(curr => (curr === 'light' ? 'dark' : 'light'))

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
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              isActive ? 'sidebar-link active' : 'sidebar-link'
            }
          >
            Home
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/add"
            className={({ isActive }) =>
              isActive ? 'sidebar-link active' : 'sidebar-link'
            }
          >
            Add Course
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/calendar"
            className={({ isActive }) =>
              isActive ? 'sidebar-link active' : 'sidebar-link'
            }
          >
            Calendar
          </NavLink>
        </li>
      </ul>

      {/* Theme toggle */}
      <button
        onClick={toggle}
        className="btn-link"
        style={{ marginTop: '2rem' }}
        aria-label="Toggle light/dark theme"
      >
        {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
      </button>
    </nav>
  )
}
