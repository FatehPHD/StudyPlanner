import { useState } from 'react'
import { parseOutline } from '../services/outlineApi.js'
import toast from 'react-hot-toast'

export default function PlannerForm({
  outlineText,
  setOutlineText,
  disabled,
  onParsed
}) {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!outlineText.trim() || loading || disabled) return

    setLoading(true)
    try {
      const { data } = await parseOutline(outlineText)
      toast.success('Outline parsed!')
      onParsed(data)
    } catch (err) {
      console.error(err)
      toast.error('Failed to parse outline.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        rows={8}
        cols={60}
        placeholder="Paste your course outline here…"
        value={outlineText}
        onChange={e => setOutlineText(e.target.value)}
        disabled={loading || disabled}
        className="textarea-input"
      />
      <br />
      <button
        type="submit"
        className="btn-submit"
        disabled={loading || disabled}
      >
        {loading ? 'Parsing…' : 'Parse Outline'}
      </button>
    </form>
  )
}
