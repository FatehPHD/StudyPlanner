// src/components/Layout.jsx
import Sidebar from './Sidebar.jsx'

export default function Layout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  )
}
