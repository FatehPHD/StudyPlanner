// src/App.jsx
import { Routes, Route } from 'react-router-dom'
import LoginPage     from './components/LoginPage.jsx'
import Home          from './components/Home.jsx'
import AddPage       from './components/AddPage.jsx'
import CalendarPage  from './components/CalendarPage.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'

export default function App() {
  return (
    <Routes>
      {/* Public route */}
      <Route path="/login" element={<LoginPage />} />

      {/* All other routes are protected */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/add"
        element={
          <ProtectedRoute>
            <AddPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar"
        element={
          <ProtectedRoute>
            <CalendarPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
