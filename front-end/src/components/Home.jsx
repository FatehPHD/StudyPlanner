import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import toast from 'react-hot-toast'
import {
  useQuery,
  useMutation,
  useQueryClient
} from '@tanstack/react-query'

// 1) Fetch function
async function fetchCourses(userId) {
  const { data, error } = await supabase
    .from('courses')
    .select('id, title, color, inserted_at')
    .eq('user_id', userId)
    .order('inserted_at', { ascending: false })

  if (error) throw error
  return data
}

// 2) Delete function
async function deleteCourse(courseId) {
  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('id', courseId)

  if (error) throw error
  return courseId
}

export default function Home() {
  const { user, signOut } = useAuth()
  const queryClient       = useQueryClient()

  // useQuery with object signature
  const {
    data: courses = [],
    isLoading,
    isError
  } = useQuery({
    queryKey: ['courses', user.id],
    queryFn:  () => fetchCourses(user.id),
    enabled:  !!user.id
  })

  // useMutation with object signature
  const deleteMutation = useMutation({
    mutationFn: deleteCourse,
    onMutate: async courseId => {
      await queryClient.cancelQueries({ queryKey: ['courses', user.id] })
      const previous = queryClient.getQueryData(['courses', user.id])
      queryClient.setQueryData(
        ['courses', user.id],
        old => old.filter(c => c.id !== courseId)
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['courses', user.id], context.previous)
      toast.error('Failed to delete course')
    },
    onSuccess: () => {
      toast.success('Course deleted')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['courses', user.id] })
    }
  })

  if (isLoading) return <p>Loading courses…</p>
  if (isError)   return <p>Failed to load your courses.</p>

  return (
    <div className="container center-text">
      <h1>Welcome to Study Planner</h1>
      <p>Signed in as: {user.email}</p>

      <h2>Your Courses</h2>
      {courses.length > 0 ? (
        <ul className="course-list">
          {courses.map(c => (
            <li key={c.id} className="course-item">
              <Link
                to={`/courses/${c.id}`}
                className="course-link"
                style={{ color: c.color }}
              >
                {c.title}
              </Link>
              <button
                onClick={() => deleteMutation.mutate(c.id)}
                className="btn-delete"
                style={{ color: c.color }}
                title="Delete course"
                disabled={deleteMutation.isLoading}
              >
                {deleteMutation.isLoading ? '…' : '🗑'}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>No courses yet — click the “+” below to add one!</p>
      )}

      {/* Add & Calendar */}
      <div className="actions">
        <Link to="/add">
          <button className="btn-circle" aria-label="Add Outline">
            +
          </button>
        </Link>
        <Link to="/calendar">
          <button className="btn-primary ml-4">Calendar</button>
        </Link>
      </div>

      {/* Sign Out */}
      <div className="actions">
        <button onClick={signOut} className="btn-signout">
          Sign Out
        </button>
      </div>
    </div>
  )
}
