// src/services/eventApi.js
import { supabase } from '../lib/supabaseClient.js'

/**
 * Fetch events for the given user that are due between today and `daysOut` days from now,
 * including the course’s title & color so we can style reminders & calendar entries.
 *
 * @param {string} userId   Supabase auth user ID
 * @param {number} daysOut  Number of days ahead to include (defaults to 7)
 * @returns {Promise<Array<{
 *   id: string,
 *   name: string,
 *   start_time: string,
 *   end_time: string,
 *   courses: { title: string, color: string }
 * }>>}
 */
export async function fetchUpcomingEvents(userId, daysOut = 7) {
  const today  = new Date().toISOString().slice(0, 10)
  const cutoff = new Date(Date.now() + daysOut * 24 * 60 * 60_000)
    .toISOString()
    .slice(0, 10)

  const { data, error } = await supabase
    .from('events')
    .select(`
      id,
      name,
      start_time,
      end_time,
      courses ( title, color )
    `)                   // join in both title & color
    .eq('user_id', userId)
    .gte('start_time', today)
    .lte('start_time', cutoff)
    .order('start_time', { ascending: true })

  if (error) throw error
  return data
}
