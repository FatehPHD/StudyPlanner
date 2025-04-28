import axios from 'axios'

// adjust the URL if your Flask backend lives elsewhere
export function parseOutline(outlineText) {
  return axios.post('http://localhost:5000/api/parse-outline', {
    outlineText
  })
}
