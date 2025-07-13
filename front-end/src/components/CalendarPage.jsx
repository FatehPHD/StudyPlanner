// src/components/CalendarPage.jsx
import React, { useState, useEffect } from 'react'
import { useAuth }                from '../context/AuthContext.jsx'
import { supabase }               from '../lib/supabaseClient.js'
import toast                      from 'react-hot-toast'

// BigCalendar + DnD + Resize
import {
  Calendar as BigCalendar,
  dateFnsLocalizer,
} from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import 'react-big-calendar/lib/css/react-big-calendar.css'

// date-fns
import format      from 'date-fns/format'
import parse       from 'date-fns/parse'
import startOfWeek from 'date-fns/startOfWeek'
import getDay      from 'date-fns/getDay'
import enUS        from 'date-fns/locale/en-US'

const locales = { 'en-US': enUS }
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
})

const DnDCalendar = withDragAndDrop(BigCalendar)

export default function CalendarPage() {
  const { user }            = useAuth()
  const [events, setEvents] = useState([])

  // controlled navigation & view
  const [date, setDate] = useState(new Date())
  const [view, setView] = useState('month')

  // 1) load events on mount
  useEffect(() => {
    fetchEvents()
  }, [user.id])

  async function fetchEvents() {
    const { data, error } = await supabase
      .from('events')
      .select(`
        id,
        name,
        start_time,
        end_time,
        courses ( title, color )
      `)
      .eq('user_id', user.id)

    if (error) {
      toast.error('Failed to load events')
      return
    }

    setEvents(
      data.map(e => ({
        id:    e.id,
        title: `${e.courses.title}: ${e.name}`,
        start: new Date(e.start_time),
        end:   new Date(e.end_time),
        allDay: false,
        color: e.courses.color
      }))
    )
  }

  // 2) handle drag (move) preserving duration
  async function handleEventDrop({ event, start }) {
    // keep original duration
    const orig = events.find(e => e.id === event.id)
    const duration = orig.end.getTime() - orig.start.getTime()
    const newEnd   = new Date(start.getTime() + duration)

    const { error } = await supabase
      .from('events')
      .update({
        start_time: start.toISOString(),
        end_time:   newEnd.toISOString()
      })
      .eq('id', event.id)

    if (error) {
      toast.error('Could not move event')
    } else {
      setEvents(curr =>
        curr.map(evt =>
          evt.id === event.id
            ? { ...evt, start, end: newEnd }
            : evt
        )
      )
      toast.success('Event moved!')
    }
  }

  // 3) handle resize (stretch)
  async function handleEventResize({ event, start, end }) {
    const { error } = await supabase
      .from('events')
      .update({
        start_time: start.toISOString(),
        end_time:   end.toISOString()
      })
      .eq('id', event.id)

    if (error) {
      toast.error('Could not resize event')
    } else {
      setEvents(curr =>
        curr.map(evt =>
          evt.id === event.id
            ? { ...evt, start, end }
            : evt
        )
      )
      toast.success('Event duration updated!')
    }
  }

  // optional: selecting empty slot
  function handleSelectSlot(slot) {
    console.log('Selected empty slot:', slot)
    // e.g. open a “new event” modal here
  }

  return (
    <div className="container">
      <h1>Calendar</h1>
      <DnDCalendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"

        /* controlled nav & view */
        date={date}
        view={view}
        onNavigate={setDate}
        onView={setView}

        /* drag & drop + resize */
        draggableAccessor={() => true}
        onEventDrop={handleEventDrop}
        resizable
        onEventResize={handleEventResize}

        /* optional: select empty slots */
        selectable
        onSelectSlot={handleSelectSlot}

        /* half-hour grid */
        step={30}
        timeslots={2}

        /* color each event block */
        eventPropGetter={event => ({
          style: {
            backgroundColor: event.color,
            borderColor:     event.color,
            color:           '#fff',
          }
        })}

        style={{ height: 600, margin: '1rem 0' }}
        views={['month','week','day','agenda']}
      />
    </div>
  )
}
