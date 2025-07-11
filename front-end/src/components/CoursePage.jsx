// src/components/CoursePage.jsx
import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import { useAuth }               from '../context/AuthContext.jsx'
import { supabase }              from '../lib/supabaseClient.js'
import toast                     from 'react-hot-toast'

// Chart.js imports
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
  const { id }       = useParams()
  const navigate     = useNavigate()
  const { user }     = useAuth()

  const [course, setCourse]         = useState(null)
  const [events, setEvents]         = useState([])
  const [editingId, setEditingId]   = useState(null)
  const [tempScores, setTempScores] = useState({ received: '', total: '' })
  const [saving, setSaving]         = useState(false)

  // Sorting state
  const [sortKey, setSortKey] = useState(null)
  const [sortAsc, setSortAsc] = useState(true)

  // Fetch course & events on mount / id change
  useEffect(() => {
    supabase
      .from('courses')
      .select('title, color')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setCourse(data)
      })

    fetchEvents()
  }, [id])

  async function fetchEvents() {
    const { data } = await supabase
      .from('events')
      .select(`
        id,name,date,percent,
        score_received,score_total
      `)
      .eq('course_id', id)
      .order('date', { ascending: true })

    setEvents(data || [])
  }

  // Compute raw earned and totalWeight
  const totalEarned = useMemo(() => {
    return events.reduce((sum, e) => {
      if (e.score_received != null && e.score_total > 0) {
        const w = parseFloat(e.percent)
        const f = e.score_received / e.score_total
        return sum + f * w
      }
      return sum
    }, 0)
  }, [events])

  const totalWeight = useMemo(() => {
    return events.reduce((sum, e) => {
      return e.score_received != null && e.score_total > 0
        ? sum + parseFloat(e.percent)
        : sum
    }, 0)
  }, [events])

  const normalizedGrade = useMemo(() => {
    return totalWeight > 0 ? (totalEarned / totalWeight) * 100 : 0
  }, [totalEarned, totalWeight])

  // Build data for sparkline: cumulative normalized grade after each scored event
  const sparkData = useMemo(() => {
    const labels = []
    const dataPoints = []
    let cumEarn = 0
    let cumWeight = 0

    events.forEach(e => {
      if (e.score_received != null && e.score_total > 0) {
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
      y: {
        min: 0,
        max: 100,
        ticks: { callback: v => v + '%' }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => ctx.parsed.y + '%' } }
    },
    elements: { line: { borderWidth: 2 } },
    maintainAspectRatio: false
  }

  // Editing helpers (start/cancel/save/clear identical to before)…
  function startEdit(e) {
    setEditingId(e.id)
    setTempScores({
      received: e.score_received ?? '',
      total:    e.score_total    ?? ''
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
        score_total:    Number(total)
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

  // Sorting
  const sortedEvents = useMemo(() => {
    if (!sortKey) return events
    return [...events].sort((a, b) => {
      if (sortKey === 'date') {
        return sortAsc
          ? new Date(a.date) - new Date(b.date)
          : new Date(b.date) - new Date(a.date)
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
      <h1 style={{ color: course.color }}>
        {course.title}{' '}
        <button
          onClick={async () => {
            await supabase.from('courses').delete().eq('id', id)
            navigate('/')
          }}
          className="btn-delete ml-3"
          title="Delete course"
          style={{ color: course.color }}
        >
          🗑
        </button>
      </h1>

      <h3 className="score-summary">
        Raw Earned: {totalEarned.toFixed(2)}% of 100%
      </h3>
      <h3 className="score-summary">
        Normalized: {normalizedGrade.toFixed(2)}% of scored {totalWeight.toFixed(2)}%
      </h3>

      {/* Sparkline */}
      <div className="chart-container" style={{ height: '150px' }}>
        <Line data={sparkData} options={sparkOptions} />
      </div>

      <div className="actions">
        <button onClick={() => handleSort('date')} className="btn-link">
          Sort by Date {sortKey === 'date' ? (sortAsc ? '↑' : '↓') : ''}
        </button>
        <button onClick={() => handleSort('percent')} className="btn-link ml-3">
          Sort by Weight {sortKey === 'percent' ? (sortAsc ? '↑' : '↓') : ''}
        </button>
      </div>

      <h2>Assessments &amp; Deadlines</h2>
      <table className="score-table">
        <thead>
          <tr>
            <th>Assessment</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {sortedEvents.map(e => {
            const pct = e.score_received != null && e.score_total > 0
              ? ((e.score_received / e.score_total) * parseFloat(e.percent)).toFixed(2)
              : null

            return (
              <tr key={e.id}>
                <td>
                  {e.name} — {e.date} — {e.percent}
                </td>
                <td>
                  {editingId === e.id ? (
                    <div className="score-actions">
                      <input
                        type="number"
                        placeholder="scored"
                        value={tempScores.received}
                        onChange={v =>
                          setTempScores(ts => ({
                            ...ts,
                            received: v.target.value
                          }))
                        }
                        className="score-input"
                        disabled={saving}
                      />
                      /
                      <input
                        type="number"
                        placeholder="total"
                        value={tempScores.total}
                        onChange={v =>
                          setTempScores(ts => ({
                            ...ts,
                            total: v.target.value
                          }))
                        }
                        className="score-input ml-1"
                        disabled={saving}
                      />
                      <button
                        onClick={() => saveScores(e.id)}
                        className="btn-primary ml-2"
                        disabled={saving}
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="btn-link ml-2"
                        disabled={saving}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : e.score_received != null && e.score_total > 0 ? (
                    <div className="score-actions">
                      <strong>
                        {e.score_received} / {e.score_total}
                      </strong>{' '}
                      (<em>{pct} %</em>)
                      <button onClick={() => startEdit(e)} className="btn-link ml-2">
                        Edit
                      </button>
                      <button onClick={() => clearScore(e.id)} className="btn-link ml-2">
                        Clear
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => startEdit(e)} className="btn-link">
                      Enter score
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
