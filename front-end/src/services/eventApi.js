// src/services/eventApi.js
import { supabase } from '../lib/supabaseClient.js'

/**
 * Fetch events for the given user that are due between today and `daysOut` days from now.
 * @param {string} userId  Supabase auth user ID
 * @param {number} daysOut Number of days ahead to include
 * @returns {Promise<Array<{id, name, date}>>}
 */
export async function fetchUpcomingEvents(userId, daysOut = 7) {
  const today = new Date().toISOString().slice(0, 10)
  const cutoff = new Date(Date.now() + daysOut * 24 * 60 * 60e3)
    .toISOString()
    .slice(0, 10)

  const { data, error } = await supabase
    .from('events')
    .select('id, name, date')
    .eq('user_id', userId)
    .gte('date', today)
    .lte('date', cutoff)
    .order('date', { ascending: true })

  if (error) throw error
  return data
}
