// src/components/CalendarPage.jsx
import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import toast from 'react-hot-toast'

// BigCalendar + DnD
import {
  Calendar as BigCalendar,
  dateFnsLocalizer,
} from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'

// date-fns imports
import format from 'date-fns/format'
import parse from 'date-fns/parse'
import startOfWeek from 'date-fns/startOfWeek'
import getDay from 'date-fns/getDay'
import enUS from 'date-fns/locale/en-US'    // ← ES import of locale

// BigCalendar CSS
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'

// set up date-fns localizer
const locales = { 'en-US': enUS }
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
})

// wrap calendar for drag&drop
const DragAndDropCalendar = withDragAndDrop(BigCalendar)

export default function CalendarPage() {
  const { user } = useAuth()
  const [events, setEvents] = useState([])

  useEffect(() => {
    fetchEvents()
  }, [user.id])

  async function fetchEvents() {
    const { data, error } = await supabase
      .from('events')
      .select(`
        id,
        name,
        date,
        course_id,
        courses ( title, color )
      `)
      .eq('user_id', user.id)

    if (error) {
      toast.error('Failed to load events')
      return
    }

    setEvents(
      data.map(e => ({
        id: e.id,
        title: `${e.courses.title}: ${e.name}`,
        start: new Date(e.date),
        end:   new Date(e.date),
        allDay: true,
      }))
    )
  }

  async function handleEventDrop({ event, start }) {
    const newDate = start.toISOString().slice(0,10)
    const { error } = await supabase
      .from('events')
      .update({ date: newDate })
      .eq('id', event.id)

    if (error) {
      toast.error('Could not reschedule event')
    } else {
      toast.success('Event moved!')
      setEvents(evts =>
        evts.map(evt =>
          evt.id === event.id
            ? { ...evt, start, end: start }
            : evt
        )
      )
    }
  }

  return (
    <div className="container">
      <h1>Calendar</h1>
      <DragAndDropCalendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 600, margin: '1rem 0' }}
        onEventDrop={handleEventDrop}
        draggableAccessor={() => true}
        defaultView="month"
      />
    </div>
  )
}
