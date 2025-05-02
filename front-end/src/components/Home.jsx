import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

export default function Home() {
  const { user, signOut } = useAuth()
  const [courses, setCourses] = useState([])

  const fetchCourses = () => {
    supabase
      .from('courses')
      .select('id, title, color, inserted_at')
      .eq('user_id', user.id)
      .order('inserted_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error) setCourses(data || [])
      })
  }

  useEffect(fetchCourses, [user.id])

  const handleDelete = async courseId => {
    if (!window.confirm('Delete this course and all its events?')) return
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId)
    if (!error) fetchCourses()
  }

  return (
    <div style={{ padding: 20, textAlign: 'center' }}>
      <h1>Welcome to Study Planner</h1>
      <p>Signed in as: {user.email}</p>

      <h2>Your Courses</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {courses.map(c => (
          <li key={c.id} style={{ marginBottom: 8 }}>
            <Link
              to={`/courses/${c.id}`}
              style={{
                marginRight: 8,
                color: c.color,
                textDecoration: 'none',
                fontWeight: 'bold'
              }}
            >
              {c.title}
            </Link>
            <button
              onClick={() => handleDelete(c.id)}
              title="Delete course"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: c.color,
                fontSize: '1rem'
              }}
            >
              🗑
            </button>
          </li>
        ))}
      </ul>

      <div style={{ marginTop: 20 }}>
        <Link to="/add">
          <button
            style={{
              fontSize: 48,
              width: 80,
              height: 80,
              borderRadius: '50%',
              cursor: 'pointer'
            }}
            aria-label="Add Outline"
          >
            +
          </button>
        </Link>

        <Link to="/calendar" style={{ marginLeft: 16 }}>
          <button
            style={{
              padding: '0.5rem 1rem',
              fontSize: '1rem',
              cursor: 'pointer'
            }}
          >
            Calendar
          </button>
        </Link>
      </div>

      <div style={{ marginTop: 20 }}>
        <button
          onClick={signOut}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '1rem',
            background: 'tomato',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
