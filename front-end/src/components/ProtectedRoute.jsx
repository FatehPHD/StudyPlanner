// src/components/ProtectedRoute.jsx
import { useAuth } from '../context/AuthContext'
import { Navigate, useLocation } from 'react-router-dom'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  // 1. While Supabase checks the session, show a loading state
  if (loading) return <p>Loading…</p>

  // 2. If not logged in, redirect to /login and remember where we came from
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  // 3. Otherwise, render the protected page
  return children
}
