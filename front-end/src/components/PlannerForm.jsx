import { useState } from 'react'
import { parseOutline } from '../services/outlineApi'

export default function PlannerForm({ onParsed }) {
  const [outlineText, setOutlineText] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const { data } = await parseOutline(outlineText)
    onParsed(data)          // expect [{ name, date, percent }, …]
  }

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        rows={8}
        cols={60}
        placeholder="Paste your course outline here…"
        value={outlineText}
        onChange={e => setOutlineText(e.target.value)}
      />
      <br />
      <button type="submit">Parse Outline</button>
    </form>
  )
}
