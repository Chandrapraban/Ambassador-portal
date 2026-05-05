import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Navbar({ title }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <header className="bg-duke-blue text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-xl font-bold tracking-tight">Duke MEM</div>
          <div className="hidden sm:block h-5 w-px bg-blue-400" />
          <div className="hidden sm:block text-sm text-blue-200">{title || 'Ambassador Connect'}</div>
        </div>
        {user && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-blue-200 hidden sm:block">
              {user.role === 'ambassador' ? user.ambassador?.name : 'Admin'}
            </span>
            <button onClick={handleLogout} className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors">
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
