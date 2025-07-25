// LoginPage.jsx - User authentication (sign in/sign up)
import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function LoginPage() {
  const { user, loading, signIn, signUp } = useAuth()
  const [email, setEmail]   = useState('')
  const [pass, setPass]     = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const [error, setError]   = useState(null)
  const location = useLocation()
  const navigate = useNavigate()

  const handleSubmit = async e => {
    e.preventDefault()
    setError(null)
    const fn = isSignup ? signUp : signIn
    const { error } = await fn({ email, password: pass })
    if (error) setError(error.message)
    else navigate('/') // Redirect to home after successful login/signup
  }

  if (loading) return <p>Loading…</p>
  if (user) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 400, margin: '2rem auto' }}>
        <h1 className="playful-heading">{isSignup ? 'Sign Up' : 'Sign In'}</h1>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="input-field"
          />
          <input
            type="password"
            placeholder="Password"
            value={pass}
            onChange={e => setPass(e.target.value)}
            required
            className="input-field"
          />
          <button type="submit" className="btn-fun">
            {isSignup ? 'Create Account' : 'Log In'}
          </button>
        </form>
        {error && <p className="error-text">{error}</p>}
        <button
          onClick={() => setIsSignup(!isSignup)}
          className="btn-fun"
          style={{ background: 'var(--surface-alt)', color: 'var(--accent2)' }}
        >
          {isSignup
            ? 'Already have an account? Sign In'
            : "Don't have an account? Sign Up"}
        </button>
      </div>
    </div>
  )
}
