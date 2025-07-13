import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth }           from '../context/AuthContext.jsx'
import { supabase }          from '../lib/supabaseClient.js'
import toast                 from 'react-hot-toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { fetchTodos, toggleTodo }  from '../services/todoApi.js'
import { fetchUpcomingEvents }     from '../services/eventApi.js'

// ── Courses Fetch/Delete ──────────────────────────────────────────────────
async function fetchCourses(userId) {
  const { data, error } = await supabase
    .from('courses')
    .select('id, title, color, inserted_at')
    .eq('user_id', userId)
    .order('inserted_at', { ascending: false })
  if (error) throw error
  return data
}
async function deleteCourse(courseId) {
  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('id', courseId)
  if (error) throw error
  return courseId
}

export default function Home() {
  const { user }     = useAuth()
  const navigate     = useNavigate()
  const qc           = useQueryClient()
  const [hoverCourse, setHoverCourse] = useState(null)
  const [hoverDelete, setHoverDelete] = useState(null)

  // ── To-Dos ────────────────────────────────────────────────────────
  const { data: todos = [] } = useQuery({
    queryKey: ['todos', user.id],
    queryFn:  () => fetchTodos(user.id),
    enabled:  !!user.id
  })
  const toggleMutation = useMutation({
    mutationFn: ({ id, completed }) => toggleTodo(id, completed),
    onSuccess:  () => qc.invalidateQueries(['todos', user.id])
  })

  // ── Upcoming Deadlines ───────────────────────────────────────────
  const {
    data: upcoming = [],
    isFetching: loadingUpcoming
  } = useQuery({
    queryKey: ['upcoming', user.id],
    queryFn:  () => fetchUpcomingEvents(user.id, 7),
    enabled:  !!user.id
  })

  // ── Courses ──────────────────────────────────────────────────────
  const {
    data: courses       = [],
    isLoading: loadingC,
    isError:   errorC
  } = useQuery({
    queryKey: ['courses', user.id],
    queryFn:  () => fetchCourses(user.id),
    enabled:  !!user.id
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
  if (errorC)   return <p>Failed to load your courses.</p>

  return (
    <div className="container center-text">
      {/* ── Upcoming To-Dos ─────────────────────────────────────── */}
      <div className="reminders-widget" style={{ textAlign: 'left', margin: '2rem 0' }}>
        <h2>Upcoming To-Dos</h2>
        {todos.length > 0 ? (
          todos.slice(0, 3).map(t => (
            <div key={t.id} className="todo-card">
              <input
                type="checkbox"
                checked={t.completed}
                onChange={() =>
                  toggleMutation.mutate({ id: t.id, completed: !t.completed })
                }
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
          className="btn-link"
          style={{ padding: 0, marginTop: '0.5rem' }}
        >
          View All & Add New
        </button>
      </div>

      {/* ── Upcoming Deadlines ─────────────────────────────────── */}
      <div className="reminders-widget" style={{ textAlign: 'left', margin: '2rem 0' }}>
        <h2>Upcoming Deadlines</h2>
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
                style={{
                  display:        'flex',
                  justifyContent: 'space-between',
                  alignItems:     'center',
                  padding:        '0.75rem 1rem',
                  marginBottom:   '0.75rem',
                  background:     'var(--surface)',
                  borderLeft:     `4px solid ${ev.courses.color}`
                }}
              >
                <div>
                  <strong style={{ color: ev.courses.color }}>
                    {ev.courses.title}:
                  </strong>{' '}
                  {ev.name}
                </div>
                <small>{label}</small>
              </div>
            )
          })
        ) : (
          <p>No deadlines in the next week 👍</p>
        )}
      </div>

      {/* ── Your Courses ───────────────────────────────────────── */}
      <h2>Your Courses</h2>
      {courses.length > 0 ? (
        <div className="course-list">
          {courses.map(c => {
            const lightBg = `${c.color}20`
            return (
              <div
                key={c.id}
                style={{
                  display:      'flex',
                  alignItems:   'stretch',
                  border:       `2px solid ${c.color}`,
                  borderRadius: '0.75rem',
                  overflow:     'hidden',
                  marginBottom: '1rem'
                }}
              >
                {/* Left (75%): Course button */}
                <button
                  onClick={() => navigate(`/courses/${c.id}`)}
                  onMouseEnter={() => setHoverCourse(c.id)}
                  onMouseLeave={() => setHoverCourse(null)}
                  style={{
                    flex:        '0 0 75%',
                    border:      'none',
                    background:  hoverCourse === c.id ? lightBg : 'transparent',
                    padding:     '1rem',
                    textAlign:   'left',
                    cursor:      'pointer',
                    fontSize:    '1.25rem',
                    fontWeight:  600,
                    borderRight: `1px solid ${c.color}`
                  }}
                >
                  {c.title}
                </button>

                {/* Right (25%): Delete button */}
                <button
                  onClick={() => deleteMutation.mutate(c.id)}
                  onMouseEnter={() => setHoverDelete(c.id)}
                  onMouseLeave={() => setHoverDelete(null)}
                  disabled={deleteMutation.isLoading}
                  style={{
                    flex:            '0 0 25%',
                    border:          'none',
                    background:      hoverDelete === c.id ? lightBg : 'transparent',
                    padding:         '0.5rem',
                    cursor:          'pointer',
                    fontSize:        '1rem',
                    lineHeight:      1,
                    display:         'flex',
                    alignItems:      'center',
                    justifyContent:  'center'
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
