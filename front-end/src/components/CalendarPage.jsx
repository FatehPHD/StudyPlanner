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

import EventForm from './EventForm.jsx'

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
  const [courses, setCourses] = useState([])

  // modal + slot state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [slotInfo, setSlotInfo]       = useState(null)

  // navigation & view
  const [date, setDate] = useState(new Date())
  const [view, setView] = useState('month')

  useEffect(() => {
    fetchEvents()
    fetchCourses()
  }, [user.id])

  async function fetchEvents() {
    const { data, error } = await supabase
      .from('events')
      .select(`id, name, start_time, end_time, courses ( title, color )`)
      .eq('user_id', user.id)
    if (error) return toast.error('Failed to load events')
    setEvents(
      data.map(e => ({
        id:     e.id,
        title:  `${e.courses.title}: ${e.name}`,
        start:  new Date(e.start_time),
        end:    new Date(e.end_time),
        allDay: false,
        color:  e.courses.color,
      }))
    )
  }

  async function fetchCourses() {
    const { data, error } = await supabase
      .from('courses')
      .select('id, title')
      .eq('user_id', user.id)
    if (!error) setCourses(data)
  }

  // Drag → move
  async function handleEventDrop({ event, start }) {
    const orig = events.find(e => e.id === event.id)
    const dur  = orig.end - orig.start
    const newEnd = new Date(start.getTime() + dur)

    const { error } = await supabase
      .from('events')
      .update({
        start_time: start.toISOString(),
        end_time:   newEnd.toISOString()
      })
      .eq('id', event.id)
    if (error) return toast.error('Move failed')

    setEvents(evts =>
      evts.map(evt =>
        evt.id === event.id
          ? { ...evt, start, end: newEnd }
          : evt
      )
    )
    toast.success('Moved!')
  }

  // Resize → stretch
  async function handleEventResize({ event, start, end }) {
    const { error } = await supabase
      .from('events')
      .update({
        start_time: start.toISOString(),
        end_time:   end.toISOString()
      })
      .eq('id', event.id)
    if (error) return toast.error('Resize failed')

    setEvents(evts =>
      evts.map(evt =>
        evt.id === event.id
          ? { ...evt, start, end }
          : evt
      )
    )
    toast.success('Duration updated!')
  }

  // Select empty slot → open form
  function handleSelectSlot(slot) {
    setSlotInfo(slot)
    setIsModalOpen(true)
  }

  // Create new event
  async function handleCreate({ title, courseId, start, end }) {
    const { data, error } = await supabase
      .from('events')
      .insert({
        user_id:    user.id,
        name:       title,
        course_id:  courseId,
        start_time: new Date(start).toISOString(),
        end_time:   new Date(end).toISOString()
      })
      .select('id, courses ( title, color )')
      .single()
    if (error) return toast.error('Create failed')

    setEvents(evts => [
      {
        id:     data.id,
        title:  `${data.courses.title}: ${title}`,
        start:  new Date(start),
        end:    new Date(end),
        allDay: false,
        color:  data.courses.color,
      },
      ...evts
    ])
    toast.success('Created!')
    setIsModalOpen(false)
  }

  return (
    <div className="container">
      <h1>Calendar</h1>
      <DnDCalendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"

        date={date}
        view={view}
        onNavigate={setDate}
        onView={setView}

        draggableAccessor={() => true}
        onEventDrop={handleEventDrop}

        resizable
        onEventResize={handleEventResize}

        selectable
        onSelectSlot={handleSelectSlot}

        step={30}
        timeslots={2}

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

      {isModalOpen && slotInfo && (
        <EventForm
          slotInfo={slotInfo}
          courses={courses}
          onCancel={() => setIsModalOpen(false)}
          onSave={handleCreate}
        />
      )}
    </div>
  )
}
