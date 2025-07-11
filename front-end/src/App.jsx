// src/App.jsx
import { Routes, Route, useNavigate } from 'react-router-dom'
import { ErrorBoundary }              from 'react-error-boundary'

import LoginPage      from './components/LoginPage.jsx'
import Home           from './components/Home.jsx'
import AddPage        from './components/AddPage.jsx'
import CalendarPage   from './components/CalendarPage.jsx'
import CoursePage     from './components/CoursePage.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'

// Enhanced fallback UI
function ErrorFallback({ error, resetErrorBoundary }) {
  const navigate = useNavigate()

  return (
    <div className="container center-text" style={{ padding: '2rem' }}>
      <h1>Something went wrong 😔</h1>
      <p className="error-text">{error.message}</p>
      <div className="actions">
        <button
          className="btn-primary"
          onClick={resetErrorBoundary}
        >
          Try Again
        </button>
        <button
          className="btn-link ml-4"
          onClick={() => {
            // clear the error and then navigate home
            resetErrorBoundary()
            navigate('/')
          }}
        >
          Go Home
        </button>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // Optional: clear any global state here
      }}
    >
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected */}
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
        <Route
          path="/courses/:id"
          element={
            <ProtectedRoute>
              <CoursePage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </ErrorBoundary>
  )
}
