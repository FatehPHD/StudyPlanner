// src/components/TodosPage.jsx
import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import {
  useQuery,
  useMutation,
  useQueryClient
} from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  fetchTodos,
  addTodo,
  toggleTodo,
  deleteTodo
} from '../services/todoApi.js'

export default function TodosPage() {
  const { user } = useAuth()
  const qc = useQueryClient()

  // ── Load all to-dos using the v5 “object” signature ────────────────
  const { data: todos = [], isLoading } = useQuery({
    queryKey: ['todos', user.id],
    queryFn: () => fetchTodos(user.id),
    enabled: !!user.id
  })

  // ── Mutations (already object-based) ─────────────────────────────
  const addMutation = useMutation({
    mutationFn: obj => addTodo(user.id, obj),
    onSuccess: () => {
      toast.success('To-do added!')
      qc.invalidateQueries({ queryKey: ['todos', user.id] })
    }
  })
  const toggleMutation = useMutation({
    mutationFn: ({ id, completed }) => toggleTodo(id, completed),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos', user.id] })
  })
  const deleteMutation = useMutation({
    mutationFn: id => deleteTodo(id),
    onSuccess: () => {
      toast.success('To-do deleted')
      qc.invalidateQueries({ queryKey: ['todos', user.id] })
    }
  })

  const [title, setTitle]     = useState('')
  const [dueDate, setDueDate] = useState('')

  function handleAdd(e) {
    e.preventDefault()
    if (!title || !dueDate) {
      toast.error('Enter both a title and a due date')
      return
    }
    addMutation.mutate({ title, due_date: dueDate })
    setTitle('')
    setDueDate('')
  }

  if (isLoading) return <p>Loading to-dos…</p>

  return (
    <div className="container">
      <h1>All To-Dos</h1>

      {/* Add form */}
      <form onSubmit={handleAdd} className="form-group" style={{ marginBottom: '1.5rem' }}>
        <input
          type="text"
          placeholder="New to-do title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="input-field"
          style={{ width: '40%' }}
        />
        <input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          className="input-field ml-2"
        />
        <button type="submit" className="btn-primary ml-2">
          {addMutation.isLoading ? 'Adding…' : 'Add To-Do'}
        </button>
      </form>

      {/* To-Do list */}
      <ul className="event-list" style={{ listStyle: 'none', padding: 0 }}>
        {todos.map(t => (
          <li
            key={t.id}
            className="todo-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.5rem'
            }}
          >
            <input
              type="checkbox"
              checked={t.completed}
              onChange={() =>
                toggleMutation.mutate({ id: t.id, completed: !t.completed })
              }
            />
            <span style={{
              flex: 1,
              textDecoration: t.completed ? 'line-through' : 'none'
            }}>
              {t.title} — {new Date(t.due_date).toLocaleDateString()}
            </span>
            <button
              onClick={() => deleteMutation.mutate(t.id)}
              className="btn-delete"
              disabled={deleteMutation.isLoading}
            >
              🗑
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
