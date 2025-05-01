import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div style={{ padding: 20, textAlign: 'center' }}>
      <h1>Welcome to Study Planner</h1>

      <div style={{ display: 'inline-block', margin: '0 10px' }}>
        <Link to="/add">
          <button
            style={{
              fontSize: 48,
              width: 80,
              height: 80,
              borderRadius: '50%',
              lineHeight: 1,
              cursor: 'pointer',
            }}
            aria-label="Add Outline"
          >
            +
          </button>
        </Link>
      </div>

      <div style={{ display: 'inline-block', margin: '0 10px' }}>
        <Link to="/calendar">
          <button
            style={{
              padding: '0.5rem 1rem',
              fontSize: '1rem',
              cursor: 'pointer',
            }}
          >
            Calendar
          </button>
        </Link>
      </div>
    </div>
  )
}
