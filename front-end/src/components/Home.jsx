// Home.jsx - Dashboard for upcoming to-dos, deadlines, and courses
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import toast from 'react-hot-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchTodos, toggleTodo } from '../services/todoApi.js'
import { fetchUpcomingEvents } from '../services/eventApi.js'

// Fetch all courses for the user
async function fetchCourses(userId) {
  const { data, error } = await supabase
    .from('courses')
    .select('id, title, color, inserted_at')
    .eq('user_id', userId)
    .order('inserted_at', { ascending: false })
  if (error) throw error
  return data
}
// Delete a course by ID
async function deleteCourse(courseId) {
  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('id', courseId)
  if (error) throw error
  return courseId
}

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [hoverCourse, setHoverCourse] = useState(null)
  const [hoverDelete, setHoverDelete] = useState(null)

  // To-Dos for the user
  const { data: todos = [] } = useQuery({
    queryKey: ['todos', user.id],
    queryFn: () => fetchTodos(user.id),
    enabled: !!user.id
  })
  const toggleMutation = useMutation({
    mutationFn: ({ id, completed }) => toggleTodo(id, completed),
    onSuccess: () => qc.invalidateQueries(['todos', user.id])
  })

  // Upcoming deadlines (events) for the user
  const {
    data: upcoming = [],
    isFetching: loadingUpcoming
  } = useQuery({
    queryKey: ['upcoming', user.id],
    queryFn: () => fetchUpcomingEvents(user.id, 7),
    enabled: !!user.id
  })

  // Courses for the user
  const {
    data: courses = [],
    isLoading: loadingC,
    isError: errorC
  } = useQuery({
    queryKey: ['courses', user.id],
    queryFn: () => fetchCourses(user.id),
    enabled: !!user.id
  })
  const deleteMutation = useMutation({
    mutationFn: deleteCourse,
    onMutate: async courseId => {
      await qc.cancelQueries(['courses', user.id])
      const prev = qc.getQueryData(['courses', user.id])
      qc.setQueryData(['courses', user.id], old =>
        old.filter(c => c.id !== courseId)
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      qc.setQueryData(['courses', user.id], ctx.prev)
      toast.error('Failed to delete course')
    },
    onSuccess: () => toast.success('Course deleted'),
    onSettled: () => qc.invalidateQueries(['courses', user.id])
  })

  if (loadingC) return <p>Loading courses…</p>
  if (errorC) return <p>Failed to load your courses.</p>

  // Helper to darken a hex color
  function darkenColor(hex, amt = -30) {
    let col = hex.replace('#', '')
    if (col.length === 3) col = col.split('').map(x => x + x).join('')
    let num = parseInt(col, 16)
    let r = Math.max(0, Math.min(255, ((num >> 16) & 0xff) + amt))
    let g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amt))
    let b = Math.max(0, Math.min(255, (num & 0xff) + amt))
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`
  }

  return (
    <div className="container center-text">
      {/* Upcoming To-Dos */}
      <div className="card" style={{ textAlign: 'left' }}>
        <h2 className="playful-heading">Upcoming To-Dos</h2>
        {todos.length > 0 ? (
          todos.slice(0, 3).map(t => (
            <div key={t.id} className="todo-card">
              <input
                type="checkbox"
                checked={t.completed}
                onChange={() =>
                  toggleMutation.mutate({ id: t.id, completed: !t.completed })
                }
                className="fun-checkbox"
              />
              <div className="todo-card-body">
                <span className={t.completed ? 'completed' : ''}>
                  {t.title}
                </span>
                <small>
                  {new Date(t.due_date).toLocaleDateString()}
                </small>
              </div>
            </div>
          ))
        ) : (
          <p>No to-dos — enjoy your day!</p>
        )}
        <button
          onClick={() => navigate('/todos')}
          className="btn-fun"
          style={{ marginTop: '0.5rem' }}
        >
          View All & Add New
        </button>
      </div>

      {/* Upcoming Deadlines */}
      <div className="card" style={{ textAlign: 'left' }}>
        <h2 className="playful-heading">Upcoming Deadlines</h2>
        {loadingUpcoming ? (
          <p>Loading deadlines…</p>
        ) : upcoming.length > 0 ? (
          upcoming.map(ev => {
            const dt = new Date(ev.start_time)
            const label = isNaN(dt)
              ? 'Unknown date'
              : dt.toLocaleDateString()
            return (
              <div
                key={ev.id}
                className="todo-card"
                style={{ borderLeft: `4px solid ${ev.courses?.color || '#6c757d'}` }}
              >
                <div>
                  {ev.courses ? (
                    <>
                      <strong style={{ color: ev.courses.color }}>
                        {ev.courses.title}:
                      </strong>{' '}
                      {ev.name}
                    </>
                  ) : (
                    <>
                      <strong>{ev.name}</strong>
                      {ev.description && (
                        <span style={{ color: '#666', fontSize: '0.9em' }}>
                          {' '}— {ev.description}
                        </span>
                      )}
                    </>
                  )}
                </div>
                <small>{label}</small>
              </div>
            )
          })
        ) : (
          <p>No deadlines in the next week 👍</p>
        )}
      </div>

      {/* Your Courses */}
      <h2 className="playful-heading">Your Courses</h2>
      {courses.length > 0 ? (
        <div className="card-list">
          {courses.map(c => {
            const isHovered = hoverDelete === c.id
            const btnBg = isHovered ? darkenColor(c.color, -30) : c.color
            return (
              <div
                key={c.id}
                className="card"
                style={{ border: `2px solid ${c.color}`, display: 'flex', alignItems: 'stretch', overflow: 'hidden', marginBottom: 0 }}
              >
                {/* Course button (left) */}
                <button
                  className="course-card-btn"
                  onClick={() => navigate(`/courses/${c.id}`)}
                  onMouseEnter={() => setHoverCourse(c.id)}
                  onMouseLeave={() => setHoverCourse(null)}
                  style={{
                    flex: '0 0 75%',
                    border: 'none',
                    background: 'transparent',
                    backgroundColor: 'transparent',
                    padding: '1rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '1.25rem',
                    fontWeight: 600
                  }}
                >
                  <span style={{ color: hoverCourse === c.id ? c.color : undefined }}>
                  {c.title}
                  </span>
                </button>
                {/* Delete button (right) */}
                <button
                  onClick={() => deleteMutation.mutate(c.id)}
                  onMouseEnter={() => setHoverDelete(c.id)}
                  onMouseLeave={() => setHoverDelete(null)}
                  disabled={deleteMutation.isLoading}
                  style={{
                    flex: '0 0 25%',
                    padding: '0.5rem',
                    fontSize: '1.2rem',
                    lineHeight: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '0.75rem',
                    margin: 0,
                    background: btnBg,
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 700,
                    boxShadow: '0 2px 8px 0 rgba(0,0,0,0.10)'
                  }}
                >
                  🗑
                </button>
              </div>
            )
          })}
        </div>
      ) : (
        <p>No courses yet — click the “Add Course” in the menu to add one!</p>
      )}
    </div>
  )
}
