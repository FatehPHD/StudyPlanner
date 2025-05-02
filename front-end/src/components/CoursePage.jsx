import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

export default function CoursePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [course, setCourse] = useState(null)
  const [events, setEvents] = useState([])

  useEffect(() => {
    supabase
      .from('courses')
      .select('title, color')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (!error) setCourse(data)
      })

    supabase
      .from('events')
      .select('name, date, percent')
      .eq('course_id', id)
      .order('date', { ascending: true })
      .then(({ data, error }) => {
        if (!error) setEvents(data || [])
      })
  }, [id])

  const handleDeleteCourse = async () => {
    if (!window.confirm('Delete this course and all its events?')) return
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', id)
    if (!error) navigate('/')
  }

  if (!course) return <p>Loading course…</p>

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ color: course.color }}>
        {course.title}{' '}
        <button
          onClick={handleDeleteCourse}
          title="Delete course"
          style={{
            marginLeft: 12,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: course.color,
            fontSize: '1.2rem'
          }}
        >
          🗑
        </button>
      </h1>

      <h2>Assessments & Deadlines</h2>
      <ul>
        {events.map((e, i) => (
          <li key={i}>
            {e.name} — {e.date} — {e.percent}
          </li>
        ))}
      </ul>
    </div>
  )
}
