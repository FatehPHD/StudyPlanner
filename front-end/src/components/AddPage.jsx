// front-end/src/components/AddPage.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import PlannerForm from './PlannerForm'

export default function AddPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [title, setTitle]   = useState('')
  const [items, setItems]   = useState([])
  const [saving, setSaving] = useState(false)

  // Save course + events to Supabase, assign a random pastel color
  async function handleSubmitOutline(parsed) {
    if (!title.trim()) {
      alert('Please enter a course title')
      return
    }
    setSaving(true)

    // generate a darker pastel color
    const color = `hsl(${Math.floor(Math.random()*360)}, 70%, 60%)`


    // 1) Insert the course row (with color)
    const { data: courseData, error: courseErr } = await supabase
      .from('courses')
      .insert([{ user_id: user.id, title, color }])
      .select('id, color')

    if (courseErr || !courseData?.length) {
      console.error(courseErr)
      alert('Failed to save course')
      setSaving(false)
      return
    }
    const course_id = courseData[0].id

    // 2) Insert all parsed events
    const toInsert = parsed.map(item => ({
      course_id,
      user_id:  user.id,
      name:     item.name,
      date:     item.date,    // ensure YYYY-MM-DD
      percent:  item.percent,
    }))
    const { error: evErr } = await supabase
      .from('events')
      .insert(toInsert)

    setSaving(false)
    if (evErr) {
      console.error(evErr)
      alert('Failed to save events')
      return
    }

    // 3) Redirect to the new course's page
    navigate(`/courses/${course_id}`)
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Add Course Outline</h1>

      <div style={{ marginBottom: '1rem' }}>
        <label>
          Course Title:{' '}
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. MATH 271"
            style={{ marginLeft: 8, padding: '4px 8px' }}
          />
        </label>
      </div>

      <PlannerForm
        onParsed={parsed => {
          setItems(parsed)
          handleSubmitOutline(parsed)
        }}
      />

      {saving && <p>Saving…</p>}

      <ul style={{ marginTop: 16 }}>
        {items.map((itm, i) => (
          <li key={i}>
            {itm.name}, {itm.date}, {itm.percent}
          </li>
        ))}
      </ul>
    </div>
  )
}
