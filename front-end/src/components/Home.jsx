import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div style={{ padding: 20, textAlign: 'center' }}>
      <h1>Welcome to Study Planner</h1>
      <Link to="/add">
        <button
          style={{
            fontSize: 48,
            width: 80,
            height: 80,
            borderRadius: '50%',
            lineHeight: 1,
          }}
        >
          +
        </button>
      </Link>
    </div>
  )
}
