// CalendarPage.jsx - Displays the interactive calendar for events and deadlines
import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import toast from 'react-hot-toast'
import {
  Calendar as BigCalendar,
  dateFnsLocalizer,
} from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import format from 'date-fns/format'
import parse from 'date-fns/parse'
import startOfWeek from 'date-fns/startOfWeek'
import getDay from 'date-fns/getDay'
import enUS from 'date-fns/locale/en-US'
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
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [courses, setCourses] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [slotInfo, setSlotInfo] = useState(null)
  const [date, setDate] = useState(new Date())
  const [view, setView] = useState('month')
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [showEventModal, setShowEventModal] = useState(false)

  // Fetch events and courses on mount/user change
  useEffect(() => {
    fetchEvents()
    fetchCourses()
  }, [user.id])

  // Fetch all events for the user
  async function fetchEvents() {
    const { data, error } = await supabase
      .from('events')
      .select('id, name, start_time, end_time, color, course_id, courses ( title, color )')
      .eq('user_id', user.id)
    if (error) return toast.error('Failed to load events')
    setEvents(
      data.map(e => ({
        id: e.id,
        title: e.courses ? `${e.courses.title}: ${e.name}` : e.name,
        start: new Date(e.start_time),
        end: new Date(e.end_time),
        allDay: false,
        color: e.courses?.color || e.color || '#6c757d',
        course_id: e.course_id
      }))
    )
  }

  // Fetch all courses for the user
  async function fetchCourses() {
    const { data, error } = await supabase
      .from('courses')
      .select('id, title')
      .eq('user_id', user.id)
    if (!error) setCourses(data)
  }

  // Handle drag-and-drop move
  async function handleEventDrop({ event, start }) {
    const orig = events.find(e => e.id === event.id)
    const dur = orig.end - orig.start
    const newEnd = new Date(start.getTime() + dur)
    const { error } = await supabase
      .from('events')
      .update({
        start_time: start.toISOString(),
        end_time: newEnd.toISOString()
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

  // Handle resize
  async function handleEventResize({ event, start, end }) {
    const { error } = await supabase
      .from('events')
      .update({
        start_time: start.toISOString(),
        end_time: end.toISOString()
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

  // Open event creation form for empty slot
  function handleSelectSlot(slot) {
    setSlotInfo(slot)
    setIsModalOpen(true)
  }

  // Show event details modal
  function handleEventClick(event) {
    setSelectedEvent(event)
    setShowEventModal(true)
  }
  function handleCloseModal() {
    setShowEventModal(false)
    setSelectedEvent(null)
  }

  // Delete a personal event
  async function handleDeleteEvent(eventId) {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)
    if (error) return toast.error('Delete failed')
    setEvents(evts => evts.filter(evt => evt.id !== eventId))
    toast.success('Deleted!')
    handleCloseModal()
  }

  // Create a new event
  async function handleCreate({ title, description, start, end, color }) {
    const insertData = {
      user_id: user.id,
      name: title,
      description: description,
      start_time: new Date(start).toISOString(),
      end_time: new Date(end).toISOString(),
      color: color
    }
    const { data, error } = await supabase
      .from('events')
      .insert(insertData)
      .select('id, name, description, start_time, end_time, color')
      .single()
    if (error) {
      console.error('Event create error:', error)
      return toast.error(`Create failed: ${error.message}`)
    }
    setEvents(evts => [
      {
        id: data.id,
        title: data.name,
        description: data.description,
        start: new Date(start),
        end: new Date(end),
        allDay: false,
        color: data.color,
      },
      ...evts
    ])
    toast.success('Created!')
    setIsModalOpen(false)
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 className="playful-heading">Calendar</h1>
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
          onSelectEvent={handleEventClick}
          step={30}
          timeslots={2}
          eventPropGetter={event => ({
            style: {
              backgroundColor: event.color,
              borderColor: event.color,
              color: '#fff',
            }
          })}
          style={{ height: 600, margin: '1rem 0' }}
          views={['month', 'week', 'day', 'agenda']}
        />
      </div>
      {/* Event creation modal */}
      {isModalOpen && slotInfo && (
        <EventForm
          slotInfo={slotInfo}
          courses={courses}
          onCancel={() => setIsModalOpen(false)}
          onSave={handleCreate}
        />
      )}
      {/* Event details modal */}
      {showEventModal && selectedEvent && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: 400 }}>
            <h2>Event Details</h2>
            <div style={{ marginBottom: 16 }}>
              <div style={{
                width: 24, height: 24, backgroundColor: selectedEvent.color,
                borderRadius: 4, marginBottom: 8
              }} />
              <h3 style={{ margin: '8px 0', color: '#333' }}>{selectedEvent.title}</h3>
              <div style={{ color: '#666', fontSize: 14 }}>
                <div><strong>Start:</strong> {new Date(selectedEvent.start).toLocaleString()}</div>
                <div><strong>End:</strong> {new Date(selectedEvent.end).toLocaleString()}</div>
                {!selectedEvent.course_id && (
                  <div><strong>Type:</strong> Personal Event</div>
                )}
              </div>
            </div>
            <div className="modal-actions">
              <button onClick={handleCloseModal} style={{ marginRight: 8 }}>Close</button>
              {!selectedEvent.course_id && (
                <button
                  onClick={() => handleDeleteEvent(selectedEvent.id)}
                  style={{
                    backgroundColor: '#dc3545', color: 'white', border: 'none',
                    padding: '8px 16px', borderRadius: 4, cursor: 'pointer'
                  }}
                >
                  Delete Event
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
