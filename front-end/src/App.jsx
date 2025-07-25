// App.jsx - Main application entry point and route definitions
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ErrorBoundary } from 'react-error-boundary'
import Layout from './components/Layout.jsx'
import LoginPage from './components/LoginPage.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Home from './components/Home.jsx'
import AddPage from './components/AddPage.jsx'
import CalendarPage from './components/CalendarPage.jsx'
import CoursePage from './components/CoursePage.jsx'
import TodosPage from './components/TodosPage.jsx'
import AdminDashboard from './components/AdminDashboard.jsx'
import { useAuth } from './context/AuthContext.jsx'
import { useEffect, useState } from 'react'

// Fallback UI for error boundaries
function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="container center-text" style={{ padding: '2rem' }}>
      <h1>Something went wrong 😔</h1>
      <p className="error-text">{error.message}</p>
      <div className="actions">
        <button className="btn-primary" onClick={resetErrorBoundary}>
          Try Again
        </button>
        <button
          className="btn-link ml-4"
          onClick={() => {
            resetErrorBoundary()
            window.location.href = '/'
          }}
        >
          Go Home
        </button>
      </div>
    </div>
  )
}

// AdminRoute: Only renders children if user is admin
function AdminRoute({ children }) {
  const { user } = useAuth()
  const location = useLocation()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    async function checkAdmin() {
      const res = await fetch(`/api/profiles/${user.id}`)
      const profile = await res.json()
      setIsAdmin(profile.is_admin)
      setLoading(false)
    }
    checkAdmin()
  }, [user])
  if (loading) return <p>Loading…</p>
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (!isAdmin) return <p>Not authorized.</p>
  return children
}

export default function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      {/* Layout wraps all routes with navigation and theming */}
      <Layout>
        <Routes>
          {/* Public route: Login */}
          <Route path="/login" element={<LoginPage />} />
          {/* Protected routes: require authentication */}
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/add" element={<ProtectedRoute><AddPage /></ProtectedRoute>} />
          <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
          <Route path="/courses/:id" element={<ProtectedRoute><CoursePage /></ProtectedRoute>} />
          <Route path="/todos" element={<ProtectedRoute><TodosPage /></ProtectedRoute>} />
          {/* Admin-only route */}
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        </Routes>
      </Layout>
    </ErrorBoundary>
  )
}
