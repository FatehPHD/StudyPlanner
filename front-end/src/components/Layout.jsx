// Layout.jsx - Provides the top navigation bar and main content layout
import React, { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useTheme }  from '../context/ThemeContext.jsx'
import { useAuth }   from '../context/AuthContext.jsx'
import '../App.css'

export default function Layout({ children }) {
  const { theme, toggleTheme } = useTheme()
  const { user, signOut }      = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const location = useLocation()

  // Check admin status on mount or user change
  useEffect(() => {
    async function checkAdmin() {
      if (!user) return setIsAdmin(false)
      const res = await fetch(`/api/profiles/${user.id}`)
      const profile = await res.json()
      setIsAdmin(profile.is_admin)
    }
    checkAdmin()
  }, [user])

  return (
    <div className="app-layout" data-theme={theme}>
      {/* Top navigation bar */}
      <nav className="topnav">
        <div className="topnav-brand">Study Planner</div>
        <ul className="topnav-list">
          {/* Hide main nav links on /login */}
          {location.pathname !== '/login' && <>
            <li>
              <NavLink to="/"   className={({ isActive })=> isActive ? 'topnav-link active' : 'topnav-link'} end>
                Home
              </NavLink>
            </li>
            <li>
              <NavLink to="/add" className={({ isActive })=> isActive ? 'topnav-link active' : 'topnav-link'}>
                Add Course
              </NavLink>
            </li>
            <li>
              <NavLink to="/calendar" className={({ isActive })=> isActive ? 'topnav-link active' : 'topnav-link'}>
                Calendar
              </NavLink>
            </li>
          </>}
        </ul>
        {/* Admin button, theme toggle, and sign out actions */}
        <div className="topnav-actions">
          {isAdmin && location.pathname !== '/login' && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                isActive ? 'admin-nav-btn admin-nav-btn-active' : 'admin-nav-btn'
              }
              style={{ marginRight: 16, display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>⚙️</span> Admin
            </NavLink>
          )}
          <button onClick={toggleTheme} className="btn-link btn-theme-toggle" aria-label="Toggle theme">
            {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
          </button>
          {user && location.pathname !== '/login' && (
            <button
              onClick={signOut}
              className="btn-signout"
              style={{ marginLeft: '1rem' }}
            >
              Sign Out
            </button>
          )}
        </div>
      </nav>
      {/* Main content area */}
      <main className="main-content">
        {children}
      </main>
    </div>
  )
}
