// PlannerForm.jsx - Handles outline text input and file upload for course parsing
import { useState } from 'react'
import { parseOutline } from '../services/outlineApi.js'
import toast from 'react-hot-toast'
import axios from 'axios'

export default function PlannerForm({
  outlineText,
  setOutlineText,
  disabled,
  onParsed
}) {
  const [loading, setLoading] = useState(false)
  // Handle PDF/Word file upload and extract outline
  async function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      // Call backend endpoint to extract outline
      const res = await axios.post(
        'http://localhost:5000/api/extract-outline',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      setOutlineText(res.data.text || '')
      toast.success('Outline extracted from file!')
    } catch (err) {
      console.error(err)
      toast.error('Failed to extract from file.')
    } finally {
      setLoading(false)
    }
  }
  // Parse outline text using backend service
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
      {/* File upload input */}
      <div className="form-group">
        <label>
          Upload syllabus (PDF or Word):
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileUpload}
            disabled={loading || disabled}
            className="input-field"
          />
        </label>
      </div>
      {/* Outline textarea fallback */}
      <textarea
        rows={8}
        cols={60}
        placeholder="Or paste your course outline here…"
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
