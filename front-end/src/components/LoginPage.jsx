// src/components/LoginPage.jsx
import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { user, loading, signIn, signUp } = useAuth()
  const [email, setEmail]   = useState('')
  const [pass, setPass]     = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const [error, setError]   = useState(null)
  const location = useLocation()

  // Handle form submit for both login & signup
  const handleSubmit = async e => {
    e.preventDefault()
    setError(null)
    const fn = isSignup ? signUp : signIn
    const { error } = await fn({ email, password: pass })
    if (error) setError(error.message)
  }
  

  // While checking session
  if (loading) return <p>Loading…</p>
  // If already logged in, redirect to home (or where they came from)
  if (user) {
    const from = location.state?.from || '/'
    return <Navigate to={from} replace />
  }

  return (
    <div style={{ padding: 20, maxWidth: 320, margin: '0 auto' }}>
      <h1>{isSignup ? 'Sign Up' : 'Sign In'}</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={{ width: '100%', marginBottom: 8 }}
        />
        <input
          type="password"
          placeholder="Password"
          value={pass}
          onChange={e => setPass(e.target.value)}
          required
          style={{ width: '100%', marginBottom: 8 }}
        />
        <button type="submit" style={{ width: '100%' }}>
          {isSignup ? 'Create Account' : 'Log In'}
        </button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <p style={{ marginTop: 16, textAlign: 'center' }}>
        <button
          onClick={() => setIsSignup(!isSignup)}
          style={{ background: 'none', border: 'none', color: 'blue', cursor: 'pointer' }}
        >
          {isSignup
            ? 'Already have an account? Sign In'
            : "Don't have an account? Sign Up"}
        </button>
      </p>
    </div>
  )
}
