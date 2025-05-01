import { useState } from 'react'
import ReactCalendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'

export default function CalendarPage() {
  const [date, setDate] = useState(new Date())

  return (
    <div style={{ padding: 20 }}>
      <h1>Calendar</h1>
      <ReactCalendar
        onChange={setDate}
        value={date}
      />
      <p>Selected date: {date.toDateString()}</p>
    </div>
  )
}
