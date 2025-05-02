// src/components/CalendarPage.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import ReactCalendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'

export default function CalendarPage() {
  const { user } = useAuth()
  const [date, setDate] = useState(new Date())
  const [events, setEvents] = useState([])

  useEffect(() => {
    // load all this user’s events
    supabase
      .from('events')
      .select('id, name, date, percent, course_id')
      .eq('user_id', user.id)
      .then(({ data }) => setEvents(data || []))
  }, [user.id])

  // group by ISO date
  const eventsByDate = events.reduce((acc, e) => {
    (acc[e.date] = acc[e.date] || []).push(e)
    return acc
  }, {})

  return (
    <div style={{ padding: 20 }}>
      <h1>Calendar</h1>
      <ReactCalendar
        onChange={setDate}
        value={date}
        tileContent={({ date: d, view }) => {
          if (view !== 'month') return null
          const key = d.toISOString().slice(0, 10) // “YYYY-MM-DD”
          const evs = eventsByDate[key] || []
          if (evs.length === 0) return null

          // Build a tooltip string: “Quiz 1 (7.5 %), Assignment 1 (6.67 %)…”
          const tooltip = evs
            .map(e => `${e.name} (${e.percent.trim()})`)
            .join('\n')

          return (
            <div title={tooltip} style={{ marginTop: 4 }}>
              {evs.map(e => (
                <div key={e.id} style={{ fontSize: '0.6em' }}>
                  <a
                    href={`/courses/${e.course_id}`}
                    style={{ color: '#0066cc', textDecoration: 'none' }}
                  >
                    {e.name}
                  </a>
                </div>
              ))}
            </div>
          )
        }}
      />
      <p>Selected date: {date.toDateString()}</p>
    </div>
  )
}
