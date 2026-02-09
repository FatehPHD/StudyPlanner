// CoursePage.jsx - Detailed view for a single course, grades, and events
import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { getOptionalGroupToggleable, getComponentBase } from '../lib/gradeUtils.js'
import toast from 'react-hot-toast'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler
)

export default function CoursePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [course, setCourse] = useState(null)
  const [events, setEvents] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [tempScores, setTempScores] = useState({ received: '', total: '' })
  const [editingDateId, setEditingDateId] = useState(null)
  const [tempDate, setTempDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [sortKey, setSortKey] = useState(null)
  const [sortAsc, setSortAsc] = useState(true)
  const [target, setTarget] = useState('')

  // Fetch course and events on mount/id change
  useEffect(() => {
    supabase
      .from('courses')
      .select('title, color, optional_groups')
      .eq('id', id)
      .single()
      .then(({ data }) => setCourse(data))
    fetchEvents()
  }, [id])

  // Fetch all events for this course
  async function fetchEvents() {
    const { data } = await supabase
      .from('events')
      .select('id, name, date, percent, score_received, score_total, included')
      .eq('course_id', id)
      .order('date', { ascending: true })
    setEvents(data || [])
  }

  // Grade calculations (only for included items)
  const totalEarned = useMemo(() => {
    return events.reduce((sum, e) => {
      if (e.included !== false && e.score_received != null && e.score_total > 0) {
        const w = parseFloat(e.percent)
        return sum + (e.score_received / e.score_total) * w
      }
      return sum
    }, 0)
  }, [events])
  const totalWeight = useMemo(() => {
    return events.reduce((sum, e) => {
      return e.included !== false && e.score_received != null && e.score_total > 0
        ? sum + parseFloat(e.percent)
        : sum
    }, 0)
  }, [events])
  const normalizedGrade = useMemo(() => {
    return totalWeight > 0 ? (totalEarned / totalWeight) * 100 : 0
  }, [totalEarned, totalWeight])

  // Target grade forecasting (only for included items)
  const W_done = useMemo(
    () => events.reduce((sum, e) => {
      return e.included !== false && e.score_received != null && e.score_total > 0
        ? sum + parseFloat(e.percent)
        : sum
    }, 0),
    [events]
  )
  const achieved = useMemo(
    () => events.reduce((sum, e) => {
      if (e.included !== false && e.score_received != null && e.score_total > 0) {
        const w = parseFloat(e.percent)
        return sum + (e.score_received / e.score_total) * w
      }
      return sum
    }, 0),
    [events]
  )
  const W_rem = Math.max(0, 100 - W_done)
  const needed = useMemo(() => {
    if (!target || W_rem <= 0) return null
    return ((Number(target) - achieved) / W_rem) * 100
  }, [target, achieved, W_rem])

  // Sparkline chart data (only for included items)
  const sparkData = useMemo(() => {
    const labels = []
    const dataPoints = []
    let cumEarn = 0
    let cumWeight = 0
    events.forEach(e => {
      if (e.included !== false && e.score_received != null && e.score_total > 0) {
        cumWeight += parseFloat(e.percent)
        cumEarn += (e.score_received / e.score_total) * parseFloat(e.percent)
        labels.push(e.date)
        dataPoints.push(+((cumEarn / cumWeight) * 100).toFixed(2))
      }
    })
    return {
      labels,
      datasets: [
        {
          label: 'Cumulative %',
          data: dataPoints,
          fill: true,
          tension: 0.3,
          backgroundColor: 'rgba(100,143,255,0.1)',
          borderColor: '#648FFF',
          pointRadius: 3,
          pointBackgroundColor: '#648FFF'
        }
      ]
    }
  }, [events])
  const sparkOptions = {
    scales: {
      x: { display: false },
      y: { min: 0, max: 100, ticks: { callback: v => v + '%' } }
    },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => ctx.parsed.y + '%' } }
    },
    elements: { line: { borderWidth: 2 } },
    maintainAspectRatio: false
  }

  // Edit helpers
  function startEdit(e) {
    setEditingId(e.id)
    setTempScores({
      received: e.score_received ?? '',
      total: e.score_total ?? ''
    })
  }
  function cancelEdit() {
    setEditingId(null)
    setTempScores({ received: '', total: '' })
  }
  async function saveScores(eventId) {
    const { received, total } = tempScores
    if (!received || !total || Number(total) <= 0) {
      toast.error('Enter valid scores')
      return
    }
    setSaving(true)
    await supabase
      .from('events')
      .update({
        score_received: Number(received),
        score_total: Number(total)
      })
      .eq('id', eventId)
    setSaving(false)
    cancelEdit()
    fetchEvents()
    toast.success('Score saved!')
  }
  async function clearScore(eventId) {
    await supabase
      .from('events')
      .update({ score_received: null, score_total: null })
      .eq('id', eventId)
    cancelEdit()
    fetchEvents()
    toast.success('Score cleared')
  }

  // Date editing (for events without dates)
  function startEditDate(ev) {
    setEditingDateId(ev.id)
    setTempDate(ev.date || '')
  }
  function cancelEditDate() {
    setEditingDateId(null)
    setTempDate('')
  }
  async function saveDate(eventId) {
    const dateStr = tempDate.trim()
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      toast.error('Please enter a valid date (YYYY-MM-DD)')
      return
    }
    const start = new Date(`${dateStr}T23:00:00`)
    const end = new Date(`${dateStr}T23:30:00`)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      toast.error('Invalid date')
      return
    }
    setSaving(true)
    await supabase
      .from('events')
      .update({
        date: dateStr,
        start_time: start.toISOString(),
        end_time: end.toISOString()
      })
      .eq('id', eventId)
    setSaving(false)
    cancelEditDate()
    fetchEvents()
    toast.success('Date saved!')
  }

  // Toggle included status (with "best X of Y" auto-uncheck when exceeding max)
  async function toggleIncluded(eventId, currentStatus) {
    const optionalGroups = course?.optional_groups || {}
    const ev = events.find(e => e.id === eventId)
    if (!ev) return

    const base = getComponentBase(ev.name)
    const maxAllowed = optionalGroups[base]

    if (currentStatus) {
      // Unchecking: always allow
      await supabase.from('events').update({ included: false }).eq('id', eventId)
      fetchEvents()
      toast.success('Item excluded from calculations')
      return
    }

    // Checking: may need to auto-uncheck another if we'd exceed max
    if (maxAllowed != null) {
      const groupEvents = events.filter(e => getComponentBase(e.name) === base)
      const includedEvents = groupEvents.filter(e => e.included !== false)
      if (includedEvents.length >= maxAllowed) {
        // Pick one to uncheck: no score -> random, all have score -> lowest
        const withScores = includedEvents.filter(e => e.score_received != null && e.score_total > 0)
        const withoutScores = includedEvents.filter(e => !(e.score_received != null && e.score_total > 0))
        let toUncheck
        if (withoutScores.length > 0) {
          toUncheck = withoutScores[Math.floor(Math.random() * withoutScores.length)]
        } else {
          const byPct = [...withScores].sort((a, b) => {
            const pctA = (a.score_received / a.score_total) * 100
            const pctB = (b.score_received / b.score_total) * 100
            return pctA - pctB
          })
          const lowest = byPct[0]
          const sameLowest = withScores.filter(
            e => Math.abs((e.score_received / e.score_total) * 100 - (lowest.score_received / lowest.score_total) * 100) < 0.01
          )
          toUncheck = sameLowest[Math.floor(Math.random() * sameLowest.length)]
        }
        await supabase.from('events').update({ included: false }).eq('id', toUncheck.id)
      }
    }

    await supabase.from('events').update({ included: true }).eq('id', eventId)
    fetchEvents()
    toast.success('Item included in calculations')
  }

  // Only items in optional groups (e.g. "best N of M") can have checkbox toggled
  const toggleableEventIds = useMemo(
    () => getOptionalGroupToggleable(events, true),
    [events]
  )

  // Groups with fewer than X included (for warning banner)
  const underMinGroups = useMemo(() => {
    const optionalGroups = course?.optional_groups || {}
    const list = []
    for (const [base, maxAllowed] of Object.entries(optionalGroups)) {
      const groupEvents = events.filter(e => getComponentBase(e.name) === base)
      const includedCount = groupEvents.filter(e => e.included !== false).length
      if (includedCount < maxAllowed) {
        list.push({ base, current: includedCount, required: maxAllowed })
      }
    }
    return list
  }, [events, course?.optional_groups])

  // Sorting helpers
  const sortedEvents = useMemo(() => {
    if (!sortKey) return events
    return [...events].sort((a, b) => {
      if (sortKey === 'date') {
        const aVal = a.date ? new Date(a.date).getTime() : Infinity
        const bVal = b.date ? new Date(b.date).getTime() : Infinity
        return sortAsc ? aVal - bVal : bVal - aVal
      }
      if (sortKey === 'percent') {
        return sortAsc
          ? parseFloat(a.percent) - parseFloat(b.percent)
          : parseFloat(b.percent) - parseFloat(a.percent)
      }
      return 0
    })
  }, [events, sortKey, sortAsc])
  function handleSort(key) {
    if (sortKey === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(true)
    }
  }

  if (!course) return <p>Loading course…</p>

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 700, margin: '0 auto' }}>
        <h1 className="playful-heading" style={{ color: course.color, background: 'none', WebkitTextFillColor: 'unset' }}>
          {course.title}{' '}
          <button
            onClick={async () => {
              await supabase.from('courses').delete().eq('id', id)
              navigate('/')
            }}
            className="btn-fun"
            title="Delete course"
            style={{ color: course.color, background: 'none', marginLeft: '0.5em', padding: '0.4em 1em', fontSize: '1.1em' }}
          >
            🗑
          </button>
        </h1>
        {/* Grade summary */}
        <h3 className="score-summary">
          Overall: {totalEarned.toFixed(2)}% out of 100%
        </h3>
        <h3 className="score-summary">
          Sitting: {normalizedGrade.toFixed(2)}% for the {totalWeight.toFixed(2)}%
        </h3>
        {Object.keys(course?.optional_groups || {}).length > 0 && (
          <p style={{ fontSize: '0.9rem', fontStyle: 'italic', marginTop: '0.5rem', color: 'var(--text-muted)' }}>
            💡 <strong>Optional groups:</strong> To switch which items are included, uncheck first, then check the other. Otherwise one will be randomly unchecked.
          </p>
        )}
        {underMinGroups.length > 0 && (
          <div
            style={{
              padding: '1rem 1.25rem',
              marginTop: '1rem',
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
        {/* Sparkline chart */}
        <div className="chart-container" style={{ height: '150px' }}>
          <Line data={sparkData} options={sparkOptions} />
        </div>
        {/* Event table */}
        <table className="score-table" style={{ marginTop: '2rem' }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Date</th>
              <th>Weight (%)</th>
              <th>Included</th>
              <th>Score</th>
              <th>Percent</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sortedEvents.map(ev => (
              <tr key={ev.id} style={{ opacity: ev.included === false ? 0.6 : 1 }}>
                <td>{ev.name}</td>
                <td>
                  {editingDateId === ev.id ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <input
                        type="date"
                        value={tempDate}
                        onChange={e => setTempDate(e.target.value)}
                        className="input-field"
                        style={{ width: 140 }}
                        disabled={saving}
                      />
                      <button
                        onClick={() => saveDate(ev.id)}
                        className="btn-fun"
                        style={{ padding: '0.2em 0.6em', fontSize: '0.9em' }}
                        disabled={saving}
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEditDate}
                        className="btn-fun"
                        style={{ padding: '0.2em 0.6em', fontSize: '0.9em', background: 'var(--surface-alt)', color: 'var(--accent2)' }}
                        disabled={saving}
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {ev.date ? (
                        <>
                          {ev.date}
                          <button
                            onClick={() => startEditDate(ev)}
                            className="btn-fun"
                            style={{ padding: '0.1em 0.4em', fontSize: '0.8em', background: 'transparent', color: 'var(--accent)' }}
                            title="Change date"
                          >
                            Edit
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => startEditDate(ev)}
                          className="btn-fun"
                          style={{ padding: '0.2em 0.6em', fontSize: '0.9em' }}
                          title="Add date"
                        >
                          Add date
                        </button>
                      )}
                    </span>
                  )}
                </td>
                <td>{ev.percent != null ? `${ev.percent}%` : '—'}</td>
                <td>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={ev.included !== false}
                      onChange={() => toggleIncluded(ev.id, ev.included !== false)}
                      disabled={saving || !toggleableEventIds.has(ev.id)}
                      style={{ transform: 'scale(1.2)' }}
                      title={!toggleableEventIds.has(ev.id) ? 'Only optional groups can be toggled' : ''}
                    />
                    <span style={{ fontSize: '0.9rem', color: ev.included !== false ? 'var(--accent)' : 'var(--text-muted)' }}>
                      {ev.included !== false ? 'Included' : 'Not Included'}
                    </span>
                  </label>
                </td>
                <td>
                  {editingId === ev.id ? (
                    <>
                      <input
                        type="number"
                        placeholder="scored"
                        value={tempScores.received}
                        onChange={v => setTempScores(ts => ({ ...ts, received: v.target.value }))}
                        className="input-field"
                        style={{ width: 60, marginRight: 4 }}
                        disabled={saving}
                      />
                      /
                      <input
                        type="number"
                        placeholder="total"
                        value={tempScores.total}
                        onChange={v => setTempScores(ts => ({ ...ts, total: v.target.value }))}
                        className="input-field"
                        style={{ width: 60, marginLeft: 4 }}
                        disabled={saving}
                      />
                    </>
                  ) : (
                    <>{ev.score_received} / {ev.score_total}</>
                  )}
                </td>
                <td>
                  {ev.score_total ? ((ev.score_received / ev.score_total) * 100).toFixed(2) + '%' : '—'}
                </td>
                <td>
                  {editingId === ev.id ? (
                    <>
                      <button
                        onClick={() => saveScores(ev.id)}
                        className="btn-fun"
                        style={{ padding: '0.3em 1em', fontSize: '1em', marginRight: 4 }}
                        disabled={saving}
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="btn-fun"
                        style={{ padding: '0.3em 1em', fontSize: '1em', background: 'var(--surface-alt)', color: 'var(--accent2)' }}
                        disabled={saving}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => clearScore(ev.id)}
                        className="btn-fun"
                        style={{ padding: '0.3em 1em', fontSize: '1em', background: 'var(--surface-alt)', color: 'var(--accent)' }}
                        disabled={saving}
                      >
                        Clear
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => startEdit(ev)}
                      className="btn-fun"
                      style={{ padding: '0.3em 1em', fontSize: '1em' }}
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Target-grade forecasting */}
      <div className="form-group">
        <label>
          Target Final Grade (%):{' '}
          <input
            type="number"
            min="0"
            max="100"
            value={target}
            onChange={e => setTarget(e.target.value)}
            className="input-field"
          />
        </label>
      </div>
      {target && (
        <p className="score-summary">
          You’ve completed <strong>{W_done.toFixed(1)}%</strong> of your work, with an achieved{' '}
          <strong>{achieved.toFixed(2)}%</strong>.<br/>
          To hit <strong>{target}%</strong>, you’ll need an average of{' '}
          <strong>
            {needed !== null ? needed.toFixed(2) : '—'}%
          </strong>{' '}
          on the remaining <strong>{W_rem.toFixed(1)}%</strong> of work.
        </p>
      )}
    </div>
  )
}
