// AddPage.jsx - Page for adding a new course and its outline
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { getOptionalGroupToggleable, getComponentBase, getGroupMaxIncluded } from '../lib/gradeUtils.js'
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
  // Max allowed "included" per optional group (N in "best N of M") - captured at parse time
  const [groupMaxIncluded, setGroupMaxIncluded] = useState(() => new Map())

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
    setGroupMaxIncluded(getGroupMaxIncluded(convertedItems))
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
      { name: '', date: '', percent: '', included: true }
    ])
  }

  // Only items in optional groups (e.g. "best N of M") can have checkbox toggled
  const toggleableIndices = useMemo(
    () => getOptionalGroupToggleable(parsedItems, false),
    [parsedItems]
  )

  // Group colors for Add page only (not saved) - visible tints for readability
  const groupColors = useMemo(() => {
    const PALETTE = [
      'hsla(220, 55%, 88%, 0.85)',   // blue
      'hsla(150, 45%, 88%, 0.85)',   // green
      'hsla(40, 65%, 88%, 0.85)',    // yellow
      'hsla(280, 45%, 88%, 0.85)',   // purple
      'hsla(0, 45%, 90%, 0.85)',     // light red
      'hsla(180, 45%, 88%, 0.85)',   // cyan
    ]
    const seen = new Map()
    let idx = 0
    return parsedItems.map(item => {
      const base = getComponentBase(item.name) || '(blank)'
      if (!seen.has(base)) seen.set(base, PALETTE[idx++ % PALETTE.length])
      return seen.get(base)
    })
  }, [parsedItems])

  // Groups with fewer than X included (for warning banner)
  const underMinGroups = useMemo(() => {
    const list = []
    for (const [base, maxAllowed] of groupMaxIncluded) {
      const includedCount = parsedItems.filter(
        it => getComponentBase(it.name) === base && it.included !== false
      ).length
      if (includedCount < maxAllowed) {
        list.push({ base, current: includedCount, required: maxAllowed })
      }
    }
    return list
  }, [parsedItems, groupMaxIncluded])

  // Sort by date for display (invalid/empty dates at end)
  const sortedForDisplay = useMemo(() => {
    const isValid = (d) => {
      const s = (d || '').trim()
      if (!s || s === 'yyyy-mm-dd' || s === 'NO_DATE') return false
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
      return !isNaN(new Date(`${s}T12:00:00`).getTime())
    }
    return parsedItems
      .map((item, i) => ({ item, index: i }))
      .sort((a, b) => {
        const aValid = isValid(a.item.date)
        const bValid = isValid(b.item.date)
        if (!aValid && !bValid) return 0
        if (!aValid) return 1
        if (!bValid) return -1
        return new Date(a.item.date) - new Date(b.item.date)
      })
  }, [parsedItems])

  // Check if a date string is valid (YYYY-MM-DD)
  function isValidDate(dateStr) {
    const s = (dateStr || '').trim()
    if (!s || s === 'yyyy-mm-dd' || s === 'NO_DATE') return false
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
    return !isNaN(new Date(`${s}T12:00:00`).getTime())
  }

  // Save course and events to Supabase
  async function handleSave() {
    if (!title.trim()) {
      toast.error('Please enter a course title')
      return
    }
    // Validate "best N of M" groups: don't allow more than N included
    for (const [base, maxAllowed] of groupMaxIncluded) {
      const includedCount = parsedItems.filter(
        it => getComponentBase(it.name) === base && it.included !== false
      ).length
      if (includedCount > maxAllowed) {
        const total = parsedItems.filter(it => getComponentBase(it.name) === base).length
        toast.error(
          `Only ${maxAllowed} of ${total} "${base}" items can be used to calculate your grade. ` +
          `Please uncheck ${includedCount - maxAllowed} more.`
        )
        return
      }
    }

    // Check for items with no/invalid date - show confirmation popup
    const itemsWithoutDate = parsedItems.filter(item => !isValidDate(item.date))
    if (itemsWithoutDate.length > 0) {
      const names = itemsWithoutDate.map(it => it.name || '(unnamed)').join(', ')
      const msg = `There is no date for: ${names}.\n\n` +
        `If you continue, you will need to add the date later on the course page.\n\n` +
        `Do you want to continue?`
      if (!window.confirm(msg)) return
    }

    setSaving(true)
    // 1) Create the course (store optional_groups for "best N of M" on Course page)
    const color = `hsl(${Math.floor(Math.random()*360)},70%,60%)`
    const optionalGroupsJson = Object.fromEntries(groupMaxIncluded)
    const { data: courseData, error: courseErr } = await supabase
      .from('courses')
      .insert([{ user_id: user.id, title, color, optional_groups: optionalGroupsJson }])
      .select('id')
    if (courseErr || !courseData?.length) {
      toast.error('Failed to save course')
      setSaving(false)
      return
    }
    const course_id = courseData[0].id
    // 2) Insert events for the course (allow null date for items without valid date)
    const toInsert = parsedItems.map((item, idx) => {
      const dateStr = (item.date || '').trim()
      const hasValidDate = isValidDate(dateStr)
      let dateVal = null
      let startTime = null
      let endTime = null
      if (hasValidDate) {
        dateVal = dateStr
        const start = new Date(`${dateStr}T23:00:00`)
        const end = new Date(`${dateStr}T23:30:00`)
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          startTime = start.toISOString()
          endTime = end.toISOString()
        }
      }
      // Parse percent: DB expects numeric, strip "2.5 %" -> 2.5
      const percentVal = (item.percent || '').toString().replace(/%/g, '').trim()
      const percentNum = percentVal === '' ? null : parseFloat(percentVal)
      return {
        course_id,
        user_id: user.id,
        name: item.name,
        date: dateVal,
        percent: isNaN(percentNum) ? null : percentNum,
        included: item.included !== false, // Default to true if not specified
        start_time: startTime,
        end_time: endTime
      }
    })
    const { error: evErr } = await supabase
      .from('events')
      .insert(toInsert)
    setSaving(false)
    if (evErr) {
      console.error('Events insert error:', evErr)
      toast.error(`Failed to save events: ${evErr.message}`)
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
            {groupMaxIncluded.size > 0 && (
              <p className="edit-instructions" style={{ fontSize: '0.9rem', fontStyle: 'italic', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                💡 <strong>Optional groups (e.g. best 3 of 4):</strong> To switch which items are included, uncheck first, then check the other. Otherwise one will be randomly unchecked.
              </p>
            )}
            {underMinGroups.length > 0 && (
              <div
                style={{
                  padding: '1rem 1.25rem',
                  marginBottom: '1rem',
                  background: 'hsla(0, 70%, 50%, 0.15)',
                  border: '2px solid hsl(0, 70%, 45%)',
                  borderRadius: '8px',
                  color: 'var(--text)'
                }}
              >
                <strong>⚠️ Warning:</strong> You need to include at least the required number of items for each group:
                {underMinGroups.map(({ base, current, required }) => (
                  <div key={base} style={{ marginTop: '0.5rem' }}>
                    • <strong>{base}</strong>: {current} of {required} required (check {required - current} more)
                  </div>
                ))}
              </div>
            )}
            <div className="card-list">
              <table className="parsed-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Date</th>
                    <th>Percent</th>
                    <th>Included</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedForDisplay.map(({ item: itm, index: i }) => (
                    <tr key={i} style={{ backgroundColor: groupColors[i] ?? 'transparent' }}>
                      <td>
                        <input
                          type="text"
                          value={itm.name}
                          onChange={e => updateItem(i, 'name', e.target.value)}
                          disabled={saving}
                          className="input-field"
                        />
                      </td>
                      <td style={{ position: 'relative' }}>
                        <input
                          type="date"
                          value={(() => {
                            if (itm.date === 'NO_DATE') return ''
                            if (/^\d{4}-\d{2}-\d{2}$/.test(itm.date)) {
                              return itm.date
                            }
                            const d = new Date(itm.date)
                            return isNaN(d) ? '' : d.toISOString().slice(0,10)
                          })()}
                          onChange={e => updateItem(i, 'date', e.target.value)}
                          disabled={saving}
                          className={`input-field ${!itm.date || itm.date === 'yyyy-mm-dd' || itm.date.trim() === '' || itm.date === 'NO_DATE' ? 'empty-date' : ''}`}
                        />
                        {(!itm.date || itm.date === 'yyyy-mm-dd' || itm.date.trim() === '' || itm.date === 'NO_DATE') && (
                          <span 
                            className="date-help-icon"
                            title={itm.explanation || "No specific date mentioned in outline - please add manually"}
                          >
                            ?
                          </span>
                        )}
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
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input
                            type="checkbox"
                            checked={itm.included !== false}
                            onChange={e => {
                              const checked = e.target.checked
                              if (checked && toggleableIndices.has(i)) {
                                const base = getComponentBase(itm.name)
                                const maxAllowed = groupMaxIncluded.get(base)
                                if (maxAllowed != null) {
                                  const groupWithIdx = parsedItems.map((it, j) => ({ it, j })).filter(
                                    ({ it }) => getComponentBase(it.name) === base
                                  )
                                  const includedWithIdx = groupWithIdx.filter(({ it }) => it.included !== false)
                                  if (includedWithIdx.length >= maxAllowed) {
                                    // Auto-uncheck one: no scores on Add page, so pick randomly
                                    const excludeIdx = i
                                    const candidates = includedWithIdx.filter(({ j }) => j !== excludeIdx)
                                    if (candidates.length === 0) return
                                    const toUncheck = candidates[Math.floor(Math.random() * candidates.length)].j
                                    setParsedItems(xs =>
                                      xs.map((it, j) => {
                                        if (j === i) return { ...it, included: true }
                                        if (j === toUncheck) return { ...it, included: false }
                                        return it
                                      })
                                    )
                                    return
                                  }
                                }
                              }
                              updateItem(i, 'included', checked)
                            }}
                            disabled={saving || !toggleableIndices.has(i)}
                            style={{ transform: 'scale(1.2)' }}
                            title={!toggleableIndices.has(i) ? 'Only optional groups can be toggled' : ''}
                          />
                          <span style={{ fontSize: '0.9rem', color: itm.included !== false ? 'var(--accent)' : 'var(--text-muted)' }}>
                            {itm.included !== false ? 'Included' : 'Not Included'}
                          </span>
                        </label>
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
