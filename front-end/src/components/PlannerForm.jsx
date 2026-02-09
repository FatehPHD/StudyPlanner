// PlannerForm.jsx - Handles outline text input and file upload for course parsing
import { useState } from 'react'
import { parseOutline, analyzeOutline, parseOutlineWithAnswers } from '../services/outlineApi.js'
import toast from 'react-hot-toast'
import axios from 'axios'
import { API_BASE_URL } from '../lib/apiConfig.js'

export default function PlannerForm({
  outlineText,
  setOutlineText,
  disabled,
  onParsed,
  onQuestions
}) {
  const [loading, setLoading] = useState(false)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState([])
  const [showQuestions, setShowQuestions] = useState(false)

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
        `${API_BASE_URL}/api/extract-outline`,
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

  // Analyze outline and handle questions or direct parsing
  async function handleSubmit(e) {
    e.preventDefault()
    if (!outlineText.trim() || loading || disabled) return
    setLoading(true)
    
    try {
      console.log('Analyzing outline:', outlineText)
      // First, analyze the outline for questions
      const analysis = await analyzeOutline(outlineText)
      console.log('Analysis result:', analysis)
      
      if (analysis.status === 'questions') {
        // Show questions to user
        setQuestions(analysis.questions)
        setAnswers(new Array(analysis.questions.length).fill(''))
        setShowQuestions(true)
        toast.success('Please answer the clarifying questions below')
        if (onQuestions) onQuestions(analysis.questions)
      } else {
        // Ready to parse directly
        console.log('No questions needed, parsing directly')
        const { data } = await parseOutline(outlineText)
        toast.success('Outline parsed!')
        onParsed(data)
      }
    } catch (err) {
      console.error('Error in handleSubmit:', err)
      toast.error('Failed to analyze outline.')
    } finally {
      setLoading(false)
    }
  }

  // Handle answering questions and final parsing
  async function handleAnswerQuestions() {
    if (answers.some(answer => !answer.trim())) {
      toast.error('Please answer all questions')
      return
    }
    
    setLoading(true)
    try {
      const { data } = await parseOutlineWithAnswers(outlineText, answers)
      toast.success('Outline parsed with your answers!')
      onParsed(data)
      setShowQuestions(false)
    } catch (err) {
      console.error(err)
      toast.error('Failed to parse outline with answers.')
    } finally {
      setLoading(false)
    }
  }

  // Update answer for a specific question
  function updateAnswer(index, value) {
    const newAnswers = [...answers]
    newAnswers[index] = value
    setAnswers(newAnswers)
  }

  return (
    <div>
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
          {loading ? 'Analyzing…' : 'Parse Outline'}
        </button>
      </form>

      {/* Questions section */}
      {showQuestions && questions.length > 0 && (
        <div className="card" style={{ marginTop: '1rem', textAlign: 'left' }}>
          <h3 className="playful-heading">Clarifying Questions</h3>
          <p>Please answer these questions to help create an accurate schedule:</p>
          {questions.map((question, index) => (
            <div key={index} className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                {index + 1}. {question}
              </label>
              <input
                type="text"
                value={answers[index] || ''}
                onChange={e => updateAnswer(index, e.target.value)}
                placeholder="Your answer..."
                className="input-field"
                style={{ width: '100%' }}
              />
            </div>
          ))}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={handleAnswerQuestions}
              className="btn-submit"
              disabled={loading}
            >
              {loading ? 'Parsing...' : 'Parse with Answers'}
            </button>
            <button
              onClick={() => setShowQuestions(false)}
              className="btn-fun"
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
