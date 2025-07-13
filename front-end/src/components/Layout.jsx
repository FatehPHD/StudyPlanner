import React from 'react'
import { NavLink }   from 'react-router-dom'
import { useTheme }  from '../context/ThemeContext.jsx'
import { useAuth }   from '../context/AuthContext.jsx'
import '../App.css'

export default function Layout({ children }) {
  const { theme, toggleTheme } = useTheme()
  const { user, signOut }      = useAuth()

  return (
    <div className="app-layout" data-theme={theme}>
      <nav className="sidebar">
        <h2 className="sidebar-brand">Study Planner</h2>
        <ul className="sidebar-list">
          <li>
            <NavLink to="/"   className={({ isActive })=> isActive ? 'sidebar-link active' : 'sidebar-link'} end>
              Home
            </NavLink>
          </li>
          <li>
            <NavLink to="/add" className={({ isActive })=> isActive ? 'sidebar-link active' : 'sidebar-link'}>
              Add Course
            </NavLink>
          </li>
          <li>
            <NavLink to="/calendar" className={({ isActive })=> isActive ? 'sidebar-link active' : 'sidebar-link'}>
              Calendar
            </NavLink>
          </li>
        </ul>

        <div style={{ marginTop: 'auto' }}>
          <button onClick={toggleTheme} className="btn-link" aria-label="Toggle theme">
            {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
          </button>

          {user && (
            <button
              onClick={signOut}
              className="btn-signout"
              style={{ marginTop: '1rem', width: '100%' }}
            >
              Sign Out
            </button>
          )}
        </div>
      </nav>

      <main className="main-content">
        {children}
      </main>
    </div>
  )
}
