import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import ProspectForm from './pages/ProspectForm'
import Confirmation from './pages/Confirmation'
import Login from './pages/Login'
import AuthCallback from './pages/AuthCallback'
import AmbassadorPortal from './pages/AmbassadorPortal'
import AdminDashboard from './pages/AdminDashboard'
import AcceptClaim from './pages/AcceptClaim'
import WaitPreferred from './pages/WaitPreferred'
import FeedbackForm from './pages/FeedbackForm'

function ProtectedAmbassador({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'ambassador') return <Navigate to="/admin" replace />
  return children
}

function ProtectedAdmin({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/ambassador" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ProspectForm />} />
      <Route path="/confirmation" element={<Confirmation />} />
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/accept-claim/:requestId" element={<AcceptClaim />} />
      <Route path="/wait-preferred/:requestId" element={<WaitPreferred />} />
      <Route path="/feedback/:requestId" element={<FeedbackForm />} />
      <Route path="/ambassador" element={<ProtectedAmbassador><AmbassadorPortal /></ProtectedAmbassador>} />
      <Route path="/admin" element={<ProtectedAdmin><AdminDashboard /></ProtectedAdmin>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
