import { useState } from 'react'
import PlannerForm from './components/PlannerForm'

export default function App() {
  const [items, setItems] = useState([])

  return (
    <div style={{ padding: 20 }}>
      <h1>Study Planner</h1>
      <PlannerForm onParsed={setItems} />
      <ul>
        {items.map((itm, i) => (
          <li key={i}>
            {itm.name}, {itm.date}, {itm.percent}
          </li>
        ))}
      </ul>
    </div>
  )
}
