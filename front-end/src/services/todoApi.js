// todoApi.js - To-do related API calls for Supabase
import { supabase } from '../lib/supabaseClient.js'

// Fetch all to-dos for a user
export async function fetchTodos(userId) {
  const { data, error } = await supabase
    .from('todos')
    .select('id, title, due_date, completed')
    .eq('user_id', userId)
    .order('due_date', { ascending: true })
  if (error) throw error
  return data
}
// Add a new to-do
export async function addTodo(userId, { title, due_date }) {
  const { data, error } = await supabase
    .from('todos')
    .insert([{ user_id: userId, title, due_date }])
    .single()
  if (error) throw error
  return data
}
// Toggle a to-do's completion
export async function toggleTodo(id, completed) {
  const { data, error } = await supabase
    .from('todos')
    .update({ completed })
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}
// Delete a to-do
export async function deleteTodo(id) {
  const { error } = await supabase
    .from('todos')
    .delete()
    .eq('id', id)
  if (error) throw error
  return id
}
