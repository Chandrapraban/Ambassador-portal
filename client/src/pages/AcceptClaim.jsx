import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api'

export default function AcceptClaim() {
  const { requestId } = useParams()
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    api.post(`/requests/${requestId}/accept-claim`)
      .then(() => setStatus('success'))
      .catch(err => setStatus(err.response?.data?.error || 'error'))
  }, [requestId])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {status === 'loading' && <p className="text-gray-400">Processing...</p>}
        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Ambassador Accepted!</h1>
            <p className="text-gray-500">
              Your ambassador will be in touch shortly to schedule your call. Check your email for their contact details.
            </p>
          </>
        )}
        {status !== 'loading' && status !== 'success' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">!</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-gray-500 mb-4">{status}</p>
            <Link to="/" className="text-duke-blue hover:underline text-sm">Return to home</Link>
          </>
        )}
      </div>
    </div>
  )
}
