import { useAuth } from '../context/AuthContext.jsx'
import { Navigate, useLocation } from 'react-router-dom'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <p>Loading…</p>
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />

  return children
}
