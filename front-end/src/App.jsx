import { Routes, Route } from 'react-router-dom'
import Home    from './components/Home'
import AddPage from './components/AddPage.jsx';

export default function App() {
  return (
    <Routes>
      {/* Home page with big “+” */}
      <Route path="/" element={<Home />} />

      {/* Add‐outline page with form + results */}
      <Route path="/add" element={<AddPage />} />
    </Routes>
  )
}
