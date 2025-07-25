// AddPage.jsx - Page for adding a new course and its outline
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import toast from 'react-hot-toast'
import PlannerForm from './PlannerForm.jsx'

export default function AddPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [outlineText, setOutlineText] = useState('')
  const [parsedItems, setParsedItems] = useState([])
  const [previewMode, setPreviewMode] = useState(false)
  const [saving, setSaving] = useState(false)

  // After GPT parsing, switch to preview mode
  function handleParsed(items) {
    // Convert any human-readable dates to YYYY-MM-DD format
    const convertedItems = items.map(item => {
      if (item.date && !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
        const parsedDate = new Date(item.date)
        if (!isNaN(parsedDate.getTime())) {
          return { ...item, date: parsedDate.toISOString().slice(0, 10) }
        }
      }
      return item
    })
    setParsedItems(convertedItems)
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

  // Save course and events to Supabase
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
    // Validate all dates before saving
    const invalidIdx = parsedItems.findIndex(item => {
      const dateStr = (item.date || '').trim()
      if (!dateStr) return true
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return true
      const testDate = new Date(`${dateStr}T23:00:00`)
      return isNaN(testDate.getTime())
    })
    if (invalidIdx !== -1) {
      const problemDate = parsedItems[invalidIdx].date || 'empty'
      toast.error(`Row ${invalidIdx + 1} has an invalid date: "${problemDate}". Please fix it before saving.`)
      setSaving(false)
      return
    }
    // 2) Insert events for the course
    const toInsert = parsedItems.map((item, idx) => {
      const dateStr = (item.date || '').trim()
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        throw new Error(`Row ${idx + 1} has an invalid date format: "${dateStr}"`)
      }
      const start = new Date(`${dateStr}T23:00:00`)
      const end = new Date(`${dateStr}T23:30:00`)
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error(`Row ${idx + 1} has an invalid date value: "${dateStr}"`)
      }
      return {
        course_id,
        user_id: user.id,
        name: item.name,
        date: dateStr,
        percent: item.percent,
        start_time: start.toISOString(),
        end_time: end.toISOString()
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
      <div className="card" style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 className="playful-heading">Add Course Outline</h1>
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
        {/* Outline input and preview mode */}
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
            <h2 className="playful-heading" style={{ fontSize: '1.3rem' }}>Edit Parsed Items</h2>
            <p className="edit-instructions">
              Add, remove, or correct any Name, Date, or Percent row here.
              Please double-check the original outline to ensure these values
              are 100% accurate before saving.
            </p>
            <div className="card-list">
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
                          className="input-field"
                        />
                      </td>
                      <td>
                        <input
                          type="date"
                          value={(() => {
                            if (/^\d{4}-\d{2}-\d{2}$/.test(itm.date)) {
                              return itm.date
                            }
                            const d = new Date(itm.date)
                            return isNaN(d) ? '' : d.toISOString().slice(0,10)
                          })()}
                          onChange={e => updateItem(i, 'date', e.target.value)}
                          disabled={saving}
                          className="input-field"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={itm.percent}
                          onChange={e => updateItem(i, 'percent', e.target.value)}
                          disabled={saving}
                          className="input-field"
                        />
                      </td>
                      <td>
                        <button
                          onClick={() => removeItem(i)}
                          className="btn-fun"
                          disabled={saving}
                          style={{ padding: '0.3em 1em', fontSize: '1em' }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button onClick={addRow} className="btn-fun" disabled={saving} style={{ marginTop: '0.5em' }}>
                + Add Row
              </button>
            </div>
            <div className="actions" style={{ marginTop: '1rem' }}>
              <button
                onClick={handleSave}
                className="btn-fun"
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save Course'}
              </button>
              <button
                onClick={() => setPreviewMode(false)}
                className="btn-fun"
                style={{ background: 'var(--surface-alt)', color: 'var(--accent2)', marginLeft: '1em' }}
                disabled={saving}
              >
                Reparse Outline
              </button>
            </div>
          </>
        )}
        {saving && <p className="saving-text">Saving…</p>}
      </div>
    </div>
  )
}
