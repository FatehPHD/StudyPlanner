export function parseOutline(outlineText) {
  return fetch('http://localhost:5000/api/parse-outline', {
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
