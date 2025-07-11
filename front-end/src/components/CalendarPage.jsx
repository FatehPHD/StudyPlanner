import { useState, useEffect } from 'react'
import { useAuth }             from '../context/AuthContext.jsx'
import { supabase }            from '../lib/supabaseClient.js'
import ReactCalendar           from 'react-calendar'
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

  const eventsByDate = events.reduce((acc, e) => {
    (acc[e.date] = acc[e.date] || []).push(e)
    return acc
  }, {})

  return (
    <div className="container">
      <h1>Calendar</h1>
      <div className="calendar-container">
        <ReactCalendar
          onChange={setDate}
          value={date}
          className="calendar-root"
          tileContent={({ date: d, view }) => {
            if (view !== 'month') return null
            const key = d.toISOString().slice(0,10)
            const evs = eventsByDate[key] || []
            if (!evs.length) return null

            const tooltip = evs
              .map(e => `${e.courses.title}: ${e.name} (${e.percent.trim()})`)
              .join('\n')

            return (
              <div title={tooltip}>
                {evs.map(e => (
                  <div key={e.id} className="tile-event">
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
