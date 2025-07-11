import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function LoginPage() {
  const { user, loading, signIn, signUp } = useAuth()
  const [email, setEmail]   = useState('')
  const [pass, setPass]     = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const [error, setError]   = useState(null)
  const location = useLocation()

  const handleSubmit = async e => {
    e.preventDefault()
    setError(null)
    const fn = isSignup ? signUp : signIn
    const { error } = await fn({ email, password: pass })
    if (error) setError(error.message)
  }

  if (loading) return <p>Loading…</p>
  if (user) {
    const from = location.state?.from || '/'
    return <Navigate to={from} replace />
  }

  return (
    <div className="login-container">
      <h1>{isSignup ? 'Sign Up' : 'Sign In'}</h1>
      <form onSubmit={handleSubmit}>
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
        <button type="submit" className="btn-submit">
          {isSignup ? 'Create Account' : 'Log In'}
        </button>
      </form>
      {error && <p className="error-text">{error}</p>}
      <p>
        <button
          onClick={() => setIsSignup(!isSignup)}
          className="btn-link"
        >
          {isSignup
            ? 'Already have an account? Sign In'
            : "Don't have an account? Sign Up"}
        </button>
      </p>
    </div>
)
}
