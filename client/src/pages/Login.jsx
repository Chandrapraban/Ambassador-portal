import { useState, useEffect } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api'

const SSO_ERRORS = {
  not_registered: 'Your Duke account is not registered as an ambassador. Contact the program coordinator.',
  sso_not_configured: 'Duke SSO is not yet configured. Contact the administrator.',
  sso_denied: 'Sign-in was cancelled.',
  sso_failed: 'Sign-in failed. Please try again.',
}

export default function Login() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [ssoEnabled, setSsoEnabled] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    // Show SSO error if redirected back from failed OAuth
    const err = searchParams.get('error')
    if (err) setError(SSO_ERRORS[err] || 'Authentication failed.')

    // Check if SSO is configured on the server
    api.get('/auth/sso-status').then(res => setSsoEnabled(res.data.enabled)).catch(() => {})
  }, [])

  async function handleAdminLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { password })
      login(data.token, { role: 'admin' })
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  function handleDukeSSO() {
    // Full page redirect — server handles the OAuth flow
    window.location.href = '/api/auth/sso'
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-3xl font-bold text-duke-blue mb-1">Duke MEM</div>
          <div className="text-gray-500">Ambassador Connect Portal</div>
        </div>

        {/* Ambassador SSO */}
        <div className="card p-8 mb-4">
          <h2 className="text-base font-semibold text-gray-800 mb-1">Ambassador Sign In</h2>
          <p className="text-sm text-gray-400 mb-5">Use your Duke NetID to access the ambassador portal.</p>

          <button
            onClick={handleDukeSSO}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-duke-blue text-duke-blue font-semibold py-3 px-4 rounded-xl hover:bg-blue-50 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none">
              <path d="M10.5 1C5.25 1 1 5.25 1 10.5S5.25 20 10.5 20 20 15.75 20 10.5 15.75 1 10.5 1z" fill="#003087"/>
              <text x="5.5" y="15" fontSize="11" fontWeight="bold" fill="white">D</text>
            </svg>
            Sign in with Duke NetID
          </button>

          {!ssoEnabled && (
            <p className="text-xs text-amber-600 text-center mt-3 bg-amber-50 rounded-lg px-3 py-2">
              Duke SSO not yet configured — add Azure AD credentials to <code>.env</code>
            </p>
          )}
        </div>

        {/* Admin login */}
        <div className="card p-8">
          <h2 className="text-base font-semibold text-gray-800 mb-1">Admin Sign In</h2>
          <p className="text-sm text-gray-400 mb-5">Program coordinators and administrators only.</p>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="label">Admin Password</label>
              <input
                type="password"
                className="input"
                placeholder="Enter password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in...' : 'Sign In as Admin'}
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
