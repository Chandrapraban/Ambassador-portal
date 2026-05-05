import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api'

export default function AuthCallback() {
  const [searchParams] = useSearchParams()
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setError('No token received.')
      return
    }
    // Store token then fetch user info to hydrate auth context
    localStorage.setItem('token', token)
    api.get('/auth/me')
      .then(res => {
        login(token, res.data)
        navigate('/ambassador', { replace: true })
      })
      .catch(() => {
        localStorage.removeItem('token')
        navigate('/login?error=sso_failed', { replace: true })
      })
  }, [])

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-600 mb-2">{error}</p>
        <a href="/login" className="text-duke-blue hover:underline text-sm">Back to login</a>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-duke-blue border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Signing you in...</p>
      </div>
    </div>
  )
}
