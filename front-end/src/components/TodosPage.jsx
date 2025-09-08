// TodosPage.jsx - Full to-do list management for the user
import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
  // Load all to-dos for the user
  const { data: todos = [], isLoading } = useQuery({
    queryKey: ['todos', user.id],
    queryFn: () => fetchTodos(user.id),
    enabled: !!user.id
  })
  // Add a new to-do
  const addMutation = useMutation({
    mutationFn: obj => addTodo(user.id, obj),
    onSuccess: () => {
      toast.success('To-do added!')
      qc.invalidateQueries({ queryKey: ['todos', user.id] })
    }
  })
  // Toggle a to-do's completion
  const toggleMutation = useMutation({
    mutationFn: ({ id, completed }) => toggleTodo(id, completed),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos', user.id] })
  })
  // Delete a to-do
  const deleteMutation = useMutation({
    mutationFn: id => deleteTodo(id),
    onSuccess: () => {
      toast.success('To-do deleted')
      qc.invalidateQueries({ queryKey: ['todos', user.id] })
    }
  })
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  // Handle add form submit
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
      <div className="card" style={{ maxWidth: 600, margin: '0 auto' }}>
        <h1 className="playful-heading">All To-Dos</h1>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="To-do title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="input-field"
            style={{ flex: 2, minWidth: 120 }}
          />
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className={`input-field ${!dueDate || dueDate.trim() === '' ? 'empty-date' : ''}`}
            style={{ flex: 1, minWidth: 120 }}
          />
          <button type="submit" className="btn-fun">
            Add
          </button>
        </form>
        <div className="card-list">
          {todos.length > 0 ? (
            todos.map(t => (
              <div key={t.id} className="todo-card" style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={t.completed}
                  onChange={() => toggleMutation.mutate({ id: t.id, completed: !t.completed })}
                  className="fun-checkbox"
                />
                <div className="todo-card-body" style={{ flex: 1 }}>
                  <span className={t.completed ? 'completed' : ''}>{t.title}</span>
                  <small>{new Date(t.due_date).toLocaleDateString()}</small>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(t.id)}
                  className="btn-fun"
                  style={{ padding: '0.4em 1em', fontSize: '1.1em', marginLeft: '0.5em' }}
                  title="Delete"
                >
                  🗑
                </button>
              </div>
            ))
          ) : (
            <p>No to-dos yet!</p>
          )}
        </div>
      </div>
    </div>
  )
}
