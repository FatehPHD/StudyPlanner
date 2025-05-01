// front-end/src/components/AddPage.jsx
import { useState } from 'react'
import PlannerForm from './PlannerForm'

export default function AddPage() {
  const [items, setItems] = useState([])

  return (
    <div style={{ padding: 20 }}>
      <h1>Add Course Outline</h1>
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
