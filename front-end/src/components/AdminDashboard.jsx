// AdminDashboard.jsx - Main admin dashboard for Study Planner
import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useNavigate } from 'react-router-dom'
import { API_BASE_URL } from '../lib/apiConfig.js'

export default function AdminDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState(false)
  const [tab, setTab] = useState('users')
  const [loading, setLoading] = useState(true)
  // User management state
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState(null)
  const [userSearch, setUserSearch] = useState('')
  // Course management state
  const [courses, setCourses] = useState([])
  const [coursesLoading, setCoursesLoading] = useState(false)
  const [coursesError, setCoursesError] = useState(null)
  const [editingCourseId, setEditingCourseId] = useState(null)
  const [editingCourseTitle, setEditingCourseTitle] = useState('')
  const [courseSearch, setCourseSearch] = useState('')
  // Analytics state
  const [analytics, setAnalytics] = useState(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsError, setAnalyticsError] = useState(null)

  // Check admin status on mount
  useEffect(() => {
    if (!user) return;
    async function checkAdmin() {
      const res = await fetch(`${API_BASE_URL}/api/profiles/${user.id}`)
      const profile = await res.json()
      setIsAdmin(profile.is_admin)
      setLoading(false)
      if (!profile.is_admin) navigate('/')
    }
    checkAdmin()
  }, [user, navigate])

  // Fetch users for User Management tab
  useEffect(() => {
    if (!user || tab !== 'users' || !isAdmin) return
    setUsersLoading(true)
    setUsersError(null)
    fetch(`${API_BASE_URL}/api/admin/users`, {
      headers: { 'X-User-Id': user.id }
    })
      .then(res => res.json())
      .then(data => {
        setUsers(data)
        setUsersLoading(false)
      })
      .catch(err => {
        setUsersError('Failed to load users')
        setUsersLoading(false)
      })
  }, [tab, isAdmin, user])

  // Fetch courses for Course Management tab
  useEffect(() => {
    if (!user || tab !== 'courses' || !isAdmin) return
    setCoursesLoading(true)
    setCoursesError(null)
    fetch(`${API_BASE_URL}/api/admin/courses`, {
      headers: { 'X-User-Id': user.id }
    })
      .then(res => res.json())
      .then(data => {
        setCourses(data)
        setCoursesLoading(false)
      })
      .catch(err => {
        setCoursesError('Failed to load courses')
        setCoursesLoading(false)
      })
  }, [tab, isAdmin, user])

  // Fetch analytics for Analytics tab
  useEffect(() => {
    if (!user || tab !== 'analytics' || !isAdmin) return
    setAnalyticsLoading(true)
    setAnalyticsError(null)
    fetch(`${API_BASE_URL}/api/admin/analytics`, {
      headers: { 'X-User-Id': user.id }
    })
      .then(res => res.json())
      .then(data => {
        setAnalytics(data)
        setAnalyticsLoading(false)
      })
      .catch(err => {
        setAnalyticsError('Failed to load analytics')
        setAnalyticsLoading(false)
      })
  }, [tab, isAdmin, user])

  // Toggle admin status for a user
  async function handleToggleAdmin(userId, current) {
    if (!user) return;
    await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-User-Id': user.id },
      body: JSON.stringify({ is_admin: !current })
    })
    setUsersLoading(true)
    const res = await fetch(`${API_BASE_URL}/api/admin/users`, { headers: { 'X-User-Id': user.id } })
    setUsers(await res.json())
    setUsersLoading(false)
  }

  // Delete a user
  async function handleDeleteUser(userId) {
    if (!user) return;
    if (!window.confirm('Are you sure you want to delete this user?')) return
    await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { 'X-User-Id': user.id }
    })
    setUsersLoading(true)
    const res = await fetch(`${API_BASE_URL}/api/admin/users`, { headers: { 'X-User-Id': user.id } })
    setUsers(await res.json())
    setUsersLoading(false)
  }

  // Edit course title
  function startEditCourse(course) {
    setEditingCourseId(course.id)
    setEditingCourseTitle(course.title)
  }
  async function saveEditCourse(courseId) {
    if (!user) return;
    await fetch(`${API_BASE_URL}/api/admin/courses/${courseId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-User-Id': user.id },
      body: JSON.stringify({ title: editingCourseTitle })
    })
    setEditingCourseId(null)
    setEditingCourseTitle('')
    setCoursesLoading(true)
    const res = await fetch(`${API_BASE_URL}/api/admin/courses`, { headers: { 'X-User-Id': user.id } })
    setCourses(await res.json())
    setCoursesLoading(false)
  }
  function cancelEditCourse() {
    setEditingCourseId(null)
    setEditingCourseTitle('')
  }
  // Delete a course
  async function handleDeleteCourse(courseId) {
    if (!user) return;
    if (!window.confirm('Are you sure you want to delete this course?')) return
    await fetch(`${API_BASE_URL}/api/admin/courses/${courseId}`, {
      method: 'DELETE',
      headers: { 'X-User-Id': user.id }
    })
    setCoursesLoading(true)
    const res = await fetch(`${API_BASE_URL}/api/admin/courses`, { headers: { 'X-User-Id': user.id } })
    setCourses(await res.json())
    setCoursesLoading(false)
  }
  // Filter users by email
  const filteredUsers = users.filter(u =>
    u.email && u.email.toLowerCase().includes(userSearch.toLowerCase())
  )
  // Filter courses by title
  const filteredCourses = courses.filter(c =>
    c.title && c.title.toLowerCase().includes(courseSearch.toLowerCase())
  )
  if (loading) return <p>Loading admin dashboard…</p>
  if (!isAdmin) return null
  return (
    <div className="container">
      <h1 className="playful-heading">Admin Dashboard</h1>
      <div className="actions" style={{ marginBottom: 24 }}>
        <button className={tab === 'users' ? 'btn-fun' : ''} onClick={() => setTab('users')}>Users</button>
        <button className={tab === 'courses' ? 'btn-fun' : ''} onClick={() => setTab('courses')}>Courses</button>
        <button className={tab === 'analytics' ? 'btn-fun' : ''} onClick={() => setTab('analytics')}>Analytics</button>
        <button className={tab === 'moderation' ? 'btn-fun' : ''} onClick={() => setTab('moderation')}>Moderation</button>
        <button className={tab === 'settings' ? 'btn-fun' : ''} onClick={() => setTab('settings')}>Settings</button>
      </div>
      {/* User Management Tab */}
      {tab === 'users' && (
        <div>
          <h2>User Management</h2>
          <input
            type="text"
            placeholder="Search by email…"
            value={userSearch}
            onChange={e => setUserSearch(e.target.value)}
            className="input-field"
            style={{ marginBottom: 16, minWidth: 200 }}
          />
          {usersLoading && <p>Loading users…</p>}
          {usersError && <p className="error-text">{usersError}</p>}
          {!usersLoading && !usersError && (
            <table className="score-table" style={{ minWidth: 400 }}>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Admin</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td>{u.is_admin ? 'Yes' : 'No'}</td>
                    <td>{u.created_at ? new Date(u.created_at).toLocaleString() : ''}</td>
                    <td style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn-fun"
                        style={{
                          padding: '0.3em 1em',
                          fontSize: '1em',
                          opacity: u.id === user.id ? 0.6 : 1,
                          cursor: u.id === user.id ? 'not-allowed' : 'pointer'
                        }}
                        onClick={() => handleToggleAdmin(u.id, u.is_admin)}
                        disabled={u.id === user.id}
                        title={u.id === user.id ? 'You cannot revoke your own admin status' : (u.is_admin ? 'Revoke admin' : 'Make admin')}
                      >
                        {u.is_admin ? 'Revoke Admin' : 'Make Admin'}
                      </button>
                      <button
                        className="btn-danger"
                        style={{ padding: '0.3em 1em', fontSize: '1em' }}
                        onClick={() => handleDeleteUser(u.id)}
                        disabled={u.id === user.id}
                        title="Delete user"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      {/* Course Management Tab */}
      {tab === 'courses' && (
        <div>
          <h2>Course Management</h2>
          <input
            type="text"
            placeholder="Search by title…"
            value={courseSearch}
            onChange={e => setCourseSearch(e.target.value)}
            className="input-field"
            style={{ marginBottom: 16, minWidth: 200 }}
          />
          {coursesLoading && <p>Loading courses…</p>}
          {coursesError && <p className="error-text">{coursesError}</p>}
          {!coursesLoading && !coursesError && (
            <table className="score-table" style={{ minWidth: 400 }}>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCourses.map(c => (
                  <tr key={c.id}>
                    <td>
                      {editingCourseId === c.id ? (
                        <>
                          <input
                            type="text"
                            value={editingCourseTitle}
                            onChange={e => setEditingCourseTitle(e.target.value)}
                            className="input-field"
                            style={{ minWidth: 120 }}
                          />
                          <button className="btn-fun" style={{ marginLeft: 8 }} onClick={() => saveEditCourse(c.id)}>Save</button>
                          <button className="btn-link" style={{ marginLeft: 4 }} onClick={cancelEditCourse}>Cancel</button>
                        </>
                      ) : (
                        <>
                          {c.title}
                          <button className="btn-link" style={{ marginLeft: 8 }} onClick={() => startEditCourse(c)}>Edit</button>
                        </>
                      )}
                    </td>
                    <td>{c.inserted_at ? new Date(c.inserted_at).toLocaleString() : ''}</td>
                    <td>
                      <button
                        className="btn-danger"
                        style={{ padding: '0.3em 1em', fontSize: '1em' }}
                        onClick={() => handleDeleteCourse(c.id)}
                        title="Delete course"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      {/* Analytics Tab */}
      {tab === 'analytics' && (
        <div>
          <h2>Analytics</h2>
          {analyticsLoading && <p>Loading analytics…</p>}
          {analyticsError && <p className="error-text">{analyticsError}</p>}
          {!analyticsLoading && !analyticsError && analytics && (
            <div style={{ display: 'flex', gap: 32, marginTop: 24 }}>
              <div className="card" style={{ minWidth: 180, textAlign: 'center' }}>
                <h3>Users</h3>
                <div style={{ fontSize: 32, fontWeight: 700 }}>{analytics.users}</div>
              </div>
              <div className="card" style={{ minWidth: 180, textAlign: 'center' }}>
                <h3>Courses</h3>
                <div style={{ fontSize: 32, fontWeight: 700 }}>{analytics.courses}</div>
              </div>
              <div className="card" style={{ minWidth: 180, textAlign: 'center' }}>
                <h3>To-Dos</h3>
                <div style={{ fontSize: 32, fontWeight: 700 }}>{analytics.todos}</div>
              </div>
            </div>
          )}
        </div>
      )}
      {/* Moderation Tab (placeholder) */}
      {tab === 'moderation' && (
        <div>
          <h2>Moderation</h2>
          <div className="card" style={{ textAlign: 'center', minWidth: 300, marginTop: 32 }}>
            <p>No reports to review. 🎉</p>
            {/* In the future, show a table of reports here. */}
          </div>
        </div>
      )}
      {/* Settings Tab (placeholder) */}
      {tab === 'settings' && (
        <div>
          <h2>Settings</h2>
          <div className="card" style={{ textAlign: 'center', minWidth: 300, marginTop: 32 }}>
            <p>Settings management coming soon.</p>
            {/* In the future, add app-wide settings controls here. */}
          </div>
        </div>
      )}
    </div>
  )
} 