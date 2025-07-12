import { NavLink, useLocation } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext.jsx' // (or wherever you store your toggle)
import '../App.css' // ensure your CSS variables & .app-layout/.sidebar/.main-content are loaded

export default function Layout({ children }) {
  const { theme, toggleTheme } = useTheme()
  const loc = useLocation()

  return (
    <div className="app-layout" data-theme={theme}>
      <nav className="sidebar">
        <h2 className="sidebar-brand">Study Planner</h2>
        <ul className="sidebar-list">
          <li>
            <NavLink to="/" className={({isActive})=> isActive ? 'sidebar-link active' : 'sidebar-link'}>
              Home
            </NavLink>
          </li>
          <li>
            <NavLink to="/add" className={({isActive})=> isActive ? 'sidebar-link active' : 'sidebar-link'}>
              Add Course
            </NavLink>
          </li>
          <li>
            <NavLink to="/calendar" className={({isActive})=> isActive ? 'sidebar-link active' : 'sidebar-link'}>
              Calendar
            </NavLink>
          </li>
        </ul>
        <button onClick={toggleTheme} className="btn-link" style={{marginTop:'1rem'}}>
          {theme === 'dark' ? '🌞 Light Mode' : '🌙 Dark Mode'}
        </button>
      </nav>

      <main className="main-content">
        {children}
      </main>
    </div>
  )
}
