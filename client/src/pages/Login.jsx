import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api'

export default function Login() {
  const [tab, setTab] = useState('ambassador')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || (tab === 'admin' ? '/admin' : '/ambassador')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const payload = tab === 'ambassador' ? { email, role: 'ambassador' } : { password, role: 'admin' }
      const { data } = await api.post('/auth/login', payload)
      login(data.token, { role: data.role, ambassador: data.ambassador })
      navigate(data.role === 'admin' ? '/admin' : '/ambassador', { replace: true })
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-3xl font-bold text-duke-blue mb-1">Duke MEM</div>
          <div className="text-gray-500">Ambassador Connect Portal</div>
        </div>

        <div className="card p-8">
          <div className="flex border-b border-gray-200 mb-6">
            {['ambassador', 'admin'].map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError('') }}
                className={`flex-1 pb-3 text-sm font-medium capitalize transition-colors ${tab === t ? 'tab-active' : 'tab-inactive'}`}
              >
                {t === 'ambassador' ? 'Ambassador' : 'Admin'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'ambassador' ? (
              <div>
                <label className="label">Duke Email Address</label>
                <input
                  type="email"
                  className="input"
                  placeholder="netid@duke.edu"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-1">Must match your registered ambassador email</p>
              </div>
            ) : (
              <div>
                <label className="label">Admin Password</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Enter password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Prospective student?{' '}
          <a href="/" className="text-duke-blue hover:underline">Submit a request here</a>
        </p>
      </div>
    </div>
  )
}
