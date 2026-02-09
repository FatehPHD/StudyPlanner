// outlineApi.js - API call to parse course outline text using backend
import { API_BASE_URL } from '../lib/apiConfig.js'

export function parseOutline(outlineText) {
  return fetch(`${API_BASE_URL}/api/parse-outline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ outlineText })
  })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    })
    .then(json => ({ data: json }))
}

export function analyzeOutline(outlineText) {
  return fetch(`${API_BASE_URL}/api/analyze-outline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ outlineText })
  })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    })
}

export function parseOutlineWithAnswers(outlineText, answers) {
  return fetch(`${API_BASE_URL}/api/parse-outline-with-answers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ outlineText, answers })
  })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    })
    .then(json => ({ data: json }))
}
