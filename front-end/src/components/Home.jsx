// src/components/Home.jsx
import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import toast from 'react-hot-toast'
import {
  useQuery,
  useMutation,
  useQueryClient
} from '@tanstack/react-query'

import { fetchTodos, toggleTodo } from '../services/todoApi.js'
import { fetchUpcomingEvents }    from '../services/eventApi.js'

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
  const { user, signOut } = useAuth()
  const navigate          = useNavigate()
  const queryClient       = useQueryClient()

  // ── To-Dos Query & Toggle Mutation ───────────────────────────────────
  const { data: todos = [] } = useQuery({
    queryKey: ['todos', user.id],
    queryFn:  () => fetchTodos(user.id),
    enabled:  !!user.id
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, completed }) => toggleTodo(id, completed),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos', user.id] })
  })

  // ── Upcoming Deadlines Query ─────────────────────────────────────────
  const { data: upcoming = [], isFetching: loadingUpcoming } = useQuery({
    queryKey: ['upcoming', user.id],
    queryFn:  () => fetchUpcomingEvents(user.id, 7),
    enabled:  !!user.id
  })

  // ── Courses Query & Delete Mutation ─────────────────────────────────
  const {
    data: courses = [],
    isLoading: loadingCourses,
    isError:  errorCourses
  } = useQuery({
    queryKey: ['courses', user.id],
    queryFn:  () => fetchCourses(user.id),
    enabled:  !!user.id
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCourse,
    onMutate: async courseId => {
      await queryClient.cancelQueries({ queryKey: ['courses', user.id] })
      const previous = queryClient.getQueryData(['courses', user.id])
      queryClient.setQueryData(
        ['courses', user.id],
        old => old.filter(c => c.id !== courseId)
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['courses', user.id], context.previous)
      toast.error('Failed to delete course')
    },
    onSuccess: () => {
      toast.success('Course deleted')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['courses', user.id] })
    }
  })

  if (loadingCourses) return <p>Loading courses…</p>
  if (errorCourses)   return <p>Failed to load your courses.</p>

  return (
    <div className="container center-text">
      {/* ── Upcoming To-Dos Widget ─────────────────────────────────────── */}
      <div className="reminders-widget" style={{ textAlign: 'left', margin: '2rem 0' }}>
        <h2>Upcoming To-Dos</h2>
        {todos.length > 0 ? (
          todos.slice(0, 3).map(t => (
            <div
              key={t.id}
              className="todo-item"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}
            >
              <input
                type="checkbox"
                checked={t.completed}
                onChange={() =>
                  toggleMutation.mutate({ id: t.id, completed: !t.completed })
                }
              />
              <span style={{
                textDecoration: t.completed ? 'line-through' : 'none',
                flex: 1
              }}>
                {t.title}
              </span>
              <small>{new Date(t.due_date).toLocaleDateString()}</small>
            </div>
          ))
        ) : (
          <p>No to-dos—enjoy your day!</p>
        )}
        <button
          onClick={() => navigate('/todos')}
          className="btn-link"
          style={{ padding: 0, marginTop: '0.5rem' }}
        >
          View All & Add New
        </button>
      </div>

      {/* ── Upcoming Deadlines Widget ───────────────────────────────────── */}
      <div className="reminders-widget" style={{ textAlign: 'left', margin: '2rem 0' }}>
        <h2>Upcoming Deadlines</h2>
        {loadingUpcoming ? (
          <p>Loading deadlines…</p>
        ) : upcoming.length > 0 ? (
          upcoming.map(ev => (
            <div key={ev.id} style={{ marginBottom: '0.5rem' }}>
              <strong>{ev.name}</strong> — due {new Date(ev.date).toLocaleDateString()}
            </div>
          ))
        ) : (
          <p>No deadlines in the next week 👍</p>
        )}
      </div>

      {/* ── Your Courses ─────────────────────────────────────────────────── */}
      <h2>Your Courses</h2>
      {courses.length > 0 ? (
        <ul className="course-list">
          {courses.map(c => (
            <li key={c.id} className="course-item">
              <Link
                to={`/courses/${c.id}`}
                className="course-link"
                style={{ color: c.color }}
              >
                {c.title}
              </Link>
              <button
                onClick={() => deleteMutation.mutate(c.id)}
                className="btn-delete"
                style={{ color: c.color }}
                title="Delete course"
                disabled={deleteMutation.isLoading}
              >
                {deleteMutation.isLoading ? '…' : '🗑'}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>No courses yet — click the “+” below to add one!</p>
      )}

      {/* ── Add & Calendar Buttons ───────────────────────────────────────── */}
      <div className="actions" style={{ marginTop: '2rem' }}>
        <Link to="/add">
          <button className="btn-circle" aria-label="Add Outline">+</button>
        </Link>
        <Link to="/calendar">
          <button className="btn-primary ml-4">Calendar</button>
        </Link>
      </div>

      {/* ── Sign Out ─────────────────────────────────────────────────────── */}
      <div className="actions" style={{ marginTop: '1rem' }}>
        <button onClick={signOut} className="btn-signout">
          Sign Out
        </button>
      </div>
    </div>
  )
}
