// front-end/src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1) Fetch existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // 2) Listen for sign-in / sign-out
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    // Cleanup subscription on unmount
    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  // v2 signup / signin / signout methods
  const signUp  = ({ email, password }) => supabase.auth.signUp({ email, password })
  const signIn  = ({ email, password }) => supabase.auth.signInWithPassword({ email, password })
  const signOut = ()                     => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
