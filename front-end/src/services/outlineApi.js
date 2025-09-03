// outlineApi.js - API call to parse course outline text using backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

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
