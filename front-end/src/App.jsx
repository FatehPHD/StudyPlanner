import { Routes, Route } from 'react-router-dom'
import Home    from './components/Home'
import AddPage from './components/AddPage.jsx';
import CalendarPage from './components/CalendarPage'

export default function App() {
  return (
    <Routes>
      {/* Home page with big “+” */}
      <Route path="/" element={<Home />} />

      {/* Add‐outline page with form + results */}
      <Route path="/add" element={<AddPage />} />
      <Route path="/calendar" element={<CalendarPage />} />
    </Routes>
  )
}
