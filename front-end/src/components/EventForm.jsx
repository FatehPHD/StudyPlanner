// src/components/EventForm.jsx
import React, { useState } from 'react'

export default function EventForm({
  slotInfo,    // { start: Date, end: Date }
  courses,     // Array<{ id, title }>
  onCancel,    // () => void
  onSave       // ({ title, courseId, start, end }) => void
}) {
  const [title, setTitle]       = useState('')
  const [courseId, setCourseId] = useState(courses[0]?.id || '')
  const [start, setStart]       = useState(slotInfo.start.toISOString().slice(0,16))
  const [end, setEnd]           = useState(slotInfo.end.toISOString().slice(0,16))

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>New Event</h2>
        <label>
          Course
          <select value={courseId} onChange={e => setCourseId(e.target.value)}>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </label>
        <label>
          Title
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </label>
        <label>
          Start
          <input
            type="datetime-local"
            value={start}
            onChange={e => setStart(e.target.value)}
          />
        </label>
        <label>
          End
          <input
            type="datetime-local"
            value={end}
            onChange={e => setEnd(e.target.value)}
          />
        </label>
        <div className="modal-actions">
          <button onClick={onCancel}>Cancel</button>
          <button
            onClick={() => onSave({ title, courseId, start, end })}
            disabled={!title}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
