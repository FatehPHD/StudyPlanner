// EventForm.jsx - Modal form for creating a new event
import React, { useState } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

const personalColors = [
  '#6c757d', '#dc3545', '#fd7e14', '#ffc107', '#28a745',
  '#17a2b8', '#007bff', '#6f42c1', '#e83e8c', '#20c997'
]

export default function EventForm({ slotInfo, onCancel, onSave }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventColor, setEventColor] = useState(personalColors[0])
  const [start, setStart] = useState(new Date(slotInfo.start))
  const [end, setEnd] = useState(new Date(slotInfo.end))

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: 400, borderRadius: 16 }}>
        <h2 className="text-gradient" style={{ textAlign: 'center' }}>Add New Event</h2>
        {/* Color picker */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0' }}>
          {personalColors.map(color => (
            <div
              key={color}
              onClick={() => setEventColor(color)}
              style={{
                width: 24, height: 24, borderRadius: '50%',
                backgroundColor: color, margin: '0 4px',
                border: eventColor === color ? '3px solid #333' : '2px solid #eee',
                cursor: 'pointer'
              }}
            />
          ))}
        </div>
        {/* Event title */}
        <input
          type="text"
          placeholder="Event name"
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={{ width: '100%', marginBottom: 8, borderRadius: 8, padding: 8 }}
        />
        {/* Event description */}
        <input
          type="text"
          placeholder="Description (e.g., Go soccer)"
          value={description}
          onChange={e => setDescription(e.target.value)}
          style={{ width: '100%', marginBottom: 8, borderRadius: 8, padding: 8 }}
        />
        {/* Start time */}
        <label>Start Time:</label>
        <DatePicker
          selected={start}
          onChange={date => setStart(date)}
          showTimeSelect
          timeIntervals={15}
          dateFormat="Pp"
          className="input-field"
          placeholderText="Select start date and time"
          style={{ width: '100%', marginBottom: 8, borderRadius: 8, padding: 8 }}
        />
        {/* End time */}
        <label>End Time:</label>
        <DatePicker
          selected={end}
          onChange={date => setEnd(date)}
          showTimeSelect
          timeIntervals={15}
          dateFormat="Pp"
          className="input-field"
          placeholderText="Select end date and time"
          style={{ width: '100%', marginBottom: 16, borderRadius: 8, padding: 8 }}
        />
        {/* Action buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={onCancel} style={{ flex: 1, marginRight: 8 }}>Cancel</button>
          <button
            onClick={() => onSave({ title, description, start, end, color: eventColor })}
            style={{ flex: 1, background: '#a259f7', color: 'white', borderRadius: 8 }}
            disabled={!title}
          >
            Add Event
          </button>
        </div>
      </div>
    </div>
  )
} 