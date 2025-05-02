// src/components/CalendarPage.jsx
import { useState, useEffect } from 'react'
import { useAuth }        from '../context/AuthContext'
import { supabase }       from '../lib/supabaseClient'
import ReactCalendar      from 'react-calendar'
import 'react-calendar/dist/Calendar.css'

export default function CalendarPage() {
  const { user } = useAuth()
  const [date, setDate]     = useState(new Date())
  const [events, setEvents] = useState([])

  useEffect(() => {
    supabase
      .from('events')
      .select(`
        id,
        name,
        date,
        percent,
        course_id,
        courses ( title, color )
      `)
      .eq('user_id', user.id)
      .then(({ data }) => setEvents(data || []))
  }, [user.id])

  // group events by ISO date
  const eventsByDate = events.reduce((acc, e) => {
    (acc[e.date] = acc[e.date] || []).push(e)
    return acc
  }, {})

  return (
    <div style={{ padding: 20 }}>
      <h1>Calendar</h1>

      {/* Larger container */}
      <div
        style={{
          width: '90vw',      // fill 90% of viewport width
          maxWidth: 1200,     // but no more than 1200px
          margin: '0 auto',   // center
        }}
      >
        <ReactCalendar
          onChange={setDate}
          value={date}
          // enlarge the whole calendar
          style={{
            width: '100%',
            fontSize: '1.2rem', // bump base font size
            lineHeight: 1.4      // give a little more breathing room
          }}
          tileContent={({ date: d, view }) => {
            if (view !== 'month') return null

            const key = d.toISOString().slice(0,10)
            const evs = eventsByDate[key] || []
            if (!evs.length) return null

            const tooltip = evs
              .map(e => `${e.courses.title}: ${e.name} (${e.percent.trim()})`)
              .join('\n')

            return (
              <div title={tooltip} style={{ marginTop: 6 }}>
                {evs.map(e => (
                  <div key={e.id} style={{ fontSize: '0.8em' }}>
                    <a
                      href={`/courses/${e.course_id}`}
                      style={{
                        color: e.courses.color,
                        textDecoration: 'none'
                      }}
                    >
                      {`${e.courses.title}: ${e.name}`}
                    </a>
                  </div>
                ))}
              </div>
            )
          }}
        />
      </div>

      <p>Selected date: {date.toDateString()}</p>
    </div>
  )
}
