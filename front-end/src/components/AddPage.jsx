// src/components/AddPage.jsx
import { useState }   from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth }     from '../context/AuthContext.jsx'
import { supabase }    from '../lib/supabaseClient.js'
import toast           from 'react-hot-toast'
import PlannerForm     from './PlannerForm.jsx'

export default function AddPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [title, setTitle]             = useState('')
  const [outlineText, setOutlineText] = useState('')
  const [parsedItems, setParsedItems] = useState([])
  const [previewMode, setPreviewMode] = useState(false)
  const [saving, setSaving]           = useState(false)

  // After GPT parsing, switch to preview mode
  function handleParsed(items) {
    setParsedItems(items)
    setPreviewMode(true)
  }

  // Update a single field in one row
  function updateItem(idx, field, value) {
    setParsedItems(xs =>
      xs.map((it, i) => (i === idx ? { ...it, [field]: value } : it))
    )
  }

  // Remove one row
  function removeItem(idx) {
    setParsedItems(xs => xs.filter((_, i) => i !== idx))
  }

  // Add a blank row at the end
  function addRow() {
    setParsedItems(xs => [
      ...xs,
      { name: '', date: '', percent: '' }
    ])
  }

  // Save to Supabase
  async function handleSave() {
    if (!title.trim()) {
      toast.error('Please enter a course title')
      return
    }
    setSaving(true)

    // 1) Create the course
    const color = `hsl(${Math.floor(Math.random()*360)},70%,60%)`
    const { data: courseData, error: courseErr } = await supabase
      .from('courses')
      .insert([{ user_id: user.id, title, color }])
      .select('id')
    if (courseErr || !courseData?.length) {
      toast.error('Failed to save course')
      setSaving(false)
      return
    }
    const course_id = courseData[0].id

    // 2) Insert events, populating date, start_time, and end_time
    const toInsert = parsedItems.map(item => {
      // assume item.date is "YYYY-MM-DD"
      const isoDate     = item.date
      const midnightUTC = `${isoDate}T00:00:00Z`
      return {
        course_id,
        user_id:    user.id,
        name:       item.name,
        date:       item.date,
        percent:    item.percent,
        start_time: midnightUTC,
        end_time:   midnightUTC
      }
    })

    const { error: evErr } = await supabase
      .from('events')
      .insert(toInsert)

    setSaving(false)
    if (evErr) {
      toast.error('Failed to save events')
      return
    }

    toast.success('Course saved!')
    navigate(`/courses/${course_id}`)
  }

  return (
    <div className="container">
      <h1>Add Course Outline</h1>

      <div className="form-group">
        <label>
          Course Title:{' '}
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. MATH 271"
            className="input-field"
            disabled={saving}
          />
        </label>
      </div>

      {!previewMode && (
        <PlannerForm
          outlineText={outlineText}
          setOutlineText={setOutlineText}
          disabled={saving}
          onParsed={handleParsed}
        />
      )}

      {previewMode && (
        <>
          <h2>Edit Parsed Items</h2>
          <p className="edit-instructions">
            Add, remove, or correct any Name, Date, or Percent row here. 
            Please double-check the original outline to ensure these values 
            are 100% accurate before saving.
          </p>
          <table className="parsed-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Date</th>
                <th>Percent</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {parsedItems.map((itm, i) => (
                <tr key={i}>
                  <td>
                    <input
                      type="text"
                      value={itm.name}
                      onChange={e => updateItem(i, 'name', e.target.value)}
                      disabled={saving}
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      value={(() => {
                        const d = new Date(itm.date)
                        return isNaN(d) ? '' : d.toISOString().slice(0,10)
                      })()}
                      onChange={e => updateItem(i, 'date', e.target.value)}
                      disabled={saving}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={itm.percent}
                      onChange={e => updateItem(i, 'percent', e.target.value)}
                      disabled={saving}
                    />
                  </td>
                  <td>
                    <button
                      onClick={() => removeItem(i)}
                      className="btn-row"
                      disabled={saving}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button onClick={addRow} className="btn-row" disabled={saving}>
            + Add Row
          </button>

          <div className="actions" style={{ marginTop: '1rem' }}>
            <button
              onClick={handleSave}
              className="btn-primary"
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save Course'}
            </button>
            <button
              onClick={() => setPreviewMode(false)}
              className="btn-link ml-3"
              disabled={saving}
            >
              Reparse Outline
            </button>
          </div>
        </>
      )}

      {saving && <p className="saving-text">Saving…</p>}
    </div>
  )
}
