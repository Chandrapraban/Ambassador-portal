import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api'

export default function WaitPreferred() {
  const { requestId } = useParams()
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    api.post(`/requests/${requestId}/wait-preferred`)
      .then(() => setStatus('success'))
      .catch(err => setStatus(err.response?.data?.error || 'error'))
  }, [requestId])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {status === 'loading' && <p className="text-gray-400">Processing...</p>}
        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-duke-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Your request is held</h1>
            <p className="text-gray-500">
              Your preferred ambassadors have been notified and have 72 hours to claim your request.
              We'll be in touch soon!
            </p>
          </>
        )}
        {status !== 'loading' && status !== 'success' && (
          <>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-gray-500 mb-4">{status}</p>
            <Link to="/" className="text-duke-blue hover:underline text-sm">Return to home</Link>
          </>
        )}
      </div>
    </div>
  )
}
