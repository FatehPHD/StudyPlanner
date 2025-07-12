// src/services/todoApi.js
import { supabase } from '../lib/supabaseClient.js'

export async function fetchTodos(userId) {
  const { data, error } = await supabase
    .from('todos')
    .select('id, title, due_date, completed')
    .eq('user_id', userId)
    .order('due_date', { ascending: true })
  if (error) throw error
  return data
}

export async function addTodo(userId, { title, due_date }) {
  const { data, error } = await supabase
    .from('todos')
    .insert([{ user_id: userId, title, due_date }])
  if (error) throw error
  return data[0]
}

export async function toggleTodo(id, completed) {
  const { data, error } = await supabase
    .from('todos')
    .update({ completed })
    .eq('id', id)
  if (error) throw error
  return data[0]
}

export async function deleteTodo(id) {
  const { error } = await supabase
    .from('todos')
    .delete()
    .eq('id', id)
  if (error) throw error
  return id
}
